import { pick } from './_seed';

const STOP = new Set([
  'about', 'after', 'again', 'because', 'before', 'could', 'every', 'their', 'there', 'these', 'thing',
  'things', 'think', 'those', 'where', 'which', 'while', 'would', 'really', 'still', 'stuff', 'lately',
  'always', 'never', 'myself', 'people', 'pretty', 'though',
]);

const CLUSTERS = ['late nights', 'small machines', 'hand tools', 'field notes', 'open kitchens'];

/** Deterministic stand-in for the hatch task: the name and pronouns come straight
 *  out of the transcript, the keywords are its longest distinct words. */
export default function mock(input: { transcript?: string; suggestedName?: string }, seed: number) {
  const transcript = (input?.transcript ?? '').trim();

  const nameMatch = transcript.match(/(?:i'?m|i am|my name is|call me)\s+([A-Za-z][\w-]+)/i);
  const humanName = nameMatch ? nameMatch[1][0].toUpperCase() + nameMatch[1].slice(1) : '';

  const pronounMatch = transcript.match(/\b(he\/him|she\/her|they\/them)\b/i);
  const pronouns = pronounMatch ? pronounMatch[1].toLowerCase() : 'they/them';

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const w of (transcript.toLowerCase().match(/[a-z][a-z'-]{4,}/g) ?? [])
    .slice()
    .sort((a, b) => b.length - a.length)) {
    if (STOP.has(w) || seen.has(w)) continue;
    seen.add(w);
    keywords.push(w);
    if (keywords.length === 5) break;
  }
  while (keywords.length < 3) keywords.push(['night', 'making', 'walking'][keywords.length]);

  const familiarName = input?.suggestedName ?? 'Merlin';

  return {
    humanName,
    pronouns,
    familiarName,
    keywords,
    clusterLabel: keywords[0] ? `${keywords[0]} people` : pick(CLUSTERS, seed),
    greeting: `So it is ${keywords[0]} we are doing tonight.`,
  };
}
