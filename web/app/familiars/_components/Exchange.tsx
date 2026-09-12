'use client';
import { useEffect, useRef, useState } from 'react';
import type { Bump, Familiar } from '@/lib/apps/familiars';

const LINE_MS = 900;

/** Ten seconds of familiar talk, one line at a time. Left is yours. */
export function Exchange({
  bump,
  me,
  other,
  onDone,
  instant,
}: {
  bump: Bump;
  me: Familiar;
  other: Familiar;
  onDone?: () => void;
  /** skip the stream (revisiting an exchange that already happened) */
  instant?: boolean;
}) {
  const total = bump.dialogue.length;
  const [shown, setShown] = useState(instant ? total : 0);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (instant) {
      setShown(total);
      doneRef.current?.();
      return;
    }
    setShown(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= total) {
        clearInterval(timer);
        doneRef.current?.();
      }
    }, LINE_MS);
    return () => clearInterval(timer);
  }, [bump.id, total, instant]);

  const mineIsA = bump.a === me.id;

  return (
    <div className="xchg">
      {bump.dialogue.slice(0, shown).map((line, i) => {
        const mine = (line.who === 'a') === mineIsA;
        const speaker = mine ? me : other;
        return (
          <div className={mine ? 'l' : 'l r'} key={`${bump.id}-${i}`}>
            <div className={`avatar ${mine ? 'p1' : 'p2'}`}>{speaker.name.slice(0, 1).toUpperCase()}</div>
            <span className="bubble">{line.text}</span>
          </div>
        );
      })}
    </div>
  );
}
