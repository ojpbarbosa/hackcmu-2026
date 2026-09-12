import { z } from 'zod';
import exchangeMock from '../mock/familiars.exchange';
import { traitsFor, nameFor, type Traits } from '../familiars/creature';
import { runScout } from '../familiars/scout';
import { hash, pairIdFor } from '../ids';
import type { AppDef, Action, Ctx } from '../rooms';

/** Familiars v2 — one familiar per person, hatched from a spoken introduction.
 *  Arm, wiggle, catch: two familiars talk, both humans get one line worth saying
 *  out loud. Owned by the familiars agent. */

export type Pronouns = 'he/him' | 'she/her' | 'they/them' | string;
export type { Traits };
export type Species = Traits['species'];

export type Familiar = {
  id: string;
  name: string;
  human: { name: string; pronouns: Pronouns };
  transcript: string;
  keywords: string[];
  clusterLabel: string;
  greeting: string;
  traits: Traits;
  voice: number;
  createdAt: number;
  demo?: boolean;
};

export type Pair = {
  id: string;
  a: string;
  b: string;
  at: number;
  lines: { who: 'a' | 'b'; text: string }[];
  youBoth: string;
  say: string;
  talked?: boolean;
};

export type Card = {
  id: string;
  title: string;
  whenISO: string | null;
  where: string;
  cost: string;
  kind: 'listed_event' | 'self_organized';
  source?: string;
  cached?: boolean;
  why: string;
  image?: string;
};

export type FamState = {
  code: string;
  familiars: Record<string, Familiar>;
  casting: Record<string, { armedAt: number }>;
  pendingCasts: { id: string; from: string; at: number }[];
  pairs: Pair[];
  intros: Record<string, { to: string; via: string; line: string; at: number }>;
  scout: {
    brief: string;
    status: string[];
    cards: Card[];
    swipes: Record<string, Record<string, 'in' | 'out'>>;
    match: string | null;
    startedAt: number;
  } | null;
  cast: { question: string; hook: string; at: number; answers: Record<string, string> } | null;
  recaps: Record<string, { cards: { label: string; big?: string; text: string }[]; at: number }>;
};

export const CAST_TTL_MS = 20000;
const ARM_TTL_MS = 10 * 60 * 1000;
const SCOUT_COOLDOWN_MS = 60_000;
const NAME_OK = /^[A-Z][a-z]{2,11}$/;

function initial(code: string): FamState {
  return {
    code,
    familiars: {},
    casting: {},
    pendingCasts: [],
    pairs: [],
    intros: {},
    scout: null,
    cast: null,
    recaps: {},
  };
}

/* ----------------------------------------------------------------- selectors */

/** Everyone I have actually met (either side of a pair). */
export function metIds(state: FamState, me: string): Set<string> {
  const out = new Set<string>();
  for (const p of state.pairs) {
    if (p.a === me) out.add(p.b);
    else if (p.b === me) out.add(p.a);
  }
  return out;
}

export function sharedKeywords(a: Familiar, b: Familiar): string[] {
  const set = new Set((b.keywords ?? []).map((k) => k.toLowerCase()));
  return (a.keywords ?? []).filter((k) => set.has(k.toLowerCase()));
}

/** The people I met, grouped by the strongest keyword each of us shares with me. */
export function webGroups(state: FamState, me: string): { label: string; members: string[] }[] {
  const mine = state.familiars[me];
  if (!mine) return [];
  const groups = new Map<string, string[]>();
  for (const id of metIds(state, me)) {
    const them = state.familiars[id];
    if (!them) continue;
    const shared = sharedKeywords(mine, them);
    const label = shared[0] ?? them.clusterLabel ?? 'the long way round';
    groups.set(label, [...(groups.get(label) ?? []), id]);
  }
  return [...groups.entries()]
    .map(([label, members]) => ({ label, members }))
    .sort((x, y) => y.members.length - x.members.length);
}

/** Paired with someone I paired with, but not with me. */
export function friendsOfFriends(state: FamState, me: string): string[] {
  const met = metIds(state, me);
  const out = new Set<string>();
  for (const p of state.pairs) {
    const inA = met.has(p.a);
    const inB = met.has(p.b);
    if (inA && !met.has(p.b) && p.b !== me) out.add(p.b);
    if (inB && !met.has(p.a) && p.a !== me) out.add(p.a);
  }
  return [...out];
}

