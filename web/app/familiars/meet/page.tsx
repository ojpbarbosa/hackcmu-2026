'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Creature from '../_components/Creature';
import { useFamiliars, withRoom } from '../_components/useFamiliars';
import { useWiggle } from '../_components/useWiggle';
import { activeCasts } from '@/lib/apps/familiars';
import type { Familiar, Pair } from '@/lib/apps/familiars';

const NEAR_POS: React.CSSProperties[] = [
  { left: 48, top: 40 },
  { right: 44, top: 86 },
  { left: 36, bottom: 40 },
  { right: 30, bottom: 24 },
];

function Spark() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
    </svg>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Speaks one line and resolves when it ends, or immediately when there is no voice. */
async function speak(text: string, voice: number): Promise<void> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    if (res.status === 204 || !res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
    URL.revokeObjectURL(url);
  } catch {
    /* a silent duet still reads */
  }
}

export default function MeetPage() {
  const router = useRouter();
  const { code, state, me, act, now } = useFamiliars();
  const [, setTick] = useState(0);
  const [castAt, setCastAt] = useState(0);
  const [shown, setShown] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [catching, setCatching] = useState<string | null>(null);

  // the 8 s cast TTL is wall-clock, so re-render on a timer
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 400);
    return () => clearInterval(t);
  }, []);

  const armed = !!(me && state?.casting?.[me.id]);

  const onSpike = useCallback(() => {
    if (!me) return;
    setCastAt(Date.now());
    void act('wiggle');
  }, [act, me]);

  const { available, permission, request, level } = useWiggle({ enabled: armed, onSpike });

  // leave casting mode behind us
  const actRef = useRef(act);
  actRef.current = act;
  useEffect(() => {
    return () => {
      void actRef.current('disarm');
    };
  }, []);

  // entering the page is entering casting mode
  const armedOnce = useRef(false);
  useEffect(() => {
    if (!me || armed || armedOnce.current) return;
    armedOnce.current = true;
    void act('arm');
    void request();
  }, [me, armed, act, request]);

  const enter = useCallback(async () => {
    // arm on the server first: the catch card must never depend on a sensor permission
    void act('arm');
    try {
      await request();
    } catch {
      /* no motion: the manual wiggle button stays */
    }
  }, [request, act]);

  const nowMs = now();
  const incoming = me && state ? (activeCasts(state, nowMs).find((c) => c.from !== me.id) ?? null) : null;
  const theirs: Familiar | null = incoming && state ? (state.familiars[incoming.from] ?? null) : null;

  const pair: Pair | null =
    me && state
      ? ([...(state.pairs ?? [])]
          .reverse()
          .find(
            (p) => (p.a === me.id || p.b === me.id) && !p.talked && nowMs - p.at < 120_000,
          ) ?? null)
      : null;

  const famA = pair && state ? (state.familiars[pair.a] ?? null) : null;
  const famB = pair && state ? (state.familiars[pair.b] ?? null) : null;

  // the duet: one line at a time, spoken, 900 ms floor, 3 s cap
  useEffect(() => {
    if (!pair) return;
    let alive = true;
    setShown(0);
    (async () => {
      for (let i = 0; i < pair.lines.length; i++) {
        if (!alive) return;
        setShown(i + 1);
        const line = pair.lines[i];
        const fam = line.who === 'a' ? famA : famB;
        await Promise.all([
          wait(900),
          Promise.race([speak(line.text, fam?.voice ?? 0), wait(3000)]),
        ]);
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
    // one run per pair
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.id]);

  const myCastOut = !!(me && state && state.pendingCasts.some((c) => c.from === me.id));
  const caught = !!(me && castAt > 0 && Date.now() - castAt < 30000 && Date.now() - castAt > 1500 && !myCastOut && !pair);

  const castingOthers =
    me && state ? Object.keys(state.casting ?? {}).filter((id) => id !== me.id) : [];
  const pulsing = castAt > 0 && Date.now() - castAt < 20000;

  /* ------------------------------------------------------------------- duet */
  if (pair && famA && famB) {
    const line = shown > 0 ? pair.lines[shown - 1] : null;
    const speaker = line ? (line.who === 'a' ? famA : famB) : null;
    const done = shown >= pair.lines.length;
    return (
      <div className="scr meet">
        <div className="top">
          <div className="nav">
            <span />
            <span className="pill">
              {famA.name} ↔ {famB.name}
            </span>
          </div>
          <div className="stage">
            <span className="spark">
              <Spark />
            </span>
            <div className="a">
              <Creature traits={famA.traits} size={140} mood={line?.who === 'a' ? 'talk' : 'idle'} glow />
            </div>
            <div className="b">
              <Creature traits={famB.traits} size={140} mood={line?.who === 'b' ? 'talk' : 'idle'} glow />
            </div>
            <div className="floor" />
            {line && (
              <div className="sub">
                “{line.text}”
                <small>
                  {speaker?.name} · line {shown} of {pair.lines.length}
                </small>
              </div>
            )}
          </div>
          {done && (
            <div className="pad" style={{ marginTop: 34 }}>
              <div className="both">
                <p className="lbl">you both</p>
                <p className="d2">{pair.youBoth}</p>
                <p className="body">Say it: “{pair.say}”</p>
              </div>
            </div>
          )}
        </div>
        <div className="bottom">
          <button
            className="cta gold"
            type="button"
            onClick={async () => {
              await act('talked', { pairId: pair.id });
              router.push(withRoom('/familiars/web', code));
            }}
          >
            We talked
          </button>
        </div>
      </div>
    );
  }

  if (incoming && theirs && dismissed !== incoming.id) {
    return (
      <div className="scr">
        <div className="top">
          <div className="nav">
            <span className="pill">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rose)', boxShadow: '0 0 10px var(--rose)' }} />
              casting
            </span>
          </div>
          <div className="arc" style={{ marginTop: 22, height: 280, position: 'relative' }}>
            <div className="ring r3" />
            <div className="ring r2" />
            <div className="ring" />
            {me && <Creature traits={me.traits} size={150} glow />}
          </div>
          <div className="pad" style={{ marginTop: 22 }}>
            <div className="catchcard">
              <Creature traits={theirs.traits} size={58} />
              <div style={{ flex: 1 }}>
                <b>
                  {theirs.name}, from {theirs.human.name}
                </b>
                <small>casting to you</small>
              </div>
            </div>
          </div>
        </div>
        <div className="bottom">
          <button
            className="cta gold"
            type="button"
            disabled={catching === incoming.id}
            onClick={() => {
              setCatching(incoming.id);
              void act('catch', { castId: incoming.id }).finally(() => setCatching(null));
            }}
          >
            <Spark />
            {catching === incoming.id ? `${theirs.name} and ${me?.name ?? 'yours'} are meeting…` : 'Catch'}
          </button>
          {catching === incoming.id && (
            <div className="skel line" style={{ width: '70%', alignSelf: 'center' }} />
          )}
          <button className="cta ghost" type="button" onClick={() => setDismissed(incoming.id)}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- not armed */
  if (!armed) {
    return (
      <div className="scr">
        <div className="top">
          <div className="nav">
            <span className="pill">meet</span>
          </div>
          <div className="pad" style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', textAlign: 'center' }}>
            {me && <Creature traits={me.traits} size={150} glow />}
            <p className="d2">cast {me?.name ?? 'your familiar'} to the room</p>
            <p className="mute body">Hold the phone out and wiggle it. Someone near you catches.</p>
          </div>
        </div>
        <div className="bottom">
          <button className="cta ghost" type="button" onClick={() => void enter()}>
            {me ? 'Entering casting mode…' : 'Hatch first'}
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------ catch card on top */
  /* ---------------------------------------------------------- casting mode */
  return (
    <div className="scr">
      <div className="top">
        <div className="nav">
          <span className="pill">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rose)', boxShadow: '0 0 10px var(--rose)' }} />
            casting
          </span>
        </div>
        <div className="arc" style={{ marginTop: 22, height: 300, position: 'relative' }}>
          <div className="ring r3" style={pulsing ? { animation: 'pulse 1.2s ease-in-out infinite' } : undefined} />
          <div className="ring r2" style={pulsing ? { animation: 'pulse 1.2s ease-in-out infinite' } : undefined} />
          <div className="ring" style={pulsing ? { animation: 'pulse 1.2s ease-in-out infinite' } : undefined} />
          {castingOthers.slice(0, 4).map((id, i) => {
            const f = state?.familiars[id] ?? null;
            return (
              <div className="near" key={id} style={NEAR_POS[i % NEAR_POS.length]}>
                {f ? <Creature traits={f.traits} size={48} /> : <span className="chip" />}
                {f?.human.name ?? 'someone'}
              </div>
            );
          })}
          {me && <Creature traits={me.traits} size={150} mood="idle" glow />}
        </div>
        <div className="pad" style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
          <p className="d2">{pulsing ? `cast out…` : `wiggle to cast ${me?.name ?? 'your familiar'}`}</p>
          {caught ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <p className="s mute">someone caught {me?.name}. The familiars are talking…</p>
              <div className="skel line" style={{ width: '70%' }} />
            </div>
          ) : (
            <div className="meter">
              <i style={{ width: pulsing ? '100%' : `${Math.max(6, Math.min(100, Math.round(level * 70)))}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="bottom">
        {available && permission !== 'granted' && (
          <button className="cta ghost" type="button" onClick={() => void request()}>
            Turn on motion
          </button>
        )}
        {(!available || permission !== 'granted') && (
          <button className="cta gold" type="button" onClick={onSpike}>
            Wiggle
          </button>
        )}
      </div>
    </div>
  );
}
