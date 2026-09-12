const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';

function rand(n: number): number {
  const a = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}

/** Room code: 5 characters from A-Z2-9. */
export function makeCode(): string {
  let out = '';
  for (let i = 0; i < 5; i++) out += ALPHABET[rand(ALPHABET.length)];
  return out;
}

export function makeId(prefix = 'id'): string {
  let out = '';
  for (let i = 0; i < 10; i++) out += ALPHABET[rand(ALPHABET.length)].toLowerCase();
  return `${prefix}_${out}`;
}

/** Stable 32-bit hash — used to seed deterministic mock output. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable id for an unordered pair of ids. Same two ids → same id, either order. */
export function pairIdFor(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  let h = 2166136261;
  for (const ch of `${x}|${y}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `pair_${h.toString(36)}`;
}
