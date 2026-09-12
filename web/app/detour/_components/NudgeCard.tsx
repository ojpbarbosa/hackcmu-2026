'use client';
import { Icon } from '@/ui';

/** One sentence, one button. The card never says where you are going. */
export function NudgeCard({
  index,
  total,
  text,
  ready,
  onGotIt,
  onHide,
}: {
  index: number;
  total: number;
  text: string;
  ready: boolean;
  onGotIt: () => void;
  onHide: () => void;
}) {
  return (
    <div className="nudgecard">
      <div className="between">
        <p className="lbl">
          nudge {Math.min(index + 1, total)} of {total}
        </p>
        <span className="lbl" style={{ color: 'var(--acc)' }}>
          route hidden
        </span>
      </div>
      <p className="n">{text}</p>
      <div className="acts">
        <button className="cta" type="button" style={{ flex: 1, opacity: ready ? 1 : 0.55 }} onClick={onGotIt}>
          {ready ? 'Got it' : 'Keep walking'}
        </button>
        <button
          className="cta ghost"
          type="button"
          style={{ flex: '0 0 48px', padding: 0 }}
          aria-label="hide the nudge"
          onClick={onHide}
        >
          <Icon name="eye-off" />
        </button>
      </div>
    </div>
  );
}
