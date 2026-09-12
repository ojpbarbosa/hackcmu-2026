'use client';

import Link from 'next/link';
import Creature from './Creature';
import type { Familiar } from '@/lib/apps/familiars';

export type TabName = 'web' | 'casts' | 'you';

export type TabsProps = {
  active: TabName;
  code?: string | null;
  me?: Familiar | null;
};

function href(path: string, code?: string | null): string {
  return code ? `${path}?room=${encodeURIComponent(code)}` : path;
}

function WebIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <circle cx="4" cy="6" r="2" />
      <circle cx="20" cy="6" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M9.5 10.5L5.5 7.3M14.5 10.5l4-3.2M10.3 14.3l-3 3.2M13.8 14.2l3.6 2.6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  );
}

function Tabs({ active, code = null, me = null }: TabsProps) {
  return (
    <nav className="tabs" aria-label="Familiars">
      <Link className={active === 'web' ? 'on' : undefined} href={href('/familiars/web', code)}>
        <span className="ic">
          <WebIcon />
        </span>
        web
      </Link>
      <Link className={active === 'casts' ? 'on' : undefined} href={href('/familiars/casts', code)}>
        <span className="ic">
          <SparkIcon />
        </span>
        casts
      </Link>
      <Link className={active === 'you' ? 'on' : undefined} href={href('/familiars/you', code)}>
        <span className="ic">
          {me ? <Creature traits={me.traits} size={22} glow={false} /> : <i className="dot" />}
        </span>
        you
      </Link>
    </nav>
  );
}

export { Tabs };
export default Tabs;
