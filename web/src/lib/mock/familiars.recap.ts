/** Deterministic stand-in for the recap task: three cards, no model call. */
export default function mock(
  input: { met?: number; pairs?: number; groups?: number; lastSay?: string; cluster?: string; nearly?: number },
  seed: number,
) {
  const met = input?.met ?? 0;
  const pairs = input?.pairs ?? met;
  const cluster = input?.cluster ?? 'the same unfinished thing';
  const say = input?.lastSay ?? 'you said you would send the patch';
  return {
    cards: [
      {
        label: 'in one night',
        big: String(met),
        text: `${met} familiars met yours. ${pairs} of those turned into a conversation you actually had.`,
      },
      {
        label: 'the callback',
        text: `${say} Nobody has followed up yet. That is still yours to do.`,
      },
      {
        label: 'the room',
        big: `${72 + (seed % 23)}%`,
        text: `Your corner of the room is ${cluster}. One person matched you that closely and you never met.`,
      },
    ],
  };
}
