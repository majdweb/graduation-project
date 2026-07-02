const BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (error) {
    data = null;
  }
  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed: ${res.status}`);
  return data;
}

export async function getMyBookings(userId) {
  return request(`/api/guests/${userId}/reservations`);
}

export async function cancelBooking(reservationId, userId) {
  return request(`/api/reservations/${reservationId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function updateBooking(reservationId, userId, checkIn, checkOut) {
  return request(`/api/reservations/${reservationId}`, {
    method: "PATCH",
    body: JSON.stringify({ userId, checkIn, checkOut }),
  });
}

export async function submitReview(reservationId, userId, ratings, comment) {
  return request(`/api/reservations/${reservationId}/review`, {
    method: 'POST',
    body: JSON.stringify({ userId, ratings, comment }),
  });
}

export async function getRoomReviews(roomId) {
  return request(`/api/rooms/${roomId}/reviews`);
}

const guestService = { getMyBookings, cancelBooking, updateBooking, submitReview, getRoomReviews };
export default guestService;
