'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { castsFor } from '@/lib/apps/familiars';
import type { FamState, Familiar } from '@/lib/apps/familiars';
import { serverNow } from '@/hooks/useServerClock';
import { Creature } from './Creature';
import { withRoom } from './useFamiliars';

/** A cast reaches you on every tab, not only on the meet screen; and a fresh pair
 *  pulls you into the duet wherever you are. */
export function IncomingCast({
  state,
  me,
  act,
  code,
}: {
  state: FamState | null;
  me: Familiar | null;
  act: (name: string, payload?: unknown) => Promise<void>;
  code: string | null;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);
  const now = serverNow();

  const jumped = useRef<string | null>(null);
  useEffect(() => {
    if (!me || !state) return;
    const p = [...state.pairs].reverse().find((x) => (x.a === me.id || x.b === me.id) && !x.talked && now - x.at < 60_000);
    if (p && jumped.current !== p.id) {
      jumped.current = p.id;
      router.push(withRoom('/familiars/meet', code));
    }
  }, [state, me, code, router, now]);

  if (!me || !state) return null;
  const incoming = castsFor(state, me.id, now)[0] ?? null;
  if (!incoming || dismissed === incoming.id) return null;
  const theirs = state.familiars[incoming.from];

  return (
    <div className="catchsheet" role="dialog" aria-live="polite">
      <div className="row2" style={{ gap: 12 }}>
        <Creature traits={theirs.traits} size={54} glow={false} />
        <div style={{ flex: 1 }}>
          <b style={{ display: 'block', font: '800 16px/1.2 var(--disp)' }}>
            {theirs.name}, from {theirs.human.name}
          </b>
          <small style={{ color: '#5b5680' }}>casting to you</small>
        </div>
      </div>
      <div className="row2" style={{ gap: 8 }}>
        <button
          className="cta gold"
          type="button"
          disabled={busy}
          style={{ flex: 2, height: 48 }}
          onClick={() => {
            setBusy(true);
            void act('catch', { castId: incoming.id }).finally(() => setBusy(false));
          }}
        >
          {busy ? 'Meeting…' : 'Catch'}
        </button>
        <button className="cta ghost" type="button" style={{ flex: 1, height: 48, color: '#0f1133' }} onClick={() => setDismissed(incoming.id)}>
          Not now
        </button>
      </div>
    </div>
  );
}
