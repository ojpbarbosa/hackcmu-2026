type StoryInput = {
  me?: { name?: string; human?: string; seeds?: string[]; keywords?: string[] };
  bumps?: { with?: string; youBoth?: string; line?: string }[];
  clusters?: { label?: string; size?: number; mine?: boolean }[];
  roomSize?: number;
  gotAway?: { score?: number; shared?: string[]; cluster?: string } | null;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Deterministic stand-in for the chronicler: three cards, every number taken
 *  from the facts handed in, nothing invented. */
export default function mock(input: StoryInput) {
  const bumps = input?.bumps ?? [];
  const clusters = input?.clusters ?? [];
  const mine = clusters.find((c) => c.mine);
  const roomSize = input?.roomSize ?? clusters.reduce((n, c) => n + (c.size ?? 0), 0);
  const away = input?.gotAway ?? null;
  const others = bumps.map((b) => b.with).filter(Boolean) as string[];
  const last = bumps[bumps.length - 1];

  const first = bumps.length
    ? `${plural(bumps.length, 'familiar')} bumped. ${
        others.length > 1 ? `${others.slice(0, 3).join(', ')} and the rest of a long night.` : `${others[0]} started it.`
      }`
    : 'Nobody yet. The night is still young and the room is loud.';

  const callback = last
    ? `${last.with} said "${(last.line ?? '').replace(/[."]+$/, '')}". You both landed on ${
        (last.youBoth ?? 'the same thing').split('.')[0]
      }, and then the room moved.`
    : 'No exchange to call back to yet. Bump one phone and this card fills itself in.';

  const room = away
    ? `Your cluster is ${mine?.label ?? 'still forming'}, ${plural(roomSize, 'familiar')} in the room across ${plural(
        clusters.length,
        'cluster',
      )}. One of them matches you ${away.score ?? 0}%${
        away.shared?.length ? ` on ${away.shared.slice(0, 2).join(' and ')}` : ''
      }, and you never bumped.`
    : `Your cluster is ${mine?.label ?? 'still forming'} and the room holds ${plural(roomSize, 'familiar')}. Everyone worth meeting, you met.`;

  return {
    cards: [
      { label: bumps.length ? 'in one night' : 'so far', big: String(bumps.length), text: first },
      { label: 'the callback', big: '', text: callback },
      { label: 'the room', big: String(away?.score ? `${away.score}%` : roomSize), text: room },
    ],
  };
}
