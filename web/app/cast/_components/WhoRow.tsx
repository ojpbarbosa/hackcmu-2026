'use client';
import type { Person } from './model';

export type Who = 'done' | 'typing' | 'idle';

/** The status row from the mockup: one avatar per person, dot says cast / typing / waiting. */
export function WhoRow({ people, statusOf, me }: { people: Person[]; statusOf: (id: string) => Who; me?: string }) {
  return (
    <div className="who">
      {people.map((p) => {
        const s = statusOf(p.id);
        return (
          <div key={p.id} className={['m', s === 'idle' ? '' : s].filter(Boolean).join(' ')}>
            <div className={`avatar p${p.tone}`} title={p.name}>
              {p.name.slice(0, 1).toUpperCase()}
            </div>
            {p.id === me ? 'You' : p.name}
          </div>
        );
      })}
    </div>
  );
}
