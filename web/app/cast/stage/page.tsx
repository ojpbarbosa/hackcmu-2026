'use client';
import { useEffect, useState } from 'react';
import { StagePage, ModelLadder, Icon } from '@/ui';
import { useRoom } from '@/hooks/useRoom';
import { makeId } from '@/lib/ids';
import type { CastState } from '@/lib/apps/cast';
import type { Member } from '@/lib/types';
import { answeredCount, castPeople, circle, dayLabel, latestCast, planFor, whenLabel } from '../_components/model';

/** The projector view: the pond on the wall, and why tonight's cast was chosen.
 *  It joins as `stage-…` so the reducer keeps it out of quorum and reveal counts. */
export default function CastStage() {
  const [code, setCode] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Member | null>(null);

  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? null);
    const t = Date.now();
    setViewer({ id: `stage-${makeId('v')}`, name: 'the stage', tone: 1, joinedAt: t, lastSeen: t });
  }, []);

  const { state, members, events } = useRoom<CastState>('cast', code, viewer);
  const people = circle(members);
  const casts = state?.casts.slice(0, 6) ?? [];
  const caught = state?.plans.filter((p) => p.caughtAt).length ?? 0;
  const newest = latestCast(state);

  return (
    <div className="app-cast">
      <StagePage
        side={
          <>
            <p className="lbl">why this cast</p>
            <div className="why">
              {(newest?.reasons ?? []).map((r, i) => (
                <p key={i}>{r}</p>
              ))}
              {newest?.reasons.length ? null : <p>no cast has been chosen yet</p>}
            </div>

            {newest?.rejected.length ? (
              <>
                <p className="lbl" style={{ marginTop: 6 }}>
                  considered and rejected
                </p>
                {newest.rejected.map((r, i) => (
                  <p className="rej" key={i}>
                    {r}
                  </p>
                ))}
              </>
            ) : null}

            <div className="foot">
              <p className="lbl">models</p>
              <ModelLadder events={events} />
            </div>
          </>
        }
      >
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <p className="lbl" style={{ marginBottom: 6 }}>
              {state?.name ?? 'the circle'} · the pond
            </p>
            <p className="h2">fourteen days of casts</p>
          </div>
          <span className="pill" style={{ background: '#17171F', color: '#F0F0F8', boxShadow: 'none' }}>
            <Icon name="users" size={16} className="sm" />
            {people.length} members · {state?.casts.length ?? 0} casts · {caught} caught
          </span>
        </div>

        <div className="strips">
          {casts.map((c) => {
            const plan = planFor(state, c.id);
            const isCatch = !!plan?.caughtAt;
            const row = castPeople(state, members, c, '');
            const { n, of } = answeredCount(c, members);
            const dots = Math.max(row.length, of, 1);
            return (
              <div className="s" key={c.id}>
                <div className="d">
                  {dayLabel(c.openedAt)}
                  {isCatch ? ' · caught' : c.revealedAt ? '' : ` · ${n} of ${of}`}
                </div>
                <div className="q">{isCatch && plan ? `${plan.venue} · ${whenLabel(plan.whenISO)}` : c.prompt}</div>
                <div className="dots">
                  {Array.from({ length: dots }, (_, i) => {
                    const p = row[i];
                    const on = isCatch && plan ? !!p && plan.pulls.includes(p.id) : !!p && !!c.answers[p.id];
                    return <i className={on ? '' : 'off'} key={i} />;
                  })}
                </div>
              </div>
            );
          })}
          {casts.length === 0 ? <div className="s"><div className="q">nothing in the pond yet</div></div> : null}
        </div>
      </StagePage>
    </div>
  );
}
