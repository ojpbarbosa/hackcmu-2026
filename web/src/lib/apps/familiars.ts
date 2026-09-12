import { z } from 'zod';
import exchangeMock from '../mock/familiars.exchange';
import { hash, makeId } from '../ids';
import type { AppDef, Action, Ctx } from '../rooms';

/** Familiars — a small persona per person, hatched from three answers. Two phones
 *  bump, the familiars talk for ten seconds, and both humans get one line worth
 *  saying out loud. Owned by the familiars agent. */

export type Familiar = {
  id: string;
  name: string;
  /** three characters, unique in the room: the fallback way to meet someone */
  address: string;
  aura: [string, string];
  seeds: [string, string, string];
  keywords: string[];
  human: { name: string; seat: string };
  clusterId: string | null;
  createdAt: number;
  demo?: boolean;
};

export type Bump = {
  /** the pairId from /api/bump, so the same pair is never written twice */
  id: string;
  a: string;
  b: string;
  at: number;
  dialogue: { who: 'a' | 'b'; text: string }[];
  youBoth: string;
  suggestion: string;
};

export type Cluster = { id: string; label: string; color: string; members: string[] };

export type Story = { cards: { label: string; big?: string; text: string }[]; at: number };

export type FamState = {
  code: string;
  familiars: Record<string, Familiar>;
  bumps: Bump[];
  clusters: Cluster[];
  stories: Record<string, Story>;
};

/* ------------------------------------------------------------------ palettes */

/** Eight cluster colours, first four straight from the mockup legend. */
export const CLUSTER_COLORS = ['#10B981', '#6366F1', '#F472B6', '#F59E0B', '#38BDF8', '#A78BFA', '#FB7185', '#2DD4BF'];

/** Aura = [mid, deep]; the orb builds its four gradient stops from the pair. */
const AURAS: [string, string][] = [
  ['#6EE7B7', '#10B981'],
  ['#A5B4FC', '#6366F1'],
  ['#F9A8D4', '#EC4899'],
  ['#FCD34D', '#F59E0B'],
  ['#7DD3FC', '#0EA5E9'],
  ['#C4B5FD', '#8B5CF6'],
  ['#FDA4AF', '#F43F5E'],
  ['#5EEAD4', '#14B8A6'],
];

const ADDRESS_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function auraFor(seed: string): [string, string] {
  return AURAS[hash(seed) % AURAS.length];
}

/** Three characters from A-Z2-9, derived from the member id and nudged on collision. */
export function addressFor(seed: string, taken: Set<string>): string {
  const h = hash(seed);
  for (let attempt = 0; attempt < 64; attempt++) {
    const n = h + attempt * 7919;
    const a = ADDRESS_ALPHABET[(n >>> 0) % ADDRESS_ALPHABET.length];
    const b = ADDRESS_ALPHABET[((n / 32) >>> 0) % ADDRESS_ALPHABET.length];
    const c = ADDRESS_ALPHABET[((n / 1024) >>> 0) % ADDRESS_ALPHABET.length];
    const code = `${a}${b}${c}`;
    if (!taken.has(code)) return code;
  }
  return `${ADDRESS_ALPHABET[h % 32]}${ADDRESS_ALPHABET[(h >>> 5) % 32]}${ADDRESS_ALPHABET[(h >>> 10) % 32]}`;
}

/* ------------------------------------------------------------------ matching */

const norm = (s: string) => s.toLowerCase().trim();

/** Jaccard over keywords, plus a bonus for sharing a cluster. 0..1. */
export function matchScore(a: Familiar, b: Familiar): number {
  const ka = new Set(a.keywords.map(norm).filter(Boolean));
  const kb = new Set(b.keywords.map(norm).filter(Boolean));
  const shared = [...ka].filter((k) => kb.has(k)).length;
  const union = new Set([...ka, ...kb]).size;
  const jaccard = union ? shared / union : 0;
  const bonus = a.clusterId && a.clusterId === b.clusterId ? 0.15 : 0;
  return Math.min(1, jaccard + bonus);
}

