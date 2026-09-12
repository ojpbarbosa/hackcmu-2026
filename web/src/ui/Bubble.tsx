'use client';
import type { ReactNode } from 'react';

export function Bubble({
  children,
  tone = 'pink',
  side = 'l',
}: {
  children: ReactNode;
  tone?: 'pink' | 'mint' | 'raised' | 'indigo';
  side?: 'l' | 'r';
}) {
  const style: React.CSSProperties = {};
  if (tone === 'raised') {
    style.background = 'var(--raised)';
    style.color = 'var(--t1)';
  } else if (tone === 'indigo') {
    style.background = '#E0E7FF';
    style.color = '#312E81';
  }
  if (side === 'r') {
    style.borderBottomLeftRadius = 18;
    style.borderBottomRightRadius = 6;
  }
  return <span className={['bubble', tone === 'mint' ? 'mint' : ''].filter(Boolean).join(' ')} style={style}>{children}</span>;
}
