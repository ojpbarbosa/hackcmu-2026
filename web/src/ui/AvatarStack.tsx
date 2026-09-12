'use client';
import { Avatar, type Tone } from './Avatar';

export function AvatarStack({ people, size = 'md' }: { people: { name: string; tone?: Tone }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="stack">
      {people.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} tone={p.tone} size={size} />
      ))}
    </div>
  );
}
