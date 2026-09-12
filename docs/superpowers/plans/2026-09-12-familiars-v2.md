# Familiars v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing `web/` app into one product, Familiars, that matches `docs/mockups/familiars.html` screen for screen: voice hatch → wiggle to cast, tap to catch → duet → web home → scout deck → group match, inside an iPhone frame on desktop.

**Architecture:** Keep the platform (polling rooms, `act()` reducers, `llm.json`, Upstash store, model ladder). Replace the familiars reducer state with the v2 shape, add three thin API routes (`/api/stt`, `/api/tts`, scout runs inside the reducer), and rebuild the familiars screens on a new dusk stylesheet with one procedural `<Creature>` SVG. Cast/Palate/Detour code stays on disk but is unlinked; `/` redirects to `/familiars`.

**Tech Stack:** Next.js 15.5 App Router, React 19, zod 4, vitest, Upstash Redis, IFM K2 Horizon 375B (`llm.json`), ElevenLabs Scribe STT + TTS (REST), Querit search + fetch (REST), DeviceMotion, MediaRecorder.

**Spec:** `docs/superpowers/specs/2026-09-12-familiars-v2-design.md`

## Global Constraints

- Product name in UI: **Familiars**. Familiar names capitalized (Merlin, Raven, Sage, Nova…). Onboarding is one spoken screen: the human's name and pronouns come from the transcript, never from a form.
- No tech labels in the UI (no "ElevenLabs", "K2", "Querit" strings on screens). The model ladder stays only on `/familiars/stage` and `/familiars/dev`.
- Attribution is never faked: `llm.json` meta decides what the ladder shows; scout cards carry `kind: 'listed_event' | 'self_organized'` and a `source` URL or `cached: true`.
- Tabs: `web · casts · you`. Max 3 tabs. Routes under `/familiars/*` only.
- Mobile first at 393×852; on viewports ≥ 500 px wide the app renders inside a device frame (`.device`), centered on the dusk board.
- Every model call goes through `llm.json` with `effort: 'low'` and `maxTokens ≤ 400` unless stated.
- Nothing merges to `main` without `pnpm typecheck && pnpm lint && pnpm test` passing.
- Env names: `IFM_API_KEY`, `LLM_PROVIDER=ifm`, `ELEVENLABS_API_KEY`, `QUERIT_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`. Missing keys degrade to labeled fallbacks (mock ladder entry, typed transcript, cached cards), never to a broken screen.

## Parallel lanes

Four agents, one lane each, all branching from `main`. Lane 1 lands first (everything imports from it), the other three start immediately against the interfaces below and rebase on Lane 1 when it merges (~15 min in).

| Lane | Tasks | Owner |
| --- | --- | --- |
| 1 · Foundation | 1, 2 | theme, creature, frame, shell |
| 2 · Server | 3, 4, 5 | reducer v2, stt/tts, scout |
| 3 · Hatch + Meet | 6, 7 | `/familiars`, `/familiars/meet` |
| 4 · Web + Casts + You | 8, 9, 10 | `/familiars/web`, `/missed`, `/casts`, `/you` |
| Integration | 11 | redirect, screenshots, deploy |

## File structure

```
web/src/ui/dusk.css                          new  dusk tokens + component classes (imported by familiars layout only)
web/src/lib/familiars/creature.ts            new  seed → traits, names (pure, tested)
web/src/lib/familiars/scout.ts               new  Querit provider + investigate loop (server only)
web/src/lib/familiars/cache/pittsburgh.json  new  three cached cards, labeled cached
web/src/lib/apps/familiars.ts                rewrite  v2 state + actions
web/src/lib/tasks/familiars.ts               rewrite  prompts (hatch, exchange, intro, scout.plan, scout.extract, scout.fit, cast.prompt, recap)
web/src/lib/tasks/index.ts                   modify   TASKS list
web/src/lib/mock/familiars.*.ts              add mocks for each new task (deterministic)
web/src/lib/llm.ts                           modify   opts.maxTokens
web/app/api/stt/route.ts                     new  multipart audio → { text }
web/app/api/tts/route.ts                     new  { text, voice } → audio/mpeg
web/app/familiars/layout.tsx                 rewrite  dusk shell + device frame
web/app/familiars/_components/Creature.tsx   new  procedural SVG
web/app/familiars/_components/Tabs.tsx       new  web · casts · you
web/app/familiars/_components/useFamiliars.ts modify  v2 selectors
web/app/familiars/_components/useRecorder.ts new  MediaRecorder → /api/stt chunks
web/app/familiars/_components/useWiggle.ts   new  DeviceMotion spike → act('wiggle')
web/app/familiars/_components/Deck.tsx       new  swipe deck
web/app/familiars/page.tsx                   rewrite  hatch (name → talk → hatched)
web/app/familiars/meet/page.tsx              new  casting / catch / duet
web/app/familiars/web/page.tsx               new  home
web/app/familiars/missed/page.tsx            new  keep missing + intro
web/app/familiars/casts/page.tsx             new  tonight's cast · out · match
web/app/familiars/you/page.tsx               new  you + recap
web/app/familiars/stage/page.tsx             modify  projector on dusk
web/app/page.tsx                             rewrite  redirect('/familiars')
web/test/familiars.creature.test.ts          new
web/test/familiars.reducer.test.ts           rewrite
web/test/familiars.scout.test.ts             new
```

Delete: `app/familiars/{away,bump,me,night}/`, `_components/{Orb,Village,MatchRing,StoryCard,BumpSensor}.tsx`. Leave `app/cast`, `app/detour`, `app/palate` in place, unlinked.

---

## Shared contracts (every lane reads this first)

### State (`src/lib/apps/familiars.ts`)

