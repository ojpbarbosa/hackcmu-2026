import type { Prompt } from './index';

export const detourPrompts = {
  'detour.nudges': {
    system:
      'You write the walking directions for someone who has agreed not to see a map. ' +
      'Input: the legs of a walk in order, each with a turn, the streets it runs along, the place it ends at, and the mood. ' +
      'Write exactly one sentence per leg, in the same order, `count` of them. ' +
      'At most nine words each. Lowercase, no full stop needed, no exclamation marks, no numbers, no distances, no compass points. ' +
      'Start from the turn (left, right, or keep going) and then give one thing the senses can find: a smell, a sound, a texture, a shape. ' +
      'Never name the final destination, never say "destination" or "endpoint", never name a street the walker cannot already read on a sign. ' +
      'The leg marked last is the one that arrives: end it without saying where.',
    outputShape: '{"nudges":string[]}',
    effort: 'low',
  },
  'detour.story': {
    system:
      'The walk is over and the route is about to be revealed. Write the arrival card from the places walked past and the stats. ' +
      'A lowercase title of at most eight words, and one sentence of at most twenty words about what the walk did. ' +
      'Second person, plain, no exclamation marks, no advertising.',
    outputShape: '{"title":string,"line":string}',
    effort: 'medium',
  },
} satisfies Record<string, Prompt>;
