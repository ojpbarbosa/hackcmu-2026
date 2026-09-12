'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Screen, TopNav, H2, Body, BodySm, Label, Chip, CTA, Icon } from '@/ui';
import { ALLERGENS } from '@/lib/palate/score';
import { usePalate } from '../../_components/usePalate';

const LANGUAGES: Record<string, string> = { th: 'Thai', pt: 'Portuguese', en: 'English', es: 'Spanish', fr: 'French' };

/** Screen 5 — ask the kitchen. Grey stays grey until somebody answers. */
export default function PalateAsk() {
  const params = useParams<{ dish: string }>();
  const dishId = decodeURIComponent(String(params?.dish ?? ''));
  const router = useRouter();
  const { state, me, ranked, dishes, header, act, href } = usePalate();

  const scored = ranked.find((s) => s.dish.id === dishId);
  const dish = scored?.dish ?? dishes.find((d) => d.id === dishId);
  const options = me?.never?.length ? me.never : [...ALLERGENS];
  const [allergen, setAllergen] = useState<string | null>(null);
  const chosen = allergen ?? scored?.blockedBy ?? options[0];
  const card = state?.cards[`${dishId}|${chosen}`];
  const asked = useRef('');

  useEffect(() => {
    if (!state || !dish || !chosen || card) return;
    const key = `${dishId}|${chosen}`;
    if (asked.current === key) return;
    asked.current = key;
    act('ask', { dishId, allergen: chosen }).catch(() => {
      asked.current = '';
    });
  }, [state, dish, chosen, card, dishId, act]);

  const language = header?.language ?? 'en';
  const cleared = state?.known[dishId]?.allergenCleared ?? [];

  return (
    <Screen app="pal" className="col">
      <TopNav
        left={
          <Link className="back" href={href('/palate/menu')} aria-label="back">
            <Icon name="chev-l" size={20} />
          </Link>
        }
        title="Ask the kitchen"
        right={
          <span className="icon-btn" aria-hidden="true">
            <Icon name="share" size={20} />
          </span>
        }
      />

      <div className="pad col" style={{ gap: 14, marginTop: 16 }}>
        <div>
          <H2>{scored?.status === 'never' ? 'blocked, so red.' : 'unknown, so grey.'}</H2>
          <div style={{ marginTop: 6 }}>
            <Body>
              {scored?.status === 'never'
                ? `The ingredient record for ${dish?.name ?? 'this dish'} carries ${scored.blockedBy}. Ask, and the kitchen's answer becomes the record.`
                : `No ingredient record for ${dish?.name ?? 'this dish'}. Show this to the kitchen; it is written in the menu's language.`}
            </Body>
          </div>
        </div>

        {options.length > 1 ? (
          <div className="col" style={{ gap: 8 }}>
            <Label>ask about</Label>
            <div className="chips">
              {options.map((a) => (
                <Chip key={a} on={a === chosen} onClick={() => setAllergen(a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        <div className="chefcard">
          <p className="lbl">show this</p>
          <p className="th" style={{ whiteSpace: 'pre-line' }}>
            {card?.native ?? '…'}
          </p>
          <div className="divider" />
          <p className="en">{card?.english ?? 'writing the card…'}</p>
          <p className="bsm" style={{ color: '#6A6A88' }}>
            {LANGUAGES[language] ?? language}, because the menu is · written by {card?.by.model ?? 'the model'}
            {card?.by.fallback ? <span className="badge-fb">fallback</span> : null}
          </p>
        </div>

        {cleared.length ? (
          <BodySm>
            the kitchen already answered: no {cleared.join(', ')}
            {scored?.status === 'unknown' ? ' — still grey, because nobody has told us what is in it' : ''}
          </BodySm>
        ) : null}
      </div>

      <div className="bottom">
        <CTA
          variant="grad"
          icon="check"
          disabled={!chosen}
          onClick={async () => {
            await act('clear', { dishId, allergen: chosen });
            router.push(href('/palate/menu'));
          }}
        >
          They said no {chosen}
        </CTA>
        <CTA variant="ghost" onClick={() => router.push(href('/palate/menu'))}>
          Keep it grey
        </CTA>
      </div>
    </Screen>
  );
}
