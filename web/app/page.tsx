'use client';
import { useCallback, useEffect, useState } from 'react';
import { Screen, TopNav, Pill, Card, CTA, H1, H3, Body, BodySm, Label, QR, Icon } from '@/ui';
import type { AppName } from '@/lib/types';
import type { ScreenApp } from '@/ui';

type Health = { ok: boolean; provider: string; model: string; store: string; rooms: number };

const APPS: { app: AppName; accent: ScreenApp; title: string; pitch: string }[] = [
  { app: 'cast', accent: 'cast', title: 'cast', pitch: 'one prompt lands on every phone in the circle at the same second' },
  { app: 'familiars', accent: 'fam', title: 'familiars', pitch: 'bump two phones and the familiars talk, then tell both humans what to say' },
  { app: 'detour', accent: 'det', title: 'detour', pitch: 'a walk somewhere new, one sentence at a time, route never shown' },
  { app: 'palate', accent: 'pal', title: 'palate', pitch: 'any menu in any language, ranked for you and for the table' },
];

function baseUrl(): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, '');
  return typeof window === 'undefined' ? '' : window.location.origin;
}

function AppCard({ app, accent, title, pitch }: (typeof APPS)[number]) {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ app }),
      });
      const doc = (await res.json()) as { code?: string };
      if (doc.code) setCode(doc.code);
    } finally {
      setBusy(false);
    }
  }, [app]);

  const phoneUrl = code ? `${baseUrl()}/${app}?room=${code}` : '';

  return (
    <div className={`app-${accent}`}>
      <Card raised>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <H3>{title}</H3>
            <div style={{ marginTop: 6 }}>
              <BodySm>{pitch}</BodySm>
            </div>
          </div>
          <i
            aria-hidden="true"
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              flex: '0 0 auto',
              marginTop: 6,
              background: 'linear-gradient(135deg, var(--g1), var(--g3))',
            }}
          />
        </div>

        {code ? (
          <div className="col" style={{ gap: 12, marginTop: 14 }}>
            <div className="row2" style={{ gap: 14, alignItems: 'flex-start' }}>
              <QR url={phoneUrl} size={104} />
              <div className="col" style={{ gap: 6, minWidth: 0 }}>
                <Label>room code</Label>
                <p className="h2" style={{ letterSpacing: '0.06em' }}>{code}</p>
                <BodySm>{phoneUrl.replace(/^https?:\/\//, '')}</BodySm>
              </div>
            </div>
            <div className="row2" style={{ gap: 8, flexWrap: 'wrap' }}>
              <a className="chip" href={`/${app}?room=${code}`}>
                <Icon name="phone" size={14} className="xs" /> open on this phone
              </a>
              <a className="chip" href={`/${app}/stage?room=${code}`}>
                <Icon name="cam" size={14} className="xs" /> stage view
              </a>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <CTA variant="grad" icon="plus" onClick={create} disabled={busy}>
              {busy ? 'Creating…' : 'Create room'}
            </CTA>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function Launcher() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/health', { cache: 'no-store' })
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => setHealth(null));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <Screen app="cast">
      <TopNav
        left={<Pill variant="soft" icon="spark">hackcmu 2026</Pill>}
        right={
          <Pill variant={health ? 'ink' : 'soft'} icon="zap">
            {health ? health.provider : '…'}
          </Pill>
        }
      />
      <div className="pad col" style={{ gap: 16, marginTop: 20 }}>
        <div>
          <Label>four apps, one grammar</Label>
          <H1>pick a room to open</H1>
          <Body>
            Create a room, point a phone at the QR, and open the stage view on the projector. Everything runs with no
            keys; the badge shows the provider that is actually answering.
          </Body>
        </div>

        <Card>
          <div className="between">
            <Label>health</Label>
            <BodySm>{health?.ok ? 'ok' : 'unreachable'}</BodySm>
          </div>
          <div className="row2" style={{ gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
            <div className="stat">
              <b>{health?.provider ?? '—'}</b>
              <span>provider</span>
            </div>
            <div className="stat">
              <b>{health?.store ?? '—'}</b>
              <span>store</span>
            </div>
            <div className="stat">
              <b>{health?.rooms ?? 0}</b>
              <span>rooms</span>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <BodySm>{health?.model ?? 'no model yet'}</BodySm>
          </div>
        </Card>

        {APPS.map((a) => (
          <AppCard key={a.app} {...a} />
        ))}
      </div>
    </Screen>
  );
}
