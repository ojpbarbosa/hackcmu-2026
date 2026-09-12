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
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`, `KV_REST_API_TOKEN`, which the Vercel marketplace install injects) | switches the store from memory to Upstash |
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

## Demo scripts (production URLs; swap the origin for the LAN URL when running on the laptop)

Every app takes `?room=CODE`. Open the stage view on the projector first, then the phones.
Query aids exist only for demos and screenshots; they are not user features.

### Cast · Multiplayer

1. Projector: `/cast/stage?room=BASEMENT`
2. Phones (3–4): `/cast?room=BASEMENT` → type a name → "Join the circle".
3. Presenter taps **Cast now** on any phone → every phone lands on the cast (buzz + tone if the
   join tap happened first), ring counts down from 1:30.
4. Everyone answers → the last answer unlocks the reveal on every phone (`/cast/tonight`).
5. **Schedule in 2 min** shows the unpredictable-time behaviour; the pond (`/cast/pond`) shows the
   seeded 14-day history; catch mode: tap "See the catch" after a reveal in catch mode, pull the line
   on 3 phones → "Caught · invite sent" → "Add to calendar" downloads an .ics.
6. Aids: `?as=Name&id=fixed` opens a phone as a fixed identity; the stage's "why this cast" lists the
   model's reasons and the ladder shows who answered.

### Familiars · Multiplayer (the bump)

1. Projector: `/familiars/stage?room=HACKCMU` (add `&demo=1` to fill a thin room with 40 authored villagers).
2. Phones: `/familiars?room=HACKCMU` → name, three answers, where you're sitting → **Hatch my familiar**.
3. Both phones: **Bump a phone to meet** → **Bump a phone** → allow motion (iOS asks once) → knock
   the phones together once, firmly. Threshold 14 m/s² above gravity; the on-screen bar shows the
   live reading and the threshold marker.
4. Both screens: the two orbs meet, four lines stream in, then the "you both" card with the other
   human's name and seat. **We talked** returns to the familiar.
5. `/familiars/night` writes the night from the graph; `/familiars/away` shows the closest person
   you never bumped; **Find them now** reveals their seat.
6. Fallback: "or key an address · XYZ is yours" pairs by typing the other phone's 3-character address.
7. Requirements: HTTPS (Vercel, or `cloudflared tunnel --url http://localhost:3000` in front of the
   laptop); on Vercel finish the Upstash step first or the two phones may land on different instances.
8. Aids: `?simulate=1` fakes a knock from the tap (`&auto=1` arms on load); `/familiars/dev?room=CODE&to=/familiars/me`
   seeds a room and adopts the first identity.

### Detour · Traveling (or Optimization)

1. Projector: `/detour/stage?room=OAK42` ("waiting for a phone to set out").
2. Phone: `/detour?room=OAK42&demo=1` → 45 min, end at Tepper School, mood "somewhere new" →
   **Start walking**. Without `demo=1` the phone uses real geolocation (HTTPS needed).
3. The replay walks the hidden route at 20× (about 100 s); the stage follows the walker and
   highlights each nudge as it is spent. A judge taps the map → the wall sheet → **Keep walking**.
4. Arrival routes to `/detour/done` with the route revealed, the story card and **Save the walk**
   (saved places count as "visited" next time).
5. Aids: `/detour/walk?room=OAK42&demo=1` plans a Gates → Tepper walk cold; `&speed=60` finishes in
   ~35 s; a second phone on `/detour/walk?room=OAK42` (no demo) spectates.
6. Known: `pnpm shots` cannot render the map (headless Brave without WebGL); the app degrades to a
   projection so fog, marker and cards still show. Real phones render tiles from OpenFreeMap (no key).

### Palate · Food

1. Projector: `/palate/stage?room=TABLE4`.
2. Phone A: `/palate?room=TABLE4` → name, five dishes you love, "never" allergens (pick sesame for
   the demo) → **Build my palate** → petal chart on `/palate/me` → **Point at a menu** → Bangkok Balcony.
3. The menu ranks with a reason per dish; the house special is grey with **Ask**; anything with
   sesame is blocked with "never".
4. Phones B and C join the same room and build palates; `/palate/table` shows "everyone will love",
   "splits the table", "off the table", and **Build the table's order · $**.
5. **Ask** → the chef card in Thai (Portuguese for Tasca Lisboa) → **They said no sesame** → the dish
   becomes scorable.
6. Aids: any palate route accepts `?as=<id>&name=<name>&tone=<1-4>` so one laptop can play three
   seats; "Paste a menu" parses free text (mock parser without a key).

## QA notes (Sat 05:00)

- Identity is stored per app (`hack.member.<app>`), so one phone can play all four apps without
  dragging a name across; each app asks for a name once.
- Cast: if a member locks their phone mid-cast, anyone who has answered sees **Reveal without
  <name>** once two answers are in. Late joiners never block a reveal.
- Palate's table page uses a class named `table`; it works because the kit's CSS is unlayered, but do
  not remove `col` from that element.
- Familiars "away" with zero shared keywords shows their keywords as outline chips; reads oddly.
- MapLibre logs missing-sprite warnings in devtools on Detour; cosmetic.

## Known gaps to say out loud if asked

- Model calls are attributed honestly: with no key the ladder says `mock`. Paste the IFM key to go live.
- On Vercel without Upstash, multi-phone rooms are unreliable (per-instance memory). Laptop LAN or Upstash.
- Detour's route lives in the room document (readable with devtools); it is hidden by design, not encryption.
- Camera OCR for menus and on-device small models are not built; copy says so.

## What the app agents own

| path | owner |
| --- | --- |
| `web/app/cast/**`, `web/src/lib/apps/cast.ts`, `web/src/lib/tasks/cast.ts`, `web/src/lib/mock/cast.*.ts` | cast |
| `web/app/familiars/**`, `.../apps/familiars.ts`, `.../tasks/familiars.ts`, `.../mock/familiars.*.ts` | familiars |
| `web/app/detour/**`, `.../apps/detour.ts`, `.../tasks/detour.ts`, `.../mock/detour.*.ts` | detour |
| `web/app/palate/**`, `.../apps/palate.ts`, `.../tasks/palate.ts`, `.../mock/palate.*.ts` | palate |
| everything else in `web/src/ui`, `web/src/lib`, `web/src/hooks`, `web/app/api` | core |