/** Hatched people I have not met, most shared keywords first, with a mutual
 *  friend who could make the introduction when there is one. */
export function keepMissing(state: FamState, me: string): { id: string; shared: string[]; via: string | null }[] {
  const mine = state.familiars[me];
  if (!mine) return [];
  const met = metIds(state, me);
  const rows = Object.values(state.familiars)
    .filter((f) => f.id !== me && !met.has(f.id))
    .map((f) => ({ id: f.id, shared: sharedKeywords(mine, f), via: viaFor(state, me, f.id) }))
    .sort((a, b) => b.shared.length - a.shared.length);
  return rows.slice(0, 5);
}

export function activeCasts(state: FamState, now: number): FamState['pendingCasts'] {
  return state.pendingCasts.filter((c) => now - c.at < CAST_TTL_MS);
}

/** The card every hatched, non-demo member swiped in on. */
export function isMatch(state: FamState): Card | null {
  const s = state.scout;
  if (!s) return null;
  if (s.match) return s.cards.find((c) => c.id === s.match) ?? null;
  return null;
}

function realMembers(state: FamState): string[] {
  return Object.values(state.familiars)
    .filter((f) => !f.demo)
    .map((f) => f.id);
}

/** Who could introduce me to `them`: someone paired with both of us, else the
 *  person paired with them who shares the most keywords with me. */
function viaFor(state: FamState, me: string, them: string): string | null {
  const myMet = metIds(state, me);
  const theirMet = metIds(state, them);
  const both = [...myMet].filter((id) => theirMet.has(id));
  if (both.length) return both[0];
  const mine = state.familiars[me];
  if (!mine) return null;
  let best: { id: string; n: number } | null = null;
  for (const id of theirMet) {
    const f = state.familiars[id];
    if (!f || id === me) continue;
    const n = sharedKeywords(mine, f).length;
    if (!best || n > best.n) best = { id, n };
  }
  return best?.id ?? null;
}

/* ------------------------------------------------------------------- schemas */

export const HatchOut = z.object({
  humanName: z.string().min(0).max(24),
  pronouns: z.string().max(16),
  familiarName: z.string().max(24),
  keywords: z.array(z.string()).min(1).max(8),
  clusterLabel: z.string().max(40),
  greeting: z.string().max(140),
});

const ExchangeOut = z.object({
  lines: z.array(z.object({ who: z.enum(['a', 'b']), text: z.string() })).min(1),
  youBoth: z.string(),
  say: z.string(),
});

const IntroOut = z.object({ line: z.string().min(1).max(200) });

const RecapOut = z.object({
  cards: z.array(z.object({ label: z.string(), big: z.string().optional(), text: z.string() })).min(1),
});

const CastOut = z.object({ question: z.string().max(120), hook: z.string().max(120) });

/* -------------------------------------------------------------------- helpers */

function prune(state: FamState, now: number): FamState {
  const pendingCasts = state.pendingCasts.filter((c) => now - c.at < CAST_TTL_MS);
  const casting: FamState['casting'] = {};
  for (const [id, v] of Object.entries(state.casting)) {
    if (now - v.armedAt < ARM_TTL_MS) casting[id] = v;
  }
  const samePending = pendingCasts.length === state.pendingCasts.length;
  const sameCasting = Object.keys(casting).length === Object.keys(state.casting).length;
  if (samePending && sameCasting) return state;
  return { ...state, pendingCasts, casting };
}

function takenNames(state: FamState): Set<string> {
  return new Set(Object.values(state.familiars).map((f) => f.name));
}

