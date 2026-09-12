'use client';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Pill({
  children,
  variant = 'default',
  icon,
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: 'default' | 'ink' | 'soft';
  icon?: IconName;
  onClick?: () => void;
  className?: string;
}) {
  const cls = ['pill', variant === 'ink' ? 'ink' : '', variant === 'soft' ? 'soft' : '', className]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <>
      {icon ? <Icon name={icon} size={16} className="sm" /> : null}
      {children}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} style={{ minHeight: 44 }}>
        {inner}
      </button>
    );
  }
  return <span className={cls}>{inner}</span>;
}
