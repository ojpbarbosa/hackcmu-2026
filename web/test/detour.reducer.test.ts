import { describe, expect, it } from 'vitest';
import { detour, type DetourState } from '@/lib/apps/detour';
import { llm } from '@/lib/llm';
import type { Action, Ctx } from '@/lib/rooms';
import type { Member } from '@/lib/types';
import { venueById } from '@/lib/detour/venues';

const member: Member = { id: 'm1', name: 'Ana', tone: 2, joinedAt: 0, lastSeen: 0 };
const ctx: Ctx = { app: 'detour', code: 'TEST1', llm, members: { m1: member } };
const T0 = 1_757_600_000_000;

const act = (state: DetourState, name: string, payload?: unknown, now = T0): Promise<DetourState> =>
  Promise.resolve(detour.reduce(state, { name, payload, memberId: 'm1', now } as Action, ctx));

async function started(budgetMin = 45, mood = 'somewhere new'): Promise<DetourState> {
  const tepper = venueById('tepper');
  return act(detour.initial('TEST1'), 'start', {
    start: [tepper.lat, tepper.lng],
    endpointName: 'Schenley Plaza',
    budgetMin,
    mood,
  });
}

describe('detour reducer', () => {
  it('starts a walk with one nudge per leg', async () => {
    const s = await started();
    const w = s.walks.m1;
    expect(w).toBeTruthy();
    expect(w.walk.legs.length).toBeGreaterThan(1);
    expect(w.nudges.length).toBe(w.walk.legs.length);
    expect(w.nudges.every((n) => n.trim().length > 0)).toBe(true);
    expect(w.nudges.every((n) => n === n.toLowerCase())).toBe(true);
    expect(w.memberName).toBe('Ana');
    expect(w.endpoint.name).toBe('Schenley Plaza');
    expect(w.progress.legIndex).toBe(0);
    expect(w.endedAt).toBeNull();
    expect(w.solver.chosenPois).toBeGreaterThanOrEqual(3);
    expect(w.solver.consideredPois).toBeGreaterThan(w.solver.chosenPois);
    expect(s.focus).toBe('m1');
  });

  it('never names the endpoint in a nudge', async () => {
    const s = await started();
    const w = s.walks.m1;
    for (const n of w.nudges) {
      expect(n).not.toContain('schenley');
      expect(n).not.toContain('plaza');
    }
  });

  it('advances, counts phone looks and moves the walker', async () => {
    let s = await started();
    s = await act(s, 'advance', { legIndex: 2 }, T0 + 60_000);
    expect(s.walks.m1.progress.legIndex).toBe(2);
    // never goes backwards
    s = await act(s, 'advance', { legIndex: 1 }, T0 + 70_000);
    expect(s.walks.m1.progress.legIndex).toBe(2);

    s = await act(s, 'look', {}, T0 + 80_000);
    s = await act(s, 'look', {}, T0 + 90_000);
    expect(s.walks.m1.phoneLooks).toBe(2);

    s = await act(s, 'move', { lat: 40.4432, lng: -79.9448, heading: 90 }, T0 + 95_000);
    expect(s.walks.m1.progress.lat).toBeCloseTo(40.4432, 4);
    expect(s.walks.m1.progress.heading).toBe(90);
  });

  it('ends with a story and keeps the route until then', async () => {
    let s = await started();
    expect(s.walks.m1.story).toBeNull();
    s = await act(s, 'end', {}, T0 + 30 * 60_000);
    const w = s.walks.m1;
    expect(w.endedAt).toBe(T0 + 30 * 60_000);
    expect(w.story?.title.length).toBeGreaterThan(0);
    expect(w.story?.line.length).toBeGreaterThan(0);
    expect(w.progress.legIndex).toBe(w.walk.legs.length - 1);
  });

  it('clamps a silly budget and survives an unknown action', async () => {
    const tepper = venueById('tepper');
    let s = await act(detour.initial('TEST1'), 'start', {
      start: [tepper.lat, tepper.lng],
      endpointName: 'Tepper School',
      budgetMin: 400,
      mood: 'quiet',
    });
    expect(s.walks.m1.budgetMin).toBe(90);
    s = await act(s, 'nonsense', {});
    expect(s.walks.m1).toBeTruthy();
    s = await act(s, 'reset', {});
    expect(s.walks.m1).toBeUndefined();
  });
});
