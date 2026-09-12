import { beforeEach, describe, expect, it } from 'vitest';
import { cast, type CastState } from '@/lib/apps/cast';
import { llm } from '@/lib/llm';
import type { Action, Ctx } from '@/lib/rooms';
import { __resetMemoryStore } from '@/lib/store';
import type { Member } from '@/lib/types';

const member = (id: string, name: string, tone: 1 | 2 | 3 | 4): Member => ({
  id,
  name,
  tone,
  joinedAt: 1,
  lastSeen: 1,
});

const A = member('m_a', 'Jo', 1);
const B = member('m_b', 'Pietro', 2);
const C = member('m_c', 'Maya', 3);
const D = member('m_d', 'Sam', 4);

function ctxFor(members: Member[]): Ctx {
  return { app: 'cast', code: 'TEST', llm, members: Object.fromEntries(members.map((m) => [m.id, m])) };
}

async function run(
  state: CastState,
  members: Member[],
  name: string,
  payload: unknown,
  memberId: string,
  at = Date.now(),
): Promise<CastState> {
  const action: Action = { name, payload, memberId, now: at };
  return (await cast.reduce(state, action, ctxFor(members))) as CastState;
}

const latest = (s: CastState) => s.casts[0];

beforeEach(() => __resetMemoryStore());

