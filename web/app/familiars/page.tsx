'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, CTA, H1, Body, BodySm, Label, TextField } from '@/ui';
import { useFamiliars, withRoom } from './_components/useFamiliars';

const QUESTIONS: { label: string; placeholder: string }[] = [
  { label: 'something you build', placeholder: 'I build modular synths at 3 am' },
  { label: "where you're from", placeholder: 'Recife, then Pittsburgh' },
  { label: 'one true thing about you', placeholder: 'Night owl, obviously' },
];

export default function HatchPage() {
  const router = useRouter();
  const { code, member, setName, setSeat, me, members, act, connected } = useFamiliars();
  const [name, setNameDraft] = useState('');
  const [seat, setSeatDraft] = useState('');
  const [seeds, setSeeds] = useState(['', '', '']);
  const [pending, setPending] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (member?.name) setNameDraft((n) => n || member.name);
    if (member?.seat) setSeatDraft((s) => s || member.seat || '');
  }, [member]);

  // already hatched: this screen has nothing left to ask
  useEffect(() => {
    if (me) router.replace(withRoom('/familiars/me', code));
  }, [me, code, router]);

  // the identity is written first, then the familiar is hatched with it
  useEffect(() => {
    if (!pending || !member || fired.current) return;
    fired.current = true;
    act('hatch', { seeds, human: { name: member.name, seat } }).catch(() => {
      fired.current = false;
      setPending(false);
    });
  }, [pending, member, act, seeds, seat]);

  const ready = name.trim().length > 0 && seeds.every((s) => s.trim().length > 0);

  function hatch() {
    if (!ready || pending) return;
    setName(name.trim());
    setSeat(seat.trim());
    setPending(true);
  }

  return (
    <Screen app="fam" className="col">
      <TopNav
        left={
          <Pill variant="soft" icon="pin">
            {code ?? '…'} · Tepper
          </Pill>
        }
        right={
          <Pill variant="soft" icon={connected ? 'users' : 'clock'}>
            {members.length}
          </Pill>
        }
      />
      <div className="pad col" style={{ gap: 18, marginTop: 20, flex: 1 }}>
        <div className="col" style={{ gap: 6 }}>
          <Label>familiars</Label>
          <H1>hatch your familiar</H1>
          <Body>
            Three answers and you get a small creature that talks to other people&apos;s creatures. Bump a phone to
            meet someone.
          </Body>
        </div>

        <div className="col" style={{ gap: 6 }}>
          <Label>your name</Label>
          <TextField value={name} onChange={setNameDraft} placeholder="Joao" />
        </div>

        {QUESTIONS.map((q, i) => (
          <div className="col" style={{ gap: 6 }} key={q.label}>
            <Label>{q.label}</Label>
            <TextField
              value={seeds[i]}
              onChange={(v) => setSeeds((prev) => prev.map((s, j) => (i === j ? v : s)))}
              placeholder={q.placeholder}
            />
          </div>
        ))}

        <div className="col" style={{ gap: 6 }}>
          <Label>where are you sitting</Label>
          <TextField value={seat} onChange={setSeatDraft} placeholder="2nd floor, by the windows" />
          <BodySm>Only used to tell someone where to find you after a bump.</BodySm>
        </div>
      </div>

      <div className="bottom">
        <CTA variant="grad" icon="spark" onClick={hatch} disabled={!ready || pending}>
          {pending ? 'hatching…' : 'Hatch my familiar'}
        </CTA>
        <div style={{ textAlign: 'center' }}>
          <BodySm>{members.length > 0 ? `${members.length} in the room already` : 'you are early'}</BodySm>
        </div>
      </div>
    </Screen>
  );
}
