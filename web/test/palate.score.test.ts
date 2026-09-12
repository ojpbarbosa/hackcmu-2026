import { describe, expect, it } from 'vitest';
import {
  INGREDIENT_COUNT,
  MENUS,
  dishVector,
  getMenu,
  lookupIngredient,
  menuDishes,
  mergeTable,
  rankMenu,
  scoreDish,
  type Dish,
  type Palate,
} from '@/lib/palate/score';

const bangkok = getMenu('bangkok-balcony')!;
const dishes = menuDishes(bangkok);
const dish = (id: string): Dish => dishes.find((d) => d.id === id)!;

const palate = (p: Partial<Palate>): Palate => ({
  axes: { coconut: 0.2, smoky: 0.2, sour: 0.2, herbal: 0.2, sweet: 0.2, fermented: 0.2 },
  families: [],
  never: [],
  loved: [],
  ...p,
});

const coconutLover = palate({
  axes: { coconut: 0.92, smoky: 0.34, sour: 0.4, herbal: 0.55, sweet: 0.46, fermented: 0.36 },
  families: [
    { label: 'coconut & galangal', count: 14, key: 'coconut' },
    { label: 'herbal & green', count: 7, key: 'herbal' },
    { label: 'sweet & baked', count: 5, key: 'sweet' },
  ],
  loved: ['massaman curry', 'khao soi', 'panang curry'],
});

describe('the ingredient table', () => {
  it('carries enough authored ingredients to read three menus', () => {
    expect(INGREDIENT_COUNT).toBeGreaterThanOrEqual(120);
  });

  it('resolves names, aliases, plurals, phrases and accents', () => {
    expect(lookupIngredient('coconut milk')?.name).toBe('coconut milk');
    expect(lookupIngredient('kati')?.name).toBe('coconut milk');
    expect(lookupIngredient('crushed peanuts')?.name).toBe('peanut');
    expect(lookupIngredient('Amêijoas')?.name).toBe('clams');
    expect(lookupIngredient('chinese broccoli')?.name).toBe('collard greens');
    expect(lookupIngredient('moon dust')).toBeNull();
  });

  it('reads every ingredient printed on all three demo menus', () => {
    const unresolved: string[] = [];
    for (const menu of MENUS)
      for (const d of menuDishes(menu)) for (const i of d.ingredients) if (!lookupIngredient(i)) unresolved.push(i);
    expect(unresolved).toEqual([]);
  });

  it('unions the allergens of a dish', () => {
    const v = dishVector(dish('bb-pad-thai'));
    expect(v.known).toBe(9);
    expect(v.allergens).toContain('peanut');
    expect(v.allergens).toContain('shellfish'); // dried shrimp
    expect(v.allergens).toContain('fish'); // fish sauce
  });
});

describe('scoreDish', () => {
  it('scores massaman above 80 for a coconut-heavy palate, and says why', () => {
    const s = scoreDish(coconutLover, dish('bb-massaman'));
    expect(s.status).toBe('ok');
    expect(s.score).toBeGreaterThan(80);
    expect(s.hits[0]).toBe('coconut milk');
    expect(s.reason).toContain('coconut milk');
  });

  it('is deterministic', () => {
    expect(scoreDish(coconutLover, dish('bb-massaman'))).toEqual(scoreDish(coconutLover, dish('bb-massaman')));
  });

  it('hard-blocks a sesame dish for a sesame-never palate', () => {
    const s = scoreDish(palate({ ...coconutLover, never: ['sesame'] }), dish('bb-mango-sticky-rice'));
    expect(s.status).toBe('never');
    expect(s.score).toBe(0);
    expect(s.blockedBy).toBe('sesame');
    expect(s.reason).toBe('contains sesame');
  });

  it('scores the same dish normally for someone without that never', () => {
    const s = scoreDish(coconutLover, dish('bb-mango-sticky-rice'));
    expect(s.status).toBe('ok');
    expect(s.score).toBeGreaterThan(0);
  });

  it('ignores a "none" never', () => {
    expect(scoreDish(palate({ ...coconutLover, never: ['none'] }), dish('bb-mango-sticky-rice')).status).toBe('ok');
  });

  it('unblocks only when the kitchen has cleared that allergen', () => {
    const sesame = palate({ ...coconutLover, never: ['sesame'] });
    expect(scoreDish(sesame, dish('bb-mango-sticky-rice'), ['peanut']).status).toBe('never');
    expect(scoreDish(sesame, dish('bb-mango-sticky-rice'), ['sesame']).status).toBe('ok');
  });

  it('leaves the house special unknown, and unknown is never a score', () => {
    const s = scoreDish(coconutLover, dish('bb-house-special'));
    expect(s.status).toBe('unknown');
    expect(s.score).toBe(0);
    expect(s.known).toBe(0);
    expect(s.reason).toContain('no ingredient record');
  });

  it('keeps the house special unknown after the kitchen clears an allergen, and says it was asked', () => {
    const s = scoreDish(coconutLover, dish('bb-house-special'), ['sesame']);
    expect(s.status).toBe('unknown');
    expect(s.reason).toContain('the kitchen says no sesame');
  });

  it('treats a dish with one recognised ingredient as unknown', () => {
    const thin: Dish = { id: 'x', name: 'Mystery plate', ingredients: ['coconut milk', 'moon dust'] };
    expect(scoreDish(coconutLover, thin).status).toBe('unknown');
  });
});