```ts
export type Pronouns = 'he/him' | 'she/her' | 'they/them' | string;
export type Species = 'moth' | 'kestrel' | 'gecko' | 'pika';
export type Traits = { species: Species; hue: number /*0..7*/; eyes: 0|1|2; mouth: 0|1|2; accessory: 0|1|2|3 };

export type Familiar = {
  id: string;                 // memberId
  name: string;               // 'Merlin'
  human: { name: string; pronouns: Pronouns };
  transcript: string;         // what they said at hatch
  keywords: string[];         // ≤5, lowercase
  clusterLabel: string;       // 'modular synths'
  greeting: string;           // one line the familiar says when it hatches
  traits: Traits;
  voice: number;              // 0..7, maps to an ElevenLabs voice id server-side
  createdAt: number;
  demo?: boolean;
};

export type Pair = {
  id: string; a: string; b: string; at: number;
  lines: { who: 'a' | 'b'; text: string }[];   // 4 lines
  youBoth: string;                              // ≤ 8 words
  say: string;                                  // 'Ask her about the dorm rack.'
  talked?: boolean;
};

export type Card = {
  id: string; title: string; whenISO: string | null; where: string; cost: string;
  kind: 'listed_event' | 'self_organized'; source?: string; cached?: boolean;
  why: string; image?: string;                  // og:image when fetched, else undefined
};

export type FamState = {
  code: string;
  familiars: Record<string, Familiar>;
  casting: Record<string, { armedAt: number }>;
  pendingCasts: { id: string; from: string; at: number }[];   // TTL 8 s, pruned on every reduce
  pairs: Pair[];
  intros: Record<string, { to: string; via: string; line: string; at: number }>;  // key `${me}:${them}`
  scout: { brief: string; status: string[]; cards: Card[]; swipes: Record<string, Record<string, 'in' | 'out'>>; match: string | null; startedAt: number } | null;
  cast: { question: string; hook: string; at: number; answers: Record<string, string> } | null;
  recaps: Record<string, { cards: { label: string; big?: string; text: string }[]; at: number }>;
};
```

### Actions (`act(name, payload)`), all keyed by `memberId` from the request

| name | payload | effect |
| --- | --- | --- |
| `hatch` | `{ transcript }` | 375B `familiars.hatch` extracts `humanName`, `pronouns` (default `they/them`) and the familiar → `familiars[me]`; also sets `ctx.members[me].name` via the room's member record. Idempotent per member. `transcript` ≥ 12 chars. |
| `arm` / `disarm` | – | `casting[me] = {armedAt}` / delete |
| `wiggle` | – | requires `casting[me]`; pushes `{id, from: me, at}` to `pendingCasts` (one per member; replaces older) |
| `catch` | `{ castId }` | requires cast exists, `from !== me`, age < 8 s, both hatched; creates `Pair` via `familiars.exchange`; removes the cast; disarms both. Idempotent by `pairIdFor(a,b)`. |
| `talked` | `{ pairId }` | marks `talked: true` |
| `askIntro` | `{ to }` | picks `via` = a member paired with both (else the member paired with `to` with most shared keywords, else none); 375B `familiars.intro` → `intros[`${me}:${to}`]` |
| `scout` | `{ brief? }` | runs `runScout()` (Task 5); writes `scout.cards`, appends `status` lines as it goes (the reducer awaits; status is written once at the end, the client shows a fixed 3-step animation while waiting) |
| `swipe` | `{ cardId, dir: 'in'|'out' }` | records; if every hatched non-demo member swiped `in` on the same card → `scout.match = cardId` |
| `castNow` | – | 375B `casts.prompt` from the circle's keywords → `cast` |
| `answer` | `{ text }` | `cast.answers[me] = text` |
| `recap` | – | 375B `familiars.recap` → `recaps[me]` |
| `seedDemo` | `{ n }` | authored villagers (keep, adapt to v2 shape, no model call) |

`pairIdFor` is the FNV hash already in `src/lib/bump.ts`; move it to `src/lib/ids.ts` and export it.

### Selectors (exported from `familiars.ts`, pure)

```ts
export function metIds(state, me): Set<string>
export function sharedKeywords(a: Familiar, b: Familiar): string[]
export function webGroups(state, me): { label: string; members: string[] }[]   // met people grouped by strongest shared keyword with me
export function friendsOfFriends(state, me): string[]                            // paired with someone I paired with, not with me
export function keepMissing(state, me): { id: string; shared: string[]; via: string | null }[]  // unmet, sorted by shared count desc, max 5
export function activeCasts(state, now): FamState['pendingCasts']                // age < 8000
export function isMatch(state): Card | null
```

### Creature (`src/lib/familiars/creature.ts` + `_components/Creature.tsx`)

```ts
export const HUES = ['gold','indigo','mint','rose','sky','lilac','coral','teal'] as const;
export const PALETTE: Record<typeof HUES[number], { c1: string; c2: string; c3: string }> // c1 light, c2 mid, c3 dark
export function traitsFor(seed: string): Traits           // hash(seed) → species,hue,eyes,mouth,accessory
export function nameFor(seed: string, taken: Set<string>): string   // NAMES list, capitalized, unique in room
export const NAMES = ['Merlin','Raven','Sage','Nova','Wren','Juniper','Onyx','Ember','Atlas','Luna','Ferro','Indigo','Sable','Comet','Fennel','Basil','Pippin','Quill','Ozzy','Tamsin','Nimbus','Marlow','Sol','Vesper','Rook','Ivy','Moss','Cinder','Pixel','Bramble','Echo','Zephyr'];
```

```tsx
<Creature traits={t} size={120} mood="idle|talk|sleep" egg={false} glow />
```

