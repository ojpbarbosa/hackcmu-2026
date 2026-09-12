import type { AppDef } from '../rooms';

/** Familiars — owned by the familiars agent. Shape from the familiars spec. */
export type Familiar = {
  id: string;
  name: string;
  address: string;
  aura: [string, string];
  seeds: string[];
  human: { name: string; seat?: string };
  cluster?: string;
  createdAt: number;
};

export type Bump = {
  id: string;
  a: string;
  b: string;
  at: number;
  dialogue: { who: 'a' | 'b'; text: string }[];
  youBoth: string;
  hint: string;
};

export type FamiliarsState = {
  code: string;
  familiars: Record<string, Familiar>;
  bumps: Bump[];
  pendingBumps: { id: string; at: number; magnitude: number }[];
  clusters: { id: string; label: string; color: string; members: string[] }[];
};

export const familiars: AppDef<FamiliarsState> = {
  initial: (code) => ({ code, familiars: {}, bumps: [], pendingBumps: [], clusters: [] }),
  reduce: (state) => state,
};
