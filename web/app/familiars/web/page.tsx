'use client';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Creature } from '../_components/Creature';
import { Tabs } from '../_components/Tabs';
import { useFamiliars, withRoom } from '../_components/useFamiliars';
import { friendsOfFriends, keepMissing, metIds, webGroups } from '@/lib/apps/familiars';
import type { Familiar, FamState } from '@/lib/apps/familiars';
import { traitsFor, PALETTE, HUES } from '@/lib/familiars/creature';

const CX = 186;
const CY = 380;

type Placed = { id: string; x: number; y: number; label: string | null; fam: Familiar | null };

/** The web is not a force layout: the same room always draws the same picture. */
function layout(state: FamState, meId: string): { met: Placed[]; fof: Placed[]; tags: { label: string; x: number; y: number }[]; nebs: { x: number; y: number; color: string }[]; links: { a: Placed; b: Placed }[] } {
  const groups = webGroups(state, meId);
  const flat: { id: string; label: string }[] = [];
  for (const g of groups) for (const m of g.members) flat.push({ id: m, label: g.label });
  const n = Math.max(flat.length, 1);
  const met: Placed[] = flat.map((entry, i) => {
    const a = Math.PI - ((i + 0.5) / n) * Math.PI;
    const r = i % 2 === 0 ? 156 : 118;
    return {
      id: entry.id,
      label: entry.label,
      fam: state.familiars[entry.id] ?? null,
      x: CX + r * Math.cos(a),
      y: CY - r * Math.sin(a),
    };
  });
  const tags: { label: string; x: number; y: number }[] = [];
  let cursor = 0;
  for (const g of groups) {
    const mid = cursor + g.members.length / 2;
    const a = Math.PI - (mid / n) * Math.PI;
    const rawX = CX + 200 * Math.cos(a);
    const clamped = rawX < 48 || rawX > 325;
    tags.push({ label: g.label, x: Math.min(325, Math.max(48, rawX)), y: CY - 200 * Math.sin(a) - (clamped ? 44 : 0) });
    cursor += g.members.length;
  }
  const fofIds = friendsOfFriends(state, meId);
  const fn = Math.max(fofIds.length, 1);
  const fof: Placed[] = fofIds.map((id, i) => {
    // the outer arc only spans the top half-circle so the dots never sit where the edge labels lift
    const a = Math.PI * 0.8 - ((i + 0.5) / fn) * Math.PI * 0.6;
    return {
      id,
      label: null,
      fam: state.familiars[id] ?? null,
      x: CX + 240 * Math.cos(a),
      y: CY - 240 * Math.sin(a),
    };
  });
  // one soft nebula per group, in the hue of its first familiar
  const nebs: { x: number; y: number; color: string }[] = [];
  for (const g of groups) {
    const pts = met.filter((p) => g.members.includes(p.id));
    if (!pts.length) continue;
    const first = state.familiars[g.members[0]];
    const hue = first ? HUES[first.traits.hue] : 'lilac';
    nebs.push({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length, color: PALETTE[hue].c2 });
  }
  // people you met who also met each other
  const byId = new Map(met.map((p) => [p.id, p]));
  const links: { a: Placed; b: Placed }[] = [];
  for (const pr of state.pairs) {
    const a = byId.get(pr.a);
    const b = byId.get(pr.b);
    if (a && b) links.push({ a, b });
  }
  return { met, fof, tags, nebs, links };
}

