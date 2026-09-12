import { pick } from './_seed';

export type ExchangeSide = {
  name?: string;
  human?: string;
  pronouns?: string;
  keywords?: string[];
  transcript?: string;
};

const clampWords = (s: string, n = 12): string => s.split(/\s+/).filter(Boolean).slice(0, n).join(' ');

const tag = (side: ExchangeSide, i = 0): string => side.keywords?.[i] ?? side.keywords?.[0] ?? 'that';

const OPENERS = [
  (a: ExchangeSide) => `Mine has not stopped about ${tag(a)} since Thursday.`,
  (a: ExchangeSide) => `Mine is here for ${tag(a)} and the free coffee.`,
  (a: ExchangeSide) => `Mine said ${tag(a)} twice before saying hello.`,
];
const REPLIES = [
  (b: ExchangeSide) => `Mine keeps ${tag(b, 1)} in a bag, always.`,
  (b: ExchangeSide) => `Mine came a long way for ${tag(b)}.`,
  (b: ExchangeSide) => `Mine does ${tag(b)} when the room is empty.`,
];
const REACTIONS = [
  (b: ExchangeSide) => `A ${tag(b)} person. Mine will want to see that.`,
  () => 'Say that again, slower. Mine is taking notes.',
  (b: ExchangeSide) => `${tag(b)}. Of course it is ${tag(b)}.`,
];
const CLOSERS = [
  () => 'Then tell yours to come find mine before dawn.',
  () => 'Agreed. Same corner of the map, different table.',
  (_b: ExchangeSide, a: ExchangeSide) => `Mine is the other one who says ${tag(a, 2)}.`,
];

const BOTH = ['the long way home.', 'building at 3 am.', 'the same unfinished thing.'];

/** "she/her" → "her". Used so `say` reads with the other human's stated pronouns. */
const object = (p?: string): string => (p ?? 'they/them').split('/')[1] ?? 'them';

/** Deterministic stand-in for the exchange task: four alternating lines, the one
 *  thing the humans share, and what to say next. */
export default function mock(input: { a?: ExchangeSide; b?: ExchangeSide }, seed: number) {
  const a = input?.a ?? {};
  const b = input?.b ?? {};

  const ka = new Set((a.keywords ?? []).map((k) => k.toLowerCase()));
  const shared = (b.keywords ?? []).find((k) => ka.has(k.toLowerCase()));

  const lines = [
    { who: 'a', text: clampWords(OPENERS[seed % OPENERS.length](a)) },
    { who: 'b', text: clampWords(REPLIES[(seed >>> 2) % REPLIES.length](b)) },
    { who: 'a', text: clampWords(REACTIONS[(seed >>> 4) % REACTIONS.length](b)) },
    { who: 'b', text: clampWords(CLOSERS[(seed >>> 6) % CLOSERS.length](b, a)) },
  ];

  const youBoth = shared ? `${shared}. go talk.` : pick(BOTH, seed);
  const say = clampWords(`Ask ${object(b.pronouns)} about ${shared ?? tag(b)}.`, 10);

  return { lines, youBoth, say };
}
