import { makeId, pairIdFor } from './ids';
import { act } from './rooms';
import { store } from './store';
import { now } from './time';
import type { AppName } from './types';

/** Two phones knocked together. A bump matches the most recent unmatched bump from a
 *  different member in the same room whose client timestamp is within the window.
 *
 *  Concurrency: pending bumps are appended with a list push (no read-modify-write),
 *  and a match is claimed by writing each bump's result key. Two phones that record
 *  their bumps at the same instant may both "find" each other; because the pair id is
 *  derived from both bump ids they converge on one pair, and app reducers de-duplicate
 *  `bumpPaired` by pairId. */
export const BUMP_WINDOW_MS = 350;
const PENDING_TTL_SEC = 10;
const PENDING_CAP = 64;
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
type Result = { matched?: BumpMatch };

const pendingKey = (app: AppName, code: string) => `bumps:${app}:${code.toUpperCase()}`;
const resultKey = (bumpId: string) => `bump:${bumpId}`;

export async function recordBump(input: BumpInput): Promise<BumpResult> {
  const key = pendingKey(input.app, input.code);
  const id = makeId('bump');
  const t = now();
  const mine: Pending = { id, memberId: input.memberId, at: input.at, magnitude: input.magnitude, recordedAt: t };

  // Announce first so a concurrent partner can see us, then look for a partner.
  await store.lpush(key, mine, PENDING_CAP);
  await store.set<Result>(resultKey(id), {}, RESULT_TTL_SEC);

  const pending = await store.lrange<Pending>(key, PENDING_CAP);
  const candidates = pending
    .filter((p) => p.id !== id && p.memberId !== input.memberId)
    .filter((p) => t - p.recordedAt < PENDING_TTL_SEC * 1000)
    .filter((p) => Math.abs(p.at - input.at) <= BUMP_WINDOW_MS)
    .sort((a, b) => b.at - a.at);

  for (const partner of candidates) {
    const theirs = (await store.get<Result>(resultKey(partner.id))) ?? {};
    if (theirs.matched && theirs.matched.withMemberId !== input.memberId) continue; // already taken by someone else
    const pairId = theirs.matched?.pairId ?? pairIdFor(id, partner.id);
    const match: BumpMatch = { withMemberId: partner.memberId, pairId };
    await store.set<Result>(resultKey(partner.id), { matched: { withMemberId: input.memberId, pairId } }, RESULT_TTL_SEC);
    await store.set<Result>(resultKey(id), { matched: match }, RESULT_TTL_SEC);
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
    return { bumpId: id, matched: match };
  }

  return { bumpId: id };
}

/** Polled by the phone every 300 ms for six seconds after it sends a bump. */
export async function bumpStatus(bumpId: string): Promise<{ matched?: BumpMatch }> {
  return (await store.get<Result>(resultKey(bumpId))) ?? {};
}
