'use client';

const MIN = 15;
const MAX = 90;
const TICKS = [15, 30, 45, 60, 90];

/** The time budget. Native range input on top for touch, mockup chrome underneath. */
export function TimeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = ((value - MIN) / (MAX - MIN)) * 100;
  return (
    <div className="field">
      <div className="between">
        <p className="lbl">time you have</p>
        <span className="h4">{value} min</span>
      </div>
      <div className="slider">
        <div className="track" />
        <div className="fill" style={{ width: `${pct}%` }} />
        <div className="knob" style={{ left: `${pct}%` }}>
          {value}
        </div>
        <div className="ticks">
          {TICKS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={5}
          value={value}
          aria-label="time you have, in minutes"
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: 'absolute', left: 0, right: 0, width: '100%', height: 44, opacity: 0, margin: 0 }}
        />
      </div>
    </div>
  );
}
