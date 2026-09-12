'use client';
import type { ReactNode } from 'react';

export function Card({ children, className, raised }: { children: ReactNode; className?: string; raised?: boolean }) {
  return (
    <div className={['card', className].filter(Boolean).join(' ')} style={raised ? { boxShadow: 'var(--sh-lift)' } : undefined}>
      {children}
    </div>
  );
}
