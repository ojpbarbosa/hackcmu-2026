'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, CTA, Icon, H1, BodySm } from '@/ui';
import { statsFor } from '@/lib/apps/familiars';
import { StoryCard } from '../_components/StoryCard';
import { lastModel, useFamiliars, withRoom } from '../_components/useFamiliars';

export default function NightPage() {
  const router = useRouter();
  const { code, state, me, act, events } = useFamiliars();
  const [page, setPage] = useState(0);
  const asked = useRef(false);

  const story = me && state ? (state.stories[me.id] ?? null) : null;
  const stats = useMemo(() => (state && me ? statsFor(state, me.id) : null), [state, me]);

  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  // the chronicler writes it once, from the graph as it stands
  useEffect(() => {
    if (!me || !state || story || asked.current) return;
    asked.current = true;
    act('story').catch(() => {
      asked.current = false;
    });
  }, [me, state, story, act]);

  const written = lastModel(events, 'familiars.story');
  const cards = story?.cards ?? [];
  const card = cards[Math.min(page, Math.max(0, cards.length - 1))];
  const rest = cards.filter((_, i) => i !== Math.min(page, Math.max(0, cards.length - 1)));
  const roomSize = state ? Object.keys(state.familiars).length : 0;
  const small = stats
    ? `${stats.bumps === 1 ? 'familiar' : 'familiars'} bumped · ${stats.contacts} ${
        stats.contacts === 1 ? 'person' : 'people'
      }`
    : 'familiars bumped';

  return (
    <Screen app="fam" className="col">
      <TopNav
        left={
          <Pill variant="soft" icon="clock">
            {code ?? '…'} · tonight
          </Pill>
        }
        right={
          <Pill variant="soft" icon="user" onClick={() => router.push(withRoom('/familiars/me', code))}>
            {me?.name ?? 'you'}
          </Pill>
        }
      />

      <div className="pad col" style={{ gap: 14, marginTop: 18, flex: 1 }}>
        <H1>your night</H1>

        {card ? (
          <button
            type="button"
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0 }}
            onClick={() => setPage((p) => (p + 1) % Math.max(1, cards.length))}
            aria-label="next card"
          >
            <StoryCard card={card} extra={[small, ...rest.map((c) => c.text)]} />
          </button>
        ) : (
          <div className="storycard">
            <p className="lbl">the chronicler</p>
            <p className="body">reading tonight&apos;s graph…</p>
          </div>
        )}

        <div className="row2" style={{ justifyContent: 'space-between' }}>
          <BodySm>
            {/* the model is named only once the room's event log says which one answered */}
            {written
              ? `Written by ${written.model} from tonight's graph`
              : story
                ? "Written from tonight's graph"
                : 'Waiting for the chronicler'}
            {written?.fallback ? <span className="badge-fb">fallback</span> : null}
          </BodySm>
          <span className="pill soft" style={{ height: 30, fontSize: 12 }}>
            {Math.min(page + 1, Math.max(1, cards.length))} / {Math.max(1, cards.length)}
          </span>
        </div>

        <BodySm>
          {cards.length > 1 ? 'tap the card to lead with another part of the night · ' : ''}
          {roomSize} familiars in this room
        </BodySm>
      </div>

      <div className="bottom">
        <CTA variant="grad" icon="eye-off" onClick={() => router.push(withRoom('/familiars/away', code))}>
          Show me who
        </CTA>
        <button
          type="button"
          className="bsm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', minHeight: 44 }}
          onClick={() => router.push(withRoom('/familiars/bump', code))}
        >
          <Icon name="phone" size={14} className="xs" />
          bump one more phone
        </button>
      </div>
    </Screen>
  );
}
