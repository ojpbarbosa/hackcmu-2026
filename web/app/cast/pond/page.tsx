'use client';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, Stat, Body, BodySm, Label } from '@/ui';
import { CastDock } from '../_components/CastDock';
import { NameSheet, useCastRoom } from '../_components/useCastRoom';
import { answeredCount, castPeople, dayLabel, personOf, planFor, whenLabel } from '../_components/model';

/** Screen 5 — the pond. Every cast this circle has made, newest first. */
export default function Pond() {
  const room = useCastRoom();
  const { state, members, me, code, ready, member, setName } = room;
  const router = useRouter();

  if (!ready || !state) {
    return (
      <Screen app="cast">
        <div className="pad" style={{ marginTop: 28 }}>
          <Label>the pond</Label>
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

  const caught = state.plans.filter((p) => p.caughtAt).length;

  return (
    <Screen app="cast" dock>
      <TopNav
        left={
          <Pill variant="soft" icon="users">
            {state.name} · {members.filter((m) => !m.id.startsWith('stage-')).length}
          </Pill>
        }
        right={
          <Pill variant="soft" icon="check">
            {caught} caught
          </Pill>
        }
      />

      <div className="pad col" style={{ marginTop: 18, gap: 16 }}>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <p className="lbl" style={{ marginBottom: 6 }}>
              the pond · 14 days
            </p>
            <p className="h1">what we&rsquo;ve said</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Stat value={state.casts.length} label="casts" />
          </div>
        </div>

        <div className="timeline">
          {state.casts.map((c) => {
            const plan = planFor(state, c.id);
            const isCatch = !!plan?.caughtAt;
            const answered = Object.keys(c.answers);
            const people = castPeople(state, members, c, me).filter((p) => answered.includes(p.id));
            const pulled = plan ? plan.pulls.map((id) => personOf(state, members, id)) : [];
            const { n, of } = answeredCount(c, members);
            return (
              <div className={['day', isCatch ? 'catch' : ''].filter(Boolean).join(' ')} key={c.id}>
                <div className="d">{dayLabel(c.openedAt)}</div>
                <button
                  type="button"
                  className="card"
                  onClick={() => router.push(`/cast/tonight?room=${code ?? ''}&cast=${c.id}`)}
                >
                  <div className="q">{isCatch && plan ? `${plan.venue} · ${whenLabel(plan.whenISO)}` : c.prompt}</div>
                  <div className="meta">
                    <div className="stack">
                      {(isCatch ? pulled : people).map((p) => (
                        <div
                          key={p.id}
                          className={`avatar p${p.tone}`}
                          title={p.name}
                          style={{ width: 26, height: 28, fontSize: 10 }}
                        >
                          {p.name.slice(0, 1).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="bsm">{isCatch && plan ? `${plan.pulls.length} pulled` : `${n} of ${of}`}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {state.casts.length === 0 ? <BodySm>nothing in the pond yet</BodySm> : null}
      </div>

      <CastDock code={code} />
    </Screen>
  );
}
