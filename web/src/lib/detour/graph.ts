/** The Oakland walking graph. Server-side only — `oakland.json` is ~900 KB and must
 *  never reach the phone; the client gets the finished walk out of the room state. */
import raw from './oakland.json';
import { bearing, haversine, turnFrom, type LatLng } from './geo';

export { bearing, haversine, turnFrom };
export type { LatLng };

export type Poi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
  tags: Record<string, string>;
  nodeId: string;
};

export type Edge = { to: string; m: number; street: string };

export type Graph = {
  bbox: [number, number, number, number];
  nodes: Record<string, LatLng>;
  adj: Record<string, Edge[]>;
  pois: Poi[];
};

type RawGraph = {
  bbox: [number, number, number, number];
  nodes: Record<string, LatLng>;
  edges: [string, string, number, string][];
  pois: Poi[];
};

let cached: Graph | null = null;

/** Parsed once per process. */
export function loadGraph(): Graph {
  if (cached) return cached;
  const data = raw as unknown as RawGraph;
  const adj: Record<string, Edge[]> = {};
  for (const [a, b, m, street] of data.edges) {
    (adj[a] ??= []).push({ to: b, m, street });
    (adj[b] ??= []).push({ to: a, m, street });
  }
  cached = { bbox: data.bbox, nodes: data.nodes, adj, pois: data.pois };
  return cached;
}

/** Nearest graph node to a coordinate (linear scan; the graph is ~11k nodes). */
export function nearestNode(g: Graph, lat: number, lng: number): string {
  let best = '';
  let bestM = Infinity;
  for (const id in g.nodes) {
    const p = g.nodes[id];
    // cheap rejection before the trig
    const dy = p[0] - lat;
    const dx = (p[1] - lng) * 0.76;
    const approx = dy * dy + dx * dx;
    if (approx >= bestM) continue;
    bestM = approx;
    best = id;
  }
  return best;
}

class Heap {
  private a: [number, string][] = [];
  get size() {
    return this.a.length;
  }
  push(item: [number, string]) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): [number, string] | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop() as [number, string];
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let s = i;
        if (l < a.length && a[l][0] < a[s][0]) s = l;
        if (r < a.length && a[r][0] < a[s][0]) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]];
        i = s;
      }
    }
    return top;
  }
}

/** Shortest walking distance in metres from `from` to every reachable node. */
export function dijkstra(g: Graph, from: string): { dist: Record<string, number>; prev: Record<string, string> } {
  const dist: Record<string, number> = { [from]: 0 };
  const prev: Record<string, string> = {};
  const done = new Set<string>();
  const q = new Heap();
  q.push([0, from]);
  while (q.size) {
    const top = q.pop();
    if (!top) break;
    const [d, u] = top;
    if (done.has(u)) continue;
    done.add(u);
    for (const e of g.adj[u] ?? []) {
      const nd = d + e.m;
      if (nd < (dist[e.to] ?? Infinity)) {
        dist[e.to] = nd;
        prev[e.to] = u;
        q.push([nd, e.to]);
      }
    }
  }
  return { dist, prev };
}

/** Node ids from the dijkstra source to `to`, source first. */
export function pathTo(prev: Record<string, string>, to: string): string[] {
  const out: string[] = [to];
  let cur = to;
  while (prev[cur] !== undefined) {
    cur = prev[cur];
    out.push(cur);
  }
  out.reverse();
  return out;
}

export function pathLatLng(g: Graph, nodeIds: string[]): LatLng[] {
  return nodeIds.map((id) => g.nodes[id]).filter(Boolean);
}

/** Distinct named streets along a path, in order. */
export function streetsAlong(g: Graph, nodeIds: string[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < nodeIds.length; i++) {
    const e = (g.adj[nodeIds[i - 1]] ?? []).find((x) => x.to === nodeIds[i]);
    const s = e?.street;
    if (s && s !== out[out.length - 1]) out.push(s);
  }
  return out;
}

/** Metres walked along a node path. */
export function pathMeters(g: Graph, nodeIds: string[]): number {
  let m = 0;
  for (let i = 1; i < nodeIds.length; i++) {
    const e = (g.adj[nodeIds[i - 1]] ?? []).find((x) => x.to === nodeIds[i]);
    m += e ? e.m : haversine(g.nodes[nodeIds[i - 1]], g.nodes[nodeIds[i]]);
  }
  return m;
}
