'use client';
import { useEffect, useState } from 'react';
import { Screen, TopNav, Pill, Card, CTA, Avatar, H1, Body, BodySm, Label, TextField, type ScreenApp } from '@/ui';
import { useMember } from '@/hooks/useMember';
import { useRoom } from '@/hooks/useRoom';
import type { AppName } from '@/lib/types';

/** Placeholder screen for an app the platform has scaffolded but not built.
 *  The app agent replaces app/<name>/page.tsx entirely. */
export function AppStub({
  app,
  accent,
  title,
  pitch,
}: {
  app: AppName;
  accent: ScreenApp;
  title: string;
  pitch: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { member, setName } = useMember();
  const { members, connected, doc } = useRoom(app, code, member);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('room');
    if (fromUrl) {
      setCode(fromUrl.toUpperCase());
      return;
    }
    let alive = true;
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app }),
    })
      .then((r) => r.json())
      .then((d: { code?: string }) => {
        if (!alive || !d.code) return;
        setCode(d.code);
        const url = new URL(window.location.href);
        url.searchParams.set('room', d.code);
        window.history.replaceState(null, '', url.toString());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [app]);

  return (
    <Screen app={accent}>
      <TopNav
        left={<Pill variant="soft" icon="users">{code ?? 'no room'} · {members.length}</Pill>}
        right={<Pill variant="soft" icon={connected ? 'zap' : 'clock'}>{connected ? 'live' : 'joining'}</Pill>}
      />
      <div className="pad col" style={{ gap: 18, marginTop: 20 }}>
        <div>
          <Label>{app}</Label>
          <H1>{title}</H1>
          <Body>{pitch}</Body>
        </div>

        {!member ? (
          <Card>
            <Label>who are you</Label>
            <div className="col" style={{ gap: 10, marginTop: 10 }}>
              <TextField value={draft} onChange={setDraft} placeholder="your name" onSubmit={() => setName(draft)} />
              <CTA variant="grad" onClick={() => setName(draft)} disabled={!draft.trim()}>
                Join the room
              </CTA>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="between">
              <Label>in the room</Label>
              <BodySm>version {doc?.version ?? 0}</BodySm>
            </div>
            <div className="row2" style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
              {members.map((m) => (
                <div key={m.id} className="row2" style={{ gap: 6 }}>
                  <Avatar name={m.name} tone={m.tone} size="sm" />
                  <BodySm>{m.name}</BodySm>
                </div>
              ))}
              {members.length === 0 ? <BodySm>waiting for the first phone</BodySm> : null}
            </div>
          </Card>
        )}

        <Card>
          <Label>scaffold</Label>
          <div style={{ marginTop: 8 }}>
            <Body>
              The room layer, the model layer and the ui kit are live. The {app} agent builds the screens from here.
            </Body>
          </div>
        </Card>

        <CTA variant="ghost" href={`/${app}/stage?room=${code ?? ''}`}>
          Open the stage view
        </CTA>
      </div>
    </Screen>
  );
}
