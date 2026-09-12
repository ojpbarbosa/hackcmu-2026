export default function mock(input: { bumps?: unknown[]; clusters?: unknown[] }, seed: number) {
  const n = input?.bumps?.length ?? (seed % 9) + 1;
  const c = input?.clusters?.length ?? 3;
  return {
    cards: [
      { label: 'in seven hours', big: String(n), text: `${n} familiars bumped. Three share a city with you, one shares a band.` },
      { label: 'the callback', big: '', text: 'One of them has the Eurorack. You said you would visit. You have not.' },
      { label: 'the room', big: String(c), text: `Most of your contacts sit in one cluster. The room has ${c} others.` },
    ],
  };
}
