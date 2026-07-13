import { useState, useEffect, useMemo } from "react";
import "./reservation.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as ownerSvc from "./services/owner";
import { getCurrentUser } from "./services/auth";
import { getRoomReviews, createBooking, initiatePayment, confirmPayment } from "./services/guest";

const CAT_LABELS = { staff: 'Staff', location: 'Location', facilities: 'Facilities', cleanliness: 'Cleanliness', comfort: 'Comfort', value: 'Value' };

function ReviewSnippet({ hotelId, roomId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!roomId || !hotelId) return;
    getRoomReviews(hotelId, roomId).then(setData).catch(() => {});
  }, [hotelId, roomId]);
  if (!data || data.reviewCount === 0) return null;
  return (
    <div className="section-card" style={{ marginBottom: 16 }}>
      <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: 12 }}>Guest Reviews</h2>
      <p style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#2a3d66' }}>{data.avgScore}</span>
        <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>/ 10 · {data.reviewCount} review{data.reviewCount !== 1 ? 's' : ''}</span>
      </p>
      {data.categoryAverages && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {Object.entries(CAT_LABELS).map(([key, label]) => (
            <div key={key} style={{ background: '#f3f4f6', borderRadius: 8, padding: '5px 11px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2340' }}>{data.categoryAverages[key]}</div>
            </div>
          ))}
        </div>
      )}
      {data.reviews.slice(0, 2).map((r) => (
        <div key={r.id} style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{r.guestName}</span>
            <span style={{ background: '#2a3d66', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 13, fontWeight: 700 }}>{r.overallScore}/10</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{r.comment}</p>
        </div>
      ))}
    </div>
  );
}

