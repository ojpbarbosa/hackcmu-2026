'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, CTA, Sheet, TextField, Body, BodySm, Label, Icon } from '@/ui';
import { Ring } from '../_components/Ring';
import { WhoRow } from '../_components/WhoRow';
import { NameSheet, useCastRoom, useTicker } from '../_components/useCastRoom';
import { CAST_MS } from '@/lib/apps/cast';
import { answeredCount, castPeople, isTyping, latestCast, openCast } from '../_components/model';
import { arm, land } from '../_components/reel';

/** Screen 2 — the cast lands. One prompt, a ring, and who has cast so far. */
export default function CastLands() {
  const room = useCastRoom();
  const { state, members, me, code, act, serverNow, ready, member, setName } = room;
  useTicker(250);
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const lastTyping = useRef(0);
  const buzzed = useRef<Set<string>>(new Set());

  const open = openCast(state);
  const shown = open ?? latestCast(state);

  // the phone buzzes and plays the reel the moment a cast lands
  useEffect(() => {
    if (!open || buzzed.current.has(open.id)) return;
    buzzed.current.add(open.id);
    if (serverNow() - open.openedAt < 10_000) land();
  }, [open, serverNow]);

  const onDraft = useCallback(
    (v: string) => {
      setDraft(v);
      const t = Date.now();
      if (t - lastTyping.current > 3_000) {
        lastTyping.current = t;
        void act('typing');
      }
    },
    [act],
  );

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || !shown) return;
    setComposing(false);
    setDraft('');
    void act('answer', { castId: shown.id, text });
    router.push(`/cast/tonight?room=${code ?? ''}`);
  }, [draft, shown, act, router, code]);

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

  const now = serverNow();
  const people = castPeople(state, members, shown, me);
  const mine = shown?.answers[me];
  const { n, of } = answeredCount(shown, members);
  const scheduledIn = state.scheduledAt ? state.scheduledAt - now : null;
  const waiting = scheduledIn !== null && scheduledIn > 0 && !open;

  const remaining = open ? open.deadlineAt - now : waiting ? (scheduledIn ?? 0) : 0;
  const total = open ? CAST_MS : waiting ? Math.max(scheduledIn ?? 1, 1) : CAST_MS;
  const ringLabel = open ? (remaining > 0 ? 'to answer' : 'still open') : waiting ? 'to cast' : 'no cast open';

  const statusOf = (id: string) => {
    if (shown?.answers[id]) return 'done' as const;
    if (isTyping(state, id, now)) return 'typing' as const;
    return 'idle' as const;
  };

  return (
    <Screen app="cast" className="fill">
      <TopNav
        left={
          <a className="back" href={`/cast?room=${code ?? ''}`} aria-label="the circle">
            <Icon name="chev-l" />
          </a>
        }
        title={state.mode === 'catch' ? 'Catch mode' : 'Tonight'}
        right={
          <Pill variant="soft" icon="users">
            {state.name} · {of}
          </Pill>
        }
      />

      <div className="pad col" style={{ marginTop: 22, gap: 22 }}>
        <Ring remainingMs={Math.max(0, remaining)} totalMs={total} label={ringLabel} />

        <div>
          <p className="lbl" style={{ textAlign: 'center', marginBottom: 8 }}>
            {open ? "tonight's cast" : waiting ? 'the next cast' : 'the last cast'}
          </p>
          <p className="h2" style={{ textAlign: 'center', textTransform: 'none' }}>
            {waiting ? 'every phone buzzes at the same second' : (shown?.prompt ?? 'nothing has been cast yet')}
          </p>
        </div>

        <WhoRow people={people} statusOf={statusOf} me={me} />
      </div>

      <div className="bottom">
        {!shown || waiting ? (
          <CTA
            variant="grad"
            icon="zap"
            onClick={() => {
              arm();
              void act('castNow');
            }}
          >
            Cast now
          </CTA>
        ) : mine ? (
          <CTA variant="grad" href={`/cast/tonight?room=${code ?? ''}`}>
            {shown.revealedAt ? 'See the reveal' : 'See who has cast'}
          </CTA>
        ) : (
          <CTA
            variant="grad"
            onClick={() => {
              arm();
              setComposing(true);
            }}
          >
            Cast your answer
          </CTA>
        )}
        <BodySm>
          {shown && !waiting
            ? `${n} of ${of} have cast · answers unlock when all ${of} do`
            : 'nobody has cast yet · you can start one'}
        </BodySm>
      </div>

      <Sheet open={composing} onClose={() => setComposing(false)}>
        <Label>your answer</Label>
        <p className="h3" style={{ textTransform: 'none', margin: '6px 0 12px' }}>
          {shown?.prompt}
        </p>
        <div className="col" style={{ gap: 12 }}>
          <TextField value={draft} onChange={onDraft} placeholder="one line is enough" multiline autoFocus onSubmit={send} />
          <CTA variant="grad" onClick={send} disabled={!draft.trim()}>
            Cast it
          </CTA>
          <BodySm>Nobody sees this until everyone has cast.</BodySm>
        </div>
      </Sheet>
    </Screen>
  );
}
