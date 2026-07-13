// CHANGED BY AI (2026-07-13): new service file for the Trips feature ("Facilities &
// Attractions" page) — previously 100% localStorage via useSiteContent.js, now backed by the
// real database. Reads are public; writes require an Admin-role token.
import { apiRequest as request } from './apiClient';

export async function getTrips() {
  const result = await request('/api/v1/trips');
  return Array.isArray(result) ? result : [];
}

export async function createTrip(trip) {
  return request('/api/v1/trips', {
    method: 'POST',
    body: JSON.stringify({
      title: trip.title,
      city: trip.city,
      price: Number(trip.price) || 0,
      priceLabel: trip.priceLabel || '',
      type: trip.type || '',
      duration: trip.duration || '',
      difficulty: trip.difficulty || '',
      description: trip.description,
    }),
  });
}

export async function updateTrip(id, trip) {
  return request(`/api/v1/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: trip.title,
      city: trip.city,
      price: Number(trip.price) || 0,
      priceLabel: trip.priceLabel || '',
      type: trip.type || '',
      duration: trip.duration || '',
      difficulty: trip.difficulty || '',
      description: trip.description,
    }),
  });
}

export async function deleteTrip(id) {
  return request(`/api/v1/trips/${id}`, { method: 'DELETE' });
}
