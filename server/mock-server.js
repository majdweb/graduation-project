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
    }
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
    stars: 3
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


app.get('/api/owner/:hotelId/rooms', (req, res) => {
  const hotelId = req.params.hotelId;
  const list = rooms.filter(r => String(r.hotelId) === String(hotelId));
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

// Create a reservation (used to simulate incoming bookings)
app.post('/api/hotels/:hotelId/reservations', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const payload = req.body || {};
  const settings = hotelSettings[hotelId] || { autoAcceptBookings: true };
  const nextId = reservations.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const status = settings.autoAcceptBookings ? 'confirmed' : 'pending';
  const reservation = {
    id: nextId,
    hotelId,
    roomId: payload.roomId || null,
    guestName: payload.guestName || 'Guest',
    checkIn: payload.checkIn || new Date().toISOString().slice(0,10),
    checkOut: payload.checkOut || new Date(Date.now()+24*60*60*1000).toISOString().slice(0,10),
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
  res.json({ gross: 1200, platformCutPercent: 15 });
});

app.get('/api/owner/:hotelId/metrics', (req, res) => {
  const hotelId = String(req.params.hotelId);
  const settings = hotelSettings[hotelId] || { campaignActive: false };
  res.json({ impressions: 1234, clicks: 56, bookings: 7, cancellations: 1, avgPrice: 120, categoryAvgPrice: 140, stars: 4, campaignActive: Boolean(settings.campaignActive) });
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
