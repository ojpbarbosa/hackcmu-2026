import { pick } from './_seed';

type In = {
  dishes?: { id: string; name: string; hits?: string[]; score?: number; status?: string; blockedBy?: string }[];
};

const STRONG = [
  (h: string[]) => `${h[0]} and ${h[1]}, both high on your profile`,
  (h: string[]) => `${h[0]} · ${h[1]}. three of your top five live here`,
  (h: string[]) => `built on ${h[0]}, finished with ${h[1]}`,
];
const MIDDLE = [
  (h: string[]) => `${h[0]} lands; ${h[1]} is further from what you log`,
  (h: string[]) => `${h[0]} works, the rest of it drifts`,
  (h: string[]) => `some ${h[0]}, not much else you keep ordering`,
];
const WEAK = [
  (h: string[]) => `mostly ${h[0]}. little of what you keep ordering`,
  (h: string[]) => `${h[0]} is the only thread back to your palate`,
  () => `nothing here lines up with what you log`,
];

/** Reasons are templated from the deterministic hits, so the sentence can never claim
 *  an ingredient the scorer did not actually find. Batched: one call per menu. */
export default function mock(input: In, seed: number) {
  const reasons: Record<string, string> = {};
  (input?.dishes ?? []).forEach((d, i) => {
    const h = [...(d.hits ?? [])];
    const s = seed + i * 13;
    if (d.status === 'never') {
      reasons[d.id] = `contains ${d.blockedBy ?? 'something you never eat'}. the wall stands`;
      return;
    }
    if (d.status === 'unknown') {
      reasons[d.id] = 'no ingredient record. it stays grey until the kitchen answers';
      return;
    }
    if (h.length < 2) {
      reasons[d.id] = h.length === 1 ? `${h[0]} is the only thread back to your palate` : 'nothing here lines up with what you log';
      return;
    }
    const score = d.score ?? 0;
    const bank = score >= 78 ? STRONG : score >= 55 ? MIDDLE : WEAK;
    reasons[d.id] = pick(bank, s)(h);
  });
  return { reasons };
}
