'use client';

export type Tone = 1 | 2 | 3 | 4;

export function initials(name: string): string {
  const t = (name || '?').trim();
  return (t[0] || '?').toUpperCase();
}

/** Stable tone from a name, so an app never has to assign one by hand. */
export function toneFor(name: string): Tone {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ((h % 4) + 1) as Tone;
}

export function Avatar({
  name,
  tone,
  size = 'md',
  status,
}: {
  name: string;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  status?: 'done' | 'typing' | 'idle';
}) {
  const t = tone ?? toneFor(name);
  const dims =
    size === 'sm' ? { width: 26, height: 28, fontSize: 10 } : size === 'lg' ? { width: 56, height: 62, fontSize: 18 } : undefined;
  return (
    <span className="avatar-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
      <span className={`avatar p${t}`} style={dims} title={name}>
        {initials(name)}
      </span>
      {status ? (
        <i
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid #fff',
            background:
              status === 'done' ? 'var(--success)' : status === 'typing' ? 'var(--warning)' : 'var(--overlay)',
          }}
        />
      ) : null}
    </span>
  );
}
