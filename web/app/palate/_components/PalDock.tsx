'use client';
import { Dock } from '@/ui';

export function PalDock({ at, href }: { at: 'me' | 'menu' | 'table'; href: (p: string) => string }) {
  return (
    <Dock
      items={[
        { icon: 'home', href: '/' },
        { icon: 'user', active: at === 'me', href: href('/palate/me') },
        { icon: 'fork', active: at === 'menu', href: href('/palate/menu') },
        { icon: 'users', active: at === 'table', href: href('/palate/table') },
      ]}
    />
  );
}
