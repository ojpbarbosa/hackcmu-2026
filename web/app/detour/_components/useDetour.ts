'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMember } from '@/hooks/useMember';
import { useRoom } from '@/hooks/useRoom';
import type { DetourState, DetourWalk } from '@/lib/apps/detour';

const ROOM_KEY = 'detour.room';
const VISITED_KEY = 'detour.visited';

export type Query = { room: string | null; demo: boolean; speed: number };

/** Read the query string once, on the client. (useSearchParams would force a
 *  Suspense boundary on every page; these screens are client-rendered anyway.) */
export function useQuery(): Query {
  const [q, setQ] = useState<Query>({ room: null, demo: false, speed: 20 });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ({
      room: p.get('room')?.toUpperCase() ?? null,
      demo: p.get('demo') === '1',
      speed: Math.max(1, Number(p.get('speed') ?? 20) || 20),
    });
  }, []);
  return q;
}

export function savedVisited(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(VISITED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function saveVisited(ids: string[]): void {
  try {
    const all = [...new Set([...savedVisited(), ...ids])];
    window.localStorage.setItem(VISITED_KEY, JSON.stringify(all));
  } catch {
    /* private mode: this walk just will not count as visited next time */
  }
}

/** The room, this phone's identity, and this phone's walk. */
export function useDetour() {
  const [code, setCode] = useState<string | null>(null);
  const { member, setName } = useMember();
  const room = useRoom<DetourState>('detour', code, member);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('room');
    const remember = (c: string) => {
      setCode(c);
      try {
        window.localStorage.setItem(ROOM_KEY, c);
      } catch {
        /* ignore */
      }
    };
    if (fromUrl) return remember(fromUrl.toUpperCase());

    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(ROOM_KEY);
    } catch {
      saved = null;
    }
    if (saved) {
      remember(saved);
      url.searchParams.set('room', saved);
      window.history.replaceState(null, '', url.toString());
      return;
    }

    let alive = true;
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: 'detour' }),
    })
      .then((r) => r.json())
      .then((d: { code?: string }) => {
        if (!alive || !d.code) return;
        remember(d.code);
        url.searchParams.set('room', d.code);
        window.history.replaceState(null, '', url.toString());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // a walk needs no sign-up; the phone names itself so the stage has something to show
  useEffect(() => {
    if (!member) setName('walker');
  }, [member, setName]);

  const walk: DetourWalk | null = useMemo(
    () => (member && room.state ? (room.state.walks[member.id] ?? null) : null),
    [member, room.state],
  );

  const href = useCallback(
    (path: string, extra?: Record<string, string>) => {
      const p = new URLSearchParams();
      if (code) p.set('room', code);
      for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
      const qs = p.toString();
      return qs ? `${path}?${qs}` : path;
    },
    [code],
  );

  return { ...room, code, member, walk, href };
}
