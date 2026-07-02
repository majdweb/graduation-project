import { useEffect, useMemo, useState } from 'react';
import { buildAnalytics, formatMoney, MONTH_LABELS } from './data/hotelAnalytics';
import { getHotelsAnalytics, setHotelStars } from './services/hotels';

function InlineStarPicker({ userId, currentStars, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState(0);
  const display = hover || currentStars || 0;

  const handleClick = async (n) => {
    if (n === currentStars || saving) return;
    setSaving(true);
    try {
      await setHotelStars(userId, n);
      onSaved(n);
    } catch (e) {
      alert('Failed to update stars: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', gap: 2, marginLeft: 6, opacity: saving ? 0.5 : 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={(e) => { e.stopPropagation(); handleClick(n); }}
          style={{ cursor: saving ? 'default' : 'pointer', color: n <= display ? '#f59e0b' : '#d1d5db', fontSize: 15, lineHeight: 1, userSelect: 'none' }}
          title={`Set to ${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/* ── small CSS bar chart ── */
function BarChart({ items, valueKey, labelKey, color = '#6C8BC7', formatValue }) {
  const max = Math.max(1, ...items.map((it) => Number(it[valueKey]) || 0));
  return (
    <div className="ha-chart">
      {items.map((it, i) => {
        const v = Number(it[valueKey]) || 0;
        const pct = Math.round((v / max) * 100);
        return (
          <div className="ha-bar-row" key={it.id ?? it[labelKey] ?? i}>
            <div className="ha-bar-label" title={it[labelKey]}>{it[labelKey]}</div>
            <div className="ha-bar-track">
              <div className="ha-bar-fill" style={{ width: `${pct}%`, background: color }}>
                <span className="ha-bar-value">{formatValue ? formatValue(v) : v}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── vertical month columns chart ── */
function MonthChart({ values }) {
  const max = Math.max(1, ...values);
  return (
    <div className="ha-month-chart">
      {values.map((v, i) => {
        const pct = Math.round((v / max) * 100);
        return (
          <div className="ha-month-col" key={i}>
            <div className="ha-month-bar-wrap">
              <div className="ha-month-bar" style={{ height: `${Math.max(pct, v > 0 ? 6 : 0)}%` }}>
                {v > 0 && <span className="ha-month-val">{v}</span>}
              </div>
            </div>
            <div className="ha-month-label">{MONTH_LABELS[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

const SORT_OPTIONS = [
  { key: 'rooms',        label: '🛏 Rooms' },
  { key: 'bookings',     label: '📅 Total Bookings' },
  { key: 'monthly',      label: '🗓 Monthly Bookings' },
  { key: 'profit',       label: '💰 Hotel Profit' },
  { key: 'platform',     label: '🏦 Platform Profit' },
];

export default function HotelsAnalytics() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [sortKey, setSortKey] = useState('bookings');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedId, setSelectedId] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getHotelsAnalytics()
      .then(setRawData)
      .catch((err) => setLoadError(err.message || 'Unable to load hotels analytics.'));
  }, []);

  const { hotels, totals, platformCutPercent } = useMemo(
    () =>
      rawData
        ? buildAnalytics(rawData, currentMonth)
        : { hotels: [], totals: { bookings: 0, gross: 0, hotelProfit: 0, platformProfit: 0, rooms: 0 }, platformCutPercent: 15 },
    [rawData, currentMonth]
  );

  const sortedHotels = useMemo(() => {
    const accessor = {
      rooms: (h) => h.roomsCount,
      bookings: (h) => h.totalBookings,
      monthly: (h) => h.monthlyBookingsCurrent,
      profit: (h) => h.hotelProfit,
      platform: (h) => h.platformProfit,
    }[sortKey];
    const copy = [...hotels].sort((a, b) => accessor(b) - accessor(a));
    if (sortDir === 'asc') copy.reverse();
    return copy;
  }, [hotels, sortKey, sortDir]);

  const selected = useMemo(
    () => hotels.find((h) => h.hotelId === selectedId) || null,
    [hotels, selectedId]
  );

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleStarSaved = (hotelId, newStars) => {
    setRawData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        hotels: prev.hotels.map((h) => h.hotelId === hotelId ? { ...h, stars: newStars } : h),
      };
    });
  };

  return (
    <div className="ha-root">
      {loadError && <div className="admin-stat-sub" style={{ color: '#e05555', marginBottom: 12 }}>{loadError}</div>}
      {/* Summary stat cards */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Hotels</div>
          <div className="admin-stat-value">{hotels.length}</div>
          <div className="admin-stat-sub">{totals.rooms} room types</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Bookings</div>
          <div className="admin-stat-value">{totals.bookings}</div>
          <div className="admin-stat-sub">Confirmed across all hotels</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Hotels Profit</div>
          <div className="admin-stat-value" style={{ fontSize: 20 }}>{formatMoney(totals.hotelProfit)}</div>
          <div className="admin-stat-sub">{100 - platformCutPercent}% of bookings</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Platform Profit</div>
          <div className="admin-stat-value" style={{ fontSize: 20 }}>{formatMoney(totals.platformProfit)}</div>
          <div className="admin-stat-sub">{platformCutPercent}% of every booking</div>
        </div>
      </div>

      {/* Comparison chart */}
      <div className="admin-card">
        <div className="admin-card-title">📊 Bookings Comparison — All Hotels</div>
        <BarChart
          items={sortedHotels.map((h) => ({ id: h.hotelId, name: h.hotelName, bookings: h.totalBookings }))}
          valueKey="bookings"
          labelKey="name"
          color="#6C8BC7"
        />
      </div>

      <div className="admin-card">
        <div className="admin-card-title">💰 Profit Comparison — Hotel vs Platform</div>
        <BarChart
          items={sortedHotels.map((h) => ({ id: h.hotelId, name: h.hotelName, hotelProfit: h.hotelProfit }))}
          valueKey="hotelProfit"
          labelKey="name"
          color="#2E9E6B"
          formatValue={formatMoney}
        />
      </div>

      {/* Controls */}
      <div className="admin-card">
        <div className="admin-card-title">🏨 All Hotels</div>
        <div className="ha-controls">
          <div className="ha-sort-group">
            <span className="ha-controls-label">Sort by:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`ha-sort-btn ${sortKey === opt.key ? 'active' : ''}`}
                onClick={() => toggleSort(opt.key)}
              >
                {opt.label}
                {sortKey === opt.key && <span className="ha-sort-dir">{sortDir === 'desc' ? ' ↓' : ' ↑'}</span>}
              </button>
            ))}
          </div>
          <div className="ha-month-select">
            <span className="ha-controls-label">Month:</span>
            <select value={currentMonth} onChange={(e) => setCurrentMonth(Number(e.target.value))}>
              {MONTH_LABELS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hotels table */}
        <div className="ha-table-wrap">
          <table className="ha-table">
            <thead>
              <tr>
                <th>Hotel</th>
                <th>City</th>
                <th className="ha-num">Rooms</th>
                <th className="ha-num">Total Bookings</th>
                <th className="ha-num">{MONTH_LABELS[currentMonth]} Bookings</th>
                <th className="ha-num">Hotel Profit</th>
                <th className="ha-num">Platform Profit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedHotels.map((h) => (
                <tr
                  key={h.hotelId}
                  className={selectedId === h.hotelId ? 'ha-row-active' : ''}
                  onClick={() => setSelectedId(h.hotelId)}
                >
                  <td>
                    <strong>{h.hotelName}</strong>
                    <InlineStarPicker
                      userId={h.userId}
                      currentStars={h.stars}
                      onSaved={(n) => handleStarSaved(h.hotelId, n)}
                    />
                  </td>
                  <td>{h.city}</td>
                  <td className="ha-num">{h.roomsCount}</td>
                  <td className="ha-num">{h.totalBookings}</td>
                  <td className="ha-num">{h.monthlyBookingsCurrent}</td>
                  <td className="ha-num ha-profit">{formatMoney(h.hotelProfit)}</td>
                  <td className="ha-num ha-platform">{formatMoney(h.platformProfit)}</td>
                  <td className="ha-num"><span className="ha-view-link">View ›</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ha-hint">Tip: click any hotel row to see its room bookings and monthly chart.</p>
      </div>

      {/* Hotel detail */}
      {selected && (
        <div className="admin-card ha-detail">
          <div className="ha-detail-header">
            <div>
              <div className="admin-card-title" style={{ margin: 0 }}>
                {selected.hotelName}
                <InlineStarPicker
                  userId={selected.userId}
                  currentStars={selected.stars}
                  onSaved={(n) => handleStarSaved(selected.hotelId, n)}
                />
              </div>
              <div className="ha-detail-sub">{selected.city} · {selected.roomsCount} room types · {selected.totalRoomUnits} units</div>
            </div>
            <button className="ha-close" onClick={() => setSelectedId(null)}>✕</button>
          </div>

          <div className="ha-detail-stats">
            <div className="ha-mini-stat">
              <span className="ha-mini-label">Total Bookings</span>
              <span className="ha-mini-value">{selected.totalBookings}</span>
            </div>
            <div className="ha-mini-stat">
              <span className="ha-mini-label">Gross Revenue</span>
              <span className="ha-mini-value">{formatMoney(selected.grossRevenue)}</span>
            </div>
            <div className="ha-mini-stat ha-profit">
              <span className="ha-mini-label">Hotel Profit</span>
              <span className="ha-mini-value">{formatMoney(selected.hotelProfit)}</span>
            </div>
            <div className="ha-mini-stat ha-platform">
              <span className="ha-mini-label">Platform Profit ({platformCutPercent}%)</span>
              <span className="ha-mini-value">{formatMoney(selected.platformProfit)}</span>
            </div>
          </div>

          <div className="ha-detail-grid">
            <div>
              <div className="ha-sub-title">📅 Bookings per Room</div>
              <BarChart
                items={selected.rooms.map((r) => ({ id: r.id, name: r.name, bookings: r.bookings }))}
                valueKey="bookings"
                labelKey="name"
                color="#C77B6C"
              />
              <div className="ha-room-table">
                {selected.rooms.map((r) => (
                  <div className="ha-room-line" key={r.id}>
                    <span>{r.name}</span>
                    <span className="ha-room-meta">
                      {r.bookings} bookings · {formatMoney(r.grossRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="ha-sub-title">📈 Monthly Bookings</div>
              <MonthChart values={selected.monthlyBookings} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
