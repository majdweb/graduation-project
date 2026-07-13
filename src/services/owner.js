// CHANGED: this file used to have its own local fetch wrapper (duplicated across every service
// file); now uses the shared client in apiClient.js instead, which also handles automatic
// access-token refresh on a 401.
import { apiRequest as request, apiUpload } from './apiClient';

function mapHotelDetailToProfile(h) {
  const images = Array.isArray(h?.images) ? [...h.images].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) : [];
  return {
    hotelName: h?.name || '',
    city: h?.city || '',
    address: h?.address || '',
    phoneNumber: h?.phone || '',
    description: h?.description || '',
    // CHANGED BY AI (2026-07-13): now carries id + isPrimary (not just the url) so a photo can be
    // deleted, and so the upload flow knows whether a primary/card image already exists. Note: the
    // backend's hotel-images DTO names this field "imageId" (not "id", unlike room-type images) —
    // a pre-existing inconsistency, not something introduced here.
    photos: images.map((i) => ({ id: i.imageId, url: i.url, isPrimary: Boolean(i.isPrimary) })),
    // CHANGED BY AI (2026-07-13): starRating is now shown read-only on OwnerHotelInfo.js, so it's
    // exposed as a normal field (it can't be edited directly here — only via an approved Hotel
    // Request — but the value itself is real, not internal-only).
    starRating: h?.starRating || 0,
    // Not shown in the edit form, but required to send back on update.
    _country: h?.country || '',
    _email: h?.email || '',
  };
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getBilling(hotelId) {
  const d = await request(`/api/v1/owner/dashboard/${hotelId}`);
  const gross = Number(d?.revenue?.grossRevenue) || 0;
  const platformFee = Number(d?.revenue?.platformFee) || 0;
  const platformCutPercent = gross > 0 ? Math.round((platformFee / gross) * 1000) / 10 : 15;
  return { gross, platformCutPercent };
}

// The dashboard endpoint only gives pre-aggregated monthly/quarterly/yearly totals, with no
// day-by-day breakdown. To get an actual daily chart for "monthly"/"custom" modes, this fetches
// every booking for the hotel once and aggregates it here instead. Only Confirmed/Completed
// bookings count as revenue, matching how the backend's own dashboard totals are computed.
// Revenue is attributed to the booking's check-in date, not the date it was made — so a booking
// made today for an August stay counts as August revenue.
//
// The caller (OwnerStats.js) reads all four summary.* fields from a single response regardless
// of which chart tab is active, so all four are always computed here — only the `points` array
// (the actual chart data) depends on the selected `mode`.
export async function getRevenueStats(hotelId, filters = {}) {
  const raw = await request(`/api/v1/bookings/hotel/${hotelId}`);
  const paid = (Array.isArray(raw) ? raw : [])
    .filter((b) => b.status === 'Confirmed' || b.status === 'Completed')
    .map((b) => {
      // Parsed manually (rather than `new Date(b.checkinDate)`) since a plain "YYYY-MM-DD"
      // string is parsed as UTC midnight by JS, which can shift a day off from local time.
      const [y, m, d] = String(b.checkinDate).split('-').map(Number);
      return { stayDate: new Date(y, m - 1, d), amount: Number(b.totalAmount) || 0 };
    });

  const sumRange = (from, to) =>
    paid.filter((b) => b.stayDate >= from && b.stayDate < to).reduce((s, b) => s + b.amount, 0);

  const year = Number(filters.year) || new Date().getFullYear();
  const month = Number(filters.month) || 0; // 0-indexed, matches JS Date months
  const quarter = Number(filters.quarter) || Math.floor(month / 3) + 1;
  const quarterStartMonth = (quarter - 1) * 3;
  const mode = filters.mode || 'monthly';
  const now = new Date();

  const summary = {
    monthly: sumRange(new Date(year, month, 1), new Date(year, month + 1, 1)),
    quarterly: sumRange(new Date(year, quarterStartMonth, 1), new Date(year, quarterStartMonth + 3, 1)),
    yearly: sumRange(new Date(year, 0, 1), new Date(year + 1, 0, 1)),
    ytd: sumRange(new Date(year, 0, 1), new Date(year, now.getMonth(), now.getDate() + 1)),
    custom: 0,
  };
  let points = [];

  if (mode === 'monthly') {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d += 1) {
      points.push({ label: String(d), value: sumRange(new Date(year, month, d), new Date(year, month, d + 1)) });
    }
  } else if (mode === 'quarterly') {
    for (let i = 0; i < 3; i += 1) {
      const m = quarterStartMonth + i;
      points.push({ label: MONTH_LABELS[m], value: sumRange(new Date(year, m, 1), new Date(year, m + 1, 1)) });
    }
  } else if (mode === 'yearly') {
    for (let m = 0; m < 12; m += 1) {
      points.push({ label: MONTH_LABELS[m], value: sumRange(new Date(year, m, 1), new Date(year, m + 1, 1)) });
    }
  } else if (mode === 'ytd') {
    for (let m = 0; m <= now.getMonth(); m += 1) {
      points.push({ label: MONTH_LABELS[m], value: sumRange(new Date(year, m, 1), new Date(year, m + 1, 1)) });
    }
  } else {
    // custom
    const start = filters.startDate ? new Date(filters.startDate) : new Date(0);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    const cursor = new Date(start);
    while (cursor <= end) {
      const from = new Date(cursor);
      const to = new Date(cursor);
      to.setDate(to.getDate() + 1);
      points.push({ label: `${from.getMonth() + 1}/${from.getDate()}`, value: sumRange(from, to) });
      cursor.setDate(cursor.getDate() + 1);
    }
    summary.custom = points.reduce((s, p) => s + p.value, 0);
  }

  return { summary, points };
}

