'use client';

import { HUES, PALETTE, type Traits } from '@/lib/familiars/creature';

export type CreatureMood = 'idle' | 'talk' | 'sleep';

export type CreatureProps = {
  traits: Traits;
  size?: number;
  mood?: CreatureMood;
  egg?: boolean;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Where the face sits for each species (the mockup symbols differ). */
const FACE: Record<Traits['species'], { y: number; x: number; r: number }> = {
  moth: { y: -2, x: 11, r: 7 },
  kestrel: { y: -6, x: 11, r: 7 },
  gecko: { y: -10, x: 14, r: 8 },
  pika: { y: -6, x: 12, r: 7 },
};

/* Bodies ported from docs/mockups/familiars.html <symbol id="c-*">, faces removed
   (eyes / mouth / accessory are drawn from traits on top). */
function Body({ species }: { species: Traits['species'] }) {
  switch (species) {
    case 'moth':
      return (
        <>
          <g fill="var(--c1)" opacity=".92">
            <path d="M-10 -6 C-48 -40 -70 -6 -40 14 C-30 20 -18 16 -10 6z" />
            <path d="M10 -6 C48 -40 70 -6 40 14 C30 20 18 16 10 6z" />
          </g>
          <g stroke="var(--c3)" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M-8 -30 C-14 -44 -22 -48 -30 -46" />
            <path d="M8 -30 C14 -44 22 -48 30 -46" />
          </g>
          <circle cx="-30" cy="-46" r="4" fill="var(--c2)" />
          <circle cx="30" cy="-46" r="4" fill="var(--c2)" />
          <path d="M-26 -14 C-30 -40 30 -40 26 -14 C34 10 20 44 0 44 C-20 44 -34 10 -26 -14z" fill="var(--c2)" />
          <path d="M-18 -8 C-20 -28 20 -28 18 -8 C22 8 12 22 0 22 C-12 22 -22 8 -18 -8z" fill="var(--c1)" opacity=".55" />
          <circle cx="-19" cy="8" r="3.5" fill="#fff" opacity=".45" />
          <circle cx="19" cy="8" r="3.5" fill="#fff" opacity=".45" />
        </>
      );
    case 'kestrel':
      return (
        <>
          <path d="M-34 6 C-52 -4 -54 -30 -40 -36 C-30 -40 -22 -28 -26 -12z" fill="var(--c1)" opacity=".9" />
          <path d="M34 6 C52 -4 54 -30 40 -36 C30 -40 22 -28 26 -12z" fill="var(--c1)" opacity=".9" />
          <path d="M-26 -10 C-32 -42 32 -42 26 -10 C34 12 20 44 0 44 C-20 44 -34 12 -26 -10z" fill="var(--c2)" />
          <path d="M-14 8 C-14 -6 14 -6 14 8 C14 22 -14 22 -14 8z" fill="var(--c1)" opacity=".55" />
          <path d="M-24 -40 L-14 -30 L-30 -28z M24 -40 L14 -30 L30 -28z" fill="var(--c2)" />
        </>
      );
    case 'gecko':
      return (
        <>
          <path
            d="M22 26 C46 22 58 34 52 46 C44 58 30 46 24 40"
            fill="none"
            stroke="var(--c2)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path d="M-28 -6 C-32 -38 32 -38 28 -6 C34 14 20 44 0 44 C-20 44 -34 14 -28 -6z" fill="var(--c2)" />
          <ellipse cx="0" cy="12" rx="17" ry="14" fill="var(--c1)" opacity=".55" />
          <circle cx="-8" cy="-34" r="3" fill="var(--c1)" />
          <circle cx="6" cy="-38" r="2.4" fill="var(--c1)" />
        </>
      );
    case 'pika':
    default:
      return (
        <>
          <ellipse cx="-24" cy="-40" rx="9" ry="16" fill="var(--c2)" transform="rotate(-14 -24 -40)" />
          <ellipse cx="24" cy="-40" rx="9" ry="16" fill="var(--c2)" transform="rotate(14 24 -40)" />
          <ellipse cx="-24" cy="-40" rx="4.5" ry="10" fill="var(--c1)" transform="rotate(-14 -24 -40)" />
          <ellipse cx="24" cy="-40" rx="4.5" ry="10" fill="var(--c1)" transform="rotate(14 24 -40)" />
          <path d="M-30 -4 C-34 -36 34 -36 30 -4 C36 16 20 44 0 44 C-20 44 -36 16 -30 -4z" fill="var(--c2)" />
          <ellipse cx="0" cy="14" rx="18" ry="13" fill="var(--c1)" opacity=".5" />
          <circle cx="-21" cy="6" r="4" fill="#fff" opacity=".5" />
          <circle cx="21" cy="6" r="4" fill="#fff" opacity=".5" />
        </>
      );
  }
}

function Eyes({ traits }: { traits: Traits }) {
  const f = FACE[traits.species];
  const { y, x, r } = f;
  if (traits.eyes === 2) {
    // sleepy lid: half-moon whites under a heavy lid
    return (
      <g className="eye" style={{ transformOrigin: `0 ${y}px` }}>
        <circle cx={-x} cy={y} r={r} fill="#fff" />
        <circle cx={x} cy={y} r={r} fill="#fff" />
        <circle cx={-x + 1.5} cy={y + 1.5} r={r * 0.5} fill="#0A0A0F" />
        <circle cx={x + 1.5} cy={y + 1.5} r={r * 0.5} fill="#0A0A0F" />
        <path
          d={`M${-x - r} ${y - 1} A ${r} ${r} 0 0 1 ${-x + r} ${y - 1} Z M${x - r} ${y - 1} A ${r} ${r} 0 0 1 ${x + r} ${y - 1} Z`}
          fill="var(--c3)"
        />
      </g>
    );
  }
  const rx = traits.eyes === 1 ? r * 1.25 : r;
  const ry = traits.eyes === 1 ? r * 1.25 : r;
  const pr = traits.eyes === 1 ? r * 0.44 : r * 0.52;
  return (
    <g className="eye" style={{ transformOrigin: `0 ${y}px` }}>
      <ellipse cx={-x} cy={y} rx={rx} ry={ry} fill="#fff" />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" />
      <circle cx={-x + 1.5} cy={y + 1} r={pr} fill="#0A0A0F" />
      <circle cx={x + 1.5} cy={y + 1} r={pr} fill="#0A0A0F" />
      <circle cx={-x + 3} cy={y - 0.5} r="1.2" fill="#fff" />
      <circle cx={x + 3} cy={y - 0.5} r="1.2" fill="#fff" />
    </g>
  );
}

function Mouth({ traits }: { traits: Traits }) {
  const my = FACE[traits.species].y + 11;
  if (traits.mouth === 1) {
    return (
      <path
        className="mouth"
        d={`M-3 ${my} Q0 ${my + 2.5} 3 ${my}`}
        stroke="#0A0A0F"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (traits.mouth === 2) {
    return <ellipse className="mouth" cx="0" cy={my + 1} rx="5" ry="4.5" fill="#0A0A0F" />;
  }
  return (
    <path
      className="mouth"
      d={`M-6 ${my - 1} Q0 ${my + 4} 6 ${my - 1}`}
      stroke="#0A0A0F"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  );
}

function Accessory({ traits }: { traits: Traits }) {
  const f = FACE[traits.species];
  if (traits.accessory === 1) {
    // freckles
    return (
      <g fill="var(--c3)" opacity=".5">
        <circle cx={-f.x - 8} cy={f.y + 7} r="1.5" />
        <circle cx={-f.x - 4} cy={f.y + 10} r="1.3" />
        <circle cx={f.x + 8} cy={f.y + 7} r="1.5" />
        <circle cx={f.x + 4} cy={f.y + 10} r="1.3" />
      </g>
    );
  }
  if (traits.accessory === 2) {
    // glasses
    const r = f.r + 2.5;
    return (
      <g stroke="#0A0A0F" strokeWidth="2" fill="none" opacity=".8">
        <circle cx={-f.x} cy={f.y} r={r} />
        <circle cx={f.x} cy={f.y} r={r} />
        <path d={`M${-f.x + r} ${f.y} L${f.x - r} ${f.y}`} />
      </g>
    );
  }
  if (traits.accessory === 3) {
    // tiny hat
    const hy = f.y - f.r - 20;
    return (
      <g>
        <path d={`M-14 ${hy + 8} L14 ${hy + 8}`} stroke="var(--c3)" strokeWidth="3.5" strokeLinecap="round" />
        <path d={`M-9 ${hy + 8} L-7 ${hy - 4} L7 ${hy - 4} L9 ${hy + 8} Z`} fill="var(--c3)" />
        <path d={`M-8 ${hy + 3} L8 ${hy + 3}`} stroke="var(--c1)" strokeWidth="3" />
      </g>
    );
  }
  return null;
}

function Egg() {
  return (
    <>
      <path d="M0 -46 C26 -46 40 -16 40 10 C40 34 22 48 0 48 C-22 48 -40 34 -40 10 C-40 -16 -26 -46 0 -46z" fill="#F4F2FF" />
      <path d="M-16 -8 C-10 -2 -4 -10 2 -4 C8 2 14 -6 20 0" fill="none" stroke="var(--c2)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-8" cy="14" r="2.5" fill="var(--c2)" />
      <circle cx="10" cy="20" r="2" fill="var(--c2)" />
      <path d="M-26 6 C-20 0 -12 4 -8 -2" fill="none" stroke="var(--c1)" strokeWidth="3" strokeLinecap="round" opacity=".8" />
    </>
  );
}

function Creature({
  traits,
  size = 120,
  mood = 'idle',
  egg = false,
  glow = true,
  className,
  style,
}: CreatureProps) {
  const { c1, c2, c3 } = PALETTE[HUES[traits.hue % HUES.length]];
  const cls = ['crit', 'bob', mood === 'talk' ? 'talk' : '', mood === 'sleep' ? 'sleep' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      style={{ ...(style ?? {}), '--s': `${size}px`, '--c1': c1, '--c2': c2, '--c3': c3 } as React.CSSProperties}
    >
      {glow ? <div className="aura" /> : null}
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <g transform="translate(60,60)">
          {egg ? (
            <Egg />
          ) : (
            <>
              <Body species={traits.species} />
              <Eyes traits={traits} />
              <Mouth traits={traits} />
              <Accessory traits={traits} />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

export { Creature };
export default Creature;
