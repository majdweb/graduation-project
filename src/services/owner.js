// Default to mock server at 5001 for local testing; override with REACT_APP_API_BASE_URL
const BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" , ...(options.headers || {})},
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed: ${res.status}`);
  return data;
}

export async function getBilling(hotelId) {
  return request(`/api/owner/${hotelId}/billing`);
}

export async function getRevenueStats(hotelId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.mode) params.set('mode', String(filters.mode));
  if (typeof filters.year !== 'undefined') params.set('year', String(filters.year));
  if (typeof filters.month !== 'undefined') params.set('month', String(filters.month));
  if (typeof filters.quarter !== 'undefined') params.set('quarter', String(filters.quarter));
  if (filters.startDate) params.set('startDate', String(filters.startDate));
  if (filters.endDate) params.set('endDate', String(filters.endDate));
  const query = params.toString();
  return request(`/api/owner/${hotelId}/revenue-stats${query ? `?${query}` : ''}`);
}

export async function getMetrics(hotelId) {
  return request(`/api/owner/${hotelId}/metrics`);
}

export async function getRooms(hotelId) {
  return request(`/api/owner/${hotelId}/rooms`);
}

export async function getReservations(hotelId) {
  return request(`/api/owner/${hotelId}/reservations`);
}

export async function getSettings(hotelId) {
  return request(`/api/owner/${hotelId}/settings`);
}

export async function getHotelProfile(hotelId) {
  return request(`/api/owner/${hotelId}/profile`);
}

export async function updateHotelProfile(hotelId, updates) {
  return request(`/api/owner/${hotelId}/profile`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function updateSettings(hotelId, updates) {
  return request(`/api/owner/${hotelId}/settings`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function acceptReservation(hotelId, reservationId) {
  return request(`/api/owner/${hotelId}/reservations/${reservationId}/accept`, { method: 'POST' });
}

export async function rejectReservation(hotelId, reservationId) {
  return request(`/api/owner/${hotelId}/reservations/${reservationId}/reject`, { method: 'POST' });
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

export async function updateCancelPolicy(hotelId, policy) {
  return request(`/api/owner/${hotelId}/cancel-policy`, { method: 'POST', body: JSON.stringify(policy) });
}

export async function updateRoom(roomId, updates) {
  return request(`/api/rooms/${roomId}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function deleteRoom(roomId) {
  return request(`/api/rooms/${roomId}`, { method: 'DELETE' });
}

export async function getUploadUrls(hotelId, files) {
  // files: [{ name, type, size }]
  return request(`/api/uploads/signed-urls`, { method: 'POST', body: JSON.stringify({ hotelId, files }) });
}

export async function createRoom(hotelId, payload) {
  return request(`/api/owner/${hotelId}/rooms`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getHotelReviews(hotelId) {
  return request(`/api/owner/${hotelId}/reviews`);
}

const ownerService = { getBilling, getRevenueStats, getMetrics, getRooms, getReservations, getSettings, getHotelProfile, updateHotelProfile, updateSettings, acceptReservation, rejectReservation, createReservation, toggleCampaign, updateCancelPolicy, updateRoom, deleteRoom, getUploadUrls, createRoom, getHotelReviews };
export default ownerService;
