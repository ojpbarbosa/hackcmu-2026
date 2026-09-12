import { pick } from './_seed';

export type ExchangeSide = {
  name?: string;
  seeds?: string[];
  keywords?: string[];
  human?: string;
  seat?: string;
};

const clampWords = (s: string, n = 12): string => s.split(/\s+/).filter(Boolean).slice(0, n).join(' ');

/** "I build synths at 3 am" → "build synths at 3 am", case kept. */
const quote = (s: string | undefined, n = 6): string =>
  clampWords((s ?? '').trim().replace(/^(i'm|i am|i|my)\s+/i, '').replace(/[.]+$/, ''), n);

/** "Recife, then Pittsburgh" → "Recife" */
const place = (s: string | undefined): string => {
  const first = (s ?? '').replace(/^(i'm|i am)\s+from\s+/i, '').split(/[,;]/)[0].trim();
  return first ? clampWords(first, 2) : 'somewhere else';
};

const tag = (side: ExchangeSide, i = 0): string =>
  side.keywords?.[i] ?? side.keywords?.[0] ?? quote(side.seeds?.[0], 2).toLowerCase() ?? 'that';

const OPENERS = [
  (a: ExchangeSide) => `Mine wrote "${quote(a.seeds?.[0], 5)}" on the way in.`,
  (a: ExchangeSide) => `Mine has not stopped about ${tag(a)} since Thursday.`,
  (a: ExchangeSide) => `Mine is here for ${tag(a)} and the free coffee.`,
];

const REPLIES = [
  (b: ExchangeSide) => `Mine answered "${quote(b.seeds?.[2], 5)}" and meant it.`,
  (b: ExchangeSide) => `Mine keeps ${tag(b, 1)} in a bag, always.`,
  (b: ExchangeSide) => `Mine came from ${place(b.seeds?.[1])} for ${tag(b)}.`,
];

const REACTIONS = [
  (b: ExchangeSide) => `A ${tag(b)} person. Mine will want to see that.`,
  () => 'Say that again, slower. Mine is taking notes.',
  (b: ExchangeSide) => `${tag(b)}. Of course it is ${tag(b)}.`,
];

const CLOSERS = [
  () => 'Then tell yours to come find mine before dawn.',
  () => 'Agreed. Same corner of the map, different table.',
  (_b: ExchangeSide, a: ExchangeSide) => `Mine is the other one who says "${quote(a.seeds?.[2], 4)}".`,
];

const BOTH = ['the long way home.', 'building at 3 am.', 'the same unfinished thing.'];

/** Deterministic stand-in for the exchange task: four alternating lines, the one
 *  thing the humans share, and what to do about it. */
export default function mock(input: { a?: ExchangeSide; b?: ExchangeSide }, seed: number) {
  const a = input?.a ?? {};
  const b = input?.b ?? {};

  const ka = new Set((a.keywords ?? []).map((k) => k.toLowerCase()));
  const shared = (b.keywords ?? []).find((k) => ka.has(k.toLowerCase()));

  const dialogue = [
    { who: 'a', text: clampWords(OPENERS[seed % OPENERS.length](a)) },
    { who: 'b', text: clampWords(REPLIES[(seed >>> 2) % REPLIES.length](b)) },
    { who: 'a', text: clampWords(REACTIONS[(seed >>> 4) % REACTIONS.length](b)) },
    { who: 'b', text: clampWords(CLOSERS[(seed >>> 6) % CLOSERS.length](b, a)) },
  ];

  const youBoth = shared ? `${shared}. go talk.` : pick(BOTH, seed);
  const who = b.human ?? `${b.name ?? 'the other familiar'}'s human`;
  const where = b.seat ? ` at ${b.seat}` : ' somewhere in this room';

  return {
    dialogue,
    youBoth,
    suggestion: `${who} is${where}. Go before the room empties.`,
  };
}
