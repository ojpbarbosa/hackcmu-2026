'use client';
import { useState } from 'react';
import { useFamiliars } from '../_components/useFamiliars';

const DEMO_TRANSCRIPT =
  "I'm Sam, they/them. I build modular synths at 3 am and I'm from Recife. Lately I can't stop soldering.";

export default function DevPage() {
  const { code, member, state, act, connected, events } = useFamiliars();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async (label: string, name: string, payload?: unknown) => {
    if (busy) return;
    setBusy(true);
    setLog((l) => [`${label}…`, ...l]);
    try {
      await act(name, payload);
      setLog((l) => [`${label} ok`, ...l]);
    } catch (e) {
      setLog((l) => [`${label} failed: ${e instanceof Error ? e.message : String(e)}`, ...l]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scr" style={{ padding: '28px 22px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
      <p className="lb lbl">dev</p>
      <p className="d2 h2">room {code ?? '…'}</p>
      <p className="s mute">
        {connected ? 'connected' : 'offline'} · member {member?.id ?? 'none'} · {Object.keys(state?.familiars ?? {}).length} familiars
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="cta glow gold" type="button" disabled={busy} onClick={() => run('hatch as demo', 'hatch', { transcript: DEMO_TRANSCRIPT })}>
          Hatch as demo
        </button>
        <button className="cta glass ghost" type="button" disabled={busy} onClick={() => run('seedDemo(12)', 'seedDemo', { n: 12 })}>
          seedDemo(12)
        </button>
        <button className="cta glass ghost" type="button" disabled={busy} onClick={() => run('castNow', 'castNow')}>
          castNow
        </button>
        <button
          className="cta glass ghost"
          type="button"
          disabled={busy}
          onClick={() =>
            run('scout', 'scout', {
              brief: Object.values(state?.familiars ?? {})
                .flatMap((f) => f.keywords)
                .slice(0, 8)
                .join(', '),
            })
          }
        >
          scout
        </button>
        <button className="cta glass ghost" type="button" disabled={busy} onClick={() => run('recap', 'recap')}>
          recap
        </button>
      </div>

      <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p className="lb lbl">last 10 model calls</p>
        {events.slice(-10).reverse().map((e, i) => (
          <p className="s mute" key={`${e.ts}-${i}`}>
            {e.task} · {e.model} · {e.latencyMs} ms{e.ok ? '' : ' · error'}
            {e.fallback ? ' · fallback' : ''}
          </p>
        ))}
        {events.length === 0 ? <p className="s mute">nothing yet</p> : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {log.map((l, i) => (
          <p className="s mute" key={`${l}-${i}`}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}
