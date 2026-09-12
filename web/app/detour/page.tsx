'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, CTA, H1, Icon, Chip } from '@/ui';
import { MOODS, OAKLAND_BBOX, VENUES, venueByName } from '@/lib/detour/venues';
import { TimeSlider } from './_components/TimeSlider';
import { VenuePicker, type PickerOption } from './_components/VenuePicker';
import { useDetour, useQuery, savedVisited } from './_components/useDetour';

const HERE: PickerOption = {
  id: 'here',
  name: 'where I am',
  lat: VENUES[1].lat,
  lng: VENUES[1].lng,
  hint: 'this phone, or Gates Center if it cannot tell',
};

const inOakland = (lat: number, lng: number) =>
  lat >= OAKLAND_BBOX[0] && lat <= OAKLAND_BBOX[2] && lng >= OAKLAND_BBOX[1] && lng <= OAKLAND_BBOX[3];

function locate(): Promise<[number, number] | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const done = setTimeout(() => resolve(null), 4500);
    navigator.geolocation.getCurrentPosition(
      (g) => {
        clearTimeout(done);
        resolve([g.coords.latitude, g.coords.longitude]);
      },
      () => {
        clearTimeout(done);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 },
    );
  });
}

export default function DetourSetOut() {
  const router = useRouter();
  const { act, code, href, connected } = useDetour();
  const { demo } = useQuery();

  const [budget, setBudget] = useState(45);
  const [endpoint, setEndpoint] = useState<PickerOption>(VENUES[0]);
  const [from, setFrom] = useState<PickerOption>(HERE);
  const [mood, setMood] = useState<string>(MOODS[0]);
  const [busy, setBusy] = useState(false);

  // The clock is client-only: formatting Date.now() during render makes the server
  // HTML disagree with the first paint and React throws a hydration error.
  const [mountedAt, setMountedAt] = useState<number | null>(null);
  useEffect(() => setMountedAt(Date.now()), []);

  const arriveBy = useMemo(() => {
    if (mountedAt === null) return null;
    const t = new Date(mountedAt + budget * 60_000);
    return t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }, [mountedAt, budget]);

  const startWalking = useCallback(async () => {
    if (busy || !code) return;
    setBusy(true);
    try {
      let start: [number, number] = [from.lat, from.lng];
      if (from.id === 'here') {
        const fix = await locate();
        if (fix && inOakland(fix[0], fix[1])) start = fix;
      }
      await act('start', {
        start,
        startVenue: from.id === 'here' ? undefined : from.name,
        endpointName: venueByName(endpoint.name).name,
        budgetMin: budget,
        mood,
        visitedPoiIds: savedVisited(),
      });
      router.push(href('/detour/walk', demo ? { demo: '1' } : undefined));
    } finally {
      setBusy(false);
    }
  }, [act, budget, busy, code, demo, endpoint, from, href, mood, router]);

  return (
    <Screen app="det">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 40px)' }}>
        <TopNav
          left={
            <Pill variant="soft" icon="pin">
              Oakland
            </Pill>
          }
          right={
            <Pill variant="soft" icon={connected ? 'zap' : 'clock'}>
              {code ?? '·····'}
            </Pill>
          }
        />

        <div className="pad setup" style={{ marginTop: 22 }}>
          <div>
            <H1>get lost on purpose.</H1>
            <p className="body" style={{ marginTop: 8 }}>
              A walk with no map. You&apos;ll see the route when it&apos;s over.
            </p>
          </div>

          <TimeSlider value={budget} onChange={setBudget} />

          <VenuePicker
            label="end at"
            icon="flag"
            value={endpoint}
            sub={arriveBy ? `arrive by ${arriveBy}` : 'arrive by …'}
            onChange={setEndpoint}
          />

          <VenuePicker label="start from" icon="compass" value={from} options={[HERE, ...VENUES]} onChange={setFrom} />

          <div className="field">
            <p className="lbl">mood</p>
            <div className="chips">
              {MOODS.map((m) => (
                <Chip key={m} on={m === mood} onClick={() => setMood(m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="bottom">
          <CTA variant="grad" onClick={startWalking} disabled={busy || !code}>
            <Icon name="compass" />
            {busy ? 'writing your nudges…' : 'Start walking'}
          </CTA>
          <p className="bsm" style={{ textAlign: 'center' }}>
            nudges are written before you leave
          </p>
        </div>
      </div>
    </Screen>
  );
}
