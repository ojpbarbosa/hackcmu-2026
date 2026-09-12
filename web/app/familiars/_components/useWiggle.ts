'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Perm = 'granted' | 'denied' | 'prompt';

type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> };

function ctor(): MotionCtor | null {
  if (typeof window === 'undefined') return null;
  const C = (window as unknown as { DeviceMotionEvent?: MotionCtor }).DeviceMotionEvent;
  return C ?? null;
}

/** A shake of the phone. iOS only hands out motion if `requestPermission()` is called
 *  inside the tap, so `request()` must be wired straight to a button. */
export function useWiggle({
  enabled,
  onSpike,
  threshold = 9,
}: {
  enabled: boolean;
  onSpike: () => void;
  threshold?: number;
}): {
  armed: boolean;
  permission: Perm;
  request: () => Promise<void>;
  available: boolean;
  /** 0..1+, how hard the phone is moving right now (1 = threshold) */
  level: number;
} {
  const [permission, setPermission] = useState<Perm>('prompt');
  const [available, setAvailable] = useState(false);
  const [level, setLevel] = useState(0);
  const lastRef = useRef(0);
  const onSpikeRef = useRef(onSpike);
  onSpikeRef.current = onSpike;

  useEffect(() => {
    setAvailable(!!ctor());
  }, []);

  const request = useCallback(async () => {
    const C = ctor();
    if (!C) {
      setPermission('denied');
      return;
    }
    if (typeof C.requestPermission === 'function') {
      try {
        const res = await C.requestPermission();
        setPermission(res === 'granted' ? 'granted' : 'denied');
      } catch {
        setPermission('denied');
      }
      return;
    }
    setPermission('granted');
  }, []);

  const armed = enabled && available && permission === 'granted';

  useEffect(() => {
    if (!armed) return;
    const onMotion = (e: DeviceMotionEvent) => {
      // the MVP math that worked on the venue floor: gravity-inclusive magnitude minus g,
      // and the linear reading when the device gives one; whichever is larger
      const a = e.acceleration;
      const g = e.accelerationIncludingGravity;
      const lin = a ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : 0;
      const grav = g ? Math.abs(Math.hypot(g.x ?? 0, g.y ?? 0, g.z ?? 0) - 9.81) : 0;
      const mag = Math.max(lin, grav);
      setLevel((prev) => Math.max(mag / threshold, prev * 0.85));
      if (mag <= threshold) return;
      const now = Date.now();
      if (now - lastRef.current < 1500) return;
      lastRef.current = now;
      onSpikeRef.current();
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [armed, threshold]);

  return { armed, permission, request, available, level };
}
