'use client';
import type { ObserveEvent } from '@/lib/types';

const SWATCH = ['#4A78F0', '#7B3FE4', '#10B981', '#FF6B4A', '#D6336C', '#F59E0B', '#F0F0F8'];

function swatch(model: string): string {
  let h = 0;
  for (let i = 0; i < model.length; i++) h = (h * 31 + model.charCodeAt(i)) >>> 0;
  return SWATCH[h % SWATCH.length];
}

type Group = { model: string; provider: string; n: number; tasks: string[]; fallback: boolean };

export function groupEvents(events: ObserveEvent[], limit = 30): Group[] {
  const recent = events.slice(-limit);
  const by = new Map<string, Group>();
  for (const e of recent) {
    const key = `${e.provider}:${e.model}`;
    const g = by.get(key) ?? { model: e.model, provider: e.provider, n: 0, tasks: [], fallback: false };
    g.n += 1;
    if (!g.tasks.includes(e.task)) g.tasks.push(e.task);
    if (e.fallback) g.fallback = true;
    by.set(key, g);
  }
  return [...by.values()].sort((a, b) => b.n - a.n);
}

/** The attribution strip. Shows the provider that actually answered — never faked. */
export function ModelLadder({ events, dark = true }: { events: ObserveEvent[]; dark?: boolean }) {
  const groups = groupEvents(events);
  if (groups.length === 0) {
    return (
      <div className={['ladder', dark ? '' : 'lt'].filter(Boolean).join(' ')}>
        <div className="mdl">
          <i style={{ background: '#4B5563' }} />
          no model calls yet
        </div>
      </div>
    );
  }
  return (
    <div className={['ladder', dark ? '' : 'lt'].filter(Boolean).join(' ')}>
      {groups.map((g) => (
        <div className="mdl" key={`${g.provider}:${g.model}`}>
          <i style={{ background: swatch(g.model) }} />
          <span>
            <b>
              {g.n} × {g.model}
            </b>{' '}
            <em>· {g.provider}</em> · {g.tasks.slice(0, 3).join(', ')}
            {g.tasks.length > 3 ? '…' : ''}
            {g.fallback ? <span className="badge-fb">fallback</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
