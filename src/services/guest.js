// CHANGED: this file used to have its own local fetch wrapper (duplicated across every service
// file); now uses the shared client in apiClient.js instead, which also handles automatic
// access-token refresh on a 401.
import { apiRequest as request } from './apiClient';

// The real backend identifies the caller from their login token, not a userId param (kept here
// only so existing call sites don't need to change). Like the owner's reservations list, the
// "my bookings" list endpoint only returns thin summaries, so each booking's detail is fetched
// separately to get its room/hotel name.
export async function getMyBookings(userId) {
  const summaries = await request('/api/v1/bookings/my');
  const list = Array.isArray(summaries) ? summaries : [];
  const details = await Promise.all(
    list.map((s) => request(`/api/v1/bookings/${s.id}`).catch(() => null))
  );
  return details.filter(Boolean).map((b) => ({
    id: b.id,
    roomName: b.items?.[0]?.roomTypeName || '',
    hotelName: b.hotelName,
    checkIn: b.checkinDate,
    checkOut: b.checkoutDate,
    status: String(b.status || '').toLowerCase(),
    // CHANGED BY AI (2026-07-13): now reflects the real backend fields (reviewable once the
    // checkout date has passed, the booking wasn't cancelled, and it hasn't been reviewed yet).
    reviewable: Boolean(b.reviewable),
    hasReview: Boolean(b.hasReview),
    // CHANGED BY AI (2026-07-13): please review — real per-hotel cancellation policy (previously
    // always a hardcoded { freeCancel: true, daysBefore: 2 } fallback, unrelated to the actual
    // hotel or what the backend would really charge).
    cancelPolicy: {
      freeCancel: Boolean(b.freeCancellationEnabled),
      daysBefore: Number(b.freeCancellationDaysBefore) || 0,
      feeType: b.cancellationFeeType === 'Flat' ? 'flat' : 'percentage',
      feeValue: Number(b.cancellationFeeValue) || 0,
    },
    modificationFee: b.modificationFee ?? null,
    totalAmount: b.totalAmount,
    totalNights: b.totalNights,
    pricePerNight: b.items?.[0]?.pricePerNight || 0,
  }));
}

export async function cancelBooking(reservationId, userId) {
  return request(`/api/v1/bookings/${reservationId}/cancel`, { method: 'POST' });
}

// CHANGED BY AI (2026-07-13): please review — rewired from a mock "/api/reservations/{id}" PATCH
// (never existed on the real backend) to the real modify-dates endpoint. `userId` is unused (the
// backend identifies the caller from the login token), kept only so the existing call site
// doesn't need to change.
export async function updateBooking(reservationId, userId, checkIn, checkOut) {
  const b = await request(`/api/v1/bookings/${reservationId}/dates`, {
    method: "PATCH",
    body: JSON.stringify({ checkinDate: checkIn, checkoutDate: checkOut }),
  });
  return {
    id: b.id,
    checkIn: b.checkinDate,
    checkOut: b.checkoutDate,
    status: String(b.status || '').toLowerCase(),
    totalAmount: b.totalAmount,
    modificationFee: b.modificationFee ?? null,
  };
}

// CHANGED BY AI (2026-07-13): please review — rewired to the real Reviews endpoint. `ratings` is
// the { staff, location, facilities, cleanliness, comfort, value } object built by MyBookings.js;
// `userId` is unused (the backend identifies the caller from the login token), kept only so the
// existing call site doesn't need to change.
export async function submitReview(reservationId, userId, ratings, comment) {
  return request(`/api/v1/bookings/${reservationId}/review`, {
    method: 'POST',
    body: JSON.stringify({ ...ratings, comment }),
  });
}

// hotelId + roomTypeId are both required by the real per-room-type reviews endpoint.
export async function getRoomReviews(hotelId, roomTypeId) {
  return request(`/api/v1/hotel/${hotelId}/room-types/${roomTypeId}/reviews`);
}

// Creates a booking for one room type/quantity. The backend auto-assigns specific physical
// rooms and computes pricing itself; it starts as "Pending" until payment is confirmed (or
// "Confirmed" immediately if the hotel has auto-accept on). Breakfast, if requested, is priced
// server-side per guest per night — one Guest entry is sent per person in the party so that
// pricing (and the guest headcount) is accurate; only the primary guest's name is known, so
// the rest are recorded as "Guest 2", "Guest 3", etc.
export async function createBooking({ hotelId, roomTypeId, checkIn, checkOut, specialRequests, guestName, guestCount, includeBreakfast }) {
  const count = Math.max(1, Number(guestCount) || 1);
  const guests = Array.from({ length: count }, (_, i) => ({
    fullName: i === 0 ? guestName : `Guest ${i + 1}`,
    passportNo: null,
    nationality: null,
    dateOfBirth: null,
    isPrimary: i === 0,
  }));
  const payload = {
    hotelId,
    checkinDate: checkIn,
    checkoutDate: checkOut,
    specialRequests: specialRequests || null,
    items: [{ roomTypeId, qty: 1 }],
    guests,
    includeBreakfast: Boolean(includeBreakfast),
  };
  return request('/api/v1/bookings', { method: 'POST', body: JSON.stringify(payload) });
}

// The backend doesn't validate real payment details — "confirming" just accepts a reference
// string. There's nowhere to send card number/expiry/CVV, so those fields stay UI-only.
export async function initiatePayment(bookingId, method) {
  return request('/api/v1/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ bookingId, method, currency: 'USD' }),
  });
}

export async function confirmPayment(paymentId, transactionRef) {
  return request('/api/v1/payments/confirm', {
    method: 'POST',
    body: JSON.stringify({ paymentId, transactionRef }),
  });
}

const guestService = { getMyBookings, cancelBooking, updateBooking, submitReview, getRoomReviews, createBooking, initiatePayment, confirmPayment };
export default guestService;
