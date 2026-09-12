/** Orienteering by greedy insertion: walk from where you are to a fixed endpoint,
 *  collecting as many never-visited places as the clock allows. Server-side only. */
import {
  bearing,
  dijkstra,
  haversine,
  nearestNode,
  pathLatLng,
  pathTo,
  streetsAlong,
  turnFrom,
  type Graph,
  type LatLng,
  type Poi,
} from './graph';

export const WALK_SPEED = 1.35; // m/s, a distracted walking pace
export const SLACK_SECONDS = 180; // never spend the last three minutes
export const MAX_LEGS = 7;

export type Turn = 'left' | 'right' | 'straight';

export type WalkLeg = {
  fromNode: string;
  toNode: string;
  poi: Poi | null;
  path: LatLng[];
  meters: number;
  seconds: number;
  streets: string[];
  turn: Turn;
};

export type Candidate = { poi: Poi; novelty: number; considered: boolean; chosen: boolean };

export type Walk = {
  legs: WalkLeg[];
  totalSeconds: number;
  totalMeters: number;
  budgetSeconds: number;
  start: LatLng;
  endpoint: { name: string; lat: number; lng: number };
  candidates: Candidate[];
  novelty: number;
};

const AVENUES = /forbes|fifth|bigelow|craig/i;

/** How much each mood cares about a kind of place. 1 is neutral. */
const MOOD_WEIGHTS: Record<string, Record<string, number>> = {
  'somewhere new': { artwork: 1.15, memorial: 1.2, viewpoint: 1.3, museum: 1.25, theatre: 1.2, garden: 1.2 },
  quiet: { park: 1.6, garden: 1.5, library: 1.4, place_of_worship: 1.3, artwork: 1.2, bar: 0.5, fast_food: 0.4, nightclub: 0.3 },
  hungry: { bakery: 1.8, cafe: 1.6, restaurant: 1.5, ice_cream: 1.4, fast_food: 1.2, deli: 1.4, pub: 1.1, bank: 0.5 },
  trees: { park: 1.8, garden: 1.7, nature_reserve: 1.6, greenhouse: 1.5, pitch: 1.2, fast_food: 0.5 },
  'people-watching': { marketplace: 1.6, cafe: 1.4, bar: 1.3, theatre: 1.3, university: 1.2, pitch: 1.2, plaza: 1.4 },
};

export function kindWeight(mood: string, kind: string): number {
  return MOOD_WEIGHTS[mood]?.[kind] ?? 1;
}

/** Places on the two avenues everyone already walks are worth less. */
function offAvenuePenalty(g: Graph, poi: Poi): number {
  const onAvenue = (g.adj[poi.nodeId] ?? []).some((e) => AVENUES.test(e.street));
  return onAvenue ? 0.6 : 1;
}

export function novelty(g: Graph, poi: Poi, mood: string, visited: Set<string>): number {
  const fresh = visited.has(poi.id) ? 0.15 : 1;
  return fresh * kindWeight(mood, poi.kind) * offAvenuePenalty(g, poi);
}

function leg(g: Graph, nodes: string[], poi: Poi | null, prevBearing: number | null): WalkLeg {
  const path = pathLatLng(g, nodes);
  let meters = 0;
  for (let i = 1; i < path.length; i++) meters += haversine(path[i - 1], path[i]);
  const head = path.length > 1 ? bearing(path[0], path[Math.min(2, path.length - 1)]) : 0;
  return {
    fromNode: nodes[0],
    toNode: nodes[nodes.length - 1],
    poi,
    path,
    meters: Math.round(meters),
    seconds: Math.round(meters / WALK_SPEED),
    streets: streetsAlong(g, nodes),
    turn: prevBearing === null ? 'straight' : turnFrom(prevBearing, head),
  };
}

