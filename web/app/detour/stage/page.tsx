'use client';
import { useEffect, useMemo, useRef } from 'react';
import { StagePage, ModelLadder, H3, Body, Label, Pill } from '@/ui';
import type { LatLng } from '@/lib/detour/geo';
import { FogMap } from '../_components/FogMap';
import { useDetour } from '../_components/useDetour';

const STAGE_PADDING = { top: 64, bottom: 64, left: 72, right: 72 };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** Ease the projector's marker between the phone's position reports. */
function useSmoothed(target: LatLng | null) {
  const ref = useRef<LatLng | null>(target);
  const goal = useRef<LatLng | null>(target);
  goal.current = target;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const g = goal.current;
      if (g) {
        const cur = ref.current;
        ref.current = cur ? [cur[0] + (g[0] - cur[0]) * 0.08, cur[1] + (g[1] - cur[1]) * 0.08] : g;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ref;
}

export default function DetourStage() {
  const { state, code, events, members } = useDetour();

  const walk = state?.focus ? (state.walks[state.focus] ?? null) : (Object.values(state?.walks ?? {})[0] ?? null);

  // the doc arrives again every poll; the camera must only re-fit for a new walk
  const walkId = walk?.id ?? null;
  const walkRef = useRef(walk);
  walkRef.current = walk;
  const route = useMemo(
    () => walkRef.current?.walk.legs.flatMap((l) => l.path as LatLng[]) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one walk, one route
    [walkId],
  );
  const fit = useMemo(() => (route.length > 1 ? route : null), [route]);
  const pos = useSmoothed(walk ? [walk.progress.lat, walk.progress.lng] : null);

  const pois = useMemo(() => {
    if (!walk) return [];
    let t = 0;
    return walk.walk.legs
      .map((l) => {
        t += l.seconds;
        return l.poi ? { lat: l.poi.lat, lng: l.poi.lng, name: l.poi.name, label: `${l.poi.name} · ${mmss(t)}` } : null;
      })
      .filter(Boolean) as { lat: number; lng: number; name: string; label: string }[];
  }, [walk]);

  const candidates = useMemo(
    () => (walk ? walk.walk.candidates.filter((c) => !c.chosen).map((c) => ({ lat: c.poi.lat, lng: c.poi.lng })) : []),
    [walk],
  );

  const legIndex = walk?.progress.legIndex ?? 0;

  return (
    <div className="app-det">
      <StagePage
        side={
          <>
            <Label>
              detour · {code ?? 'no room'} · {members.length} {members.length === 1 ? 'phone' : 'phones'}
            </Label>
            <H3>the map the walker never sees</H3>

            <Label>solver</Label>
            <Body>
              {walk
                ? `Orienteering over ${walk.solver.consideredPois} candidate corners; maximise places never visited under ${walk.budgetMin} min; endpoint fixed at ${walk.endpoint.name}.`
                : 'Waiting for a phone to set out.'}
            </Body>
            {walk ? (
              <div className="row2" style={{ flexWrap: 'wrap', gap: 6 }}>
                <Pill variant="soft">{walk.solver.chosenPois} chosen</Pill>
                <Pill variant="soft">novelty {walk.solver.novelty}</Pill>
                <Pill variant="soft">slack {walk.solver.slackSeconds}s</Pill>
                <Pill variant="soft">solved in {walk.solver.solveMs}ms</Pill>
              </div>
            ) : null}

            <Label>nudges</Label>
            <div className="col" style={{ gap: 6 }}>
              {(walk?.nudges ?? []).map((n, i) => (
                <p
                  key={`${i}-${n}`}
                  className="bsm"
                  style={{
                    color: i === legIndex ? '#FF8A6B' : i < legIndex ? '#6A6A88' : '#B0B0CC',
                    fontWeight: i === legIndex ? 600 : 400,
                  }}
                >
                  {i + 1}. {n}
                </p>
              ))}
              {!walk ? <Body>Written before the walker leaves, one per corner.</Body> : null}
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
            <Label>{walk ? `${walk.memberName} · ${walk.budgetMin} min · ${walk.mood}` : 'detour'}</Label>
            <H3>
              {walk
                ? `${walk.solver.chosenPois} places the walker has never stood in`
                : 'open /detour on a phone to start a walk'}
            </H3>
          </div>
          <div className="row2" style={{ gap: 8 }}>
            <Pill variant="soft">
              leg {Math.min(legIndex + 1, walk?.walk.legs.length ?? 1)} of {walk?.walk.legs.length ?? 0}
            </Pill>
            <Pill variant="soft">{walk?.endedAt ? 'arrived' : 'walking'}</Pill>
          </div>
        </div>

        <div className="board" style={{ position: 'relative', flex: 1, minHeight: 420, borderRadius: 18, overflow: 'hidden' }}>
          <FogMap
            center={walk ? [walk.endpoint.lat, walk.endpoint.lng] : [40.4433, -79.9436]}
            zoom={15}
            dark
            attribution
            route={route}
            pois={pois}
            candidates={candidates}
            endpoint={walk ? { lat: walk.endpoint.lat, lng: walk.endpoint.lng, label: walk.endpoint.name } : null}
            posRef={pos}
            position={walk ? [walk.progress.lat, walk.progress.lng] : null}
            heading={walk?.progress.heading ?? 0}
            showMarker={!!walk}
            fit={fit}
            fitPadding={STAGE_PADDING}
          />
        </div>
      </StagePage>
    </div>
  );
}
