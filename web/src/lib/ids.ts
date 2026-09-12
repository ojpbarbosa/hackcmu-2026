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
