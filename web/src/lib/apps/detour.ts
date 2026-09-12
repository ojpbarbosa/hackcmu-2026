import { z } from 'zod';
import type { Action, AppDef, Ctx } from '../rooms';
import { loadGraph } from '../detour/graph';
import { planWalk, SLACK_SECONDS, type Walk } from '../detour/solver';
import { DEFAULT_VENUE, venueByName } from '../detour/venues';

/** Detour — owned by the detour agent. The solver and the nudges run here, on the
 *  server, so the stage view sees exactly the walk the phone is being told about. */

export type Story = { title: string; line: string };

export type Progress = { legIndex: number; at: number; lat: number; lng: number; heading: number };

export type SolverFacts = {
  consideredPois: number;
  chosenPois: number;
  novelty: number;
  slackSeconds: number;
  plannedSeconds: number;
  solveMs: number;
};

export type DetourWalk = {
  id: string;
  memberId: string;
  memberName: string;
  startedAt: number;
  budgetMin: number;
  mood: string;
  endpoint: { name: string; lat: number; lng: number };
  walk: Walk;
  nudges: string[];
  progress: Progress;
  phoneLooks: number;
  endedAt: number | null;
  story: Story | null;
  solver: SolverFacts;
};

export type DetourState = {
  code: string;
  /** one walk per phone in the room */
  walks: Record<string, DetourWalk>;
  /** the walk the stage view follows */
  focus: string | null;
};

export type StartPayload = {
  start?: [number, number];
  startVenue?: string;
  endpointName?: string;
  budgetMin?: number;
  mood?: string;
  visitedPoiIds?: string[];
};

const nudgeSchema = z.object({ nudges: z.array(z.string()) });
const storySchema = z.object({ title: z.string(), line: z.string() });

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Everything the model is told about a leg. Never the endpoint, never a distance. */
function legBrief(walk: Walk) {
  return walk.legs.map((l, i) => ({
    n: i + 1,
    turn: l.turn,
    streets: l.streets.slice(0, 2),
    poi: l.poi ? { name: l.poi.name, kind: l.poi.kind, tags: l.poi.tags } : null,
    last: i === walk.legs.length - 1,
  }));
}

function fit(nudges: string[], n: number): string[] {
  const out = nudges.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().toLowerCase());
  while (out.length < n) out.push('keep going until something changes');
  return out.slice(0, n);
}

export function walkStats(w: DetourWalk) {
  const meters = w.walk.legs.reduce((s, l) => s + l.meters, 0);
  const places = w.walk.legs.filter((l) => l.poi).map((l) => l.poi!);
  return { meters, km: Math.round(meters / 100) / 10, newPlaces: places.length, looks: w.phoneLooks, places };
}

async function start(state: DetourState, action: Action, ctx: Ctx): Promise<DetourState> {
  const p = (action.payload ?? {}) as StartPayload;
  const g = loadGraph();
  const endpoint = venueByName(p.endpointName ?? DEFAULT_VENUE.name);
  const from = venueByName(p.startVenue ?? DEFAULT_VENUE.name);
  const startAt: [number, number] = p.start ?? [from.lat, from.lng];
  const budgetMin = clamp(Math.round(p.budgetMin ?? 45), 15, 90);
  const mood = p.mood ?? 'somewhere new';

  const t0 = Date.now();
  const walk = planWalk(g, startAt, endpoint, budgetMin, mood, p.visitedPoiIds ?? []);
  const solveMs = Date.now() - t0;

  let nudges: string[] = [];
  try {
    const { data } = await ctx.llm.json(
      'detour.nudges',
      { legs: legBrief(walk), mood, count: walk.legs.length },
      { app: 'detour', code: ctx.code, schema: nudgeSchema },
    );
    nudges = data.nudges;
  } catch {
    nudges = [];
  }

  const id = `w_${action.memberId}_${action.now}`;
  const next: DetourWalk = {
    id,
    memberId: action.memberId,
    memberName: ctx.members[action.memberId]?.name ?? 'walker',
    startedAt: action.now,
    budgetMin,
    mood,
    endpoint: { name: endpoint.name, lat: endpoint.lat, lng: endpoint.lng },
    walk,
    nudges: fit(nudges, walk.legs.length),
    progress: { legIndex: 0, at: action.now, lat: startAt[0], lng: startAt[1], heading: 0 },
    phoneLooks: 0,
    endedAt: null,
    story: null,
    solver: {
      consideredPois: walk.candidates.length,
      chosenPois: walk.legs.filter((l) => l.poi).length,
      novelty: walk.novelty,
      slackSeconds: SLACK_SECONDS,
      plannedSeconds: walk.totalSeconds,
      solveMs,
    },
  };

  return { ...state, walks: { ...state.walks, [action.memberId]: next }, focus: action.memberId };
}

