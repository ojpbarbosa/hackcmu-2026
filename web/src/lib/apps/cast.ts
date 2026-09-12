import type { AppDef } from '../rooms';

/** Cast — owned by the cast agent. Shape from docs/superpowers/specs/2026-09-12-cast-design.md. */
export type CastCast = {
  id: string;
  prompt: string;
  openedAt: number;
  answers: Record<string, { text: string; at: number }>;
  revealedAt: number | null;
  reasons: string[];
};

export type CastPlan = {
  id: string;
  title: string;
  venue: string;
  subtitle: string;
  when: string;
  pickerId: string;
  pulls: string[];
  quorum: number;
  caughtAt: number | null;
};

export type CastState = {
  code: string;
  mode: 'fishing' | 'catch';
  casts: CastCast[];
  plans: CastPlan[];
  scheduledAt: number | null;
};

export const cast: AppDef<CastState> = {
  initial: (code) => ({ code, mode: 'fishing', casts: [], plans: [], scheduledAt: null }),
  reduce: (state) => state,
};
