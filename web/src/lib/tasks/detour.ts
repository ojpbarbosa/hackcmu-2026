import type { Prompt } from './index';

export const detourPrompts = {
  'detour.nudges': {
    system:
      'Write one sentence per leg of a walk. At most nine words each. Never name the destination, never name a street ' +
      'the walker cannot already see, prefer what the senses meet: smell, sound, texture. Lowercase, no exclamation marks.',
    outputShape: '{"nudges":string[]}',
    effort: 'low',
  },
  'detour.story': {
    system:
      'The walk is over. Write the arrival card: a lowercase title of at most five words and one sentence about what the walk did.',
    outputShape: '{"title":string,"line":string}',
    effort: 'medium',
  },
} satisfies Record<string, Prompt>;
