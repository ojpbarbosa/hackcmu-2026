import { pick } from './_seed';

const PLANS = [
  { title: 'somewhere none of you have been', venue: 'Nationality Rooms', subtitle: 'Cathedral of Learning · 14 min walk from Tepper' },
  { title: 'the room under the bridge', venue: 'The Warren', subtitle: 'Downtown · 12 min on the 61C' },
  { title: 'a kitchen that closes at nine', venue: 'Kaya', subtitle: 'Strip District · 18 min from campus' },
];

export default function mock(input: { members?: { id: string }[] }, seed: number) {
  const p = pick(PLANS, seed);
  const members = input?.members ?? [];
  const picker = members.length ? members[seed % members.length].id : 'unknown';
  const when = new Date(Date.now() + 3 * 86400000);
  when.setHours(19, 10, 0, 0);
  return { ...p, whenISO: when.toISOString(), pickerId: picker, why: 'three of you named a place you pass every day and have never gone into' };
}
