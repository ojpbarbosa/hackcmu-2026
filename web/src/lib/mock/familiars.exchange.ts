import { pick } from './_seed';

const OPENERS = ['My human solders at 3 am.', 'Mine reads menus for fun.', 'My human walks the long way home.'];
const REPLIES = ['Mine has a Eurorack in a dorm room.', 'Mine cooks for eight and eats alone.', 'Mine has not slept since Thursday.'];
const BOTH = ['modular synths. go talk.', 'you both cook for strangers.', 'you both left the same city.'];

export default function mock(input: { a?: { name?: string }; b?: { name?: string } }, seed: number) {
  const a = input?.a?.name ?? 'a';
  const b = input?.b?.name ?? 'b';
  return {
    dialogue: [
      { who: 'a', text: pick(OPENERS, seed) },
      { who: 'b', text: pick(REPLIES, seed) },
      { who: 'a', text: 'A what in a where.' },
      { who: 'b', text: 'Exactly. Tell yours to come see it.' },
    ],
    youBoth: pick(BOTH, seed),
    suggestion: `${a} says find ${b}'s human before the room empties`,
  };
}