async function end(state: DetourState, action: Action, ctx: Ctx): Promise<DetourState> {
  const w = state.walks[action.memberId];
  if (!w || w.endedAt) return state;
  const stats = walkStats(w);

  let story: Story | null = null;
  try {
    const { data } = await ctx.llm.json(
      'detour.story',
      {
        endpoint: w.endpoint.name,
        mood: w.mood,
        places: stats.places.map((x) => ({ name: x.name, kind: x.kind })),
        stats: { km: stats.km, newPlaces: stats.newPlaces, looks: stats.looks, minutes: Math.round(w.walk.totalSeconds / 60) },
      },
      { app: 'detour', code: ctx.code, schema: storySchema },
    );
    story = data;
  } catch {
    story = { title: 'the long way, on purpose', line: `${stats.newPlaces} places you had never stood in.` };
  }

  const next: DetourWalk = {
    ...w,
    endedAt: action.now,
    story,
    progress: { ...w.progress, legIndex: Math.max(0, w.walk.legs.length - 1) },
  };
  return { ...state, walks: { ...state.walks, [action.memberId]: next }, focus: action.memberId };
}

function patch(state: DetourState, memberId: string, fn: (w: DetourWalk) => DetourWalk): DetourState {
  const w = state.walks[memberId];
  if (!w) return state;
  return { ...state, walks: { ...state.walks, [memberId]: fn(w) }, focus: memberId };
}

export const detour: AppDef<DetourState> = {
  initial: (code) => ({ code, walks: {}, focus: null }),

  async reduce(state, action, ctx) {
    switch (action.name) {
      case 'start':
        return start(state, action, ctx);

      case 'advance': {
        const want = Number((action.payload as { legIndex?: number })?.legIndex ?? NaN);
        return patch(state, action.memberId, (w) => {
          const max = Math.max(0, w.walk.legs.length - 1);
          const next = Number.isFinite(want) ? want : w.progress.legIndex + 1;
          return { ...w, progress: { ...w.progress, legIndex: clamp(Math.max(next, w.progress.legIndex), 0, max), at: action.now } };
        });
      }

      case 'move': {
        const p = (action.payload ?? {}) as { lat?: number; lng?: number; heading?: number; legIndex?: number };
        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return state;
        return patch(state, action.memberId, (w) => {
          const max = Math.max(0, w.walk.legs.length - 1);
          const legIndex = typeof p.legIndex === 'number' ? clamp(Math.max(p.legIndex, w.progress.legIndex), 0, max) : w.progress.legIndex;
          return {
            ...w,
            progress: { legIndex, at: action.now, lat: p.lat!, lng: p.lng!, heading: p.heading ?? w.progress.heading },
          };
        });
      }

      case 'look':
        return patch(state, action.memberId, (w) => ({ ...w, phoneLooks: w.phoneLooks + 1 }));

      case 'end':
        return end(state, action, ctx);

      case 'reset': {
        const walks = { ...state.walks };
        delete walks[action.memberId];
        return { ...state, walks, focus: state.focus === action.memberId ? null : state.focus };
      }

      default:
        return state;
    }
  },
};
