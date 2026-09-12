import { beforeEach, describe, expect, it } from 'vitest';
import { apps } from '@/lib/apps';
import { act, createRoom, getRoom, joinRoom } from '@/lib/rooms';
import { __resetMemoryStore } from '@/lib/store';
import type { AppName, Member } from '@/lib/types';

type TestState = { seen: string[]; memberNames: string[]; joined: string[] };

apps.__test = {
  initial: () => ({ seen: [], memberNames: [], joined: [] }) as TestState,
  reduce: (state: TestState, action, ctx) => ({
    ...state,
    seen: [...state.seen, action.name],
    memberNames: Object.values(ctx.members).map((m) => m.name),
  }),
  onJoin: (state: TestState, m: Member) => ({ ...state, joined: [...state.joined, m.name] }),
};

const APP = '__test' as AppName;

beforeEach(() => __resetMemoryStore());

describe('rooms', () => {
  it('creates a room at version 1 with the app initial state', async () => {
    const doc = await createRoom(APP, 'ABCDE');
    expect(doc.version).toBe(1);
    expect(doc.code).toBe('ABCDE');
    expect(doc.state).toEqual({ seen: [], memberNames: [], joined: [] });
  });

  it('creates a code when none is given', async () => {
    const doc = await createRoom(APP);
    expect(doc.code).toMatch(/^[A-Z2-9]{5}$/);
  });

  it('joins, bumps the version and runs onJoin', async () => {
    await createRoom(APP, 'ABCDE');
    const doc = await joinRoom(APP, 'ABCDE', { id: 'm1', name: 'Maya', tone: 1 });
    expect(doc.version).toBe(2);
    expect(Object.keys(doc.members)).toEqual(['m1']);
    expect((doc.state as TestState).joined).toEqual(['Maya']);
  });

  it('acts: reducer sees members and the version increments', async () => {
    await createRoom(APP, 'ABCDE');
    await joinRoom(APP, 'ABCDE', { id: 'm1', name: 'Maya', tone: 1 });
    await joinRoom(APP, 'ABCDE', { id: 'm2', name: 'Sam', tone: 2 });
    const doc = await act(APP, 'ABCDE', { name: 'noop', memberId: 'm1', now: Date.now() });
    expect(doc.version).toBe(4);
    expect((doc.state as TestState).seen).toEqual(['noop']);
    expect((doc.state as TestState).memberNames.sort()).toEqual(['Maya', 'Sam']);
  });

  it("act with name 'join' upserts membership without calling the reducer", async () => {
    await createRoom(APP, 'ABCDE');
    const doc = await act(APP, 'ABCDE', {
      name: 'join',
      payload: { id: 'm9', name: 'Pietro', tone: 3 },
      memberId: 'm9',
      now: Date.now(),
    });
    expect(doc.members.m9.name).toBe('Pietro');
    expect((doc.state as TestState).seen).toEqual([]);
    expect((doc.state as TestState).joined).toEqual(['Pietro']);
  });

  it('creates the room on demand when acting into an unknown code', async () => {
    const doc = await act(APP, 'ZZZZZ', { name: 'noop', memberId: 'm1', now: Date.now() });
    expect(doc.version).toBe(2);
    expect(await getRoom(APP, 'ZZZZZ')).not.toBeNull();
  });

  it('is case-insensitive about codes', async () => {
    await createRoom(APP, 'ABCDE');
    expect(await getRoom(APP, 'abcde')).not.toBeNull();
  });

  it('ships a reducer for each of the four apps', () => {
    for (const name of ['cast', 'familiars', 'detour', 'palate'] as AppName[]) {
      expect(typeof apps[name].initial).toBe('function');
      expect(typeof apps[name].reduce).toBe('function');
    }
  });
});
