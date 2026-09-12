import { pick } from './_seed';

const LABELS = ['synths', 'robotics', 'film', 'bio', 'systems', 'games', 'hardware', 'writing'];

export default function mock(input: { clusters?: { id: string; label: string }[]; clusterLabel?: string }, seed: number) {
  const existing = input?.clusters ?? [];
  const wanted = input?.clusterLabel ?? pick(LABELS, seed);
  const hit = existing.find((c) => c.label === wanted);
  if (hit) return { clusterId: hit.id, label: hit.label, created: false };
  if (existing.length >= 8) return { clusterId: existing[seed % existing.length].id, label: existing[seed % existing.length].label, created: false };
  return { clusterId: `cl_${wanted}`, label: wanted, created: true };
}
