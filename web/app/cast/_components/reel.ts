/** The sound a cast makes when it lands: a 400 ms two-tone reel plus a buzz.
 *  iOS only allows an AudioContext created inside a user gesture, so `arm()`
 *  runs on the first CTA tap and the tone is played from the armed context. */

let ctx: AudioContext | null = null;

type Win = Window & { webkitAudioContext?: typeof AudioContext };

export function arm(): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as Win).webkitAudioContext;
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(at: number, hz: number, ms: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(hz, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + ms / 1000 + 0.02);
}

/** Two notes, a fifth apart — the reel paying out. */
export function reel(): void {
  try {
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + 0.01;
    tone(t, 587.33, 180);
    tone(t + 0.18, 880, 220);
  } catch {
    /* a silent demo is still a demo */
  }
}

export function buzz(): void {
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    /* desktop */
  }
}

/** Everything a landing cast does to a phone. */
export function land(): void {
  buzz();
  reel();
}
