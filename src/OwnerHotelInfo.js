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
    return String(user.hotelId || user.hotelName || user.id || 1);
  }, []);

  const [form, setForm] = useState(initialForm);
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
        setExistingPhotoUrls(Array.isArray(profile?.photos) ? profile.photos : []);
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

  function removeExistingPhoto(index) {
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    setSuccess("");
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
      let photoUrls = [...existingPhotoUrls];
      if (newPhotos.length) {
        const filesMeta = newPhotos.map((file) => ({ name: file.name, type: file.type, size: file.size }));
        const uploadInfo = await ownerSvc.getUploadUrls(hotelId, filesMeta);
        if (!uploadInfo || !Array.isArray(uploadInfo.urls) || uploadInfo.urls.length < newPhotos.length) {
          throw new Error("Unable to prepare photo upload.");
        }
        for (let i = 0; i < newPhotos.length; i += 1) {
          const file = newPhotos[i];
          const info = uploadInfo.urls[i];
          const response = await fetch(info.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          if (!response.ok) {
            throw new Error(`Failed uploading photo: ${file.name}`);
          }
          photoUrls.push(info.publicUrl || info.url || info.filename);
        }
      }

      const payload = {
        hotelName: form.hotelName.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
        description: form.description.trim(),
        photos: photoUrls,
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
              photos: Array.isArray(updated?.photos) ? updated.photos : [],
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
                {existingPhotoUrls.map((url, index) => (
                  <div key={`existing-photo-${index}`} className="room-photo-preview-item">
                    <img src={url} alt={`Hotel ${index + 1}`} />
                    {index === 0 && (
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
    </div>
  );
}
