import type { Prompt } from './index';

export const familiarsPrompts = {
  'familiars.hatch': {
    system:
      'A person just introduced themselves by voice, in one go: who they are (name and pronouns), what they make, ' +
      'where they are from, what they cannot stop doing lately. From the transcript extract humanName (the name they ' +
      'gave for themselves, as they said it, capitalized; empty string if none) and pronouns (exactly as stated, ' +
      "e.g. he/him, she/her, they/them; 'they/them' if not stated). Then choose five lowercase keyword tags: concrete nouns for hobbies, tools, fields, places, foods, projects ('modular synths', 'recife', 'robotics', 'sourdough'); never adverbs, verbs, fillers or pronouns (never 'originally', 'lately', 'building', 'cannot') (one or " +
      'two words, concrete, things a stranger could recognise), a two-word cluster label, and one greeting line the ' +
      'familiar says on hatching (at most twelve words, in character, mentions one concrete thing from the transcript, ' +
      'no exclamation marks). For familiarName, return the suggestedName unless the transcript strongly implies a ' +
      "better single capitalized fantasy name; never the human's name.",
    outputShape:
      '{"humanName":string,"pronouns":string,"familiarName":string,"keywords":[string,string,string,string,string],"clusterLabel":string,"greeting":string}',
    effort: 'low',
  },
  'familiars.exchange': {
    system:
      'Two familiars meet for ten seconds while their humans hold their phones together. ' +
      'Write four lines alternating a, b, a, b. Each line is at most twelve words, spoken in character, ' +
      'dry and playful, and each references something its human actually said. No exclamation marks, no emoji, ' +
      'no greetings, no names in the first line. Then write "youBoth": at most eight words naming the one thing ' +
      'the two humans actually share, ending in a period. It must be a concrete interest, activity, place, food, ' +
      'tool or field taken from their keywords or transcripts (the "shared" list, when non-empty, is the answer). ' +
      'Never pronouns, never gender, never names, never "being human", never "both at the hackathon". ' +
      'Then "say": at most ten words telling the humans what to talk about first, built from that shared thing. ' +
      "Use each human's stated pronouns when you refer to them (both pronoun sets are given); " +
      'never invent a pronoun, never mention a seat or a location.',
    outputShape: '{"lines":[{"who":"a"|"b","text":string}],"youBoth":string,"say":string}',
    effort: 'low',
  },
  'casts.fact': {
    system:
      'A person answered tonight\'s question out loud; the transcript is noisy speech-to-text with repeats and filler. ' +
      'Return "fact": the one concrete thing they actually said in answer to the question, first person, at most twelve words, ' +
      'no filler, no repeats, no quotes. If several, pick the most specific. If nothing answers the question, return the most specific phrase they said.',
    outputShape: '{"fact":string}',
    effort: 'low',
  },
  'familiars.intro': {
    system:
      'A familiar is asked to introduce its human to a stranger they have not met, through a third familiar that ' +
      'knows them both. Write one line, at most eighteen words, spoken by the via familiar, naming the concrete ' +
      'thing the two humans share. Dry, warm, no exclamation marks, no emoji, no greeting.',
    outputShape: '{"line":string}',
    effort: 'low',
  },
  'familiars.recap': {
    system:
      "Write one person's night as exactly three cards, using only the facts given. " +
      'Card one counts what happened: a lowercase label, a big number, and at most two sentences. ' +
      'Card two is the callback: a detail from one of the meetings, no big number. ' +
      'Card three is the room: where this person sits in it and the one they nearly met, without naming that person. ' +
      'Labels are lowercase, at most two sentences a card, no exclamation marks.',
    outputShape: '{"cards":[{"label":string,"big":string,"text":string}]}',
    effort: 'low',
  },
  'casts.prompt': {
    system:
      'A small circle of people share a set of keywords. Write tonight\'s cast: one question they can all answer ' +
      'out loud, at most eight words, concrete, never yes/no, never "what do you do". Then a hook: at most eight ' +
      'words saying why this circle in particular. Lowercase except names. No exclamation marks.',
    outputShape: '{"question":string,"hook":string}',
    effort: 'low',
  },
  'scout.plan': {
    system:
      'Plan three web searches that would find something this circle could do together in the next ten days, in ' +
      'their city. Each query is a short search string (at most ten words), names the city and one concrete ' +
      'keyword from the circle, and targets listings, calendars or event pages. No quotes, no operators.',
    outputShape: '{"queries":[string,string,string]}',
    effort: 'low',
  },
  'scout.extract': {
    system:
      'From the text of one web page, extract the single event it lists, if it lists one. title is the event name ' +
      '(empty string if the page is not one event). whenISO is an ISO 8601 timestamp for the start, or null if the ' +
      'page does not say. where is the venue or neighbourhood, at most six words. cost is a short string like ' +
      '"free" or "$10". kind is "listed_event" when a real organiser lists it, otherwise "self_organized".',
    outputShape: '{"title":string,"whenISO":string|null,"where":string,"cost":string,"kind":"listed_event"|"self_organized"}',
    effort: 'low',
  },
  'scout.fit': {
    system:
      'Propose things this circle could organise themselves in the next ten days, built only from their keywords ' +
      'and city. Each is concrete enough to show up to: a title at most eight words, an ISO 8601 whenISO in the ' +
      'next ten days, a where (a plausible kind of place, at most six words), a cost, and a why at most twelve ' +
      'words naming the shared thing. No exclamation marks, no brand names you are not sure exist.',
    outputShape: '{"cards":[{"title":string,"whenISO":string,"where":string,"cost":string,"why":string}]}',
    effort: 'low',
  },
} satisfies Record<string, Prompt>;
