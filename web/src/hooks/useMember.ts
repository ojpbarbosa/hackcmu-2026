'use client';
import { useCallback, useEffect, useState } from 'react';
import { makeId } from '@/lib/ids';
import type { Member } from '@/lib/types';

const KEY = 'hack.member';

function read(): Member | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Member;
    return m && m.id && m.name ? m : null;
  } catch {
    return null;
  }
}

/** This device's identity. Persisted in localStorage so a reload rejoins as the same person. */
export function useMember(): { member: Member | null; setName: (n: string) => void; setSeat: (s: string) => void } {
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    setMember(read());
  }, []);

  const write = useCallback((next: Member) => {
    setMember(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode: identity lasts for this page only */
    }
  }, []);

  const setName = useCallback(
    (n: string) => {
      const name = n.trim();
      if (!name) return;
      const prev = read();
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
    [write],
  );

  const setSeat = useCallback(
    (seat: string) => {
      const prev = read();
      if (!prev) return;
      write({ ...prev, seat });
    },
    [write],
  );

  return { member, setName, setSeat };
}
