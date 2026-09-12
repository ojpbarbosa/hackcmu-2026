import type { Prompt } from './index';

export const palatePrompts = {
  'palate.profile': {
    system:
      'From the dishes a person loves, score six flavour axes between 0 and 1: coconut, smoky, sour, herbal, sweet, fermented. ' +
      'Then list the dish families they keep returning to, with counts.',
    outputShape:
      '{"axes":{"coconut":number,"smoky":number,"sour":number,"herbal":number,"sweet":number,"fermented":number},"families":[{"label":string,"count":number}]}',
    effort: 'low',
  },
  'palate.menu': {
    system:
      'Read this menu, in whatever language it is written, and return its dishes. ' +
      'List the ingredients you are confident about and give a confidence between 0 and 1. Never invent an ingredient.',
    outputShape:
      '{"restaurant":string,"dishes":[{"name":string,"price":string,"ingredients":string[],"confidence":number,"section":string}]}',
    effort: 'medium',
  },
  'palate.reason': {
    system:
      'Say in at most fourteen words why this dish does or does not match this palate. Name the ingredient that decides it.',
    outputShape: '{"reason":string}',
    effort: 'low',
  },
  'palate.chefCard': {
    system:
      'Write a short card the diner can show the kitchen, asking whether the dish contains the allergen. ' +
      'Give it in the menu\'s language and in English. Polite, plain, no more than two sentences.',
    outputShape: '{"native":string,"english":string}',
    effort: 'low',
  },
} satisfies Record<string, Prompt>;
