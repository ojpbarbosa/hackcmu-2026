import { beforeEach, describe, expect, it } from 'vitest';
import { apps } from '@/lib/apps';
import { BUMP_WINDOW_MS, bumpStatus, recordBump } from '@/lib/bump';
import { getRoom } from '@/lib/rooms';
import { __resetMemoryStore } from '@/lib/store';
import type { AppName } from '@/lib/types';

type PairState = { pairs: { pairId: string; a: string; b: string }[] };

apps.__bump = {
  initial: () => ({ pairs: [] }) as PairState,
  reduce: (state: PairState, action) =>
    action.name === 'bumpPaired' ? { pairs: [...state.pairs, action.payload] } : state,
};

const APP = '__bump' as AppName;
const base = { app: APP, code: 'BUMPS', magnitude: 18 };

beforeEach(() => __resetMemoryStore());

describe('bump pairing', () => {
  it('pairs two members 200 ms apart', async () => {
    const t = Date.now();
    const a = await recordBump({ ...base, memberId: 'm1', at: t });
    const b = await recordBump({ ...base, memberId: 'm2', at: t + 200 });
    expect(a.matched).toBeUndefined();
    expect(b.matched?.withMemberId).toBe('m1');
    expect(b.matched?.pairId).toMatch(/^pair_/);
  });

  it('does not pair two members 600 ms apart', async () => {
    const t = Date.now();
    await recordBump({ ...base, memberId: 'm1', at: t });
    const b = await recordBump({ ...base, memberId: 'm2', at: t + 600 });
    expect(b.matched).toBeUndefined();
  });

  it('pairs exactly at the window edge and not past it', async () => {
    const t = Date.now();
    await recordBump({ ...base, memberId: 'm1', at: t });
    const edge = await recordBump({ ...base, memberId: 'm2', at: t + BUMP_WINDOW_MS });
    expect(edge.matched).toBeDefined();

    __resetMemoryStore();
    await recordBump({ ...base, memberId: 'm1', at: t });
    const past = await recordBump({ ...base, memberId: 'm2', at: t + BUMP_WINDOW_MS + 1 });
    expect(past.matched).toBeUndefined();
  });

  it('never matches a member with themselves', async () => {
    const t = Date.now();
    await recordBump({ ...base, memberId: 'm1', at: t });
    const again = await recordBump({ ...base, memberId: 'm1', at: t + 50 });
    expect(again.matched).toBeUndefined();
  });

  it('tells the first phone about the match when it polls', async () => {
    const t = Date.now();
    const a = await recordBump({ ...base, memberId: 'm1', at: t });
    expect(await bumpStatus(a.bumpId)).toEqual({});
    const b = await recordBump({ ...base, memberId: 'm2', at: t + 120 });
    expect((await bumpStatus(a.bumpId)).matched?.withMemberId).toBe('m2');
    expect((await bumpStatus(b.bumpId)).matched?.withMemberId).toBe('m1');
    expect((await bumpStatus(a.bumpId)).matched?.pairId).toBe((await bumpStatus(b.bumpId)).matched?.pairId);
  });

  it('reports nothing for an unknown bump id', async () => {
    expect(await bumpStatus('bump_nope')).toEqual({});
  });

  it('feeds the pair into the room reducer', async () => {
    const t = Date.now();
    await recordBump({ ...base, memberId: 'm1', at: t });
    await recordBump({ ...base, memberId: 'm2', at: t + 100 });
    const doc = await getRoom(APP, 'BUMPS');
    expect((doc?.state as PairState).pairs).toHaveLength(1);
    expect((doc?.state as PairState).pairs[0]).toMatchObject({ a: 'm1', b: 'm2' });
  });

  it('pairs two bumps recorded concurrently, converging on one pair', async () => {
    const t = Date.now();
    const [a, b] = await Promise.all([
      recordBump({ ...base, code: 'CONC1', memberId: 'm1', at: t }),
      recordBump({ ...base, code: 'CONC1', memberId: 'm2', at: t + 40 }),
    ]);
    const sa = await bumpStatus(a.bumpId);
    const sb = await bumpStatus(b.bumpId);
    expect(sa.matched?.withMemberId).toBe('m2');
    expect(sb.matched?.withMemberId).toBe('m1');
    expect(sa.matched?.pairId).toBe(sb.matched?.pairId);
    const doc = await getRoom(APP, 'CONC1');
    const ids = new Set((doc?.state as PairState).pairs.map((p) => p.pairId));
    expect(ids.size).toBe(1);
  });

  it('keeps pairing while a third phone knocks repeatedly', async () => {
    const t = Date.now();
    await recordBump({ ...base, code: 'NOISY', memberId: 'm3', at: t - 3000 });
    await recordBump({ ...base, code: 'NOISY', memberId: 'm3', at: t - 1500 });
    const a = await recordBump({ ...base, code: 'NOISY', memberId: 'm1', at: t });
    await recordBump({ ...base, code: 'NOISY', memberId: 'm3', at: t + 900 });
    const b = await recordBump({ ...base, code: 'NOISY', memberId: 'm2', at: t + 120 });
    expect(b.matched?.withMemberId).toBe('m1');
    expect((await bumpStatus(a.bumpId)).matched?.withMemberId).toBe('m2');
  });

  it('does not pair across rooms', async () => {
    const t = Date.now();
    await recordBump({ ...base, code: 'ROOMA', memberId: 'm1', at: t });
    const b = await recordBump({ ...base, code: 'ROOMB', memberId: 'm2', at: t + 100 });
    expect(b.matched).toBeUndefined();
  });
});