describe('cast reducer', () => {
  it('seeds the circle with a name, ghosts and a fortnight of casts', () => {
    const s = cast.initial('TEST');
    expect(s.name).toBe('the basement');
    expect(s.casts.length).toBeGreaterThanOrEqual(5);
    expect(s.casts.every((c) => c.seeded)).toBe(true);
    expect(s.casts[0].openedAt).toBeGreaterThan(s.casts[1].openedAt); // newest first
    expect(s.plans.filter((p) => p.caughtAt !== null).length).toBe(1);
    expect(Object.keys(s.ghosts).length).toBe(4);
    for (const c of s.casts) {
      for (const id of Object.keys(c.answers)) expect(s.ghosts[id]).toBeTruthy();
    }
  });

  it('castNow opens a cast with a prompt, a 90s deadline and no repeat of history', async () => {
    const s0 = cast.initial('TEST');
    const s1 = await run(s0, [A, B, C], 'castNow', {}, A.id, 1000);
    expect(s1.casts.length).toBe(s0.casts.length + 1);
    const c = latest(s1);
    expect(c.prompt.length).toBeGreaterThan(8);
    expect(c.seeded).toBeFalsy();
    expect(c.deadlineAt - c.openedAt).toBe(90_000);
    expect(c.revealedAt).toBeNull();
    expect(c.reasons.length).toBe(3);
    expect(s0.casts.map((h) => h.prompt)).not.toContain(c.prompt);
  });

  it('swallows a double tap on Cast now but allows the next real cast', async () => {
    let s = cast.initial('TEST');
    const members = [A, B];
    s = await run(s, members, 'castNow', {}, A.id, 1000);
    const one = s.casts.length;
    s = await run(s, members, 'castNow', {}, B.id, 1400); // the second phone, same moment
    expect(s.casts.length).toBe(one);

    s = await run(s, members, 'answer', { castId: latest(s).id, text: 'a' }, A.id, 1500);
    s = await run(s, members, 'answer', { castId: latest(s).id, text: 'b' }, B.id, 1600);
    s = await run(s, members, 'castNow', {}, A.id, 1700); // answered: a new cast is meant
    expect(s.casts.length).toBe(one + 1);
    expect(latest(s).prompt).not.toBe(s.casts[1].prompt);
  });

  it('reveals only once every member has answered', async () => {
    let s = cast.initial('TEST');
    const members = [A, B, C];
    s = await run(s, members, 'castNow', {}, A.id, 1000);
    const id = latest(s).id;

    s = await run(s, members, 'answer', { castId: id, text: 'the fish bar on Forbes' }, A.id, 2000);
    expect(latest(s).revealedAt).toBeNull();
    s = await run(s, members, 'answer', { castId: id, text: 'Phipps' }, B.id, 3000);
    expect(latest(s).revealedAt).toBeNull();
    s = await run(s, members, 'answer', { castId: id, text: 'Randyland' }, C.id, 4000);
    expect(latest(s).revealedAt).toBe(4000);
    expect(Object.keys(latest(s).answers).sort()).toEqual([A.id, B.id, C.id]);
  });

  it('ignores stage viewers when counting the reveal', async () => {
    const stage = member('stage-1', 'projector', 1);
    let s = cast.initial('TEST');
    const members = [A, B, stage];
    s = await run(s, members, 'castNow', {}, A.id, 1000);
    const id = latest(s).id;
    s = await run(s, members, 'answer', { castId: id, text: 'one' }, A.id, 2000);
    s = await run(s, members, 'answer', { castId: id, text: 'two' }, B.id, 3000);
    expect(latest(s).revealedAt).toBe(3000);
  });

  it('in catch mode makes a plan on reveal, and three of four pulls catch it', async () => {
    let s = cast.initial('TEST');
    const members = [A, B, C, D];
    s = await run(s, members, 'setMode', { mode: 'catch' }, A.id, 500);
    expect(s.mode).toBe('catch');
    s = await run(s, members, 'castNow', {}, A.id, 1000);
    const id = latest(s).id;
    for (const [i, m] of members.entries()) {
      s = await run(s, members, 'answer', { castId: id, text: `answer ${i}` }, m.id, 2000 + i);
    }
    expect(latest(s).revealedAt).toBe(2003);

    const plan = s.plans.find((p) => p.castId === id);
    expect(plan).toBeTruthy();
    expect(plan!.quorum).toBe(3); // max(2, ceil(4 * 0.75))
    expect(plan!.venue.length).toBeGreaterThan(2);
    expect(members.map((m) => m.id)).toContain(plan!.pickerId);
    expect(plan!.caughtAt).toBeNull();

    s = await run(s, members, 'pull', { planId: plan!.id }, A.id, 3000);
    expect(s.plans.find((p) => p.id === plan!.id)!.pulls).toEqual([A.id]);
    s = await run(s, members, 'pull', { planId: plan!.id }, A.id, 3100); // idempotent
    s = await run(s, members, 'pull', { planId: plan!.id }, B.id, 3200);
    expect(s.plans.find((p) => p.id === plan!.id)!.caughtAt).toBeNull();
    s = await run(s, members, 'pull', { planId: plan!.id }, C.id, 3300);
    const caught = s.plans.find((p) => p.id === plan!.id)!;
    expect(caught.pulls.length).toBe(3);
    expect(caught.caughtAt).toBe(3300);
  });

  it('newPlan replaces the open plan and avoids the venue it just proposed', async () => {
    let s = cast.initial('TEST');
    const members = [A, B, C];
    s = await run(s, members, 'setMode', { mode: 'catch' }, A.id, 500);
    s = await run(s, members, 'castNow', {}, A.id, 1000);
    const id = latest(s).id;
    for (const [i, m] of members.entries()) {
      s = await run(s, members, 'answer', { castId: id, text: `the ${i} room` }, m.id, 2000 + i);
    }
    const first = s.plans.find((p) => p.castId === id)!;
    s = await run(s, members, 'newPlan', { castId: id }, A.id, 4000);
    const plans = s.plans.filter((p) => p.castId === id);
    expect(plans.length).toBe(1);
    expect(plans[0].id).not.toBe(first.id);
    expect(plans[0].venue).not.toBe(first.venue);
    expect(plans[0].pulls).toEqual([]);
  });

  it('schedules a cast and opens it on the first tick after the deadline', async () => {
    let s = cast.initial('TEST');
    const members = [A, B];
    const before = s.casts.length;
    s = await run(s, members, 'schedule', { inMs: 120_000 }, A.id, 1000);
    expect(s.scheduledAt).toBe(121_000);
    s = await run(s, members, 'tick', {}, A.id, 100_000);
    expect(s.casts.length).toBe(before);
    s = await run(s, members, 'tick', {}, A.id, 121_001);
    expect(s.casts.length).toBe(before + 1);
    expect(s.scheduledAt).toBeNull();
    expect(latest(s).openedAt).toBe(121_001);
  });

  it('records typing and clears it when the answer lands', async () => {
    let s = cast.initial('TEST');
    const members = [A, B];
    s = await run(s, members, 'castNow', {}, A.id, 1000);
    s = await run(s, members, 'typing', {}, B.id, 2000);
    expect(s.typing[B.id]).toBe(2000);
    s = await run(s, members, 'answer', { castId: latest(s).id, text: 'here' }, B.id, 2500);
    expect(s.typing[B.id]).toBeUndefined();
  });

  it('renames the circle and ignores unknown actions', async () => {
    let s = cast.initial('TEST');
    s = await run(s, [A], 'setName', { name: 'the attic' }, A.id, 10);
    expect(s.name).toBe('the attic');
    const same = await run(s, [A], 'wat', {}, A.id, 20);
    expect(same).toEqual(s);
  });
});
