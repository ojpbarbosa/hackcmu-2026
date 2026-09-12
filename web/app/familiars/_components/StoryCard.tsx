'use client';
import { Body, Label } from '@/ui';

export type Card = { label: string; big?: string; text: string };

/** The chronicler's card: dark, one number, one paragraph, an emerald halo. */
export function StoryCard({ card, extra }: { card: Card; extra?: string[] }) {
  return (
    <div className="storycard">
      <Label>{card.label}</Label>
      {card.big ? (
        <div className="big">
          {card.big}
          {extra?.length ? <small>{extra[0]}</small> : null}
        </div>
      ) : null}
      <Body>{card.text}</Body>
      {(extra ?? []).slice(card.big ? 1 : 0).map((line, i) => (
        <div key={i}>
          <div className="divider" style={{ background: '#2A2A38', marginBottom: 14 }} />
          <Body>{line}</Body>
        </div>
      ))}
    </div>
  );
}
