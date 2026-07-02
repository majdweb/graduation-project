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

export async function getHotels() {
  return request("/api/hotels");
}

export async function getStats() {
  return request("/api/stats");
}

export async function getHotelsAnalytics() {
  return request("/api/admin/hotels-analytics");
}

export async function searchRooms({ checkIn, checkOut } = {}) {
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  const query = params.toString();
  return request(`/api/rooms/search${query ? `?${query}` : ""}`);
}

export async function setHotelStars(userId, stars) {
  return request(`/api/admin/hotels/${userId}/stars`, {
    method: 'PATCH',
    body: JSON.stringify({ stars }),
  });
}

export async function approveHotel(email, stars) {
  return request('/api/admin/approve-hotel', {
    method: 'PATCH',
    body: JSON.stringify({ email, stars: stars || undefined }),
  });
}

const hotelsService = { getHotels, getHotelsAnalytics, searchRooms, approveHotel };
export default hotelsService;
