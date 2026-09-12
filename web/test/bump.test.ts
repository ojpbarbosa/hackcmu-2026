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

  it('does not pair across rooms', async () => {
    const t = Date.now();
    await recordBump({ ...base, code: 'ROOMA', memberId: 'm1', at: t });
    const b = await recordBump({ ...base, code: 'ROOMB', memberId: 'm2', at: t + 100 });
    expect(b.matched).toBeUndefined();
  });
});
