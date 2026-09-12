'use client';
import type { CSSProperties } from 'react';

/** Fill is how many have pulled; the notch is where the plan goes live. */
export function QuorumBar({ pulls, quorum, of }: { pulls: number; quorum: number; of: number }) {
  const span = Math.max(of, quorum, 1);
  const fill = Math.min(100, (pulls / span) * 100);
  const mark = Math.min(100, (quorum / span) * 100);
  return (
    <div
      className="prog q"
      style={{ '--q': `${mark}%` } as CSSProperties}
      role="progressbar"
      aria-valuenow={pulls}
      aria-valuemin={0}
      aria-valuemax={span}
      aria-label={`${pulls} of ${span} pulling, goes live at ${quorum}`}
    >
      <i style={{ width: `${fill}%`, transition: 'width .4s ease' }} />
    </div>
  );
}
