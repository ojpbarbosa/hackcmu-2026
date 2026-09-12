'use client';
import type { ReactNode } from 'react';

/** Dark two-column projector layout used by every /stage view. */
export function StagePage({ children, side }: { children: ReactNode; side: ReactNode }) {
  return (
    <div className="stage">
      <div style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>{children}</div>
      <div className="side">{side}</div>
    </div>
  );
}
