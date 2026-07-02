import React from 'react'

/**
 * Dual-handle price range slider.
 *
 * Props:
 *   min        – absolute lower bound (default 0)
 *   max        – absolute upper bound (default 1000)
 *   valueMin   – current lower handle value
 *   valueMax   – current upper handle value
 *   onChange   – called with { min, max } whenever either handle moves
 *   currency   – prefix symbol (default '$')
 *   step       – slider step (default 5)
 *   disabled   – greys out while data is still loading
 */
export default function PriceRangeSlider({
  min = 0,
  max = 1000,
  valueMin = 0,
  valueMax,
  onChange,
  currency = '$',
  step = 5,
  disabled = false,
}) {
  const lo = valueMin
  const hi = valueMax ?? max

  const range = max - min || 1
  const loPercent = Math.max(0, Math.min(100, ((lo - min) / range) * 100))
  const hiPercent = Math.max(0, Math.min(100, ((hi - min) / range) * 100))

  const handleMin = (e) => {
    const v = Math.min(Number(e.target.value), hi - step)
    onChange({ min: v, max: hi })
  }

  const handleMax = (e) => {
    const v = Math.max(Number(e.target.value), lo + step)
    onChange({ min: lo, max: v })
  }

  // When both thumbs overlap, raise the min thumb so users can drag it left again
  const minZ = lo >= hi - range * 0.02 ? 5 : 3

  return (
    <div className={`prs-wrap${disabled ? ' prs-disabled' : ''}`}>
      <div className="prs-values">
        <span>{currency}{lo}</span>
        <span>{currency}{hi}</span>
      </div>
      <div className="prs-track-wrap">
        <div className="prs-track" />
        <div
          className="prs-fill"
          style={{ left: `${loPercent}%`, width: `${hiPercent - loPercent}%` }}
        />
        <input
          type="range"
          className="prs-input"
          min={min} max={max} step={step}
          value={lo}
          onChange={handleMin}
          disabled={disabled}
          style={{ zIndex: minZ }}
        />
        <input
          type="range"
          className="prs-input"
          min={min} max={max} step={step}
          value={hi}
          onChange={handleMax}
          disabled={disabled}
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  )
}
