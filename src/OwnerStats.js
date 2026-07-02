import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./ownerDashboard.css";
import * as ownerSvc from "./services/owner";
import { getCurrentUser } from "./services/auth";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function OwnerStats() {
  const hotelId = useMemo(() => {
    const envHotelId = process.env.REACT_APP_HOTEL_ID;
    if (envHotelId) return envHotelId;

    const user = getCurrentUser() || {};
    return String(user.hotelId || user.hotelName || user.id || 1);
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear();
  const [chartMode, setChartMode] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return start.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState({ monthly: 0, quarterly: 0, ytd: 0, yearly: 0, custom: 0 });
  const [comparisonBase, setComparisonBase] = useState({ lastMonth: 0, lastQuarter: 0, lastYear: 0 });
  const [chartPoints, setChartPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const yearOptions = useMemo(() => {
    return [currentYear - 2, currentYear - 1, currentYear];
  }, [currentYear]);

  const effectiveYear = chartMode === "ytd" ? currentYear : selectedYear;

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevMonthYear = selectedMonth === 0 ? effectiveYear - 1 : effectiveYear;
        const prevQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
        const prevQuarterYear = selectedQuarter === 1 ? effectiveYear - 1 : effectiveYear;
        const prevYear = effectiveYear - 1;

        const [payload, lastMonthPayload, lastQuarterPayload, lastYearPayload] = await Promise.all([
          ownerSvc.getRevenueStats(hotelId, {
            mode: chartMode,
            year: effectiveYear,
            month: selectedMonth,
            quarter: selectedQuarter,
            startDate: customStartDate,
            endDate: customEndDate,
          }),
          ownerSvc.getRevenueStats(hotelId, {
            mode: "monthly",
            year: prevMonthYear,
            month: prevMonth,
            quarter: selectedQuarter,
          }),
          ownerSvc.getRevenueStats(hotelId, {
            mode: "quarterly",
            year: prevQuarterYear,
            month: selectedMonth,
            quarter: prevQuarter,
          }),
          ownerSvc.getRevenueStats(hotelId, {
            mode: "yearly",
            year: prevYear,
            month: selectedMonth,
            quarter: selectedQuarter,
          }),
        ]);
        if (!mounted) return;
        setSummary({
          monthly: Number(payload?.summary?.monthly || 0),
          quarterly: Number(payload?.summary?.quarterly || 0),
          ytd: Number(payload?.summary?.ytd || 0),
          yearly: Number(payload?.summary?.yearly || 0),
          custom: Number(payload?.summary?.custom || 0),
        });
        setComparisonBase({
          lastMonth: Number(lastMonthPayload?.summary?.monthly || 0),
          lastQuarter: Number(lastQuarterPayload?.summary?.quarterly || 0),
          lastYear: Number(lastYearPayload?.summary?.yearly || 0),
        });
        setChartPoints(Array.isArray(payload?.points) ? payload.points : []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load stats");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStats();
    return () => {
      mounted = false;
    };
  }, [chartMode, customEndDate, customStartDate, effectiveYear, hotelId, selectedMonth, selectedQuarter]);

  const lineChart = useMemo(() => {
    const pointsSource = chartPoints.length ? chartPoints : [{ label: "-", value: 0 }];
    const width = 760;
    const height = 280;
    const padding = { top: 20, right: 18, bottom: 38, left: 56 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const values = pointsSource.map((item) => Number(item.value) || 0);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);

    const points = pointsSource.map((item, index) => {
      const x = pointsSource.length === 1 ? padding.left : padding.left + (index * chartWidth) / (pointsSource.length - 1);
      const y = padding.top + ((maxValue - (Number(item.value) || 0)) / range) * chartHeight;
      return { label: String(item.label), value: Number(item.value) || 0, x, y };
    });

    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
    const gridValues = Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      return Math.round(maxValue - ratio * range);
    });

    return { width, height, padding, points, linePath, areaPath, gridValues, maxValue, range };
  }, [chartPoints]);

  function formatMoney(value) {
    return `$${Math.round(Number(value) || 0).toLocaleString()}`;
  }

  function getComparison(currentValue, previousValue) {
    const current = Number(currentValue) || 0;
    const previous = Number(previousValue) || 0;
    const delta = current - previous;
    const percent = previous === 0 ? (current === 0 ? 0 : 100) : (delta / previous) * 100;
    return {
      delta,
      percent,
      trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    };
  }

  function formatDelta(value) {
    const rounded = Math.round(Math.abs(Number(value) || 0));
    const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${prefix}$${rounded.toLocaleString()}`;
  }

  function formatPercent(value) {
    const safe = Number.isFinite(value) ? value : 0;
    const sign = safe > 0 ? "+" : safe < 0 ? "-" : "";
    return `${sign}${Math.abs(safe).toFixed(1)}%`;
  }

  function exportCsv() {
    const rows = [
      ["Label", "Revenue"],
      ...chartPoints.map((point) => [String(point.label), String(Number(point.value) || 0)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `revenue-${chartMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const printWindow = window.open("", "_blank", "width=960,height=700");
    if (!printWindow) {
      alert("Unable to open print window. Please allow popups for this site.");
      return;
    }
    const rowsHtml = chartPoints
      .map((point) => `<tr><td>${String(point.label)}</td><td>$${Math.round(Number(point.value) || 0).toLocaleString()}</td></tr>`)
      .join("");
    const periodLabel = chartMode === "custom"
      ? `Custom Range (${customStartDate} to ${customEndDate})`
      : chartMode === "monthly"
        ? "Monthly"
        : chartMode === "quarterly"
          ? "Quarterly"
          : chartMode === "ytd"
            ? "Year to Date"
            : "Yearly";
    printWindow.document.write(`
      <html>
        <head>
          <title>Revenue Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            p { margin: 4px 0; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Revenue Report</h1>
          <p>Mode: ${periodLabel}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead><tr><th>Label</th><th>Revenue</th></tr></thead>
            <tbody>${rowsHtml || '<tr><td colspan="2">No data</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function openNativeDatePicker(event) {
    if (typeof event.currentTarget.showPicker === "function") {
      event.currentTarget.showPicker();
    }
  }

  function blockManualDateInput(event) {
    event.preventDefault();
  }

  const monthComparison = getComparison(summary.monthly, comparisonBase.lastMonth);
  const quarterComparison = getComparison(summary.quarterly, comparisonBase.lastQuarter);
  const yearComparison = getComparison(summary.yearly, comparisonBase.lastYear);
  const xAxisStep = (chartMode === "monthly" || chartMode === "custom")
    ? Math.max(1, Math.ceil(lineChart.points.length / 10))
    : 1;

  return (
    <div className="owner-dashboard">
      <header className="od-header">
        <h1>Owner Stats</h1>
        <p className="muted">Revenue analytics page for monthly, quarterly, and yearly reporting.</p>
      </header>
      {error && <div className="od-error" style={{ color: "#9b1c1c", padding: 10, borderRadius: 6, background: "#fff1f0", marginBottom: 12 }}>Error: {error}</div>}
      {loading && <div className="muted small" style={{ marginBottom: 12 }}>Loading stats...</div>}

      <div style={{ marginBottom: 14 }}>
        <Link to="/owner/dashboard" className="cta" style={{ textDecoration: "none", display: "inline-block" }}>
          Back to Dashboard
        </Link>
      </div>

      <section className="od-row">
        <h2>Revenue Periods</h2>
        <div className="metrics-grid">
          <div className="metric">
            <div className="m-num">{formatMoney(summary.monthly)}</div>
            <div className="m-label">Monthly Revenue</div>
          </div>
          <div className="metric">
            <div className="m-num">{formatMoney(summary.quarterly)}</div>
            <div className="m-label">Quarterly Revenue</div>
          </div>
          <div className="metric">
            <div className="m-num">{formatMoney(summary.ytd)}</div>
            <div className="m-label">Year-to-Date Revenue</div>
          </div>
          <div className="metric">
            <div className="m-num">{formatMoney(summary.yearly)}</div>
            <div className="m-label">Yearly Revenue</div>
          </div>
        </div>
        <div className="revenue-comparison-grid">
          <div className="revenue-comparison-card">
            <h4>vs Last Month</h4>
            <p className={`revenue-comparison-delta ${monthComparison.trend}`}>{formatDelta(monthComparison.delta)}</p>
            <span className="muted small">{formatPercent(monthComparison.percent)}</span>
          </div>
          <div className="revenue-comparison-card">
            <h4>vs Last Quarter</h4>
            <p className={`revenue-comparison-delta ${quarterComparison.trend}`}>{formatDelta(quarterComparison.delta)}</p>
            <span className="muted small">{formatPercent(quarterComparison.percent)}</span>
          </div>
          <div className="revenue-comparison-card">
            <h4>vs Last Year</h4>
            <p className={`revenue-comparison-delta ${yearComparison.trend}`}>{formatDelta(yearComparison.delta)}</p>
            <span className="muted small">{formatPercent(yearComparison.percent)}</span>
          </div>
        </div>

        <div className="revenue-chart-wrap">
          <h3>Revenue Trend</h3>
          <div className="revenue-controls">
            <div className="revenue-mode-switch">
              <button type="button" className={`cta ${chartMode === "monthly" ? "active" : ""}`} onClick={() => setChartMode("monthly")}>Monthly</button>
              <button type="button" className={`cta ${chartMode === "quarterly" ? "active" : ""}`} onClick={() => setChartMode("quarterly")}>Quarterly</button>
              <button type="button" className={`cta ${chartMode === "yearly" ? "active" : ""}`} onClick={() => setChartMode("yearly")}>Yearly</button>
              <button type="button" className={`cta ${chartMode === "ytd" ? "active" : ""}`} onClick={() => setChartMode("ytd")}>Year to Date</button>
              <button type="button" className={`cta ${chartMode === "custom" ? "active" : ""}`} onClick={() => setChartMode("custom")}>Custom Range</button>
            </div>
            <div className="revenue-filters">
              {chartMode === "monthly" && (
                <>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                    {MONTH_LABELS.map((label, index) => (
                      <option key={label} value={index}>{label}</option>
                    ))}
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </>
              )}
              {chartMode === "quarterly" && (
                <>
                  <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))}>
                    <option value={1}>Q1</option>
                    <option value={2}>Q2</option>
                    <option value={3}>Q3</option>
                    <option value={4}>Q4</option>
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </>
              )}
              {chartMode === "yearly" && (
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}
              {chartMode === "ytd" && (
                <span className="muted small">Year: {currentYear}</span>
              )}
              {chartMode === "custom" && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    max={customEndDate}
                    onClick={openNativeDatePicker}
                    onKeyDown={blockManualDateInput}
                    onPaste={blockManualDateInput}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    min={customStartDate}
                    onClick={openNativeDatePicker}
                    onKeyDown={blockManualDateInput}
                    onPaste={blockManualDateInput}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </>
              )}
            </div>
          </div>
          <div className="revenue-line-chart">
            <svg viewBox={`0 0 ${lineChart.width} ${lineChart.height}`} role="img" aria-label="Revenue trend line graph">
              {lineChart.gridValues.map((value, index) => {
                const ratio = lineChart.range === 0 ? 0 : (lineChart.maxValue - value) / lineChart.range;
                const y = lineChart.padding.top + ratio * (lineChart.height - lineChart.padding.top - lineChart.padding.bottom);
                return (
                  <g key={`grid-${index}`}>
                    <line
                      x1={lineChart.padding.left}
                      x2={lineChart.width - lineChart.padding.right}
                      y1={y}
                      y2={y}
                      className="revenue-grid-line"
                    />
                    <text x={lineChart.padding.left - 8} y={y + 4} textAnchor="end" className="revenue-grid-label">
                      {formatMoney(value)}
                    </text>
                  </g>
                );
              })}

              <path d={lineChart.areaPath} className="revenue-area-path" />
              <path d={lineChart.linePath} className="revenue-line-path" />

              {lineChart.points.map((point) => (
                <circle key={`point-${point.label}`} cx={point.x} cy={point.y} r="4" className="revenue-point" />
              ))}

              {lineChart.points.map((point, index) => (
                (index % xAxisStep === 0 || index === lineChart.points.length - 1) ? (
                  <text
                    key={`label-${point.label}`}
                    x={point.x}
                    y={lineChart.height - 14}
                    textAnchor="middle"
                    className="revenue-x-label"
                  >
                    {point.label}
                  </text>
                ) : null
              ))}
            </svg>
          </div>
          <div className="revenue-export-actions">
            <button type="button" className="cta" onClick={exportCsv}>Export CSV</button>
            <button type="button" className="cta" onClick={exportPdf}>Export PDF</button>
          </div>
          <p className="muted small">
            {chartMode === "monthly"
              ? "Daily line graph for the selected month."
              : chartMode === "quarterly"
                ? "Quarter view for the selected quarter."
                : chartMode === "ytd"
                  ? "Year-to-date view from the same date last year to today."
                  : chartMode === "custom"
                    ? `Custom range from ${customStartDate} to ${customEndDate}.`
                  : "Year view by month."} Data is now loaded through the revenue stats API endpoint.
          </p>
        </div>
      </section>
    </div>
  );
}