export function sharedKeywords(a: Familiar, b: Familiar): string[] {
  const kb = new Set(b.keywords.map(norm));
  return a.keywords.filter((k) => kb.has(norm(k)));
}

export function bumpedIds(state: FamState, meId: string): Set<string> {
  const out = new Set<string>();
  for (const bump of state.bumps) {
    if (bump.a === meId) out.add(bump.b);
    if (bump.b === meId) out.add(bump.a);
  }
  return out;
}

/** The closest person you never bumped. */
export function gotAway(state: FamState, meId: string): { id: string; score: number } | null {
  const me = state.familiars[meId];
  if (!me) return null;
  const met = bumpedIds(state, meId);
  let best: { id: string; score: number } | null = null;
  for (const other of Object.values(state.familiars)) {
    if (other.id === meId || met.has(other.id)) continue;
    const score = matchScore(me, other);
    if (!best || score > best.score || (score === best.score && other.id < best.id)) best = { id: other.id, score };
  }
  return best;
}

export function statsFor(state: FamState, meId: string): { contacts: number; bumps: number; clusters: number } {
  const met = bumpedIds(state, meId);
  const clusters = new Set<string>();
  for (const id of met) {
    const c = state.familiars[id]?.clusterId;
    if (c) clusters.add(c);
  }
  const me = state.familiars[meId]?.clusterId;
  if (me) clusters.add(me);
  return {
    contacts: met.size,
    bumps: state.bumps.filter((b) => b.a === meId || b.b === meId).length,
    clusters: clusters.size,
  };
}

/* ------------------------------------------------------------------ schemas */

const HatchOut = z.object({
  name: z.string().min(1).max(24),
  keywords: z.array(z.string()).min(1).max(8),
  clusterLabel: z.string().min(1).max(40),
});

const ExchangeOut = z.object({
  dialogue: z.array(z.object({ who: z.string().optional(), text: z.string().min(1) })).min(2).max(8),
  youBoth: z.string().min(1),
  suggestion: z.string().min(1),
});

const StoryOut = z.object({
  cards: z.array(z.object({ label: z.string(), big: z.string().optional(), text: z.string() })).min(1).max(4),
});

type ExchangeData = z.infer<typeof ExchangeOut>;

/** Four alternating lines, whatever the model called them. */
function toDialogue(raw: ExchangeData['dialogue']): { who: 'a' | 'b'; text: string }[] {
  return raw.slice(0, 4).map((line, i) => ({ who: (i % 2 === 0 ? 'a' : 'b') as 'a' | 'b', text: line.text.trim() }));
}

/* ------------------------------------------------------------------ clusters */

function upsertCluster(clusters: Cluster[], label: string, memberId: string): Cluster[] {
  const want = norm(label).slice(0, 40) || 'the room';
  const next = clusters.map((c) => ({ ...c, members: [...c.members] }));
  let hit = next.find((c) => norm(c.label) === want);
  if (!hit && next.length >= CLUSTER_COLORS.length) {
    // the room is full: join the cluster that shares a word, else the smallest one
    const words = new Set(want.split(/\s+/));
    hit =
      next.find((c) => norm(c.label).split(/\s+/).some((w) => words.has(w))) ??
      [...next].sort((x, y) => x.members.length - y.members.length)[0];
  }
  if (!hit) {
    hit = { id: `cl_${want.replace(/[^a-z0-9]+/g, '_')}`, label: want, color: CLUSTER_COLORS[next.length], members: [] };
    next.push(hit);
  }
  for (const c of next) c.members = c.members.filter((m) => m !== memberId);
  hit.members.push(memberId);
  return next;
}

/* ------------------------------------------------------------------ demo seed */

