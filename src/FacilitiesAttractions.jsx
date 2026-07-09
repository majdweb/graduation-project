import { useMemo, useState } from "react";
import { useSiteContent, STORAGE_KEY } from "./useSiteContent";
import { getCurrentRole } from "./services/auth";
import "./FacilitiesAttractions.css";
import "./room.css";

const cityOptions = [
  "Damascus",
  "Aleppo",
  "Homs",
  "Hama",
  "Latakia",
  "Tartous",
  "Idlib",
  "Palmyra",
  "Bloudan",
];

const difficultyOptions = ["Easy", "Medium", "Hard", "Extreme"];

const PRICE_MIN = 0;
const PRICE_MAX = 250;

const emptyTrip = {
  title: "",
  city: cityOptions[1],
  price: 50,
  priceLabel: "Budget",
  type: "City trip",
  duration: "Half day",
  difficulty: "Easy",
  description: "",
};

function persistTrips(nextTrips) {
  let current = {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    current = stored ? JSON.parse(stored) : {};
  } catch (error) {
    current = {};
  }
  const next = { ...current, trips: nextTrips };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("velvetContentUpdated"));
}

function TripFormModal({ initialTrip, onSave, onCancel }) {
  const [form, setForm] = useState(initialTrip || emptyTrip);
  const isEditing = Boolean(initialTrip);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "price" ? Number(value) : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !(form.price > 0)) return;
    onSave({ ...form, title: form.title.trim(), description: form.description.trim() });
  };

  return (
    <div className="trip-form-overlay" onClick={onCancel}>
      <div className="trip-form-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? "Edit trip" : "Add trip"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input name="title" type="text" value={form.title} onChange={handleChange} required />
          </label>

          <div className="trip-form-row">
            <label>
              City
              <select name="city" value={form.city} onChange={handleChange}>
                {cityOptions
                  .filter((city) => city !== "All Syrian Cities")
                  .map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
              </select>
            </label>

            <label>
              Difficulty
              <select name="difficulty" value={form.difficulty} onChange={handleChange}>
                {difficultyOptions.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="trip-form-row">
            <label>
              Price ($)
              <input
                name="price"
                type="number"
                min={1}
                value={form.price}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Price label
              <input
                name="priceLabel"
                type="text"
                placeholder="Budget / Standard / Premium"
                value={form.priceLabel}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="trip-form-row">
            <label>
              Trip type
              <input
                name="type"
                type="text"
                placeholder="City trip / Desert trip / Sea activity"
                value={form.type}
                onChange={handleChange}
              />
            </label>

            <label>
              Duration
              <input
                name="duration"
                type="text"
                placeholder="Half day / Full day / 2 days"
                value={form.duration}
                onChange={handleChange}
              />
            </label>
          </div>

          <label>
            Description
            <textarea name="description" rows={3} value={form.description} onChange={handleChange} required />
          </label>

          <div className="trip-form-actions">
            <button type="submit" className="trip-form-save">
              {isEditing ? "Save changes" : "Add trip"}
            </button>
            <button type="button" className="trip-form-cancel" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FacilitiesAttractions() {
  const content = useSiteContent();
  const trips = useMemo(() => content.trips || [], [content.trips]);
  const isAdmin = useMemo(() => getCurrentRole() === "admin", []);

  const [manageMode, setManageMode] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);

  const visibleTrips = useMemo(() => {
    return trips.filter((trip) => {
      const cityMatches = !selectedCity || trip.city === selectedCity;
      const priceMatches = trip.price <= maxPrice;
      const difficultyMatches =
        selectedDifficulties.length === 0 || selectedDifficulties.includes(trip.difficulty);
      return cityMatches && priceMatches && difficultyMatches;
    });
  }, [trips, selectedCity, selectedDifficulties, maxPrice]);

  const toggleDifficulty = (d) =>
    setSelectedDifficulties((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
    );

  const clearFilters = () => {
    setSelectedCity('');
    setSelectedDifficulties([]);
    setMaxPrice(PRICE_MAX);
  };

  const activeFilterCount =
    (selectedCity ? 1 : 0) +
    selectedDifficulties.length +
    (maxPrice < PRICE_MAX ? 1 : 0);

  const handleAddTrip = (newTrip) => {
    const maxId = trips.reduce((m, t) => Math.max(m, t.id), 0);
    persistTrips([...trips, { ...newTrip, id: maxId + 1 }]);
    setShowAddForm(false);
  };

  const handleEditTrip = (updatedTrip) => {
    persistTrips(trips.map((t) => (t.id === editingTrip.id ? { ...updatedTrip, id: t.id } : t)));
    setEditingTrip(null);
  };

  const handleDeleteTrip = (tripId) => {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    persistTrips(trips.filter((t) => t.id !== tripId));
  };

  const pricePercent = ((maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <div className="facilities-page">
      <header className="facilities-hero">
        <div className="facilities-hero-copy">
          <p className="eyebrow">Facilities & Attractions</p>
          <h1>Planned Trips</h1>
          <p className="hero-description">
            Planned trips for days with tour guides from city trips, desert trips to sea activities.
          </p>
        </div>

        <div className="facilities-hero-card">
          <span>Curated experiences</span>
          <strong>{trips.length} trips</strong>
          <p>Choose the right guided trip by city, price, and travel style.</p>
          {isAdmin && (
            <button
              type="button"
              className={`admin-manage-toggle${manageMode ? " active" : ""}`}
              onClick={() => setManageMode((v) => !v)}
            >
              {manageMode ? "Done editing" : "✎ Manage trips"}
            </button>
          )}
        </div>
      </header>

      <main className="facilities-layout">
        <section className="trips-section">
          <div className="section-head">
            <h2>All Trips</h2>
            <p>{visibleTrips.length} trips available</p>
          </div>

          {manageMode && (
            <button type="button" className="add-trip-btn" onClick={() => setShowAddForm(true)}>
              + Add trip
            </button>
          )}

          <div className="trips-grid">
            {visibleTrips.map((trip, i) => (
              <article className="trip-card" key={trip.id} style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="trip-card-top">
                  <span className="trip-type">{trip.type}</span>
                  <span className="trip-price">${trip.price}</span>
                </div>
                <h3>{trip.title}</h3>
                <p className="trip-city">{trip.city}</p>
                <p className="trip-description">{trip.description}</p>
                <div className="trip-meta">
                  <span>{trip.duration}</span>
                  <span
                    className={`trip-difficulty difficulty-${trip.difficulty.toLowerCase()}`}
                  >
                    {trip.difficulty}
                  </span>
                  <span>{trip.priceLabel}</span>
                </div>
                {manageMode && (
                  <div className="trip-card-admin-actions">
                    <button type="button" onClick={() => setEditingTrip(trip)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDeleteTrip(trip.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {visibleTrips.length === 0 && (
            <div className="empty-state">No trips match the selected filters.</div>
          )}
        </section>

        <aside className="filters-panel">
          <div className="sr-sidebar-header">
            <span className="sr-sidebar-title">Filters</span>
            {activeFilterCount > 0 && (
              <button className="sr-clear-btn" onClick={clearFilters}>Clear all</button>
            )}
          </div>

          <div className="sr-filter-section">
            <span className="sr-filter-label">City</span>
            <select
              className="sr-filter-input"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">All cities</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="sr-filter-section">
            <span className="sr-filter-label">Difficulty</span>
            <div className="sr-star-row" style={{ flexWrap: 'wrap' }}>
              {difficultyOptions.map((d) => (
                <button
                  key={d}
                  className={`sr-star-btn${selectedDifficulties.includes(d) ? ' active' : ''}`}
                  onClick={() => toggleDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="sr-filter-section">
            <span className="sr-filter-label">Price — up to ${maxPrice}</span>
            <div className="price-slider-wrap">
              <input
                className="price-slider"
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{ "--fill": `${pricePercent}%` }}
              />
              <div className="price-slider-foot">
                <span>${PRICE_MIN}</span>
                <span>${PRICE_MAX}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {showAddForm && (
        <TripFormModal onSave={handleAddTrip} onCancel={() => setShowAddForm(false)} />
      )}
      {editingTrip && (
        <TripFormModal
          initialTrip={editingTrip}
          onSave={handleEditTrip}
          onCancel={() => setEditingTrip(null)}
        />
      )}
    </div>
  );
}
