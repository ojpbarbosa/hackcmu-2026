import { pick } from './_seed';

/** Deterministic stand-in for cast.plan. If the answers name a place, the plan
 *  goes there; otherwise it picks an authored Pittsburgh plan the circle has not
 *  had yet. `replacing` is the venue a "different night" request just rejected. */

type Answer = { memberId?: string; name?: string; text: string };
type Input = {
  prompt?: string;
  answers?: Answer[];
  members?: { id: string; name: string }[];
  city?: string;
  avoid?: string[];
  replacing?: string;
};

const PLANS = [
  {
    title: 'somewhere none of you have been',
    venue: 'Nationality Rooms',
    subtitle: 'Cathedral of Learning · 14 min walk from Tepper',
    match: /nationality|cathedral|learning/i,
    why: 'three of you named a place you pass every day and have never gone into',
  },
  {
    title: 'the room under the bridge',
    venue: 'The Warren',
    subtitle: 'Downtown · 12 min on the 61C',
    match: /bar|bridge|neon|drink|pub/i,
    why: 'the answers wanted a room with a low ceiling and no plan after it',
  },
  {
    title: 'a kitchen that closes at nine',
    venue: 'Kaya',
    subtitle: 'Strip District · 18 min from campus',
    match: /eat|ate|food|dinner|hungry|kitchen|noodle|chicken/i,
    why: 'everybody answered about eating alone, so this one is a table with four chairs',
  },
  {
    title: 'the glass house at dusk',
    venue: 'Phipps Conservatory',
    subtitle: 'Schenley Park · 11 min walk from Tepper',
    match: /phipps|plant|glass|garden|green/i,
    why: 'one of you has been saying "Phipps, I know, I know" for a fortnight',
  },
];

/** 19:10 next Thursday, local time. */
function nextThursday(): Date {
  const d = new Date();
  const ahead = (4 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + ahead);
  d.setHours(19, 10, 0, 0);
  return d;
}

export default function mock(input: Input, seed: number) {
  const answers = input?.answers ?? [];
  const members = input?.members ?? [];
  const avoid = new Set(input?.avoid ?? []);
  const replacing = input?.replacing;

  const open = PLANS.filter((p) => p.venue !== replacing);
  const hit = open.find((p) => answers.some((a) => p.match.test(a.text)));
  const fresh = open.filter((p) => !avoid.has(p.venue));
  const plan = hit ?? (fresh.length ? pick(fresh, seed) : pick(open, seed));

  const author = answers.find((a) => plan.match.test(a.text));
  const pickerId = author?.memberId ?? (members.length ? members[seed % members.length].id : 'unknown');
  const pickerName = author?.name ?? members.find((m) => m.id === pickerId)?.name;

  return {
    title: plan.title,
    venue: plan.venue,
    subtitle: plan.subtitle,
    whenISO: nextThursday().toISOString(),
    pickerId,
    why: pickerName ? `${plan.why} — ${pickerName} said it first` : plan.why,
  };
}
