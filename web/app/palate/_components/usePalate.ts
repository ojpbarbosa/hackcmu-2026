'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMember } from '@/hooks/useMember';
import { useRoom } from '@/hooks/useRoom';
import { dishesFor, menuHeader, type PalateState } from '@/lib/apps/palate';
import { mergeTable, rankMenu, type Dish, type Scored, type TableMerge } from '@/lib/palate/score';
import type { Member, ObserveEvent } from '@/lib/types';

export type PalateRoom = {
  code: string | null;
  member: Member | null;
  setName: (n: string) => void;
  state: PalateState | null;
  members: Member[];
  /** members who have actually built a palate — the table is made of these */
  seated: Member[];
  me: PalateState['palates'][string] | null;
  dishes: Dish[];
  header: ReturnType<typeof menuHeader>;
  ranked: Scored[];
  merged: TableMerge;
  reasons: Record<string, string>;
  act: (name: string, payload?: unknown) => Promise<void>;
  connected: boolean;
  events: ObserveEvent[];
  href: (path: string) => string;
};

/** One room per table. The code lives in ?room=; the first phone to arrive creates it. */
export function usePalate(): PalateRoom {
  const { member: stored, setName } = useMember();
  const [code, setCode] = useState<string | null>(null);
  const [as, setAs] = useState<Member | null>(null);

  // ?as=<id>&name=<name> opens the room as a named seat without touching this device's
  // identity — how the demo drives three palates from one laptop.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get('as');
    if (!id) return;
    const t = Date.now();
    const tone = Number(q.get('tone') ?? 1);
    setAs({
      id,
      name: q.get('name') ?? id,
      tone: ([1, 2, 3, 4].includes(tone) ? tone : 1) as 1 | 2 | 3 | 4,
      joinedAt: t,
      lastSeen: t,
    });
  }, []);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('room');
    if (fromUrl) {
      setCode(fromUrl.toUpperCase());
      return;
    }
    let alive = true;
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: 'palate' }),
    })
      .then((r) => r.json())
      .then((d: { code?: string }) => {
        if (!alive || !d.code) return;
        setCode(d.code);
        const url = new URL(window.location.href);
        url.searchParams.set('room', d.code);
        window.history.replaceState(null, '', url.toString());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const member = as ?? stored;
  const room = useRoom<PalateState>('palate', code, member);
  const state = room.state;

  const me = member && state ? (state.palates[member.id] ?? null) : null;
  const dishes = useMemo(() => (state ? dishesFor(state) : []), [state]);
  const header = state ? menuHeader(state) : null;
  const ranked = useMemo(() => (me ? rankMenu(me, dishes, state?.known) : []), [me, dishes, state?.known]);
  const merged = useMemo(
    () => mergeTable(state?.palates ?? {}, dishes, state?.known),
    [state?.palates, dishes, state?.known],
  );
  const reasons = (member && state?.reasons[member.id]) || {};
  const seated = room.members.filter((m) => state?.palates[m.id]);

  const href = useCallback(
    (path: string) => {
      const q = new URLSearchParams();
      if (code) q.set('room', code);
      if (as) {
        q.set('as', as.id);
        q.set('name', as.name);
        q.set('tone', String(as.tone));
      }
      const qs = q.toString();
      return qs ? `${path}?${qs}` : path;
    },
    [code, as],
  );

  return {
    code,
    member,
    setName,
    state,
    members: room.members,
    seated,
    me,
    dishes,
    header,
    ranked,
    merged,
    reasons,
    act: room.act,
    connected: room.connected,
    events: room.events,
    href,
  };
}

export const money = (n: number | undefined): string => (typeof n === 'number' ? `$${n}` : '');

export const clockOf = (ts: number | null | undefined): string => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
