import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ownerDashboard.css";
import * as ownerSvc from "./services/owner";
import { getCurrentUser } from "./services/auth";

const initialForm = {
  hotelName: "",
  city: "",
  address: "",
  phoneNumber: "",
  description: "",
};
const MAX_HOTEL_PHOTOS = 8;

export default function OwnerHotelInfo() {
  const hotelId = useMemo(() => {
    const envHotelId = process.env.REACT_APP_HOTEL_ID;
    if (envHotelId) return envHotelId;

    const user = getCurrentUser() || {};
    return user.hotelId ? String(user.hotelId) : null;
  }, []);

  const [form, setForm] = useState(initialForm);
  const [stars, setStars] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [existingPhotoUrls, setExistingPhotoUrls] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const newPhotoPreviewsRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!hotelId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const profile = await ownerSvc.getHotelProfile(hotelId);
        if (!mounted) return;
        setForm({
          hotelName: String(profile?.hotelName || ""),
          city: String(profile?.city || ""),
          address: String(profile?.address || ""),
          phoneNumber: String(profile?.phoneNumber || ""),
          description: String(profile?.description || ""),
        });
        setExistingPhotoUrls(Array.isArray(profile?.photos) ? profile.photos : []); // [{id, url, isPrimary}]
        setStars(Number(profile?.starRating) || 0);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Unable to load hotel profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [hotelId]);

  useEffect(() => {
    newPhotoPreviewsRef.current = newPhotoPreviews;
  }, [newPhotoPreviews]);

  useEffect(() => {
    return () => {
      newPhotoPreviewsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {}
      });
    };
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
  }

  function handlePhotoChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const remainingSlots = Math.max(0, MAX_HOTEL_PHOTOS - existingPhotoUrls.length - newPhotos.length);
    const filesToAdd = selectedFiles.slice(0, remainingSlots);
    if (!filesToAdd.length) {
      event.target.value = "";
      return;
    }
    const previews = filesToAdd.map((file) => URL.createObjectURL(file));
    setNewPhotos((prev) => [...prev, ...filesToAdd]);
    setNewPhotoPreviews((prev) => [...prev, ...previews]);
    setSuccess("");
    event.target.value = "";
  }

  // CHANGED BY AI (2026-07-13): please review — now deletes the photo on the backend right away
  // instead of only removing it from local state (which never actually persisted before, since
  // the old upload flow never registered any images with the backend to begin with).
  async function removeExistingPhoto(index) {
    const photo = existingPhotoUrls[index];
    if (!photo) return;
    setError("");
    try {
      await ownerSvc.deleteHotelPhoto(hotelId, photo.id);
      setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
      setSuccess("");
    } catch (err) {
      setError(err.message || "Unable to remove photo.");
    }
  }

  function removeNewPhoto(index) {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews((prev) => {
      const target = prev[index];
      if (target) {
        try {
          URL.revokeObjectURL(target);
        } catch (error) {}
      }
      return prev.filter((_, i) => i !== index);
    });
    setSuccess("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // CHANGED BY AI (2026-07-13): please review — new photos are now uploaded directly (real
      // multipart upload, persisted immediately) instead of going through the old mock signed-url
      // flow. The first photo becomes the hotel's primary/card image only if none is set yet.
      if (newPhotos.length) {
        const hasPrimary = existingPhotoUrls.some((p) => p.isPrimary);
        for (let i = 0; i < newPhotos.length; i += 1) {
          const isPrimary = !hasPrimary && i === 0;
          await ownerSvc.uploadHotelPhoto(hotelId, newPhotos[i], { isPrimary });
        }
      }

      const payload = {
        hotelName: form.hotelName.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
        description: form.description.trim(),
      };
      const updated = await ownerSvc.updateHotelProfile(hotelId, payload);
      setForm({
        hotelName: String(updated?.hotelName || ""),
        city: String(updated?.city || ""),
        address: String(updated?.address || ""),
        phoneNumber: String(updated?.phoneNumber || ""),
        description: String(updated?.description || ""),
      });
      setExistingPhotoUrls(Array.isArray(updated?.photos) ? updated.photos : []);
      setStars(Number(updated?.starRating) || 0);
      newPhotoPreviews.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (revokeError) {}
      });
      setNewPhotos([]);
      setNewPhotoPreviews([]);

      try {
        const raw = localStorage.getItem("mock_auth_user");
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          "mock_auth_user",
          JSON.stringify({
            ...parsed,
            user: {
              ...(parsed?.user || {}),
              hotelName: updated?.hotelName || null,
              city: updated?.city || null,
              address: updated?.address || null,
              phoneNumber: updated?.phoneNumber || null,
              description: updated?.description || null,
              photos: Array.isArray(updated?.photos) ? updated.photos.map((p) => p.url) : [],
              cardPhoto: updated?.cardPhoto || null,
            },
          })
        );
      } catch (storageError) {}

      setSuccess("Hotel information saved.");
    } catch (err) {
      setError(err.message || "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="owner-dashboard">
      <header className="od-header">
        <h1>Edit Hotel Information</h1>
        <p className="muted">Update your hotel profile details shown across the owner experience.</p>
      </header>

      <div style={{ marginBottom: 14 }}>
        <Link to="/ownerhome" className="cta" style={{ textDecoration: "none", display: "inline-block" }}>
          Back to Owner Home
        </Link>
      </div>

      {loading && <div className="muted small" style={{ marginBottom: 12 }}>Loading profile...</div>}
      {error && <div className="od-error" style={{ color: "#9b1c1c", padding: 10, borderRadius: 6, background: "#fff1f0", marginBottom: 12 }}>Error: {error}</div>}
      {success && <div style={{ color: "#166534", padding: 10, borderRadius: 6, background: "#f0fdf4", marginBottom: 12 }}>{success}</div>}

      {!loading && !hotelId && (
        <div className="muted" style={{ padding: 10 }}>
          You don't have an approved hotel yet. Once an admin approves your hotel request, it will appear here.
        </div>
      )}

      {hotelId && (
      <section className="od-row">
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>Hotel Name</div>
              <input
                value={form.hotelName}
                onChange={(e) => updateField("hotelName", e.target.value)}
                placeholder="Your hotel name"
                required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
              />
            </label>

            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>City <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(cannot be changed)</span></div>
              <input
                value={form.city}
                readOnly
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", color: "#64748b", cursor: "not-allowed" }}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <div className="small muted" style={{ marginBottom: 4 }}>Address <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(cannot be changed)</span></div>
              <input
                value={form.address}
                readOnly
                placeholder="Street, district, and details"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", color: "#64748b", cursor: "not-allowed" }}
              />
            </label>

            <label>
              {/* CHANGED BY AI (2026-07-13): please review — read-only star rating, matching the
                  City/Address pattern. Stars can't be edited here; changing them requires an
                  approved Hotel Request (see Hotel Requests page). */}
              <div className="small muted" style={{ marginBottom: 4 }}>Star Rating <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(cannot be changed here — submit a Hotel Request)</span></div>
              <div
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", color: "#f59e0b", letterSpacing: 2 }}
              >
                {stars > 0 ? `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}` : <span style={{ color: '#94a3b8', letterSpacing: 0 }}>Not set</span>}
              </div>
            </label>

            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>Phone Number</div>
              <input
                value={form.phoneNumber}
                onChange={(e) => updateField("phoneNumber", e.target.value)}
                placeholder="+1 555 123 4567"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <div className="small muted" style={{ marginBottom: 4 }}>Description</div>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Short description of your hotel"
                rows={4}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, resize: "vertical" }}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <div className="small muted" style={{ marginBottom: 4 }}>
                Hotel Photos (first photo will be used as hotel card image)
              </div>
              <input type="file" accept="image/*" multiple onChange={handlePhotoChange} />
              <div className="room-photo-preview-list">
                {existingPhotoUrls.map((photo, index) => (
                  <div key={photo.id} className="room-photo-preview-item">
                    <img src={photo.url} alt={`Hotel ${index + 1}`} />
                    {photo.isPrimary && (
                      <span
                        className="small"
                        style={{
                          position: "absolute",
                          left: 4,
                          bottom: 4,
                          background: "rgba(15,23,42,0.78)",
                          color: "#fff",
                          padding: "2px 6px",
                          borderRadius: 999,
                          fontSize: 10,
                        }}
                      >
                        Card image
                      </span>
                    )}
                    <button
                      type="button"
                      className="room-photo-remove"
                      onClick={() => removeExistingPhoto(index)}
                      aria-label="Remove hotel photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newPhotoPreviews.map((url, index) => (
                  <div key={`new-photo-${index}`} className="room-photo-preview-item">
                    <img src={url} alt={`New hotel ${index + 1}`} />
                    <button
                      type="button"
                      className="room-photo-remove"
                      onClick={() => removeNewPhoto(index)}
                      aria-label="Remove new hotel photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="muted small" style={{ marginTop: 6 }}>
                {existingPhotoUrls.length + newPhotos.length}/{MAX_HOTEL_PHOTOS} photos
              </div>
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="save-btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
      )}
    </div>
  );
}
