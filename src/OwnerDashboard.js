import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import "./ownerDashboard.css";
import * as ownerSvc from "./services/owner";
import { getCurrentUser } from "./services/auth";

const CAT_LABELS = { staff: 'Staff', location: 'Location', facilities: 'Facilities', cleanliness: 'Cleanliness', comfort: 'Comfort', value: 'Value' };

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

// Collapses a day-by-day availability list into contiguous "Blocked" date ranges, so the UI can
// show "Jul 20 -> Jul 22" instead of three separate days.
function groupBlockedRanges(days) {
  const blockedDates = days.filter((d) => d.status === 'Blocked').map((d) => d.date).sort();
  const ranges = [];
  let rangeStart = null;
  let prevDate = null;
  for (const dateStr of blockedDates) {
    if (rangeStart === null) {
      rangeStart = dateStr;
      prevDate = dateStr;
      continue;
    }
    const expectedNext = new Date(`${prevDate}T00:00:00`);
    expectedNext.setDate(expectedNext.getDate() + 1);
    if (dateStr === toDateKey(expectedNext)) {
      prevDate = dateStr;
    } else {
      ranges.push({ from: rangeStart, to: prevDate });
      rangeStart = dateStr;
      prevDate = dateStr;
    }
  }
  if (rangeStart !== null) ranges.push({ from: rangeStart, to: prevDate });
  return ranges;
}

