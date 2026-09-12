'use client';
import { useEffect, useRef, useState } from 'react';
import { Screen, H1, Body, BodySm, Label } from '@/ui';

/** Screenshot and demo helper: fills a room with two hatched familiars that have
 *  already bumped, seeds the demo village, writes this device's identity as the
 *  first of the two, and jumps to the screen you asked for.
 *
 *  /familiars/dev?room=SHOTS&to=/familiars/me
 *
 *  Everything it does goes through the same public actions a phone uses; there is
 *  no back door into the state. */
const A = { id: 'shot_a', name: 'Joao', seat: '2nd floor, by the windows' };
const B = { id: 'shot_b', name: 'Ana', seat: 'Tepper atrium, near the coffee' };

const SEEDS_A = ['I solder eurorack modules in a dorm room', 'Recife, then Pittsburgh', 'Night owl, obviously'];
const SEEDS_B = ['I patch tape loops into synths', 'Lagos, then Pittsburgh', 'I read menus for fun'];

export default function DevSeedPage() {
  const [log, setLog] = useState<string[]>([]);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('room') ?? 'SHOTS').toUpperCase();
    const to = params.get('to') ?? '/familiars/me';
    const say = (s: string) => setLog((l) => [...l, s]);

    const act = (name: string, payload: unknown, memberId: string) =>
      fetch(`/api/rooms/familiars/${code}/act`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, payload, memberId }),
      });

    (async () => {
      const doc = (await fetch(`/api/rooms/familiars/${code}?v=0`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as { doc?: { state?: { familiars?: Record<string, unknown> } } } | null;
      const already = !!doc?.doc?.state?.familiars?.[A.id];
      const t = Date.now();

      if (already) {
        say('room already seeded');
      } else {
        for (const [who, seeds] of [
          [A, SEEDS_A],
          [B, SEEDS_B],
        ] as const) {
          await act('join', { id: who.id, name: who.name, tone: who.id === A.id ? 1 : 2, seat: who.seat }, who.id);
          await act('hatch', { seeds, human: { name: who.name, seat: who.seat } }, who.id);
        }
        say('two familiars hatched');

        for (const [who, at] of [
          [A, t],
          [B, t + 150],
        ] as const) {
          await fetch('/api/bump', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ app: 'familiars', code, memberId: who.id, at, magnitude: 18.4 }),
          });
        }
        say('bumped, 150 ms apart');

        await act('seedDemo', { n: 40 }, A.id);
        await act('story', {}, A.id);
        say('village seeded, story written');
      }

      window.localStorage.setItem(
        'hack.member.familiars',
        JSON.stringify({ id: A.id, name: A.name, tone: 1, joinedAt: t, lastSeen: t, seat: A.seat }),
      );
      window.location.assign(`${to}${to.includes('?') ? '&' : '?'}room=${code}`);
    })().catch((e) => say(`failed: ${e instanceof Error ? e.message : String(e)}`));
  }, []);

  return (
    <Screen app="fam" className="col">
      <div className="pad col" style={{ gap: 12, marginTop: 40 }}>
        <Label>dev</Label>
        <H1>seeding a room</H1>
        <Body>Two familiars, one bump, forty demo villagers, one story. Then this device becomes Joao.</Body>
        {log.map((l) => (
          <BodySm key={l}>{l}</BodySm>
        ))}
      </div>
    </Screen>
  );
}