describe('rankMenu', () => {
  const ranked = rankMenu(palate({ ...coconutLover, never: ['sesame'] }), dishes);

  it('puts matches first, then the grey ones, then the blocked ones', () => {
    const order = ranked.map((s) => s.status);
    expect(order.indexOf('unknown')).toBeGreaterThan(order.lastIndexOf('ok'));
    expect(order.indexOf('never')).toBeGreaterThan(order.indexOf('unknown'));
  });

  it('ranks every dish on the menu exactly once, descending', () => {
    expect(ranked).toHaveLength(dishes.length);
    const ok = ranked.filter((s) => s.status === 'ok').map((s) => s.score);
    expect([...ok].sort((a, b) => b - a)).toEqual(ok);
  });

  it('honours the kitchen record when ranking', () => {
    const cleared = rankMenu(palate({ ...coconutLover, never: ['sesame'] }), dishes, {
      'bb-mango-sticky-rice': { allergenCleared: ['sesame'], at: 1 },
    });
    expect(cleared.find((s) => s.dish.id === 'bb-mango-sticky-rice')!.status).toBe('ok');
  });
});

describe('mergeTable', () => {
  const joao = coconutLover;
  const pietro = palate({
    axes: { coconut: 0.86, smoky: 0.5, sour: 0.35, herbal: 0.5, sweet: 0.42, fermented: 0.4 },
    families: [
      { label: 'coconut & galangal', count: 11, key: 'coconut' },
      { label: 'charred & smoky', count: 6, key: 'smoky' },
      { label: 'sweet & baked', count: 4, key: 'sweet' },
    ],
  });
  const maya = palate({
    axes: { coconut: 0.9, smoky: 0.3, sour: 0.5, herbal: 0.6, sweet: 0.5, fermented: 0.3 },
    families: [
      { label: 'coconut & galangal', count: 12, key: 'coconut' },
      { label: 'sour & bright', count: 5, key: 'sour' },
      { label: 'sweet & baked', count: 4, key: 'sweet' },
    ],
    never: ['sesame'],
  });

  const merged = mergeTable({ joao, pietro, maya }, dishes);

  it('puts massaman in "everyone will love" for three coconut palates', () => {
    const row = merged.everyone.find((r) => r.dish.id === 'bb-massaman');
    expect(row).toBeDefined();
    expect(row!.min).toBeGreaterThanOrEqual(75);
    expect(Object.keys(row!.scores).sort()).toEqual(['joao', 'maya', 'pietro']);
  });

  it('sorts "everyone" by the lowest score at the table', () => {
    const mins = merged.everyone.map((r) => r.min);
    expect([...mins].sort((a, b) => b - a)).toEqual(mins);
  });

  it('blocks a dish for the whole table when one member can never eat it', () => {
    const blocked = merged.blocked.find((b) => b.dish.id === 'bb-mango-sticky-rice');
    expect(blocked).toMatchObject({ by: 'maya', allergen: 'sesame' });
    expect(merged.everyone.some((r) => r.dish.id === 'bb-mango-sticky-rice')).toBe(false);
  });

  it('keeps an unknown dish out of both lists', () => {
    expect(merged.unknown.map((u) => u.dish.id)).toContain('bb-house-special');
    expect(merged.everyone.some((r) => r.dish.id === 'bb-house-special')).toBe(false);
    expect(merged.splits.some((r) => r.dish.id === 'bb-house-special')).toBe(false);
  });

  it('calls green curry a split, and names the member who drags it down', () => {
    const sweetTooth = palate({
      axes: { coconut: 0.3, smoky: 0.15, sour: 0.15, herbal: 0.1, sweet: 0.95, fermented: 0.1 },
      families: [{ label: 'sweet & baked', count: 12, key: 'sweet' }],
    });
    const table = mergeTable({ joao, pietro, sweetTooth }, dishes);
    const row = table.splits.find((r) => r.dish.id === 'bb-green-curry');
    expect(row).toBeDefined();
    expect(row!.scores.sweetTooth).toBeLessThan(40);
    expect(row!.spread).toBeGreaterThanOrEqual(40);
    expect(row!.lowest).toBe('sweetTooth');
  });

  it('returns empty lists when nobody has a palate yet', () => {
    expect(mergeTable({}, dishes)).toEqual({ everyone: [], splits: [], blocked: [], unknown: [] });
  });
});

describe('the demo menus', () => {
  it('ships three menus, each with one dish the kitchen has to answer for', () => {
    expect(MENUS.map((m) => m.id)).toEqual(['bangkok-balcony', 'ritters-diner', 'tasca-lisboa']);
    for (const menu of MENUS) {
      const unknown = menuDishes(menu).filter((d) => dishVector(d).known < 2);
      expect(unknown).toHaveLength(1);
    }
  });

  it('includes the dishes the mockup promises at Bangkok Balcony', () => {
    const names = dishes.map((d) => d.name);
    for (const n of ['Massaman curry', 'Larb moo', 'Khao soi', 'House special noodle', 'Pad thai'])
      expect(names).toContain(n);
  });

  it('keeps the tasca in Portuguese', () => {
    const tasca = getMenu('tasca-lisboa')!;
    expect(tasca.language).toBe('pt');
    expect(menuDishes(tasca).map((d) => d.name)).toContain('Bacalhau à Brás');
  });
});
