import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './room.css'
import * as hotelsSvc from './services/hotels'
const SYRIA_CITIES = [
  'Damascus', 'Aleppo', 'Homs', 'Hama', 'Latakia', 'Tartous',
  'Idlib', 'Palmyra', 'Bloudan',
]

const STAR_OPTIONS = [5, 4, 3, 2, 1]

export default function Hotels() {
  const navigate = useNavigate()
  const location = useLocation()

  const [hotelsData, setHotelsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    hotel: '',
    city: location.state?.initialFilters?.city || '',
    stars: location.state?.initialFilters?.stars ?? [],
  })

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    hotelsSvc.getHotels()
      .then((data) => { if (mounted) setHotelsData(Array.isArray(data) ? data : []) })
      .catch((err) => { if (mounted) setError(err.message || 'Unable to load hotels.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const toggleStar = (s) => {
    setFilters(f => ({
      ...f,
      stars: f.stars.includes(s) ? f.stars.filter(x => x !== s) : [...f.stars, s],
    }))
  }

  const clearFilters = () => setFilters({ hotel: '', city: '', stars: [] })

  const activeFilterCount =
    (filters.hotel ? 1 : 0) + (filters.city ? 1 : 0) + filters.stars.length

  const results = hotelsData.filter(h => {
    const nameOk = !filters.hotel || String(h.hotelName || '').toLowerCase().includes(filters.hotel.toLowerCase())
    const cityOk = !filters.city || String(h.city || '').toLowerCase() === filters.city.toLowerCase()
    const starsOk = filters.stars.length === 0 || filters.stars.includes(Number(h.stars))
    return nameOk && cityOk && starsOk
  })

  const handleSelect = (hotel) => {
    navigate('/rooms', { state: { selectedHotel: hotel.hotelName, hotel } })
  }

  return (
    <div className="sr-page">
      {/* Top bar */}
      <div className="sr-topbar">
        <div className="sr-topbar-center">
          <h1 className="sr-title">Hotels in Syria</h1>
        </div>
        <input
          className="sr-filter-input"
          style={{ width: 220 }}
          placeholder="Search hotel name…"
          value={filters.hotel}
          onChange={e => setFilters(f => ({ ...f, hotel: e.target.value }))}
        />
        {activeFilterCount > 0 && (
          <button className="sr-clear-btn" onClick={clearFilters}>
            Clear all <span className="sr-filter-badge">{activeFilterCount}</span>
          </button>
        )}
      </div>

      {loading && <p className="sr-status">Loading hotels…</p>}
      {error && <p className="sr-status sr-error">{error}</p>}

      <div className="sr-body">
        {/* Sidebar filters */}
        <aside className="sr-sidebar">
          <div className="sr-sidebar-header">
            <span className="sr-sidebar-title">Filters</span>
            {activeFilterCount > 0 && (
              <button className="sr-clear-btn" onClick={clearFilters}>Clear all</button>
            )}
          </div>

          {/* City */}
          <div className="sr-filter-section">
            <span className="sr-filter-label">City</span>
            <select
              className="sr-filter-input"
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
            >
              <option value="">All cities</option>
              {SYRIA_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stars */}
          <div className="sr-filter-section">
            <span className="sr-filter-label">Stars</span>
            <div className="sr-star-row">
              {STAR_OPTIONS.map(s => (
                <button
                  key={s}
                  className={`sr-star-btn${filters.stars.includes(s) ? ' active' : ''}`}
                  onClick={() => toggleStar(s)}
                >
                  {'★'.repeat(s)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <main className="sr-results">
          {!loading && (
            <p className="sr-count">
              {results.length} {results.length === 1 ? 'hotel' : 'hotels'} found
            </p>
          )}

          {!loading && results.length === 0 && (
            <div className="sr-empty">
              <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>No hotels match your filters.</p>
              <button className="sr-clear-btn-lg" onClick={clearFilters}>Clear filters</button>
            </div>
          )}

          <div className="sr-grid">
            {results.map((h, i) => (
              <div
                key={h.hotelId || h.hotelName || i}
                className="sr-card"
                onClick={() => handleSelect(h)}
                style={{ cursor: 'pointer', animationDelay: `${i * 0.07}s` }}
              >
                {h.cardPhoto
                  ? <img className="sr-card-img" src={h.cardPhoto} alt={h.hotelName} />
                  : <div className="sr-card-img-placeholder" />
                }
                <div className="sr-card-body">
                  <h3 className="sr-card-name">{h.hotelName || 'Hotel'}</h3>
                  <p className="sr-card-hotel">📍 {h.city || 'City not set'}</p>
                  {h.stars ? (
                    <p className="sr-card-stars">
                      {'★'.repeat(Number(h.stars))}{'☆'.repeat(5 - Number(h.stars))}
                    </p>
                  ) : null}
                  <div className="sr-card-footer">
                    <p className="sr-card-price">
                      {typeof h.minPrice === 'number' && typeof h.maxPrice === 'number' ? (
                        <>
                          <span className="sr-price-amount">${h.minPrice}–${h.maxPrice}</span>
                          <span className="sr-price-night"> / night</span>
                        </>
                      ) : (
                        <span className="sr-price-night">Pricing not set</span>
                      )}
                    </p>
                    <button
                      className="sr-book-btn"
                      onClick={e => { e.stopPropagation(); handleSelect(h) }}
                    >
                      View Rooms
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
