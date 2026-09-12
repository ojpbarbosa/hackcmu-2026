'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Creature from './_components/Creature';
import { useFamiliars, withRoom } from './_components/useFamiliars';
import { useRecorder } from './_components/useRecorder';
import { traitsFor } from '@/lib/familiars/creature';

/* the four things the egg wants to hear, in order */
const CARDS = [
  {
    key: 'who',
    tint: '#C7A8FF',
    label: 'who you are',
    example: '"I\'m João, he/him"',
    ask: 'who are you?',
    re: /\b(i'?m|i am|my name is|call me)\s+[a-z]/i,
  },
  {
    key: 'make',
    tint: '#FFC85C',
    label: 'what you make',
    example: '"I build synths"',
    ask: 'what do you make?',
    re: /\b(build|make|making|write|writing|code|design|study|studying|research|paint|cook|play)\b/i,
  },
  {
    key: 'from',
    tint: '#7CF0C4',
    label: "where you're from",
    example: '"Recife"',
    ask: 'where are you from?',
    re: /\b(from|grew up|born|moved|raised)\b/i,
  },
  {
    key: 'lately',
    tint: '#FF7AA2',
    label: 'lately',
    example: '"can\'t stop…"',
    ask: "what can't you stop doing lately?",
    re: /\b(lately|recently|can'?t stop|these days|obsessed|every night|all week)\b/i,
  },
] as const;

const TOK_POS: React.CSSProperties[] = [
  { left: 18, top: 26 },
  { left: 10, top: 70 },
  { right: 14, top: 58 },
  { left: 34, bottom: 14 },
  { right: 36, bottom: 26 },
  { left: 6, bottom: 60 },
];

const STOP = new Set([
  'about',
  'after',
  'there',
  'their',
  'which',
  'would',
  'could',
  'should',
  'these',
  'those',
  'where',
  'thing',
  'things',
  'really',
  'because',
  'people',
  'still',
  'every',
  'being',
  'doing',
  'stuff',
]);

function Icon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.6-3.2 2.9-4.8 5.5-4.8S14 15.8 14.5 19" />
        <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.6c2 .7 3.2 2.2 3.5 4.4" />
      </>
    ),
    wrench: (
      <path d="M20 5.5a4.6 4.6 0 0 1-6 6L6.6 19a2.2 2.2 0 0 1-3.1-3.1L11 8.4a4.6 4.6 0 0 1 6-6l-3 3 2.6 2.6z" />
    ),
    pin: (
      <>
        <path d="M12 21s6.5-6.2 6.5-11a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21z" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
    heart: <path d="M12 20s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 3C19.5 15.3 12 20 12 20z" />,
    check: <path d="M5 12.5 10 17.5 19 7" />,
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
      </>
    ),
    vol: (
      <>
        <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
        <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.4a8 8 0 0 1 0 11.2" />
      </>
    ),
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p[name]}
    </svg>
  );
}

