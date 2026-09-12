'use client';
import { usePathname } from 'next/navigation';
import { Dock, type IconName } from '@/ui';

const TABS: { icon: IconName; path: string }[] = [
  { icon: 'home', path: '/cast' },
  { icon: 'zap', path: '/cast/cast' },
  { icon: 'msg', path: '/cast/tonight' },
  { icon: 'cal', path: '/cast/catch' },
  { icon: 'user', path: '/cast/pond' },
];

export function CastDock({ code }: { code: string | null }) {
  const path = usePathname();
  const q = code ? `?room=${code}` : '';
  return (
    <Dock items={TABS.map((t) => ({ icon: t.icon, href: `${t.path}${q}`, active: path === t.path }))} />
  );
}
