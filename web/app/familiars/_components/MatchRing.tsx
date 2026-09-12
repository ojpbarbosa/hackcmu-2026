'use client';
import { Orb } from './Orb';

const R = 68;
const C = 2 * Math.PI * R; // ≈ 427, the mockup's dash array

/** Match percentage as a ring around a ghost orb. */
export function MatchRing({ pct, letter = '?', aura }: { pct: number; letter?: string; aura?: [string, string] }) {
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div className="matchring">
      <svg viewBox="0 0 150 150" aria-label={`${Math.round(clamped * 100)} percent match`}>
        <circle cx="75" cy="75" r={R} fill="none" stroke="#EEF1F7" strokeWidth="8" />
        <circle
          cx="75"
          cy="75"
          r={R}
          fill="none"
          stroke="var(--acc)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - clamped)}
          transform="rotate(-90 75 75)"
        />
      </svg>
      <Orb letter={letter} aura={aura} ghost={!aura} />
      <span className="pill ink pct" style={{ height: 30, fontSize: 12 }}>
        {Math.round(clamped * 100)}% like you
      </span>
    </div>
  );
}
