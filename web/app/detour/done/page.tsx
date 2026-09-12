'use client';
import { useCallback, useMemo, useState } from 'react';
import { Screen, Pill, CTA, H2, Label, Icon, Stat } from '@/ui';
import type { LatLng } from '@/lib/detour/geo';
import { FogMap } from '../_components/FogMap';
import { useDetour, useQuery, saveVisited } from '../_components/useDetour';

const clock = (t: number) =>
  new Date(t)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .replace(/\s?[AP]M$/i, '');

export default function DetourDone() {
  const { walk: mine, state, href } = useDetour();
  const { demo } = useQuery();
  const [saved, setSaved] = useState(false);

  const walk = mine ?? (state?.focus ? (state.walks[state.focus] ?? null) : null);

  const route: LatLng[] = useMemo(
    () => (walk ? walk.walk.legs.flatMap((l) => l.path as LatLng[]) : []),
    [walk],
  );
  const places = useMemo(() => (walk ? walk.walk.legs.map((l) => l.poi).filter(Boolean) : []), [walk]);
  const fit = useMemo(() => (route.length > 1 ? route : null), [route]);

  const save = useCallback(() => {
    if (!walk) return;
    saveVisited(places.map((p) => p!.id));
    setSaved(true);
  }, [places, walk]);

  if (!walk) {
    return (
      <Screen app="det">
        <div className="pad col" style={{ gap: 14, marginTop: 80 }}>
          <Label>detour</Label>
          <H2>no walk to show yet.</H2>
          <CTA variant="grad" href={href('/detour', demo ? { demo: '1' } : undefined)}>
            Set out
          </CTA>
        </div>
      </Screen>
    );
  }

  const meters = walk.walk.legs.reduce((s, l) => s + l.meters, 0);
  const km = Math.round(meters / 100) / 10;
  const arrived = walk.endedAt ?? walk.startedAt + walk.walk.totalSeconds * 1000;
  const title = walk.story?.title ?? `you passed ${places.length} places you had never seen.`;

  return (
    <Screen app="det">
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <FogMap
          className="revealmap"
          center={[walk.endpoint.lat, walk.endpoint.lng]}
          zoom={15.4}
          route={route}
          pois={places.map((p) => ({ lat: p!.lat, lng: p!.lng, name: p!.name }))}
          endpoint={{ lat: walk.endpoint.lat, lng: walk.endpoint.lng }}
          position={walk.walk.start as LatLng}
          showMarker={false}
          attribution
          fit={fit}
        />

        <div className="hud">
          <Pill variant="ink" icon="check">
            {walk.endpoint.name.split(' ')[0]} · {clock(arrived)}
          </Pill>
          <span
            className="icon-btn"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: '#fff',
              boxShadow: 'var(--sh-pill)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="share" />
          </span>
        </div>

        <div className="arrival">
          <H2>{title}</H2>
          {walk.story?.line ? (
            <p className="bsm" style={{ marginTop: 6 }}>
              {walk.story.line}
            </p>
          ) : null}
          <div className="stats">
            <Stat value={`${km} km`} label="walked" />
            <Stat value={places.length} label="new to you" accent />
            <Stat value={`${walk.phoneLooks}×`} label="looked at phone" />
          </div>
          {/* three real place names plus "+N" overflow a 393 px row and the last
              one gets cut mid-word, so let the row wrap instead of clipping */}
          <div className="places" style={{ flexWrap: 'wrap', rowGap: 8 }}>
            {places.slice(0, 3).map((p) => (
              <span className="pl" key={p!.id}>
                <i>
                  <Icon name="pin" size={14} className="xs" />
                </i>
                {p!.name}
              </span>
            ))}
            {places.length > 3 ? (
              <span className="pl">
                <i>
                  <Icon name="plus" size={14} className="xs" />
                </i>
                +{places.length - 3}
              </span>
            ) : null}
          </div>
          <div style={{ marginTop: 14 }}>
            <CTA variant={saved ? 'ghost' : 'grad'} onClick={saved ? undefined : save}>
              {saved ? 'Saved — these will not come up again' : 'Save the walk'}
            </CTA>
          </div>
          <div style={{ marginTop: 8 }}>
            <CTA variant="ghost" href={href('/detour', demo ? { demo: '1' } : undefined)}>
              Walk somewhere else
            </CTA>
          </div>
        </div>
      </div>
    </Screen>
  );
}
