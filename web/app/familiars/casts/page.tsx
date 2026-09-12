'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Creature } from '../_components/Creature';
import { Deck, whenLabel } from '../_components/Deck';
import { Tabs } from '../_components/Tabs';
import { useFamiliars, withRoom } from '../_components/useFamiliars';
import { useRecorder } from '../_components/useRecorder';
import { isMatch } from '@/lib/apps/familiars';
import type { Card, Familiar, FamState } from '@/lib/apps/familiars';

const STEPS = ['Searching this weekend…', 'Reading pages', 'Choosing three'];

/** The swipe map is keyed one way on the server; read it both ways so the
 *  screen never lies about what you already decided. */
function dirFor(state: FamState, cardId: string, who: string): 'in' | 'out' | undefined {
  const swipes = state.scout?.swipes ?? {};
  return swipes[cardId]?.[who] ?? swipes[who]?.[cardId];
}

function icsFor(card: Card): string {
  const stamp = (iso: string | null) => {
    const d = iso ? new Date(iso) : new Date();
    return `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  };
  const start = stamp(card.whenISO);
  const end = stamp(card.whenISO ? new Date(new Date(card.whenISO).getTime() + 2 * 3600_000).toISOString() : null);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Familiars//EN',
    'BEGIN:VEVENT',
    `UID:${card.id}@familiars`,
    `DTSTAMP:${stamp(null)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${card.title}`,
    `LOCATION:${card.where}`,
    card.source ? `URL:${card.source}` : '',
    `DESCRIPTION:${card.why}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

export default function CastsPage() {
  const router = useRouter();
  const { code, state, me, act, params } = useFamiliars();
  const [tab, setTab] = useState<'tonight' | 'out'>('tonight');
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const sent = useRef('');

  useEffect(() => {
    if (params.get('tab') === 'out') setTab('out');
  }, [params]);

  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1200);
    return () => window.clearInterval(t);
  }, [pending]);

  useEffect(() => {
    if (state?.scout?.cards.length) setPending(false);
  }, [state]);

  const onText = useCallback(
    (full: string) => {
      if (!full || full === sent.current) return;
      sent.current = full;
      void act('answer', { text: full });
    },
    [act],
  );
  const rec = useRecorder({ onText });

  const circle: Familiar[] = useMemo(
    () => (state ? Object.values(state.familiars).filter((f) => f.id !== me?.id) : []),
    [state, me],
  );

  if (!state || !me) {
    return (
      <div className="scr has-tabs">
        <div className="top pad">
          <p className="s mute">tuning in…</p>
        </div>
      </div>
    );
  }

  const match = isMatch(state);
  const cards = state.scout?.cards ?? [];
  const mine = cards.filter((c) => !dirFor(state, c.id, me.id));

  const sendOut = async () => {
    if (busy) return;
    setBusy(true);
    setPending(true);
    setStep(0);
    const brief = Object.values(state.familiars)
      .flatMap((f) => f.keywords)
      .slice(0, 8)
      .join(', ');
    try {
      await act('scout', { brief });
    } finally {
      setBusy(false);
      setPending(false);
    }
  };

  // ---- the one everyone swiped right ------------------------------------
  if (tab === 'out' && match) {
    return (
      <div className="scr has-tabs">
        <div className="top">
          <div className="nav">
            <span />
            <span className="pill mint chip on">everyone&rsquo;s in</span>
          </div>
          <div className="match" style={{ marginTop: 8 }}>
            <div className="burst" />
            {circle.slice(0, 3).map((f) => (
              <Creature key={f.id} traits={f.traits} size={92} glow />
            ))}
            <Creature traits={me.traits} size={110} glow />
          </div>
          <div className="pad" style={{ marginTop: 14, textAlign: 'center' }}>
            <p className="d1 h1">It&rsquo;s a plan.</p>
          </div>
          <div className="deck" style={{ height: 'auto', marginTop: 16 }}>
            <div className="dc deckcard" style={{ position: 'relative', transform: 'none' }}>
              <div
                className="cover"
                style={{
                  height: 110,
                  background: match.image
                    ? `center/cover no-repeat url(${JSON.stringify(match.image)})`
                    : 'linear-gradient(160deg,#FFB86B,#FF7AA2)',
                }}
              >
                <div className="badge">{match.cached ? 'cached' : match.kind === 'listed_event' ? 'listed' : 'self-organized'}</div>
              </div>
              <div className="in">
                <b>{match.title}</b>
                <div className="meta">
                  <span>{whenLabel(match.whenISO)}</span>
                  <span>{match.where}</span>
                  <span>{match.cost}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bottom" style={{ bottom: 118 }}>
          <a className="cta glow gold" href={icsFor(match)} download={`${match.id}.ics`}>
            Add to calendar
          </a>
          {match.source ? (
            <a className="cta glass ghost" href={match.source} target="_blank" rel="noreferrer">
              Open source
            </a>
          ) : null}
        </div>
        <Tabs active="casts" code={code} me={me} />
      </div>
    );
  }

  return (
    <div className="scr has-tabs">
      <div className="top">
        <div className="nav">
          <button
            type="button"
            className={tab === 'tonight' ? 'pill solid chip on' : 'pill chip'}
            onClick={() => setTab('tonight')}
          >
            tonight
          </button>
          <button type="button" className={tab === 'out' ? 'pill solid chip on' : 'pill chip'} onClick={() => setTab('out')}>
            out
          </button>
        </div>

        {tab === 'tonight' ? (
          state.cast ? (
            <>
              <div className="castcard" style={{ marginTop: 16 }}>
                <div className="notes" style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 20 }}>
                  {[9, 18, 13].map((h) => (
                    <i key={h} style={{ height: h, width: 6, borderRadius: 3, background: 'var(--gold)' }} />
                  ))}
                </div>
                <p className="q h1">{state.cast.question}</p>
                <p className="s mute" style={{ color: '#E6D9FF' }}>
                  {state.cast.hook}
                </p>
                <div className="from">
                  <Creature traits={me.traits} size={44} glow={false} />
                  {circle.slice(0, 3).map((f) => (
                    <Creature key={f.id} traits={f.traits} size={34} glow={false} />
                  ))}
                  <p className="s mute" style={{ color: '#E6D9FF' }}>
                    {Object.keys(state.cast.answers).length} answered
                  </p>
                </div>
              </div>

              <div className="pad" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="listen">
                  <button
                    className="ring"
                    type="button"
                    onClick={() => (rec.listening ? rec.stop() : rec.start())}
                    aria-label="Talk, I'm listening"
                    style={{ border: 0 }}
                  >
                    ●
                  </button>
                  <p className="s mute" style={{ color: 'var(--tx2)' }}>
                    {rec.supported ? (rec.listening ? `${me.name} is catching answers.` : `Talk, I'm listening`) : 'Type your answer below.'}
                  </p>
                  {rec.listening ? (
                    <div className="wave">
                      {Array.from({ length: 9 }, (_, i) => (
                        <i key={i} style={{ height: `${20 + Math.round(rec.level * 80)}%` }} />
                      ))}
                    </div>
                  ) : null}
                  {!rec.supported ? (
                    <textarea
                      className="glass"
                      rows={2}
                      placeholder="say it here"
                      style={{ width: '100%', background: 'var(--glass)', color: 'var(--tx)', borderRadius: 18, padding: 12 }}
                      onBlur={(e) => e.target.value.trim() && act('answer', { text: e.target.value.trim() })}
                    />
                  ) : null}
                </div>

                <div className="caught">
                  {Object.entries(state.cast.answers).map(([who, text]) => {
                    const f = state.familiars[who];
                    return (
                      <div className="c got" key={who}>
                        {f ? <Creature traits={f.traits} size={40} glow={false} /> : null}
                        <div>
                          <b>{text}</b>
                          <small>{f ? f.human.name : 'someone'}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="pad" style={{ marginTop: 30, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Creature traits={me.traits} size={140} glow />
              </div>
              <p className="s mute">Tonight&rsquo;s cast lands at 9.</p>
              <button
                className="cta glass ghost"
                type="button"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await act('castNow');
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                Cast now
              </button>
            </div>
          )
        ) : null}

        {tab === 'out' ? (
          !state.scout || pending ? (
            <div className="pad" style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Creature traits={me.traits} size={140} glow mood={pending ? 'talk' : 'idle'} />
              </div>
              <p className="d2 h2">{pending ? `${me.name} is out looking` : `${me.name} is home`}</p>
              <p className="s mute">{pending ? STEPS[step] : 'Send it out and it comes back with three things to do.'}</p>
              {pending ? (
                <div className="wave" style={{ height: 14 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              ) : (
                <button className="cta glow gold" type="button" onClick={sendOut} disabled={busy}>
                  Send {me.name} out
                </button>
              )}
            </div>
          ) : mine.length ? (
            <>
              <div className="pad" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Creature traits={me.traits} size={48} glow={false} />
                <p className="d3 h2">
                  {me.name} is back with {cards.length}
                </p>
              </div>
              <div className="pad">
                <Deck
                  cards={mine}
                  traits={me.traits}
                  onSwipe={(cardId, dir) => {
                    void act('swipe', { cardId, dir });
                  }}
                />
                <p className="s mute" style={{ textAlign: 'center', marginTop: 10 }}>
                  {cards.length - mine.length + 1} of {cards.length}
                </p>
              </div>
            </>
          ) : (
            <div className="pad" style={{ marginTop: 30, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p className="d2 h2">Waiting for the others</p>
              <div className="row2" style={{ justifyContent: 'center' }}>
                {circle.map((f) => {
                  const agreed = cards.some((c) => dirFor(state, c.id, f.id) === 'in' && dirFor(state, c.id, me.id) === 'in');
                  return (
                    <div key={f.id} style={{ textAlign: 'center' }}>
                      <Creature traits={f.traits} size={44} glow={false} />
                      <p className="s mute">{agreed ? '✓' : '···'}</p>
                    </div>
                  );
                })}
              </div>
              <p className="s mute">Nobody has to be the one who decides.</p>
            </div>
          )
        ) : null}
      </div>

      {tab === 'tonight' && state.cast ? (
        <div className="bottom" style={{ bottom: 118 }}>
          <button
            className="cta glass ghost"
            type="button"
            onClick={() => {
              rec.stop();
            }}
          >
            Done talking
          </button>
        </div>
      ) : null}

      <Tabs active="casts" code={code} me={me} />
    </div>
  );
}
