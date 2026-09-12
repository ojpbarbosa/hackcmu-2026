'use client';
import '@/ui/tokens.css';
import { useState } from 'react';
import {
  Screen, TopNav, Pill, Chip, Card, CTA, Avatar, AvatarStack, Dock, Sheet, Stat,
  H1, H2, H3, Title, Body, BodySm, Label, Sub, Bubble, Icon, ModelLadder, TextField, QR, StagePage,
} from '@/ui';
import type { ObserveEvent } from '@/lib/types';

const EVENTS: ObserveEvent[] = [
  { ts: 1, app: 'cast', task: 'cast.prompt', provider: 'mock', model: 'mock-deterministic', latencyMs: 12, ok: true },
  { ts: 2, app: 'cast', task: 'cast.plan', provider: 'mock', model: 'mock-deterministic', latencyMs: 9, ok: true },
  { ts: 3, app: 'cast', task: 'cast.plan', provider: 'ifm', model: 'IFM/K2-Horizon-375B-A23B', latencyMs: 820, ok: true, fallback: true },
];

export default function Gallery() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return (
    <Screen app="cast" dock>
      <TopNav
        left={<Pill variant="soft" icon="users">the basement · 4</Pill>}
        right={<Pill variant="soft" icon="bell">live</Pill>}
      />
      <div className="pad col" style={{ gap: 18, marginTop: 18 }}>
        <div>
          <Label>ui kit</Label>
          <H1>type scale</H1>
          <H2>heading two</H2>
          <H3>heading three</H3>
          <Title>TITLE CAPS</Title>
          <Body>Body copy sits at fifteen pixels with a calm line height and a muted ink.</Body>
          <BodySm>Small body for captions and counts.</BodySm>
          <Sub>Italic subline for venue and time.</Sub>
        </div>

        <div className="divider" />

        <div className="row2" style={{ flexWrap: 'wrap', gap: 8 }}>
          <Pill icon="clock">0:07 to cast</Pill>
          <Pill variant="ink" icon="lock">3 of 4 cast</Pill>
          <Pill variant="soft" icon="pin">Tepper</Pill>
        </div>

        <div className="chips">
          <Chip on>somewhere new</Chip>
          <Chip>quiet</Chip>
          <Chip>loud</Chip>
          <Chip>food</Chip>
        </div>

        <Card>
          <div className="between">
            <div className="row2">
              <Avatar name="Pietro" tone={2} status="done" />
              <Avatar name="Maya" tone={3} status="typing" />
              <Avatar name="Sam" tone={4} />
            </div>
            <AvatarStack people={[{ name: 'Joao', tone: 1 }, { name: 'Pietro', tone: 2 }, { name: 'Maya', tone: 3 }]} size="sm" />
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="row2" style={{ gap: 24 }}>
            <Stat value="11" label="casts" />
            <Stat value="9" label="bumps" accent />
            <Stat value="3" label="clusters" />
          </div>
        </Card>

        <div className="col" style={{ gap: 8 }}>
          <Bubble>My human solders at 3 am.</Bubble>
          <Bubble tone="mint">Mine has a Eurorack in a dorm room.</Bubble>
          <Bubble tone="indigo" side="r">A what in a where.</Bubble>
          <Bubble tone="raised">Exactly. Tell yours to come see it.</Bubble>
        </div>

        <TextField value={text} onChange={setText} placeholder="your name" />

        <div className="row2" style={{ gap: 10 }}>
          <Icon name="spark" /><Icon name="compass" /><Icon name="fork" /><Icon name="zap" /><Icon name="cam" /><Icon name="share" /><Icon name="eye-off" /><Icon name="flag" />
        </div>

        <Card>
          <Label>scan to join</Label>
          <div style={{ marginTop: 10 }}>
            <QR url="https://example.com/cast?room=K7XQ2" size={120} />
          </div>
        </Card>

        <div className="col" style={{ gap: 10 }}>
          <CTA variant="grad" icon="zap">Cast your answer</CTA>
          <CTA icon="phone">Bump a phone to meet</CTA>
          <CTA variant="ghost" onClick={() => setOpen(true)}>Open the sheet</CTA>
          <CTA variant="ghost" disabled>Disabled</CTA>
        </div>

        <Card>
          <Label>model ladder (light)</Label>
          <div style={{ marginTop: 8 }}>
            <ModelLadder events={EVENTS} dark={false} />
          </div>
        </Card>

        <div style={{ borderRadius: 18, overflow: 'hidden' }}>
          <StagePage side={<>
            <Label>models</Label>
            <ModelLadder events={EVENTS} />
          </>}>
            <Label>the basement · the pond</Label>
            <H2>fourteen days of casts</H2>
            <Body>Stage layout, dark ground, side rail with the ladder.</Body>
          </StagePage>
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <H3>the route stays hidden.</H3>
        <Body>Tapping the map does not reveal the route. Keep going, or end the walk here.</Body>
        <div className="col" style={{ gap: 10, marginTop: 12 }}>
          <CTA variant="grad" onClick={() => setOpen(false)}>Keep walking</CTA>
          <CTA variant="ghost" onClick={() => setOpen(false)}>End early</CTA>
        </div>
      </Sheet>

      <Dock items={[
        { icon: 'home', active: true },
        { icon: 'zap' },
        { icon: 'msg' },
        { icon: 'cal' },
        { icon: 'user' },
      ]} />
    </Screen>
  );
}
