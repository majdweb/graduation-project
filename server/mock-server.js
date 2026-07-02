const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

const dataFilePath = path.join(__dirname, 'mock-data.json');
const uploadsDir = path.join(__dirname, 'mock-uploads');

function ensureStorage() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function getDefaultState() {
  return {
    rooms: [],
    nextRoomId: 1,
    users: [],
    nextUserId: 1,
    reservations: [
      {
        id: 1,
        hotelId: '1',
        roomId: 1,
        guestName: 'Ava Johnson',
        checkIn: '2026-05-08',
        checkOut: '2026-05-11',
        status: 'confirmed'
      },
      {
        id: 2,
        hotelId: '1',
        roomId: 2,
        guestName: 'Noah Smith',
        checkIn: '2026-05-13',
        checkOut: '2026-05-16',
        status: 'pending'
      },
      {
        id: 3,
        hotelId: '1',
        roomId: 1,
        guestName: 'Mia Chen',
        checkIn: '2026-05-21',
        checkOut: '2026-05-24',
        status: 'cancelled'
      }
    ],
    hotelSettings: {
      '1': { autoAcceptBookings: true, campaignActive: false, campaignConfig: null }
    },
    reviews: [],
  };
}

function loadState() {
  ensureStorage();
  if (!fs.existsSync(dataFilePath)) {
    return getDefaultState();
  }

  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultState(),
      ...parsed,
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      reservations: Array.isArray(parsed.reservations) ? parsed.reservations : getDefaultState().reservations,
      hotelSettings: parsed.hotelSettings || getDefaultState().hotelSettings,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      nextRoomId: Number.isFinite(parsed.nextRoomId) ? parsed.nextRoomId : 1,
      nextUserId: Number.isFinite(parsed.nextUserId) ? parsed.nextUserId : 1,
    };
  } catch (error) {
    console.warn('Failed to load mock data, starting fresh:', error.message);
    return getDefaultState();
  }
}

function saveState() {
  const snapshot = {
    rooms,
    nextRoomId,
    users,
    nextUserId,
    reservations,
    hotelSettings,
    reviews,
  };
  fs.writeFileSync(dataFilePath, JSON.stringify(snapshot, null, 2), 'utf8');
}

ensureStorage();
const state = loadState();

let rooms = state.rooms;
let nextRoomId = state.nextRoomId;

// simple user store for mock auth
const users = state.users;
let nextUserId = state.nextUserId;
let reservations = state.reservations;

// per-hotel settings (mock)
const hotelSettings = state.hotelSettings;
let reviews = state.reviews;

function findOwnerIndexByHotelId(hotelId) {
  const target = String(hotelId || '').trim().toLowerCase();
  if (!target) return -1;

  let idx = users.findIndex((u) => u.role === 'hotel_owner' && String(u.hotelId || '').trim().toLowerCase() === target);
  if (idx !== -1) return idx;

  idx = users.findIndex((u) => u.role === 'hotel_owner' && String(u.hotelName || '').trim().toLowerCase() === target);
  if (idx !== -1) return idx;

  idx = users.findIndex((u) => u.role === 'hotel_owner' && String(u.id) === String(hotelId));
  if (idx !== -1) return idx;

  const ownerUsers = users.filter((u) => u.role === 'hotel_owner');
  if (ownerUsers.length === 1) {
    return users.findIndex((u) => u.id === ownerUsers[0].id);
  }
  return -1;
}

function normalizePhotoUrls(photos, max = 8) {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((photo) => typeof photo === 'string' && photo.trim())
    .map((photo) => photo.trim())
    .slice(0, max);
}

function buildAuthUserPayload(user) {
  const photos = normalizePhotoUrls(user.photos);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    hotelId: user.hotelId,
    hotelName: user.hotelName,
    city: user.city,
    address: user.address,
    phoneNumber: user.phoneNumber,
    description: user.description,
    stars: user.stars || null,
    photos,
    cardPhoto: photos.length ? photos[0] : null,
  };
}

function buildOwnerProfilePayload(owner) {
  const photos = normalizePhotoUrls(owner.photos);
  return {
    id: owner.id,
    username: owner.username || '',
    email: owner.email || '',
    hotelId: owner.hotelId || null,
    hotelName: owner.hotelName || '',
    city: owner.city || '',
    address: owner.address || '',
    phoneNumber: owner.phoneNumber || '',
    description: owner.description || '',
    stars: Number(owner.stars) || null,
    photos,
    cardPhoto: photos.length ? photos[0] : null,
  };
}

function normalizeHotelKey(value) {
  return String(value || "").trim().toLowerCase();
}

// Counts reservations (confirmed or pending) for a room that overlap the given date range.
function countOverlappingReservations(roomId, checkIn, checkOut) {
  return reservations.filter((r) =>
    r.roomId === roomId &&
    (r.status === 'confirmed' || r.status === 'pending') &&
    new Date(r.checkIn) < new Date(checkOut) &&
    new Date(r.checkOut) > new Date(checkIn)
  ).length;
}

