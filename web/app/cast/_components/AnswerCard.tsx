'use client';
import { Icon } from '@/ui';
import type { CastAnswer } from '@/lib/apps/cast';
import { hhmm, type Person } from './model';

/** One answer in the reveal list. `locked` blurs the text until everyone has cast. */
export function AnswerCard({
  person,
  answer,
  locked,
  typing,
  isMe,
}: {
  person: Person;
  answer?: CastAnswer;
  locked?: boolean;
  typing?: boolean;
  isMe?: boolean;
}) {
  const name = isMe ? 'You' : person.name;
  const face = (
    <div className={`avatar p${person.tone}`} title={person.name}>
      {person.name.slice(0, 1).toUpperCase()}
    </div>
  );

  if (!answer) {
    return (
      <div className="a">
        {face}
        <div className="card" style={{ background: 'var(--raised)', boxShadow: 'none' }}>
          <div className="name">
            <span>{name}</span>
            <span>{typing ? 'typing…' : 'has not cast'}</span>
          </div>
          <div className="txt" style={{ color: 'var(--t3)' }}>
            •••
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={['a', locked ? 'locked' : ''].filter(Boolean).join(' ')}>
      {face}
      <div className="card">
        <div className="name">
          <span>{name}</span>
          {locked ? (
            <span className="lock">
              <Icon name="lock" size={14} className="xs" />
              locked
            </span>
          ) : (
            <span>{hhmm(answer.at)}</span>
          )}
        </div>
        <div className="txt">{answer.text}</div>
      </div>
    </div>
  );
}
