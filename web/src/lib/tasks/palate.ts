import type { Prompt } from './index';

export const palatePrompts = {
  'palate.profile': {
    system:
      'You map what a person loves eating onto a flavour profile. ' +
      'Score six axes between 0 and 1 — coconut (rich, creamy), smoky (charred, grilled), sour, herbal (green, fresh), sweet, fermented (funky, aged). ' +
      'Then name three or four flavour families they keep returning to, each with the number of their dishes that belong to it. ' +
      'Use these family labels where they fit: coconut & galangal, charred & smoky, sour & bright, herbal & green, sweet & baked, fermented & funky. ' +
      'Counts must add up to no more than the number of dishes given. Never invent a dish they did not name.',
    outputShape:
      '{"axes":{"coconut":number,"smoky":number,"sour":number,"herbal":number,"sweet":number,"fermented":number},"families":[{"label":string,"count":number}]}',
    effort: 'low',
  },
  'palate.menu': {
    system:
      'Read this menu, in whatever language it is written, and return its dishes. ' +
      'Keep every dish name in the menu language, exactly as printed. ' +
      'For each dish list the ingredients you are confident about in English, and a confidence between 0 and 1. ' +
      'Never invent an ingredient: if the line does not tell you what is in the dish, return an empty list and a low confidence. ' +
      'Also return the restaurant name if the text names one, and the two-letter language code of the menu.',
    outputShape:
      '{"restaurant":string,"language":string,"dishes":[{"name":string,"price":number,"ingredients":string[],"confidence":number,"section":string}]}',
    effort: 'medium',
  },
  'palate.reason': {
    system:
      'For each dish, say in at most fourteen words why it does or does not match this palate. ' +
      'Name the ingredients that decide it — the hits are given to you, use them. ' +
      'Plain sentence case, no exclamation marks, no second person plural. ' +
      'A dish with no ingredient record stays grey: say that, do not guess.',
    outputShape: '{"reasons":{"<dishId>":string}}',
    effort: 'low',
  },
  'palate.chefCard': {
    system:
      'Write a short card the diner can show the kitchen, asking whether the dish contains the allergen. ' +
      'Write it in the language of the menu and again in English. Polite, plain, no more than two sentences. ' +
      'The native text is the one that will be read by the kitchen: make it correct and natural, not a transliteration.',
    outputShape: '{"native":string,"english":string}',
    effort: 'low',
  },
} satisfies Record<string, Prompt>;