const ARCHETYPES = [
  { build: 'I build modular synths at 3 am', cluster: 'modular synths', kw: ['synths', 'eurorack', 'tape loops', 'solder', 'night'] },
  { build: 'I write shaders nobody asked for', cluster: 'graphics', kw: ['shaders', 'raymarching', 'glsl', 'demoscene', 'pixels'] },
  { build: 'I run a wet lab protocol twice a week', cluster: 'wet lab', kw: ['pipettes', 'protocol', 'agar', 'microscope', 'patience'] },
  { build: 'I weld frames for a solar car', cluster: 'solar car', kw: ['welding', 'frames', 'aero', 'battery', 'garage'] },
  { build: 'I cut 16mm film in a closet', cluster: 'film', kw: ['16mm', 'splices', 'grain', 'darkroom', 'archives'] },
  { build: 'I cook for eight and eat alone', cluster: 'kitchen', kw: ['braises', 'sourdough', 'knives', 'markets', 'feeding people'] },
  { build: 'I keep a compiler in a notebook', cluster: 'compilers', kw: ['parsers', 'types', 'bytecode', 'notebooks', 'small languages'] },
  { build: 'I map storm drains on weekends', cluster: 'field notes', kw: ['maps', 'drains', 'walking', 'surveys', 'rain'] },
];

const DEMO_ANIMALS = [
  'moth', 'kestrel', 'heron', 'vole', 'marten', 'swift', 'pike', 'wren', 'otter', 'shrike',
  'lynx', 'grebe', 'newt', 'ibis', 'stoat', 'tern', 'crane', 'hare', 'finch', 'adder',
  'raven', 'perch', 'dunlin', 'sable', 'egret', 'pika', 'merlin', 'chub', 'plover', 'weasel',
  'osprey', 'skink', 'gannet', 'roach', 'mink', 'snipe', 'bittern', 'gecko', 'jackdaw', 'loach',
];

const DEMO_HUMANS = [
  'Ana', 'Devon', 'Priya', 'Malik', 'Sofia', 'Wren', 'Tomás', 'Yuki', 'Nadia', 'Owen',
  'Ife', 'Lucas', 'Mira', 'Bo', 'Rania', 'Jonas', 'Chen', 'Alba', 'Kofi', 'Theo',
  'Noor', 'Ravi', 'Elif', 'Sam', 'Iris', 'Dario', 'Maya', 'Kai', 'Lena', 'Hugo',
  'Ada', 'Nico', 'Zara', 'Paulo', 'Ines', 'Otto', 'Rosa', 'Emeka', 'June', 'Milo',
];

const DEMO_CITIES = ['Recife', 'Lagos', 'Seoul', 'Tbilisi', 'Porto', 'Chennai', 'Kraków', 'Quito', 'Osaka', 'Lima', 'Nairobi', 'Belgrade'];
const DEMO_TRUTHS = [
  'Night owl, obviously',
  'I have never finished a book on the first try',
  'I walk the long way home',
  'I read menus for fun',
  'I still have my first keyboard',
  'I talk to the machines',
  'I have not slept since Thursday',
  'I keep every ticket stub',
];
const DEMO_SEATS = [
  '2nd floor, by the windows',
  'Tepper atrium, near the coffee',
  'ground floor, under the stairs',
  '3rd floor, the loud table',
  'by the whiteboard wall',
  'back row, next to the plug',
  'the couches by the door',
  'mezzanine, left side',
];

function demoFamiliar(i: number, at: number, taken: Set<string>): Familiar {
  const arch = ARCHETYPES[i % ARCHETYPES.length];
  const id = `demo_${i}`;
  const city = DEMO_CITIES[(i * 5) % DEMO_CITIES.length];
  const address = addressFor(`demo-${i}`, taken);
  taken.add(address);
  return {
    id,
    name: DEMO_ANIMALS[i % DEMO_ANIMALS.length],
    address,
    aura: auraFor(id),
    seeds: [arch.build, `${city}, then Pittsburgh`, DEMO_TRUTHS[(i * 3) % DEMO_TRUTHS.length]],
    keywords: [...arch.kw.slice(0, 4), city.toLowerCase()],
    human: { name: DEMO_HUMANS[i % DEMO_HUMANS.length], seat: DEMO_SEATS[(i * 3) % DEMO_SEATS.length] },
    clusterId: null,
    createdAt: at - (40 - i) * 60_000,
    demo: true,
  };
}

