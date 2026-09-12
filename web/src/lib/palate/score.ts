/** Palate scoring — deterministic, server-side, and honest about what it does not know.
 *
 *  Every number on a menu comes from here: an authored ingredient table (axis weights and
 *  allergen tags), a dish vector built only from ingredients we actually recognise, and two
 *  cosines — one over the six flavour axes, one over the flavour families the diner keeps
 *  returning to. Two rules override the arithmetic:
 *    - a "never" allergen hard-blocks the dish (score 0, status 'never'),
 *    - fewer than two recognised ingredients means status 'unknown' — never ranked as safe.
 */
import table from './ingredients.json';
import bangkokBalcony from './menus/bangkok-balcony.json';
import rittersDiner from './menus/ritters-diner.json';
import tascaLisboa from './menus/tasca-lisboa.json';

export const AXES = ['coconut', 'smoky', 'sour', 'herbal', 'sweet', 'fermented'] as const;
export type AxisName = (typeof AXES)[number];
export type Axes = Record<AxisName, number>;
export type FamilyKey = AxisName;

export const ALLERGENS = ['sesame', 'peanut', 'shellfish', 'dairy', 'gluten'] as const;
export type Allergen = (typeof ALLERGENS)[number];

export type Ingredient = {
  name: string;
  aliases: string[];
  axes: Partial<Axes>;
  allergens: string[];
  /** the flavour family this ingredient belongs to; 'staple' carries no family weight */
  family: FamilyKey | 'staple';
};

export type Family = { label: string; count: number; key?: FamilyKey };

export type Palate = {
  axes: Axes;
  families: Family[];
  never: string[];
  loved: string[];
};

export type Dish = {
  id: string;
  name: string;
  price?: number;
  description?: string;
  ingredients: string[];
  section?: string;
};

export type Menu = {
  id: string;
  name: string;
  cuisine: string;
  language: string;
  address: string;
  sections: { name: string; dishes: Omit<Dish, 'section'>[] }[];
};

export type Status = 'ok' | 'unknown' | 'never';

export type Scored = {
  dish: Dish;
  score: number;
  status: Status;
  reason: string;
  hits: string[];
  blockedBy?: string;
  /** recognised ingredients; < 2 is what makes a dish unknown */
  known: number;
  /** allergens the kitchen has cleared for this dish */
  cleared?: string[];
};

export const FAMILY_LABELS: Record<FamilyKey, string> = {
  coconut: 'coconut & galangal',
  smoky: 'charred & smoky',
  sour: 'sour & bright',
  herbal: 'herbal & green',
  sweet: 'sweet & baked',
  fermented: 'fermented & funky',
};

export const FAMILY_COLORS: Record<FamilyKey, string> = {
  coconut: '#D6336C',
  smoky: '#F59E0B',
  sour: '#22C55E',
  herbal: '#10B981',
  sweet: '#E9678F',
  fermented: '#7B3FE4',
};

export const ingredients = table as Ingredient[];
export const INGREDIENT_COUNT = ingredients.length;

/* ------------------------------------------------------------------ lookup */

const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const singular = (s: string): string => (s.length > 4 && s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s);

const index = new Map<string, Ingredient>();
for (const ing of ingredients) {
  for (const key of [ing.name, ...ing.aliases]) {
    const n = normalize(key);
    if (!index.has(n)) index.set(n, ing);
    const s = singular(n);
    if (!index.has(s)) index.set(s, ing);
  }
}
/** longest keys first so "coconut milk" wins over "coconut" inside a phrase */
const keysByLength = [...index.keys()].sort((a, b) => b.length - a.length);

/** Resolve a free-text ingredient to the authored table, by name, alias, or containment. */
export function lookupIngredient(name: string): Ingredient | null {
  const n = normalize(name);
  if (!n) return null;
  const direct = index.get(n) ?? index.get(singular(n));
  if (direct) return direct;
  for (const key of keysByLength) {
    if (key.length < 4) continue;
    if (n === key || n.includes(` ${key} `) || n.startsWith(`${key} `) || n.endsWith(` ${key}`)) return index.get(key)!;
  }
  return null;
}

/** Every ingredient the authored table can see in a line of menu text, longest name first.
 *  Used to guess at a pasted menu without inventing anything: no match, no ingredient. */
export function findIngredients(text: string): string[] {
  const n = ` ${normalize(text)} `;
  const found: string[] = [];
  const taken: string[] = [];
  for (const key of keysByLength) {
    if (key.length < 4) continue;
    if (!n.includes(` ${key} `) && !n.includes(` ${key}s `)) continue;
    if (taken.some((t) => t.includes(key))) continue;
    taken.push(key);
    const name = index.get(key)!.name;
    if (!found.includes(name)) found.push(name);
  }
  return found;
}

