'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** A firm phone-to-phone tap peaks well past this; walking with the phone in a
 *  hand sits under 8 m/s². Tuned on the venue floor, not in a spreadsheet. */
export const SPIKE_THRESHOLD = 14;
const GRAVITY = 9.81;
const REARM_MS = 1500;
const POLL_MS = 300;
const MATCH_WINDOW_MS = 6000;
const LISTEN_MS = 30000;

export type BumpPhase = 'idle' | 'blocked' | 'sensing' | 'waiting' | 'none';

/** iOS hides the prompt entirely when Settings > Safari > Motion & Orientation
 *  Access is off, so say where to look rather than just failing. */
const MOTION_DENIED =
  'motion is off for this site. Settings > Safari > Motion & Orientation Access, or key their address instead.';

type MotionEventCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState | string> };

export function motionNeedsPermission(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window.DeviceMotionEvent as MotionEventCtor | undefined)?.requestPermission === 'function'
  );
}

export type BumpHook = {
  phase: BumpPhase;
  /** 0..1+, how hard the phone is being moved right now */
  level: number;
  peak: number;
  error: string | null;
  start: () => void;
  stop: () => void;
};

/** Arms DeviceMotion (asking iOS for permission inside the tap), watches for a
 *  spike, posts it to /api/bump and polls for the other phone. */
export function useBumpSensor({
  app = 'familiars',
  code,
  memberId,
  serverNow,
  simulate,
  onMatched,
}: {
  app?: string;
  code: string | null;
  memberId: string | null;
  serverNow: () => number;
  simulate?: boolean;
  onMatched: (m: { pairId: string; withMemberId: string }) => void;
}): BumpHook {
  const [phase, setPhase] = useState<BumpPhase>('idle');
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const listening = useRef(false);
  const lastSpike = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const handler = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const matchedRef = useRef(onMatched);

  useEffect(() => {
    matchedRef.current = onMatched;
  }, [onMatched]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  const detach = useCallback(() => {
    if (handler.current) window.removeEventListener('devicemotion', handler.current);
    handler.current = null;
    listening.current = false;
  }, []);

  const stop = useCallback(() => {
    detach();
    clearTimers();
    setLevel(0);
    setPhase('idle');
  }, [detach, clearTimers]);

  useEffect(() => () => {
    detach();
    clearTimers();
  }, [detach, clearTimers]);

  /** Send the spike and wait up to six seconds for the other phone to land. */
  const send = useCallback(
    async (magnitude: number) => {
      if (!code || !memberId) return;
      setPhase('waiting');
      setPeak(magnitude);
      try {
        const res = await fetch('/api/bump', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ app, code, memberId, at: serverNow(), magnitude }),
        });
        const body = (await res.json()) as { bumpId?: string; matched?: { pairId: string; withMemberId: string } };
        if (body.matched) {
          detach();
          matchedRef.current(body.matched);
          return;
        }
        if (!body.bumpId) {
          setPhase('none');
          return;
        }
        const bumpId = body.bumpId;
        const started = Date.now();
        const poll = async () => {
          try {
            const r = await fetch(`/api/bump?bumpId=${encodeURIComponent(bumpId)}`, { cache: 'no-store' });
            const s = (await r.json()) as { matched?: { pairId: string; withMemberId: string } };
            if (s.matched) {
              detach();
              matchedRef.current(s.matched);
              return;
            }
          } catch {
            /* keep trying while the window is open */
          }
          if (Date.now() - started < MATCH_WINDOW_MS) {
            timers.current.push(setTimeout(poll, POLL_MS));
          } else {
            setPhase(listening.current ? 'sensing' : 'none');
          }
        };
        timers.current.push(setTimeout(poll, POLL_MS));
      } catch {
        setError('the room did not answer. try again.');
        setPhase('none');
      }
    },
    [app, code, memberId, serverNow, detach],
  );

  const attach = useCallback(() => {
    if (listening.current) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const raw = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      const mag = Math.abs(raw - GRAVITY);
      setLevel((prev) => Math.max(mag / SPIKE_THRESHOLD, prev * 0.82));
      if (mag > SPIKE_THRESHOLD && Date.now() - lastSpike.current > REARM_MS) {
        lastSpike.current = Date.now();
        void send(mag);
      }
    };
    handler.current = onMotion;
    listening.current = true;
    window.addEventListener('devicemotion', onMotion);
    setPhase('sensing');
    timers.current.push(
      setTimeout(() => {
        if (listening.current) {
          detach();
          setPhase((p) => (p === 'sensing' ? 'none' : p));
        }
      }, LISTEN_MS),
    );
  }, [send, detach]);

  /** Must run inside the tap handler: iOS only grants motion from a gesture. */
  const start = useCallback(() => {
    setError(null);
    const ctor = window.DeviceMotionEvent as MotionEventCtor | undefined;
    if (simulate) {
      setPhase('sensing');
      let t = 0;
      const tick = () => {
        t += 1;
        setLevel(Math.min(1.15, t / 6));
        if (t < 6) {
          timers.current.push(setTimeout(tick, 120));
        } else {
          setLevel(1.15);
          void send(SPIKE_THRESHOLD + 4.2);
        }
      };
      timers.current.push(setTimeout(tick, 120));
      return;
    }
    if (!ctor) {
      setError('this browser has no motion sensor. key their address instead.');
      setPhase('blocked');
      return;
    }
    if (typeof ctor.requestPermission === 'function') {
      ctor
        .requestPermission()
        .then((res) => {
          if (res === 'granted') attach();
          else {
            setError(MOTION_DENIED);
            setPhase('blocked');
          }
        })
        .catch(() => {
          setError(MOTION_DENIED);
          setPhase('blocked');
        });
      return;
    }
    attach();
  }, [attach, send, simulate]);

  return { phase, level, peak, error, start, stop };
}

/** The live magnitude bar: proof to the human that the phone is listening. */
export function MagnitudeBar({ level }: { level: number }) {
  // the threshold sits at 70% of the bar, so a real spike visibly overshoots it
  const pct = Math.max(2, Math.min(100, Math.round(level * 70)));
  const hot = level >= 1;
  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        background: 'var(--raised)',
        overflow: 'hidden',
        position: 'relative',
      }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="motion"
    >
      <i
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: `${pct}%`,
          borderRadius: 999,
          background: hot ? 'linear-gradient(90deg,#34D399,#059669)' : 'linear-gradient(90deg,#A7F3D0,#34D399)',
          transition: 'width 90ms linear',
        }}
      />
      <i
        style={{
          position: 'absolute',
          left: '70%',
          top: -3,
          width: 2,
          height: 16,
          background: 'var(--ink)',
          borderRadius: 1,
        }}
      />
    </div>
  );
}
