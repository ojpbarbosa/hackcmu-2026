import { pickN } from './_seed';

/** Deterministic stand-in for cast.prompt.
 *  Picks the first authored prompt whose topic is not already in the circle's
 *  history, so a fresh circle always gets the mockup's cast and a second cast
 *  never repeats the first. The seed only varies the reasons it gives. */

type Answer = { who?: string; text: string };
type History = { prompt: string; mode?: string; answers?: Answer[] };
type Input = { mode?: string; circle?: string; members?: { id: string; name: string }[]; history?: History[] };

const FISHING = [
  "A place in Pittsburgh you've walked past 50 times and never entered.",
  'The last thing you photographed and showed to nobody.',
  'What you do on the walk home when nobody is watching.',
  'A room in this city you would move into tomorrow.',
  'The smallest thing that ruined your week.',
  'Who did you almost text yesterday.',
  'What is still in your bag from three cities ago.',
  'The last time you were somewhere with no plan.',
];

const CATCH = [
  'One thing all four of you keep meaning to do and never have.',
  'A Thursday night you would actually leave the house for.',
  'Somewhere none of you have been, twenty minutes from here.',
  'The meal you would cook for this circle if you had to.',
];

const NOT_BECAUSE = [
  'too close to a cast from this week',
  'asks for an opinion, and this circle answers places better than feelings',
  'nobody can answer it honestly in one line',
  'it ran in the first week and got three "fine"s',
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const short = (s: string) => (s.length > 46 ? `${s.slice(0, 44).trim()}…` : s).replace(/[.?]$/, '');

/** The proper noun the circle keeps repeating, with how often it showed up. */
function routine(history: History[]): { word: string; count: number; prompt: string } | null {
  const tally = new Map<string, { count: number; prompt: string }>();
  for (const h of history) {
    for (const a of h.answers ?? []) {
      for (const w of new Set(a.text.match(/\b[A-Z][a-zA-Z]{3,}\b/g) ?? [])) {
        const row = tally.get(w) ?? { count: 0, prompt: h.prompt };
        row.count += 1;
        tally.set(w, row);
      }
    }
  }
  const best = [...tally.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (!best || best[1].count < 2) return null;
  return { word: best[0], count: best[1].count, prompt: best[1].prompt };
}

export default function mock(input: Input, seed: number) {
  const mode = input?.mode === 'catch' ? 'catch' : 'fishing';
  const history = input?.history ?? [];
  const seen = new Set(history.map((h) => norm(h.prompt)));
  const list = mode === 'catch' ? CATCH : FISHING;
  const unused = list.filter((t) => !seen.has(norm(t)));
  const pool = unused.length ? unused : list;
  const prompt = pool[0];

  const r = routine(history);
  const answered = history.reduce((n, h) => n + (h.answers?.length ?? 0), 0);
  const reasons = [
    r
      ? `${r.count} answers in the last ${history.length} casts said "${r.word}" — routine is showing, so this cast points somewhere else`
      : `nothing in the last ${history.length} casts went near this, and ${answered} answers say the circle will take a new topic`,
    mode === 'catch'
      ? 'catch mode: the answers have to end in a door somebody can walk through on a Thursday'
      : `"${short(prompt)}" is answerable in one line, which is the only kind this circle finishes`,
    history[0]
      ? `it beat "${short(history[0].prompt)}", which ran on the last cast`
      : 'it beat "how was your day", which gets "fine" four times',
  ];

  const others = pool.filter((t) => t !== prompt);
  const why = pickN(NOT_BECAUSE, seed, 2);
  const rejected = others.slice(0, 2).map((t, i) => `"${short(t)}" — ${why[i]}`);

  return { prompt, mode, reasons, rejected };
}
