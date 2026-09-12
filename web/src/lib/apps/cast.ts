import { z } from 'zod';
import { makeId } from '../ids';
import type { Action, AppDef, Ctx } from '../rooms';
import type { Member } from '../types';

/** Cast — owned by the cast agent. Shape from docs/superpowers/specs/2026-09-12-cast-design.md. */

export type CastAnswer = { text: string; at: number };

export type CastCast = {
  id: string;
  prompt: string;
  mode: 'fishing' | 'catch';
  openedAt: number;
  deadlineAt: number;
  answers: Record<string, CastAnswer>;
  revealedAt: number | null;
  reasons: string[];
  rejected: string[];
  /** authored demo history, not something this circle actually cast */
  seeded?: boolean;
};

export type CastPlan = {
  id: string;
  castId: string;
  title: string;
  venue: string;
  subtitle: string;
  whenISO: string;
  pickerId: string;
  why: string;
  pulls: string[];
  quorum: number;
  caughtAt: number | null;
  seeded?: boolean;
};

/** An author of seeded history: not a live member, but their answers need a face. */
export type CastGhost = { name: string; tone: 1 | 2 | 3 | 4 };

export type CastState = {
  code: string;
  name: string;
  mode: 'fishing' | 'catch';
  casts: CastCast[];
  plans: CastPlan[];
  scheduledAt: number | null;
  hostId: string | null;
  /** memberId -> last keystroke, so the status row can say "typing…" */
  typing: Record<string, number>;
  ghosts: Record<string, CastGhost>;
};

/** how long the ring counts down after a cast lands */
export const CAST_MS = 90_000;
/** a member is "typing" for this long after their last keystroke */
export const TYPING_MS = 5_000;

/** Projector views join as members so they can poll; they never count for quorum. */
export const isViewer = (id: string): boolean => id.startsWith('stage-');

const promptSchema = z.object({
  prompt: z.string().min(4),
  mode: z.enum(['fishing', 'catch']).optional(),
  reasons: z.array(z.string()).optional(),
  rejected: z.array(z.string()).optional(),
});

const planSchema = z.object({
  title: z.string().min(2),
  venue: z.string().min(2),
  subtitle: z.string().default(''),
  whenISO: z.string(),
  pickerId: z.string().optional(),
  why: z.string().default(''),
});

/* ------------------------------------------------------------------ helpers */

