'use client';
import { useCallback, useEffect, useState } from 'react';
import { makeId } from '@/lib/ids';
import type { AppName, Member } from '@/lib/types';

/** Identity is stored per app so a phone that played Detour does not walk into a Cast
 *  circle as "walker": each app asks for a name once and keeps its own person. */
export function memberKey(app?: AppName): string {
  return app ? `hack.member.${app}` : 'hack.member';
}

function read(key: string): Member | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const m = JSON.parse(raw) as Member;
    return m && m.id && m.name ? m : null;
  } catch {
    return null;
  }
}

/** This device's identity for one app. Persisted in localStorage so a reload rejoins as the same person. */
export function useMember(app?: AppName): {
  member: Member | null;
  setName: (n: string) => void;
  setSeat: (s: string) => void;
} {
  const key = memberKey(app);
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    setMember(read(key));
  }, [key]);

  const write = useCallback(
    (next: Member) => {
      setMember(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* private mode: identity lasts for this page only */
      }
    },
    [key],
  );

  const setName = useCallback(
    (n: string) => {
      const name = n.trim();
      if (!name) return;
      const prev = read(key);
      const t = Date.now();
      write({
        id: prev?.id ?? makeId('m'),
        name,
        tone: prev?.tone ?? (((t % 4) + 1) as 1 | 2 | 3 | 4),
        joinedAt: prev?.joinedAt ?? t,
        lastSeen: t,
        seat: prev?.seat,
      });
    },
    [key, write],
  );

  const setSeat = useCallback(
    (seat: string) => {
      const prev = read(key);
      if (!prev) return;
      write({ ...prev, seat });
    },
    [key, write],
  );

  return { member, setName, setSeat };
}
