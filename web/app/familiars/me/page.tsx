'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, CTA, Sheet, H1, H3, Body, BodySm, Label, Sub, TextField } from '@/ui';
import { statsFor } from '@/lib/apps/familiars';
import { Orb } from '../_components/Orb';
import { useFamiliars, withRoom } from '../_components/useFamiliars';

export default function MePage() {
  const router = useRouter();
  const { code, state, me, act, connected } = useFamiliars();
  const [sheet, setSheet] = useState(false);
  const [address, setAddress] = useState('');
  const [keying, setKeying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // no familiar on this device yet: go and hatch one
  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  const stats = useMemo(() => (state && me ? statsFor(state, me.id) : null), [state, me]);

  async function keyAddress() {
    if (!me || keying) return;
    const wanted = address.trim().toUpperCase();
    if (wanted.length < 3) return;
    if (wanted === me.address) {
      setError('that one is yours. ask for theirs.');
      return;
    }
    const target = Object.values(state?.familiars ?? {}).find((f) => f.address === wanted);
    if (!target) {
      setError('no familiar at that address in this room.');
      return;
    }
    setKeying(true);
    setError(null);
    await act('bumpByAddress', { address: wanted });
    setKeying(false);
    setSheet(false);
    setAddress('');
    router.push(withRoom('/familiars/bump?with=' + encodeURIComponent(target.id), code));
  }

  if (!me) {
    return (
      <Screen app="fam" className="col">
        <TopNav left={<Pill variant="soft" icon="pin">{code ?? '…'}</Pill>} />
        <div className="pad col" style={{ gap: 12, marginTop: 40, flex: 1 }}>
          <H1>finding your familiar</H1>
          <Body>One moment. If nothing happens, hatch a new one.</Body>
        </div>
        <div className="bottom">
          <CTA variant="ghost" href={withRoom('/familiars', code)}>
            Hatch my familiar
          </CTA>
        </div>
      </Screen>
    );
  }

  return (
    <Screen app="fam" className="col">
      <TopNav
        left={
          <Pill variant="soft" icon="pin">
            {code} · Tepper
          </Pill>
        }
        right={
          <Pill variant="soft" icon="clock" onClick={() => router.push(withRoom('/familiars/night', code))}>
            your night
          </Pill>
        }
      />

      <div className="pad col" style={{ gap: 20, marginTop: 24, flex: 1 }}>
        <Orb aura={me.aura} letter={me.name} />
        <div style={{ textAlign: 'center' }}>
          <H1>{me.name}</H1>
          <Sub>
            your familiar · address {me.address}
          </Sub>
        </div>

        <div className="statrow">
          <span className="pill">
            <b>{stats?.contacts ?? 0}</b>contacts
          </span>
          <span className="pill">
            <b>{stats?.bumps ?? 0}</b>bumps
          </span>
          <span className="pill">
            <b>{stats?.clusters ?? 0}</b>clusters
          </span>
        </div>

        <div className="seeds">
          {me.seeds.map((s, i) => (
            <div className="seed" key={i}>
              <i />
              {s}
            </div>
          ))}
        </div>

        {!connected ? <BodySm>reconnecting to the room…</BodySm> : null}
      </div>

      <div className="bottom">
        <CTA variant="grad" icon="phone" onClick={() => router.push(withRoom('/familiars/bump', code))}>
          Bump a phone to meet
        </CTA>
        <button
          type="button"
          className="bsm"
          style={{ minHeight: 44, width: '100%', textAlign: 'center' }}
          onClick={() => setSheet(true)}
        >
          or key an address · {me.address} is yours
        </button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <Label>key their address</Label>
        <div className="col" style={{ gap: 10, marginTop: 10 }}>
          <H3>three characters, on their screen</H3>
          <TextField
            value={address}
            onChange={(v) => {
              setAddress(v.toUpperCase().slice(0, 3));
              setError(null);
            }}
            placeholder="K7X"
            autoFocus
            onSubmit={keyAddress}
          />
          {error ? <BodySm>{error}</BodySm> : null}
          <CTA variant="grad" onClick={keyAddress} disabled={address.trim().length < 3 || keying}>
            {keying ? 'introducing…' : 'Introduce us'}
          </CTA>
          <CTA variant="ghost" onClick={() => setSheet(false)}>
            Not now
          </CTA>
        </div>
      </Sheet>
    </Screen>
  );
}