function roster(ctx: Ctx): Member[] {
  return Object.values(ctx.members)
    .filter((m) => !isViewer(m.id))
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

function nameOf(state: CastState, ctx: Ctx, id: string): string {
  return ctx.members[id]?.name ?? state.ghosts[id]?.name ?? 'someone';
}

export function quorumFor(memberCount: number): number {
  return Math.max(2, Math.ceil(memberCount * 0.75));
}

/** The last 14 days of casts, as the model sees them. */
function history(state: CastState, ctx: Ctx, at: number) {
  const since = at - 14 * 86_400_000;
  return state.casts
    .filter((c) => c.openedAt >= since || c.seeded)
    .slice(0, 14)
    .map((c) => ({
      prompt: c.prompt,
      mode: c.mode,
      answers: Object.entries(c.answers).map(([id, a]) => ({ who: nameOf(state, ctx, id), text: a.text })),
    }));
}

async function openCast(state: CastState, ctx: Ctx, at: number): Promise<CastState> {
  const members = roster(ctx);
  const { data } = await ctx.llm.json(
    'cast.prompt',
    {
      circle: state.name,
      mode: state.mode,
      members: members.map((m) => ({ id: m.id, name: m.name })),
      history: history(state, ctx, at),
    },
    { app: 'cast', code: ctx.code, schema: promptSchema },
  );
  const next: CastCast = {
    id: makeId('c'),
    prompt: data.prompt,
    mode: state.mode,
    openedAt: at,
    deadlineAt: at + CAST_MS,
    answers: {},
    revealedAt: null,
    reasons: (data.reasons ?? []).slice(0, 3),
    rejected: (data.rejected ?? []).slice(0, 2),
  };
  return { ...state, casts: [next, ...state.casts], scheduledAt: null, typing: {} };
}

async function makePlan(
  state: CastState,
  ctx: Ctx,
  castId: string,
  at: number,
  avoid: string[] = [],
): Promise<CastState> {
  const cast = state.casts.find((c) => c.id === castId);
  if (!cast) return state;
  const members = roster(ctx);
  const answers = Object.entries(cast.answers).map(([id, a]) => ({
    memberId: id,
    name: nameOf(state, ctx, id),
    text: a.text,
  }));
  const avoidVenues = [...new Set([...state.plans.map((p) => p.venue), ...avoid])];
  const { data } = await ctx.llm.json(
    'cast.plan',
    {
      prompt: cast.prompt,
      answers,
      members: members.map((m) => ({ id: m.id, name: m.name })),
      city: 'Pittsburgh',
      avoid: avoidVenues,
      replacing: avoid[0],
    },
    { app: 'cast', code: ctx.code, schema: planSchema },
  );
  const picker = members.find((m) => m.id === data.pickerId)?.id ?? members[0]?.id ?? '';
  const plan: CastPlan = {
    id: makeId('p'),
    castId,
    title: data.title,
    venue: data.venue,
    subtitle: data.subtitle ?? '',
    whenISO: data.whenISO,
    pickerId: picker,
    why: data.why ?? '',
    pulls: [],
    quorum: quorumFor(members.length),
    caughtAt: null,
  };
  return { ...state, plans: [plan, ...state.plans.filter((p) => p.castId !== castId)] };
}

const without = (map: Record<string, number>, key: string): Record<string, number> => {
  const next = { ...map };
  delete next[key];
  return next;
};

/* -------------------------------------------------------------------- seed */

const GHOSTS: Record<string, CastGhost> = {
  g_jo: { name: 'Jo', tone: 1 },
  g_pietro: { name: 'Pietro', tone: 2 },
  g_maya: { name: 'Maya', tone: 3 },
  g_sam: { name: 'Sam', tone: 4 },
};

type SeedDay = {
  daysAgo: number;
  prompt: string;
  mode: 'fishing' | 'catch';
  reasons: string[];
  answers: [keyof typeof GHOSTS | string, string][];
};

const SEED: SeedDay[] = [
  {
    daysAgo: 1,
    prompt: 'One thing all four of you keep meaning to do and never have.',
    mode: 'catch',
    reasons: [
      'four casts in a row ended in a place nobody had been to, so the circle was ready for a plan',
      'Sam had not pulled a line in six days',
      '"keep meaning to" beat "what should we do", which asks for opinions, not doors',
    ],
    answers: [
      ['g_jo', 'The Nationality Rooms. Three years. Every single day.'],
      ['g_pietro', 'That bar under the bridge on Forbes with the neon fish sign'],
      ['g_maya', 'Phipps. I know. I know.'],
      ['g_sam', 'Randyland, before it gets cold.'],
    ],
  },
  {
    daysAgo: 2,
    prompt: 'What did you eat alone this week?',
    mode: 'fishing',
    reasons: [
      'nobody had been asked about food in the last fortnight',
      'short answers land fast on a Tuesday',
      '"eat alone" beat "best meal", which flatters instead of telling',
    ],
    answers: [
      ['g_jo', 'A bagel from the Tepper vending machine. Twice.'],
      ['g_pietro', 'Cold pierogi standing over the sink.'],
      ['g_maya', 'Instant noodles with an egg cracked in, 1 am.'],
      ['g_sam', 'Half a rotisserie chicken, no plate.'],
    ],
  },
  {
    daysAgo: 3,
    prompt: 'The last song you played twice in a row.',
    mode: 'fishing',
    reasons: [
      'the circle answers fastest to questions with one right answer',
      'music had not come up since the first week',
      '"twice in a row" beat "favourite song", which nobody can answer honestly',
    ],
    answers: [
      ['g_jo', 'Pyramid Song. Again.'],
      ['g_maya', 'Tití Me Preguntó.'],
      ['g_sam', 'Nightcall, on the 61C.'],
    ],
  },
  {
    daysAgo: 4,
    prompt: 'Something you were sure of at 15.',
    mode: 'fishing',
    reasons: [
      'three days of place questions in a row; this one moves inward',
      'the longest answers of the fortnight came from questions about the past',
      '"sure of at 15" beat "biggest regret", which is too heavy for a Thursday',
    ],
    answers: [
      ['g_jo', "That I'd live somewhere with palm trees."],
      ['g_pietro', 'That I would never leave Bologna.'],
      ['g_maya', 'That maths was a personality.'],
      ['g_sam', "That I'd be taller."],
    ],
  },
  {
    daysAgo: 5,
    prompt: 'Where were you at 4 pm today?',
    mode: 'fishing',
    reasons: [
      'the circle had not cast in two days, so this one is easy to answer',
      'a same-day question gets everyone in under four minutes',
      '"at 4 pm" beat "how was your day", which gets "fine" four times',
    ],
    answers: [
      ['g_jo', 'Tepper, third floor, same chair.'],
      ['g_pietro', 'Tepper. The good couch.'],
      ['g_maya', 'Tepper atrium, pretending to read.'],
      ['g_sam', 'Schenley, on the grass.'],
    ],
  },
];

function seedHistory(at: number): { casts: CastCast[]; plans: CastPlan[] } {
  const casts: CastCast[] = SEED.map((day) => {
    const openedAt = at - day.daysAgo * 86_400_000;
    const answers: Record<string, CastAnswer> = {};
    day.answers.forEach(([id, text], i) => {
      answers[id] = { text, at: openedAt + (i + 1) * 97_000 };
    });
    return {
      id: `seed_${day.daysAgo}`,
      prompt: day.prompt,
      mode: day.mode,
      openedAt,
      deadlineAt: openedAt + CAST_MS,
      answers,
      revealedAt: openedAt + 6 * 60_000,
      reasons: day.reasons,
      rejected: [],
      seeded: true,
    };
  });

  const thursday = new Date(at);
  thursday.setDate(thursday.getDate() + ((4 - thursday.getDay() + 7) % 7 || 7));
  thursday.setHours(19, 10, 0, 0);
  const plans: CastPlan[] = [
    {
      id: 'seed_plan_1',
      castId: 'seed_1',
      title: 'somewhere none of you have been',
      venue: 'Nationality Rooms',
      subtitle: 'Cathedral of Learning · 14 min walk from Tepper',
      whenISO: thursday.toISOString(),
      pickerId: 'g_pietro',
      why: 'three of you named a place you pass every day and have never gone into',
      pulls: ['g_jo', 'g_pietro', 'g_maya'],
      quorum: 3,
      caughtAt: at - 1 * 86_400_000 + 9 * 60_000,
      seeded: true,
    },
  ];
  return { casts, plans };
}

/* ----------------------------------------------------------------- reducer */

export const cast: AppDef<CastState> = {
  initial: (code) => {
    const at = Date.now();
    const { casts, plans } = seedHistory(at);
    return {
      code,
      name: 'the basement',
      mode: 'fishing',
      casts,
      plans,
      scheduledAt: null,
      hostId: null,
      typing: {},
      ghosts: GHOSTS,
    };
  },

  onJoin: (state, m) => {
    if (isViewer(m.id)) return state;
    return state.hostId ? state : { ...state, hostId: m.id };
  },

  reduce: async (state: CastState, action: Action, ctx: Ctx): Promise<CastState> => {
    const at = action.now || Date.now();
    const me = action.memberId;
    const p = (action.payload ?? {}) as Record<string, unknown>;

    switch (action.name) {
      case 'setName': {
        const name = String(p.name ?? '').trim();
        return name ? { ...state, name } : state;
      }

      case 'setMode': {
        const mode = p.mode === 'catch' ? 'catch' : 'fishing';
        return { ...state, mode };
      }

      case 'schedule': {
        const inMs = Number(p.inMs);
        if (!Number.isFinite(inMs) || inMs < 0) return state;
        return { ...state, scheduledAt: at + inMs };
      }

      case 'tick': {
        if (state.scheduledAt === null || at < state.scheduledAt) return state;
        return openCast(state, ctx, at);
      }

      case 'castNow': {
        const open = state.casts[0];
        // two phones tapping at once must not open two casts; a cast nobody has
        // answered yet, opened a moment ago, is that double tap
        const justOpened = !!open && !open.seeded && at - open.openedAt >= 0 && at - open.openedAt < 2_000;
        if (justOpened && Object.keys(open.answers).length === 0) return state;
        return openCast(state, ctx, at);
      }

      case 'typing': {
        if (isViewer(me)) return state;
        return { ...state, typing: { ...state.typing, [me]: at } };
      }

      case 'answer': {
        const text = String(p.text ?? '').trim();
        const castId = typeof p.castId === 'string' ? p.castId : state.casts[0]?.id;
        const target = state.casts.find((c) => c.id === castId);
        if (!target || target.seeded || !text || isViewer(me)) return state;

        const answers = { ...target.answers, [me]: { text, at } };
        const ids = roster(ctx).map((m) => m.id);
        const everyone = ids.length > 0 && ids.every((id) => answers[id]);
        const revealedAt = target.revealedAt ?? (everyone ? at : null);
        const next: CastState = {
          ...state,
          casts: state.casts.map((c) => (c.id === target.id ? { ...c, answers, revealedAt } : c)),
          typing: without(state.typing, me),
        };
        if (revealedAt && next.mode === 'catch' && !next.plans.some((pl) => pl.castId === target.id)) {
          return makePlan(next, ctx, target.id, at);
        }
        return next;
      }

      case 'newPlan': {
        const castId = typeof p.castId === 'string' ? p.castId : state.casts[0]?.id;
        if (!castId) return state;
        const current = state.plans.find((pl) => pl.castId === castId);
        if (current?.caughtAt) return state; // a caught plan is not up for renegotiation
        return makePlan(state, ctx, castId, at, current ? [current.venue] : []);
      }

      case 'pull': {
        const planId = typeof p.planId === 'string' ? p.planId : state.plans[0]?.id;
        const plan = state.plans.find((pl) => pl.id === planId);
        if (!plan || plan.seeded || isViewer(me) || plan.pulls.includes(me)) return state;
        const pulls = [...plan.pulls, me];
        const caughtAt = plan.caughtAt ?? (pulls.length >= plan.quorum ? at : null);
        return { ...state, plans: state.plans.map((pl) => (pl.id === plan.id ? { ...pl, pulls, caughtAt } : pl)) };
      }

      default:
        return state;
    }
  },
};
