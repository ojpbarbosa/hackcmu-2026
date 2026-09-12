import { z } from 'zod';
import type { Action, AppDef, Ctx } from '../rooms';
import {
  AXES,
  familyKeyFor,
  getMenu,
  menuDishes,
  mergeTable,
  rankMenu,
  type Dish,
  type Known,
  type Palate,
} from '../palate/score';

export type { Palate, Dish } from '../palate/score';

export type PastedMenu = {
  id: 'pasted';
  restaurant: string;
  language: string;
  dishes: Dish[];
  at: number;
};

export type ChefCard = {
  dishId: string;
  allergen: string;
  language: string;
  native: string;
  english: string;
  /** the provider that actually wrote it — attribution is never faked */
  by: { provider: string; model: string; fallback?: boolean };
  at: number;
};

export type PalateState = {
  code: string;
  /** one palate per member; the table merge is a function of this map */
  palates: Record<string, Palate>;
  menuId: string | null;
  pastedMenu: PastedMenu | null;
  /** what the kitchen has answered, per dish */
  known: Known;
  /** cached one-line reasons: reasons[memberId][dishId] */
  reasons: Record<string, Record<string, string>>;
  /** cached chef cards, keyed `<dishId>|<allergen>` */
  cards: Record<string, ChefCard>;
  order: { dishId: string; qty: number }[];
  orderedAt: number | null;
};

export const initialState = (code: string): PalateState => ({
  code,
  palates: {},
  menuId: null,
  pastedMenu: null,
  known: {},
  reasons: {},
  cards: {},
  order: [],
  orderedAt: null,
});

/** The dishes this room is looking at: a pasted menu wins over a picked demo menu. */
export function dishesFor(state: PalateState): Dish[] {
  if (state.pastedMenu) return state.pastedMenu.dishes;
  return menuDishes(getMenu(state.menuId));
}

export function menuHeader(state: PalateState): { name: string; language: string; sub: string; count: number } | null {
  if (state.pastedMenu)
    return {
      name: state.pastedMenu.restaurant,
      language: state.pastedMenu.language,
      sub: `pasted · ${state.pastedMenu.dishes.length} dishes`,
      count: state.pastedMenu.dishes.length,
    };
  const menu = getMenu(state.menuId);
  if (!menu) return null;
  const count = menuDishes(menu).length;
  return { name: menu.name, language: menu.language, sub: `${menu.cuisine} · ${menu.address}`, count };
}

/* ------------------------------------------------------------------ schemas */

const axis = z.number().min(-1).max(2);
const ProfileOut = z.object({
  axes: z.object({ coconut: axis, smoky: axis, sour: axis, herbal: axis, sweet: axis, fermented: axis }),
  families: z.array(z.object({ label: z.string(), count: z.number() })).max(8),
});

const MenuOut = z.object({
  restaurant: z.string().optional(),
  language: z.string().optional(),
  dishes: z
    .array(
      z.object({
        name: z.string(),
        price: z.union([z.number(), z.string()]).optional(),
        ingredients: z.array(z.string()).default([]),
        confidence: z.number().optional(),
        section: z.string().optional(),
      }),
    )
    .max(60),
});

const ReasonsOut = z.object({ reasons: z.record(z.string(), z.string()) });
const CardOut = z.object({ native: z.string(), english: z.string() });

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'dish';

/* ------------------------------------------------------------------ reducer */

