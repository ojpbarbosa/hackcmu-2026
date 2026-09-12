'use client';
import { useEffect, useState } from 'react';
import { StagePage, ModelLadder, H2, H3, Body, Label, Pill } from '@/ui';
import { useRoom } from '@/hooks/useRoom';
import type { AppName } from '@/lib/types';
import type { ScreenApp } from '@/ui';

/** Projector view scaffold: dark two-column layout with the live model ladder. */
export function StageStub({ app, accent, title }: { app: AppName; accent: ScreenApp; title: string }) {
  const [code, setCode] = useState<string | null>(null);
  const { members, events, doc } = useRoom(app, code, null);

  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? null);
  }, []);

  return (
    <div className={`app-${accent}`}>
      <StagePage
        side={
          <>
            <Label>{app} · {code ?? 'no room'}</Label>
            <H3>{title}</H3>
            <Body>
              {members.length} {members.length === 1 ? 'person' : 'people'} in the room · version {doc?.version ?? 0}
            </Body>
            <div className="foot">
              <Label>models</Label>
              <ModelLadder events={events} />
            </div>
          </>
        }
      >
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <Label>the stage</Label>
            <H2>{title}</H2>
          </div>
          <Pill variant="soft">{events.length} model calls</Pill>
        </div>
        <Body>This projector view is a scaffold. The {app} agent fills the left column.</Body>
      </StagePage>
    </div>
  );
}
