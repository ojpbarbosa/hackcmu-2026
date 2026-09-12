import type { AppDef } from '../rooms';

/** Detour — owned by the detour agent. Shape from the detour spec. */
export type Leg = {
  fromNode: string;
  toNode: string;
  poi?: { name: string; tags?: Record<string, string> };
  path: [number, number][];
  seconds: number;
};

export type Walk = {
  id: string;
  memberId: string;
  budgetMin: number;
  endpoint: string;
  mood: string[];
  startedAt: number;
  legs: Leg[];
  nudges: string[];
  nudgeIndex: number;
  arrivedAt: number | null;
  stats?: { meters: number; newPlaces: number; looks: number };
};

export type DetourState = {
  code: string;
  walks: Walk[];
  candidates: { name: string; lat: number; lng: number; score: number }[];
};

export const detour: AppDef<DetourState> = {
  initial: (code) => ({ code, walks: [], candidates: [] }),
  reduce: (state) => state,
};
