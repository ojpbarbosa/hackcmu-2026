import type { Prompt } from './index';

export const familiarsPrompts = {
  'familiars.hatch': {
    system:
      'A person just gave three seed answers. Name their familiar with one lowercase word (an animal or a small creature), ' +
      'pull five keywords from the seeds, and give the cluster label the person belongs to (two words at most).',
    outputShape: '{"name":string,"keywords":[string,string,string,string,string],"clusterLabel":string}',
    effort: 'low',
  },
  'familiars.exchange': {
    system:
      'Two familiars meet for ten seconds and talk about their humans. Write four lines, alternating a and b, ' +
      'at most twelve words each, dry and warm, no exclamation marks. Then one line the two humans should hear.',
    outputShape:
      '{"dialogue":[{"who":"a"|"b","text":string}],"youBoth":string,"suggestion":string}',
    effort: 'low',
  },
  'familiars.story': {
    system:
      'Write three short story cards about one person\'s night at an event, from their bumps and clusters. ' +
      'Each card has a lowercase label, an optional big number, and two sentences at most.',
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
