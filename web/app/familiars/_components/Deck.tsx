'use client';
import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Creature } from './Creature';
import type { Card } from '@/lib/apps/familiars';
import type { Traits } from '@/lib/familiars/creature';

const HUES = [
  'linear-gradient(160deg,#FFB86B,#FF7AA2)',
  'linear-gradient(160deg,#8DB4FF,#7B3FE4)',
  'linear-gradient(160deg,#6EE7B7,#10B981)',
  'linear-gradient(160deg,#C7A8FF,#6366F1)',
];

/** "Sat · 8 pm" — the only date format this app speaks. */
export function whenLabel(iso: string | null): string {
  if (!iso) return 'when you want';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${day} · ${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${ampm}`;
}

function badgeFor(card: Card): string {
  if (card.cached) return 'cached';
  if (card.kind === 'listed_event') return card.image ? 'listed · photo from organizer' : 'listed';
  return 'self-organized';
}

export function Deck({
  cards,
  onSwipe,
  traits,
}: {
  cards: Card[];
  onSwipe: (cardId: string, dir: 'in' | 'out') => void;
  traits?: Traits;
}) {
  const [dx, setDx] = useState(0);
  const [flying, setFlying] = useState<'in' | 'out' | null>(null);
  const start = useRef<number | null>(null);

  const top = cards[0];
  if (!top) return null;

  const release = (dir: 'in' | 'out') => {
    if (flying) return;
    setFlying(dir);
    setDx(dir === 'in' ? 500 : -500);
    const id = top.id;
    window.setTimeout(() => {
      setFlying(null);
      setDx(0);
      onSwipe(id, dir);
    }, 250);
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (flying) return;
    start.current = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (start.current === null || flying) return;
    setDx(e.clientX - start.current);
  };
  const onUp = () => {
    if (start.current === null || flying) return;
    const d = dx;
    start.current = null;
    if (d > 90) release('in');
    else if (d < -90) release('out');
    else setDx(0);
  };

  return (
    <>
      <div className="deck" style={{ marginTop: 14 }}>
        {cards[2] ? (
          <div className="dc deckcard b2">
            <div className="cover" style={{ background: HUES[2], height: 210 }} />
            <div className="in">
              <b>&nbsp;</b>
            </div>
          </div>
        ) : null}
        {cards[1] ? (
          <div className="dc deckcard b1">
            <div className="cover" style={{ background: HUES[1], height: 210 }} />
            <div className="in">
              <b>&nbsp;</b>
            </div>
          </div>
        ) : null}
        <div
          className="dc deckcard top"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            transform: `translateX(${dx}px) rotate(${dx / 20}deg)`,
            transition: flying || dx === 0 ? 'transform 250ms ease-out' : 'none',
            touchAction: 'pan-y',
            cursor: 'grab',
          }}
        >
          <div
            className="cover"
            style={{
              background: top.image ? `center/cover no-repeat url(${JSON.stringify(top.image)})` : HUES[0],
              height: 210,
            }}
          >
            {dx > 40 ? <div className="stamp">in</div> : null}
            {dx < -40 ? (
              <div className="stamp" style={{ borderColor: 'var(--rose)', color: 'var(--rose)' }}>
                nah
              </div>
            ) : null}
            <div className="badge">{badgeFor(top)}</div>
            {!top.image && traits ? (
              <div className="ic" style={{ background: 'none', backdropFilter: 'none' }}>
                <Creature traits={traits} size={52} glow={false} />
              </div>
            ) : null}
          </div>
          <div className="in">
            <b>{top.title}</b>
            <div className="meta">
              <span>{whenLabel(top.whenISO)}</span>
              <span>{top.where}</span>
              <span>{top.cost}</span>
            </div>
            <div className="why">
              <p className="s mute" style={{ color: 'var(--tx2)' }}>
                {top.why}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="swipe">
        <button className="no" type="button" onClick={() => release('out')} aria-label="Not this one">
          ✕
        </button>
        <button className="yes" type="button" onClick={() => release('in')} aria-label="I'm in">
          ✓
        </button>
      </div>
      <div className="row2" style={{ justifyContent: 'center', gap: 26, marginTop: 8 }}>
        <p className="s mute">Not this one</p>
        <p className="s mute">I&rsquo;m in</p>
      </div>
    </>
  );
}

export default Deck;