/* ------------------------------------------------------------------ vectors */

export const zeroAxes = (): Axes => ({ coconut: 0, smoky: 0, sour: 0, herbal: 0, sweet: 0, fermented: 0 });

export function cosine(a: Record<string, number>, b: Record<string, number>, keys: readonly string[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    const x = a[k] ?? 0;
    const y = b[k] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export type DishVector = {
  axes: Axes;
  known: number;
  allergens: string[];
  /** family weights over the recognised, non-staple ingredients */
  families: Record<FamilyKey, number>;
  matched: Ingredient[];
};

/** Mean of the recognised ingredients' axis weights. Unrecognised names are counted, never guessed. */
export function dishVector(d: Dish): DishVector {
  const axes = zeroAxes();
  const families = { coconut: 0, smoky: 0, sour: 0, herbal: 0, sweet: 0, fermented: 0 } as Record<FamilyKey, number>;
  const allergens = new Set<string>();
  const matched: Ingredient[] = [];
  for (const raw of d.ingredients ?? []) {
    const ing = lookupIngredient(raw);
    if (!ing) continue;
    matched.push(ing);
    for (const a of AXES) axes[a] += ing.axes[a] ?? 0;
    if (ing.family !== 'staple') families[ing.family] += 1;
    for (const al of ing.allergens) allergens.add(al);
  }
  const n = matched.length || 1;
  for (const a of AXES) axes[a] = axes[a] / n;
  return { axes, known: matched.length, allergens: [...allergens].sort(), families, matched };
}

const FAMILY_HINTS: [FamilyKey, RegExp][] = [
  ['coconut', /coconut|galangal|curry|creamy|rich|cream/],
  ['smoky', /smok|char|grill|bbq|barbecue|roast|fried|crisp/],
  ['sour', /sour|acid|citrus|bright|lime|lemon|pickle|vinegar|tangy/],
  ['herbal', /herb|green|fresh|basil|mint|salad|leaf/],
  ['sweet', /sweet|dessert|bake|sugar|pastry|chocolate|fruit/],
  ['fermented', /ferment|funk|umami|aged|cured|pickled|salty|brine/],
];

/** Map a free-text family label (the model writes its own) onto one of the six keys. */
export function familyKeyFor(label: string): FamilyKey | undefined {
  const n = normalize(label);
  for (const [key, re] of FAMILY_HINTS) if (re.test(n)) return key;
  return undefined;
}

function palateFamilyWeights(p: Palate): Record<FamilyKey, number> {
  const out = { coconut: 0, smoky: 0, sour: 0, herbal: 0, sweet: 0, fermented: 0 } as Record<FamilyKey, number>;
  for (const f of p.families ?? []) {
    const key = f.key ?? familyKeyFor(f.label);
    if (key) out[key] += Math.max(0, f.count);
  }
  return out;
}

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

/** Cosine between two non-negative six-vectors is never low — anything sharing a single axis
 *  scores 0.5 — so the raw similarity is stretched onto 0..1 before it becomes a score.
 *  0.30 similarity is the floor (nothing in common worth naming), 0.95 is a full match. */
export const sharpen = (x: number): number => Math.max(0, Math.min(1, (x - 0.3) / 0.65));

/** How much of what this diner keeps ordering actually shows up in the dish: the share of
 *  their family weight that the dish has at least one ingredient for. -1 when we cannot say. */
export function familyCoverage(p: Palate, v: DishVector): number {
  const pw = palateFamilyWeights(p);
  const total = sum(pw);
  if (total === 0 || sum(v.families) === 0) return -1;
  let covered = 0;
  for (const f of AXES) if (pw[f] > 0 && v.families[f] > 0) covered += pw[f];
  return covered / total;
}

/* ------------------------------------------------------------------ scoring */

/** The ingredients that pulled the score up, strongest first — this is the reason line. */
export function hitsFor(p: Palate, v: DishVector): string[] {
  return v.matched
    .map((ing) => ({ name: ing.name, w: AXES.reduce((acc, a) => acc + (p.axes[a] ?? 0) * (ing.axes[a] ?? 0), 0) }))
    .filter((h) => h.w > 0.08)
    .sort((a, b) => b.w - a.w || a.name.localeCompare(b.name))
    .filter((h, i, all) => all.findIndex((x) => x.name === h.name) === i)
    .slice(0, 3)
    .map((h) => h.name);
}

/**
 * score = 70 · cosine(palate axes, dish axes) + 30 · cosine(palate families, dish families).
 * A never-allergen the kitchen has not cleared blocks the dish outright; fewer than two
 * recognised ingredients leaves it unknown.
 */
export function scoreDish(p: Palate, dish: Dish, cleared?: string[]): Scored {
  const v = dishVector(dish);
  const never = (p.never ?? []).map((n) => normalize(n)).filter((n) => n && n !== 'none');
  const ok = new Set((cleared ?? []).map(normalize));
  const blockedBy = v.allergens.find((a) => never.includes(normalize(a)) && !ok.has(normalize(a)));

  if (blockedBy) {
    return {
      dish,
      score: 0,
      status: 'never',
      reason: `contains ${blockedBy}`,
      hits: [],
      blockedBy,
      known: v.known,
      cleared,
    };
  }

  if (v.known < 2) {
    return {
      dish,
      score: 0,
      status: 'unknown',
      reason: ok.size
        ? `the kitchen says no ${[...ok].join(', ')}, but no ingredient record`
        : 'no ingredient record, so it stays grey',
      hits: [],
      known: v.known,
      cleared,
    };
  }

  const axisCos = sharpen(cosine(p.axes, v.axes, AXES));
  const cover = familyCoverage(p, v);
  const score = Math.max(0, Math.min(99, Math.round(70 * axisCos + 30 * (cover < 0 ? axisCos : cover))));
  const hits = hitsFor(p, v);
  return {
    dish,
    score,
    status: 'ok',
    reason: hits.length ? hits.join(' · ') : 'nothing here matches what you log',
    hits,
    known: v.known,
    cleared,
  };
}

const STATUS_RANK: Record<Status, number> = { ok: 0, unknown: 1, never: 2 };

export type Known = Record<string, { allergenCleared: string[]; at: number }>;

/** Ranked for one person: matches first, then the grey ones, then the blocked ones. */
export function rankMenu(p: Palate, dishes: Dish[], known?: Known): Scored[] {
  return dishes
    .map((d) => scoreDish(p, d, known?.[d.id]?.allergenCleared))
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.score - a.score || a.dish.name.localeCompare(b.dish.name),
    );
}

export type TableRow = { dish: Dish; scores: Record<string, number>; min: number; max: number; spread: number };
export type TableMerge = {
  everyone: TableRow[];
  splits: (TableRow & { lowest: string })[];
  blocked: { dish: Dish; by: string; allergen: string }[];
  unknown: Scored[];
};

export const EVERYONE_MIN = 75;
export const SPLIT_SPREAD = 40;

/** Merge the table: what clears 75 for everyone, what splits it, what is blocked for someone. */
export function mergeTable(ps: Record<string, Palate>, dishes: Dish[], known?: Known): TableMerge {
  const ids = Object.keys(ps);
  const everyone: TableRow[] = [];
  const splits: (TableRow & { lowest: string })[] = [];
  const blocked: { dish: Dish; by: string; allergen: string }[] = [];
  const unknown: Scored[] = [];
  if (ids.length === 0) return { everyone, splits, blocked, unknown };

  for (const dish of dishes) {
    const cleared = known?.[dish.id]?.allergenCleared;
    const scored = ids.map((id) => [id, scoreDish(ps[id], dish, cleared)] as const);

    const block = scored.find(([, s]) => s.status === 'never');
    if (block) {
      blocked.push({ dish, by: block[0], allergen: block[1].blockedBy ?? 'an allergen' });
      continue;
    }
    if (scored.some(([, s]) => s.status === 'unknown')) {
      unknown.push(scored[0][1]);
      continue;
    }

    const scores = Object.fromEntries(scored.map(([id, s]) => [id, s.score]));
    const values = Object.values(scores);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const row: TableRow = { dish, scores, min, max, spread: max - min };
    if (min >= EVERYONE_MIN) everyone.push(row);
    else if (row.spread >= SPLIT_SPREAD) {
      const lowest = scored.reduce((a, b) => (a[1].score <= b[1].score ? a : b))[0];
      splits.push({ ...row, lowest });
    }
  }

  everyone.sort((a, b) => b.min - a.min || a.dish.name.localeCompare(b.dish.name));
  splits.sort((a, b) => b.spread - a.spread || a.dish.name.localeCompare(b.dish.name));
  return { everyone, splits, blocked, unknown };
}

/* ------------------------------------------------------------------ menus */

export const MENUS: Menu[] = [bangkokBalcony as Menu, rittersDiner as Menu, tascaLisboa as Menu];

export function getMenu(id: string | null | undefined): Menu | null {
  return MENUS.find((m) => m.id === id) ?? null;
}

/** Flatten a menu into scorable dishes, carrying the section each one came from. */
export function menuDishes(menu: Menu | null): Dish[] {
  if (!menu) return [];
  return menu.sections.flatMap((s) => s.dishes.map((d) => ({ ...d, section: s.name })));
}

export function dishCount(menu: Menu | null): number {
  return menuDishes(menu).length;
}
