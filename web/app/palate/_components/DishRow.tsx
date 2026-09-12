'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/ui';
import type { Scored } from '@/lib/palate/score';
import { MatchRing, type RingTone } from './MatchRing';
import { money } from './usePalate';

export function toneFor(s: Scored): RingTone {
  if (s.status === 'never') return 'never';
  if (s.status === 'unknown') return 'unknown';
  return s.score >= 70 ? 'match' : 'mute';
}

/** One line of a ranked menu: the ring, the name, the reason, and what it costs.
 *  A dish with no record shows the Ask chip instead of a price — it is never a number. */
export function DishRow({ scored, reason, askHref, right }: { scored: Scored; reason?: string; askHref?: string; right?: ReactNode }) {
  const { dish, status } = scored;
  const tone = toneFor(scored);
  const cls = ['dish', status === 'unknown' ? 'unk' : '', status === 'never' || scored.score < 45 ? 'dim' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      <MatchRing score={scored.score} tone={tone} label={status === 'unknown' ? '?' : status === 'never' ? '—' : undefined} />
      <div style={{ minWidth: 0 }}>
        <div className="nm">{dish.name}</div>
        <div className="why">{reason || scored.reason}</div>
      </div>
      {right ??
        (status === 'unknown' && askHref ? (
          <Link className="ask" href={askHref} style={{ minHeight: 32 }}>
            <Icon name="msg" size={14} className="xs" />
            Ask
          </Link>
        ) : status === 'never' ? (
          <span
            className="pill soft"
            style={{ height: 28, fontSize: 11, background: '#FEE2E2', color: '#B91C1C', padding: '0 10px' }}
          >
            never
          </span>
        ) : (
          <div className="price">{money(dish.price)}</div>
        ))}
    </div>
  );
}
