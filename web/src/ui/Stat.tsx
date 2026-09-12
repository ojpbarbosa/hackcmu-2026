'use client';
import type { ReactNode } from 'react';

export function Stat({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="stat">
      <b style={accent ? { color: 'var(--acc)' } : undefined}>{value}</b>
      <span>{label}</span>
    </div>
  );
}