function buildHotelSummary(owner, allRooms) {
  const hotelKey = normalizeHotelKey(owner.hotelId || owner.hotelName || owner.id);
  const hotelRooms = allRooms.filter((room) => {
    const roomKey = normalizeHotelKey(room.hotelId || room.hotelName);
    return roomKey && roomKey === hotelKey;
  });
  const prices = hotelRooms.map((room) => Number(room.price)).filter((price) => Number.isFinite(price));
  const stars = hotelRooms.map((room) => Number(room.stars)).filter((value) => Number.isFinite(value));
  const photos = normalizePhotoUrls(owner.photos);
  return {
    id: owner.id,
    hotelId: owner.hotelId || null,
    hotelName: owner.hotelName || "",
    city: owner.city || "",
    address: owner.address || "",
    phoneNumber: owner.phoneNumber || "",
    description: owner.description || "",
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    rating: stars.length ? Math.round(stars.reduce((sum, value) => sum + value, 0) / stars.length) : null,
    stars: Number(owner.stars) || null,
    roomsCount: hotelRooms.length,
    photos,
    cardPhoto: photos.length ? photos[0] : null,
  };
}


// returns signed upload info (mock)
app.post('/api/uploads/signed-urls', (req, res) => {
  const { files } = req.body || {};
  if (!Array.isArray(files)) return res.status(400).json({ message: 'files required' });
  const urls = files.map((f, i) => {
    const key = `${Date.now()}_${i}_${Math.random().toString(36).slice(2,8)}`;
    return {
      uploadUrl: `http://localhost:5001/mock-upload/${key}`,
      publicUrl: `http://localhost:5001/public/${key}`,
      filename: f.name,
      key,
    };
  });
  res.json({ urls });
});

// accept raw PUT uploads to the signed URL and store in memory
app.put('/mock-upload/:key', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
  const key = req.params.key;
  const buf = req.body;
  const contentType = req.headers['content-type'] || 'application/octet-stream';
  if (!buf || !Buffer.isBuffer(buf)) return res.status(400).send('no file');
  fs.writeFileSync(path.join(uploadsDir, key), buf);
  fs.writeFileSync(path.join(uploadsDir, `${key}.json`), JSON.stringify({ contentType }, null, 2), 'utf8');
  res.status(200).send('ok');
});

