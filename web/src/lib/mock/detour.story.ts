import { pick } from './_seed';

/** Deterministic stand-in for detour.story: the arrival card. */

const TITLES = [
  'six blocks you had never turned',
  'the long way, on purpose',
  'you found the back of the hill',
  'a walk with the map switched off',
];

type Input = {
  places?: { name?: string; kind?: string }[];
  stats?: { km?: number; newPlaces?: number; looks?: number; minutes?: number };
};

export default function mock(input: Input, seed: number) {
  const stats = input?.stats ?? {};
  const n = stats.newPlaces ?? input?.places?.length ?? 6;
  const km = stats.km ?? 2.9;
  const first = input?.places?.[0]?.name;
  const title = n >= 6 ? pick(TITLES, seed) : pick([TITLES[1], TITLES[3]], seed);
  const tail = first ? ` You would not have found ${first} on the direct route.` : '';
  return {
    title,
    line: `${km} km, ${n} places you had never stood in, and you never saw the route.${tail}`.slice(0, 200),
  };
}
