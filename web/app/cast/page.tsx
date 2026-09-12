'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, Chip, Card, CTA, QR, Stat, H1, Body, BodySm, Label } from '@/ui';
import { CastDock } from './_components/CastDock';
import { WhoRow } from './_components/WhoRow';
import { NameSheet, useCastRoom, useTicker } from './_components/useCastRoom';
import { circle, isTyping, mmss, openCast, personOf } from './_components/model';
import { arm } from './_components/reel';

/** cast ids this tab has already been pulled to, so the pull happens once */
const pulledTo = new Set<string>();

/** Screen 1 — the circle. Who is here, how to get here, and the two ways a cast starts. */
export default function CastHome() {
  const room = useCastRoom();
  const { state, members, me, code, act, serverNow, connected, ready, member, setName } = room;
  useTicker(500);
  const router = useRouter();
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (!code) return;
    setJoinUrl(`${window.location.origin}/cast?room=${code}`);
  }, [code]);

  const open = openCast(state);
  const openId = open?.id;
  const unanswered = !!open && !!me && !open.answers[me];
  // a landing cast pulls this phone to it once; after that the circle stays reachable
  useEffect(() => {
    if (!unanswered || !openId || pulledTo.has(openId)) return;
    pulledTo.add(openId);
    router.push(`/cast/cast?room=${code ?? ''}`);
  }, [unanswered, openId, code, router]);

  const castNow = useCallback(() => {
    arm();
    void act('castNow');
  }, [act]);

  if (!ready || !state) {
    return (
      <Screen app="cast">
        <div className="pad" style={{ marginTop: 28 }}>
          <Label>cast</Label>
          <Body>finding the circle…</Body>
        </div>
      </Screen>
    );
  }
  if (!member) {
    return (
      <Screen app="cast">
        <NameSheet circleName={state.name} onJoin={setName} />
      </Screen>
    );
  }

  const people = circle(members).map((m) => personOf(state, members, m.id));
  const now = serverNow();
  const latest = state.casts[0];
  const statusOf = (id: string) => {
    if (open?.answers[id]) return 'done' as const;
    if (isTyping(state, id, now)) return 'typing' as const;
    return 'idle' as const;
  };
  const scheduledIn = state.scheduledAt ? state.scheduledAt - now : null;

  return (
    <Screen app="cast" dock>
      <TopNav
        left={
          <Pill variant="soft" icon="users">
            {state.name} · {people.length}
          </Pill>
        }
        right={
          <Pill variant="soft" icon={connected ? 'zap' : 'clock'}>
            {connected ? 'live' : 'joining'}
          </Pill>
        }
      />

      <div className="pad col" style={{ gap: 18, marginTop: 18 }}>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <Label>the circle</Label>
            <H1>{state.name}</H1>
          </div>
          <Stat value={state.casts.length} label="casts" />
        </div>

        <WhoRow people={people} statusOf={statusOf} me={me} />

        {scheduledIn !== null && scheduledIn > 0 ? (
          <Card>
            <div className="between">
              <div>
                <Label>the next cast lands in</Label>
                <p className="h2" style={{ marginTop: 4 }}>
                  {mmss(scheduledIn)}
                </p>
              </div>
              <Pill variant="soft" icon="clock">
                every phone at once
              </Pill>
            </div>
          </Card>
        ) : null}

        <div className="row2" style={{ flexWrap: 'wrap', gap: 10 }}>
          <Pill variant="ink" icon="zap" onClick={castNow}>
            Cast now
          </Pill>
          <Pill icon="clock" onClick={() => void act('schedule', { inMs: 120_000 })}>
            Schedule in 2 min
          </Pill>
        </div>

        <div>
          <Label>mode</Label>
          <div className="chips" style={{ marginTop: 8 }}>
            <Chip on={state.mode === 'fishing'} onClick={() => void act('setMode', { mode: 'fishing' })}>
              fishing · discovery
            </Chip>
            <Chip on={state.mode === 'catch'} onClick={() => void act('setMode', { mode: 'catch' })}>
              catch · make a plan
            </Chip>
          </div>
        </div>

        <Card>
          <div className="qr">
            <div className="col" style={{ gap: 6 }}>
              <Label>scan to join the circle</Label>
              <p className="h3" style={{ textTransform: 'none', letterSpacing: '.08em' }}>
                {code ?? '…'}
              </p>
              <BodySm>Everyone in the room gets the same prompt at the same second.</BodySm>
            </div>
            {joinUrl ? <QR url={joinUrl} size={116} /> : null}
          </div>
        </Card>

        {latest ? (
          <CTA variant="ghost" href={`/cast/${open ? 'cast' : 'tonight'}?room=${code ?? ''}`}>
            {open ? 'Go to the open cast' : 'See the last reveal'}
          </CTA>
        ) : (
          <Body>No casts yet. Tap “Cast now” and every phone in the circle buzzes.</Body>
        )}
      </div>

      <CastDock code={code} />
    </Screen>
  );
}
