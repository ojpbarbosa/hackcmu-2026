'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CTA, Card, H1, Body, Label, TextField } from '@/ui';
import { useMember } from '@/hooks/useMember';
import { useRoom } from '@/hooks/useRoom';
import { makeId } from '@/lib/ids';
import type { CastState } from '@/lib/apps/cast';
import type { Member, ObserveEvent } from '@/lib/types';
import { arm } from './reel';

/** the key useMember owns; we write it directly only to honour ?as=/?id= */
const MEMBER_KEY = 'hack.member';

export type CastRoom = {
  code: string | null;
  member: Member | null;
  me: string;
  setName: (n: string) => void;
  state: CastState | null;
  members: Member[];
  act: (name: string, payload?: unknown) => Promise<void>;
  serverNow: () => number;
  connected: boolean;
  events: ObserveEvent[];
  /** false until we know whether this device already has a name */
  ready: boolean;
};

/** The room every cast screen shares: finds or creates the circle from ?room=,
 *  keeps this device's identity, and pumps `tick` so a scheduled cast opens even
 *  though the server has no timers. */
export function useCastRoom(): CastRoom {
  const [code, setCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const { member, setName } = useMember();
  const { state, members, act, serverNow, connected, events } = useRoom<CastState>('cast', code, member);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ?as=Name (&id=fixed) lets a demo phone or a screenshot arrive already named
    const as = params.get('as');
    if (as) {
      try {
        const raw = window.localStorage.getItem(MEMBER_KEY);
        const prev = raw ? (JSON.parse(raw) as Member) : null;
        const id = params.get('id') ?? prev?.id ?? makeId('m');
        const t = Date.now();
        window.localStorage.setItem(
          MEMBER_KEY,
          JSON.stringify({ id, name: as, tone: prev?.tone ?? 1, joinedAt: prev?.joinedAt ?? t, lastSeen: t }),
        );
      } catch {
        /* private mode: the name sheet will ask */
      }
      setName(as);
    }

    const fromUrl = params.get('room');
    if (fromUrl) {
      setCode(fromUrl.toUpperCase());
      setReady(true);
      return;
    }
    let alive = true;
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: 'cast' }),
    })
      .then((r) => r.json())
      .then((d: { code?: string }) => {
        if (!alive || !d.code) return;
        setCode(d.code);
        const url = new URL(window.location.href);
        url.searchParams.set('room', d.code);
        window.history.replaceState(null, '', url.toString());
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [setName]);

  // the server has no timers: every phone nudges a due cast open
  const scheduledAt = state?.scheduledAt ?? null;
  const lastTick = useRef(0);
  useEffect(() => {
    if (!scheduledAt || !member) return;
    const id = setInterval(() => {
      if (serverNow() >= scheduledAt && Date.now() - lastTick.current > 1_500) {
        lastTick.current = Date.now();
        void act('tick');
      }
    }, 400);
    return () => clearInterval(id);
  }, [scheduledAt, member, act, serverNow]);

  return { code, member, me: member?.id ?? '', setName, state, members, act, serverNow, connected, events, ready };
}

/** The gate every screen shows until this device has a name. */
export function NameSheet({ circleName, onJoin }: { circleName: string; onJoin: (name: string) => void }) {
  const [draft, setDraft] = useState('');
  const join = useCallback(() => {
    const name = draft.trim();
    if (!name) return;
    arm(); // the reel needs an AudioContext born in a tap
    onJoin(name);
  }, [draft, onJoin]);

  return (
    <div className="pad col" style={{ gap: 18, marginTop: 28 }}>
      <div>
        <Label>you have been invited to</Label>
        <H1>{circleName}</H1>
        <Body>One prompt lands on every phone at the same second. Nobody sees an answer until everybody has answered.</Body>
      </div>
      <Card>
        <Label>who are you</Label>
        <div className="col" style={{ gap: 10, marginTop: 10 }}>
          <TextField value={draft} onChange={setDraft} placeholder="your name" autoFocus onSubmit={join} />
          <CTA variant="grad" onClick={join} disabled={!draft.trim()}>
            Join the circle
          </CTA>
        </div>
      </Card>
    </div>
  );
}

/** Re-render on a clock, for countdowns. */
export function useTicker(ms = 250): number {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return Date.now();
}
