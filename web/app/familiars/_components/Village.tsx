'use client';
import { useEffect, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';

export type VillageNode = { id: string; name: string; color: string; r: number; lonely: boolean };
export type VillageLink = { source: string; target: string };
export type Highlight = { id: string; text: string };

type Sim = SimulationNodeDatum & VillageNode;
type SimLink = SimulationLinkDatum<Sim>;

const W = 900;
const H = 620;

/** The village: one node per familiar, one edge per bump, laid out by d3-force
 *  in the browser and re-seeded whenever the room grows. */
export function Village({
  nodes,
  links,
  highlights = [],
  rings,
}: {
  nodes: VillageNode[];
  links: VillageLink[];
  highlights?: Highlight[];
  /** ids to circle: both ends of the meetings being named */
  rings?: Set<string>;
}) {
  const [, setTick] = useState(0);
  const simNodes = useRef<Map<string, Sim>>(new Map());
  const simLinks = useRef<SimLink[]>([]);
  const sim = useRef<Simulation<Sim, SimLink> | null>(null);

  const shape = `${nodes.length}:${links.length}`;

  useEffect(() => {
    // keep the positions of familiars that were already on screen
    const next = new Map<string, Sim>();
    for (const n of nodes) {
      const prev = simNodes.current.get(n.id);
      next.set(n.id, prev ? Object.assign(prev, n) : { ...n, x: W / 2 + (Math.random() - 0.5) * 260, y: H / 2 + (Math.random() - 0.5) * 220 });
    }
    simNodes.current = next;
    const list = [...next.values()];
    simLinks.current = links
      .filter((l) => next.has(l.source) && next.has(l.target))
      .map((l) => ({ source: l.source, target: l.target }));

    sim.current?.stop();
    const s = forceSimulation<Sim, SimLink>(list)
      .force(
        'link',
        forceLink<Sim, SimLink>(simLinks.current)
          .id((d) => d.id)
          .distance(58)
          .strength(0.45),
      )
      .force('charge', forceManyBody<Sim>().strength(-130))
      .force('center', forceCenter(W / 2, H / 2))
      .force('collide', forceCollide<Sim>().radius((d) => d.r + 8))
      .force('x', forceX(W / 2).strength(0.035))
      .force('y', forceY(H / 2).strength(0.05))
      .alpha(0.9)
      .alphaDecay(0.022);

    s.on('tick', () => setTick((t) => t + 1));
    sim.current = s;
    return () => {
      s.stop();
    };
    // the layout only needs rebuilding when the room's shape changes
  }, [shape, nodes, links]);

  const list = [...simNodes.current.values()];
  const byId = simNodes.current;
  const label = (id: string) => highlights.find((h) => h.id === id)?.text;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-label="village graph of familiars">
      <g stroke="#2A2A38" strokeWidth={1.2}>
        {simLinks.current.map((l, i) => {
          const a = typeof l.source === 'object' ? (l.source as Sim) : byId.get(String(l.source));
          const b = typeof l.target === 'object' ? (l.target as Sim) : byId.get(String(l.target));
          if (!a || !b) return null;
          return <line key={i} x1={a.x ?? 0} y1={a.y ?? 0} x2={b.x ?? 0} y2={b.y ?? 0} />;
        })}
      </g>
      {list.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x ?? 0}
            cy={n.y ?? 0}
            r={n.r}
            fill={n.color}
            fillOpacity={n.lonely ? 0.55 : 1}
            stroke={n.lonely ? '#3A3A48' : '#0D0D14'}
            strokeWidth={1.5}
          />
          {rings?.has(n.id) ? (
            <circle cx={n.x ?? 0} cy={n.y ?? 0} r={n.r + 6} fill="none" stroke={n.color} strokeOpacity={0.6} />
          ) : null}
          {label(n.id) ? (
            <text
              x={(n.x ?? 0) + n.r + 10}
              y={(n.y ?? 0) + 4}
              fill="#F0F0F8"
              style={{ font: '600 14px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
            >
              {label(n.id)}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