/** Synthetic villagers so the stage is a village and not three dots. Authored
 *  content, generated locally: no model call, so the ladder stays honest. */
function seedDemo(state: FamState, n: number, at: number): FamState {
  const count = Object.keys(state.familiars).length;
  if (count >= 20) return state;
  const wanted = Math.max(0, Math.min(40, Math.round(n)));
  const taken = new Set(Object.values(state.familiars).map((f) => f.address));
  const familiars = { ...state.familiars };
  let clusters = state.clusters;
  const added: Familiar[] = [];
  for (let i = 0; i < wanted; i++) {
    if (familiars[`demo_${i}`]) continue;
    const f = demoFamiliar(i, at, taken);
    clusters = upsertCluster(clusters, ARCHETYPES[i % ARCHETYPES.length].cluster, f.id);
    f.clusterId = clusters.find((c) => c.members.includes(f.id))?.id ?? null;
    familiars[f.id] = f;
    added.push(f);
  }
  const bumps = [...state.bumps];
  const pairCount = Math.round(added.length * 0.6);
  for (let i = 0; i < pairCount; i++) {
    const a = added[i % added.length];
    // two in three meetings happen inside a scene (the archetypes cycle every 8),
    // the rest cross the room
    const b = added[(i % 3 === 2 ? i * 3 + 1 : i + ARCHETYPES.length) % added.length];
    if (!a || !b || a.id === b.id) continue;
    if (bumps.some((x) => (x.a === a.id && x.b === b.id) || (x.a === b.id && x.b === a.id))) continue;
    const raw = exchangeMock(
      {
        a: { name: a.name, seeds: a.seeds, keywords: a.keywords, human: a.human.name, seat: a.human.seat },
        b: { name: b.name, seeds: b.seeds, keywords: b.keywords, human: b.human.name, seat: b.human.seat },
      },
      hash(`${a.id}:${b.id}`),
    );
    bumps.push({
      id: `demo_pair_${i}`,
      a: a.id,
      b: b.id,
      at: at - (pairCount - i) * 45_000,
      dialogue: toDialogue(raw.dialogue),
      youBoth: raw.youBoth,
      suggestion: raw.suggestion,
    });
  }
  return { ...state, familiars, clusters, bumps };
}

/* ------------------------------------------------------------------ reducer */

async function makeBump(
  state: FamState,
  ctx: Ctx,
  pairId: string,
  aId: string,
  bId: string,
  at: number,
): Promise<FamState> {
  if (state.bumps.some((b) => b.id === pairId)) return state;
  const a = state.familiars[aId];
  const b = state.familiars[bId];
  if (!a || !b || a.id === b.id) return state;

  const { data } = await ctx.llm.json(
    'familiars.exchange',
    {
      a: { name: a.name, seeds: a.seeds, keywords: a.keywords, human: a.human.name, seat: a.human.seat },
      b: { name: b.name, seeds: b.seeds, keywords: b.keywords, human: b.human.name, seat: b.human.seat },
    },
    { app: 'familiars', code: ctx.code, schema: ExchangeOut },
  );

  const bump: Bump = {
    id: pairId,
    a: a.id,
    b: b.id,
    at,
    dialogue: toDialogue(data.dialogue),
    youBoth: data.youBoth.trim(),
    suggestion: data.suggestion.trim(),
  };
  return { ...state, bumps: [...state.bumps, bump] };
}

