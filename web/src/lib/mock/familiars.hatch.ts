import { pick } from './_seed';

/** Forty familiars to hatch from, in the mockup's register: small, animal, one word. */
const NAMES = [
  'moth', 'kestrel', 'heron', 'vole', 'marten', 'swift', 'pike', 'wren', 'otter', 'shrike',
  'lynx', 'grebe', 'newt', 'ibis', 'stoat', 'tern', 'crane', 'hare', 'finch', 'adder',
  'raven', 'perch', 'dunlin', 'sable', 'egret', 'pika', 'merlin', 'chub', 'plover', 'weasel',
  'osprey', 'skink', 'gannet', 'roach', 'mink', 'snipe', 'bittern', 'gecko', 'jackdaw', 'loach',
];

const STOP = new Set([
  'about', 'after', 'again', 'also', 'always', 'been', 'before', 'every', 'from', 'have', 'here',
  'into', 'just', 'like', 'make', 'many', 'more', 'most', 'much', 'must', 'never', 'only', 'other',
  'over', 'people', 'some', 'someone', 'something', 'still', 'than', 'that', 'them', 'then', 'there',
  'they', 'thing', 'things', 'this', 'time', 'very', 'want', 'well', 'were', 'what', 'when', 'where',
  'which', 'while', 'with', 'would', 'your', 'mine', 'myself', 'really', 'pretty', 'kind', 'sort',
  // weak tags: verbs everyone uses, the venue everyone is standing in, counting words
  'build', 'builds', 'building', 'built', 'work', 'works', 'working', 'love', 'loves', 'live',
  'lives', 'living', 'made', 'make', 'makes', 'making', 'doing', 'does', 'stuff', 'hackathon',
  'pittsburgh', 'carnegie', 'mellon', 'campus', 'first', 'obviously', 'literally', 'actually',
  'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'twelve', 'twenty',
]);

/** Two-word scenes, matched on a word the person actually wrote. */
const SCENES: [RegExp, string][] = [
  [/synth|eurorack|modular|oscillat/, 'modular synths'],
  [/tape|loop|cassette|record|vinyl/, 'tape loops'],
  [/shader|render|graphic|pixel|glsl|raymarch/, 'graphics'],
  [/compil|parser|language|type system|interpreter|lisp/, 'compilers'],
  [/robot|weld|solder|motor|drone|arduino|solar car/, 'robotics'],
  [/lab|pipette|protein|cell|bio|agar|microscope/, 'wet lab'],
  [/film|16mm|camera|edit|darkroom|photo/, 'film'],
  [/cook|bake|bread|kitchen|menu|dinner|sourdough/, 'kitchen'],
  [/game|unity|godot|speedrun|level design/, 'games'],
  [/map|drain|walk|city|trail|transit/, 'field notes'],
  [/write|poem|zine|essay|novel/, 'writing'],
  [/server|kernel|distributed|database|network/, 'systems'],
];

const FALLBACK_SCENES = ['late builds', 'small machines', 'night shift', 'side quests', 'loose ends', 'hand tools'];

const words = (s: string): string[] => (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter((w) => !STOP.has(w));

/** Deterministic stand-in for the hatch task: a name, five tags, and a scene. */
export default function mock(input: { seeds?: string[]; human?: { name?: string } }, seed: number) {
  const seeds = (input?.seeds ?? []).map(String);
  const text = seeds.join(' ').toLowerCase();
  const all = seeds.flatMap(words);

  const keywords: string[] = [];
  for (const w of all) {
    if (w.length >= 4 && !keywords.includes(w)) keywords.push(w);
    if (keywords.length === 5) break;
  }
  for (const w of all) {
    if (keywords.length === 5) break;
    if (!keywords.includes(w)) keywords.push(w);
  }
  while (keywords.length < 5) keywords.push(pick(['night', 'build', 'city', 'sound', 'code'], seed + keywords.length));

  const scene = SCENES.find(([re]) => re.test(text))?.[1];
  const fromSeed = [...words(seeds[0] ?? '')]
    .filter((w) => w.length >= 4)
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
  const ordered = words(seeds[0] ?? '').filter((w) => fromSeed.includes(w));

  return {
    name: pick(NAMES, seed),
    keywords,
    clusterLabel: scene ?? (ordered.length ? ordered.slice(0, 2).join(' ') : pick(FALLBACK_SCENES, seed)),
  };
}
