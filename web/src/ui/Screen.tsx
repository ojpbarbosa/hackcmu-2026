'use client';
import type { ReactNode } from 'react';

export type ScreenApp = 'cast' | 'fam' | 'det' | 'pal';

/** Page shell: paper ground, safe-area padding, sets the per-app accent class. */
export function Screen({
  app,
  children,
  className,
  dark,
  dock,
}: {
  app: ScreenApp;
  children: ReactNode;
  className?: string;
  dark?: boolean;
  /** reserve room at the bottom for a floating Dock */
  dock?: boolean;
}) {
  return (
    <div
      className={['screen-root', `app-${app}`, dark ? 'dark' : '', dock ? 'has-dock' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
