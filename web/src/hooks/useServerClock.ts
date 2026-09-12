'use client';
import { useCallback, useRef } from 'react';

/** Offset between this device's clock and the server's, learned from every response
 *  that carries a serverNow. Shared across hooks so countdowns agree everywhere. */
let offset = 0;

export function noteServerNow(serverNow: number | null | undefined): void {
  if (typeof serverNow !== 'number' || !Number.isFinite(serverNow)) return;
  offset = serverNow - Date.now();
}

export function serverNow(): number {
  return Date.now() + offset;
}

export function clockOffset(): number {
  return offset;
}

export function useServerClock(): { serverNow: () => number } {
  const ref = useRef(serverNow);
  return { serverNow: useCallback(() => ref.current(), []) };
}
