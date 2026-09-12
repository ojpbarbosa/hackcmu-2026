'use client';
import { useMemo } from 'react';
import { Creature } from '../_components/Creature';
import { useFamiliars } from '../_components/useFamiliars';
import { hash } from '@/lib/ids';

/** The projector. No tabs, no phone: the room watching itself. */
export default function StagePage() {
  const { code, state, events, members } = useFamiliars();

  const familiars = useMemo(() => Object.values(state?.familiars ?? {}), [state]);

  const counts = useMemo(() => {
    const pairs = state?.pairs ?? [];
    const met = new Set<string>();
    for (const p of pairs) {
      met.add(p.a);
      met.add(p.b);
    }
    const introduced = Object.keys(state?.intros ?? {}).length;
    const castIds = new Set<string>();
    for (const c of state?.pendingCasts ?? []) castIds.add(c.from);
    for (const id of Object.keys(state?.casting ?? {})) castIds.add(id);
    const neverCast = familiars.filter((f) => !castIds.has(f.id) && !met.has(f.id)).length;
    return { met: met.size, introduced, neverCast };
  }, [state, familiars]);

  const last = useMemo(() => {
    const pairs = state?.pairs ?? [];
    const p = pairs[pairs.length - 1];
    if (!p || !state) return null;
    const a = state.familiars[p.a];
    const b = state.familiars[p.b];
    if (!a || !b) return null;
    return { a, b, youBoth: p.youBoth };
  }, [state]);

  return (
    <div className="scr" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '28px 22px 22px' }}>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <p className="lb lbl">Tepper · tonight</p>
          <p className="d2 h2">{familiars.length} familiars</p>
          <p className="t body">
            {counts.met} met · {counts.introduced} introduced · {counts.neverCast} never cast
          </p>
        </div>
        <span className="pill chip">
          {members.length} phones · {code ?? '…'}
        </span>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 260, marginTop: 16 }}>
        {familiars.map((f) => {
          const h = hash(f.id);
          const left = 6 + (h % 86);
          const top = 4 + ((h >>> 7) % 80);
          return (
            <div key={f.id} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)' }}>
              <Creature traits={f.traits} size={40} glow={false} />
            </div>
          );
        })}
        {familiars.length === 0 ? <p className="s mute">the room is still forming.</p> : null}
      </div>

      {last ? (
        <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Creature traits={last.a.traits} size={52} glow />
          <Creature traits={last.b.traits} size={52} glow />
          <div style={{ flex: 1 }}>
            <p className="t body" style={{ color: '#fff', fontWeight: 600 }}>
              {last.a.name} and {last.b.name} are on stage
            </p>
            <p className="s mute">&ldquo;{last.youBoth}&rdquo;</p>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <p className="lb lbl">models</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {events.slice(-6).map((e, i) => (
            <p className="s mute" key={`${e.ts}-${i}`}>
              {e.task} · {e.model} · {e.latencyMs} ms{e.fallback ? ' · fallback' : ''}
            </p>
          ))}
          {events.length === 0 ? <p className="s mute">no model calls yet</p> : null}
        </div>
      </div>
    </div>
  );
}
