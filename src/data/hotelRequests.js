// Client-side JSON store for hotel owner → admin requests.
// No backend: data is JSON-serialized into localStorage and shared between the
// owner pages and the admin page (same pattern as the admin site-content store).

export const REQUESTS_KEY = 'velvet_hotel_requests';
export const REQUESTS_EVENT = 'velvetHotelRequestsUpdated';

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

export function getRequests() {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
  } catch (err) {
    throw new Error('Could not save the request — browser storage is full. Try a smaller document image.');
  }
  // notify listeners in the same tab (the storage event only fires across tabs)
  window.dispatchEvent(new Event(REQUESTS_EVENT));
}

export function addRequest(request) {
  const list = getRequests();
  const id = list.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
  const full = {
    id,
    status: 'pending',
    rejectionReason: '',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    ...request,
  };
  persist([full, ...list]);
  return full;
}

export function approveRequest(id) {
  const list = getRequests().map((r) =>
    r.id === id ? { ...r, status: 'approved', reviewedAt: new Date().toISOString(), rejectionReason: '' } : r
  );
  persist(list);
}

export function rejectRequest(id, reason) {
  const list = getRequests().map((r) =>
    r.id === id
      ? { ...r, status: 'rejected', reviewedAt: new Date().toISOString(), rejectionReason: String(reason || '').trim() }
      : r
  );
  persist(list);
}

// Subscribe to changes (same-tab CustomEvent + cross-tab storage event).
export function subscribeRequests(callback) {
  const handler = () => callback(getRequests());
  const storageHandler = (e) => {
    if (e.key === REQUESTS_KEY) callback(getRequests());
  };
  window.addEventListener(REQUESTS_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(REQUESTS_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
