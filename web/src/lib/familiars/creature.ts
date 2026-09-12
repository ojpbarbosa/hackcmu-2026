import { hash } from '../ids';

export const HUES = ['gold', 'indigo', 'mint', 'rose', 'sky', 'lilac', 'coral', 'teal'] as const;
export type Hue = (typeof HUES)[number];

/** c1 light, c2 mid, c3 dark */
export const PALETTE: Record<Hue, { c1: string; c2: string; c3: string }> = {
  gold: { c1: '#FFC857', c2: '#F59E0B', c3: '#B45309' },
  indigo: { c1: '#A5B4FC', c2: '#6366F1', c3: '#3730A3' },
  mint: { c1: '#7CF0C4', c2: '#10B981', c3: '#065F46' },
  rose: { c1: '#FF9BBA', c2: '#FF7AA2', c3: '#9D174D' },
  sky: { c1: '#7DD3FC', c2: '#0EA5E9', c3: '#075985' },
  lilac: { c1: '#D8B4FE', c2: '#A855F7', c3: '#6B21A8' },
  coral: { c1: '#FDA4AF', c2: '#F43F5E', c3: '#9F1239' },
  teal: { c1: '#5EEAD4', c2: '#14B8A6', c3: '#115E59' },
};

export const SPECIES = ['moth', 'kestrel', 'gecko', 'pika'] as const;
export type Species = (typeof SPECIES)[number];

export type Traits = { species: Species; hue: number; eyes: 0 | 1 | 2; mouth: 0 | 1 | 2; accessory: 0 | 1 | 2 | 3 };

export function traitsFor(seed: string): Traits {
  const h = hash(seed);
  return {
    species: SPECIES[h % 4],
    hue: (h >>> 2) % 8,
    eyes: ((h >>> 5) % 3) as 0 | 1 | 2,
    mouth: ((h >>> 7) % 3) as 0 | 1 | 2,
    accessory: ((h >>> 9) % 4) as 0 | 1 | 2 | 3,
  };
}

export const NAMES = [
  'Merlin', 'Raven', 'Sage', 'Nova', 'Wren', 'Juniper', 'Onyx', 'Ember',
  'Atlas', 'Luna', 'Ferro', 'Indigo', 'Sable', 'Comet', 'Fennel', 'Basil',
  'Pippin', 'Quill', 'Ozzy', 'Tamsin', 'Nimbus', 'Marlow', 'Sol', 'Vesper',
  'Rook', 'Ivy', 'Moss', 'Cinder', 'Pixel', 'Bramble', 'Echo', 'Zephyr',
];

export function nameFor(seed: string, taken: Set<string>): string {
  const h = hash(seed);
  for (let i = 0; i < NAMES.length; i++) {
    const n = NAMES[(h + i * 7) % NAMES.length];
    if (!taken.has(n)) return n;
  }
  return `${NAMES[h % NAMES.length]} ${String.fromCharCode(65 + (h % 26))}`;
}

/** The palette a set of traits resolves to. */
export function colorsFor(traits: Traits): { c1: string; c2: string; c3: string } {
  return PALETTE[HUES[traits.hue % HUES.length]];
}
