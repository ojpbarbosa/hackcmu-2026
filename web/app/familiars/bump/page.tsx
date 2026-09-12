'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, Card, CTA, Sheet, Icon, H1, H3, Body, BodySm, Label, Sub, TextField } from '@/ui';
import type { Bump } from '@/lib/apps/familiars';
import { Exchange } from '../_components/Exchange';
import { MagnitudeBar, useBumpSensor } from '../_components/BumpSensor';
import { Orb } from '../_components/Orb';
import { useFamiliars, withRoom } from '../_components/useFamiliars';

export default function BumpPage() {
  const router = useRouter();
  const { code, member, state, me, act, params, serverNow } = useFamiliars();
  const simulate = params.get('simulate') === '1';
  // ?simulate=1&auto=1 arms itself on load: for screenshots and desk demos only,
  // since a real sensor may only be armed from a tap.
  const autoStart = simulate && params.get('auto') === '1';
  const withId = params.get('with');
  const showLast = params.get('last') === '1';

  const [pairId, setPairId] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(withId);
  const [streamed, setStreamed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [address, setAddress] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // the query string only arrives after mount, so ?with= has to be adopted then
  useEffect(() => {
    if (withId) setOtherId((prev) => prev ?? withId);
  }, [withId]);

  const onMatched = useCallback((m: { pairId: string; withMemberId: string }) => {
    setPairId(m.pairId);
    setOtherId(m.withMemberId);
    setStreamed(false);
  }, []);

  const sensor = useBumpSensor({
    code,
    memberId: member?.id ?? null,
    serverNow,
    simulate,
    onMatched,
  });

  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  const armed = useRef(false);
  useEffect(() => {
    if (!autoStart || armed.current || !me || !code) return;
    armed.current = true;
    sensor.start();
  }, [autoStart, me, code, sensor]);

  const bump: Bump | null = useMemo(() => {
    if (!state || !me) return null;
    const mine = state.bumps.filter((b) => b.a === me.id || b.b === me.id);
    if (pairId) return mine.find((b) => b.id === pairId) ?? null;
    if (otherId) {
      const withThem = mine.filter((b) => b.a === otherId || b.b === otherId);
      return withThem[withThem.length - 1] ?? null;
    }
    if (showLast) return mine[mine.length - 1] ?? null;
    return null;
  }, [state, me, pairId, otherId, showLast]);

  const other = useMemo(() => {
    if (!state || !me) return null;
    const id = bump ? (bump.a === me.id ? bump.b : bump.a) : otherId;
    return id ? (state.familiars[id] ?? null) : null;
  }, [state, me, bump, otherId]);

  const onStreamDone = useCallback(() => setStreamed(true), []);

  async function keyAddress() {
    if (!me) return;
    const wanted = address.trim().toUpperCase();
    const target = Object.values(state?.familiars ?? {}).find((f) => f.address === wanted);
    if (!target || target.id === me.id) {
      setKeyError('no familiar at that address in this room.');
      return;
    }
    setKeyError(null);
    setSheet(false);
    setAddress('');
    setOtherId(target.id);
    setStreamed(false);
    await act('bumpByAddress', { address: wanted });
  }

  const meeting = !!(pairId || otherId) && !bump;
  const phase = sensor.phase;

  // the exchange is written server-side when the pair lands; if it never shows up,
  // the other phone has not hatched a familiar
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!meeting) {
      setStalled(false);
      return;
    }
    const t = setTimeout(() => setStalled(true), 9000);
    return () => clearTimeout(t);
  }, [meeting]);

  return (
    <Screen app="fam" className="col">
      <TopNav
        left={
          <button type="button" className="back" aria-label="back" onClick={() => router.back()}>
            <Icon name="chev-l" />
          </button>
        }
        title="Bump"
        right={
          <Pill variant="soft">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: phase === 'sensing' || phase === 'waiting' ? 'var(--live)' : 'var(--t3)',
                boxShadow: phase === 'sensing' ? '0 0 10px rgba(255,59,107,.6)' : undefined,
              }}
            />
            {bump ? '10 s' : phase === 'sensing' ? 'listening' : phase === 'waiting' ? 'pairing' : 'ready'}
          </Pill>
        }
      />

      <div className="pad col" style={{ gap: 14, marginTop: 10, flex: 1 }}>
        {bump && me && other ? (
          <>
            <div className="meet">
              <Orb aura={me.aura} letter={me.name} size="sm" />
              <div className="spark">
                <Icon name="spark" />
              </div>
              <Orb aura={other.aura} letter={other.name} size="sm" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <H3>
                {me.name} ↔ {other.name}
              </H3>
              <Sub>{streamed ? 'they are done talking' : 'the familiars are talking'}</Sub>
            </div>

            <Exchange bump={bump} me={me} other={other} onDone={onStreamDone} instant={showLast && !pairId} />

            {streamed ? (
              <div className="result">
                <p className="lbl">you both</p>
                <H3>{bump.youBoth}</H3>
                <div style={{ marginTop: 6 }}>
                  <p className="body" style={{ color: '#065F46' }}>
                    {other.name}&apos;s human is {other.human.name}
                    {other.human.seat ? `, ${other.human.seat}` : ', somewhere in this room'}.
                  </p>
                </div>
                <div style={{ marginTop: 8 }}>
                  <p className="bsm" style={{ color: '#047857' }}>
                    {bump.suggestion}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        ) : meeting ? (
          <>
            <div className="meet">
              {me ? <Orb aura={me.aura} letter={me.name} size="sm" /> : null}
              <div className="spark">
                <Icon name="spark" />
              </div>
              {other ? (
                <Orb aura={other.aura} letter={other.name} size="sm" />
              ) : (
                <Orb letter="?" size="sm" ghost />
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <H3>a phone answered</H3>
              <Sub>{stalled ? 'nothing came back' : 'the familiars are talking'}</Sub>
            </div>
            {stalled ? (
              <Card className="col">
                <Label>no exchange yet</Label>
                <div style={{ marginTop: 8 }}>
                  <BodySm>
                    The other phone has probably not hatched a familiar yet. Have them open the room and answer the
                    three questions, then bump again.
                  </BodySm>
                </div>
              </Card>
            ) : null}
          </>
        ) : (
          <>
            <div className="meet">
              {me ? <Orb aura={me.aura} letter={me.name} size="sm" /> : null}
              <div className="spark">
                <Icon name="spark" />
              </div>
              <Orb letter="?" size="sm" ghost />
            </div>

            <div style={{ textAlign: 'center' }}>
              <H1>bump a phone</H1>
              <Body>
                {phase === 'sensing'
                  ? 'hold your phone and knock it against theirs, firmly, once.'
                  : phase === 'waiting'
                    ? 'felt that. waiting for the other phone.'
                    : phase === 'none'
                      ? 'no bump found. try again, or key their address.'
                      : phase === 'blocked'
                        ? 'motion is not available here. key their address instead.'
                        : 'tap below, then knock the two phones together.'}
              </Body>
            </div>

            {phase === 'sensing' || phase === 'waiting' ? (
              <div className="col" style={{ gap: 8 }}>
                <MagnitudeBar level={sensor.level} />
                <div className="between">
                  <BodySm>motion</BodySm>
                  <BodySm>{phase === 'waiting' ? 'looking for a partner' : 'listening for a knock'}</BodySm>
                </div>
              </div>
            ) : null}

            {sensor.error ? <BodySm>{sensor.error}</BodySm> : null}

            {phase === 'idle' || phase === 'none' || phase === 'blocked' ? (
              <Card className="col">
                <Label>how it works</Label>
                <div className="col" style={{ gap: 8, marginTop: 10 }}>
                  {[
                    'Both of you open this screen.',
                    'Tap the button. iPhone asks for motion once, say yes.',
                    'Knock the phones together, firmly, one time.',
                  ].map((step, i) => (
                    <div className="row2" key={step} style={{ gap: 10, alignItems: 'flex-start' }}>
                      <span className="chip" style={{ height: 24, minWidth: 24, justifyContent: 'center', padding: 0 }}>
                        {i + 1}
                      </span>
                      <BodySm>{step}</BodySm>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {simulate ? <Label>simulate mode · no sensor needed</Label> : null}
          </>
        )}
      </div>

      <div className="bottom">
        {bump ? (
          <CTA variant="grad" icon="check" onClick={() => router.push(withRoom('/familiars/me', code))}>
            We talked
          </CTA>
        ) : (
          <CTA
            variant="grad"
            icon="phone"
            onClick={() => sensor.start()}
            disabled={phase === 'sensing' || phase === 'waiting'}
          >
            {phase === 'sensing' ? 'listening…' : phase === 'waiting' ? 'pairing…' : 'Bump a phone'}
          </CTA>
        )}
        <button type="button" className="bsm" style={{ textAlign: 'center' }} onClick={() => setSheet(true)}>
          {me ? `or key an address · ${me.address} is yours` : 'or key an address'}
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
              setKeyError(null);
            }}
            placeholder="K7X"
            autoFocus
            onSubmit={keyAddress}
          />
          {keyError ? <BodySm>{keyError}</BodySm> : null}
          <CTA variant="grad" onClick={keyAddress} disabled={address.trim().length < 3}>
            Introduce us
          </CTA>
          <CTA variant="ghost" onClick={() => setSheet(false)}>
            Not now
          </CTA>
        </div>
      </Sheet>
    </Screen>
  );
}