async function reduce(state: PalateState, action: Action, ctx: Ctx): Promise<PalateState> {
  const me = action.memberId;
  const p = action.payload ?? {};

  switch (action.name) {
    /** name five dishes you love and the things you never eat, and the model maps them. */
    case 'profile': {
      const loved: string[] = Array.isArray(p.loved) ? p.loved.map(String).filter(Boolean).slice(0, 12) : [];
      const never: string[] = Array.isArray(p.never)
        ? p.never.map((n: unknown) => String(n).toLowerCase()).filter((n: string) => n && n !== 'none')
        : [];
      if (!me || loved.length === 0) return state;
      const { data } = await ctx.llm.json('palate.profile', { lovedDishes: loved, never }, {
        app: 'palate',
        code: ctx.code,
        schema: ProfileOut,
      });
      const axes = Object.fromEntries(AXES.map((a) => [a, clamp01(data.axes[a] ?? 0)])) as Palate['axes'];
      const families = data.families
        .filter((f) => f.label)
        .map((f) => ({ label: f.label, count: Math.max(1, Math.round(f.count)), key: familyKeyFor(f.label) }));
      return { ...state, palates: { ...state.palates, [me]: { axes, families, never, loved } } };
    }

    case 'pickMenu': {
      const menuId = typeof p.menuId === 'string' ? p.menuId : null;
      if (!getMenu(menuId)) return state;
      return { ...state, menuId, pastedMenu: null, order: [], orderedAt: null };
    }

    /** paste any menu, in any language; the model parses it, we never guess an ingredient. */
    case 'pasteMenu': {
      const text = typeof p.text === 'string' ? p.text.slice(0, 8000) : '';
      if (text.trim().length < 4) return state;
      const { data } = await ctx.llm.json('palate.menu', { menuText: text, language: p.language }, {
        app: 'palate',
        code: ctx.code,
        schema: MenuOut,
      });
      const seen = new Set<string>();
      const dishes: Dish[] = data.dishes.map((d, i) => {
        let id = `p-${slug(d.name)}`;
        while (seen.has(id)) id = `${id}-${i}`;
        seen.add(id);
        const price = typeof d.price === 'string' ? Number(d.price.replace(/[^0-9.]/g, '')) : d.price;
        return {
          id,
          name: d.name,
          price: Number.isFinite(price) ? (price as number) : undefined,
          ingredients: d.ingredients ?? [],
          section: d.section?.toLowerCase(),
        };
      });
      return {
        ...state,
        menuId: null,
        pastedMenu: {
          id: 'pasted',
          restaurant: data.restaurant?.trim() || 'Pasted menu',
          language: (data.language ?? 'en').slice(0, 2).toLowerCase(),
          dishes,
          at: action.now,
        },
        reasons: {},
        order: [],
        orderedAt: null,
      };
    }

    /** one batched call per member per menu; the hits come from the scorer, not the model. */
    case 'reasons': {
      const palate = state.palates[me];
      const dishes = dishesFor(state);
      if (!palate || dishes.length === 0) return state;
      const ranked = rankMenu(palate, dishes, state.known);
      const batch = [
        ...ranked.filter((s) => s.status === 'ok').slice(0, 10),
        ...ranked.filter((s) => s.status !== 'ok').slice(0, 6),
      ];
      const { data } = await ctx.llm.json(
        'palate.reason',
        {
          palate: { axes: palate.axes, families: palate.families, never: palate.never },
          dishes: batch.map((s) => ({
            id: s.dish.id,
            name: s.dish.name,
            hits: s.hits,
            score: s.score,
            status: s.status,
            blockedBy: s.blockedBy,
          })),
        },
        { app: 'palate', code: ctx.code, schema: ReasonsOut },
      );
      const mine = { ...(state.reasons[me] ?? {}) };
      for (const [id, text] of Object.entries(data.reasons)) if (typeof text === 'string') mine[id] = text.trim();
      return { ...state, reasons: { ...state.reasons, [me]: mine } };
    }

    /** the chef card: the question, in the language the menu is written in. */
    case 'ask': {
      const dishId = String(p.dishId ?? '');
      const allergen = String(p.allergen ?? '').toLowerCase();
      const dish = dishesFor(state).find((d) => d.id === dishId);
      if (!dish || !allergen) return state;
      const key = `${dishId}|${allergen}`;
      if (state.cards[key]) return state;
      const language = menuHeader(state)?.language ?? 'en';
      const { data, meta } = await ctx.llm.json(
        'palate.chefCard',
        { dish: dish.name, allergen, language },
        { app: 'palate', code: ctx.code, schema: CardOut },
      );
      return {
        ...state,
        cards: {
          ...state.cards,
          [key]: {
            dishId,
            allergen,
            language,
            native: data.native,
            english: data.english,
            by: { provider: meta.provider, model: meta.model, fallback: meta.fallback },
            at: action.now,
          },
        },
      };
    }

    /** the kitchen answered. that answer is the record — nothing is marked safe without one. */
    case 'clear': {
      const dishId = String(p.dishId ?? '');
      const allergen = String(p.allergen ?? '').toLowerCase();
      if (!dishId || !allergen) return state;
      const prev = state.known[dishId]?.allergenCleared ?? [];
      if (prev.includes(allergen)) return state;
      return {
        ...state,
        known: { ...state.known, [dishId]: { allergenCleared: [...prev, allergen], at: action.now } },
      };
    }

    case 'unclear': {
      const dishId = String(p.dishId ?? '');
      if (!state.known[dishId]) return state;
      const known = { ...state.known };
      delete known[dishId];
      return { ...state, known };
    }

    /** the merge, server-side: two of anything everybody scores 75+, one of each split. */
    case 'buildOrder': {
      const palates = state.palates;
      const heads = Object.keys(palates).length;
      if (heads === 0) return state;
      const merged = mergeTable(palates, dishesFor(state), state.known);
      const order = [
        ...merged.everyone.slice(0, 4).map((r) => ({ dishId: r.dish.id, qty: Math.ceil(heads / 2) })),
        ...merged.splits.slice(0, 2).map((r) => ({ dishId: r.dish.id, qty: 1 })),
      ];
      return { ...state, order, orderedAt: action.now };
    }

    case 'resetOrder':
      return { ...state, order: [], orderedAt: null };

    default:
      return state;
  }
}

export const palate: AppDef<PalateState> = {
  initial: initialState,
  reduce,
};
