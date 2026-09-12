'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Creature } from '../_components/Creature';
import { Tabs } from '../_components/Tabs';
import { IncomingCast } from '../_components/IncomingCast';
import { useFamiliars, withRoom } from '../_components/useFamiliars';
import { metIds, webGroups } from '@/lib/apps/familiars';

export default function YouPage() {
  const router = useRouter();
  const { code, state, me, act } = useFamiliars();
  const [canHear, setCanHear] = useState(true);
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  const stats = useMemo(() => {
    if (!state || !me) return { met: 0, pairs: 0, groups: 0 };
    return {
      met: metIds(state, me.id).size,
      pairs: state.pairs.filter((p) => p.a === me.id || p.b === me.id).length,
      groups: webGroups(state, me.id).length,
    };
  }, [state, me]);

  if (!state || !me) {
    return (
      <div className="scr has-tabs">
        <div className="top pad">
          <p className="s mute">one moment…</p>
        </div>
      </div>
    );
  }

  const recap = state.recaps[me.id];

  const hear = async () => {
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: me.greeting, voice: me.voice }),
      });
      if (r.status === 204 || !r.ok) {
        setCanHear(false);
        return;
      }
      const blob = await r.blob();
      const el = audio.current ?? new Audio();
      audio.current = el;
      el.src = URL.createObjectURL(blob);
      await el.play();
    } catch {
      setCanHear(false);
    }
  };

  const share = async () => {
    const text = recap ? recap.cards.map((c) => `${c.label}: ${c.big ?? ''} ${c.text}`.trim()).join('\n') : '';
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    if (nav.share) await nav.share({ title: `${me.name}'s recap`, text }).catch(() => {});
  };

  return (
    <div className="scr has-tabs you flow">
      <div className="top">
        <div className="pad" style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="hero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Creature traits={me.traits} size={160} glow />
            <p className="d1 h1">{me.name}</p>
            <p className="t body" style={{ textAlign: 'center' }}>
              {me.greeting}
            </p>
            {canHear ? (
              <button className="pill chip" type="button" onClick={hear}>
                Hear {me.name}
              </button>
            ) : null}
          </div>

          <div className="stats">
            <div>
              <b>{stats.met}</b>
              <span>met</span>
            </div>
            <div>
              <b>{stats.pairs}</b>
              <span>pairs</span>
            </div>
            <div>
              <b>{stats.groups}</b>
              <span>groups</span>
            </div>
          </div>

          <div className="traits">
            {me.keywords.map((k) => (
              <span className="chip" key={k}>
                <i />
                {k}
              </span>
            ))}
          </div>

          <section id="recap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recap ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    margin: '0 -22px',
                    padding: '0 22px',
                  }}
                >
                  {recap.cards.map((c, i) => (
                    <div
                      className="recapcard"
                      key={`${c.label}-${i}`}
                      style={{ flex: '0 0 280px', scrollSnapAlign: 'center', margin: 0 }}
                    >
                      <div style={{ position: 'absolute', right: 14, top: 14 }}>
                        <Creature traits={me.traits} size={72} glow={false} />
                      </div>
                      <p className="lb lbl" style={{ color: '#C9C6E6' }}>
                        {c.label}
                      </p>
                      {c.big ? <div className="big">{c.big}</div> : null}
                      <div className="line">
                        <p>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pager">
                  {recap.cards.map((c, i) => (
                    <i key={`${c.label}-dot-${i}`} className={i === 0 ? 'on' : undefined} />
                  ))}
                </div>
                <p className="s mute" style={{ textAlign: 'center' }}>
                  1 of {recap.cards.length}
                </p>
                <button className="cta glass ghost" type="button" onClick={share}>
                  Share the recap
                </button>
              </>
            ) : (
              <button
                className="cta glow gold"
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await act('recap');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? `${me.name} is writing it…` : "Tonight's recap"}
              </button>
            )}
          </section>
        </div>
      </div>

      <div className="pad" style={{ marginTop: 26, marginBottom: 8 }}>
        <button
          className="cta ghost"
          type="button"
          style={{ color: 'var(--rose)' }}
          onClick={async () => {
            if (!window.confirm(`Delete ${me.name} and start over?`)) return;
            try {
              await act('forget');
            } catch {
              /* leaving anyway */
            }
            try {
              window.localStorage.removeItem('hack.member.familiars');
              window.localStorage.removeItem('familiars.salt');
            } catch {
              /* private mode */
            }
            window.location.href = withRoom('/familiars', code);
          }}
        >
          Delete {me.name} and start over
        </button>
      </div>
      <IncomingCast state={state} me={me} act={act} code={code} />
      <Tabs active="you" code={code} me={me} />
    </div>
  );
}
