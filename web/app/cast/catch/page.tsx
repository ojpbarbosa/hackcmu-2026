'use client';
import { useEffect, useState } from 'react';
import { Screen, TopNav, Pill, CTA, Body, BodySm, Label, Icon } from '@/ui';
import { PlanCard } from '../_components/PlanCard';
import { QuorumBar } from '../_components/QuorumBar';
import { NameSheet, useCastRoom, useTicker } from '../_components/useCastRoom';
import { castById, circle, downloadIcs, latestCast, openPlan, personOf, planFor } from '../_components/model';

/** Screen 4 — the catch. The plan is a proposal until a quorum pulls the line. */
export default function Catch() {
  const room = useCastRoom();
  const { state, members, me, code, act, ready, member, setName } = room;
  useTicker(700);
  const [castId, setCastId] = useState<string | null>(null);

  useEffect(() => {
    setCastId(new URLSearchParams(window.location.search).get('cast'));
  }, []);

  if (!ready || !state) {
    return (
      <Screen app="cast">
        <div className="pad" style={{ marginTop: 28 }}>
          <Label>catch</Label>
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

  const cast = castById(state, castId) ?? latestCast(state);
  const plan = planFor(state, cast?.id) ?? openPlan(state);
  const people = plan?.seeded
    ? plan.pulls.map((id) => personOf(state, members, id))
    : circle(members).map((m) => personOf(state, members, m.id));
  const caught = !!plan?.caughtAt;
  const iPulled = !!plan && plan.pulls.includes(me);

  if (!plan) {
    return (
      <Screen app="cast" className="fill">
        <TopNav
          left={
            <a className="back" href={`/cast?room=${code ?? ''}`} aria-label="the circle">
              <Icon name="chev-l" />
            </a>
          }
          title="Catch"
        />
        <div className="pad col" style={{ marginTop: 18, gap: 14 }}>
          <Label>nothing on the line</Label>
          <p className="h2">no plan yet</p>
          <Body>
            Switch the circle to catch mode and cast. When everybody has answered, the plan writes itself from the
            answers.
          </Body>
          <CTA variant="ghost" href={`/cast?room=${code ?? ''}`}>
            Back to the circle
          </CTA>
        </div>
      </Screen>
    );
  }

  const picker = personOf(state, members, plan.pickerId);

  return (
    <Screen app="cast" className="fill">
      <TopNav
        left={
          <a className="back" href={`/cast/tonight?room=${code ?? ''}`} aria-label="tonight">
            <Icon name="chev-l" />
          </a>
        }
        title="Catch"
        right={
          <Pill variant="soft" icon="users">
            {state.name}
          </Pill>
        }
      />

      <div className="pad col" style={{ marginTop: 18, gap: 16 }}>
        <div>
          <p className="lbl" style={{ marginBottom: 6 }}>
            a plan on the line
          </p>
          <p className="h2">{plan.title}</p>
        </div>

        <PlanCard plan={plan} picker={picker} />

        <div>
          <div className="between" style={{ marginBottom: 8 }}>
            <span className="h4" style={{ fontSize: 15 }}>
              {plan.pulls.length} of {people.length} pulling
            </span>
            <BodySm>goes live at {plan.quorum}</BodySm>
          </div>
          <QuorumBar pulls={plan.pulls.length} quorum={plan.quorum} of={people.length} />
          <div className="row2" style={{ marginTop: 12, justifyContent: 'space-between', gap: 10 }}>
            <div className="stack">
              {people.map((p) => (
                <div
                  key={p.id}
                  className={`avatar p${p.tone}`}
                  title={p.name}
                  style={plan.pulls.includes(p.id) ? undefined : { opacity: 0.45 }}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            {caught ? (
              <span className="pill" style={{ background: 'var(--mint)', color: 'var(--mint-ink)', boxShadow: 'none' }}>
                <Icon name="check" size={16} className="sm" />
                Caught · invite sent
              </span>
            ) : (
              <BodySm>{plan.quorum - plan.pulls.length} more to go live</BodySm>
            )}
          </div>
        </div>

        {plan.why ? <p className="sub">{plan.why}</p> : null}
      </div>

      <div className="bottom">
        {caught ? (
          <CTA variant="grad" icon="cal" onClick={() => downloadIcs(plan, state.name)}>
            Add to calendar
          </CTA>
        ) : (
          <CTA variant="grad" icon="zap" onClick={() => void act('pull', { planId: plan.id })} disabled={iPulled}>
            {iPulled ? 'You pulled · waiting for the circle' : 'Pull the line'}
          </CTA>
        )}
        {caught ? (
          <CTA variant="ghost" href={`/cast/pond?room=${code ?? ''}`}>
            Back to the pond
          </CTA>
        ) : (
          <CTA variant="ghost" onClick={() => void act('newPlan', { castId: plan.castId })}>
            Suggest a different night
          </CTA>
        )}
      </div>
    </Screen>
  );
}
