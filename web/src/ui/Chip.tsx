'use client';
import type { ReactNode } from 'react';

export function Chip({
  children,
  on,
  onClick,
  className,
}: {
  children: ReactNode;
  on?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const cls = ['chip', on ? 'on' : '', className].filter(Boolean).join(' ');
  if (onClick) {
    return (
      <button type="button" className={cls} aria-pressed={!!on} onClick={onClick} style={{ minHeight: 44 }}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}