function circleKeywords(state: FamState): string[] {
  const counts = new Map<string, number>();
  for (const f of Object.values(state.familiars)) {
    for (const k of f.keywords ?? []) counts.set(k.toLowerCase(), (counts.get(k.toLowerCase()) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 8);
}

const side = (f: Familiar) => ({
  name: f.name,
  human: f.human.name,
  pronouns: f.human.pronouns,
  keywords: f.keywords,
  transcript: (f.transcript ?? '').slice(0, 240),
});

function makePair(id: string, a: Familiar, b: Familiar, at: number, raw: z.infer<typeof ExchangeOut>): Pair {
  const lines = raw.lines.slice(0, 4).map((l, i) => ({ who: (i % 2 === 0 ? 'a' : 'b') as 'a' | 'b', text: l.text }));
  return { id, a: a.id, b: b.id, at, lines, youBoth: raw.youBoth, say: raw.say };
}

/* ------------------------------------------------------------------ seed demo */

const ARCHETYPES = [
  { transcript: "I'm here building modular synths at 3 am", cluster: 'modular synths', kw: ['synths', 'eurorack', 'tape loops', 'solder', 'night'] },
  { transcript: 'I write shaders nobody asked for', cluster: 'graphics', kw: ['shaders', 'raymarching', 'glsl', 'demoscene', 'pixels'] },
  { transcript: 'I run a wet lab protocol twice a week', cluster: 'wet lab', kw: ['pipettes', 'protocol', 'agar', 'microscope', 'patience'] },
  { transcript: 'I weld frames for a solar car', cluster: 'solar car', kw: ['welding', 'frames', 'aero', 'battery', 'garage'] },
  { transcript: 'I cut 16mm film in a closet', cluster: 'film', kw: ['16mm', 'splices', 'grain', 'darkroom', 'archives'] },
  { transcript: 'I cook for eight and eat alone', cluster: 'kitchen', kw: ['braises', 'sourdough', 'knives', 'markets', 'feeding people'] },
  { transcript: 'I keep a compiler in a notebook', cluster: 'compilers', kw: ['parsers', 'types', 'bytecode', 'notebooks', 'small languages'] },
  { transcript: 'I map storm drains on weekends', cluster: 'field notes', kw: ['maps', 'drains', 'walking', 'surveys', 'rain'] },
];

const DEMO_HUMANS = ['Ana', 'Devon', 'Priya', 'Malik', 'Sofia', 'Wren', 'Tomás', 'Yuki', 'Nadia', 'Owen', 'Ife', 'Lucas'];
const DEMO_CITIES = ['Recife', 'Lagos', 'Seoul', 'Tbilisi', 'Porto', 'Chennai', 'Kraków', 'Quito', 'Osaka', 'Lima', 'Nairobi', 'Belgrade'];
const PRONOUN_CYCLE: Pronouns[] = ['he/him', 'she/her', 'they/them'];
const GREETINGS = [
  'Mine has not slept since Thursday and is proud of it.',
  'We came for the thing in the bag.',
  'There is a half-finished one at home, still humming.',
];

function demoFamiliar(i: number, at: number, taken: Set<string>): Familiar {
  const arch = ARCHETYPES[i % ARCHETYPES.length];
  const id = `demo_${i}`;
  const city = DEMO_CITIES[(i * 5) % DEMO_CITIES.length];
  const name = nameFor(id, taken);
  taken.add(name);
  const traits = traitsFor(id);
  return {
    id,
    name,
    human: { name: DEMO_HUMANS[i % DEMO_HUMANS.length], pronouns: PRONOUN_CYCLE[i % 3] },
    transcript: `${arch.transcript}. From ${city}, then Pittsburgh.`,
    keywords: [...arch.kw.slice(0, 4), city.toLowerCase()],
    clusterLabel: arch.cluster,
    greeting: GREETINGS[i % GREETINGS.length],
    traits,
    voice: traits.hue,
    createdAt: at - (40 - i) * 60_000,
    demo: true,
  };
}

function pairLocally(state: FamState, a: Familiar, b: Familiar, at: number): Pair | null {
  const id = pairIdFor(a.id, b.id);
  if (state.pairs.some((p) => p.id === id)) return null;
  const raw = exchangeMock({ a: side(a), b: side(b) }, hash(`${a.id}:${b.id}`)) as z.infer<typeof ExchangeOut>;
  return makePair(id, a, b, at, raw);
}

/** Authored villagers so the web is a web and not one dot. No model call, so the
 *  ladder stays honest. */
function seedDemo(state: FamState, n: number, at: number): FamState {
  const wanted = Math.max(0, Math.min(12, Math.round(n || 8)));
  const taken = takenNames(state);
  const familiars = { ...state.familiars };
  const added: Familiar[] = [];
  for (let i = 0; i < wanted; i++) {
    if (familiars[`demo_${i}`]) continue;
    const f = demoFamiliar(i, at, taken);
    familiars[f.id] = f;
    added.push(f);
  }
  if (!added.length) return state;

  const next: FamState = { ...state, familiars };
  const pairs = [...state.pairs];
  const push = (a?: Familiar, b?: Familiar) => {
    if (!a || !b || a.id === b.id) return;
    const p = pairLocally({ ...next, pairs }, a, b, at);
    if (p) pairs.push(p);
  };

  const count = Math.round(added.length * 0.6);
  for (let i = 0; i < count; i++) {
    push(added[i % added.length], added[(i % 3 === 2 ? i * 3 + 1 : i + 3) % added.length]);
  }

  // a real person is here: hang four demos off them so the web has a centre
  const real = Object.values(familiars).find((f) => !f.demo);
  if (real) for (let i = 0; i < 4; i++) push(familiars[`demo_${i}`], real);

  return { ...next, pairs };
}

/* -------------------------------------------------------------------- reduce */

async function reduce(prev: FamState, action: Action, ctx: Ctx): Promise<FamState> {
  const state = prune(prev, action.now);
  const me = action.memberId;
  const p = action.payload ?? {};

  switch (action.name) {
    case 'hatch': {
      if (state.familiars[me]) return state;
      const transcript = String(p.transcript ?? '').trim();
      if (transcript.length < 12) return state;
      const taken = takenNames(state);
      const suggestedName = nameFor(me, taken);
      const { data } = await ctx.llm.json('familiars.hatch', { transcript, suggestedName }, {
        app: ctx.app,
        code: ctx.code,
        schema: HatchOut,
        effort: 'low',
        maxTokens: 1200,
      });
      const proposed = (data.familiarName ?? '').trim();
      const name = NAME_OK.test(proposed) && !taken.has(proposed) ? proposed : suggestedName;
      const traits = traitsFor(me);
      const familiar: Familiar = {
        id: me,
        name,
        human: {
          name: data.humanName.trim() || ctx.members[me]?.name || 'someone',
          pronouns: data.pronouns.trim() || 'they/them',
        },
        transcript,
        keywords: data.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean).slice(0, 5),
        clusterLabel: data.clusterLabel.trim(),
        greeting: data.greeting.trim(),
        traits,
        voice: traits.hue,
        createdAt: action.now,
      };
      const member = ctx.members[me];
      if (member) member.name = familiar.human.name;
      return { ...state, familiars: { ...state.familiars, [me]: familiar } };
    }

    case 'forget': {
      // start over: this person leaves the room entirely
      const familiars = { ...state.familiars };
      delete familiars[me];
      const casting = { ...state.casting };
      delete casting[me];
      const intros: FamState['intros'] = {};
      for (const [k, v] of Object.entries(state.intros)) if (!k.startsWith(`${me}:`) && v.to !== me && v.via !== me) intros[k] = v;
      const recaps = { ...state.recaps };
      delete recaps[me];
      delete ctx.members[me];
      return {
        ...state,
        familiars,
        casting,
        intros,
        recaps,
        pendingCasts: state.pendingCasts.filter((c) => c.from !== me),
        pairs: state.pairs.filter((x) => x.a !== me && x.b !== me),
      };
    }

    case 'arm': {
      if (!state.familiars[me]) return state;
      return { ...state, casting: { ...state.casting, [me]: { armedAt: action.now } } };
    }

    case 'disarm': {
      if (!state.casting[me]) return state;
      const casting = { ...state.casting };
      delete casting[me];
      return { ...state, casting, pendingCasts: state.pendingCasts.filter((c) => c.from !== me) };
    }

    case 'wiggle': {
      if (!state.casting[me] || !state.familiars[me]) return state;
      const pendingCasts = state.pendingCasts.filter((c) => c.from !== me);
      pendingCasts.push({ id: `cast_${me}_${action.now}`, from: me, at: action.now });
      return { ...state, pendingCasts };
    }

    case 'catch': {
      const cast = state.pendingCasts.find((c) => c.id === String(p.castId ?? ''));
      if (!cast || cast.from === me) return state;
      if (action.now - cast.at >= CAST_TTL_MS) return state;
      const a = state.familiars[cast.from];
      const b = state.familiars[me];
      if (!a || !b) return state;
      const id = pairIdFor(a.id, b.id);
      const pendingCasts = state.pendingCasts.filter((c) => c.id !== cast.id);
      const casting = { ...state.casting };
      delete casting[a.id];
      delete casting[b.id];
      if (state.pairs.some((x) => x.id === id)) return { ...state, pendingCasts, casting };
      const { data } = await ctx.llm.json('familiars.exchange', { a: side(a), b: side(b) }, {
        app: ctx.app,
        code: ctx.code,
        schema: ExchangeOut,
        effort: 'low',
        maxTokens: 1200,
      });
      return { ...state, pendingCasts, casting, pairs: [...state.pairs, makePair(id, a, b, action.now, data)] };
    }

    case 'talked': {
      const id = String(p.pairId ?? '');
      if (!state.pairs.some((x) => x.id === id && !x.talked)) return state;
      return { ...state, pairs: state.pairs.map((x) => (x.id === id ? { ...x, talked: true } : x)) };
    }

    case 'askIntro': {
      const to = String(p.to ?? '');
      const mine = state.familiars[me];
      const them = state.familiars[to];
      if (!mine || !them || to === me) return state;
      const key = `${me}:${to}`;
      if (state.intros[key]) return state;
      const viaId = viaFor(state, me, to);
      const via = viaId ? state.familiars[viaId] : null;
      const shared = sharedKeywords(mine, them);
      const { data } = await ctx.llm.json(
        'familiars.intro',
        {
          me: mine.human.name,
          them: them.human.name,
          via: via?.name ?? mine.name,
          pronouns: { me: mine.human.pronouns, them: them.human.pronouns },
          shared,
        },
        { app: ctx.app, code: ctx.code, schema: IntroOut, effort: 'low', maxTokens: 600 },
      );
      return {
        ...state,
        intros: { ...state.intros, [key]: { to, via: viaId ?? me, line: data.line.trim(), at: action.now } },
      };
    }

    case 'scout': {
      if (state.scout && action.now - state.scout.startedAt < SCOUT_COOLDOWN_MS) return state;
      const keywords = circleKeywords(state);
      const brief = String(p.brief ?? '').trim() || keywords.join(', ');
      const started: FamState = {
        ...state,
        scout: { brief, status: [], cards: [], swipes: {}, match: null, startedAt: action.now },
      };
      const out = await runScout(brief, { keywords }, ctx.llm, { app: 'familiars', code: ctx.code });
      return { ...started, scout: { ...started.scout!, status: out.status, cards: out.cards } };
    }

    case 'swipe': {
      const s = state.scout;
      const cardId = String(p.cardId ?? '');
      const dir = p.dir === 'out' ? 'out' : 'in';
      if (!s || !s.cards.some((c) => c.id === cardId) || !state.familiars[me]) return state;
      const swipes = { ...s.swipes, [cardId]: { ...(s.swipes[cardId] ?? {}), [me]: dir as 'in' | 'out' } };
      let match = s.match;
      if (!match) {
        const voters = realMembers(state);
        for (const c of s.cards) {
          const votes = swipes[c.id] ?? {};
          if (voters.length && voters.every((id) => votes[id] === 'in')) {
            match = c.id;
            break;
          }
        }
      }
      return { ...state, scout: { ...s, swipes, match } };
    }

    case 'castNow': {
      const keywords = circleKeywords(state);
      const { data } = await ctx.llm.json('casts.prompt', { keywords, size: Object.keys(state.familiars).length }, {
        app: ctx.app,
        code: ctx.code,
        schema: CastOut,
        effort: 'low',
        maxTokens: 600,
      });
      return { ...state, cast: { question: data.question, hook: data.hook, at: action.now, answers: {} } };
    }

    case 'answer': {
      const text = String(p.text ?? '').trim();
      if (!state.cast || !text) return state;
      return { ...state, cast: { ...state.cast, answers: { ...state.cast.answers, [me]: text } } };
    }

    case 'recap': {
      const mine = state.familiars[me];
      if (!mine) return state;
      const met = metIds(state, me);
      const last = [...state.pairs].reverse().find((x) => x.a === me || x.b === me);
      const { data } = await ctx.llm.json(
        'familiars.recap',
        {
          name: mine.name,
          human: mine.human.name,
          met: met.size,
          pairs: state.pairs.filter((x) => x.a === me || x.b === me).length,
          groups: webGroups(state, me).length,
          cluster: mine.clusterLabel,
          lastSay: last?.say ?? '',
          nearly: keepMissing(state, me)[0]?.shared.length ?? 0,
        },
        { app: ctx.app, code: ctx.code, schema: RecapOut, effort: 'low', maxTokens: 1200 },
      );
      return { ...state, recaps: { ...state.recaps, [me]: { cards: data.cards.slice(0, 3), at: action.now } } };
    }

    case 'seedDemo':
      return seedDemo(state, Number(p.n ?? 8), action.now);

    default:
      return state;
  }
}

export const familiars: AppDef<FamState> = { initial, reduce };
