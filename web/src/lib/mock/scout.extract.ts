/** Deterministic stand-in for the page extractor. Pulls a title from the first
 *  line of the page text; refuses to invent a date it cannot see. */
export default function mock(input: { text?: string; url?: string }, seed: number) {
  const text = (input?.text ?? '').trim();
  const title = text.split('\n').map((l) => l.trim()).find((l) => l.length > 6)?.slice(0, 60) ?? '';
  const iso = text.match(/\d{4}-\d{2}-\d{2}(?:T[\d:]+)?/)?.[0] ?? null;
  const whenISO = iso ? (iso.includes('T') ? iso : `${iso}T19:00:00`) : null;
  return {
    title,
    whenISO,
    where: text.match(/\b(?:at|@)\s+([A-Z][\w' ]{3,30})/)?.[1] ?? 'Pittsburgh',
    cost: /\bfree\b/i.test(text) ? 'free' : `$${5 + (seed % 3) * 5}`,
    kind: title ? 'listed_event' : 'self_organized',
  };
}
