import { pick, pickN } from './_seed';

const PROMPTS = [
  'A place in Pittsburgh you have walked past 50 times and never entered.',
  'What did you eat alone this week.',
  'The last song you played twice in a row.',
  'Something you were sure of at 15.',
  'Where were you at 4 pm today.',
];
const REASONS = [
  'three of four answered "Tepper" to "where were you at 4 pm" on Sep 8, 9 and 10, so routine is showing',
  'a discovery cast beat a plan because nobody has pulled a line in six days',
  '"never entered" beat "best food nearby", which already ran on Aug 30',
  'the circle answers longest to questions about places, not about feelings',
];

export default function mock(input: { mode?: string }, seed: number) {
  return {
    prompt: pick(PROMPTS, seed),
    mode: input?.mode === 'catch' ? 'catch' : 'fishing',
    reasons: pickN(REASONS, seed, 3),
    rejected: pickN(PROMPTS, seed + 1, 2),
  };
}