`Creature` renders one `<svg viewBox="0 0 120 120">` with CSS vars `--c1 --c2 --c3` from `PALETTE[HUES[traits.hue]]`, body by species (port the four `<symbol>`s from `docs/mockups/familiars.html`: `#c-moth #c-kestrel #c-gecko #c-pika`, plus `#c-egg`), eyes (round / wide / sleepy lid path), mouth (smile / small / open), accessory (none / freckles / glasses / tiny hat). Idle: 3 s bob, blink every 4–6 s (CSS keyframes in dusk.css: `.cr{animation:bob 3s ease-in-out infinite}`, `.cr .eye{animation:blink 5s infinite}`). `mood="talk"` adds a mouth wobble. `prefers-reduced-motion` disables all.

### Dusk stylesheet (`src/ui/dusk.css`), class names the screens use

Port from `docs/mockups/familiars.html` `<style>` block, dropping the board/frame export chrome. Keep these names exactly:

```
.dusk            body ground: linear-gradient(180deg,#0F1133,#1B1548 55%,#2A1A55); color #F4F2FF
.device          393×852 frame with notch, radius 54, used only ≥500px (media query)
.scr             screen root, position:relative, overflow:hidden, safe-area padding
.glass           rgba(255,255,255,.06) + 1px rgba(255,255,255,.1) border, radius 20
.h1 .h2 .lbl .body .mute   type (Bricolage display for h1/h2, no lowercase transform)
.cta .cta.gold .cta.ghost  56px pill buttons
.chip .chip.on
.tabs .tabs .on  bottom tabs: web · casts · you (the you tab icon is the user's creature at 22px)
.bubble          recap bubble (top-right, 40px, gold ring)
.stage           duet stage: two creatures, subtitle line, you-both card
.deck .deckcard  swipe deck (image top 55%, gradient, title, meta, source badge)
.web .node       home graph nodes; .node.faint for friends of friends
.say             hatch suggestion cards: icon, label, example, check
.say.got         checked
--gold #FFC85C --mint #7CF0C4 --rose #FF7AA2 --ink #0F1133
```

### API routes

- `POST /api/stt` multipart `audio` (webm/opus or mp4) → `{ text: string, provider: 'elevenlabs' | 'none' }`. Without `ELEVENLABS_API_KEY` returns `{ text: '', provider: 'none' }` and the client shows a text field instead.
- `POST /api/tts` `{ text, voice: number }` → `audio/mpeg` stream, or 204 without the key. Voice map (8 ids) lives in the route file.

### Client hooks

```ts
useRecorder({ onText: (full: string) => void, chunkMs = 4000 }) → { start, stop, listening, level, supported }
useWiggle({ enabled, onSpike: () => void, threshold = 14 }) → { armed, permission: 'granted'|'denied'|'prompt', request() }
```

---

## Lane 1 · Foundation

### Task 1: Creature generator + component

**Files:**
- Create: `web/src/lib/familiars/creature.ts`
- Create: `web/app/familiars/_components/Creature.tsx`
- Create: `web/src/ui/dusk.css`
- Test: `web/test/familiars.creature.test.ts`

**Interfaces:** Produces `traitsFor`, `nameFor`, `NAMES`, `HUES`, `PALETTE`, `<Creature>` as in Shared contracts.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { traitsFor, nameFor, NAMES, HUES } from '@/lib/familiars/creature';

describe('creature', () => {
  it('is deterministic and in range', () => {
    const a = traitsFor('m_abc'); const b = traitsFor('m_abc');
    expect(a).toEqual(b);
    expect(['moth','kestrel','gecko','pika']).toContain(a.species);
    expect(a.hue).toBeGreaterThanOrEqual(0); expect(a.hue).toBeLessThan(HUES.length);
    expect(a.eyes).toBeLessThan(3); expect(a.mouth).toBeLessThan(3); expect(a.accessory).toBeLessThan(4);
  });
  it('spreads across species and hues', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => traitsFor(`m_${i}`)).map((t) => `${t.species}${t.hue}`));
    expect(seen.size).toBeGreaterThan(20);
  });
  it('names are capitalized and unique in a room', () => {
    const taken = new Set<string>();
    for (let i = 0; i < NAMES.length; i++) { const n = nameFor(`m_${i}`, taken); expect(n).toMatch(/^[A-Z][a-z]+$/); expect(taken.has(n)).toBe(false); taken.add(n); }
    expect(nameFor('m_x', taken)).toMatch(/^[A-Z][a-z]+ [A-Z]$/); // overflow: 'Merlin B'
  });
});
```

- [ ] **Step 2: Run it** — `pnpm vitest run test/familiars.creature.test.ts` → FAIL (module not found)
- [ ] **Step 3: Implement `creature.ts`**

```ts
import { hash } from '../ids';
export const HUES = ['gold','indigo','mint','rose','sky','lilac','coral','teal'] as const;
export type Hue = typeof HUES[number];
export const PALETTE: Record<Hue, { c1: string; c2: string; c3: string }> = {
  gold:   { c1: '#FFC857', c2: '#F59E0B', c3: '#B45309' },
  indigo: { c1: '#A5B4FC', c2: '#6366F1', c3: '#3730A3' },
  mint:   { c1: '#7CF0C4', c2: '#10B981', c3: '#065F46' },
  rose:   { c1: '#FF9BBA', c2: '#FF7AA2', c3: '#9D174D' },
  sky:    { c1: '#7DD3FC', c2: '#0EA5E9', c3: '#075985' },
  lilac:  { c1: '#D8B4FE', c2: '#A855F7', c3: '#6B21A8' },
  coral:  { c1: '#FDA4AF', c2: '#F43F5E', c3: '#9F1239' },
  teal:   { c1: '#5EEAD4', c2: '#14B8A6', c3: '#115E59' },
};
export const SPECIES = ['moth','kestrel','gecko','pika'] as const;
export type Species = typeof SPECIES[number];
export type Traits = { species: Species; hue: number; eyes: 0|1|2; mouth: 0|1|2; accessory: 0|1|2|3 };
export function traitsFor(seed: string): Traits {
  const h = hash(seed);
  return { species: SPECIES[h % 4], hue: (h >>> 2) % 8, eyes: ((h >>> 5) % 3) as 0|1|2, mouth: ((h >>> 7) % 3) as 0|1|2, accessory: ((h >>> 9) % 4) as 0|1|2|3 };
}
export const NAMES = [/* list from Shared contracts */];
export function nameFor(seed: string, taken: Set<string>): string {
  const h = hash(seed);
  for (let i = 0; i < NAMES.length; i++) { const n = NAMES[(h + i * 7) % NAMES.length]; if (!taken.has(n)) return n; }
  return `${NAMES[h % NAMES.length]} ${String.fromCharCode(65 + (h % 26))}`;
}
```

Check `hash` in `src/lib/ids.ts` returns a non-negative 32-bit int; if it does not, add `>>> 0`.

- [ ] **Step 4: Implement `Creature.tsx`** — one `<svg>` per instance (no shared `<symbol>` registry, so the component works anywhere). Port the four species paths from the mockup's `<symbol id="c-moth">…` etc. verbatim into `switch (traits.species)`. Eyes/mouth/accessory are small conditional groups drawn after the body. Props: `traits, size=120, mood='idle', egg=false, glow=true, className`. `egg` renders `#c-egg` with the hue palette instead. Set `style={{ '--c1': …, '--c2': …, '--c3': … } as React.CSSProperties}`.
- [ ] **Step 5: `dusk.css`** — copy the mockup `<style>`, strip `.board .frame .export` rules, add `.device` media query:

```css
@media (min-width: 500px) {
  .dusk { display: grid; place-items: center; min-height: 100dvh; }
  .device { width: 393px; height: 852px; border-radius: 54px; overflow: hidden; position: relative; box-shadow: 0 0 0 10px #17162a, 0 0 0 12px #3a3950, 0 40px 80px rgba(0,0,0,.6); }
  .device::before { content: ''; position: absolute; top: 12px; left: 50%; width: 120px; height: 34px; margin-left: -60px; border-radius: 20px; background: #000; z-index: 50; }
}
@media (max-width: 499px) { .device { width: 100%; min-height: 100dvh; } }
```

- [ ] **Step 6: Run** `pnpm vitest run test/familiars.creature.test.ts && pnpm typecheck` → PASS
- [ ] **Step 7: Commit** `feat(familiars): procedural creature generator, Creature svg, dusk stylesheet`

### Task 2: Shell — layout, device frame, tabs, hook v2

**Files:**
- Rewrite: `web/app/familiars/layout.tsx`
- Create: `web/app/familiars/_components/Tabs.tsx`
- Modify: `web/app/familiars/_components/useFamiliars.ts`
- Modify: `web/src/lib/llm.ts` (add `maxTokens`)
- Rewrite: `web/app/page.tsx` → `import { redirect } from 'next/navigation'; export default function Home() { redirect('/familiars'); }`

**Interfaces:** Produces `<Tabs active="web"|"casts"|"you" me={Familiar|null} code />`, `useFamiliars()` returning `{ code, member, setName, state, me, members, act, serverNow, connected, events, params, now }` where `now()` = `serverNow()`.

- [ ] **Step 1: Layout**

```tsx
import '@/ui/dusk.css';
export const metadata = { title: 'Familiars' };
export default function FamiliarsLayout({ children }: { children: React.ReactNode }) {
  return <div className="dusk"><div className="device">{children}</div></div>;
}
```

Also set `themeColor: '#0F1133'` in `app/layout.tsx` viewport and `title: 'Familiars'` in root metadata.