async function reduce(state: FamState, action: Action, ctx: Ctx): Promise<FamState> {
  const at = action.now;

  switch (action.name) {
    case 'hatch': {
      const payload = (action.payload ?? {}) as { seeds?: string[]; human?: { name?: string; seat?: string } };
      const seeds = (payload.seeds ?? []).map((s) => String(s).trim()).filter(Boolean);
      if (seeds.length < 3) return state;
      if (state.familiars[action.memberId]) return state;

      const human = {
        name: (payload.human?.name ?? ctx.members[action.memberId]?.name ?? 'someone').trim(),
        seat: (payload.human?.seat ?? ctx.members[action.memberId]?.seat ?? '').trim(),
      };

      const { data } = await ctx.llm.json(
        'familiars.hatch',
        { seeds, human: { name: human.name } },
        { app: 'familiars', code: ctx.code, schema: HatchOut },
      );

      const taken = new Set(Object.values(state.familiars).map((f) => f.address));
      const familiar: Familiar = {
        id: action.memberId,
        name: norm(data.name).replace(/[^a-z0-9-]/g, '').slice(0, 16) || 'moth',
        address: addressFor(action.memberId, taken),
        aura: auraFor(action.memberId),
        seeds: [seeds[0], seeds[1], seeds[2]],
        keywords: [...new Set(data.keywords.map(norm).filter(Boolean))].slice(0, 5),
        human,
        clusterId: null,
        createdAt: at,
      };
      const clusters = upsertCluster(state.clusters, data.clusterLabel, familiar.id);
      familiar.clusterId = clusters.find((c) => c.members.includes(familiar.id))?.id ?? null;
      return { ...state, familiars: { ...state.familiars, [familiar.id]: familiar }, clusters };
    }

    case 'bumpPaired': {
      const p = (action.payload ?? {}) as { pairId?: string; a?: string; b?: string };
      if (!p.pairId || !p.a || !p.b) return state;
      return makeBump(state, ctx, p.pairId, p.a, p.b, at);
    }

    case 'bumpByAddress': {
      const p = (action.payload ?? {}) as { address?: string };
      const address = String(p.address ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const other = Object.values(state.familiars).find((f) => f.address === address);
      if (!other || other.id === action.memberId) return state;
      const existing = state.bumps.find(
        (b) =>
          (b.a === action.memberId && b.b === other.id) || (b.b === action.memberId && b.a === other.id),
      );
      if (existing) return state;
      return makeBump(state, ctx, makeId('pair'), action.memberId, other.id, at);
    }

    case 'story': {
      const me = state.familiars[action.memberId];
      if (!me) return state;
      const mine = state.bumps.filter((b) => b.a === me.id || b.b === me.id);
      const away = gotAway(state, me.id);
      const awayF = away ? state.familiars[away.id] : null;
      const { data } = await ctx.llm.json(
        'familiars.story',
        {
          me: { name: me.name, human: me.human.name, seeds: me.seeds, keywords: me.keywords },
          bumps: mine.map((b) => {
            const otherId = b.a === me.id ? b.b : b.a;
            const other = state.familiars[otherId];
            const theirSide = b.a === me.id ? 'b' : 'a';
            const theirLines = b.dialogue.filter((d) => d.who === theirSide);
            return {
              with: other?.name ?? 'someone',
              youBoth: b.youBoth,
              line: theirLines[theirLines.length - 1]?.text ?? '',
            };
          }),
          clusters: state.clusters.map((c) => ({ label: c.label, size: c.members.length, mine: c.id === me.clusterId })),
          roomSize: Object.keys(state.familiars).length,
          gotAway:
            away && awayF
              ? {
                  score: Math.round(away.score * 100),
                  shared: sharedKeywords(me, awayF),
                  cluster: state.clusters.find((c) => c.id === awayF.clusterId)?.label ?? '',
                }
              : null,
        },
        { app: 'familiars', code: ctx.code, schema: StoryOut },
      );
      const cards = data.cards.slice(0, 3).map((c) => ({ label: norm(c.label), big: c.big || undefined, text: c.text.trim() }));
      return { ...state, stories: { ...state.stories, [me.id]: { cards, at } } };
    }

    case 'seedDemo': {
      const p = (action.payload ?? {}) as { n?: number };
      return seedDemo(state, Number(p.n ?? 40), at);
    }

    default:
      return state;
  }
}

export const familiars: AppDef<FamState> = {
  initial: (code) => ({ code, familiars: {}, bumps: [], clusters: [], stories: {} }),
  reduce,
};
