import { beforeEach, describe, expect, it } from 'vitest';
import { dishesFor, menuHeader, type PalateState } from '@/lib/apps/palate';
import { mergeTable, rankMenu } from '@/lib/palate/score';
import { act, createRoom, joinRoom } from '@/lib/rooms';
import { observe } from '@/lib/observe';
import { __resetMemoryStore } from '@/lib/store';
import type { AppName } from '@/lib/types';

const APP = 'palate' as AppName;
const CODE = 'PAL01';

const JOAO = { id: 'joao', name: 'João', tone: 1 as const };
const PIETRO = { id: 'pietro', name: 'Pietro', tone: 2 as const };
const MAYA = { id: 'maya', name: 'Maya', tone: 3 as const };

const LOVED = {
  joao: ['massaman curry', 'khao soi', 'panang curry', 'tom kha gai', 'coconut rice'],
  pietro: ['grilled pork skewers', 'khao soi', 'massaman curry', 'gai yang', 'coconut curry'],
  maya: ['massaman curry', 'coconut curry', 'khao soi', 'mango sticky rice', 'panang curry'],
};

async function fire(name: string, payload: unknown, memberId: string): Promise<PalateState> {
  const doc = await act(APP, CODE, { name, payload, memberId, now: Date.now() });
  return doc.state as PalateState;
}

async function seatTable(): Promise<PalateState> {
  await createRoom(APP, CODE);
  for (const m of [JOAO, PIETRO, MAYA]) await joinRoom(APP, CODE, m);
  await fire('profile', { loved: LOVED.joao, never: ['sesame'] }, 'joao');
  await fire('profile', { loved: LOVED.pietro, never: ['none'] }, 'pietro');
  await fire('profile', { loved: LOVED.maya, never: [] }, 'maya');
  return fire('pickMenu', { menuId: 'bangkok-balcony' }, 'joao');
}

beforeEach(() => __resetMemoryStore());

describe('profile', () => {
  it('stores a palate built from the dishes a member names', async () => {
    await createRoom(APP, CODE);
    await joinRoom(APP, CODE, JOAO);
    const state = await fire('profile', { loved: LOVED.joao, never: ['sesame'] }, 'joao');
    const mine = state.palates.joao;
    expect(mine).toBeDefined();
    expect(mine.axes.coconut).toBeGreaterThan(0.8);
    expect(mine.axes.smoky).toBeLessThan(mine.axes.coconut);
    expect(mine.never).toEqual(['sesame']);
    expect(mine.loved).toHaveLength(5);
    expect(mine.families[0]).toMatchObject({ label: 'coconut & galangal', key: 'coconut' });
  });

  it('drops "none" from the never list and ignores an empty profile', async () => {
    await createRoom(APP, CODE);
    const state = await fire('profile', { loved: ['bacon', 'brisket'], never: ['none'] }, 'pietro');
    expect(state.palates.pietro.never).toEqual([]);
    expect(state.palates.pietro.axes.smoky).toBeGreaterThan(0.8);
    const same = await fire('profile', { loved: [], never: [] }, 'maya');
    expect(same.palates.maya).toBeUndefined();
  });

  it('emits a model call that the ladder can show', async () => {
    await createRoom(APP, CODE);
    await fire('profile', { loved: LOVED.joao, never: [] }, 'joao');
    const events = await observe.recent(APP, CODE);
    expect(events.map((e) => e.task)).toContain('palate.profile');
    expect(events[0].provider).toBe('mock');
  });
});

describe('pickMenu', () => {
  it('loads a demo menu and ranks it for the member who picked it', async () => {
    const state = await seatTable();
    expect(menuHeader(state)).toMatchObject({ name: 'Bangkok Balcony', language: 'th' });
    const dishes = dishesFor(state);
    expect(dishes.length).toBeGreaterThan(15);

    const ranked = rankMenu(state.palates.joao, dishes, state.known);
    expect(ranked[0].status).toBe('ok');
    expect(ranked.slice(0, 5).map((s) => s.dish.id)).toContain('bb-massaman');
    expect(ranked.find((s) => s.dish.id === 'bb-house-special')!.status).toBe('unknown');
    expect(ranked.find((s) => s.dish.id === 'bb-mango-sticky-rice')!.status).toBe('never');
  });

  it('ignores a menu it does not ship', async () => {
    await createRoom(APP, CODE);
    const state = await fire('pickMenu', { menuId: 'nowhere-cafe' }, 'joao');
    expect(state.menuId).toBeNull();
  });
});

