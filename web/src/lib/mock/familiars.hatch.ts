import { pick } from './_seed';

const NAMES = ['moth', 'kestrel', 'heron', 'vole', 'marten', 'swift', 'pike', 'wren', 'otter', 'shrike'];
const CLUSTERS = ['synths', 'robotics', 'film', 'bio', 'systems', 'games'];

export default function mock(input: { seeds?: string[] }, seed: number) {
  const words = (input?.seeds ?? []).join(' ').toLowerCase().match(/[a-z]{4,}/g) ?? [];
  const keywords = [...new Set(words)].slice(0, 5);
  while (keywords.length < 5) keywords.push(pick(['night', 'build', 'city', 'sound', 'code'], seed + keywords.length));
  return { name: pick(NAMES, seed), keywords, clusterLabel: pick(CLUSTERS, seed) };
}
