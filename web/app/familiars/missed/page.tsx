'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Creature } from '../_components/Creature';
import { useFamiliars, withRoom } from '../_components/useFamiliars';
import { keepMissing } from '@/lib/apps/familiars';
import { traitsFor } from '@/lib/familiars/creature';

export default function MissedPage() {
  const router = useRouter();
  const { code, state, me, act } = useFamiliars();
  const [pick, setPick] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  const missing = useMemo(() => (state && me ? keepMissing(state, me.id) : []), [state, me]);
  const current = useMemo(() => missing.find((m) => m.id === pick) ?? missing[0] ?? null, [missing, pick]);

  if (!state || !me) {
    return (
      <div className="scr">
        <div className="top pad">
          <p className="s mute">looking…</p>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="scr">
        <div className="top pad" style={{ textAlign: 'center', marginTop: 40 }}>
          <Creature traits={me.traits} size={120} glow />
          <p className="t body">You haven&rsquo;t missed anyone yet.</p>
          <button className="cta glass ghost" type="button" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const them = state.familiars[current.id] ?? null;
  const via = current.via ? state.familiars[current.via] : null;
  const intro = state.intros[`${me.id}:${current.id}`];

  const ask = async () => {
    if (asking) return;
    setAsking(true);
    try {
      await act('askIntro', { to: current.id });
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="scr">
      <div className="top">
        <div className="nav">
          <button className="rb" type="button" onClick={() => router.back()} aria-label="back">
            ‹
          </button>
          <span className="pill chip">{current.shared.length} {current.shared.length === 1 ? 'thing' : 'things'} in common</span>
        </div>

        <div
          className="pad"
          style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {via ? <Creature traits={via.traits} size={84} glow={false} /> : null}
            <Creature traits={them ? them.traits : traitsFor(current.id)} size={150} glow />
            <Creature traits={me.traits} size={84} glow={false} />
          </div>
          <div>
            <p className="d1 h1">{them ? them.human.name : 'someone'}</p>
            <p className="t body">
              {via ? `${via.human.name} met them. You didn't.` : 'Same room, all night. You never met.'}
            </p>
          </div>
          <div className="traits">
            {current.shared.map((s) => (
              <span className="chip" key={s}>
                <i />
                {s}
              </span>
            ))}
          </div>

          {intro ? (
            <>
              <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}>
                {via ? <Creature traits={via.traits} size={44} glow={false} /> : null}
                <p className="t body" style={{ flex: 1 }}>
                  {intro.line}
                </p>
              </div>
              <p className="s mute" style={{ color: 'var(--mint)' }}>
                Say it in person.
              </p>
            </>
          ) : via ? (
            <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}>
              <Creature traits={via.traits} size={44} glow={false} />
              <p className="t body" style={{ flex: 1 }}>
                {via.human.name}&rsquo;s familiar can make the intro.
              </p>
            </div>
          ) : null}

          {missing.length > 1 ? (
            <div className="traits" style={{ overflowX: 'auto', flexWrap: 'nowrap', width: '100%', justifyContent: 'flex-start' }}>
              {missing.map((m) => {
                const f = state.familiars[m.id];
                const on = m.id === current.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={on ? 'chip on' : 'chip'}
                    onClick={() => setPick(m.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: on ? '#fff' : 'var(--glass)',
                      color: on ? '#0F1133' : 'var(--tx)',
                      border: '1px solid var(--line)',
                      font: '600 13px/1 var(--sys)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f ? f.human.name : m.id.slice(-4)}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="bottom">
        {intro ? null : (
          <button className="cta glow gold" type="button" onClick={ask} disabled={asking}>
            {asking ? 'Asking…' : 'Ask for an intro'}
          </button>
        )}
        <button className="cta glass ghost" type="button" onClick={() => router.back()}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
