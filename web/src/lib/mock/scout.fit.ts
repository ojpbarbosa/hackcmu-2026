/** Deterministic stand-in for self-organized fillers: things the circle could do
 *  without an organiser, built from their own keywords. */
export default function mock(input: { keywords?: string[]; city?: string; need?: number }, seed: number) {
  const k = input?.keywords ?? [];
  const city = input?.city ?? 'Pittsburgh';
  const need = Math.max(1, Math.min(3, Math.round(input?.need ?? 3)));
  const day = 24 * 60 * 60 * 1000;
  const base = Date.UTC(2026, 8, 12, 23, 0, 0);
  const forms = [
    (t: string) => ({ title: `${t} jam, bring one thing`, where: 'a makerspace bench', cost: 'free' }),
    (t: string) => ({ title: `${t} walk, no agenda`, where: `${city} riverfront`, cost: 'free' }),
    (t: string) => ({ title: `${t} table at the late cafe`, where: 'the cafe that stays open', cost: '$5' }),
  ];
  const cards = Array.from({ length: need }, (_, i) => {
    const topic = k[i % Math.max(1, k.length)] ?? 'the thing you make';
    const f = forms[(seed + i) % forms.length](topic);
    return {
      ...f,
      whenISO: new Date(base + (i + 1) * day).toISOString(),
      why: `All of you said ${topic} without being asked.`,
    };
  });
  return { cards };
}
