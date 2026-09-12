'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppName, Member, ObserveEvent, RoomDoc } from '@/lib/types';
import { noteServerNow, serverNow } from './useServerClock';

const POLL_VISIBLE = 350;
const POLL_HIDDEN = 1200;
const EVENTS_MS = 5000;

/** The one realtime primitive. Joins on mount, polls the room with ?v= so an
 *  unchanged room costs a 304, and applies the server's echo of every act. */
export function useRoom<S>(
  app: AppName,
  code: string | null,
  member: Member | null,
  opts?: { intervalMs?: number },
): {
  doc: RoomDoc<S> | null;
  state: S | null;
  members: Member[];
  act: (name: string, payload?: unknown) => Promise<void>;
  serverNow: () => number;
  connected: boolean;
  events: ObserveEvent[];
} {
  const [doc, setDoc] = useState<RoomDoc<S> | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<ObserveEvent[]>([]);
  const version = useRef(0);
  const base = code ? `/api/rooms/${app}/${encodeURIComponent(code)}` : null;

  const apply = useCallback((next: RoomDoc<S> | null, sNow?: number) => {
    noteServerNow(sNow);
    if (!next) return;
    if (next.version >= version.current) {
      version.current = next.version;
      setDoc(next);
    }
  }, []);

  const act = useCallback(
    async (name: string, payload?: unknown) => {
      if (!base || !member) return;
      const res = await fetch(`${base}/act`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, payload, memberId: member.id }),
      });
      if (!res.ok) {
        setConnected(false);
        return;
      }
      const body = (await res.json()) as { doc: RoomDoc<S>; serverNow: number };
      setConnected(true);
      apply(body.doc, body.serverNow);
    },
    [base, member, apply],
  );

  // join on mount (and whenever the identity or the room changes)
  useEffect(() => {
    if (!base || !member) return;
    let alive = true;
    (async () => {
      const res = await fetch(`${base}/act`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'join',
          payload: { id: member.id, name: member.name, tone: member.tone, seat: member.seat },
          memberId: member.id,
        }),
      });
      if (!alive || !res.ok) return;
      const body = (await res.json()) as { doc: RoomDoc<S>; serverNow: number };
      setConnected(true);
      apply(body.doc, body.serverNow);
    })().catch(() => setConnected(false));
    return () => {
      alive = false;
    };
  }, [base, member, apply]);

  // poll state
  useEffect(() => {
    if (!base) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`${base}?v=${version.current}`, { cache: 'no-store' });
        if (res.status === 304) {
          noteServerNow(Number(res.headers.get('x-server-now')));
          setConnected(true);
        } else if (res.ok) {
          const body = (await res.json()) as { doc: RoomDoc<S>; serverNow: number };
          setConnected(true);
          apply(body.doc, body.serverNow);
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      }
      if (!alive) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      timer = setTimeout(tick, opts?.intervalMs ?? (hidden ? POLL_HIDDEN : POLL_VISIBLE));
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [base, apply, opts?.intervalMs]);

  // poll the model ladder
  useEffect(() => {
    if (!base) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`${base}/events`, { cache: 'no-store' });
        if (res.ok) setEvents((await res.json()) as ObserveEvent[]);
      } catch {
        /* the ladder is best effort */
      }
      if (!alive) return;
      timer = setTimeout(tick, EVENTS_MS);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [base]);

  return {
    doc,
    state: (doc?.state as S) ?? null,
    members: doc ? Object.values(doc.members) : [],
    act,
    serverNow,
    connected,
    events,
  };
}