// CHANGED BY AI (2026-07-13): the dashboard endpoint has no star-rating field, so it's fetched
// separately from the hotel record itself and merged in — this is now the single reliable source
// for the owner dashboard's star display (OwnerDashboard.js previously read a stale/never-set
// `user.stars` value instead).
export async function getMetrics(hotelId) {
  const [d, h] = await Promise.all([
    request(`/api/v1/owner/dashboard/${hotelId}`),
    request(`/api/v1/hotels/${hotelId}`),
  ]);
  const totalBookings = d?.bookingStats?.totalBookings || 0;
  const gross = Number(d?.revenue?.grossRevenue) || 0;
  return {
    impressions: d?.viewStats?.totalViews || 0,
    clicks: d?.viewStats?.totalClicks || 0,
    bookings: totalBookings,
    cancellations: d?.bookingStats?.cancelledBookings || 0,
    // Approximation: average revenue per booking, not a true per-night average price.
    avgPrice: totalBookings > 0 ? Math.round(gross / totalBookings) : 0,
    stars: h?.starRating || 0,
    // No backend concept yet, so this always reads as off.
    campaignActive: false,
  };
}

// The real backend splits "a room" into a Room Type (name/capacity/price) plus individual
// physical Rooms under it. This flattens that back into the single-object-per-listing shape
// the owner dashboard UI already expects (id = the room type's id, amount = how many physical
// rooms exist under it). Variants/photos aren't returned since the backend has no equivalent yet.
export async function getRooms(hotelId) {
  const roomTypes = await request(`/api/v1/hotel/${hotelId}/room-types`);
  const list = Array.isArray(roomTypes) ? roomTypes : [];
  const withCounts = await Promise.all(
    list.map(async (rt) => {
      let units = [];
      try {
        units = await request(`/api/v1/hotel/${hotelId}/room-types/${rt.id}/rooms`);
      } catch (e) { units = []; }
      return {
        id: rt.id,
        name: rt.name,
        capacity: rt.capacity,
        price: rt.basePrice,
        amount: Array.isArray(units) ? units.length : 0,
        status: 'active',
        bookable: true,
        variants: [],
        photos: rt.primaryImageUrl ? [rt.primaryImageUrl] : [],
        // CHANGED BY AI (2026-07-13): real review stats for the Reviews feature (previously not
        // returned by this endpoint at all).
        avgScore: rt.avgScore ?? null,
        reviewCount: rt.reviewCount || 0,
      };
    })
  );
  return withCounts;
}

// The hotel-bookings list endpoint only returns thin summaries (no guest name or room), so each
// booking's full detail is fetched separately to get that. Fine at this scale; would want a
// dedicated backend endpoint if a hotel ever has a lot of bookings.
export async function getReservations(hotelId) {
  const summaries = await request(`/api/v1/bookings/hotel/${hotelId}`);
  const list = Array.isArray(summaries) ? summaries : [];
  const details = await Promise.all(
    list.map((s) => request(`/api/v1/bookings/${s.id}`).catch(() => null))
  );
  return details.filter(Boolean).map((b) => {
    const primaryGuest = (b.guests || []).find((g) => g.isPrimary) || (b.guests || [])[0];
    return {
      id: b.id,
      roomId: null,
      roomName: b.items?.[0]?.roomTypeName || '',
      guestName: primaryGuest?.fullName || '',
      guestEmail: null,
      guestPhone: null,
      checkIn: b.checkinDate,
      checkOut: b.checkoutDate,
      status: String(b.status || '').toLowerCase(),
    };
  });
}

