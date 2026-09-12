'use client';
/* Icon paths copied verbatim from the sprite in docs/mockups/index.html. */

export type IconName =
  | 'bell' | 'chev-l' | 'chev-r' | 'arrow-r' | 'plus' | 'check' | 'lock' | 'home'
  | 'users' | 'msg' | 'user' | 'search' | 'compass' | 'pin' | 'clock' | 'fork'
  | 'cam' | 'spark' | 'share' | 'eye-off' | 'cal' | 'flag' | 'zap' | 'phone';

const PATHS: Record<IconName, string> = {
  "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\"/><path d=\"M10 21h4\"/>",
  "chev-l": "<path d=\"M15 18l-6-6 6-6\"/>",
  "chev-r": "<path d=\"M9 18l6-6-6-6\"/>",
  "arrow-r": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "check": "<path d=\"M20 6L9 17l-5-5\"/>",
  "lock": "<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>",
  "home": "<path d=\"M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z\"/>",
  "users": "<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8\"/>",
  "msg": "<path d=\"M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z\"/>",
  "user": "<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M21 21l-4.3-4.3\"/>",
  "compass": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M15.5 8.5l-2 5-5 2 2-5z\"/>",
  "pin": "<path d=\"M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>",
  "fork": "<path d=\"M7 3v8M10 3v8M7 7h3M8.5 11v10M17 3c-2 1-3 3-3 6v3h3V3zM17 12v9\"/>",
  "cam": "<path d=\"M4 8h3l2-3h6l2 3h3v12H4z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>",
  "spark": "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z\"/>",
  "share": "<path d=\"M12 3v12M7 8l5-5 5 5M5 14v6h14v-6\"/>",
  "eye-off": "<path d=\"M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-3.2 3.9M6.6 6.6A15 15 0 0 0 2.5 12S6 19 12 19a9.7 9.7 0 0 0 4.2-.9\"/>",
  "cal": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/>",
  "flag": "<path d=\"M5 21V4M5 4h11l-2 4 2 4H5\"/>",
  "zap": "<path d=\"M13 2L4 14h7l-1 8 9-12h-7z\"/>",
  "phone": "<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"3\"/><path d=\"M11 18h2\"/>",};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
