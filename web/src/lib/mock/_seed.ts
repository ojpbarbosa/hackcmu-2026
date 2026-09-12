/** Helpers for deterministic mock output. The seed is a hash of the call input. */
export const pick = <T,>(a: readonly T[], s: number): T => a[s % a.length];
export const pickN = <T,>(a: readonly T[], s: number, n: number): T[] =>
  Array.from({ length: n }, (_, i) => a[(s + i * 7) % a.length]);
export const unit = (s: number, i = 0): number => (((s >>> (i * 3)) % 1000) / 1000);
