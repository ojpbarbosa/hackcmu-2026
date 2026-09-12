'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { bearing, haversine, lerpLatLng, type LatLng } from '@/lib/detour/geo';

export const BASE_SPEED = 1.4; // m/s

export type WalkerLeg = { path: LatLng[] };

export type Walker = {
  /** throttled for React: ~8 updates a second */
  pos: LatLng | null;
  /** live, updated every animation frame — read it from a canvas, not from render */
  posRef: React.RefObject<LatLng | null>;
  heading: number;
  legIndex: number;
  arrived: boolean;
  source: 'demo' | 'gps' | 'idle';
  walkedM: number;
  totalM: number;
};

type Sample = { p: LatLng; d: number; leg: number };

function flatten(legs: WalkerLeg[]): Sample[] {
  const out: Sample[] = [];
  let d = 0;
  legs.forEach((leg, li) => {
    leg.path.forEach((p, i) => {
      if (i > 0) d += haversine(leg.path[i - 1], p);
      else if (out.length) d += haversine(out[out.length - 1].p, p);
      out.push({ p, d, leg: li });
    });
  });
  return out;
}

function at(samples: Sample[], d: number): { p: LatLng; leg: number; heading: number } {
  if (!samples.length) return { p: [0, 0], leg: 0, heading: 0 };
  if (d <= 0) return { p: samples[0].p, leg: 0, heading: samples.length > 1 ? bearing(samples[0].p, samples[1].p) : 0 };
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].d <= d) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = b.d - a.d;
  const t = span > 0 ? Math.min(1, Math.max(0, (d - a.d) / span)) : 1;
  return { p: lerpLatLng(a.p, b.p, t), leg: t > 0.999 ? b.leg : a.leg, heading: bearing(a.p, b.p) };
}

/** Where the walker is: the demo replay, or the phone's own GPS. */
export function useWalker(opts: {
  legs: WalkerLeg[];
  demo: boolean;
  speed?: number;
  active: boolean;
  startedAt?: number;
  onTick?: (s: { pos: LatLng; heading: number; legIndex: number; arrived: boolean }) => void;
}): Walker {
  const { legs, demo, speed = 20, active, onTick } = opts;
  const samples = useMemo(() => flatten(legs), [legs]);
  const totalM = samples.length ? samples[samples.length - 1].d : 0;

  const posRef = useRef<LatLng | null>(samples.length ? samples[0].p : null);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  const [state, setState] = useState<{ pos: LatLng | null; heading: number; legIndex: number; arrived: boolean; walkedM: number }>(
    { pos: samples.length ? samples[0].p : null, heading: 0, legIndex: 0, arrived: false, walkedM: 0 },
  );

  // demo replay: walk the planned route at 1.4 m/s × speed
  useEffect(() => {
    if (!demo || !active || !samples.length) return;
    let raf = 0;
    let lastPush = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const walked = Math.min(totalM, ((now - t0) / 1000) * BASE_SPEED * speed);
      const hit = at(samples, walked);
      posRef.current = hit.p;
      const arrived = walked >= totalM - 0.5;
      if (now - lastPush > 120 || arrived) {
        lastPush = now;
        setState({ pos: hit.p, heading: hit.heading, legIndex: hit.leg, arrived, walkedM: walked });
        tickRef.current?.({ pos: hit.p, heading: hit.heading, legIndex: hit.leg, arrived });
      }
      if (!arrived) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [demo, active, samples, speed, totalM]);

  // the real thing
  useEffect(() => {
    if (demo || !active || typeof navigator === 'undefined' || !navigator.geolocation) return;
    let last: LatLng | null = null;
    let walked = 0;
    const id = navigator.geolocation.watchPosition(
      (g) => {
        const p: LatLng = [g.coords.latitude, g.coords.longitude];
        if (last) walked += haversine(last, p);
        const head = typeof g.coords.heading === 'number' && !Number.isNaN(g.coords.heading)
          ? g.coords.heading
          : last
            ? bearing(last, p)
            : 0;
        last = p;
        posRef.current = p;
        // which leg are we on: the first whose end we have not reached yet
        let legIndex = 0;
        for (let i = 0; i < legs.length; i++) {
          const end = legs[i].path[legs[i].path.length - 1];
          legIndex = i;
          if (end && haversine(p, end) > 30) break;
        }
        const endAll = samples.length ? samples[samples.length - 1].p : null;
        const arrived = !!endAll && haversine(p, endAll) < 30;
        setState({ pos: p, heading: head, legIndex, arrived, walkedM: walked });
        tickRef.current?.({ pos: p, heading: head, legIndex, arrived });
      },
      () => {
        /* denied: the demo replay is the fallback */
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [demo, active, legs, samples]);

  return {
    pos: state.pos,
    posRef,
    heading: state.heading,
    legIndex: state.legIndex,
    arrived: state.arrived,
    source: !active ? 'idle' : demo ? 'demo' : 'gps',
    walkedM: state.walkedM,
    totalM,
  };
}
