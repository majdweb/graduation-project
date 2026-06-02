import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './room.css'

export default function Hotels(){
  const navigate = useNavigate();

  // derive hotels from a small local list similar to Rooms data
  const hotelsData = useMemo(()=>[
    { name: 'Blue Horizon Hotel', city: 'Paris', rating: 5, minPrice: 100, maxPrice: 150 },
    { name: 'Royal Stay', city: 'London', rating: 4, minPrice: 140, maxPrice: 200 },
    { name: 'Sunset Inn', city: 'Rome', rating: 4, minPrice: 80, maxPrice: 110 },
    { name: 'Velvet Palace', city: 'Dubai', rating: 5, minPrice: 220, maxPrice: 300 }
  ],[])

  const [filters, setFilters] = useState({ hotel: '', city: '', rating: '' })

  const results = hotelsData.filter(h => {
    const okHotel = !filters.hotel || h.name.toLowerCase().includes(filters.hotel.toLowerCase())
    const okCity = !filters.city || h.city.toLowerCase().includes(filters.city.toLowerCase())
    const okRating = !filters.rating || h.rating === Number(filters.rating)
    return okHotel && okCity && okRating
  })

  const handleSelect = (hotel) => {
    // navigate to Rooms page with selected hotel and carry filters
    navigate('/rooms', { state: { selectedHotel: hotel.name, initialFilters: { city: hotel.city } } })
  }

  return (
    <div className="rooms-page">
      <div className="back-wrapper">
        <Link to="/" className="back-btn">← Back</Link>
      </div>

      <h1 className="section-title">Search Hotels</h1>

      <div className="filters-wrapper">
        <div className="filters-row">
          <input placeholder="Hotel name" value={filters.hotel} onChange={e=>setFilters({...filters, hotel: e.target.value})} />
          <input placeholder="City" value={filters.city} onChange={e=>setFilters({...filters, city: e.target.value})} />
          <select value={filters.rating} onChange={e=>setFilters({...filters, rating: e.target.value})}>
            <option value="">Any rating</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
          </select>
        </div>
      </div>

      <div className="rooms-grid">
        {results.map((h, i) => (
          <div key={i} className="room-card snow-card">
            <h3>{h.name}</h3>
            <p className="hotel-name">{h.city}</p>
            <p className="room-info">Rating: {h.rating} • ${h.minPrice}–${h.maxPrice}</p>
            <button className="book-btn" onClick={()=>handleSelect(h)}>Select Hotel</button>
          </div>
        ))}
      </div>
    </div>
  )
}