function tokensOf(transcript: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of transcript.split(/[^A-Za-z'·/-]+/)) {
    const w = raw.trim();
    if (w.length <= 4) continue;
    const low = w.toLowerCase();
    if (STOP.has(low) || seen.has(low)) continue;
    seen.add(low);
    out.push(w);
  }
  return out.slice(-6);
}

function humanOf(transcript: string): string | null {
  const m = transcript.match(/\b(?:i'?m|i am|my name is|call me)\s+([A-Za-zÀ-ÿ'-]+)/i);
  if (!m) return null;
  const name = m[1][0].toUpperCase() + m[1].slice(1);
  const p = transcript.match(/\b(he\/him|she\/her|they\/them|he\s*\/\s*him|she\s*\/\s*her|they\s*\/\s*them)\b/i);
  return p ? `${name} · ${p[1].replace(/\s+/g, '').toLowerCase()}` : name;
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function HatchPage() {
  const router = useRouter();
  const { code, member, me, act, setName } = useFamiliars();
  const [transcript, setTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  const sentRef = useRef(false);
  const namedRef = useRef(false);

  const onText = useCallback((full: string) => setTranscript(full), []);
  const { start, stop, listening, level, supported, provider } = useRecorder({ onText, chunkMs: 4000 });
  const typed = !supported || provider === 'none';

  // elapsed clock while listening
  useEffect(() => {
    if (!listening) return;
    if (startedRef.current === null) startedRef.current = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - (startedRef.current ?? Date.now())), 250);
    return () => clearInterval(t);
  }, [listening]);

  const covered = useMemo(() => CARDS.map((c) => c.re.test(transcript)), [transcript]);
  const whoOn = covered[0];
  const othersOn = covered.slice(1).filter(Boolean).length;
  const nextAsk = CARDS[covered.findIndex((c) => !c) === -1 ? 0 : covered.findIndex((c) => !c)].ask;
  const [sent, setSent] = useState(false);
  const canDone = transcript.trim().length >= 12 && !sent;

  const hatch = useCallback(() => {
    if (sentRef.current) return;
    const t = transcript.trim();
    if (t.length < 12) return;
    sentRef.current = true;
    setSent(true);
    stop();
    void act('hatch', { transcript: t });
  }, [act, transcript]);

  // early hatch: enough said, keep talking while the egg cracks
  useEffect(() => {
    if (sentRef.current || me) return;
    if (!whoOn || othersOn < 1) return;
    if (startedRef.current === null && !typed) return;
    const talked = startedRef.current ? Date.now() - startedRef.current : 0;
    if (!typed && talked < 5000) return;
    if (transcript.trim().length < 12) return;
    hatch();
  }, [transcript, whoOn, othersOn, typed, me, hatch]);

  const tokens = useMemo(() => {
    const list = tokensOf(transcript);
    const who = humanOf(transcript);
    return (who ? [who, ...list] : list).slice(0, 6);
  }, [transcript]);

  /* ------------------------------------------------------------------ hatched */
  const [talkMood, setTalkMood] = useState(true);
  const [canHear, setCanHear] = useState(true);

  useEffect(() => {
    if (!me) return;
    stop();
    const t = setTimeout(() => setTalkMood(false), 2000);
    return () => clearTimeout(t);
  }, [me, stop]);

  useEffect(() => {
    if (!me || namedRef.current) return;
    if (me.human?.name && me.human.name !== member?.name) {
      namedRef.current = true;
      setName(me.human.name);
    }
  }, [me, member, setName]);


  const hear = useCallback(async () => {
    if (!me) return;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: me.greeting, voice: me.voice }),
      });
      if (res.status === 204 || !res.ok) {
        setCanHear(false);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      setCanHear(false);
    }
  }, [me]);

  if (me) {
    const traits = me.traits;
    return (
      <div className="scr flow">
        <div className="top">
          <div className="pad" style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', textAlign: 'center' }}>
            <Creature traits={traits} size={220} mood={talkMood ? 'talk' : 'idle'} glow />
            <p className="d1">{me.name}</p>
            <p className="body mute">{me.greeting}</p>
            <div className="row2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              {me.keywords.slice(0, 4).map((k) => (
                <span className="chip" key={k}>
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="bottom">
          {canHear && (
            <button className="cta gold" type="button" onClick={() => void hear()}>
              <Icon name="vol" />
              Hear {me.name}
            </button>
          )}
          <button className="cta" type="button" onClick={() => router.push(withRoom('/familiars/web', code))}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ talking */
  return (
    <div className="scr hatch flow">
      <div className="top">
        <div className="nav">
          <span className="pill">hatch</span>
          {listening && (
            <span className="pill">
              <span
                style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 10px var(--gold)' }}
              />
              listening
            </span>
          )}
        </div>
        <div className="pad" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="egg" style={{ position: 'relative' }}>
            <Creature egg traits={traitsFor(member?.id ?? 'egg')} size={150} glow />
            {tokens.slice(-TOK_POS.length).map((t, i) => (
              <span className="tok g" key={`${t}-${i}`} style={TOK_POS[i % TOK_POS.length]}>
                {t}
              </span>
            ))}
          </div>
          <div className="ask">
            <p className="d2">{nextAsk}</p>
          </div>
          <div className="say">
            {CARDS.map((c, i) => (
              <div key={c.key} className={covered[i] ? 'on' : undefined} style={{ '--tint': c.tint } as React.CSSProperties}>
                <div className="ic">
                  <Icon name={c.key === 'who' ? 'users' : c.key === 'make' ? 'wrench' : c.key === 'from' ? 'pin' : 'heart'} />
                </div>
                {c.label}
                <em>{c.example}</em>
                <span className={covered[i] ? 'got' : 'got dim'}>
                  <Icon name={covered[i] ? 'check' : 'mic'} />
                </span>
              </div>
            ))}
          </div>
          {typed && (
            <textarea
              className="glass"
              style={{ width: '100%', minHeight: 90, borderRadius: 18, padding: 12, color: 'inherit', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
              placeholder="Say it here: who you are, what you make, where you're from, lately…"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          )}
        </div>
      </div>
      <div className="bottom" style={{ alignItems: 'center', gap: 14 }}>
        <button className="cta ghost" type="button" disabled={!canDone} onClick={hatch} style={{ alignSelf: 'stretch', opacity: canDone || sent ? 1 : 0.45 }}>
          {sent ? 'Hatching…' : 'Done'}
        </button>
        {!typed && (
          <>
            {listening ? (
              <div className="wave">
                {Array.from({ length: 9 }, (_, i) => (
                  <i key={i} style={{ height: `${6 + level * 14 + (i % 3) * 3}px` }} />
                ))}
              </div>
            ) : (
              <p className="lbl" style={{ height: 20 }}>tap to talk</p>
            )}
            <button
              className={listening ? 'mic live' : 'mic idle'}
              type="button"
              aria-label={listening ? 'stop' : 'start'}
              onClick={() => (listening ? stop() : void start())}
            >
              <Icon name="mic" />
            </button>
            <p className="mute">{elapsed ? mmss(elapsed) : ' '}</p>
          </>
        )}
      </div>
    </div>
  );
}
