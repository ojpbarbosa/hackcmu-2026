'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StagePage, ModelLadder, Pill, H2, H3, Body, Label } from '@/ui';
import { useRoom } from '@/hooks/useRoom';
import { matchScore, type FamState } from '@/lib/apps/familiars';
import { Village, type VillageLink, type VillageNode } from '../_components/Village';
import { DEFAULT_ROOM } from '../_components/useFamiliars';

const GREY = '#4B5563';

export default function FamiliarsStage() {
  const [code, setCode] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const seeded = useRef(false);
  const { state, events, members } = useRoom<FamState>('familiars', code, null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setCode((p.get('room') ?? DEFAULT_ROOM).toUpperCase());
    setDemo(p.get('demo') === '1');
  }, []);

  // a projector with three dots is not a village: fill it on request
  useEffect(() => {
    if (!demo || !code || seeded.current) return;
    // a room that does not exist yet is the emptiest room of all: seedDemo creates it
    if (state && Object.keys(state.familiars).length >= 20) return;
    seeded.current = true;
    fetch(`/api/rooms/familiars/${code}/act`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'seedDemo', payload: { n: 40 }, memberId: 'stage' }),
    }).catch(() => {
      seeded.current = false;
    });
  }, [demo, code, state]);

  // stable identities: the force layout restarts whenever these arrays change
  const familiars = useMemo(() => Object.values(state?.familiars ?? {}), [state]);
  const bumps = useMemo(() => state?.bumps ?? [], [state]);
  const clusters = useMemo(() => state?.clusters ?? [], [state]);

  const bumpCount = useMemo(() => {
    const n = new Map<string, number>();
    for (const b of bumps) {
      n.set(b.a, (n.get(b.a) ?? 0) + 1);
      n.set(b.b, (n.get(b.b) ?? 0) + 1);
    }
    return n;
  }, [bumps]);

  const nodes: VillageNode[] = useMemo(
    () =>
      familiars.map((f) => {
        const met = bumpCount.get(f.id) ?? 0;
        return {
          id: f.id,
          name: f.name,
          color: met ? (clusters.find((c) => c.id === f.clusterId)?.color ?? GREY) : GREY,
          r: Math.min(14, 5 + met * 1.6),
          lonely: met === 0,
        };
      }),
    [familiars, clusters, bumpCount],
  );

  const links: VillageLink[] = useMemo(() => bumps.map((b) => ({ source: b.a, target: b.b })), [bumps]);

  // the two freshest meetings get named on the projector
  const highlights = useMemo(() => {
    const last = bumps.slice(-2);
    return last.flatMap((b) => {
      const a = state?.familiars[b.a];
      const c = state?.familiars[b.b];
      if (!a || !c) return [];
      const pct = Math.round(matchScore(a, c) * 100);
      return [{ id: a.id, text: `${a.name} ↔ ${c.name}${pct > 0 ? ` · ${pct}%` : ''}`, ring: [a.id, c.id] }];
    });
  }, [bumps, state]);

  const rings = useMemo(() => new Set(highlights.flatMap((h) => h.ring)), [highlights]);

  const lonely = nodes.filter((n) => n.lonely).length;
  const biggest = [...clusters].sort((a, b) => b.members.length - a.members.length)[0];

  return (
    <div className="app-fam">
      <StagePage
        side={
          <>
            <Label>
              HackCMU · Tepper · {code ?? '…'}
            </Label>
            <H3>
              {familiars.length} familiars, {bumps.length} bumps
            </H3>
            <Body>
              {clusters.length} clusters. {biggest ? `The ${biggest.label} cluster is loudest.` : 'The room is still forming.'}{' '}
              {lonely} {lonely === 1 ? 'familiar has' : 'familiars have'} never bumped.
            </Body>
            <div className="legend">
              {clusters.map((c) => (
                <div key={c.id}>
                  <i style={{ background: c.color }} />
                  {c.label} · {c.members.length}
                </div>
              ))}
              <div>
                <i style={{ background: GREY }} />
                never bumped
              </div>
            </div>
            <div className="foot">
              <Label>models</Label>
              <ModelLadder events={events} />
            </div>
          </>
        }
      >
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <Label>the stage</Label>
            <H2>the village, live all night</H2>
          </div>
          <Pill variant="soft">
            {members.length} phones · {events.length} model calls
          </Pill>
        </div>
        <div className="graph" style={{ flex: 1, minHeight: 460, position: 'relative' }}>
          <Village nodes={nodes} links={links} highlights={highlights} rings={rings} />
        </div>
      </StagePage>
    </div>
  );
}