export default function OwnerDashboard() {
  const hotelId = useMemo(() => {
    const envHotelId = process.env.REACT_APP_HOTEL_ID;
    if (envHotelId) return envHotelId;

    const user = getCurrentUser() || {};
    return String(user.hotelId || user.hotelName || user.id || 1);
  }, []);

  const [bills, setBills] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [campaignActive, setCampaignActive] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [cancelPolicy, setCancelPolicy] = useState({ freeCancel: true, daysBefore: 2, feeType: 'percentage', feeValue: 20 });
  const [breakfastAvailable, setBreakfastAvailable] = useState(false);
  const [breakfastPrice, setBreakfastPrice] = useState(0);
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
  const [availabilityRoomType, setAvailabilityRoomType] = useState(null);
  const [availabilityUnits, setAvailabilityUnits] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [blockForm, setBlockForm] = useState({});
  const [blockSavingId, setBlockSavingId] = useState(null);
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
  const [hotelReviews, setHotelReviews] = useState(null);

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
    // Include checkout-day reservations so departures appear in the modal
    const dayReservations = reservations.filter((reservation) =>
      (reservation.status === 'confirmed' || reservation.status === 'pending') &&
      (overlapsReservation(selectedCalendarDay, reservation) || sameDay(selectedCalendarDay, toDate(reservation.checkOut)))
    );
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

    // Occupancy only counts reservations that truly overlap (checking-out guests have left)
    const occupiedUnitsByRoomId = reservations
      .filter(r => (r.status === 'confirmed' || r.status === 'pending') && overlapsReservation(selectedCalendarDay, r))
      .reduce((acc, reservation) => {
        const roomKey = String(reservation.roomId || '');
        if (!roomKey) return acc;
        acc[roomKey] = (acc[roomKey] || 0) + 1;
        return acc;
      }, {});
    const availableRoomCount = rooms.reduce((total, room) => {
      if (room.bookable === false) return total;
      const variantUnits = Array.isArray(room.variants)
        ? room.variants.filter(v => v.name && v.name.trim()).reduce((s, v) => s + (Number(v.amount) || 0), 0)
        : 0;
      const totalUnits = Math.max(0, Number(room.amount) || 0) + variantUnits;
      const occupiedUnits = occupiedUnitsByRoomId[String(room.id)] || 0;
      return total + Math.max(0, totalUnits - occupiedUnits);
    }, 0);
    const blockedRooms = rooms.filter((room) => room.bookable === false);
    const blockedRoomCount = blockedRooms.reduce((total, room) => {
      const variantUnits = Array.isArray(room.variants)
        ? room.variants.filter(v => v.name && v.name.trim()).reduce((s, v) => s + (Number(v.amount) || 0), 0)
        : 0;
      return total + Math.max(0, Number(room.amount) || 0) + variantUnits;
    }, 0);
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

  // CHANGED BY AI (2026-07-13): please review — was seeding existingPhotoUrls from r.photos (at
  // most a single primaryImageUrl string, no id), which made deleting an existing photo
  // impossible. Now fetches the room type's full image list (with real ids) so removal can
  // actually be persisted.
  async function openEditRoom(r) {
    setSelectedRoomId(r.id || null);
    setExistingPhotoUrls([]);
    setPhotoPreviews([]);
    setPhotos([]);
    setRoomName(r.name || '');
    setRoomAmount(r.amount || 1);
    setRoomCapacity(r.capacity || 1);
    setRoomPrice(r.price || 0);
    setRoomStatus(r.status || 'draft');
    setVariants(Array.isArray(r.variants) ? r.variants.map(v => ({ name: v.name || '', amount: Number(v.amount) || Number(v.capacity) || 1, price: Number(v.price) || Number(v.priceDelta) || 0 })) : []);
    setAddRoomOpen(true);
    if (r.id) {
      const images = await ownerSvc.getRoomTypeImages(hotelId, r.id).catch(() => []);
      setExistingPhotoUrls(images);
    }
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

  function availabilityWindow() {
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + 90);
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  async function openAvailability(room) {
    setAvailabilityRoomType(room);
    setAvailabilityUnits([]);
    setAvailabilityError('');
    setBlockForm({});
    setAvailabilityLoading(true);
    try {
      const units = await ownerSvc.getRoomUnits(hotelId, room.id);
      const { from, to } = availabilityWindow();
      const withRanges = await Promise.all(units.map(async (unit) => {
        const days = await ownerSvc.getRoomAvailability(hotelId, room.id, unit.id, from, to).catch(() => []);
        return { ...unit, blockedRanges: groupBlockedRanges(days) };
      }));
      setAvailabilityUnits(withRanges);
    } catch (err) {
      setAvailabilityError(err.message || 'Unable to load room availability.');
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function closeAvailability() {
    setAvailabilityRoomType(null);
    setAvailabilityUnits([]);
    setAvailabilityError('');
    setBlockForm({});
  }

  function updateBlockField(unitId, field, value) {
    setBlockForm((prev) => ({ ...prev, [unitId]: { ...prev[unitId], [field]: value } }));
  }

  async function refreshUnitAvailability(unitId) {
    const { from, to } = availabilityWindow();
    const days = await ownerSvc.getRoomAvailability(hotelId, availabilityRoomType.id, unitId, from, to).catch(() => []);
    setAvailabilityUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, blockedRanges: groupBlockedRanges(days) } : u)));
  }

  async function handleBlockDates(unitId) {
    const form = blockForm[unitId] || {};
    if (!form.from || !form.to) { alert('Pick both a from and to date.'); return; }
    if (form.from > form.to) { alert('The "to" date must be on or after the "from" date.'); return; }
    setBlockSavingId(unitId);
    try {
      await ownerSvc.setRoomAvailability(hotelId, availabilityRoomType.id, unitId, { from: form.from, to: form.to, status: 'Blocked' });
      await refreshUnitAvailability(unitId);
      setBlockForm((prev) => ({ ...prev, [unitId]: { from: '', to: '' } }));
    } catch (err) {
      alert('Unable to block these dates: ' + (err.message || err));
    } finally {
      setBlockSavingId(null);
    }
  }

  async function handleUnblockRange(unitId, range) {
    setBlockSavingId(unitId);
    try {
      await ownerSvc.setRoomAvailability(hotelId, availabilityRoomType.id, unitId, { from: range.from, to: range.to, status: 'Free' });
      await refreshUnitAvailability(unitId);
    } catch (err) {
      alert('Unable to unblock these dates: ' + (err.message || err));
    } finally {
      setBlockSavingId(null);
    }
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

  // CHANGED BY AI (2026-07-13): please review — now deletes the photo on the backend right away
  // (existingPhotoUrls entries carry real image ids now, see openEditRoom) instead of only
  // removing it from local state, which never actually persisted before.
  async function removeExistingPhoto(idx) {
    const photo = existingPhotoUrls[idx];
    if (!photo || !selectedRoomId) return;
    try {
      await ownerSvc.deleteRoomTypePhoto(hotelId, selectedRoomId, photo.id);
      setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      alert('Unable to remove photo: ' + (err.message || err));
    }
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
    setVariants(v => [...v, { name: '', amount: 1, price: 0 }]);
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
      const payload = {
        hotelId,
        name: roomName,
        amount: Number(roomAmount) || 1,
        capacity: Number(roomCapacity) || 1,
        price: Number(roomPrice) || 0,
        variants: variants.map(v => ({ name: v.name, amount: Number(v.amount) || 1, price: Number(v.price) || 0 })),
        status: selectedRoomId ? roomStatus : 'draft'
      };

      let roomTypeId = selectedRoomId;
      if (selectedRoomId) {
        // update existing room
        await ownerSvc.updateRoom(hotelId, selectedRoomId, payload);
      } else {
        // create new
        const created = await ownerSvc.createRoom(hotelId, payload);
        roomTypeId = created?.id;
      }

      // CHANGED BY AI (2026-07-13): please review — new photos are now uploaded directly (real
      // multipart upload) once the room type exists, instead of the old mock signed-url flow
      // that never actually saved anything. The first photo becomes primary only if the room
      // type has no primary image yet.
      if (photos.length && roomTypeId) {
        const hasPrimary = existingPhotoUrls.some((p) => p.isPrimary);
        for (let i = 0; i < photos.length; i += 1) {
          const isPrimary = !hasPrimary && i === 0;
          try {
            await ownerSvc.uploadRoomTypePhoto(hotelId, roomTypeId, photos[i], { isPrimary });
          } catch (err) {
            console.warn('Upload failed for', photos[i].name, err);
          }
        }
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
        const [b, m, r, res, settings, rv] = await Promise.all([
          ownerSvc.getBilling(hotelId).catch(() => null),
          ownerSvc.getMetrics(hotelId).catch(() => null),
          ownerSvc.getRooms(hotelId).catch(() => null),
          ownerSvc.getReservations(hotelId).catch(() => null),
          ownerSvc.getSettings(hotelId).catch(() => null),
          ownerSvc.getHotelReviews(hotelId).catch(() => null),
        ]);
        if (!mounted) return;
        if (b) setBills(b); else setBills({ gross: 0, platformCutPercent: 0 });
        if (m) setMetrics(m); else setMetrics({ impressions: 0, clicks: 0, bookings: 0, cancellations: 0, avgPrice: 0, stars: 0 });
        if (r) setRooms(r); else setRooms([]);
        setCampaignActive(Boolean(m?.campaignActive));
        if (res) setReservations(res); else setReservations([]);
        if (rv) setHotelReviews(rv);
        if (settings && typeof settings.autoAcceptBookings !== 'undefined') setAutoAcceptBookings(Boolean(settings.autoAcceptBookings));
        if (settings?.cancelPolicy) {
          setCancelPolicy({
            freeCancel: Boolean(settings.cancelPolicy.freeCancel),
            daysBefore: Number(settings.cancelPolicy.daysBefore) || 0,
            feeType: settings.cancelPolicy.feeType === 'flat' ? 'flat' : 'percentage',
            feeValue: Number(settings.cancelPolicy.feeValue) || 0,
          });
        }
        if (settings?.breakfast) {
          setBreakfastAvailable(Boolean(settings.breakfast.available));
          setBreakfastPrice(Number(settings.breakfast.price) || 0);
        }
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link to="/ownerhome" className="cta" style={{ textDecoration: "none", display: "inline-block" }}>
            Back
          </Link>
          <h1 style={{ margin: 0 }}>Owner Dashboard</h1>
          <Link
            to="/owner/requests"
            className="cta"
            style={{ textDecoration: "none", display: "inline-block", marginLeft: "auto" }}
          >
            📨 Hotel Requests
          </Link>
        </div>
        <p className="muted">Overview of your hotel's performance and settings</p>
        {/* CHANGED BY AI (2026-07-13): please review — was reading getCurrentUser()?.stars, a
            field never populated anywhere in the real-backend-integrated app; now reads the
            hotel's actual starRating via getMetrics(). */}
        {(() => { const s = Number(metrics?.stars) || 0; return s > 0 ? (
          <p style={{ margin: '4px 0 0', fontSize: 22, color: '#f59e0b', letterSpacing: 3 }}>
            {'★'.repeat(s)}{'☆'.repeat(5 - s)}
            <span style={{ fontSize: 13, color: '#6b7280', letterSpacing: 0, marginLeft: 8 }}>{s}-star hotel</span>
          </p>
        ) : null; })()}
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
          <div className="compare-value" style={{ color: '#f59e0b', letterSpacing: 2 }}>
            {metrics?.stars ? '★'.repeat(metrics.stars) + '☆'.repeat(5 - metrics.stars) : '—'}
          </div>
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
            const dayReservations = reservations.filter((reservation) =>
              overlapsReservation(day, reservation) || sameDay(day, toDate(reservation.checkOut))
            );
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
                {(reservation.guestEmail || reservation.guestPhone) && (
                  <span className="muted small">
                    {[reservation.guestEmail, reservation.guestPhone].filter(Boolean).join(' · ')}
                  </span>
                )}
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
                  {(reservation.guestEmail || reservation.guestPhone) && (
                    <div className="muted small">
                      {[reservation.guestEmail, reservation.guestPhone].filter(Boolean).join(' · ')}
                    </div>
                  )}
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
                <div className="muted small">${r.price} / night</div>
                {r.reviewCount > 0 && (
                  <div className="muted small" style={{ marginTop: 2, color: '#2a3d66', fontWeight: 600 }}>
                    ★ {r.avgScore}/10 · {r.reviewCount} review{r.reviewCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="room-actions">
                <button onClick={() => openAvailability(r)} className="booking-toggle on">
                  Manage Availability
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="od-row">
        <h2>Guest Reviews</h2>
        {!hotelReviews || hotelReviews.reviewCount === 0 ? (
          <p className="muted small">No guest reviews yet. Reviews appear here after guests check out and submit their ratings.</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#2a3d66' }}>{hotelReviews.avgScore}</span>
              <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 8 }}>/ 10 overall · {hotelReviews.reviewCount} review{hotelReviews.reviewCount !== 1 ? 's' : ''}</span>
            </div>
            {hotelReviews.categoryAverages && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {Object.entries(CAT_LABELS).map(([key, label]) => (
                  <div key={key} style={{ background: '#f3f4f6', borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2340' }}>{hotelReviews.categoryAverages[key]}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600 }}>Room</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600 }}>Guest</th>
                    <th style={{ textAlign: 'center', padding: '6px 10px', color: '#6b7280', fontWeight: 600 }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600 }}>Comment</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px', color: '#6b7280', fontWeight: 600 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {hotelReviews.reviews.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 500 }}>{r.roomName}</td>
                      <td style={{ padding: '8px 10px' }}>{r.guestName}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ background: '#2a3d66', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 13, fontWeight: 700 }}>{r.overallScore}/10</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#374151', maxWidth: 300 }}>
                        {r.comment.length > 80 ? r.comment.slice(0, 80) + '…' : r.comment}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="od-row od-cancel">
        <h2>Cancellation Policy</h2>
        <div className="cancel-row">
          <label>
            <input type="checkbox" checked={cancelPolicy.freeCancel} onChange={(e) => setCancelPolicy(p => ({ ...p, freeCancel: e.target.checked }))} /> Free cancellation
          </label>
          <label style={{ marginLeft: 12 }}>
            Days before check-in required:
            <input type="number" min={0} value={cancelPolicy.daysBefore} onChange={(e) => setCancelPolicy(p => ({ ...p, daysBefore: Number(e.target.value) }))} />
          </label>
        </div>
        {/* CHANGED BY AI (2026-07-13): please review — new fields for the real cancellation fee
            (charged when a cancellation doesn't qualify as free, or when free cancellation is
            turned off entirely). Previously this whole section posted to a mock endpoint. */}
        <div className="cancel-row" style={{ marginTop: 10 }}>
          <label>
            Otherwise charge:
            <select
              value={cancelPolicy.feeType}
              onChange={(e) => setCancelPolicy(p => ({ ...p, feeType: e.target.value }))}
              style={{ marginLeft: 6 }}
            >
              <option value="percentage">% of booking total</option>
              <option value="flat">Flat amount ($)</option>
            </select>
          </label>
          <label style={{ marginLeft: 12 }}>
            {cancelPolicy.feeType === 'flat' ? 'Amount ($):' : 'Percentage (%):'}
            <input
              type="number"
              min={0}
              step={cancelPolicy.feeType === 'flat' ? 1 : 0.5}
              value={cancelPolicy.feeValue}
              onChange={(e) => setCancelPolicy(p => ({ ...p, feeValue: Number(e.target.value) }))}
            />
          </label>
        </div>
        <div className="cancel-row" style={{ marginTop: 10 }}>
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

      <section className="od-row">
        <h2>Breakfast</h2>
        <div className="cancel-row">
          <label>
            <input
              type="checkbox"
              checked={breakfastAvailable}
              onChange={(e) => setBreakfastAvailable(e.target.checked)}
            /> Offer breakfast to guests
          </label>
          {breakfastAvailable && (
            <label style={{ marginLeft: 12 }}>
              Price per person per night ($):
              <input
                type="number"
                min={0}
                step="0.01"
                value={breakfastPrice}
                onChange={(e) => setBreakfastPrice(Number(e.target.value) || 0)}
                style={{ width: 90, marginLeft: 8 }}
              />
            </label>
          )}
          <button className="save-btn" onClick={async () => {
            try {
              await ownerSvc.updateSettings(hotelId, { breakfast: { available: breakfastAvailable, price: breakfastPrice } });
              alert('Breakfast settings saved');
            } catch (err) {
              alert('Unable to save: ' + err.message);
            }
          }}>Save</button>
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
                  <div key={p.id} className="room-photo-preview-item">
                    <img src={p.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  <input type="number" min={1} placeholder="Amount" value={v.amount} onChange={(e) => updateVariant(i, 'amount', Number(e.target.value) || 1)} />
                  <input type="number" min={0} step="0.01" placeholder="Add-on price" value={v.price} onChange={(e) => updateVariant(i, 'price', Number(e.target.value) || 0)} />
                  <button onClick={() => removeVariant(i)}>Remove</button>
                </div>
              ))}
              <button className="campaign-next" onClick={addVariant}>Add Variant</button>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <div className="room-form-actions">
                {selectedRoomId && (
                  <button
                    className="room-form-actions-btn room-form-actions-delete"
                    onClick={async () => {
                      if (!window.confirm(`Delete room "${roomName || 'room'}"? This cannot be undone.`)) return;
                      try {
                        await ownerSvc.deleteRoom(hotelId, selectedRoomId);
                        setRooms(rs => rs.filter(x => x.id !== selectedRoomId));
                        closeAddRoom();
                      } catch (err) {
                        alert('Unable to delete room: ' + (err.message || err));
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
                <button className="campaign-back room-form-actions-btn" onClick={closeAddRoom} disabled={addSaving}>Cancel</button>
                <button className="campaign-next room-form-actions-btn" onClick={saveRoom} disabled={addSaving}>{addSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {availabilityRoomType && (
        <div className="campaign-modal-overlay" onClick={closeAvailability}>
          <div className="campaign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="campaign-modal-header">
              <h3>Availability — {availabilityRoomType.name}</h3>
              <button className="close-modal" onClick={closeAvailability} aria-label="Close">×</button>
            </div>

            <p className="muted small" style={{ marginBottom: 12 }}>
              Block a specific room for maintenance or other reasons over a date range, without affecting the other rooms of this type.
            </p>

            {availabilityLoading && <p className="muted small">Loading rooms...</p>}
            {availabilityError && <p className="od-error" style={{ color: "#9b1c1c" }}>Error: {availabilityError}</p>}

            {!availabilityLoading && availabilityUnits.length === 0 && !availabilityError && (
              <p className="muted small">This room type has no individual rooms yet.</p>
            )}

            {availabilityUnits.map((unit) => (
              <div key={unit.id} style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Room {unit.roomNumber}</strong>
                  <span className="muted small">{unit.status}</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {unit.blockedRanges.length === 0 ? (
                    <span className="muted small">No blocked dates</span>
                  ) : (
                    unit.blockedRanges.map((range, i) => (
                      <span key={i} className="muted small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 6, padding: '4px 8px' }}>
                        {range.from} → {range.to}
                        <button
                          type="button"
                          disabled={blockSavingId === unit.id}
                          onClick={() => handleUnblockRange(unit.id, range)}
                          style={{ border: 'none', background: 'none', color: '#9b1c1c', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Unblock
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                    From
                    <input
                      type="date"
                      value={blockForm[unit.id]?.from || ''}
                      onChange={(e) => updateBlockField(unit.id, 'from', e.target.value)}
                      style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                    To
                    <input
                      type="date"
                      min={blockForm[unit.id]?.from || undefined}
                      value={blockForm[unit.id]?.to || ''}
                      onChange={(e) => updateBlockField(unit.id, 'to', e.target.value)}
                      style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
                    />
                  </label>
                  <button
                    type="button"
                    className="cta"
                    disabled={blockSavingId === unit.id}
                    onClick={() => handleBlockDates(unit.id)}
                    style={{ height: 36 }}
                  >
                    {blockSavingId === unit.id ? 'Saving...' : 'Block these dates'}
                  </button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="campaign-back room-form-actions-btn" onClick={closeAvailability}>Close</button>
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
