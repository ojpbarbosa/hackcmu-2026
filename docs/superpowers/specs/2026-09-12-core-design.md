# Core platform spec — shared foundation for Cast, Familiars, Detour, Palate

Date: 2026-09-12. Status: approved for overnight build (v1, demo at 09:00 Saturday; submission 16:00).

## Goal

One repo, one server, four mobile-web apps that share a UI kit, a realtime room layer, a model layer with visible attribution, and a launcher with QR codes. Cheap v1: everything needed to run the four demo scripts on real phones over the venue Wi-Fi, nothing more.

## Stack (decided)

- pnpm workspace at `build/`. Node 25, TypeScript, React 19, Vite 6, Tailwind v4 (via `@tailwindcss/vite`).
- `packages/ui`: design tokens (CSS variables), fonts (Bricolage Grotesque via Google Fonts link; system stack for body), and React components matching `mockups/index.html`: `Screen`, `TopNav`, `Pill`, `Chip`, `Card`, `CTA` (ink / gradient / ghost), `Avatar`, `AvatarStack`, `Dock`, `Sheet`, `Stat`, `Label`, `H1/H2/H3`, `Bubble`, `Icon` (inline SVG sprite from the mockup), `ModelLadder` (attribution strip). Each app sets its accent via CSS variables (`--g1 --g2 --g3 --acc`).
- `packages/shared`: TypeScript types for room messages and LLM task contracts; `useRoom()` WebSocket hook; `api()` fetch helper; `llmTasks` schema hints shared by client and server.
- `server`: Express + `ws`. Serves built apps at `/cast`, `/familiars`, `/detour`, `/palate`, launcher at `/`, WebSocket at `/ws`. In-memory room state persisted as JSON under `server/data/`. LLM provider layer. Observability event log.
- `apps/<name>`: Vite React apps with `base: '/<name>/'`, routes via `react-router` (`/`, screens, `/stage`).
- Scripts: `pnpm dev` (server with vite middleware for all apps, one port), `pnpm build`, `pnpm start`. Port 8787. Print the LAN URL and QR at startup.

## Rooms (realtime)

- Room = `{ code: string(5, A-Z2-9), app: 'cast'|'familiars'|'detour'|'palate', createdAt, state: any }`.
- Client joins with `{type:'join', code, app, member:{id, name, avatar}}`; server replies `{type:'state', state}` and broadcasts `state` on every change. Actions: `{type:'action', code, name, payload}` → app-specific reducer on the server → new state → broadcast. Server timestamps drive countdowns (`serverNow` in every state message).
- Member identity persists in `localStorage` (`member.id`, `name`). Reconnect re-joins.
- Persistence: debounce-write `server/data/<app>-<code>.json`; load on boot.

## Model layer

- `server/llm.ts` exposes `llm.json<T>(task: TaskName, input: object, opts?) => Promise<{data: T, meta}>`.
- Providers by env: `LLM_PROVIDER=ifm|compatible|mock` (default `mock` when no key).
  - `ifm`: POST `https://api.ifm.ai/v1/chat/completions`, model `IFM/K2-Horizon-375B-A23B`, `response_format: {type:'json_object'}`, `reasoning_effort` per task (low for bulk, medium for narration), temperature 0.3, capture `reasoning_content` when returned.
  - `compatible`: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (same request shape).
  - `mock`: deterministic per task, seeded by input hash, content authored to be plausible for the demo scripts.
- Every call emits an observability event `{ts, app, room, task, provider, model, latencyMs, tokensIn, tokensOut, reasoningExcerpt, ok}` to `server/data/events.jsonl` and to WebSocket subscribers of `{type:'observe'}`. Stage views render these as the model ladder. Attribution is never faked: the ladder shows the provider that actually answered.
- Prompts live in `server/tasks/<app>.ts` with a JSON shape per task (documented in each app spec). Prompt outputs are validated with `zod`; on validation failure retry once, then fall back to mock for that call (flagged in the event).

## Launcher (`/`)

Cards for the four apps, each with: create room button, QR for the phone URL (`http://<lan-ip>:8787/<app>/?room=CODE`), link to the stage view (`/<app>/stage?room=CODE`), and the current LLM provider badge. Also a `/health` JSON endpoint.

## Non-goals (v1)

Auth, accounts, push notifications, native builds, dark mode, i18n beyond the strings in the demo scripts, tests beyond smoke checks, deployment beyond the laptop on LAN (optional `cloudflared` tunnel documented in RUN.md).

## Acceptance

- `pnpm i && pnpm build && pnpm start` serves all four apps and the launcher; `/health` returns provider and room counts.
- Two browsers joining the same room see each other's state within 300 ms.
- With `LLM_PROVIDER=mock`, all four demo scripts complete end to end; with `LLM_PROVIDER=ifm` and a key, the same scripts run live and the ladder shows `IFM/K2-Horizon-375B-A23B`.
- Lighthouse-level basics: apps open in mobile Safari and Chrome, no horizontal scroll, tap targets ≥ 44px.