export default function Reservation() {
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = location.state || {};
  const room = incoming.room;
  const currentUser = getCurrentUser();

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    guests: incoming.guests || 1
  });

  const [dates, setDates] = useState({
    checkIn: incoming.checkIn || "",
    checkOut: incoming.checkOut || ""
  });

  const [payment, setPayment] = useState({
    method: "",
    cardNumber: "",
    expiry: "",
    cvv: ""
  });

  const [breakfast, setBreakfast] = useState(false);
  const [breakfastSettings, setBreakfastSettings] = useState(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    if (!room?.hotelId) return;
    ownerSvc.getSettings(room.hotelId).then((s) => {
      if (s?.breakfast?.available) {
        setBreakfastSettings({ price: Number(s.breakfast.price) || 0 });
      }
    }).catch(() => {});
  }, [room?.hotelId]);

  const nights = useMemo(() => {
    if (!dates.checkIn || !dates.checkOut) return 0;
    const diff = new Date(dates.checkOut) - new Date(dates.checkIn);
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [dates.checkIn, dates.checkOut]);

  const roomTotal = (room?.price || 0) * nights;
  const breakfastTotal = breakfast && breakfastSettings ? breakfastSettings.price * nights * (customer.guests || 1) : 0;
  const grandTotal = roomTotal + breakfastTotal;

  const handleCustomer = (field, value) => setCustomer({ ...customer, [field]: value });
  const handleDates = (field, value) => setDates({ ...dates, [field]: value });
  const handlePayment = (field, value) => setPayment({ ...payment, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!customer.name || !customer.email) {
      setError("Please enter your name and email.");
      return;
    }
    if (!dates.checkIn || !dates.checkOut) {
      setError("Please choose check-in and check-out dates.");
      return;
    }
    if (new Date(dates.checkIn) >= new Date(dates.checkOut)) {
      setError("Check-out date must be after check-in date.");
      return;
    }
    if (!payment.method) {
      setError("Please select a payment method.");
      return;
    }

    setSubmitting(true);
    try {
      const booking = await createBooking({
        hotelId: room.hotelId,
        roomTypeId: room.id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        specialRequests: breakfast ? "Breakfast add-on requested" : null,
        guestName: customer.name,
        guestCount: customer.guests,
        includeBreakfast: breakfast,
      });

      // "Pay on arrival" leaves the booking Pending; card/PayPal confirm it immediately. The
      // backend doesn't validate real payment details, so card fields aren't sent anywhere.
      let status = "pending";
      if (payment.method !== "cash") {
        const paymentRecord = await initiatePayment(booking.id, payment.method);
        await confirmPayment(paymentRecord.id, `DEMO-${Date.now()}-${booking.id}`);
        status = "confirmed";
      }
      setConfirmation({ status });
    } catch (err) {
      setError(err.message || "Unable to complete booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="reservation-page">
        <div className="section-card confirmation-card">
          {confirmation.status === "confirmed" ? (
            <>
              <h2 className="section-title">Booking confirmed!</h2>
              <p>Your reservation at {room.hotel} is confirmed. We've saved your details for {room.name}.</p>
            </>
          ) : (
            <>
              <h2 className="section-title">Booking request sent</h2>
              <p>Your request for {room.name} at {room.hotel} is pending the hotel's approval. You'll be notified once it's reviewed.</p>
            </>
          )}
          <Link to="/" className="back-btn">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-page">

      <div className="back-wrapper">
        <button type="button" className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <h1 className="title">Reservation</h1>

      {/* ROOM INFO */}
      <div className="section-card">
        <h2 className="section-title">Room Details</h2>

        {room ? (
          <div className="room-details">
            {room.img && <img src={room.img} className="room-img" alt={room.name} />}
            <div>
              <h3>{room.name}</h3>
              <p className="hotel">{room.hotel}</p>
              <p className="city">{room.city}</p>
              <p className="price">${room.price}/night</p>
              <p className="stars">{"★".repeat(room.rating || 0)}</p>
            </div>
          </div>
        ) : (
          <p>No room selected. <Link to="/search">Search for a room</Link></p>
        )}
      </div>

      {room && !currentUser && (
        <div className="section-card">
          <h2 className="section-title">Please log in to book</h2>
          <p>You need an account to complete a booking.</p>
          <Link to="/login" className="back-btn">Log in</Link>
        </div>
      )}

      {room && currentUser && (
        <form onSubmit={handleSubmit}>
          {/* CUSTOMER INFO */}
          <div className="section-card">
            <h2 className="section-title">Your Information</h2>

            <input
              type="text"
              placeholder="Full Name"
              value={customer.name}
              onChange={(e) => handleCustomer("name", e.target.value)}
            />

            <input
              type="email"
              placeholder="Email"
              value={customer.email}
              onChange={(e) => handleCustomer("email", e.target.value)}
            />

            <input
              type="tel"
              placeholder="Phone Number"
              value={customer.phone}
              onChange={(e) => handleCustomer("phone", e.target.value)}
            />

            <input
              type="number"
              min="1"
              max={room.capacity || undefined}
              placeholder="Number of Guests"
              value={customer.guests}
              onChange={(e) => handleCustomer("guests", Number(e.target.value) || 1)}
            />

            <label className="field-label">Check-in</label>
            <input
              type="date"
              value={dates.checkIn}
              onChange={(e) => handleDates("checkIn", e.target.value)}
            />

            <label className="field-label">Check-out</label>
            <input
              type="date"
              min={dates.checkIn || undefined}
              value={dates.checkOut}
              onChange={(e) => handleDates("checkOut", e.target.value)}
            />
          </div>

          {/* BREAKFAST */}
          {breakfastSettings && (
            <div className="section-card">
              <h2 className="section-title">Add-ons</h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={breakfast}
                  onChange={(e) => setBreakfast(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>Breakfast <span style={{ color: '#555' }}>(+${breakfastSettings.price}/person/night)</span></span>
              </label>
            </div>
          )}

          {/* PRICE SUMMARY */}
          {nights > 0 && (
            <div className="section-card">
              <h2 className="section-title">Price Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Room ({nights} night{nights !== 1 ? 's' : ''} × ${room.price})</span>
                  <span>${roomTotal}</span>
                </div>
                {breakfast && breakfastSettings && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Breakfast ({nights} night{nights !== 1 ? 's' : ''} × {customer.guests} guest{customer.guests !== 1 ? 's' : ''} × ${breakfastSettings.price})</span>
                    <span>${breakfastTotal}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}>
                  <span>Total</span>
                  <span>${grandTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT */}
          <div className="section-card">
            <h2 className="section-title">Payment Method</h2>

            <div className="payment-methods">
              <button
                type="button"
                className={`method ${payment.method === "card" ? "active" : ""}`}
                onClick={() => setPayment({ ...payment, method: "card" })}
              >
                Credit Card
              </button>

              <button
                type="button"
                className={`method ${payment.method === "paypal" ? "active" : ""}`}
                onClick={() => setPayment({ ...payment, method: "paypal" })}
              >
                PayPal
              </button>

              <button
                type="button"
                className={`method ${payment.method === "cash" ? "active" : ""}`}
                onClick={() => setPayment({ ...payment, method: "cash" })}
              >
                Pay on Arrival
              </button>
            </div>

            {payment.method === "card" && (
              <div className="card-fields">
                <input
                  type="text"
                  placeholder="Card Number"
                  value={payment.cardNumber}
                  onChange={(e) => handlePayment("cardNumber", e.target.value)}
                />

                <input
                  type="text"
                  placeholder="Expiry Date (MM/YY)"
                  value={payment.expiry}
                  onChange={(e) => handlePayment("expiry", e.target.value)}
                />

                <input
                  type="text"
                  placeholder="CVV"
                  value={payment.cvv}
                  onChange={(e) => handlePayment("cvv", e.target.value)}
                />
              </div>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="confirm-btn" disabled={submitting}>
            {submitting ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      )}

      {room && <ReviewSnippet hotelId={room.hotelId} roomId={room.id} />}
    </div>
  );
}