- [ ] **Step 2: Tabs** — three buttons, `Link`s to `/familiars/web`, `/familiars/casts`, `/familiars/you` (with `withRoom`). Icons: web = small graph glyph, casts = spark, you = `<Creature traits size={22} glow={false}/>` when hatched else a dot. Fixed at bottom 24 px, above safe area; add `.has-tabs{padding-bottom:110px}` to `.scr`.
- [ ] **Step 3: `useFamiliars`** — same as today, `me` reads `state.familiars[member.id]`; add `now: room.serverNow`. Keep `withRoom`, `DEFAULT_ROOM`, `lastModel`.
- [ ] **Step 4: `llm.ts`** — `LlmOpts` gains `maxTokens?: number`; `callChat` takes it (`max_tokens: maxTokens ?? 2048`). Thread through `llm.json`.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint` (existing pages that import removed things are handled in Task 6/7/8 deletes; if lint blocks, delete `app/familiars/{away,bump,me,night}` now and leave `page.tsx` compiling as a stub that renders `<Creature traits={traitsFor('x')} />`).
- [ ] **Step 6: Commit** `feat(familiars): dusk shell, device frame, tabs, llm maxTokens, root redirect` — **merge Lane 1 to main now.**

---

## Lane 2 · Server

### Task 3: Reducer v2 (state, hatch, arm/wiggle/catch, pairs, intros, seedDemo)

**Files:**
- Rewrite: `web/src/lib/apps/familiars.ts`
- Rewrite: `web/src/lib/tasks/familiars.ts`; Modify: `web/src/lib/tasks/index.ts`
- Modify: `web/src/lib/ids.ts` (export `pairIdFor`), `web/src/lib/bump.ts` (import it)
- Add mocks: `web/src/lib/mock/familiars.{hatch,exchange,intro,recap}.ts`, update `mock/index.ts`
- Test: `web/test/familiars.reducer.test.ts` (rewrite)

**Interfaces:** Consumes `traitsFor`, `nameFor`. Produces state/actions/selectors from Shared contracts.

- [ ] **Step 1: Tests** (use the existing test harness style from the current `familiars.reducer.test.ts`: register the def, run `reduce` with `ctx.llm = mock llm`):

```ts
it('hatch takes one transcript, pulls name and pronouns from it, and is idempotent', async () => {
  let s = familiars.initial('R');
  s = await familiars.reduce(s, { name: 'hatch', memberId: 'a', now: 1, payload: { transcript: "I'm João, he/him. I build modular synths at 3 am, from Recife" } }, ctx);
  expect(s.familiars.a.name).toMatch(/^[A-Z]/); expect(s.familiars.a.keywords.length).toBeGreaterThan(0);
  expect(s.familiars.a.human.name).toBe('João'); expect(s.familiars.a.human.pronouns).toBe('he/him');   // the mock echoes what the transcript says
  const again = await familiars.reduce(s, { name: 'hatch', memberId: 'a', now: 2, payload: { transcript: 'y'.repeat(20) } }, ctx);
  expect(again).toBe(s);
});
it('hatch without a stated pronoun defaults to they/them', …);
it('wiggle needs arm; catch pairs, prunes the cast, disarms both, dedups by pair id', async () => {
  // hatch a and b; arm both; wiggle a → pendingCasts[0].from==='a'
  // catch from b with castId → pairs.length 1, pendingCasts empty, casting {} ; catch again → unchanged
  // catch from a on own cast → unchanged; catch at now = at + 9000 → unchanged (expired)
});
it('keepMissing lists unmet hatched members with shared keywords first, and via when a mutual pair exists', …);
it('askIntro writes intros[me:them] with a line', …);
```

- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement.** Key rules:
  - `prune(state, now)` at the top of `reduce`: drop `pendingCasts` older than 8000 ms, drop `casting` entries older than 10 min.
  - `hatch`: validate; `taken = new Set(names)`; call `ctx.llm.json('familiars.hatch', { transcript, suggestedName: nameFor(memberId, taken) }, { app, code, schema: HatchOut, effort: 'low', maxTokens: 320 })`; `HatchOut = { humanName: string.min(1).max(24), pronouns: string.max(16), familiarName, keywords[1..8], clusterLabel, greeting }`. `human = { name: data.humanName.trim() || ctx.members[me]?.name || 'someone', pronouns: data.pronouns.trim() || 'they/them' }`. Final familiar name = `data.familiarName` if it matches `/^[A-Z][a-z]{2,11}$/` and not taken, else `suggestedName`. `traits = traitsFor(memberId)`, `voice = traits.hue`. The client, on seeing `me` appear, calls `setName(me.human.name)` so the member record matches.
  - Mock `familiars.hatch`: parse `/(?:i'?m|i am|my name is|call me)\s+([A-Z][\w-]+)/i` for the name and `/\b(he\/him|she\/her|they\/them)\b/i` for pronouns; keywords = the five longest distinct words > 4 chars.
  - `catch`: build `Pair` via `familiars.exchange` with `{ a: {name, human: name, pronouns, keywords, transcript: first 240 chars}, b: … }`, `maxTokens: 400`. Lines are 4, alternate a/b, ≤ 12 words each. `say` ≤ 10 words, uses the other person's pronouns from *their* profile (prompt gets both pronoun sets).
  - `askIntro`: `via` selection per Shared contracts; prompt `familiars.intro` with `{ me, them, via, shared }` → `{ line }` ≤ 18 words, speaks as via's familiar ("Pietro's familiar says…" is rendered by the UI, not the model).
  - `seedDemo`: adapt the existing archetypes to v2 (`traits: traitsFor(id)`, `name: nameFor(id, taken)`, `human.pronouns` cycling), pairs via the exchange mock, and give `demo_0`…`demo_3` one pair each with the first real member when `seedDemo` runs after a hatch (so the web is not empty on a two-phone demo). Keep it ≤ 12 demo members by default.
- [ ] **Step 4: Prompts** (`tasks/familiars.ts`), all `effort: 'low'`:
  - `familiars.hatch`: "A person just introduced themselves by voice, in one go: who they are (name and pronouns), what they make, where they are from, what they cannot stop doing lately. From the transcript extract humanName (the name they gave for themselves, as they said it, capitalized; empty string if none) and pronouns (exactly as stated, e.g. he/him, she/her, they/them; 'they/them' if not stated). Then choose five lowercase keyword tags (one or two words, concrete, things a stranger could recognise), a two-word cluster label, and one greeting line the familiar says on hatching (≤ 12 words, in character, mentions one concrete thing from the transcript, no exclamation marks). For familiarName, return the suggestedName unless the transcript strongly implies a better single capitalized fantasy name; never the human's name." Shape `{"humanName":string,"pronouns":string,"familiarName":string,"keywords":[…5],"clusterLabel":string,"greeting":string}`.
  - `familiars.exchange`: current prompt, add pronouns rule and `say`.
  - `familiars.intro`, `familiars.recap`, `casts.prompt`, `casts.attribute` (P1), `scout.plan`, `scout.extract`, `scout.fit` as in the spec.
  - Remove `familiars.story`, `familiars.cluster`; keep the `cast.*`, `detour.*`, `palate.*` entries so nothing else breaks.
- [ ] **Step 5:** `pnpm test && pnpm typecheck` → PASS
- [ ] **Step 6: Commit** `feat(familiars): v2 reducer — voice hatch, arm/wiggle/catch, pairs, intros`

### Task 4: STT + TTS routes

**Files:**
- Create: `web/app/api/stt/route.ts`, `web/app/api/tts/route.ts`
- Modify: `web/RUN.md` (env section)

- [ ] **Step 1: STT**

```ts
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  const form = await req.formData(); const audio = form.get('audio');
  if (!key || !(audio instanceof Blob)) return NextResponse.json({ text: '', provider: 'none' });
  const fd = new FormData(); fd.append('file', audio, 'chunk.webm'); fd.append('model_id', 'scribe_v1'); fd.append('language_code', 'en');
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: fd });
  if (!r.ok) return NextResponse.json({ text: '', provider: 'none', error: r.status });
  const body = (await r.json()) as { text?: string };
  return NextResponse.json({ text: body.text ?? '', provider: 'elevenlabs' });
}
```

- [ ] **Step 2: TTS** — `POST { text, voice }` → `fetch('https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice % 8]}?output_format=mp3_44100_64', { headers: { 'xi-api-key', 'content-type': 'application/json' }, body: { text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: .4, similarity_boost: .7 } } })` and stream `r.body` with `content-type: audio/mpeg`. `VOICES` = eight public ElevenLabs premade voice ids (Rachel `21m00Tcm4TlvDq8ikWAM`, Adam `pNInz6obpgDQGcFmaJgB`, Bella `EXAVITQu4vr4xnSDxMaL`, Antoni `ErXwobaYiN019PkySvjV`, Elli `MF3mGyEYCl7XYWbV9V6O`, Josh `TxGEqnHWrfWFTfGW9XjX`, Domi `AZnzlk1XvdvUeBnXmlld`, Sam `yoQ2vLiZvQ0YfKMkGhKA`). Without key → `new Response(null, { status: 204 })`.
- [ ] **Step 3:** curl smoke with a 2-second webm from the browser once Lane 3's recorder exists; until then `pnpm typecheck`.
- [ ] **Step 4: Commit** `feat(api): elevenlabs stt + tts routes`

### Task 5: Scout (Querit) + swipe + match

**Files:**
- Create: `web/src/lib/familiars/scout.ts`, `web/src/lib/familiars/cache/pittsburgh.json`
- Modify: `web/src/lib/apps/familiars.ts` (`scout`, `swipe`, `isMatch`)
- Test: `web/test/familiars.scout.test.ts`

**Interfaces:** Produces `runScout(brief: string, circle: { keywords: string[] }, llm: LLM, ctx: { app, code }): Promise<{ cards: Card[]; status: string[] }>`.

- [ ] **Step 1: Test** — with `QUERIT_API_KEY` unset, `runScout` returns the three cached cards with `cached: true` and status `['Searching…', 'Reading 3 pages', 'Using cached results']`; `swipe` from every hatched non-demo member on the same card sets `scout.match`; one `out` vote leaves it `null`.
- [ ] **Step 2: Provider** — `QUERIT_BASE = process.env.QUERIT_BASE_URL ?? 'https://api.querit.ai/v1'`; `search(q)` → `POST /search { query, limit: 5 }` → `{ results: { title, url, snippet }[] }`; `fetchPage(url)` → `POST /fetch { url }` → `{ text, og?: { image } }`. Read the exact paths from the Querit docs at build time; keep both calls in `scout.ts` only so a path change is one edit. Timeouts 6 s each via `AbortSignal.timeout`.
- [ ] **Step 3: Loop** — `scout.plan` (375B, `maxTokens 200`) → 3 queries ("Pittsburgh this weekend <keyword> event", scoped to the current month) → `search` each → dedupe by URL → take top 4 → `fetchPage` in parallel → `scout.extract` per page (`maxTokens 300`, page text truncated to 3000 chars) → keep those with a title and a when in the next 10 days as `listed_event` (`source: url`, `image: og.image`); if fewer than 3, `scout.fit` proposes `self_organized` fillers built from the circle keywords ("Eurorack jam at the Makerspace, Sat 8 pm, bring a patch cable") → 3 cards total. Any provider error → cached cards.
- [ ] **Step 4: Reducer** — `scout` action: guard one run per 60 s, `startedAt`, awaits `runScout`, writes cards. `swipe` + `isMatch` per contracts.
- [ ] **Step 5:** `pnpm test` → PASS; commit `feat(familiars): querit scout loop, swipe deck state, group match`

---

## Lane 3 · Hatch + Meet

### Task 6: Hatch screens (`/familiars`)

**Files:**
- Rewrite: `web/app/familiars/page.tsx`
- Create: `web/app/familiars/_components/useRecorder.ts`
- Delete: `web/app/familiars/{away,bump,me,night}/`, `_components/{Orb,Village,MatchRing,StoryCard,BumpSensor}.tsx`

Match frames 1–2 of the mockup (`Talk to the egg`, `Hatched`). There is no name form: one spoken screen, then the hatched creature.

- [ ] **Step 1: `useRecorder`** — `getUserMedia({audio:true})`, `MediaRecorder` with `audio/webm;codecs=opus` if supported else `audio/mp4` (iOS). Every `chunkMs` stop+restart the recorder so each blob is standalone, POST it to `/api/stt`, append `text` to an accumulated string, call `onText(full)`. Expose an AnalyserNode RMS as `level` (0..1) for the ring animation. `supported=false` when `MediaRecorder` is missing → the page shows a textarea instead.
- [ ] **Step 2: Identity before the first act** — `useMember('familiars')` needs a member id before `act` works; on mount, if there is no member, call `setName('…')` with a placeholder so the id exists (the real name is written after hatch from `me.human.name`). `useRoom` joins with that id.
- [ ] **Step 3: The talk screen** (the only onboarding screen) — top pills `hatch` and `● listening`; egg `<Creature egg traits={traitsFor(member.id)} size={150}/>` with a `level`-driven glow ring and up to six transcript tokens floating around it (`.tok`, the last recognised keywords plus `"<name> · <pronouns>"` once the mock/regex sees them); `h1` (`.d2`) asks the next uncovered card's question, in order: "who are you?" → "what do you make?" → "where are you from?" → "what can't you stop doing lately?". Four `.say` cards in a 2×2 grid, each with `--tint` and a 34 px borderless icon (`i-users` lilac `#C7A8FF`, `i-wrench` gold `#FFC85C`, `i-pin` mint `#7CF0C4`, `i-heart` rose `#FF7AA2`), label + italic example: `who you are · "I'm João, he/him"`, `what you make · "I build synths"`, `where you're from · "Recife"`, `lately · "can't stop…"`. A card gets `.on` + the mint check when the running transcript matches its group; the next uncovered card shows the dim mic badge. Regexes, kept in the file:
  - who: `/\b(i'?m|i am|my name is|call me)\s+[a-z]/i`
  - make: `/\b(build|make|making|write|writing|code|design|study|studying|research|paint|cook|play)\b/i`
  - from: `/\b(from|grew up|born|moved|raised)\b/i`
  - lately: `/\b(lately|recently|can'?t stop|these days|obsessed|every night|all week)\b/i`
  Big mic button toggles `start/stop`; a waveform (`.wave`) and elapsed time under it. "Done" (ghost, above the mic) is enabled when the **who** card is on and the transcript ≥ 12 chars. When `supported` is false or `/api/stt` returns `provider: 'none'`, the mic is replaced by a `textarea` and the same regexes drive the cards.
  - **Hatch speed:** on every `onText`, if no hatch has been sent yet, the who card is on, at least one other card is on, and the user has been talking ≥ 5 s, send `act('hatch', { transcript })` once ("early hatch"); later chunks are ignored by the idempotent reducer. If the user presses Done first, send then. Target: creature visible within 2 s of the last word.
- [ ] **Step 4: Hatched** — shown when `me` exists (call `setName(me.human.name)` once): creature `size={220}` with `mood="talk"` for 2 s, name `h1` (Merlin), greeting line as a subtitle, four keyword chips, CTA "Hear Merlin" (plays the greeting via `/api/tts` with `me.voice`; hidden when TTS returns 204), ghost "Not quite me" (re-hatch is out of scope: it just re-rolls `traits` locally by hashing `member.id + ':2'` and stores the salt in localStorage), then "Meet someone" → `/familiars/meet`. After 6 s with no tap, auto-advance to `/familiars/web`.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint`; screenshot `pnpm shots /familiars` → compare to frame f1 by eye. Commit `feat(familiars): voice hatch with name, pronouns, live transcript`.

### Task 7: Meet (`/familiars/meet`): casting mode, catch, duet

**Files:**
- Create: `web/app/familiars/meet/page.tsx`, `web/app/familiars/_components/useWiggle.ts`

Match frames 3–5 (`Casting mode`, `The catch`, `The duet`).

- [ ] **Step 1: `useWiggle`** — on `request()`, call `DeviceMotionEvent.requestPermission()` when present (iOS needs it inside a tap); listen to `devicemotion`, compute `|acceleration| ` (use `accelerationIncludingGravity` minus 9.81 when `acceleration` is null); spike > `threshold` with 1.5 s re-arm → `onSpike()`. Desktop fallback: a "wiggle" button visible when `DeviceMotionEvent` is undefined.
- [ ] **Step 2: Page states** (derived from state, no local phase machine beyond `armed`):
  - **not armed** → CTA "Enter casting mode" → `request()` then `act('arm')`.
  - **armed, no active cast from others** → creature centered with a slow radar ring, `lbl` "wiggle to cast Merlin", others armed shown as faint dots around (count of `casting`). Wiggle → `act('wiggle')`, then the ring pulses for 8 s ("cast out…").
  - **armed, active cast from someone else** (`activeCasts(state, now()).filter(c => c.from !== me.id)[0]`) → catch card slides up: their creature (small), "Merlin, from João" (their familiar + human name), "Catch" gold CTA → `act('catch', { castId })`, ghost "Not now".
  - **pair exists with me as a or b, created < 2 min ago and `!talked`** → duet: `.stage` with both creatures facing each other, four lines shown one at a time (900 ms each, existing `Exchange` timing) as a single subtitle under the stage with the speaking creature `mood="talk"`; then the `you both` card (mint) and the `say` line; CTA "We talked" → `act('talked', { pairId })` then router to `/familiars/web`. Each line is spoken via `/api/tts` with that familiar's `voice` when available, sequentially (await `ended` before the next line, cap 3 s per line).
  - `act('disarm')` on unmount.
- [ ] **Step 3:** Two-browser check locally (two Chrome profiles, desktop wiggle button): arm both, wiggle in one, catch in the other, duet renders on both. Commit `feat(familiars): casting mode, one-tap catch, duet with voices`.

---

## Lane 4 · Web + Casts + You

### Task 8: Web home + keep missing (`/familiars/web`, `/familiars/missed`)

Match frames 6–7.

- [ ] **Step 1: `/familiars/web`** — top bar: `chip` "your web · N" left, `bubble` top-right (visible when `recaps[me]` exists or after 21:00 server time; tap → `/familiars/you#recap`). A pinned card under the bar when `state.cast` exists: "night owls cast tonight · 3 of 5 answered" → `/familiars/casts`. Graph: my creature at bottom center (size 96); `webGroups` laid out as arcs: each group is a labeled ring segment (`lbl` with the shared keyword) with member creatures (size 44) placed on a radius of 120–150 px using deterministic angles (`i / n * π + offset`), `friendsOfFriends` at radius 210 as `.node.faint` (size 32, opacity .35). Lines from me to each met creature use `<svg>` behind the nodes, stroke `rgba(255,255,255,.18)`. Under the graph: `glass` row "N you keep missing" with three faint creatures → `/familiars/missed`. CTA "Cast Merlin" → `/familiars/meet`. `<Tabs active="web"/>`. Empty state (no pairs): my creature alone with `mute` "Meet someone and they show up here."
- [ ] **Step 2: `/familiars/missed`** — header "94% like you" style: for the top `keepMissing` entry show their creature big, human name, shared chips, `via` line ("Pietro's familiar can make the intro" when `via`), CTA "Ask for an intro" → `act('askIntro', { to })`; when `intros[me:them]` exists, replace the CTA with the `glass` line card (the intro line) and a mint "Say it in person" note. Ghost "Maybe later" → back. A horizontal chip strip switches between the other missed people.
- [ ] **Step 3:** typecheck/lint, `pnpm shots /familiars/web` (after `seedDemo` via `/familiars/dev`). Commit `feat(familiars): web home graph, keep-missing intros`.

### Task 9: Casts tab — tonight's cast, out (deck), group match (`/familiars/casts`)

Match frames 8–11.

- [ ] **Step 1: Segments** — top segmented control `tonight · out`. Query `?tab=out` selects the second.
- [ ] **Step 2: Tonight** — if no `state.cast`: creature + `mute` "Tonight's cast lands at 9" + ghost "Cast now" (dev/demo, calls `castNow`). With a cast: big card with `question` (h1 size 28) and `hook`, the circle's creatures row, a mic button "Talk, I'm listening" that uses `useRecorder` and posts the running transcript to `act('answer', { text })` every chunk (P1 attribution is skipped: the answer is stored under the speaker's own member id), a list of answers by creature, CTA "Done talking".
- [ ] **Step 3: Out** — if `!state.scout`: creature "out scouting" empty state with CTA "Send Merlin out" → `act('scout', { brief })` where brief = the circle's keywords joined; while the act is pending show the three-step status animation (`Searching this weekend…` → `Reading pages` → `Choosing three`) on the creature, 1.2 s apart, until the state returns cards. With cards: `<Deck>` (Task 9b). With `match`: match screen (Step 5).
- [ ] **Step 4: `Deck.tsx`** — three stacked `.deckcard`s, pointer-drag with `transform: translate(x) rotate(x/20deg)`, release past 90 px → `onSwipe(dir)` with a 250 ms fly-out; buttons "Not this one" / "I'm in" at the bottom for tap users. Card: image area (card.image, else a hue gradient with the creature peeking), title, meta row (`whenISO` formatted `Sat · 8 pm`, `where`, `cost`), badge `listed · photo from organizer` or `self-organized` or `cached`, `why` line. Each swipe → `act('swipe', { cardId, dir })`. When the user swiped all three and no match yet: "Waiting for the others" with the circle's creatures and a check on those who swiped `in` on any card I swiped `in`.
- [ ] **Step 5: Group match** — `isMatch(state)`: full-bleed card image, `h1` "It's a plan.", the circle's creatures in a row bouncing, when/where, CTA "Add to calendar" → `data:text/calendar` ICS built client-side (`DTSTART` from `whenISO`, `SUMMARY`, `LOCATION`, `URL`), ghost "Open source" when `source`.
- [ ] **Step 6:** typecheck/lint/screens `/familiars/casts`, `/familiars/casts?tab=out`. Commit `feat(familiars): tonight's cast, scout deck, group match`.

### Task 10: You + recap (`/familiars/you`)

Match frames 12–13.

- [ ] **Step 1:** Creature big (size 160, `glow`), name, keyword chips, stats row (`met · pairs · groups` from state), "Hear <name>" ghost button → `/api/tts` with the greeting. Section `#recap`: if `recaps[me]` → three cards (label / big / text) in a horizontal snap scroll with "1 of 3"; else CTA "Tonight's recap" → `act('recap')` (allowed any time in the demo). "Share the recap" → `navigator.share` when available. `<Tabs active="you"/>`.
- [ ] **Step 2:** Commit `feat(familiars): you tab with recap`.

---

## Integration

### Task 11: Wire, verify, deploy

- [ ] **Step 1:** Rebase all lanes on main; `pnpm typecheck && pnpm lint && pnpm test`.
- [ ] **Step 2:** `/familiars/stage`: swap the village to the dusk theme with `<Creature>` nodes and the pairs count; keep the model ladder here.
- [ ] **Step 3:** `/familiars/dev`: buttons `seedDemo(12)`, `castNow`, `scout`, `recap`, and a "hatch as demo" that hatches this device with a fixed transcript (for judges without a mic).
- [ ] **Step 4:** Screens: `pnpm shots /familiars /familiars/meet /familiars/web /familiars/missed /familiars/casts "/familiars/casts?tab=out" /familiars/you` and eyeball against `docs/mockups/familiars.html` frames. Fix spacing, nothing else.
- [ ] **Step 5:** Vercel env: add `ELEVENLABS_API_KEY`, `QUERIT_API_KEY` (production + preview); `vercel --prod`; `curl https://hackcmu-2026.vercel.app/health` shows `provider: ifm`, `store: upstash`.
- [ ] **Step 6:** Two-iPhone run of the demo script from the spec; note timings in `RUN.md` (hatch-to-creature seconds, wiggle-to-duet seconds).
- [ ] **Step 7:** Commit `chore: familiars v2 wired, stage + dev on dusk, RUN.md demo script`.

## Self-review

- Spec coverage: P0 1–5 → Tasks 1–9; P1 6 partial (listening cast without attribution, Task 9 Step 2), 7 → Task 10, 8 → Task 11 Step 2; hatch speed → Task 3 (`maxTokens 300`, low) + Task 6 Step 3 (early hatch); procedural creatures → Task 1; Querit → Task 5; iPhone frame → Task 1 Step 5 + Task 2; routes → Tasks 6–10; env fallbacks → Tasks 4, 5, 6.
- Names used across tasks: `traitsFor`, `nameFor`, `Creature`, `Tabs`, `useFamiliars`, `useRecorder`, `useWiggle`, `Deck`, `activeCasts`, `keepMissing`, `webGroups`, `friendsOfFriends`, `isMatch`, `runScout`, actions `hatch arm disarm wiggle catch talked askIntro scout swipe castNow answer recap seedDemo` — consistent with Shared contracts.
- Known cut: P1 `casts.attribute` (who said what) is listed in prompts but not called; answers are stored per speaker device. Say so in the demo, do not imply attribution.
