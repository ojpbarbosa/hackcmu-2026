'use client';
import type { ReactNode } from 'react';

export function TopNav({ left, title, right }: { left?: ReactNode; title?: string; right?: ReactNode }) {
  return (
    <div className="nav">
      <div className="row2">{left}</div>
      {title ? <span className="title">{title}</span> : null}
      <div className="row2">{right}</div>
    </div>
  );
}
