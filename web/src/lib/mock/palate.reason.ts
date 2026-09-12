import { pick } from './_seed';

const SHAPES = [
  'coconut and peanut, both high on your profile',
  'lime and mint, the sour axis you keep choosing',
  'green chilli runs hotter than anything you have logged',
  'no record of what is in it, so it stays grey',
];

export default function mock(input: { dish?: { name?: string } }, seed: number) {
  return { reason: pick(SHAPES, seed) + (input?.dish?.name ? '' : '') };
}
