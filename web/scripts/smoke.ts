/* End-to-end smoke test. Run against a dev server or a deployment:
 *   pnpm smoke
 *   SMOKE_URL=https://hackcmu-2026.vercel.app pnpm smoke
 * Every check prints one line; the process exits non-zero if any fails. */

const BASE = (process.env.SMOKE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
}

async function json<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body: body as T };
}

type Health = { ok: boolean; provider: string; model: string; store: string; rooms: number };
type RoomDoc = { code: string; version: number; members: Record<string, unknown> };
type ActRes = { doc: RoomDoc; serverNow: number };

async function main() {
  console.log(`smoke: ${BASE}`);

  const health = await json<Health>('/health');
  check('GET /health', health.status === 200 && health.body?.ok === true,
    health.status === 200 ? `provider=${health.body.provider} store=${health.body.store} rooms=${health.body.rooms}` : `status=${health.status}`);

  const created = await json<RoomDoc>('/api/rooms', { method: 'POST', body: JSON.stringify({ app: 'cast' }) });
  const code = created.body?.code;
  check('POST /api/rooms creates a cast room', created.status === 200 && !!code && created.body.version === 1, `code=${code}`);
  if (!code) {
    console.log('cannot continue without a room');
    process.exit(1);
  }

  const act = (name: string, memberId: string, payload?: unknown) =>
    json<ActRes>(`/api/rooms/cast/${code}/act`, { method: 'POST', body: JSON.stringify({ name, memberId, payload }) });

  const j1 = await act('join', 'smoke-a', { id: 'smoke-a', name: 'Maya', tone: 1 });
  const j2 = await act('join', 'smoke-b', { id: 'smoke-b', name: 'Sam', tone: 2 });
  check('two members join', j2.status === 200 && Object.keys(j2.body.doc.members).length === 2,
    `version ${j1.body?.doc?.version} -> ${j2.body?.doc?.version}`);

  const before = j2.body.doc.version;
  const acted = await act('noop', 'smoke-a');
  check('act increments the version', acted.status === 200 && acted.body.doc.version === before + 1,
    `${before} -> ${acted.body?.doc?.version}`);

  const v = acted.body.doc.version;
  const [g1, g2] = await Promise.all([
    json<{ doc: RoomDoc }>(`/api/rooms/cast/${code}`),
    json<{ doc: RoomDoc }>(`/api/rooms/cast/${code}`),
  ]);
  check('two readers see the same version', g1.body?.doc?.version === v && g2.body?.doc?.version === v, `v=${v}`);

  const notModified = await fetch(`${BASE}/api/rooms/cast/${code}?v=${v}`);
  check('GET with a current ?v= is 304', notModified.status === 304, `status=${notModified.status}`);

  const llm = await json<{ data: { prompt?: string }; meta: { provider: string; model: string } }>(
    '/api/llm/cast.prompt',
    { method: 'POST', body: JSON.stringify({ app: 'cast', code, input: { members: [], history: [], mode: 'fishing' } }) },
  );
  check('POST /api/llm/cast.prompt returns a prompt', llm.status === 200 && typeof llm.body?.data?.prompt === 'string',
    llm.body?.meta ? `${llm.body.meta.provider} · ${llm.body.meta.model}` : `status=${llm.status}`);

  const events = await json<unknown[]>(`/api/rooms/cast/${code}/events`);
  check('the call shows up in the room event log', events.status === 200 && Array.isArray(events.body) && events.body.length >= 1,
    `${Array.isArray(events.body) ? events.body.length : 0} events`);

  const t = Date.now();
  const bumpA = await json<{ bumpId: string; matched?: unknown }>('/api/bump', {
    method: 'POST',
    body: JSON.stringify({ app: 'cast', code, memberId: 'smoke-a', at: t, magnitude: 20 }),
  });
  const bumpB = await json<{ bumpId: string; matched?: { withMemberId: string; pairId: string } }>('/api/bump', {
    method: 'POST',
    body: JSON.stringify({ app: 'cast', code, memberId: 'smoke-b', at: t + 200, magnitude: 22 }),
  });
  check('two bumps 200 ms apart pair', bumpB.status === 200 && bumpB.body?.matched?.withMemberId === 'smoke-a',
    bumpB.body?.matched?.pairId ?? 'no match');

  const status = await json<{ matched?: { pairId: string } }>(`/api/bump?bumpId=${bumpA.body.bumpId}`);
  check('the first phone learns about the pair', status.body?.matched?.pairId === bumpB.body?.matched?.pairId);

  for (const route of ['/', '/cast', '/familiars', '/detour', '/palate', '/cast/stage']) {
    const res = await fetch(BASE + route);
    check(`GET ${route}`, res.ok, `status=${res.status}`);
  }

  console.log(failures === 0 ? 'all checks passed' : `${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('smoke crashed:', e);
  process.exit(1);
});
