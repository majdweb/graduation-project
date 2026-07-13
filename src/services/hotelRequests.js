// CHANGED: this file used to have its own local fetch wrapper (duplicated across every service
// file); now uses the shared client in apiClient.js instead, which also handles automatic
// access-token refresh on a 401.
import { apiRequest as request } from './apiClient';

// Display config for rendering a request's requested changes — used by both the owner and
// admin request-list UIs.
export const REQUEST_FIELDS = [
  { key: 'hotelName', label: 'Hotel Name' },
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Address' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'description', label: 'Description' },
  {
    key: 'stars',
    label: 'Stars',
    render: (v) => {
      const n = Math.min(5, Math.max(0, Number(v) || 0));
      return '★'.repeat(n) + '☆'.repeat(5 - n);
    },
  },
];

function mapRequest(r) {
  return {
    id: r.id,
    type: String(r.type || '').toLowerCase(), // 'create' | 'edit'
    status: String(r.status || '').toLowerCase(), // 'pending' | 'approved' | 'rejected'
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    ownerEmail: r.ownerEmail,
    hotelId: r.hotelId,
    changes: {
      hotelName: r.hotelName || undefined,
      city: r.city || undefined,
      address: r.address || undefined,
      phoneNumber: r.phoneNumber || undefined,
      description: r.description || undefined,
      stars: r.stars || undefined,
    },
    document: r.documentDataUrl ? { name: 'document', dataUrl: r.documentDataUrl } : null,
    rejectionReason: r.rejectionReason || '',
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
  };
}

// type: 'create' | 'edit'. hotelId is only used/required for 'edit'.
export async function submitHotelRequest({ type, hotelId, hotelName, city, address, phoneNumber, description, stars, document }) {
  const payload = {
    type,
    hotelId: hotelId || null,
    hotelName: hotelName || null,
    city: city || null,
    address: address || null,
    phoneNumber: phoneNumber || null,
    description: description || null,
    stars: stars || null,
    documentDataUrl: document?.dataUrl || null,
  };
  const result = await request('/api/v1/hotel-requests', { method: 'POST', body: JSON.stringify(payload) });
  return mapRequest(result);
}

// The current owner's own requests (any status), newest first.
export async function getMyHotelRequests() {
  const result = await request('/api/v1/hotel-requests/my');
  return Array.isArray(result) ? result.map(mapRequest) : [];
}

// Admin-only: every request, newest first.
export async function getAllHotelRequests() {
  const result = await request('/api/v1/hotel-requests');
  return Array.isArray(result) ? result.map(mapRequest) : [];
}

// Admin-only. Creates or updates the real hotel (whichever the request needed) and marks it
// Approved — all handled server-side.
export async function approveHotelRequest(id) {
  const result = await request(`/api/v1/hotel-requests/${id}/approve`, { method: 'POST' });
  return mapRequest(result);
}

export async function rejectHotelRequest(id, reason) {
  const result = await request(`/api/v1/hotel-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return mapRequest(result);
}
