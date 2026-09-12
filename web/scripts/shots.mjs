/* Render routes with headless Brave at an exact 393x852 mobile viewport.
   Headless Chromium clamps --window-size to ~500px wide on macOS, so we drive it
   over the DevTools protocol and use Emulation.setDeviceMetricsOverride instead. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRAVE = process.env.BRAVE || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const BASE = process.env.SHOTS_URL || 'http://localhost:3000';
const OUT = resolve(root, '.shots');
const PORT = Number(process.env.SHOTS_PORT || 9333);
const W = Number(process.env.SHOTS_W || 393);
const H = Number(process.env.SHOTS_H || 852);
const FULL = process.env.SHOTS_FULL === '1';

const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/cast', '/familiars', '/detour', '/palate'];
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nameOf = (r) => (r.replace(/[/?=&#]/g, '_').replace(/^_/, '') || 'home');

const brave = spawn(BRAVE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=' + resolve(OUT, '.profile'), 'about:blank',
], { stdio: 'ignore' });

let ws;
const fail = (m) => { console.error(m); brave.kill(); process.exit(1); };

async function targetUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  fail('browser did not expose a devtools endpoint');
}

let nextId = 1;
const pending = new Map();
function send(method, params = {}, sessionId) {
  const id = nextId++;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

const loaded = new Set();

try {
  ws = new WebSocket(await targetUrl());
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else if (m.method === 'Page.loadEventFired' && m.sessionId) {
      loaded.add(m.sessionId);
    }
  };

  for (const route of routes) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride',
      { width: W, height: H, deviceScaleFactor: 2, mobile: true }, sessionId);
    loaded.delete(sessionId);
    await send('Page.navigate', { url: BASE + route }, sessionId);
    for (let i = 0; i < 80 && !loaded.has(sessionId); i++) await sleep(100);
    await sleep(1400); // fonts, hydration, first poll
    const shot = await send('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: FULL, ...(FULL ? {} : { clip: { x: 0, y: 0, width: W, height: H, scale: 2 } }) },
      sessionId);
    const file = resolve(OUT, nameOf(route) + '.png');
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`${file}  <-  ${BASE}${route}`);
    await send('Target.closeTarget', { targetId });
  }
} catch (e) {
  console.error(String(e));
  brave.kill();
  process.exit(1);
}
brave.kill();
process.exit(0);
