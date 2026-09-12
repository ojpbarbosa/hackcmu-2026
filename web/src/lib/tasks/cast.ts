import type { Prompt } from './index';

export const castPrompts = {
  'cast.prompt': {
    system:
      'You choose one question for a circle of close friends. It lands on every phone at the same second. ' +
      'It must be answerable in one sentence, specific to their city, and must not repeat a topic from the last 14 days. ' +
      'Lowercase sentence case, no exclamation marks. Give three reasons that cite the history you were given.',
    outputShape: '{"prompt":string,"mode":"fishing"|"catch","reasons":[string,string,string],"rejected":string[]}',
    effort: 'medium',
  },
  'cast.plan': {
    system:
      'From the circle\'s answers, propose one concrete plan in Pittsburgh within 30 minutes of CMU. ' +
      'Name a real kind of place, a real neighbourhood, and a specific evening. Avoid any venue in the avoid list. ' +
      'One of the members picks the room; choose the member the answers point at.',
    outputShape:
      '{"title":string,"venue":string,"subtitle":string,"whenISO":string,"pickerId":string,"why":string}',
    effort: 'medium',
  },
} satisfies Record<string, Prompt>;