// serve uploaded files
app.get('/public/:key', (req, res) => {
  const key = req.params.key;
  const filePath = path.join(uploadsDir, key);
  const metaPath = path.join(uploadsDir, `${key}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).send('not found');
  let contentType = 'application/octet-stream';
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      contentType = meta.contentType || contentType;
    } catch (error) {}
  }
  res.set('Content-Type', contentType);
  res.send(fs.readFileSync(filePath));
});

app.post('/api/owner/:hotelId/rooms', (req, res) => {
  const hotelId = req.params.hotelId;
  const payload = req.body || {};
  const room = {
    id: nextRoomId++,
    hotelId,
    name: payload.name || 'Untitled',
    amount: payload.amount || 1,
    capacity: payload.capacity || 1,
    price: payload.price || 0,
    variants: payload.variants || [],
    photos: payload.photos || [],
    status: payload.status || 'active',
    bookable: true,
  };
  rooms.push(room);
  saveState();
  res.status(201).json(room);
});

// Mock signup
app.post('/api/auth/signup', (req, res) => {
  const payload = req.body || {};
  if (!payload.email || !payload.password) return res.status(400).json({ message: 'email and password required' });
  const exists = users.find(u => String(u.email).toLowerCase() === String(payload.email).toLowerCase());
  if (exists) return res.status(409).json({ message: 'User already exists' });
  const user = {
    id: nextUserId++,
    username: payload.username || payload.email.split('@')[0],
    email: String(payload.email).toLowerCase(),
    role: payload.role || 'guest',
    hotelId: payload.role === 'hotel_owner' ? String(payload.hotelId || payload.hotelName || payload.email.split('@')[0]) : null,
    hotelName: payload.hotelName || null,
    city: payload.city || null,
    address: payload.address || null,
    phoneNumber: payload.phoneNumber || null,
    description: payload.description || null,
    photos: normalizePhotoUrls(payload.photos),
    password: payload.password, // plaintext for mock only
    approved: payload.role === 'hotel_owner' ? false : undefined,
    stars: payload.role === 'hotel_owner' ? (Number(payload.stars) || null) : undefined,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveState();
  const token = `mock-token-${user.id}-${Date.now()}`;
  res.status(201).json({ user: buildAuthUserPayload(user), token });
});

// Mock login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });
  const user = users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const token = `mock-token-${user.id}-${Date.now()}`;
  res.json({ user: buildAuthUserPayload(user), token });
});

app.get('/api/hotels', (req, res) => {
  const list = users
    .filter((u) => u.role === 'hotel_owner' && (u.hotelName || u.hotelId) && u.approved !== false)
    .map((u) => buildHotelSummary(u, rooms));
  res.json(list);
});

// Public: rooms enriched with their hotel's name/city, used for home-search results
app.get('/api/rooms/search', (req, res) => {
  const checkIn = typeof req.query.checkIn === 'string' ? req.query.checkIn : '';
  const checkOut = typeof req.query.checkOut === 'string' ? req.query.checkOut : '';
  const checkDates = Boolean(checkIn && checkOut);

  const owners = users.filter((u) => u.role === 'hotel_owner' && u.approved !== false);
  const list = rooms
    .filter((room) => {
      if (room.bookable === false) return false;
      const roomKey = normalizeHotelKey(room.hotelId || room.hotelName);
      return owners.some((o) => normalizeHotelKey(o.hotelId || o.hotelName || o.id) === roomKey);
    })
    .map((room) => {
      const roomKey = normalizeHotelKey(room.hotelId || room.hotelName);
      const owner = owners.find(
        (o) => normalizeHotelKey(o.hotelId || o.hotelName || o.id) === roomKey
      );
      const amount = Number(room.amount) || 0;
      const remaining = checkDates
        ? amount - countOverlappingReservations(room.id, checkIn, checkOut)
        : amount;
      const roomReviews = reviews.filter((rv) => rv.roomId === room.id);
      const reviewCount = roomReviews.length;
      const avgScore = reviewCount ? Math.round((roomReviews.reduce((s, rv) => s + rv.overallScore, 0) / reviewCount) * 10) / 10 : null;
      return {
        id: room.id,
        hotelId: roomKey,
        hotelName: owner?.hotelName || room.hotelId || 'Hotel',
        city: owner?.city || '',
        hotelStars: Number(owner?.stars) || null,
        name: room.name,
        price: Number(room.price) || 0,
        capacity: Number(room.capacity) || 1,
        amount,
        remaining,
        photos: normalizePhotoUrls(room.photos),
        avgScore,
        reviewCount,
      };
    })
    .filter((room) => !checkDates || room.remaining > 0);
  res.json(list);
});

// Admin: real hotels/rooms/reservations for the analytics dashboard
app.get('/api/admin/hotels-analytics', (req, res) => {
  const owners = users.filter((u) => u.role === 'hotel_owner');

  const roomsOut = rooms.map((room) => ({
    id: room.id,
    hotelId: normalizeHotelKey(room.hotelId || room.hotelName),
    name: room.name,
    price: Number(room.price) || 0,
    amount: Number(room.amount) || 0,
    stars: Number(room.stars) || 3,
  }));

  const reservationsOut = reservations.map((r) => {
    const room = rooms.find((rm) => String(rm.id) === String(r.roomId));
    const hotelId = room
      ? normalizeHotelKey(room.hotelId || room.hotelName)
      : normalizeHotelKey(r.hotelId);
    return {
      id: r.id,
      hotelId,
      roomId: r.roomId,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
    };
  });

  const hotels = owners.map((owner) => {
    const hotelId = normalizeHotelKey(owner.hotelId || owner.hotelName || owner.id);
    return {
      hotelId,
      hotelName: owner.hotelName || hotelId,
      city: owner.city || '',
      stars: Number(owner.stars) || null,
      userId: owner.id,
    };
  });

  res.json({
    platformCutPercent: 15,
    hotels,
    rooms: roomsOut,
    reservations: reservationsOut,
  });
});


app.get('/api/owner/:hotelId/rooms', (req, res) => {
  const hotelId = req.params.hotelId;
  const list = rooms
    .filter((r) => String(r.hotelId) === String(hotelId))
    .map((room) => {
      const roomReviews = reviews.filter((rv) => rv.roomId === room.id);
      const reviewCount = roomReviews.length;
      const avgScore = reviewCount ? Math.round((roomReviews.reduce((s, rv) => s + rv.overallScore, 0) / reviewCount) * 10) / 10 : null;
      return { ...room, avgScore, reviewCount };
    });
  res.json(list);
});

app.get('/api/owner/:hotelId/reservations', (req, res) => {
  const hotelId = req.params.hotelId;
  const roomLookup = rooms.reduce((acc, room) => {
    acc[String(room.id)] = room.name;
    return acc;
  }, {});
  const list = reservations
    .filter(r => String(r.hotelId) === String(hotelId))
    .map(r => ({
      ...r,
      roomName: roomLookup[String(r.roomId)] || `Room ${r.roomId}`
    }));
  res.json(list);
});

// Guest: their own reservations across all hotels, for the "My Bookings" page
app.get('/api/guests/:userId/reservations', (req, res) => {
  const userId = req.params.userId;
  const owners = users.filter((u) => u.role === 'hotel_owner');
  const roomLookup = rooms.reduce((acc, room) => {
    acc[String(room.id)] = room;
    return acc;
  }, {});
  const list = reservations
    .filter((r) => String(r.userId) === String(userId))
    .map((r) => {
      const room = roomLookup[String(r.roomId)];
      const hotelKey = room ? normalizeHotelKey(room.hotelId || room.hotelName) : normalizeHotelKey(r.hotelId);
      const owner = owners.find((o) => normalizeHotelKey(o.hotelId || o.hotelName || o.id) === hotelKey);
      const settingsKey = Object.keys(hotelSettings).find((key) => normalizeHotelKey(key) === hotelKey);
      const settings = (settingsKey ? hotelSettings[settingsKey] : null) || {};
      const hasReview = reviews.some((rv) => rv.reservationId === r.id);
      const today = new Date().toISOString().slice(0, 10);
      const reviewable = r.status === 'confirmed' && r.checkOut < today && !hasReview && Boolean(r.userId);
      return {
        ...r,
        roomName: room?.name || `Room ${r.roomId}`,
        hotelName: owner?.hotelName || r.hotelId || 'Hotel',
        cancelPolicy: settings.cancelPolicy || { freeCancel: true, daysBefore: 2 },
        hasReview,
        reviewable,
      };
    })
    .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
  res.json(list);
});

// get hotel settings
app.get('/api/owner/:hotelId/settings', (req, res) => {
  const hotelId = String(req.params.hotelId);
  res.json(hotelSettings[hotelId] || { autoAcceptBookings: true });
});

// update hotel settings (partial)
app.patch('/api/owner/:hotelId/settings', (req, res) => {
  const hotelId = String(req.params.hotelId);
  hotelSettings[hotelId] = { ...(hotelSettings[hotelId] || {}), ...(req.body || {}) };
  saveState();
  res.json(hotelSettings[hotelId]);
});

app.get('/api/owner/:hotelId/profile', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const ownerIndex = findOwnerIndexByHotelId(hotelId);
  if (ownerIndex === -1) return res.status(404).json({ message: 'Owner profile not found' });
  res.json(buildOwnerProfilePayload(users[ownerIndex]));
});

app.patch('/api/owner/:hotelId/profile', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const ownerIndex = findOwnerIndexByHotelId(hotelId);
  if (ownerIndex === -1) return res.status(404).json({ message: 'Owner profile not found' });

  const payload = req.body || {};
  const current = users[ownerIndex];
  users[ownerIndex] = {
    ...current,
    hotelName: typeof payload.hotelName === 'string' ? payload.hotelName.trim() : current.hotelName,
    city: typeof payload.city === 'string' ? payload.city.trim() : current.city,
    address: typeof payload.address === 'string' ? payload.address.trim() : current.address,
    phoneNumber: typeof payload.phoneNumber === 'string' ? payload.phoneNumber.trim() : current.phoneNumber,
    description: typeof payload.description === 'string' ? payload.description.trim() : current.description,
    photos: Array.isArray(payload.photos) ? normalizePhotoUrls(payload.photos) : normalizePhotoUrls(current.photos),
  };

  saveState();
  res.json(buildOwnerProfilePayload(users[ownerIndex]));
});

// Accept a pending reservation
app.post('/api/owner/:hotelId/reservations/:id/accept', (req, res) => {
  const id = Number(req.params.id);
  const idx = reservations.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  reservations[idx].status = 'confirmed';
  saveState();
  res.json(reservations[idx]);
});

// Reject a pending reservation
app.post('/api/owner/:hotelId/reservations/:id/reject', (req, res) => {
  const id = Number(req.params.id);
  const idx = reservations.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  reservations[idx].status = 'rejected';
  saveState();
  res.json(reservations[idx]);
});

// Guest: cancel their own pending or confirmed booking
app.post('/api/reservations/:id/cancel', (req, res) => {
  const id = Number(req.params.id);
  const idx = reservations.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });

  const reservation = reservations[idx];
  if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
    return res.status(400).json({ message: 'This booking can no longer be cancelled.' });
  }

  const requestUserId = req.body?.userId;
  if (reservation.userId && String(reservation.userId) !== String(requestUserId)) {
    return res.status(403).json({ message: 'You can only cancel your own bookings.' });
  }

  reservations[idx].status = 'cancelled';
  saveState();
  res.json(reservations[idx]);
});

// Guest: modify their own booking dates
app.patch('/api/reservations/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = reservations.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });

  const reservation = reservations[idx];
  if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
    return res.status(400).json({ message: 'This booking can no longer be modified.' });
  }

  const requestUserId = req.body?.userId;
  if (reservation.userId && String(reservation.userId) !== String(requestUserId)) {
    return res.status(403).json({ message: 'You can only modify your own bookings.' });
  }

  const { checkIn, checkOut } = req.body || {};
  if (!checkIn || !checkOut) return res.status(400).json({ message: 'checkIn and checkOut are required.' });
  if (new Date(checkIn) >= new Date(checkOut)) return res.status(400).json({ message: 'Check-out must be after check-in.' });

  const room = rooms.find(r => r.id === reservation.roomId);
  if (room) {
    const overlapping = reservations.filter(r =>
      r.id !== id &&
      r.roomId === reservation.roomId &&
      (r.status === 'confirmed' || r.status === 'pending') &&
      new Date(r.checkIn) < new Date(checkOut) &&
      new Date(r.checkOut) > new Date(checkIn)
    ).length;
    if (overlapping >= Number(room.amount || 1)) {
      return res.status(409).json({ message: 'Room is fully booked for the new dates.' });
    }
  }

  reservations[idx].checkIn = checkIn;
  reservations[idx].checkOut = checkOut;
  const hotelSettings_ = hotelSettings[reservation.hotelId] || {};
  reservations[idx].status = hotelSettings_.autoAcceptBookings ? 'confirmed' : 'pending';
  saveState();
  res.json(reservations[idx]);
});

// Create a reservation (used to simulate incoming bookings)
app.post('/api/hotels/:hotelId/reservations', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const payload = req.body || {};

  const checkIn = payload.checkIn || new Date().toISOString().slice(0, 10);
  const checkOut = payload.checkOut || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (new Date(checkIn) >= new Date(checkOut)) {
    return res.status(400).json({ message: 'Check-out date must be after check-in date.' });
  }

  const room = rooms.find((r) => r.id === Number(payload.roomId));
  if (!room) return res.status(404).json({ message: 'Room not found.' });

  const guests = payload.guests ? Number(payload.guests) : null;
  if (guests && guests > Number(room.capacity || 1)) {
    return res.status(400).json({ message: `This room only sleeps ${room.capacity}.` });
  }

  const overlappingCount = countOverlappingReservations(room.id, checkIn, checkOut);
  if (overlappingCount >= Number(room.amount || 1)) {
    return res.status(409).json({ message: 'This room is fully booked for the selected dates.' });
  }

  const settings = hotelSettings[hotelId] || { autoAcceptBookings: true };
  const nextId = reservations.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const status = settings.autoAcceptBookings ? 'confirmed' : 'pending';
  const reservation = {
    id: nextId,
    hotelId,
    roomId: room.id,
    userId: payload.userId || null,
    guestName: payload.guestName || 'Guest',
    guestEmail: payload.guestEmail || null,
    guestPhone: payload.guestPhone || null,
    guests: guests || 1,
    checkIn,
    checkOut,
    breakfast: Boolean(payload.breakfast),
    status
  };
  reservations.push(reservation);
  saveState();
  res.status(201).json(reservation);
});

app.patch('/api/rooms/:roomId', (req, res) => {
  const roomId = Number(req.params.roomId);
  const updates = req.body || {};
  const idx = rooms.findIndex(r => r.id === roomId);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  rooms[idx] = { ...rooms[idx], ...updates };
  saveState();
  res.json(rooms[idx]);
});

// delete a room
app.delete('/api/rooms/:roomId', (req, res) => {
  const roomId = Number(req.params.roomId);
  const idx = rooms.findIndex(r => r.id === roomId);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const removed = rooms.splice(idx, 1)[0];
  saveState();
  res.json({ ok: true, removed });
});

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseLocalDate(value) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNights(checkIn, checkOut) {
  const start = parseLocalDate(checkIn);
  const end = parseLocalDate(checkOut);
  if (!start || !end) return 1;
  const diff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, diff);
}

function buildRevenueStats(hotelId, { mode, year, month, quarter, startDate, endDate }) {
  const selectedYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const selectedMonth = Number.isFinite(month) ? Math.min(11, Math.max(0, month)) : new Date().getMonth();
  const selectedQuarter = Number.isFinite(quarter) ? Math.min(4, Math.max(1, quarter)) : Math.floor(new Date().getMonth() / 3) + 1;
  const selectedMode = ['monthly', 'quarterly', 'ytd', 'yearly', 'custom'].includes(mode) ? mode : 'monthly';
  const now = new Date();
  const rollingYtdStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  rollingYtdStart.setHours(0, 0, 0, 0);
  const rollingYtdEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  rollingYtdEnd.setHours(23, 59, 59, 999);
  const defaultCustomEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  defaultCustomEnd.setHours(23, 59, 59, 999);
  const defaultCustomStart = new Date(defaultCustomEnd);
  defaultCustomStart.setDate(defaultCustomEnd.getDate() - 29);
  defaultCustomStart.setHours(0, 0, 0, 0);
  let customStart = parseLocalDate(startDate) || defaultCustomStart;
  let customEnd = parseLocalDate(endDate) || defaultCustomEnd;
  customStart = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0);
  customEnd = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999);
  if (customStart > customEnd) {
    const temp = customStart;
    customStart = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 0, 0, 0, 0);
    customEnd = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 23, 59, 59, 999);
  }

  const roomPriceLookup = rooms
    .filter((room) => String(room.hotelId) === String(hotelId))
    .reduce((acc, room) => {
      acc[String(room.id)] = Number(room.price) || 0;
      return acc;
    }, {});

  const confirmedReservations = reservations.filter((reservation) => {
    if (String(reservation.hotelId) !== String(hotelId)) return false;
    if (reservation.status !== 'confirmed') return false;
    return Boolean(parseLocalDate(reservation.checkIn));
  });

  const getReservationRevenue = (reservation) => {
    const roomPrice = Number(roomPriceLookup[String(reservation.roomId)]) || 0;
    return roomPrice * getNights(reservation.checkIn, reservation.checkOut);
  };

  const getMonthlyTotal = (targetYear, targetMonth) => {
    return confirmedReservations.reduce((sum, reservation) => {
      const checkIn = parseLocalDate(reservation.checkIn);
      if (!checkIn) return sum;
      if (checkIn.getFullYear() !== targetYear || checkIn.getMonth() !== targetMonth) return sum;
      return sum + getReservationRevenue(reservation);
    }, 0);
  };

  const monthlyTotal = getMonthlyTotal(selectedYear, selectedMonth);
  const quarterStart = (selectedQuarter - 1) * 3;
  const quarterlyTotal = Array.from({ length: 3 }, (_, index) => quarterStart + index)
    .reduce((sum, monthIndex) => sum + getMonthlyTotal(selectedYear, monthIndex), 0);
  const ytdTotal = confirmedReservations.reduce((sum, reservation) => {
    const checkIn = parseLocalDate(reservation.checkIn);
    if (!checkIn) return sum;
    if (checkIn < rollingYtdStart || checkIn > rollingYtdEnd) return sum;
    return sum + getReservationRevenue(reservation);
  }, 0);
  const yearlyTotal = Array.from({ length: 12 }, (_, index) => index)
    .reduce((sum, monthIndex) => sum + getMonthlyTotal(selectedYear, monthIndex), 0);
  const customTotal = confirmedReservations.reduce((sum, reservation) => {
    const checkIn = parseLocalDate(reservation.checkIn);
    if (!checkIn) return sum;
    if (checkIn < customStart || checkIn > customEnd) return sum;
    return sum + getReservationRevenue(reservation);
  }, 0);

  let points = [];
  if (selectedMode === 'monthly') {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const buckets = Array.from({ length: daysInMonth }, (_, index) => ({ label: String(index + 1), value: 0 }));
    confirmedReservations.forEach((reservation) => {
      const checkIn = parseLocalDate(reservation.checkIn);
      if (!checkIn) return;
      if (checkIn.getFullYear() !== selectedYear || checkIn.getMonth() !== selectedMonth) return;
      buckets[checkIn.getDate() - 1].value += getReservationRevenue(reservation);
    });
    points = buckets;
  } else if (selectedMode === 'quarterly') {
    const buckets = Array.from({ length: 3 }, (_, index) => ({
      label: MONTH_LABELS[quarterStart + index],
      value: 0
    }));
    confirmedReservations.forEach((reservation) => {
      const checkIn = parseLocalDate(reservation.checkIn);
      if (!checkIn) return;
      if (checkIn.getFullYear() !== selectedYear) return;
      const monthIndex = checkIn.getMonth();
      if (monthIndex < quarterStart || monthIndex > quarterStart + 2) return;
      buckets[monthIndex - quarterStart].value += getReservationRevenue(reservation);
    });
    points = buckets;
  } else if (selectedMode === 'ytd') {
    const buckets = [];
    const cursor = new Date(rollingYtdStart.getFullYear(), rollingYtdStart.getMonth(), 1);
    const endMonth = new Date(rollingYtdEnd.getFullYear(), rollingYtdEnd.getMonth(), 1);
    while (cursor <= endMonth) {
      buckets.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
        label: `${MONTH_LABELS[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(-2)}`,
        value: 0
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const bucketIndexByKey = buckets.reduce((acc, bucket, index) => {
      acc[bucket.key] = index;
      return acc;
    }, {});
    confirmedReservations.forEach((reservation) => {
      const checkIn = parseLocalDate(reservation.checkIn);
      if (!checkIn) return;
      if (checkIn < rollingYtdStart || checkIn > rollingYtdEnd) return;
      const bucketKey = `${checkIn.getFullYear()}-${checkIn.getMonth()}`;
      const bucketIndex = bucketIndexByKey[bucketKey];
      if (typeof bucketIndex === 'undefined') return;
      buckets[bucketIndex].value += getReservationRevenue(reservation);
    });
    points = buckets.map(({ label, value }) => ({ label, value }));
  } else if (selectedMode === 'custom') {
    const buckets = [];
    const cursor = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0);
    const endDateCursor = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 0, 0, 0, 0);
    while (cursor <= endDateCursor) {
      buckets.push({
        key: toDateKey(cursor),
        label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        value: 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    const bucketIndexByKey = buckets.reduce((acc, bucket, index) => {
      acc[bucket.key] = index;
      return acc;
    }, {});
    confirmedReservations.forEach((reservation) => {
      const checkIn = parseLocalDate(reservation.checkIn);
      if (!checkIn) return;
      if (checkIn < customStart || checkIn > customEnd) return;
      const key = toDateKey(checkIn);
      const bucketIndex = bucketIndexByKey[key];
      if (typeof bucketIndex === 'undefined') return;
      buckets[bucketIndex].value += getReservationRevenue(reservation);
    });
    points = buckets.map(({ label, value }) => ({ label, value }));
  } else {
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      label: MONTH_LABELS[index],
      value: 0
    }));
    confirmedReservations.forEach((reservation) => {
      const checkIn = parseLocalDate(reservation.checkIn);
      if (!checkIn) return;
      if (checkIn.getFullYear() !== selectedYear) return;
      buckets[checkIn.getMonth()].value += getReservationRevenue(reservation);
    });
    points = buckets;
  }

  return {
    mode: selectedMode,
    filters: { year: selectedYear, month: selectedMonth, quarter: selectedQuarter, startDate: toDateKey(customStart), endDate: toDateKey(customEnd) },
    summary: {
      monthly: monthlyTotal,
      quarterly: quarterlyTotal,
      ytd: ytdTotal,
      yearly: yearlyTotal,
      custom: customTotal
    },
    points
  };
}

app.get('/api/owner/:hotelId/revenue-stats', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const mode = String(req.query.mode || 'monthly');
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  const quarter = Number(req.query.quarter);
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
  const payload = buildRevenueStats(hotelId, { mode, year, month, quarter, startDate, endDate });
  res.json(payload);
});

app.get('/api/owner/:hotelId/billing', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const hotelRooms = rooms.filter((r) => String(r.hotelId) === hotelId);
  const roomPriceLookup = hotelRooms.reduce((acc, room) => {
    acc[String(room.id)] = Number(room.price) || 0;
    return acc;
  }, {});
  const gross = reservations
    .filter((r) => String(r.hotelId) === hotelId && r.status === 'confirmed')
    .reduce((sum, r) => sum + (roomPriceLookup[String(r.roomId)] || 0) * getNights(r.checkIn, r.checkOut), 0);
  res.json({ gross, platformCutPercent: 15 });
});

app.get('/api/owner/:hotelId/metrics', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const settings = hotelSettings[hotelId] || { campaignActive: false };
  const hotelRooms = rooms.filter((r) => String(r.hotelId) === hotelId);
  const hotelReservations = reservations.filter((r) => String(r.hotelId) === hotelId);

  const ownerIdx = findOwnerIndexByHotelId(hotelId);
  const owner = ownerIdx !== -1 ? users[ownerIdx] : null;
  const bookings = hotelReservations.filter((r) => r.status === 'confirmed').length;
  const cancellations = 0; // no cancellation flow yet
  const prices = hotelRooms.map((r) => Number(r.price)).filter((v) => Number.isFinite(v));
  const avgPrice = prices.length ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) : 0;

  res.json({
    impressions: 1234, // placeholder: no page-view tracking exists yet
    clicks: 56, // placeholder: no page-view tracking exists yet
    bookings,
    cancellations,
    avgPrice,
    categoryAvgPrice: 140, // placeholder: no cross-hotel category comparison yet
    stars: Number(owner?.stars) || null,
    campaignActive: Boolean(settings.campaignActive)
  });
});

app.post('/api/owner/:hotelId/campaign', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const payload = req.body || {};
  hotelSettings[hotelId] = {
    ...(hotelSettings[hotelId] || { autoAcceptBookings: true }),
    campaignActive: Boolean(payload.enable),
    campaignConfig: payload.campaignConfig || null,
  };
  saveState();
  res.json({ ok: true, campaignActive: hotelSettings[hotelId].campaignActive, campaignConfig: hotelSettings[hotelId].campaignConfig });
});

app.post('/api/owner/:hotelId/cancel-policy', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const payload = req.body || {};
  hotelSettings[hotelId] = {
    ...(hotelSettings[hotelId] || { autoAcceptBookings: true }),
    cancelPolicy: {
      freeCancel: Boolean(payload.freeCancel),
      daysBefore: Number(payload.daysBefore) || 0,
    },
  };
  saveState();
  res.json({ ok: true, cancelPolicy: hotelSettings[hotelId].cancelPolicy });
});

function computeScore({ staff, location, facilities, cleanliness, comfort, value }) {
  return Math.round(((staff + location + facilities + cleanliness * 2 + comfort * 2 + value) / 8) * 10) / 10;
}

function categoryAverages(list) {
  const n = list.length;
  if (!n) return null;
  const avg = (key) => Math.round((list.reduce((s, r) => s + r.ratings[key], 0) / n) * 10) / 10;
  return { staff: avg('staff'), location: avg('location'), facilities: avg('facilities'), cleanliness: avg('cleanliness'), comfort: avg('comfort'), value: avg('value') };
}

// Guest: submit a review after checkout
app.post('/api/reservations/:id/review', (req, res) => {
  const reservationId = Number(req.params.id);
  const { userId, ratings, comment } = req.body || {};

  const reservation = reservations.find((r) => r.id === reservationId);
  if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

  if (reservation.userId && String(reservation.userId) !== String(userId)) {
    return res.status(403).json({ message: 'You can only review your own bookings.' });
  }
  if (reservation.status !== 'confirmed') {
    return res.status(400).json({ message: 'Only confirmed bookings can be reviewed.' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (reservation.checkOut > today) {
    return res.status(400).json({ message: 'You can only review after check-out.' });
  }
  if (reviews.some((r) => r.reservationId === reservationId)) {
    return res.status(409).json({ message: 'You have already reviewed this stay.' });
  }

  const { staff, location, facilities, cleanliness, comfort, value } = ratings || {};
  const vals = [staff, location, facilities, cleanliness, comfort, value];
  if (vals.some((v) => !Number.isFinite(Number(v)) || Number(v) < 1 || Number(v) > 10)) {
    return res.status(400).json({ message: 'All ratings must be between 1 and 10.' });
  }
  if (!comment || typeof comment !== 'string' || comment.trim().length < 10) {
    return res.status(400).json({ message: 'Comment must be at least 10 characters.' });
  }

  const room = rooms.find((r) => r.id === reservation.roomId);
  const hotelId = room ? normalizeHotelKey(room.hotelId || room.hotelName) : normalizeHotelKey(reservation.hotelId);

  const r = {
    staff: Number(staff), location: Number(location), facilities: Number(facilities),
    cleanliness: Number(cleanliness), comfort: Number(comfort), value: Number(value),
  };
  const review = {
    id: reviews.reduce((m, x) => Math.max(m, x.id), 0) + 1,
    reservationId,
    roomId: reservation.roomId,
    hotelId,
    userId: userId || null,
    guestName: reservation.guestName || 'Guest',
    ratings: r,
    overallScore: computeScore(r),
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  };
  reviews.push(review);
  saveState();
  res.status(201).json(review);
});

// Public: get reviews for a room
app.get('/api/rooms/:roomId/reviews', (req, res) => {
  const roomId = Number(req.params.roomId);
  const list = reviews
    .filter((r) => r.roomId === roomId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const n = list.length;
  const avgScore = n ? Math.round((list.reduce((s, r) => s + r.overallScore, 0) / n) * 10) / 10 : null;
  res.json({ reviews: list, avgScore, reviewCount: n, categoryAverages: categoryAverages(list) });
});

// Owner: all reviews across the hotel
app.get('/api/owner/:hotelId/reviews', (req, res) => {
  const hotelKey = normalizeHotelKey(req.params.hotelId);
  const roomLookup = rooms.reduce((acc, room) => { acc[String(room.id)] = room.name; return acc; }, {});
  const list = reviews
    .filter((r) => normalizeHotelKey(r.hotelId) === hotelKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((r) => ({ ...r, roomName: roomLookup[String(r.roomId)] || `Room ${r.roomId}` }));
  const n = list.length;
  const avgScore = n ? Math.round((list.reduce((s, r) => s + r.overallScore, 0) / n) * 10) / 10 : null;
  res.json({ reviews: list, avgScore, reviewCount: n, categoryAverages: categoryAverages(list) });
});

// Admin: directly override a hotel's star rating
app.patch('/api/admin/hotels/:userId/stars', (req, res) => {
  const userId = Number(req.params.userId);
  const stars = Number(req.body?.stars);
  if (!stars || stars < 1 || stars > 5) return res.status(400).json({ message: 'stars must be 1–5' });
  const idx = users.findIndex((u) => u.id === userId && u.role === 'hotel_owner');
  if (idx === -1) return res.status(404).json({ message: 'Hotel owner not found' });
  users[idx].stars = stars;
  saveState();
  res.json({ ok: true, stars });
});

// Admin: list hotel owners pending approval
app.get('/api/admin/pending-hotels', (req, res) => {
  const pending = users
    .filter((u) => u.role === 'hotel_owner' && u.approved === false)
    .map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      hotelName: u.hotelName || '',
      city: u.city || '',
      createdAt: u.createdAt,
    }));
  res.json(pending);
});

// Admin: approve a hotel owner by email, optionally updating their star rating
app.patch('/api/admin/approve-hotel', (req, res) => {
  const { email, stars } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email required' });
  const idx = users.findIndex(
    (u) => u.role === 'hotel_owner' && String(u.email).toLowerCase() === String(email).toLowerCase()
  );
  if (idx === -1) return res.status(404).json({ message: 'Hotel owner not found' });
  users[idx].approved = true;
  if (stars && Number.isFinite(Number(stars)) && Number(stars) >= 1 && Number(stars) <= 5) {
    users[idx].stars = Number(stars);
  }
  saveState();
  res.json({ ok: true });
});

// Admin: clear all mock signup users (for local testing)
app.post('/api/admin/clear-users', (req, res) => {
  users.length = 0;
  nextUserId = 1;
  saveState();
  res.json({ ok: true, message: 'Cleared mock users' });
});

const PORT = process.env.MOCK_SERVER_PORT || 5001;
app.listen(PORT, () => console.log(`Mock server listening on ${PORT}`));
