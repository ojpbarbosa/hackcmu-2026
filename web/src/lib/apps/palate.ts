import type { AppDef } from '../rooms';

/** Palate — owned by the palate agent. Shape from the palate spec. */
export type Axes = { coconut: number; smoky: number; sour: number; herbal: number; sweet: number; fermented: number };

export type Palate = {
  memberId: string;
  lovedDishes: string[];
  never: string[];
  axes: Axes;
  families: { label: string; count: number }[];
};

export type Dish = {
  name: string;
  price?: string;
  ingredients: string[];
  confidence: number;
  section?: string;
};

export type PalateState = {
  code: string;
  palates: Record<string, Palate>;
  menu: { restaurant?: string; dishes: Dish[] } | null;
  scores: Record<string, Record<string, { score: number; reason?: string; never?: boolean; unknown?: boolean }>>;
};

export const palate: AppDef<PalateState> = {
  initial: (code) => ({ code, palates: {}, menu: null, scores: {} }),
  reduce: (state) => state,
};
