import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './room.css'
import * as hotelsSvc from './services/hotels'

export default function Hotels(){
  const navigate = useNavigate();
  const isOwner = (() => {
    try {
      const raw = localStorage.getItem('mock_auth_user');
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed?.user?.role || localStorage.getItem('mock_auth_role')) === 'hotel_owner';
    } catch (error) {
      return localStorage.getItem('mock_auth_role') === 'hotel_owner';
    }
  })();
  const handleBack = () => {
    const fallback = isOwner ? '/ownerhome' : '/';
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  const [hotelsData, setHotelsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({ hotel: '', city: '', rating: '' })

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    hotelsSvc.getHotels()
      .then((data) => {
        if (!mounted) return
        setHotelsData(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Unable to load hotels.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const results = hotelsData.filter(h => {
    const nameValue = String(h.hotelName || '')
    const cityValue = String(h.city || '')
    const okHotel = !filters.hotel || nameValue.toLowerCase().includes(filters.hotel.toLowerCase())
    const okCity = !filters.city || cityValue.toLowerCase().includes(filters.city.toLowerCase())
    const okRating = !filters.rating || (h.rating && h.rating === Number(filters.rating))
    return okHotel && okCity && okRating
  })

  const handleSelect = (hotel) => {
    // navigate to Rooms page with selected hotel and carry filters
    navigate('/rooms', { state: { selectedHotel: hotel.hotelName, initialFilters: { city: hotel.city } } })
  }

  return (
    <div className="rooms-page">
      <div className="back-wrapper">
        <button type="button" className="back-btn" onClick={handleBack}>← Back</button>
      </div>

      <h1 className="section-title">Search Hotels</h1>

      {loading && <p style={{ textAlign: 'center', marginBottom: 20 }}>Loading hotels...</p>}
      {error && <p style={{ textAlign: 'center', color: '#9b1c1c', marginBottom: 20 }}>{error}</p>}

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
            {h.cardPhoto && <img className="room-img" src={h.cardPhoto} alt={h.hotelName} />}
            <h3>{h.hotelName || 'Hotel'}</h3>
            <p className="hotel-name">{h.city || 'City not set'}</p>
            <p className="room-info">
              {h.rating ? `Rating: ${h.rating}` : 'No rating yet'} •{' '}
              {typeof h.minPrice === 'number' && typeof h.maxPrice === 'number'
                ? `$${h.minPrice}–$${h.maxPrice}`
                : 'Pricing not set'}
            </p>
            <button className="book-btn" onClick={()=>handleSelect(h)}>Select Hotel</button>
          </div>
        ))}
        {!loading && results.length === 0 && (
          <div className="empty-state">
            <p>No hotels found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
