'use client';
import { useEffect, useRef } from 'react';
import type { LatLng } from '@/lib/detour/geo';

/** Ease a marker between position reports that arrive a second or two apart. */
export function useSmoothed(target: LatLng | null, rate = 0.08): React.RefObject<LatLng | null> {
  const ref = useRef<LatLng | null>(target);
  const goal = useRef<LatLng | null>(target);
  goal.current = target;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const g = goal.current;
      if (g) {
        const cur = ref.current;
        ref.current = cur ? [cur[0] + (g[0] - cur[0]) * rate, cur[1] + (g[1] - cur[1]) * rate] : g;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rate]);
  return ref;
}
