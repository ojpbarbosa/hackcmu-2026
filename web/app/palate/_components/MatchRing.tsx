'use client';

export type RingTone = 'match' | 'mute' | 'ok' | 'warn' | 'never' | 'unknown';

const STROKE: Record<RingTone, string> = {
  match: '#D6336C',
  mute: '#8A8AA6',
  ok: '#22C55E',
  warn: '#F59E0B',
  never: '#EF4444',
  unknown: '#D0D5E0',
};

const C = 126; // circumference at r=20, the mockup's ring

/** The match ring from the mockup: a 0–100 arc, grey and dashed when nothing is known. */
export function MatchRing({
  score,
  tone = 'match',
  label,
  size = 48,
}: {
  score: number;
  tone?: RingTone;
  label?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const stroke = STROKE[tone];
  return (
    <div className="rg" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        {tone === 'unknown' ? (
          <circle cx="24" cy="24" r="20" fill="none" stroke={stroke} strokeWidth="5" strokeDasharray="4 5" />
        ) : (
          <>
            <circle cx="24" cy="24" r="20" fill="none" stroke="#EEF1F7" strokeWidth="5" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 24 24)"
            />
          </>
        )}
      </svg>
      <b style={tone === 'unknown' ? { color: 'var(--t3)' } : tone === 'never' ? { color: '#B91C1C' } : undefined}>
        {label ?? score}
      </b>
    </div>
  );
}
