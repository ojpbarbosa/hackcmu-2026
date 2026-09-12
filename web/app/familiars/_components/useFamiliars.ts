'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMember } from '@/hooks/useMember';
import { useRoom } from '@/hooks/useRoom';
import type { Familiar, FamState } from '@/lib/apps/familiars';
import type { Member, ObserveEvent } from '@/lib/types';

export const DEFAULT_ROOM = 'HACKCMU';

/** Keep the room code on every link so a QR-scanned code survives navigation. */
export function withRoom(path: string, code: string | null): string {
  return code ? `${path}${path.includes('?') ? '&' : '?'}room=${encodeURIComponent(code)}` : path;
}

export type FamiliarsRoom = {
  code: string | null;
  member: Member | null;
  setName: (n: string) => void;
  setSeat: (s: string) => void;
  state: FamState | null;
  members: Member[];
  me: Familiar | null;
  act: (name: string, payload?: unknown) => Promise<void>;
  serverNow: () => number;
  connected: boolean;
  events: ObserveEvent[];
  /** the search params this page was opened with, once the client has them */
  params: URLSearchParams;
};

/** One room, one identity, one familiar. Every familiars screen starts here. */
export function useFamiliars(): FamiliarsRoom {
  const [code, setCode] = useState<string | null>(null);
  const [params, setParams] = useState<URLSearchParams>(() => new URLSearchParams());
  const { member, setName, setSeat } = useMember('familiars');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setParams(p);
    setCode((p.get('room') ?? DEFAULT_ROOM).toUpperCase());
  }, []);

  const room = useRoom<FamState>('familiars', code, member);
  const { state } = room;

  const me = useMemo(
    () => (member && state ? (state.familiars[member.id] ?? null) : null),
    [member, state],
  );

  return {
    code,
    member,
    setName,
    setSeat,
    state,
    members: room.members,
    me,
    // useRoom's act is already stable; wrapping it would re-fire every effect
    // that depends on it on every render
    act: room.act,
    serverNow: room.serverNow,
    connected: room.connected,
    events: room.events,
    params,
  };
}

/** The model that actually answered a task, for the "written by" line. Never
 *  invented: it reads the observability events the server emitted. */
export function lastModel(events: ObserveEvent[], task: string): { model: string; fallback: boolean } | null {
  const hit = [...events].reverse().find((e) => e.task === task);
  return hit ? { model: hit.model, fallback: !!hit.fallback } : null;
}
