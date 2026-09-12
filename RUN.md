# Run book — HackCMU 2026

Four mobile-web apps (cast, familiars, detour, palate) on one Next.js app in `web/`,
sharing a UI kit, a polling room layer, a model layer with visible attribution, and a
bump-pairing endpoint.

- **Production:** https://hackcmu-2026.vercel.app
- **Launcher:** https://hackcmu-2026.vercel.app/ (create a room, show the QR, open the stage view)
- **Health:** https://hackcmu-2026.vercel.app/health → `{ok, provider, model, store, rooms}`
- **Visual contract:** `docs/mockups/index.html` — open it before touching any UI.
- **Specs:** `docs/superpowers/specs/`, plan: `docs/superpowers/plans/2026-09-12-core.md`.

## Local dev

```bash
cd web
pnpm install
pnpm dev            # http://localhost:3000
```

Checks, all of which must pass before every commit:

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # next lint
pnpm test           # vitest run
pnpm smoke          # end-to-end against localhost:3000
pnpm shots          # screenshots of / /cast /familiars /detour /palate into web/.shots
```

`pnpm shots /any/route` shoots specific routes. It drives Brave over the DevTools
protocol because headless Chromium clamps `--window-size` to 500 px wide on macOS;
`SHOTS_W`/`SHOTS_H` change the viewport (e.g. `SHOTS_W=1280 SHOTS_H=720` for a stage
view), `SHOTS_FULL=1` captures the whole page, `SHOTS_URL` points it at a deployment.

`SMOKE_URL=https://hackcmu-2026.vercel.app pnpm smoke` runs the same checks against production.

## Environment

Nothing is required. With no variables set, `LLM_PROVIDER` is `mock`: every task returns
deterministic authored content and every screen works. Copy `web/.env.example` to
`web/.env.local` to change that.

| variable | meaning |
| --- | --- |
| `LLM_PROVIDER` | `mock` (default) \| `ifm` \| `compatible` |
| `IFM_API_KEY` | key for `https://api.ifm.ai/v1/chat/completions`, model `IFM/K2-Horizon-375B-A23B` |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | any OpenAI-compatible endpoint |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | switches the store from memory to Upstash |
| `NEXT_PUBLIC_BASE_URL` | the URL baked into launcher QR codes |

### Turning the live model on

Locally, put the key in `web/.env.local`:

```
LLM_PROVIDER=ifm
IFM_API_KEY=sk-...
```

On Vercel:

```bash
cd web
printf 'sk-...' | vercel env add IFM_API_KEY production
printf 'ifm'    | vercel env add LLM_PROVIDER production
vercel --prod --yes
```

`/health` and the launcher badge then read `ifm`, and the model ladder on every stage
view shows `IFM/K2-Horizon-375B-A23B`. **Attribution is never faked.** If a live call
fails twice it falls back to mock content, and that event is flagged `fallback` — the
ladder says `mock` and shows a fallback badge. If you see `mock` on the ladder, a mock
answered.

## Storage — read this before the demo

`web/src/lib/store.ts` has two backends:

- **memory** (default): a module-level `Map`. Fine for one laptop. On Vercel each
  serverless instance keeps its own copy, so two phones can land on different instances
  and not see each other. It also empties when an instance is recycled.
- **upstash**: used automatically as soon as `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` exist. No code change.

**The production deployment is currently on `memory`.** `vercel integration add
upstash/upstash-kv` stops at `integration_terms_acceptance_required`: the marketplace
terms have to be accepted in a browser once. To finish it (about two minutes):

1. Open https://vercel.com/joaobarbosa/~/integrations/accept-terms/upstash?source=cli and accept.
2. `cd web && vercel integration add upstash/upstash-kv` (free plan, any region — `us-east-1` is closest to `iad1`).
3. Link the store to the `hackcmu-2026` project when asked; Vercel injects
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as project env vars.
4. `vercel --prod --yes`, then check `curl https://hackcmu-2026.vercel.app/health` reads
   `"store":"upstash"`.

Alternative if the marketplace fights back: create a free database directly at
https://console.upstash.com, copy the REST URL and token, and

```bash
cd web
printf '<url>'   | vercel env add UPSTASH_REDIS_REST_URL production
printf '<token>' | vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel --prod --yes
```

Until then, run multi-phone demos against one laptop on the venue Wi-Fi
(`pnpm dev`, then the LAN URL Next prints) where the memory store is genuinely shared.

## How rooms and events are stored

- Room: `room:<app>:<CODE>` → `{app, code, version, createdAt, members, state}`, TTL 12 h.
- Events: `events:<app>:<CODE>` and `events:all`, newest first, capped at 200.
- Pending bumps: `bumps:<app>:<CODE>`, TTL 10 s. Bump results: `bump:<bumpId>`, TTL 2 min.

Clients read with `GET /api/rooms/{app}/{code}?v=N` every 800 ms (2 s when the tab is
hidden); an unchanged room answers `304`. Writes go through
`POST /api/rooms/{app}/{code}/act`, which runs the app's reducer on the server, bumps
`version`, and echoes the new document back to the caller.

### Reset

- Local: restart `pnpm dev` — the memory store goes with it.
- Upstash: `redis-cli --tls -u <url> FLUSHDB`, or delete the keys from the Upstash console.
- Rooms expire on their own after 12 hours.

## Morning checklist

1. `cd web && pnpm install && pnpm typecheck && pnpm lint && pnpm test` — all green.
2. `pnpm dev`, then `pnpm smoke` — 16 checks, all `ok`.
3. `SMOKE_URL=https://hackcmu-2026.vercel.app pnpm smoke` — same 16 checks against production.
4. `curl https://hackcmu-2026.vercel.app/health` — check `provider` and `store` read what you expect.
5. Decide on the store: if the demo uses more than one phone against Vercel, finish the
   Upstash step above first.
6. Decide on the model: leave `mock` for a guaranteed demo, or add `IFM_API_KEY` and flip
   `LLM_PROVIDER=ifm` for a live one. Check the ladder on a stage view afterwards.
7. Open the launcher on the projector, create the four rooms, and leave the QR codes up.
8. `pnpm shots` and look at the five PNGs in `web/.shots` — no horizontal scroll, no overlap.

## What the app agents own

| path | owner |
| --- | --- |
| `web/app/cast/**`, `web/src/lib/apps/cast.ts`, `web/src/lib/tasks/cast.ts`, `web/src/lib/mock/cast.*.ts` | cast |
| `web/app/familiars/**`, `.../apps/familiars.ts`, `.../tasks/familiars.ts`, `.../mock/familiars.*.ts` | familiars |
| `web/app/detour/**`, `.../apps/detour.ts`, `.../tasks/detour.ts`, `.../mock/detour.*.ts` | detour |
| `web/app/palate/**`, `.../apps/palate.ts`, `.../tasks/palate.ts`, `.../mock/palate.*.ts` | palate |
| everything else in `web/src/ui`, `web/src/lib`, `web/src/hooks`, `web/app/api` | core |
