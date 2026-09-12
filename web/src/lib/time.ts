/** Single source of server time. Every countdown in every app is driven from this. */
export function now(): number {
  return Date.now();
}
