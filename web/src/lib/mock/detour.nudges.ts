import { pick } from './_seed';

/** Deterministic stand-in for detour.nudges: one sentence per leg, built from the
 *  turn and what is actually on that corner. Never names the destination. */

type MockLeg = {
  turn?: string;
  streets?: string[];
  poi?: { name?: string; kind?: string } | null;
  last?: boolean;
};

const OPEN: Record<string, string[]> = {
  left: ['left'],
  right: ['right'],
  straight: ['keep going', 'straight on'],
};

const BY_KIND: Record<string, string[]> = {
  bakery: ['where it smells like bread', 'past the warm window'],
  cafe: ['toward the coffee smell', 'past the steamed-up glass'],
  restaurant: ['where the kitchen fans hum', 'past the smell of garlic'],
  fast_food: ['past the fryer smell', 'where the paper bags go by'],
  ice_cream: ['toward the freezer hum', 'past the small queue'],
  bar: ['past the door that leaks music'],
  pub: ['past the door that leaks music'],
  artwork: ['until something metal catches light', 'past the strange shape'],
  memorial: ['past the old stone', 'until the names appear'],
  monument: ['past the old stone'],
  museum: ['past the wide stone steps'],
  library: ['past the quiet windows', 'where the glass goes quiet'],
  park: ['until the trees stop', 'into the green part'],
  garden: ['into the green part', 'where it starts to smell of soil'],
  place_of_worship: ['past the tall doors', 'until the bells are behind you'],
  university: ['past the noticeboards'],
  college: ['past the noticeboards'],
  school: ['past the painted railings'],
  kindergarten: ['past the small gate'],
  books: ['past a window of spines'],
  supermarket: ['past the crates outside'],
  convenience: ['past the crates outside'],
  marketplace: ['through where people are buying things'],
  bicycle: ['past the bike racks'],
  bicycle_rental: ['past the rack of blue bikes'],
  theatre: ['past the lit marquee'],
  cinema: ['past the lit marquee'],
  pharmacy: ['past the green cross'],
  bank: ['past the mirrored glass'],
  hospital: ['past the ambulance bay'],
  fountain: ['until you can hear water'],
  bench: ['to the bench nobody uses'],
  viewpoint: ['until the ground drops away'],
};

const DEFAULT_CLAUSE = [
  'until the noise changes',
  'until the sidewalk widens',
  'one block further than feels right',
  'until the ground tilts',
  'until the brick turns to stone',
];

const LAST_CLAUSE = [
  'until the ground flattens out',
  'until the sidewalk opens up',
  'until you can stop walking',
  'until the trees give way',
];

const STEPS = ['take the stairs, not the ramp', 'up the steps, slowly'];

function sentence(leg: MockLeg, seed: number): string {
  const turn = OPEN[leg.turn ?? 'straight'] ?? OPEN.straight;
  const open = pick(turn, seed);
  const streets = leg.streets ?? [];
  if (streets.some((s) => /steps/i.test(s))) return pick(STEPS, seed);
  if (leg.last) return `${open} ${pick(LAST_CLAUSE, seed)}`;
  const kind = leg.poi?.kind ?? '';
  const clause = BY_KIND[kind] ?? DEFAULT_CLAUSE;
  return `${open} ${pick(clause, seed)}`;
}

export default function mock(input: { legs?: MockLeg[]; mood?: string; count?: number }, seed: number) {
  const legs = input?.legs ?? [];
  const n = Math.max(1, input?.count ?? legs.length ?? 7);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const leg = legs[i] ?? { turn: 'straight', last: i === n - 1 };
    out.push(sentence(leg, seed + i * 7));
  }
  return { nudges: out };
}
