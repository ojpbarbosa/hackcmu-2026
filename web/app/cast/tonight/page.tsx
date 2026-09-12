'use client';
import { useEffect, useState } from 'react';
import { Screen, TopNav, Pill, CTA, Body, BodySm, Label, Icon } from '@/ui';
import { AnswerCard } from '../_components/AnswerCard';
import { CastDock } from '../_components/CastDock';
import { NameSheet, useCastRoom, useTicker } from '../_components/useCastRoom';
import { castById, castPeople, answeredCount, isTyping, latestCast, personOf, planFor, dayLabel } from '../_components/model';

/** Screen 3 — locked answers. Mine is readable, everyone else's is blurred
 *  until the last person casts, then the whole page unlocks at once. */
export default function Tonight() {
  const room = useCastRoom();
  const { state, members, me, code, serverNow, ready, member, setName, act } = room;
  useTicker(500);
  const [castId, setCastId] = useState<string | null>(null);

  useEffect(() => {
    setCastId(new URLSearchParams(window.location.search).get('cast'));
  }, []);

  if (!ready || !state) {
    return (
      <Screen app="cast">
        <div className="pad" style={{ marginTop: 28 }}>
          <Label>tonight</Label>
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
  const cast = castById(state, castId) ?? latestCast(state);
  const people = castPeople(state, members, cast, me);
  const { n, of } = answeredCount(cast, members);
  const revealed = !!cast?.revealedAt;
  const plan = planFor(state, cast?.id);
  const waitingOn = cast ? people.filter((p) => !cast.answers[p.id]) : [];

  return (
    <Screen app="cast" dock>
      <TopNav
        left={
          <a className="back" href={`/cast?room=${code ?? ''}`} aria-label="the circle">
            <Icon name="chev-l" />
          </a>
        }
        title={cast?.seeded ? dayLabel(cast.openedAt) : 'Tonight'}
        right={
          <Pill variant="soft" icon="users">
            {state.name}
          </Pill>
        }
      />

      <div className="pad col" style={{ marginTop: 18, gap: 16 }}>
        <p className="h3" style={{ textTransform: 'none' }}>
          {cast?.prompt ?? 'nothing has been cast yet'}
        </p>

        <div className="between" style={{ gap: 10 }}>
          <Pill variant="ink" icon={revealed ? 'check' : 'lock'}>
            {revealed ? `all ${of} cast` : `${n} of ${of} cast`}
          </Pill>
          <BodySm>
            {revealed
              ? 'unlocked together'
              : waitingOn.length
                ? `unlocks when ${waitingOn.map((p) => (p.id === me ? 'you' : p.name)).slice(0, 2).join(' and ')} casts`
                : 'waiting for the circle'}
          </BodySm>
        </div>

        <div className="ans">
          {people.map((p) => (
            <AnswerCard
              key={p.id}
              person={p}
              isMe={p.id === me}
              answer={cast?.answers[p.id]}
              locked={!revealed && p.id !== me}
              typing={isTyping(state, p.id, now)}
            />
          ))}
        </div>

        {cast && !cast.answers[me] && !cast.seeded ? (
          <CTA variant="grad" href={`/cast/cast?room=${code ?? ''}`}>
            Cast your answer
          </CTA>
        ) : null}

        {cast && !revealed && !cast.seeded && cast.answers[me] && n >= 2 && waitingOn.length > 0 ? (
          <CTA variant="ghost" onClick={() => act('revealNow', { castId: cast.id })}>
            Reveal without {waitingOn.length === 1 ? waitingOn[0].name : `the other ${waitingOn.length}`}
          </CTA>
        ) : null}

        {revealed && plan ? (
          <CTA variant="grad" icon="pin" href={`/cast/catch?room=${code ?? ''}&cast=${cast?.id ?? ''}`}>
            See the catch
          </CTA>
        ) : null}

        {revealed && !plan && state.mode === 'catch' ? <BodySm>the plan is being written…</BodySm> : null}

        {cast?.seeded ? <BodySm>from the pond · {personOf(state, members, Object.keys(cast.answers)[0]).name} and the others cast this one</BodySm> : null}
      </div>

      <CastDock code={code} />
    </Screen>
  );
}