export default function WebHome() {
  const router = useRouter();
  const { code, state, me } = useFamiliars();

  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  const graph = useMemo(() => (state && me ? layout(state, me.id) : null), [state, me]);
  const missing = useMemo(() => (state && me ? keepMissing(state, me.id) : []), [state, me]);
  const metCount = useMemo(() => (state && me ? metIds(state, me.id).size : 0), [state, me]);

  if (!state || !me || !graph) {
    return (
      <div className="scr has-tabs flow">
        <div className="top pad">
          <p className="s mute">waking your familiar…</p>
        </div>
      </div>
    );
  }

  const recap = state.recaps[me.id];
  const cast = state.cast;
  const answered = cast ? Object.keys(cast.answers).length : 0;
  const circle = Object.values(state.familiars).length;
  const empty = graph.met.length === 0;

  return (
    <div className="scr has-tabs flow">
      <div className="top">
        <div className="nav">
          <span className="pill chip">your web · {metCount}</span>
          {recap ? (
            <Link className="bubble-btn bubble" href={withRoom('/familiars/you', code) + '#recap'} aria-label="tonight's recap">
              <Creature traits={me.traits} size={30} glow={false} />
              <i />
            </Link>
          ) : (
            <span />
          )}
        </div>
        {cast ? (
          <Link className="todaycard glass" href={withRoom('/familiars/casts', code)} style={{ marginTop: 12 }}>
            <div className="ring">
              <svg viewBox="0 0 46 46">
                <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
                <circle
                  cx="23"
                  cy="23"
                  r="19"
                  fill="none"
                  stroke="#FFC85C"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="119"
                  strokeDashoffset={119 - (119 * answered) / Math.max(circle, 1)}
                  transform="rotate(-90 23 23)"
                />
              </svg>
              <b>{answered}</b>
            </div>
            <div style={{ flex: 1 }}>
              <p className="t body" style={{ color: 'var(--tx)', fontWeight: 600 }}>
                tonight&rsquo;s cast is out
              </p>
              <p className="s mute">
                {answered} of {circle} answered
              </p>
            </div>
            <div className="notes" style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 20 }}>
              {[8, 16, 12].map((h) => (
                <i key={h} style={{ height: h, width: 5, borderRadius: 3, background: 'var(--gold)' }} />
              ))}
            </div>
          </Link>
        ) : null}
      </div>

      <div className="web">
        {graph.nebs.map((n, i) => (
          <div className="neb" key={i} style={{ left: n.x - 90, top: n.y - 80, width: 180, height: 160, background: n.color }} />
        ))}
        <svg viewBox="0 0 373 470" aria-hidden="true">
          {graph.links.map((l, i) => (
            <path
              key={`l${i}`}
              d={`M${l.a.x} ${l.a.y} Q ${(l.a.x + l.b.x) / 2} ${Math.min(l.a.y, l.b.y) - 30}, ${l.b.x} ${l.b.y}`}
              stroke="rgba(255,255,255,.12)"
              strokeWidth="1"
              strokeDasharray="2 5"
              fill="none"
            />
          ))}
          {graph.met.map((p) => (
            <path
              key={p.id}
              d={`M${CX} ${CY} C ${CX + (p.x - CX) * 0.4} ${CY - 60}, ${p.x} ${p.y + 60}, ${p.x} ${p.y}`}
              stroke="rgba(255,255,255,.18)"
              strokeWidth="1.5"
              fill="none"
            />
          ))}
          {graph.fof.map((p) => (
            <path
              key={p.id}
              d={`M${CX} ${CY} L${p.x} ${p.y}`}
              stroke="rgba(255,255,255,.10)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              fill="none"
            />
          ))}
        </svg>

        {graph.tags.map((t) => (
          <div className="tag lbl" key={t.label} style={{ left: t.x, top: t.y }}>
            {t.label}
          </div>
        ))}

        <div className="node" style={{ left: CX, top: CY }}>
          <Creature traits={me.traits} size={96} glow />
        </div>

        {graph.met.map((p) => (
          <div className="node" key={p.id} style={{ left: p.x, top: p.y }}>
            <Creature traits={p.fam ? p.fam.traits : traitsFor(p.id)} size={44} />
            <span>{p.fam ? p.fam.human.name : '…'}</span>
          </div>
        ))}

        {graph.fof.map((p) => (
          <div className="node faint" key={p.id} style={{ left: p.x, top: p.y }}>
            <Creature traits={p.fam ? p.fam.traits : traitsFor(p.id)} size={32} glow={false} />
            <span>{p.fam ? p.fam.human.name : '…'}</span>
          </div>
        ))}

        {empty ? (
          <p className="s mute" style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center' }}>
            Meet someone and they show up here.
          </p>
        ) : null}
      </div>

      <div className="bottom" style={{ gap: 12 }}>
        <Link className="missing glass" href={withRoom('/familiars/casts?tab=out&go=1', code)} style={{ margin: 0 }}>
          <div className="stack" style={{ display: 'flex' }}>
            <Creature traits={me.traits} size={34} glow={false} />
          </div>
          <b>{state.scout?.cards?.length ? 'This weekend’s plans' : `Send ${me.name} out for the weekend`}</b>
        </Link>
        {missing.length ? (
          <Link className="missing glass" href={withRoom('/familiars/missed', code)} style={{ margin: 0 }}>
            <div className="stack" style={{ display: 'flex' }}>
              {missing.slice(0, 3).map((m) => (
                <Creature key={m.id} traits={state.familiars[m.id]?.traits ?? traitsFor(m.id)} size={34} glow={false} />
              ))}
            </div>
            <b>{missing.length} you keep missing</b>
          </Link>
        ) : null}
        <button
          className="cta glow gold"
          type="button"
          onClick={() => {
            const C = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<unknown> } }).DeviceMotionEvent;
            const go = () => router.push(withRoom('/familiars/meet', code));
            if (C && typeof C.requestPermission === 'function') C.requestPermission().then(go, go);
            else go();
          }}
        >
          Cast {me.name}
        </button>
      </div>

      <Tabs active="web" code={code} me={me} />
    </div>
  );
}
