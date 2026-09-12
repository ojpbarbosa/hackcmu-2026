'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, H1, Body, BodySm, Label, TextField, Chip, CTA, Icon } from '@/ui';
import { ALLERGENS } from '@/lib/palate/score';
import { usePalate } from './_components/usePalate';

const NEVERS = [...ALLERGENS, 'none'];

/** Screen 1 — onboard. Five dishes you love and the things you never eat. */
export default function PalateOnboard() {
  const { member, setName, act, code, me, href, connected } = usePalate();
  const router = useRouter();

  const [nameDraft, setNameDraft] = useState('');
  const [dish, setDish] = useState('');
  const [loved, setLoved] = useState<string[]>([]);
  const [never, setNever] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const sent = useRef(false);
  const filled = useRef(false);

  // come back to this screen and you are editing the palate you already built
  useEffect(() => {
    if (!me || filled.current) return;
    filled.current = true;
    setLoved(me.loved ?? []);
    setNever(me.never?.length ? me.never : []);
  }, [me]);

  useEffect(() => {
    if (!pending || !member || !code || sent.current) return;
    sent.current = true;
    (async () => {
      await act('profile', { loved, never });
      router.push(href('/palate/me'));
    })().catch(() => {
      sent.current = false;
      setPending(false);
    });
  }, [pending, member, code, act, loved, never, router, href]);

  const addDish = () => {
    const v = dish.trim();
    if (!v || loved.includes(v) || loved.length >= 8) return;
    setLoved([...loved, v]);
    setDish('');
  };

  const toggleNever = (a: string) => {
    if (a === 'none') return setNever([]);
    setNever(never.includes(a) ? never.filter((x) => x !== a) : [...never, a]);
  };

  const ready = loved.length > 0 && (!!member || nameDraft.trim().length > 0);

  return (
    <Screen app="pal" className="col">
      <TopNav
        left={
          <Pill variant="soft" icon="fork">
            palate
          </Pill>
        }
        right={
          <Pill variant="soft" icon={connected ? 'zap' : 'clock'}>
            {code ?? '·····'}
          </Pill>
        }
      />
      <div className="pad col" style={{ gap: 18, marginTop: 16 }}>
        <div>
          <Label>your palate</Label>
          <H1>five dishes you love</H1>
          <Body>
            Name the things you order again and again. That is the whole profile — no questionnaire, no stars.
          </Body>
        </div>

        {!member ? (
          <div className="col" style={{ gap: 8 }}>
            <Label>who is eating</Label>
            <TextField value={nameDraft} onChange={setNameDraft} placeholder="your name" onSubmit={() => setNameDraft(nameDraft.trim())} />
          </div>
        ) : null}

        <div className="col" style={{ gap: 10 }}>
          <Label>dishes you love</Label>
          <TextField
            value={dish}
            onChange={setDish}
            placeholder="massaman curry"
            onSubmit={addDish}
          />
          <div className="chips">
            {loved.map((d) => (
              <Chip key={d} on onClick={() => setLoved(loved.filter((x) => x !== d))}>
                {d}
                <Icon name="plus" size={14} className="xs" />
              </Chip>
            ))}
            {loved.length === 0 ? <BodySm>press enter after each dish</BodySm> : null}
          </div>
        </div>

        <div className="col" style={{ gap: 10 }}>
          <Label>never, on any menu</Label>
          <div className="chips">
            {NEVERS.map((a) => (
              <Chip key={a} on={a === 'none' ? never.length === 0 : never.includes(a)} onClick={() => toggleNever(a)}>
                {a}
              </Chip>
            ))}
          </div>
          <BodySm>A never is a hard block: those dishes are never scored, for you or for the table.</BodySm>
        </div>
      </div>

      <div className="bottom">
        <CTA
          variant="grad"
          disabled={!ready || pending}
          onClick={() => {
            if (!member) setName(nameDraft);
            setPending(true);
          }}
        >
          {pending ? 'building…' : 'Build my palate'}
        </CTA>
      </div>
    </Screen>
  );
}
