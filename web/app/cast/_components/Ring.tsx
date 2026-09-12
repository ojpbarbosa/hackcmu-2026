'use client';
import { mmss } from './model';

const R = 88;
const C = Math.round(2 * Math.PI * R); // 553, as in the mockup

/** The countdown ring. Full at the moment the cast lands, empty at the deadline. */
export function Ring({ remainingMs, totalMs, label }: { remainingMs: number; totalMs: number; label: string }) {
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  return (
    <div className="ring">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="cast-ring" x1="0" x2="1">
            <stop offset="0" stopColor="#4A78F0" />
            <stop offset="1" stopColor="#7B3FE4" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" stroke="#EEF1F7" strokeWidth="12" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="url(#cast-ring)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={Math.round(C * (1 - frac))}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset .3s linear' }}
        />
      </svg>
      <div className="num">
        <b>{mmss(remainingMs)}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}
