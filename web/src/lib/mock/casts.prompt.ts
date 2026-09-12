import { pick } from './_seed';

const HOOKS = ['nobody here answers this the same', 'this circle keeps circling it', 'you all said a version of it'];

/** Deterministic stand-in for tonight's cast. */
export default function mock(input: { keywords?: string[] }, seed: number) {
  const k = input?.keywords ?? [];
  const a = k[0] ?? 'the thing you make';
  const b = k[1] ?? 'the thing you keep';
  const forms = [
    `what did ${a} cost you?`,
    `when did ${b} start?`,
    `what would you ${a} for free?`,
  ];
  return { question: forms[seed % forms.length], hook: pick(HOOKS, seed) };
}
