// CHANGED BY AI (2026-07-13): new service file for the Notifications feature.
import { apiRequest as request } from './apiClient';

export async function getMyNotifications() {
  const result = await request('/api/v1/notifications');
  const list = Array.isArray(result) ? result : [];
  return list.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    relatedBookingId: n.relatedBookingId ?? null,
    relatedHotelRequestId: n.relatedHotelRequestId ?? null,
    isRead: Boolean(n.isRead),
    createdAt: n.createdAt,
  }));
}

export async function getUnreadCount() {
  const result = await request('/api/v1/notifications/unread-count');
  return Number(result?.count) || 0;
}

export async function markNotificationRead(id) {
  return request(`/api/v1/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return request('/api/v1/notifications/read-all', { method: 'POST' });
}
