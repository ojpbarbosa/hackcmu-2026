'use client';

type Rgb = [number, number, number];

function parse(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (c: Rgb) => `#${c.map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex: string, target: Rgb, amount: number) => {
  const c = parse(hex);
  return toHex([0, 1, 2].map((i) => c[i] + (target[i] - c[i]) * amount) as Rgb);
};
const lighten = (hex: string, amount: number) => mix(hex, [255, 255, 255], amount);
const darken = (hex: string, amount: number) => mix(hex, [0, 0, 0], amount);
const rgba = (hex: string, a: number) => {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** The signature: a generative aura per person. Four gradient stops derived from
 *  the familiar's hue pair, so no two orbs in the room look the same. */
export function Orb({
  aura,
  letter,
  size = 'lg',
  ghost,
  className,
  style,
}: {
  aura?: [string, string];
  letter: string;
  size?: 'lg' | 'sm';
  ghost?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cls = ['orb', size === 'sm' ? 'sm' : '', ghost ? 'ghost' : '', className].filter(Boolean).join(' ');
  const paint =
    ghost || !aura
      ? undefined
      : {
          background: `radial-gradient(circle at 35% 30%, ${lighten(aura[0], 0.72)} 0%, ${aura[0]} 30%, ${aura[1]} 62%, ${darken(aura[1], 0.55)} 100%)`,
          boxShadow: `0 20px 40px -12px ${rgba(aura[1], 0.45)}, inset 0 -14px 24px rgba(0,0,0,.18), inset 0 8px 16px rgba(255,255,255,.35)`,
        };
  return (
    <div className={cls} style={{ ...paint, ...style }} aria-hidden="true">
      <div className="mono">{letter.slice(0, 1).toUpperCase()}</div>
    </div>
  );
}
