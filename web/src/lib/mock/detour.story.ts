import { pick } from './_seed';

const TITLES = ['six blocks you had never turned', 'the long way, on purpose', 'you found the back of the hill'];

export default function mock(input: { stats?: { newPlaces?: number } }, seed: number) {
  const n = input?.stats?.newPlaces ?? 6;
  return { title: pick(TITLES, seed), line: `${n} places you had never stood in, and you never saw the route.` };
}
