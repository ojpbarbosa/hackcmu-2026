'use client';
import type { ReactNode } from 'react';

type P = { children: ReactNode; className?: string };
const mk = (base: string) =>
  function Typo({ children, className }: P) {
    return <p className={[base, className].filter(Boolean).join(' ')}>{children}</p>;
  };

export const H1 = mk('h1');
export const H2 = mk('h2');
export const H3 = mk('h3');
export const H4 = mk('h4');
export const Title = mk('ttl');
export const Body = mk('body');
export const BodySm = mk('bsm');
export const Label = mk('lbl');
export const Sub = mk('sub');
export const Micro = mk('micro');
