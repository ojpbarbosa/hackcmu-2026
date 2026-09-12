import { makeId } from './ids';
import { act } from './rooms';
import { store } from './store';
import { now } from './time';
import type { AppName } from './types';

/** Two phones knocked together. A bump matches the most recent unmatched bump from a
 *  different member in the same room whose client timestamp is within the window. */
export const BUMP_WINDOW_MS = 350;
const PENDING_TTL_SEC = 10;
const RESULT_TTL_SEC = 120;

export type BumpInput = {
  app: AppName;
  code: string;
  memberId: string;
  /** client time, already corrected by the server clock offset */
  at: number;
  magnitude: number;
};

export type BumpMatch = { withMemberId: string; pairId: string };
export type BumpResult = { bumpId: string; matched?: BumpMatch };

type Pending = { id: string; memberId: string; at: number; magnitude: number; recordedAt: number };

const pendingKey = (app: AppName, code: string) => `bumps:${app}:${code.toUpperCase()}`;
const resultKey = (bumpId: string) => `bump:${bumpId}`;

export async function recordBump(input: BumpInput): Promise<BumpResult> {
  const key = pendingKey(input.app, input.code);
  const id = makeId('bump');
  const t = now();

  const pending = (await store.get<Pending[]>(key)) ?? [];
  const fresh = pending.filter((p) => t - p.recordedAt < PENDING_TTL_SEC * 1000);

  const partner = fresh
    .filter((p) => p.memberId !== input.memberId && Math.abs(p.at - input.at) <= BUMP_WINDOW_MS)
    .sort((a, b) => b.at - a.at)[0];

  if (partner) {
    const pairId = makeId('pair');
    await store.set(key, fresh.filter((p) => p.id !== partner.id), PENDING_TTL_SEC);
    await store.set(resultKey(partner.id), { matched: { withMemberId: input.memberId, pairId } }, RESULT_TTL_SEC);
    await store.set(resultKey(id), { matched: { withMemberId: partner.memberId, pairId } }, RESULT_TTL_SEC);
    try {
      await act(input.app, input.code, {
        name: 'bumpPaired',
        payload: { pairId, a: partner.memberId, b: input.memberId },
        memberId: input.memberId,
        now: t,
      });
    } catch {
      /* the pairing stands even if the app reducer refuses it */
    }
    return { bumpId: id, matched: { withMemberId: partner.memberId, pairId } };
  }

  fresh.push({ id, memberId: input.memberId, at: input.at, magnitude: input.magnitude, recordedAt: t });
  await store.set(key, fresh, PENDING_TTL_SEC);
  await store.set(resultKey(id), {}, RESULT_TTL_SEC);
  return { bumpId: id };
}

/** Polled by the phone every 300 ms for six seconds after it sends a bump. */
export async function bumpStatus(bumpId: string): Promise<{ matched?: BumpMatch }> {
  return (await store.get<{ matched?: BumpMatch }>(resultKey(bumpId))) ?? {};
}