/** Plan a walk that ends at `endpoint` inside `budgetMin`. Deterministic. */
export function planWalk(
  g: Graph,
  start: LatLng,
  endpoint: { name: string; lat: number; lng: number },
  budgetMin: number,
  mood: string,
  visitedPoiIds: string[] = [],
): Walk {
  const budgetSeconds = Math.round(budgetMin * 60);
  const visited = new Set(visitedPoiIds);
  const startNode = nearestNode(g, start[0], start[1]);
  const endNode = nearestNode(g, endpoint.lat, endpoint.lng);
  const toEnd = dijkstra(g, endNode).dist; // the graph is undirected: distance to the endpoint

  const scored = g.pois
    .map((poi) => ({ poi, novelty: novelty(g, poi, mood, visited) }))
    .filter((c) => c.novelty > 0 && g.adj[c.poi.nodeId]);

  const legs: WalkLeg[] = [];
  const consideredIds = new Set<string>();
  const chosenIds = new Set<string>();
  const kindCount = new Map<string, number>();
  const usedNodes = new Set<string>([startNode]);

  let cur = startNode;
  let elapsed = 0;
  let lastBearing: number | null = null;

  // With more time on the clock, look further between places: a 90-minute walk of
  // seven 80-metre hops would be a lap of one block.
  const pace = (budgetSeconds - SLACK_SECONDS) / (MAX_LEGS + 1);
  const minDetour = Math.min(300, Math.max(60, pace * 0.4));

  while (legs.length < MAX_LEGS) {
    const { dist, prev } = dijkstra(g, cur);
    let best: { c: (typeof scored)[number]; nodes: string[]; seconds: number; score: number } | null = null;

    for (const c of scored) {
      if (chosenIds.has(c.poi.id) || usedNodes.has(c.poi.nodeId)) continue;
      const there = dist[c.poi.nodeId];
      const home = toEnd[c.poi.nodeId];
      if (there === undefined || home === undefined) continue;
      const detour = there / WALK_SPEED;
      const rest = (there + home) / WALK_SPEED;
      if (elapsed + rest > budgetSeconds - SLACK_SECONDS) continue;
      consideredIds.add(c.poi.id);
      if (detour < minDetour) continue; // already standing there
      // a walk past seven statues is one idea, not seven: the fourth of a kind is worth less
      const diversity = 0.72 ** (kindCount.get(c.poi.kind) ?? 0);
      const score = (c.novelty * diversity) / Math.sqrt(detour);
      if (!best || score > best.score) {
        best = { c, nodes: pathTo(prev, c.poi.nodeId), seconds: detour, score };
      }
    }

    if (!best || best.nodes.length < 2) break;
    const l = leg(g, best.nodes, best.c.poi, lastBearing);
    legs.push(l);
    elapsed += l.seconds;
    lastBearing = l.path.length > 1 ? bearing(l.path[l.path.length - 2], l.path[l.path.length - 1]) : lastBearing;
    cur = l.toNode;
    chosenIds.add(best.c.poi.id);
    usedNodes.add(best.c.poi.nodeId);
    kindCount.set(best.c.poi.kind, (kindCount.get(best.c.poi.kind) ?? 0) + 1);
  }

  // the last leg always lands on the endpoint
  const last = dijkstra(g, cur);
  const homeNodes = pathTo(last.prev, endNode);
  if (homeNodes.length > 1) {
    const l = leg(g, homeNodes, null, lastBearing);
    legs.push(l);
    elapsed += l.seconds;
  }

  const candidates: Candidate[] = scored
    .map((c) => ({
      poi: c.poi,
      novelty: Math.round(c.novelty * 100) / 100,
      considered: consideredIds.has(c.poi.id),
      chosen: chosenIds.has(c.poi.id),
    }))
    .filter((c) => c.considered)
    .sort((a, b) => Number(b.chosen) - Number(a.chosen) || b.novelty - a.novelty)
    .slice(0, 40);

  return {
    legs,
    totalSeconds: elapsed,
    totalMeters: legs.reduce((s, l) => s + l.meters, 0),
    budgetSeconds,
    start: [start[0], start[1]],
    endpoint,
    candidates,
    novelty: Math.round(legs.reduce((s, l) => s + (l.poi ? novelty(g, l.poi, mood, visited) : 0), 0) * 100) / 100,
  };
}
