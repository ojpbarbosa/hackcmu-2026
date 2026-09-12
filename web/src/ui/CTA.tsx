'use client';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function CTA({
  children,
  variant = 'ink',
  icon,
  onClick,
  disabled,
  type = 'button',
  href,
  className,
}: {
  children: ReactNode;
  variant?: 'ink' | 'grad' | 'ghost';
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  href?: string;
  className?: string;
}) {
  const cls = ['cta', variant === 'grad' ? 'grad' : '', variant === 'ghost' ? 'ghost' : '', className]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <>
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} aria-disabled={disabled} style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <button className={cls} type={type} onClick={onClick} disabled={disabled} style={disabled ? { opacity: 0.5 } : undefined}>
      {inner}
    </button>
  );
}
