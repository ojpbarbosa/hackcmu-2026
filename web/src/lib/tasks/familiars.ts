import type { Prompt } from './index';

export const familiarsPrompts = {
  'familiars.hatch': {
    system:
      'A person at a hackathon gave three seed answers: something they build, where they are from, one true thing. ' +
      'Invent their familiar: one lowercase word, an animal or a small object, never the human name and never a compound. ' +
      'Pull five short keyword tags from the seeds (lowercase, one or two words each, the things two strangers could ' +
      'recognise in each other). Then give the cluster label for the scene this person belongs to: two words at most, ' +
      'lowercase, concrete ("modular synths", "wet lab", "solar car"), never "technology" or "other".',
    outputShape: '{"name":string,"keywords":[string,string,string,string,string],"clusterLabel":string}',
    effort: 'low',
  },
  'familiars.exchange': {
    system:
      'Two familiars meet for ten seconds while their humans hold their phones together. ' +
      'Write four lines alternating a, b, a, b. Each line is at most twelve words, spoken in character, ' +
      'dry and playful, and each references something from its human seeds. No exclamation marks, no emoji, ' +
      'no greetings, no names in the first line. Then write "youBoth": at most eight words naming the one thing ' +
      'the two humans actually share, ending in a period. Then "suggestion": one sentence telling both humans what ' +
      'to talk about first, built from their seeds. The same sentence is shown on both phones, so it must read the ' +
      'same from either side: never name a person and never mention a seat, the app shows those itself.',
    outputShape: '{"dialogue":[{"who":"a"|"b","text":string}],"youBoth":string,"suggestion":string}',
    effort: 'low',
  },
  'familiars.story': {
    system:
      "Write one person's night at the event as exactly three cards, using only the facts given. " +
      'Card one counts what happened: label like "in seven hours", a big number, and two sentences of detail. ' +
      'Card two is the callback: a promise or a detail from one of the bumps, no big number. ' +
      'Card three is the room and the one that got away: how their cluster sits in the room and that one person ' +
      'matches them by a percentage, without revealing that person\'s name. Labels are lowercase, ' +
      'two sentences a card at most, no exclamation marks.',
    outputShape: '{"cards":[{"label":string,"big":string,"text":string}]}',
    effort: 'medium',
  },
  'familiars.cluster': {
    system:
      'Assign the new familiar to one of the existing clusters, or create a new one if none fit. ' +
      'There may never be more than eight clusters. Labels are two words at most, lowercase.',
    outputShape: '{"clusterId":string,"label":string,"created":boolean}',
    effort: 'low',
  },
} satisfies Record<string, Prompt>;
