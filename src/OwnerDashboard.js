import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import "./ownerDashboard.css";
import * as ownerSvc from "./services/owner";

function toDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWithinRange(day, start, endExclusive) {
  return day >= start && day < endExclusive;
}

function getCalendarDays(monthDate) {
  const first = startOfMonth(monthDate);
  const last = endOfMonth(monthDate);
  const firstGridDay = new Date(first);
  firstGridDay.setDate(first.getDate() - first.getDay());
  const lastGridDay = new Date(last);
  lastGridDay.setDate(last.getDate() + (6 - last.getDay()));

  const days = [];
  const cursor = new Date(firstGridDay);
  while (cursor <= lastGridDay) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function overlapsReservation(day, reservation) {
  const start = toDate(reservation.checkIn);
  const end = toDate(reservation.checkOut);
  return isWithinRange(day, start, end);
}

export default function OwnerDashboard() {
  const hotelId = useMemo(() => {
    const envHotelId = process.env.REACT_APP_HOTEL_ID;
    if (envHotelId) return envHotelId;

    try {
      const raw = localStorage.getItem('mock_auth_user');
      const parsed = raw ? JSON.parse(raw) : null;
      const user = parsed?.user || {};
      return String(user.hotelId || user.hotelName || user.id || 1);
    } catch (error) {
      return '1';
    }
  }, []);

  const [bills, setBills] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [campaignActive, setCampaignActive] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [cancelPolicy, setCancelPolicy] = useState({ freeCancel: true, daysBefore: 2 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(5);
  const [durationMode, setDurationMode] = useState("until_paused");
  const [durationDays, setDurationDays] = useState(7);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomAmount, setRoomAmount] = useState(1);
  const [roomCapacity, setRoomCapacity] = useState(1);
  const [roomPrice, setRoomPrice] = useState(100);
  const [roomStatus, setRoomStatus] = useState('draft');
  const [variants, setVariants] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState([]);
  const [addSaving, setAddSaving] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [calendarDayOpen, setCalendarDayOpen] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [calendarNotes, setCalendarNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('owner-calendar-notes') || '{}');
    } catch (err) {
      return {};
    }
  });
  const [autoAcceptBookings, setAutoAcceptBookings] = useState(true);

  const net = useMemo(() => (bills ? bills.gross * (1 - bills.platformCutPercent / 100) : 0), [bills]);
  const campaignEndDate = useMemo(() => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(durationDays || 0));
    return endDate;
  }, [durationDays]);

  const campaignTotalPrice = useMemo(() => {
    if (durationMode !== "set_duration") return null;
    return Number(dailyBudget || 0) * Number(durationDays || 0);
  }, [dailyBudget, durationDays, durationMode]);

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const calendarReservations = useMemo(() => {
    return [...reservations]
      .filter((item) => {
        const start = toDate(item.checkIn);
        const end = toDate(item.checkOut);
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
        return start < monthEnd && end > monthStart;
      })
      .sort((a, b) => toDate(a.checkIn) - toDate(b.checkIn));
  }, [calendarMonth, reservations]);

  const selectedDayInfo = useMemo(() => {
    if (!selectedCalendarDay) return null;
    const dayReservations = reservations.filter((reservation) => overlapsReservation(selectedCalendarDay, reservation));
    const checkIns = [];
    const checkOuts = [];
    const inHouse = [];

    dayReservations.forEach((reservation) => {
      const isArrival = sameDay(selectedCalendarDay, toDate(reservation.checkIn));
      const isDeparture = sameDay(selectedCalendarDay, toDate(reservation.checkOut));

      if (isArrival && !isDeparture) {
        checkIns.push(reservation);
        return;
      }

      if (isDeparture && !isArrival) {
        checkOuts.push(reservation);
        return;
      }

      if (isArrival && isDeparture) {
        checkIns.push(reservation);
        checkOuts.push(reservation);
        return;
      }

      inHouse.push(reservation);
    });

    const occupiedUnitsByRoomId = dayReservations.reduce((acc, reservation) => {
      const roomKey = String(reservation.roomId || '');
      if (!roomKey) return acc;
      acc[roomKey] = (acc[roomKey] || 0) + 1;
      return acc;
    }, {});
    const availableRoomCount = rooms.reduce((total, room) => {
      if (room.bookable === false) return total;
      const totalUnits = Math.max(0, Number(room.amount) || 1);
      const occupiedUnits = occupiedUnitsByRoomId[String(room.id)] || 0;
      return total + Math.max(0, totalUnits - occupiedUnits);
    }, 0);
    const blockedRooms = rooms.filter((room) => room.bookable === false);
    const blockedRoomCount = blockedRooms.reduce((total, room) => total + Math.max(0, Number(room.amount) || 1), 0);
    const occupiedRoomCount = Object.values(occupiedUnitsByRoomId).reduce((sum, count) => sum + count, 0);

    return {
      dayReservations,
      checkIns,
      checkOuts,
      inHouse,
      availableRoomCount,
      blockedRooms,
      blockedRoomCount,
      occupiedRoomCount,
    };
  }, [rooms, reservations, selectedCalendarDay]);

  // helper functions handled inline when calling service endpoints

  async function toggleCampaign() {
    try {
      const next = !campaignActive;
      await ownerSvc.toggleCampaign(hotelId, next);
      setCampaignActive(next);
    } catch (err) {
      alert("Unable to toggle campaign: " + err.message);
    }
  }

  async function activateCampaignFromModal() {
    try {
      setCampaignSaving(true);
      await ownerSvc.toggleCampaign(hotelId, true, {
        dailyBudget,
        durationMode,
        durationDays: durationMode === "set_duration" ? durationDays : null,
      });
      setCampaignActive(true);
      setCampaignModalOpen(false);
    } catch (err) {
      alert("Unable to activate campaign: " + err.message);
    } finally {
      setCampaignSaving(false);
    }
  }

  function openCampaignModal() {
    setCampaignModalOpen(true);
  }

  function openAddRoom() {
    // reset form
    setSelectedRoomId(null);
    setExistingPhotoUrls([]);
    setRoomName('');
    setRoomAmount(1);
    setRoomCapacity(1);
    setRoomPrice(100);
    setRoomStatus('draft');
    setVariants([]);
    setPhotos([]);
    setPhotoPreviews([]);
    setAddRoomOpen(true);
  }

  function openEditRoom(r) {
    setSelectedRoomId(r.id || null);
    setExistingPhotoUrls(Array.isArray(r.photos) ? r.photos : []);
    setPhotoPreviews([]);
    setPhotos([]);
    setRoomName(r.name || '');
    setRoomAmount(r.amount || 1);
    setRoomCapacity(r.capacity || 1);
    setRoomPrice(r.price || 0);
    setRoomStatus(r.status || 'draft');
    setVariants(Array.isArray(r.variants) ? r.variants.map(v => ({ name: v.name || '', priceDelta: v.priceDelta || 0, capacity: v.capacity || 1 })) : []);
    setAddRoomOpen(true);
  }

  function closeAddRoom() {
    // revoke object URLs
    photoPreviews.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
    setPhotoPreviews([]);
    setPhotos([]);
    setExistingPhotoUrls([]);
    setSelectedRoomId(null);
    setAddRoomOpen(false);
  }

  function handlePhotoChange(e) {
    const selectedFiles = Array.from(e.target.files || []);
    const remainingSlots = Math.max(0, 5 - existingPhotoUrls.length - photos.length);
    const files = selectedFiles.slice(0, remainingSlots);
    if (!files.length) {
      e.target.value = '';
      return;
    }
    const previews = files.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...previews]);
    e.target.value = '';
  }

  function removeExistingPhoto(idx) {
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeNewPhoto(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => {
      const removedPreview = prev[idx];
      if (removedPreview) {
        try { URL.revokeObjectURL(removedPreview); } catch (e) {}
      }
      return prev.filter((_, i) => i !== idx);
    });
  }

  function addVariant() {
    setVariants(v => [...v, { name: '', priceDelta: 0, capacity: 1 }]);
  }

  function updateVariant(idx, field, value) {

    setVariants(v => v.map((x, i) => i === idx ? { ...x, [field]: value } : x));
  }

  function removeVariant(idx) {
    setVariants(v => v.filter((_, i) => i !== idx));
  }

  async function saveRoom() {
    if (!roomName.trim()) return alert('Room name is required');
    if (roomPrice < 0) return alert('Price must be >= 0');
    setAddSaving(true);
    try {
      // start with existing photos (for edit) so we preserve them unless replaced
      let photoUrls = Array.isArray(existingPhotoUrls) ? [...existingPhotoUrls] : [];
      if (photos.length) {
        // request signed upload URLs
        const filesMeta = photos.map(f => ({ name: f.name, type: f.type, size: f.size }));
        const uploadInfo = await ownerSvc.getUploadUrls(hotelId, filesMeta).catch(() => null);
        if (uploadInfo && Array.isArray(uploadInfo.urls)) {
          // upload files to each signed URL
          for (let i = 0; i < photos.length; i++) {
            const file = photos[i];
            const info = uploadInfo.urls[i];
            try {
              await fetch(info.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
              photoUrls.push(info.publicUrl || info.url || info.filename);
            } catch (err) {
              console.warn('Upload failed for', file.name, err);
            }
          }
        }
      }

      const payload = {
        hotelId,
        name: roomName,
        amount: Number(roomAmount) || 1,
        capacity: Number(roomCapacity) || 1,
        price: Number(roomPrice) || 0,
        variants: variants.map(v => ({ name: v.name, priceDelta: Number(v.priceDelta) || 0, capacity: Number(v.capacity) || 1 })),
        photos: photoUrls,
        status: selectedRoomId ? roomStatus : 'draft'
      };

      if (selectedRoomId) {
        // update existing room
        await ownerSvc.updateRoom(selectedRoomId, payload);
      } else {
        // create new
        await ownerSvc.createRoom(hotelId, payload);
      }

      // refresh list
      const updated = await ownerSvc.getRooms(hotelId).catch(() => null);
      if (updated) setRooms(updated);
      closeAddRoom();
    } catch (err) {
      alert('Unable to save room: ' + (err.message || err));
    } finally {
      setAddSaving(false);
    }
  }

  function closeCampaignModal() {
    setCampaignModalOpen(false);
  }

  function openCalendarDay(day) {
    setSelectedCalendarDay(day);
    setCalendarDayOpen(true);
  }

  function closeCalendarDay() {
    setCalendarDayOpen(false);
    setSelectedCalendarDay(null);
  }

  function updateCalendarNote(value) {
    if (!selectedCalendarDay) return;
    const key = toDateKey(selectedCalendarDay);
    setCalendarNotes((current) => {
      const next = { ...current, [key]: value };
      try {
        localStorage.setItem('owner-calendar-notes', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  }

  // Performance indicator (mocked): compare price vs category
  const priceComparison = useMemo(() => {
    const avg = metrics?.categoryAvgPrice || 150; // backend can provide category average
    const avgPrice = metrics?.avgPrice || 0;
    if (avgPrice === 0) return { label: "Unknown", color: "orange" };
    if (avgPrice < avg * 0.9) return { label: "Below average", color: "green" };
    if (avgPrice > avg * 1.1) return { label: "Above average", color: "red" };
    return { label: "Near average", color: "orange" };
  }, [metrics]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [b, m, r, res, settings] = await Promise.all([
          ownerSvc.getBilling(hotelId).catch(() => null),
          ownerSvc.getMetrics(hotelId).catch(() => null),
          ownerSvc.getRooms(hotelId).catch(() => null),
          ownerSvc.getReservations(hotelId).catch(() => null),
          ownerSvc.getSettings(hotelId).catch(() => null),
        ]);
        if (!mounted) return;
        if (b) setBills(b); else setBills({ gross: 0, platformCutPercent: 0 });
        if (m) setMetrics(m); else setMetrics({ impressions: 0, clicks: 0, bookings: 0, cancellations: 0, avgPrice: 0, stars: 0 });
        if (r) setRooms(r); else setRooms([]);
        setCampaignActive(Boolean(m?.campaignActive));
        if (res) setReservations(res); else setReservations([]);
        if (settings && typeof settings.autoAcceptBookings !== 'undefined') setAutoAcceptBookings(Boolean(settings.autoAcceptBookings));
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [hotelId]);

  async function toggleAutoAccept() {
    try {
      const next = !autoAcceptBookings;
      await ownerSvc.updateSettings(hotelId, { autoAcceptBookings: next });
      setAutoAcceptBookings(next);
    } catch (err) {
      alert('Unable to update setting: ' + (err.message || err));
    }
  }

  async function handleAccept(reservationId) {
    try {
      await ownerSvc.acceptReservation(hotelId, reservationId);
      const updated = await ownerSvc.getReservations(hotelId).catch(() => null);
      if (updated) setReservations(updated);
    } catch (err) { alert('Unable to accept reservation: ' + (err.message || err)); }
  }

  async function handleReject(reservationId) {
    try {
      await ownerSvc.rejectReservation(hotelId, reservationId);
      const updated = await ownerSvc.getReservations(hotelId).catch(() => null);
      if (updated) setReservations(updated);
    } catch (err) { alert('Unable to reject reservation: ' + (err.message || err)); }
  }

  return (
    <div className="owner-dashboard">
      <header className="od-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/ownerhome" className="cta" style={{ textDecoration: "none", display: "inline-block" }}>
            Back
          </Link>
          <h1 style={{ margin: 0 }}>Owner Dashboard</h1>
        </div>
        <p className="muted">Overview of your hotel's performance and settings</p>
      </header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={autoAcceptBookings} onChange={toggleAutoAccept} /> Auto-accept bookings
        </label>
        <div className="muted small">When off, new bookings arrive as <strong>pending</strong> and require approval.</div>
      </div>
      {error && <div className="od-error" style={{ color: '#9b1c1c', padding: 10, borderRadius: 6, background: '#fff1f0', marginBottom: 12 }}>Error: {error}</div>}
      {loading && <div className="muted small" style={{ marginBottom: 12 }}>Loading data...</div>}

      <section className="od-row od-bills">
        <h2>Bills</h2>
        <div className="bills-grid">
          <div className="bill-card">
            <div className="label">Gross Earnings</div>
            <div className="value">${(bills?.gross || 0).toLocaleString()}</div>
          </div>
          <div className="bill-card">
            <div className="label">Platform Cut</div>
            <div className="value">{bills?.platformCutPercent ?? 0}%</div>
          </div>
          <div className="bill-card">
            <div className="label">Net to Owner</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div className="value">${Math.round(net).toLocaleString()}</div>
              <Link to="/owner/stats" className="cta" style={{ display: 'inline-block', textDecoration: 'none' }}>
                View Stats
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="od-row od-metrics">
        <h2>Views & Actions</h2>
        <div className="metrics-grid">
          <div className="metric">
            <div className="m-num">{(metrics?.impressions || 0).toLocaleString()}</div>
            <div className="m-label">Views</div>
          </div>
          <div className="metric">
            <div className="m-num">{(metrics?.clicks || 0).toLocaleString()}</div>
            <div className="m-label">Clicks</div>
          </div>
          <div className="metric">
            <div className="m-num">{metrics?.bookings || 0}</div>
            <div className="m-label">Bookings</div>
          </div>
          <div className="metric">
            <div className="m-num">{metrics?.cancellations || 0}</div>
            <div className="m-label">Cancellations</div>
          </div>
        </div>
      </section>

      <section className="od-row od-campaign">
        <h2>Campaigns</h2>
        <p className="muted">Promote your hotel to appear higher in search results.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className={`cta ${campaignActive ? 'active' : ''}`}
            onClick={() => {
              if (campaignActive) {
                toggleCampaign();
              } else {
                openCampaignModal();
              }
            }}
            disabled={loading}
          >
            {campaignActive ? 'Campaign Active (Click to Deactivate)' : 'Activate Campaign'}
          </button>
        </div>
      </section>

      <section className="od-row od-compare">
        <h2>Performance vs Similar Hotels</h2>
        <div className="compare-row">
          <div>Star level</div>
          <div className="compare-value">{metrics?.stars ?? '—'}★</div>
          <div>Avg price in category</div>
          <div className={`compare-tag ${priceComparison.color}`}>{priceComparison.label}</div>
        </div>
        <p className="muted small">Shows whether your prices are lower, higher, or near the category average.</p>
      </section>

      <section className="od-row od-calendar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2>Reservations Calendar</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="campaign-back" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>Prev</button>
            <button className="campaign-back" onClick={() => setCalendarMonth(startOfMonth(new Date()))}>Today</button>
            <button className="campaign-back" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>Next</button>
          </div>
        </div>

        <p className="muted small" style={{ marginTop: 8 }}>{formatMonthLabel(calendarMonth)}</p>

        <div className="calendar-grid calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-grid calendar-days">
          {calendarDays.map((day) => {
            const dayReservations = reservations.filter((reservation) => overlapsReservation(day, reservation));
            const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
            const isToday = sameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`calendar-day ${isCurrentMonth ? '' : 'outside-month'} ${isToday ? 'today' : ''}`}
                onClick={() => openCalendarDay(day)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openCalendarDay(day);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="calendar-day-number">{day.getDate()}</div>
                <div className="calendar-day-events">
                  {dayReservations.slice(0, 2).map((reservation) => (
                    <div key={reservation.id} className={`calendar-pill ${reservation.status}`}>
                      {sameDay(day, toDate(reservation.checkIn)) ? 'Check-in' : sameDay(day, toDate(reservation.checkOut)) ? 'Check-out' : reservation.roomName}
                    </div>
                  ))}
                  {dayReservations.length > 2 && <div className="calendar-more">+{dayReservations.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="calendar-list">
          <h3>Upcoming stays</h3>
          {calendarReservations.length === 0 ? (
            <p className="muted small">No stays in this month yet.</p>
          ) : (
            calendarReservations.map((reservation) => (
              <div key={reservation.id} className="calendar-list-item">
                <strong>{reservation.guestName}</strong>
                <span>{reservation.roomName}</span>
                <span>{reservation.checkIn} → {reservation.checkOut}</span>
                <span className={`calendar-badge ${reservation.status}`}>{reservation.status}</span>
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: 12 }} className="pending-reservations">
          <h3>Pending Bookings</h3>
          {reservations.filter(r => r.status === 'pending').length === 0 ? (
            <p className="muted small">No pending bookings.</p>
          ) : (
            reservations.filter(r => r.status === 'pending').map((reservation) => (
              <div key={`pending-${reservation.id}`} className="pending-row" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <strong>{reservation.guestName}</strong>
                  <div className="muted small">{reservation.roomName || `Room ${reservation.roomId}`} — {reservation.checkIn} → {reservation.checkOut}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="cta" onClick={() => handleAccept(reservation.id)}>Accept</button>
                  <button className="campaign-back" onClick={() => handleReject(reservation.id)}>Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {calendarDayOpen && selectedCalendarDay && selectedDayInfo && (
        <div className="campaign-modal-overlay" onClick={closeCalendarDay}>
          <div className="campaign-modal calendar-day-modal" onClick={(e) => e.stopPropagation()}>
            <div className="campaign-modal-header">
              <h3>{selectedCalendarDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              <button className="close-modal" onClick={closeCalendarDay} aria-label="Close">×</button>
            </div>

            <div className="calendar-day-stats">
              <div><strong>Reservations</strong><p>{selectedDayInfo.dayReservations.length}</p></div>
              <div><strong>Occupied rooms</strong><p>{selectedDayInfo.occupiedRoomCount}</p></div>
              <div><strong>Blocked rooms</strong><p>{selectedDayInfo.blockedRoomCount}</p></div>
              <div><strong>Available rooms</strong><p>{selectedDayInfo.availableRoomCount}</p></div>
            </div>

            <div className="calendar-day-panels">
              <div className="calendar-day-panel">
                <h4>Check-ins</h4>
                {selectedDayInfo.checkIns.length === 0 ? <p className="muted small">None</p> : selectedDayInfo.checkIns.map((reservation) => (
                  <div key={`in-${reservation.id}`} className="calendar-popup-row">
                    <strong>{reservation.guestName}</strong>
                    <span>{reservation.roomName}</span>
                  </div>
                ))}
              </div>

              <div className="calendar-day-panel">
                <h4>Check-outs</h4>
                {selectedDayInfo.checkOuts.length === 0 ? <p className="muted small">None</p> : selectedDayInfo.checkOuts.map((reservation) => (
                  <div key={`out-${reservation.id}`} className="calendar-popup-row">
                    <strong>{reservation.guestName}</strong>
                    <span>{reservation.roomName}</span>
                  </div>
                ))}
              </div>

              <div className="calendar-day-panel">
                <h4>In-house guests</h4>
                {selectedDayInfo.inHouse.length === 0 ? <p className="muted small">None</p> : selectedDayInfo.inHouse.map((reservation) => (
                  <div key={`house-${reservation.id}`} className="calendar-popup-row">
                    <strong>{reservation.guestName}</strong>
                    <span>{reservation.roomName}</span>
                  </div>
                ))}
              </div>

              <div className="calendar-day-panel">
                <h4>Blocked rooms</h4>
                {selectedDayInfo.blockedRooms.length === 0 ? <p className="muted small">None</p> : selectedDayInfo.blockedRooms.map((room) => (
                  <div key={`blocked-${room.id}`} className="calendar-popup-row">
                    <strong>{room.name}</strong>
                    <span>Blocked</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="calendar-day-notes">
              <h4>Notes</h4>
              <textarea
                className="calendar-notes-input"
                rows={4}
                placeholder="Add notes for this date..."
                value={calendarNotes[toDateKey(selectedCalendarDay)] || ''}
                onChange={(e) => updateCalendarNote(e.target.value)}
              />
              <p className="muted small" style={{ marginTop: 8 }}>Notes are saved locally for now until we connect the backend.</p>
            </div>
          </div>
        </div>
      )}

      <section className="od-row od-rooms">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Manage Rooms</h2>
          <button className="add-room-btn cta" onClick={openAddRoom}>+ Add Room</button>
        </div>
        <div className="rooms-list">
          {rooms.map((r) => (
            <div className="room-card" key={r.id}>
              {r.photos && r.photos.length > 0 ? (
                <div className="room-image" onClick={() => openEditRoom(r)} style={{ cursor: 'pointer' }}>
                  <img src={r.photos[0]} alt={r.name} />
                </div>
              ) : (
                <div className="room-image empty" aria-hidden="true" onClick={() => openEditRoom(r)} style={{ cursor: 'pointer' }} />
              )}
              <div className="room-card-body">
                <div className="room-name">{r.name}</div>
                <div className="muted small">${r.price} / night • {r.stars}★</div>
              </div>
              <div className="room-actions">
                <button onClick={async () => {
                    try {
                      await ownerSvc.updateRoom(r.id, { bookable: !r.bookable });
                      setRooms(rs => rs.map(x => x.id === r.id ? { ...x, bookable: !x.bookable } : x));
                    } catch (err) { alert('Unable to update room: ' + err.message); }
                  }} className={`booking-toggle ${r.bookable ? 'on' : 'blocked'}`}>
                  {r.bookable ? 'Allow Booking' : 'Blocked'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="od-row od-cancel">
        <h2>Cancellation Policy</h2>
        <div className="cancel-row">
          <label>
            <input type="checkbox" checked={cancelPolicy.freeCancel} onChange={(e) => setCancelPolicy(p => ({ ...p, freeCancel: e.target.checked }))} /> Free cancellation
          </label>
          <label style={{ marginLeft: 12 }}>
            Days before booking required:
            <input type="number" min={0} value={cancelPolicy.daysBefore} onChange={(e) => setCancelPolicy(p => ({ ...p, daysBefore: Number(e.target.value) }))} />
          </label>
          <button className="save-btn" onClick={async () => {
            try {
              await ownerSvc.updateCancelPolicy(hotelId, cancelPolicy);
              alert('Cancellation policy saved');
            } catch (err) {
              alert('Unable to save policy: ' + err.message);
            }
          }}>Save Policy</button>
        </div>
      </section>

      <footer style={{ marginTop: 28, opacity: .8 }} className="muted small">Data shown is mocked unless backend is connected — add REACT_APP_API_BASE_URL and REACT_APP_HOTEL_ID.</footer>

      {addRoomOpen && (
        <div className="campaign-modal-overlay" onClick={closeAddRoom}>
          <div className="campaign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="campaign-modal-header">
              <h3>{selectedRoomId ? 'Edit Room' : 'Add Room'}</h3>
              <button className="close-modal" onClick={closeAddRoom} aria-label="Close">×</button>
            </div>

            <div className="campaign-section">
              <label>Room name</label>
              <input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            </div>

            <div className="campaign-section" style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>Amount
                <input type="number" min={1} value={roomAmount} onChange={(e) => setRoomAmount(Number(e.target.value) || 1)} />
              </label>
              <label style={{ flex: 1 }}>Capacity
                <input type="number" min={1} value={roomCapacity} onChange={(e) => setRoomCapacity(Number(e.target.value) || 1)} />
              </label>
              <label style={{ flex: 1 }}>Price
                <input type="number" min={0} value={roomPrice} onChange={(e) => setRoomPrice(Number(e.target.value) || 0)} />
              </label>
            </div>

            <div className="campaign-section">
              <label>Photos (max 5)</label>
              <input type="file" accept="image/*" multiple onChange={handlePhotoChange} />
              <div className="room-photo-preview-list">
                {existingPhotoUrls.map((p, i) => (
                  <div key={`existing-${i}`} className="room-photo-preview-item">
                    <img src={p} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      className="room-photo-remove"
                      onClick={() => removeExistingPhoto(i)}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photoPreviews.map((p, i) => (
                  <div key={`new-${i}`} className="room-photo-preview-item">
                    <img src={p} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      className="room-photo-remove"
                      onClick={() => removeNewPhoto(i)}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="campaign-section">
              <label>Variants</label>
              {variants.map((v, i) => (
                <div key={i} className="variant-row">
                  <input placeholder="Variant name" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} />
                  <input type="number" step="1" placeholder="Price delta" value={v.priceDelta} onChange={(e) => updateVariant(i, 'priceDelta', Number(e.target.value) || 0)} />
                  <input type="number" min={0} placeholder="Capacity" value={v.capacity} onChange={(e) => updateVariant(i, 'capacity', Number(e.target.value) || 0)} />
                  <button onClick={() => removeVariant(i)}>Remove</button>
                </div>
              ))}
              <button className="campaign-next" onClick={addVariant}>Add Variant</button>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedRoomId && (
                  <button
                    className="delete-room"
                    onClick={async () => {
                      if (!window.confirm(`Delete room "${roomName || 'room'}"? This cannot be undone.`)) return;
                      try {
                        await ownerSvc.deleteRoom(selectedRoomId);
                        setRooms(rs => rs.filter(x => x.id !== selectedRoomId));
                        closeAddRoom();
                      } catch (err) {
                        alert('Unable to delete room: ' + (err.message || err));
                      }
                    }}
                    style={{ background: '#f44336', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: 6 }}
                  >
                    Delete
                  </button>
                )}
                <button className="campaign-back" onClick={closeAddRoom} disabled={addSaving}>Cancel</button>
                <button className="campaign-next" onClick={saveRoom} disabled={addSaving}>{addSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {campaignModalOpen && (
        <div className="campaign-modal-overlay" onClick={closeCampaignModal}>
          <div className="campaign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="campaign-modal-header">
              <h3>Activate Campaign</h3>
              <button className="close-modal" onClick={closeCampaignModal} aria-label="Close">
                ×
              </button>
            </div>

            <p className="campaign-title">What's your ad budget?</p>

            <div className="campaign-section">
              <label className="campaign-label">Daily budget</label>
              <p className="campaign-value">${dailyBudget} daily</p>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(Number(e.target.value))}
                className="campaign-slider"
              />
            </div>

            <div className="campaign-section">
              <label className="campaign-label">Duration</label>

              <label className="radio-row">
                <span>
                  <strong>Run this ad until you pause it</strong>
                  <small>Keep running continuously and pause anytime.</small>
                </span>
                <input
                  type="radio"
                  name="duration"
                  checked={durationMode === "until_paused"}
                  onChange={() => setDurationMode("until_paused")}
                />
              </label>

              <label className="radio-row">
                <span>
                  <strong>Set duration</strong>
                  <small>Choose a fixed number of days.</small>
                </span>
                <input
                  type="radio"
                  name="duration"
                  checked={durationMode === "set_duration"}
                  onChange={() => setDurationMode("set_duration")}
                />
              </label>

              {durationMode === "set_duration" && (
                <div className="duration-input">
                  <label>
                    Days
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="campaign-summary">
              <div>
                <strong>Estimated total</strong>
                <p>
                  {durationMode === "until_paused"
                    ? "Runs until you pause it manually"
                    : `$${Number(campaignTotalPrice || 0).toLocaleString()}`}
                </p>
              </div>
              <div>
                <strong>Ends on</strong>
                <p>
                  {durationMode === "until_paused"
                    ? "Open ended"
                    : campaignEndDate?.toLocaleDateString()}
                </p>
              </div>
            </div>

            <button className="campaign-next" onClick={activateCampaignFromModal} disabled={campaignSaving}>
              {campaignSaving ? "Activating..." : "Activate Campaign"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
