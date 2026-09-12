const clampWords = (s: string, n = 18): string => s.split(/\s+/).filter(Boolean).slice(0, n).join(' ');

/** Deterministic stand-in for the intro task: one line from the via familiar. */
export default function mock(
  input: { me?: string; them?: string; via?: string; shared?: string[] },
  seed: number,
) {
  const shared = input?.shared?.[0] ?? 'the same unfinished thing';
  const them = input?.them ?? 'them';
  const me = input?.me ?? 'mine';
  const forms = [
    `${them}, mine knows ${me}. Both of you keep circling ${shared}. Go stand near each other.`,
    `Two of mine care about ${shared}. ${them}, ${me}. That is the whole introduction.`,
    `${me} and ${them} have ${shared} in common and neither will say it first.`,
  ];
  return { line: clampWords(forms[seed % forms.length]) };
}
