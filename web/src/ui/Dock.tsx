'use client';
import { Icon, type IconName } from './Icon';

export function Dock({ items }: { items: { icon: IconName; active?: boolean; href?: string; onClick?: () => void }[] }) {
  return (
    <nav className="dock" aria-label="sections">
      {items.map((it, i) => {
        const inner = it.active ? (
          <span className="on">
            <Icon name={it.icon} />
          </span>
        ) : (
          <Icon name={it.icon} />
        );
        if (it.href) {
          return (
            <a key={i} href={it.href} aria-current={it.active ? 'page' : undefined}>
              {inner}
            </a>
          );
        }
        return (
          <button key={i} type="button" onClick={it.onClick} aria-current={it.active ? 'page' : undefined}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