// Lists the individual physical rooms (e.g. "101", "102") under one room type, so a specific
// unit can be blocked independently of the others.
export async function getRoomUnits(hotelId, roomTypeId) {
  const list = await request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}/rooms`);
  return Array.isArray(list) ? list.map((r) => ({ id: r.id, roomNumber: r.roomNumber, status: r.status })) : [];
}

// Day-by-day availability for one physical room over a date range.
export async function getRoomAvailability(hotelId, roomTypeId, roomId, from, to) {
  const list = await request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}/rooms/${roomId}/availability?from=${from}&to=${to}`);
  return Array.isArray(list) ? list : [];
}

// Blocks (status: 'Blocked') or releases (status: 'Free') one physical room for a date range —
// e.g. taking a specific room out of service for maintenance without affecting the others.
export async function setRoomAvailability(hotelId, roomTypeId, roomId, { from, to, status, priceOverride }) {
  return request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}/rooms/${roomId}/availability`, {
    method: 'POST',
    body: JSON.stringify({ from, to, status, priceOverride: priceOverride ?? null }),
  });
}

// CHANGED BY AI (2026-07-13): please review — cancelPolicy is now wired to the real backend too
// (previously always unset; the dashboard's "free cancellation" toggle posted to a mock endpoint
// and never affected anything real). Campaign settings still have no backend equivalent.
export async function getSettings(hotelId) {
  const h = await request(`/api/v1/hotels/${hotelId}`);
  return {
    autoAcceptBookings: Boolean(h?.autoAcceptBookings),
    breakfast: { available: Boolean(h?.breakfastAvailable), price: Number(h?.breakfastPrice) || 0 },
    cancelPolicy: {
      freeCancel: Boolean(h?.freeCancellationEnabled),
      daysBefore: Number(h?.freeCancellationDaysBefore) || 0,
      feeType: h?.cancellationFeeType === 'Flat' ? 'flat' : 'percentage',
      feeValue: Number(h?.cancellationFeeValue) || 0,
    },
  };
}

export async function getHotelProfile(hotelId) {
  const h = await request(`/api/v1/hotels/${hotelId}`);
  return mapHotelDetailToProfile(h);
}

// The real backend's update endpoint replaces the whole hotel record, so fields the edit form
// doesn't expose (country, email, star rating) are carried through unchanged from the current
// profile rather than being wiped out.
export async function updateHotelProfile(hotelId, updates) {
  const current = await getHotelProfile(hotelId);
  const payload = {
    name: updates.hotelName ?? current.hotelName,
    description: updates.description ?? current.description,
    address: updates.address ?? current.address,
    city: updates.city ?? current.city,
    country: current._country,
    starRating: current.starRating,
    phone: updates.phoneNumber ?? current.phoneNumber,
    email: current._email,
  };
  const h = await request(`/api/v1/hotels/${hotelId}`, { method: 'PUT', body: JSON.stringify(payload) });
  return mapHotelDetailToProfile(h);
}

export async function updateSettings(hotelId, updates) {
  if (typeof updates.autoAcceptBookings !== 'undefined') {
    await request(`/api/v1/hotels/${hotelId}/auto-accept-bookings`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: Boolean(updates.autoAcceptBookings) }),
    });
  }
  if (updates.breakfast) {
    await request(`/api/v1/hotels/${hotelId}/breakfast-settings`, {
      method: 'PATCH',
      body: JSON.stringify({
        available: Boolean(updates.breakfast.available),
        price: Number(updates.breakfast.price) || 0,
      }),
    });
  }
  return getSettings(hotelId);
}

// Only valid on bookings still Pending (in practice, "pay on arrival" bookings — paid bookings
// confirm themselves automatically).
export async function acceptReservation(hotelId, reservationId) {
  return request(`/api/v1/bookings/${reservationId}/accept`, { method: 'POST' });
}

export async function rejectReservation(hotelId, reservationId) {
  return request(`/api/v1/bookings/${reservationId}/reject`, { method: 'POST' });
}

export async function createReservation(hotelId, payload) {
  return request(`/api/hotels/${hotelId}/reservations`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function toggleCampaign(hotelId, enable, campaignConfig = null) {
  return request(`/api/owner/${hotelId}/campaign`, {
    method: 'POST',
    body: JSON.stringify({ enable, campaignConfig })
  });
}

// CHANGED BY AI (2026-07-13): please review — rewired from a mock "/api/owner/{hotelId}/cancel-
// policy" endpoint (never existed on the real backend) to the real cancellation policy endpoint.
// policy: { freeCancel, daysBefore, feeType: 'percentage'|'flat', feeValue }.
export async function updateCancelPolicy(hotelId, policy) {
  return request(`/api/v1/hotels/${hotelId}/cancellation-policy`, {
    method: 'PATCH',
    body: JSON.stringify({
      freeCancellationEnabled: Boolean(policy.freeCancel),
      freeCancellationDaysBefore: Number(policy.daysBefore) || 0,
      cancellationFeeType: policy.feeType === 'flat' ? 'Flat' : 'Percentage',
      cancellationFeeValue: Number(policy.feeValue) || 0,
    }),
  });
}

// Updates the room type's name/capacity/price only. Changing "amount" here intentionally does
// NOT add or remove physical rooms — the real backend has no bulk-resize concept, and silently
// deleting real room inventory to shrink a count would be unsafe. Adding/removing individual
// room numbers needs its own UI later.
export async function updateRoom(hotelId, roomTypeId, updates) {
  const current = await request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}`);
  const payload = {
    name: updates.name ?? current.name,
    description: current.description || '',
    capacity: Number(updates.capacity) || current.capacity,
    beds: current.beds,
    basePrice: Number(updates.price) || current.basePrice,
  };
  const rt = await request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}`, { method: 'PUT', body: JSON.stringify(payload) });
  return { id: rt.id, name: rt.name, capacity: rt.capacity, price: rt.basePrice };
}

// Deleting a room type with physical rooms under it now works fine (they cascade-delete along
// with it). It's still blocked — correctly, on purpose — if the room type has ever been booked,
// to avoid destroying booking/financial history; that fails with a clear "has existing bookings"
// error rather than something to work around here.
export async function deleteRoom(hotelId, roomTypeId) {
  return request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}`, { method: 'DELETE' });
}

