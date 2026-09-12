'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, Pill, Sheet, CTA, H2, Label, Icon } from '@/ui';
import { haversine, type LatLng } from '@/lib/detour/geo';
import { FogMap } from '../_components/FogMap';
import { NudgeCard } from '../_components/NudgeCard';
import { useDetour, useQuery } from '../_components/useDetour';
import { useWalker } from '../_components/useWalker';

const clock = (t: number) =>
  new Date(t)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .replace(/\s?[AP]M$/i, '');

export default function DetourWalk() {
  const router = useRouter();
  const { walk: mine, state, act, href, code, member, serverNow } = useDetour();
  const { demo, speed } = useQuery();

  // a phone that has not started a walk still follows the room's walk (the projector demo)
  const walk = mine ?? (state?.focus ? (state.walks[state.focus] ?? null) : null);
  const spectator = !mine && !!walk;

  const [wall, setWall] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [manualIndex, setManualIndex] = useState(0);
  const legSent = useRef(0);
  const moveSent = useRef(0);
  const ending = useRef(false);
  const autoStarted = useRef(false);

  // the room doc arrives again every poll; the replay must not restart with it,
  // so the legs are remembered per walk id
  const walkId = walk?.id ?? null;
  const walkRef = useRef(walk);
  walkRef.current = walk;
  const legs = useMemo(
    () => walkRef.current?.walk.legs.map((l) => ({ path: l.path as LatLng[] })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one walk, one set of legs
    [walkId],
  );
  const active = !!walk && !walk.endedAt;

  const onTick = useCallback(
    (s: { pos: LatLng; heading: number; legIndex: number; arrived: boolean }) => {
      if (!walk || spectator) return;
      const now = Date.now();
      if (s.legIndex > legSent.current) {
        legSent.current = s.legIndex;
        void act('advance', { legIndex: s.legIndex });
      }
      if (now - moveSent.current > 1500) {
        moveSent.current = now;
        void act('move', { lat: s.pos[0], lng: s.pos[1], heading: s.heading, legIndex: s.legIndex });
      }
      if (s.arrived && !ending.current) {
        ending.current = true;
        void act('end').then(() => router.push(href('/detour/done', demo ? { demo: '1' } : undefined)));
      }
    },
    [act, demo, href, router, spectator, walk],
  );

  const walker = useWalker({ legs, demo, speed, active, onTick });

  // the demo can start cold: /detour/walk?demo=1 plans a walk if the room has none
  useEffect(() => {
    if (!demo || walk || !code || !member || autoStarted.current) return;
    autoStarted.current = true;
    void act('start', { startVenue: 'Gates Center', endpointName: 'Tepper School', budgetMin: 45, mood: 'somewhere new' });
  }, [act, code, demo, member, walk]);

  // every time the phone comes back into view, that is a look; so is opening the walk
  useEffect(() => {
    if (!walkId || spectator) return;
    void act('look');
    const onVis = () => {
      if (!document.hidden) void act('look');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [act, spectator, walkId]);

  const legIndex = Math.min(
    Math.max(walker.legIndex, manualIndex, walk?.progress.legIndex ?? 0),
    Math.max(0, legs.length - 1),
  );
  const nudge = walk?.nudges[legIndex] ?? 'keep going until something changes';

  const endOfLeg = legs[legIndex]?.path.slice(-1)[0] ?? null;
  const ready = demo || (!!walker.pos && !!endOfLeg && haversine(walker.pos, endOfLeg) < 30);

  const gotIt = useCallback(() => {
    const next = Math.min(legIndex + 1, Math.max(0, legs.length - 1));
    setManualIndex(next);
    if (spectator) return;
    void act('advance', { legIndex: next });
    void act('look');
  }, [act, legIndex, legs.length, spectator]);

  const hide = useCallback(() => {
    setHidden(true);
    setTimeout(() => setHidden(false), 5000);
  }, []);

  const endEarly = useCallback(() => {
    setWall(false);
    if (spectator) return router.push(href('/detour/done', demo ? { demo: '1' } : undefined));
    ending.current = true;
    void act('end').then(() => router.push(href('/detour/done', demo ? { demo: '1' } : undefined)));
  }, [act, demo, href, router, spectator]);

  const arriveBy = walk ? walk.startedAt + walk.budgetMin * 60_000 : 0;
  // the replay compresses the walk, so the clock has to run at the replay's pace
  const elapsedSec = walk ? (demo ? walker.walkedM / 1.4 : (serverNow() - walk.startedAt) / 1000) : 0;
  const minutesLeft = walk ? Math.max(0, Math.ceil((walk.budgetMin * 60 - elapsedSec) / 60)) : 0;
  const start: LatLng = walk ? [walk.walk.start[0], walk.walk.start[1]] : [40.4433, -79.9436];

  if (!walk) {
    return (
      <Screen app="det">
        <div className="pad col" style={{ gap: 14, marginTop: 80 }}>
          <Label>detour</Label>
          <H2>no walk in progress.</H2>
          <p className="body">Set a time, an endpoint and a mood first — the nudges are written before you leave.</p>
          <CTA variant="grad" href={href('/detour', demo ? { demo: '1' } : undefined)}>
            Set out
          </CTA>
        </div>
      </Screen>
    );
  }

  return (
    <Screen app="det">
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <FogMap
          center={start}
          zoom={16.8}
          follow
          fog
          radiusM={100}
          posRef={walker.posRef}
          position={walker.pos ?? start}
          heading={walker.heading}
          onTap={() => setWall(true)}
        />

        <div className="hud">
          <Pill icon="clock">
            <span style={{ color: 'var(--acc)' }}>{minutesLeft}</span> min left
          </Pill>
          <Pill icon="flag">
            {walk.endpoint.name.split(' ')[0]} · {clock(arriveBy)}
          </Pill>
        </div>

        {hidden ? null : (
          <NudgeCard
            index={legIndex}
            total={legs.length}
            text={nudge}
            ready={ready}
            onGotIt={gotIt}
            onHide={hide}
          />
        )}

        <Sheet open={wall} onClose={() => setWall(false)}>
          <div className="wallsheet">
            <Label>you tapped the map</Label>
            <H2>the route stays hidden.</H2>
            <p className="body" style={{ marginTop: 8 }}>
              That&apos;s the whole point. You&apos;ll be at {walk.endpoint.name} by {clock(arriveBy)}, and you&apos;ll
              see everything you walked once you&apos;re there.
            </p>
            <div
              className="card"
              style={{
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--raised)',
                boxShadow: 'none',
              }}
            >
              <span style={{ color: 'var(--acc)', display: 'flex' }}>
                <Icon name="zap" />
              </span>
              <p className="bsm" style={{ color: 'var(--t2)' }}>
                {walk.walk.legs.filter((l) => l.poi).length} places on this walk you have never stood in. The last
                nudge arrives before the clock does.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <CTA onClick={() => setWall(false)}>Keep walking</CTA>
              </div>
              <div style={{ flex: 1 }}>
                <CTA variant="ghost" onClick={endEarly}>
                  End early
                </CTA>
              </div>
            </div>
          </div>
        </Sheet>

        {spectator ? (
          <div style={{ position: 'absolute', left: 16, bottom: 250 }}>
            <Pill variant="soft">following {walk.memberName}</Pill>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
