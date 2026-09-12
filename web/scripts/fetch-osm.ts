/* Build the Oakland walking graph used by Detour.
 *
 *   pnpm tsx scripts/fetch-osm.ts                 # fetch from Overpass (skips if the file exists)
 *   pnpm tsx scripts/fetch-osm.ts --force         # fetch again
 *   pnpm tsx scripts/fetch-osm.ts --from raw.json # build from a cached Overpass response, no network
 *
 * Output: src/lib/detour/oakland.json
 *   {bbox, nodes:{id:[lat,lng]}, edges:[[a,b,meters,street]], pois:[{id,name,lat,lng,kind,tags,nodeId}]}
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'src/lib/detour/oakland.json');

/** south, west, north, east — the Oakland box from the spec. */
export const BBOX: [number, number, number, number] = [40.437, -79.965, 40.452, -79.935];

const WALKABLE =
  'footway|path|pedestrian|residential|living_street|service|tertiary|secondary|primary|steps|unclassified';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const QUERY = `[out:json][timeout:120];
(
  way["highway"~"${WALKABLE}"](${BBOX.join(',')});
  node["name"]["amenity"](${BBOX.join(',')});
  node["name"]["shop"](${BBOX.join(',')});
  node["name"]["tourism"](${BBOX.join(',')});
  node["name"]["leisure"](${BBOX.join(',')});
  node["name"]["historic"](${BBOX.join(',')});
  way["name"]["amenity"](${BBOX.join(',')});
  way["name"]["shop"](${BBOX.join(',')});
  way["name"]["tourism"](${BBOX.join(',')});
  way["name"]["leisure"](${BBOX.join(',')});
  way["name"]["historic"](${BBOX.join(',')});
);
(._;>;);
out body;`;

type El = {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
};

const POI_KEYS = ['amenity', 'shop', 'tourism', 'leisure', 'historic'] as const;
const KEEP_TAGS = [...POI_KEYS, 'cuisine', 'name', 'opening_hours', 'outdoor_seating'] as const;

/** Categories that are noise on a walk: parking, waste, benches without a story. */
const SKIP_KINDS = new Set([
  'parking',
  'parking_entrance',
  'parking_space',
  'bicycle_parking',
  'waste_basket',
  'waste_disposal',
  'vending_machine',
  'car_sharing',
  'charging_station',
  'shelter',
  'driving_school',
  'grave_yard',
]);

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const inBox = (lat: number, lng: number) =>
  lat >= BBOX[0] && lat <= BBOX[2] && lng >= BBOX[1] && lng <= BBOX[3];

async function fetchOverpass(): Promise<{ elements: El[] }> {
  let lastError: unknown = null;
  for (const url of ENDPOINTS) {
    try {
      process.stderr.write(`overpass: ${url}\n`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: QUERY }),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as { elements: El[] };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('overpass unreachable');
}

export function build(elements: El[]) {
  const rawNodes = new Map<number, [number, number]>();
  for (const el of elements) {
    if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      rawNodes.set(el.id, [el.lat, el.lon]);
    }
  }

  // 1. edges from walkable ways, keeping only segments fully inside the bbox
  const nodes: Record<string, [number, number]> = {};
  const edges: [string, string, number, string][] = [];
  const seen = new Set<string>();
  const use = (id: number): string | null => {
    const p = rawNodes.get(id);
    if (!p || !inBox(p[0], p[1])) return null;
    const key = String(id);
    if (!nodes[key]) nodes[key] = [round6(p[0]), round6(p[1])];
    return key;
  };

  for (const el of elements) {
    if (el.type !== 'way' || !el.nodes) continue;
    const hw = el.tags?.highway;
    if (!hw || !new RegExp(`^(${WALKABLE})$`).test(hw)) continue;
    const street = el.tags?.name ?? '';
    for (let i = 1; i < el.nodes.length; i++) {
      const a = use(el.nodes[i - 1]);
      const b = use(el.nodes[i]);
      if (!a || !b || a === b) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const m = Math.round(haversine(nodes[a], nodes[b]) * 10) / 10;
      if (m === 0) continue;
      edges.push([a, b, m, street]);
    }
  }

  // drop nodes that ended up with no edge
  const used = new Set<string>();
  for (const [a, b] of edges) {
    used.add(a);
    used.add(b);
  }
  for (const id of Object.keys(nodes)) if (!used.has(id)) delete nodes[id];

  // 2. POIs: named nodes and named ways (way = centroid of its nodes)
  const nodeList = Object.entries(nodes) as [string, [number, number]][];
  const nearest = (lat: number, lng: number): { id: string; m: number } => {
    let best = { id: '', m: Infinity };
    for (const [id, p] of nodeList) {
      const m = haversine([lat, lng], p);
      if (m < best.m) best = { id, m };
    }
    return best;
  };

  const pois: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    kind: string;
    tags: Record<string, string>;
    nodeId: string;
  }[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name;
    if (!name) continue;
    const key = POI_KEYS.find((k) => tags[k]);
    if (!key) continue;
    const kind = tags[key];
    if (SKIP_KINDS.has(kind)) continue;

    let lat: number | undefined;
    let lng: number | undefined;
    if (el.type === 'node') {
      lat = el.lat;
      lng = el.lon;
    } else if (el.nodes?.length) {
      const pts = el.nodes.map((n) => rawNodes.get(n)).filter(Boolean) as [number, number][];
      if (!pts.length) continue;
      lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    }
    if (lat === undefined || lng === undefined || !inBox(lat, lng)) continue;

    const near = nearest(lat, lng);
    if (!near.id || near.m > 120) continue; // unreachable from the walking graph
    const kept: Record<string, string> = {};
    for (const t of KEEP_TAGS) if (tags[t]) kept[t] = tags[t];
    pois.push({
      id: `${el.type[0]}${el.id}`,
      name,
      lat: round6(lat),
      lng: round6(lng),
      kind,
      tags: kept,
      nodeId: near.id,
    });
  }

  // one POI per name+kind (OSM often has a node and a way for the same place)
  const byName = new Map<string, (typeof pois)[number]>();
  for (const p of pois) {
    const k = `${p.name}|${p.kind}`;
    if (!byName.has(k)) byName.set(k, p);
  }

  return { bbox: BBOX, nodes, edges, pois: [...byName.values()] };
}

async function main() {
  const argv = process.argv.slice(2);
  const from = argv.includes('--from') ? argv[argv.indexOf('--from') + 1] : null;
  const force = argv.includes('--force');

  if (!from && !force && existsSync(OUT)) {
    process.stderr.write(`fetch-osm: ${OUT} already exists (use --force to refetch)\n`);
    return;
  }

  const raw = from
    ? (JSON.parse(readFileSync(resolve(from), 'utf8')) as { elements: El[] })
    : await fetchOverpass();

  const out = build(raw.elements);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  const kb = Math.round(readFileSync(OUT).byteLength / 1024);
  process.stderr.write(
    `fetch-osm: ${Object.keys(out.nodes).length} nodes, ${out.edges.length} edges, ${out.pois.length} pois → ${OUT} (${kb} KB)\n`,
  );
}

main().catch((e) => {
  process.stderr.write(`fetch-osm: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
