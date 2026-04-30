import { useState } from "react";
import "./reservation.css";
import { Link, useLocation } from "react-router-dom";
import emailjs from "@emailjs/browser";

export default function Reservation() {
  const location = useLocation();
  const room = location.state?.room;

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    guests: 1
  });

  const [payment, setPayment] = useState({
    method: "",
    cardNumber: "",
    expiry: "",
    cvv: ""
  });

  const handleCustomer = (field, value) => {
    setCustomer({ ...customer, [field]: value });
  };

  const handlePayment = (field, value) => {
    setPayment({ ...payment, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!customer.name || !customer.email) {
      alert("Please enter your name and email.");
      return;
    }

    const templateParams = {
      to_name: customer.name,
      to_email: customer.email,
      room_name: room.name,
      hotel: room.hotel,
      price: room.price,
      guests: customer.guests,
      phone: customer.phone
    };

    emailjs
      .send(
        "YOUR_SERVICE_ID",
        "YOUR_TEMPLATE_ID",
        templateParams,
        "YOUR_PUBLIC_KEY"
      )
      .then(() => {
        alert("Booking Confirmed! Email Sent Successfully.");
      })
      .catch((error) => {
        console.error("Email error:", error);
        alert("Booking Confirmed (Email Failed)");
      });
  };

  return (
    <div className="reservation-page">

      <div className="back-wrapper">
        <Link to="/rooms" className="back-btn">← Back</Link>
      </div>

      <h1 className="title">Reservation</h1>

      {/* ROOM INFO */}
      <div className="section-card">
        <h2 className="section-title">Room Details</h2>

        {room ? (
          <div className="room-details">
            <img src={room.img} className="room-img" />
            <div>
              <h3>{room.name}</h3>
              <p className="hotel">{room.hotel}</p>
              <p className="city">{room.city}</p>
              <p className="price">${room.price}/night</p>
              <p className="stars">{"★".repeat(room.rating)}</p>
            </div>
          </div>
        ) : (
          <p>No room selected.</p>
        )}
      </div>

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
          placeholder="Number of Guests"
          value={customer.guests}
          onChange={(e) => handleCustomer("guests", e.target.value)}
        />
      </div>

      {/* PAYMENT */}
      <div className="section-card">
        <h2 className="section-title">Payment Method</h2>

        <div className="payment-methods">
          <button
            className={`method ${payment.method === "card" ? "active" : ""}`}
            onClick={() => setPayment({ ...payment, method: "card" })}
          >
            Credit Card
          </button>

          <button
            className={`method ${payment.method === "paypal" ? "active" : ""}`}
            onClick={() => setPayment({ ...payment, method: "paypal" })}
          >
            PayPal
          </button>

          <button
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

      <button className="confirm-btn" onClick={handleSubmit}>
        Confirm Booking
      </button>
    </div>
  );
}
