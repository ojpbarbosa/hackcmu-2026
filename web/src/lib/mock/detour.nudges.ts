import { pick } from './_seed';

const LINES = [
  'left where it smells like bread',
  'keep the wall on your right',
  'cross before the light changes',
  'take the stairs, not the ramp',
  'follow the noise for one block',
  'right at the blue door',
  'straight until the trees stop',
];

export default function mock(input: { legs?: unknown[] }, seed: number) {
  const n = Math.max(1, input?.legs?.length ?? 7);
  return { nudges: Array.from({ length: n }, (_, i) => pick(LINES, seed + i * 3)) };
}