// CHANGED BY AI (2026-07-13): replaces the old getUploadUrls, which posted to a mock
// "/api/uploads/signed-urls" endpoint that never existed on the real backend — photo uploads were
// completely non-functional before this. Uploads the file directly (multipart) and records it as
// a HotelImage in one request.
export async function uploadHotelPhoto(hotelId, file, { isPrimary = false, caption = '' } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isPrimary', String(Boolean(isPrimary)));
  if (caption) formData.append('caption', caption);
  return apiUpload(`/api/v1/hotels/${hotelId}/images/upload`, formData);
}

export async function deleteHotelPhoto(hotelId, imageId) {
  return request(`/api/v1/hotels/${hotelId}/images/${imageId}`, { method: 'DELETE' });
}

// Same idea as uploadHotelPhoto, for a room type's photos.
export async function uploadRoomTypePhoto(hotelId, roomTypeId, file, { isPrimary = false, caption = '' } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isPrimary', String(Boolean(isPrimary)));
  if (caption) formData.append('caption', caption);
  return apiUpload(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}/images/upload`, formData);
}

export async function deleteRoomTypePhoto(hotelId, roomTypeId, imageId) {
  return request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}/images/${imageId}`, { method: 'DELETE' });
}

// The room-types list endpoint only exposes a single primaryImageUrl; the full per-image list
// (with ids, needed to delete a specific photo) only comes from the room type detail endpoint.
export async function getRoomTypeImages(hotelId, roomTypeId) {
  const rt = await request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}`);
  const images = Array.isArray(rt?.images) ? rt.images : [];
  return images.map((i) => ({ id: i.id, url: i.url, isPrimary: Boolean(i.isPrimary) }));
}

// Creates a Room Type, then creates `amount` individual physical Room records under it
// (auto-numbered e.g. "Deluxe-1", "Deluxe-2"). Variants and photos from the form are not sent
// anywhere — the real backend has no matching concept for either yet.
export async function createRoom(hotelId, payload) {
  const roomType = await request(`/api/v1/hotel/${hotelId}/room-types`, {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      description: '',
      capacity: Number(payload.capacity) || 1,
      beds: 1,
      basePrice: Number(payload.price) || 0,
    }),
  });

  const amount = Math.max(1, Number(payload.amount) || 1);
  for (let i = 1; i <= amount; i += 1) {
    await request(`/api/v1/hotel/${hotelId}/room-types/${roomType.id}/rooms`, {
      method: 'POST',
      body: JSON.stringify({ roomNumber: `${payload.name}-${i}`, floor: null, notes: null }),
    });
  }

  return { id: roomType.id, name: roomType.name, capacity: roomType.capacity, price: roomType.basePrice, amount };
}

// CHANGED BY AI (2026-07-13): please review — rewired from a mock endpoint that never existed on
// the real backend to the real hotel-wide reviews summary.
export async function getHotelReviews(hotelId) {
  return request(`/api/v1/hotels/${hotelId}/reviews`);
}

const ownerService = { getBilling, getRevenueStats, getMetrics, getRooms, getReservations, getSettings, getHotelProfile, updateHotelProfile, updateSettings, acceptReservation, rejectReservation, createReservation, toggleCampaign, updateCancelPolicy, updateRoom, deleteRoom, uploadHotelPhoto, deleteHotelPhoto, uploadRoomTypePhoto, deleteRoomTypePhoto, getRoomTypeImages, createRoom, getHotelReviews };
export default ownerService;
