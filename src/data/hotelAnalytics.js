// Analytics derived from real hotels/rooms/reservations fetched from the
// backend (see services/hotels.js -> getHotelsAnalytics).

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(value) {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function nights(checkIn, checkOut) {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  if (!a || !b) return 1;
  const diff = Math.ceil((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, diff);
}

// A booking "counts" only when confirmed; cancelled reservations are excluded
// from counts and revenue.
function isCountable(r) {
  return r.status === 'confirmed';
}

// Booking price = room nightly price * number of nights.
function bookingPrice(reservation, roomById) {
  const room = roomById[String(reservation.roomId)];
  const price = room ? Number(room.price) || 0 : 0;
  return price * nights(reservation.checkIn, reservation.checkOut);
}

function roomIndex(data) {
  return data.rooms.reduce((acc, room) => {
    acc[String(room.id)] = room;
    return acc;
  }, {});
}

// Builds the full analytics model for every hotel.
// `data` is { platformCutPercent, hotels, rooms, reservations } fetched from the backend.
// `currentMonth` (0-11) drives the "monthly bookings" figure used for sorting.
export function buildAnalytics(data, currentMonth = new Date().getMonth()) {
  const PLATFORM_CUT_PERCENT = Number(data.platformCutPercent) || 15;
  const roomById = roomIndex(data);

  const hotels = data.hotels.map((hotel) => {
    const hotelRooms = data.rooms.filter((r) => String(r.hotelId) === String(hotel.hotelId));
    const hotelReservations = data.reservations.filter(
      (r) => String(r.hotelId) === String(hotel.hotelId)
    );

    // Per-room booking counts + revenue
    const rooms = hotelRooms.map((room) => {
      const resForRoom = hotelReservations.filter(
        (r) => String(r.roomId) === String(room.id) && isCountable(r)
      );
      const grossRevenue = resForRoom.reduce((sum, r) => sum + bookingPrice(r, roomById), 0);
      return {
        id: room.id,
        name: room.name,
        price: Number(room.price) || 0,
        amount: Number(room.amount) || 0,
        bookings: resForRoom.length,
        grossRevenue,
      };
    });

    // Monthly bookings counts (12 buckets)
    const monthlyBookings = Array(12).fill(0);
    const monthlyGross = Array(12).fill(0);
    let totalBookings = 0;
    let grossRevenue = 0;

    hotelReservations.forEach((r) => {
      if (!isCountable(r)) return;
      const d = parseDate(r.checkIn);
      if (!d) return;
      const m = d.getMonth();
      const price = bookingPrice(r, roomById);
      monthlyBookings[m] += 1;
      monthlyGross[m] += price;
      totalBookings += 1;
      grossRevenue += price;
    });

    const platformProfit = grossRevenue * (PLATFORM_CUT_PERCENT / 100);
    const hotelProfit = grossRevenue - platformProfit;
    const monthlyBookingsCurrent = monthlyBookings[currentMonth] || 0;

    return {
      hotelId: hotel.hotelId,
      hotelName: hotel.hotelName,
      city: hotel.city,
      stars: hotel.stars,
      userId: hotel.userId,
      roomsCount: hotelRooms.length,
      totalRoomUnits: hotelRooms.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      rooms,
      monthlyBookings,
      monthlyGross,
      totalBookings,
      monthlyBookingsCurrent,
      grossRevenue,
      hotelProfit,
      platformProfit,
    };
  });

  const totals = hotels.reduce(
    (acc, h) => {
      acc.bookings += h.totalBookings;
      acc.gross += h.grossRevenue;
      acc.hotelProfit += h.hotelProfit;
      acc.platformProfit += h.platformProfit;
      acc.rooms += h.roomsCount;
      return acc;
    },
    { bookings: 0, gross: 0, hotelProfit: 0, platformProfit: 0, rooms: 0 }
  );

  return { hotels, totals, platformCutPercent: PLATFORM_CUT_PERCENT };
}

export function formatMoney(value) {
  return `$${Math.round(value || 0).toLocaleString('en-US')}`;
}