describe('pasteMenu', () => {
  it('parses pasted text into dishes, keeping the names as printed', async () => {
    await createRoom(APP, CODE);
    const text = [
      'Tasca do Bairro',
      'petiscos',
      'Amêijoas à Bulhão Pato com alho e coentros 14',
      'Chouriço assado com broa 8',
      'Prato do dia 12',
    ].join('\n');
    const state = await fire('pasteMenu', { text }, 'joao');
    expect(state.pastedMenu?.restaurant).toBe('Tasca do Bairro');
    expect(state.pastedMenu?.language).toBe('pt');
    const names = state.pastedMenu!.dishes.map((d) => d.name);
    expect(names[0]).toContain('Amêijoas');
    const clams = state.pastedMenu!.dishes[0];
    expect(clams.ingredients).toContain('clams');
    expect(clams.price).toBe(14);
    const mystery = state.pastedMenu!.dishes.find((d) => d.name.startsWith('Prato'))!;
    expect(mystery.ingredients).toEqual([]);
    expect(rankMenu(state.palates.joao ?? { axes: { coconut: 0.5, smoky: 0.5, sour: 0.5, herbal: 0.5, sweet: 0.5, fermented: 0.5 }, families: [], never: [], loved: [] }, dishesFor(state)).find((s) => s.dish.id === mystery.id)!.status).toBe('unknown');
  });
});

describe('reasons', () => {
  it('caches one line per dish for the member who asked', async () => {
    const state = await seatTable();
    void state;
    const next = await fire('reasons', {}, 'joao');
    const mine = next.reasons.joao;
    expect(Object.keys(mine).length).toBeGreaterThan(5);
    expect(mine['bb-house-special']).toContain('grey');
    for (const line of Object.values(mine)) expect(line.split(' ').length).toBeLessThanOrEqual(14);
  });
});

describe('ask and clear', () => {
  it('writes the chef card in the language of the menu, and records who wrote it', async () => {
    await seatTable();
    const state = await fire('ask', { dishId: 'bb-house-special', allergen: 'sesame' }, 'joao');
    const card = state.cards['bb-house-special|sesame'];
    expect(card.language).toBe('th');
    expect(card.native).toContain('งา');
    expect(card.english).toContain('sesame');
    expect(card.by.provider).toBe('mock');
  });

  it('writes a Portuguese card for the tasca', async () => {
    await createRoom(APP, CODE);
    await fire('pickMenu', { menuId: 'tasca-lisboa' }, 'joao');
    const state = await fire('ask', { dishId: 'tl-prato-do-dia', allergen: 'shellfish' }, 'joao');
    expect(state.cards['tl-prato-do-dia|shellfish'].native).toContain('marisco');
  });

  it('makes a blocked dish scorable once the kitchen has answered', async () => {
    const seated = await seatTable();
    const before = rankMenu(seated.palates.joao, dishesFor(seated), seated.known);
    expect(before.find((s) => s.dish.id === 'bb-mango-sticky-rice')!.status).toBe('never');

    const state = await fire('clear', { dishId: 'bb-mango-sticky-rice', allergen: 'sesame' }, 'joao');
    expect(state.known['bb-mango-sticky-rice'].allergenCleared).toEqual(['sesame']);
    const after = rankMenu(state.palates.joao, dishesFor(state), state.known);
    expect(after.find((s) => s.dish.id === 'bb-mango-sticky-rice')!.status).toBe('ok');
  });

  it('keeps a dish with no ingredient record grey even after the kitchen answers', async () => {
    await seatTable();
    const state = await fire('clear', { dishId: 'bb-house-special', allergen: 'sesame' }, 'joao');
    const row = rankMenu(state.palates.joao, dishesFor(state), state.known).find(
      (s) => s.dish.id === 'bb-house-special',
    )!;
    expect(row.status).toBe('unknown');
    expect(row.reason).toContain('the kitchen says no sesame');
  });

  it('can take the answer back', async () => {
    await seatTable();
    await fire('clear', { dishId: 'bb-mango-sticky-rice', allergen: 'sesame' }, 'joao');
    const state = await fire('unclear', { dishId: 'bb-mango-sticky-rice' }, 'joao');
    expect(state.known['bb-mango-sticky-rice']).toBeUndefined();
  });
});

describe('buildOrder', () => {
  it('orders two of everything the table agrees on and one of each split', async () => {
    await seatTable();
    const state = await fire('buildOrder', {}, 'joao');
    expect(state.order.length).toBeGreaterThan(0);
    expect(state.orderedAt).toBeGreaterThan(0);
    const merged = mergeTable(state.palates, dishesFor(state), state.known);
    expect(merged.everyone.map((r) => r.dish.id)).toContain('bb-massaman');
    const ids = state.order.map((o) => o.dishId);
    expect(ids).toEqual(merged.everyone.slice(0, 4).map((r) => r.dish.id));
    expect(state.order.every((o) => o.qty === 2)).toBe(true); // ceil(3 / 2)
    expect(state.order.every((o) => dishesFor(state).some((d) => d.id === o.dishId))).toBe(true);

    const cleared = await fire('resetOrder', {}, 'joao');
    expect(cleared.order).toEqual([]);
  });

  it('does nothing when nobody has a palate', async () => {
    await createRoom(APP, CODE);
    await fire('pickMenu', { menuId: 'bangkok-balcony' }, 'joao');
    const state = await fire('buildOrder', {}, 'joao');
    expect(state.order).toEqual([]);
  });
});

describe('the reducer', () => {
  it('ignores an action it does not know', async () => {
    await createRoom(APP, CODE);
    const state = await fire('dance', {}, 'joao');
    expect(state.palates).toEqual({});
  });
});
