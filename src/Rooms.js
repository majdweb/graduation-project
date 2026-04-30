import { useState } from "react";
import "./room.css";
import { Link } from "react-router-dom";

export default function Rooms() {
  const [rooms] = useState([
    {
      id: 1,
      name: "Deluxe King Room",
      hotel: "Blue Horizon Hotel",
      city: "Paris",
      price: 120,
      rating: 5,
      img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: 2,
      name: "Modern Suite",
      hotel: "Royal Stay",
      city: "London",
      price: 180,
      rating: 4,
      img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: 3,
      name: "Cozy Double Room",
      hotel: "Sunset Inn",
      city: "Rome",
      price: 90,
      rating: 4,
      img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: 4,
      name: "Luxury Suite",
      hotel: "Velvet Palace",
      city: "Dubai",
      price: 250,
      rating: 5,
      img: "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=900&q=80",
    }
  ]);

  const [recommended] = useState([
    {
      id: 101,
      name: "Premium Sea View",
      hotel: "Ocean Breeze Resort",
      price: 200,
      rating: 5,
      img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 102,
      name: "Executive Suite",
      hotel: "Grand Palace",
      price: 260,
      rating: 5,
      img: "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 103,
      name: "Romantic Getaway",
      hotel: "Velvet Rose Hotel",
      price: 180,
      rating: 4,
      img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80"
    }
  ]);

  const [filters, setFilters] = useState({
    hotel: "",
    roomName: "",
    city: "",
    rating: "",
    checkIn: "",
    checkOut: ""
  });

  const [priceRange, setPriceRange] = useState([0, 300]);

  const handleMin = (e) => {
    const v = Number(e.target.value);
    if (v <= priceRange[1]) setPriceRange([v, priceRange[1]]);
  };

  const handleMax = (e) => {
    const v = Number(e.target.value);
    if (v >= priceRange[0]) setPriceRange([priceRange[0], v]);
  };

  const ratingOptions = [
    { value: "", stars: 0 },
    { value: 1, stars: 1 },
    { value: 2, stars: 2 },
    { value: 3, stars: 3 },
    { value: 4, stars: 4 },
    { value: 5, stars: 5 }
  ];

  const filteredRooms = rooms.filter(room => {
    const matchesHotel =
      filters.hotel === "" ||
      room.hotel.toLowerCase().includes(filters.hotel.toLowerCase());

    const matchesRoomName =
      filters.roomName === "" ||
      room.name.toLowerCase().includes(filters.roomName.toLowerCase());

    const matchesCity =
      filters.city === "" ||
      room.city.toLowerCase().includes(filters.city.toLowerCase());

    const matchesRating =
      filters.rating === "" || room.rating == Number(filters.rating);

    const matchesPrice =
      room.price >= priceRange[0] && room.price <= priceRange[1];
  
    return (
      matchesHotel &&
      matchesRoomName &&
      matchesCity &&
      matchesRating &&
      matchesPrice
    );
  });

  return (
    <div className="rooms-page">

      <div className="back-wrapper">
        <Link to="/" className="back-btn">← Back</Link>
      </div>

      <h2 className="section-title">Recommended Rooms</h2>

      <div className="recommended-grid">
        {recommended.map(room => (
          <div className="recommended-card snow-card" key={room.id}>
            <img src={room.img} className="recommended-img" />
            <h3>{room.name}</h3>
            <p className="hotel-name">{room.hotel}</p>
            <div className="room-info">
              <span className="price">${room.price}/night</span>
              <span className="stars">{"★".repeat(room.rating)}</span>
            </div>

            <Link 
              to="/reservation"
              state={{ room }}
              className="book-btn"
            >
              Book Now
            </Link>
          </div>
        ))}
      </div>

      <h1 className="section-title">Available Rooms</h1>

      {/* FILTERS */}
      <div className="filters-wrapper">

        {/* Row 1 */}
        <div className="filters-row">
          <input
            type="text"
            placeholder="Hotel Name"
            value={filters.hotel}
            onChange={(e) => setFilters({ ...filters, hotel: e.target.value })}
          />

          <input
            type="text"
            placeholder="Room Name"
            value={filters.roomName}
            onChange={(e) => setFilters({ ...filters, roomName: e.target.value })}
          />

          <input
            type="text"
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>

        {/* Row 2 */}
        <div className="filters-row">

          {/* Rating */}
      <div className="rating-stars">
     
  {[1, 2, 3, 4, 5].map((star) => (
    <span
      key={star}
      className={star <= filters.rating ? "star active" : "star"}
      onClick={() => setFilters({ ...filters, rating: star })}
    >
      ★
    </span>
  ))}

  <button
    className={`clear-rating ${filters.rating === "" ? "active" : ""}`}
    onClick={() => setFilters({ ...filters, rating: "" })}
  >
    Any
  </button>
</div>


          {/* Range */}
       
          <div className="simple-range">
          <h1>Price Range</h1>
            <input type="range" min="0" max="300" value={priceRange[0]} onChange={handleMin} />
            <input type="range" min="0" max="300" value={priceRange[1]} onChange={handleMax} />

            <div className="simple-values">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="date-fields">
         <h1>  Check In </h1>
            <input
              type="date"
              value={filters.checkIn}
              onChange={(e) => setFilters({ ...filters, checkIn: e.target.value })}
            />
          <h1>  Check Out </h1>
            <input
              type="date"
              value={filters.checkOut}
              onChange={(e) => setFilters({ ...filters, checkOut: e.target.value })}
            />
          </div>

        </div>

      </div>

      {/* ROOMS GRID */}
      <div className="rooms-grid">
        {filteredRooms.map(room => (
          <div className="room-card snow-card" key={room.id}>
            <img src={room.img} className="room-img" />

            <h3>{room.name}</h3>
            <p className="hotel-name">{room.hotel}</p>
            <p className="city">{room.city}</p>

            <div className="room-info">
              <span className="price">${room.price}/night</span>
              <span className="stars">{"★".repeat(room.rating)}</span>
            </div>

            <Link 
              to="/reservation"
              state={{ room }}
              className="book-btn"
            >
              Book Now
            </Link>

          </div>
        ))}
      </div>

    </div>
  );
}
