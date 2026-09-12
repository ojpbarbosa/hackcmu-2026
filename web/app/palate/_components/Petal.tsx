'use client';
import { AXES, type Axes } from '@/lib/palate/score';

const CX = 135;
const CY = 135;
const R = 100;

/** The petal chart: six axes, one polygon, berry fill. Ported from the mockup's SVG. */
export function Petal({ axes, size = 270 }: { axes: Axes; size?: number }) {
  const points = AXES.map((a, i) => {
    const ang = -Math.PI / 2 + (i * Math.PI * 2) / AXES.length;
    const v = Math.max(0, Math.min(1, axes[a] ?? 0));
    return {
      axis: a,
      ang,
      x: CX + Math.cos(ang) * R * v,
      y: CY + Math.sin(ang) * R * v,
      lx: CX + Math.cos(ang) * (R + 18),
      ly: CY + Math.sin(ang) * (R + 18) + 4,
      ex: CX + Math.cos(ang) * R,
      ey: CY + Math.sin(ang) * R,
    };
  });
  const d = `M${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} Z`;

  return (
    <div className="petal" style={{ width: size, height: size }}>
      <svg viewBox="0 0 270 270" width={size} height={size} aria-label="petal chart of six flavour axes">
        {[25, 50, 75, 100].map((r) => (
          <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#E8ECF3" strokeWidth="1" />
        ))}
        {points.map((p) => (
          <line key={p.axis} x1={CX} y1={CY} x2={p.ex.toFixed(1)} y2={p.ey.toFixed(1)} stroke="#E8ECF3" />
        ))}
        {points.map((p) => (
          <text
            key={`t-${p.axis}`}
            x={p.lx.toFixed(1)}
            y={p.ly.toFixed(1)}
            textAnchor="middle"
            fontFamily="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="#8A8AA6"
          >
            {p.axis}
          </text>
        ))}
        <path d={d} fill="rgba(214,51,108,.18)" stroke="#D6336C" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p) => (
          <circle
            key={`d-${p.axis}`}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r="4.5"
            fill="#fff"
            stroke="#D6336C"
            strokeWidth="2.5"
          />
        ))}
      </svg>
    </div>
  );
}
