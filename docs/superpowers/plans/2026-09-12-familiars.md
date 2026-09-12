# Familiars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Familiars on the shared core: hatch a familiar from three answers, bump two phones to make the familiars talk, get a "you both" line, a night story, "the one that got away", and a live village graph on the stage.

**Architecture:** Server state and reducer in `web/src/lib/apps/familiars.ts`; prompts in `web/src/lib/tasks/familiars.ts`; mocks in `web/src/lib/mock/familiars.*.ts`. Bump pairing uses the core `/api/bump` endpoint which dispatches `bumpPaired` into this reducer. Client route group `web/app/familiars/*`. Village graph: d3-force on the stage.

**Tech Stack:** as core. Extra: `d3-force` (+ `@types/d3-force`) for the stage graph.

**Spec:** `docs/superpowers/specs/2026-09-12-familiars-design.md`. Visual contract: `docs/mockups/index.html` §Familiars.

## Global Constraints

- Same as the core plan. Only touch `web/src/lib/apps/familiars.ts`, `web/src/lib/tasks/familiars.ts`, `web/src/lib/mock/familiars.*.ts`, `web/app/familiars/**`, `web/test/familiars.*.test.ts`, and add `d3-force` to `web/package.json`.
- The event room code is `HACKCMU` by default (`?room=` overrides).
- Bump must work on iOS Safari over HTTPS: request `DeviceMotionEvent.requestPermission()` inside the tap handler of the "Bump a phone" CTA.

## File structure

```
web/src/lib/apps/familiars.ts
web/src/lib/tasks/familiars.ts
web/src/lib/mock/familiars.{hatch,exchange,story,cluster}.ts
web/app/familiars/layout.tsx
web/app/familiars/page.tsx            # Hatch (screen 1) → redirects to /me when hatched
web/app/familiars/me/page.tsx         # Your familiar (screen 2)
web/app/familiars/bump/page.tsx       # Bump (screen 3): arming, pairing, exchange, result
web/app/familiars/night/page.tsx      # Your night (screen 4)
web/app/familiars/away/page.tsx       # The one that got away (screen 5)
web/app/familiars/stage/page.tsx      # Stage
web/app/familiars/_components/{Orb,BumpSensor,Exchange,StoryCard,MatchRing,useFamiliars}.tsx
web/test/familiars.reducer.test.ts
web/test/familiars.match.test.ts
```

---

### Task 1: State, reducer, matching

**Files:** `web/src/lib/apps/familiars.ts`, tests

**Interfaces (produces):**
```ts
export type Familiar={id:string /* = memberId */; name:string; address:string /* 3 chars A-Z2-9 */; aura:[string,string]; seeds:[string,string,string]; keywords:string[]; human:{name:string; seat:string}; clusterId:string|null; createdAt:number; demo?:boolean};
export type Bump={id:string; a:string; b:string; at:number; dialogue:{who:'a'|'b'; text:string}[]; youBoth:string; suggestion:string};
export type Cluster={id:string; label:string; color:string; members:string[]};
export type FamState={familiars:Record<string,Familiar>; bumps:Bump[]; clusters:Cluster[]; stories:Record<string,{cards:{label:string; big?:string; text:string}[]; at:number}>};
// actions:
// 'hatch' {seeds:[s,s,s], human:{name,seat}} → llm.json('familiars.hatch') → Familiar (name, keywords, clusterLabel → cluster upsert, max 8 clusters, colors from a fixed palette of 8); address unique per room
// 'bumpPaired' {pairId, a, b} (from /api/bump) → if no bump with pairId → llm.json('familiars.exchange') → push Bump
// 'bumpByAddress' {address} → pairs memberId with the familiar at address (fallback path) → same as bumpPaired
// 'story' {} → llm.json('familiars.story') with {me, myBumps, clusters, gotAway} → stories[memberId]
// 'seedDemo' {n} → adds n synthetic familiars (authored names/seeds, demo:true) and ~n*0.6 bumps between them with mock exchanges, so the stage is full. Only when familiars count < 20.
export function gotAway(state:FamState, meId:string):{id:string; score:number}|null; // top never-bumped familiar by Jaccard(keywords) + 0.15 same-cluster bonus; excludes demo=false? (no: demo familiars are eligible, labeled demo in UI)
export function matchScore(a:Familiar,b:Familiar):number // 0..1
```
- [x] **Step 1:** Tests: hatch creates a familiar with a 3-char address and assigns a cluster; `bumpPaired` creates one Bump with 4 dialogue lines (mock); `gotAway` returns the highest-scoring never-bumped familiar and never returns someone already bumped. Implement; pass. Commit "feat(familiars): state, reducer, matching".

### Task 2: Prompts and mocks

- [x] **Step 1:** `familiars.hatch`: "Given three seed answers and a human name, invent a one-word lowercase familiar name (animal or object, not the human's name), 5 keyword tags, and a two-word cluster label describing the person's scene (e.g. 'modular synths', 'wet lab'). JSON {name, keywords, clusterLabel}." `familiars.exchange`: "Two familiars meet for ten seconds. Write 4 alternating lines (a,b,a,b), each ≤ 12 words, in character, playful, referencing their seeds; then 'youBoth' (≤ 8 words: the one shared thing) and 'suggestion' (one line telling the humans what to do next, include where the other human is sitting from input). JSON {dialogue:[{who,text}], youBoth, suggestion}." `familiars.story`: "Write the person's night as 3 cards from the graph facts. JSON {cards:[{label,big?,text}]}: card 1 counts, card 2 the callback (a promise or detail from a bump), card 3 the room and the one that got away (do not reveal the name)."
- [x] **Step 2:** Mocks deterministic from seeds (name list of 40 animals; dialogue templates mixing seed fragments). Commit "feat(familiars): prompts and mocks".

### Task 3: Screens

- [x] **Step 1:** `useFamiliars()`: room from `?room=` default `HACKCMU` (create if missing), `useMember`; `me = state.familiars[member.id]`.
- [x] **Step 2:** Hatch (`/familiars`): three TextFields with the seed questions from the spec, name, seat ("where are you sitting", placeholder "2nd floor, by the windows"), CTA "Hatch my familiar" → `hatch`, then redirect to `/familiars/me`.
- [x] **Step 3:** Me: `Orb` (CSS radial gradient from `aura` hues, monogram = first letter of name), name H1, sub "your familiar · address XYZ", stat pills (contacts = distinct bumped, bumps, clusters touched), seed cards, CTA "Bump a phone to meet" → `/familiars/bump`, text "or key an address · XYZ is yours" → sheet with TextField → `bumpByAddress`.
- [x] **Step 4:** Bump: `BumpSensor`: on CTA tap request motion permission; listen to `devicemotion`; compute magnitude `|a|-9.81` from `accelerationIncludingGravity`; when > 14 m/s² (tune) and 1.5 s since last, POST `/api/bump {app:'familiars', code, memberId, at: serverNow(), magnitude}`; then poll `GET /api/bump?bumpId=` every 300 ms up to 6 s; show states: arming ("hold your phone, bump it against theirs"), sensing (live magnitude bar), matched (two orbs meet with the spark), then the `Exchange` streams the bump's dialogue lines one per 900 ms into bubbles (left = me), then the result card (youBoth H3, suggestion body), CTA "We talked" → `/familiars/me`. If no match in 6 s: "no bump found · try again or key their address".
- [x] **Step 5:** Night: on mount `act('story')` if none; render the dark `StoryCard` stack (label, big number, text, dividers) and "1/3" pager (swipe or tap), CTA "Show me who" → `/familiars/away`.
- [x] **Step 6:** Away: `MatchRing` (SVG ring at score%), ghost orb "?", name + address, sub "never bumped · last seen <seat>", shared chips (keyword intersection), body line, CTA "Find them now" (reveals seat in a mint pill) and ghost "Maybe tomorrow".
- [x] **Step 7:** `pnpm shots` for each route with a seeded room (`act('seedDemo',{n:40})` via the API); compare to the mockup; fix. Commit "feat(familiars): screens".

### Task 4: Stage

- [x] **Step 1:** `/familiars/stage?room=HACKCMU`: `StagePage`; left: SVG force graph (`d3-force`: nodes = familiars colored by cluster, grey for never-bumped; links = bumps; simulation runs client-side, re-seeded when counts change), me ring and "pika · 94%" style labels for the two most recent bumps; right: counters, cluster legend, `ModelLadder`. Auto `seedDemo` when the room has < 20 familiars and `?demo=1`. Screenshot 1280×720; commit "feat(familiars): stage".

### Task 5: Verification

- [x] **Step 1:** API-level demo: hatch A and B; POST two bumps 200 ms apart → pairId; state has a Bump with dialogue; `story` for A; `gotAway` for A returns B or a demo familiar. Browser: `/familiars/bump` renders the sensing state and, with `?simulate=1`, fakes a spike to exercise the flow without a phone. Record under "Verified". `pnpm typecheck && pnpm lint && pnpm test`; commit.

## Self-review

Screens 1–6 ↔ Tasks 3–4; bump contract ↔ core `/api/bump`; model tasks ↔ Task 2; seeding ↔ `seedDemo`; acceptance ↔ Task 5.

## Verified

Run on 2026-09-12 against `pnpm dev -p 3002` with `LLM_PROVIDER=mock` (no keys).
`pnpm typecheck && pnpm lint && pnpm test` green (51 tests, 6 files); the core
`SMOKE_URL=http://localhost:3002 pnpm smoke` still passes all 16 checks.

**The bump, at the API level** (`verify.sh VERIFY1`, two hatches then two POSTs
to `/api/bump` 200 ms apart):

```
== hatch two humans ==
  kestrel NKL cl_modular_synths ['modular','synths','recife','night','owl']
  gannet  FRM cl_modular_synths ['patch','tape','loops','synths','lagos']
== two bumps, 200 ms apart ==
{"bumpId":"bump_xq5f84zlu2"}
{"bumpId":"bump_x938djqujn","matched":{"withMemberId":"a","pairId":"pair_yfx2qlm7zl"}}
== a bump with four lines ==
  bumps between the two phones: 1
  pairId: pair_yfx2qlm7zl
    a : Mine has not stopped about modular since Thursday.
    b : Mine answered "read menus for fun" and meant it.
    a : A patch person. Mine will want to see that.
    b : Mine is the other one who says "Night owl, obviously".
  youBoth: synths. go talk.
  suggestion: Start with synths. Neither of you brings it up first otherwise.
== the night ==
  in one night | 1  | 1 familiar bumped. gannet started it.
  the callback |    | gannet said "…". You both landed on synths, and then the room moved.
  the room     | 40%| Your cluster is modular synths, 42 familiars in the room across
                      8 clusters. One of them matches you 40% on synths and recife,
                      and you never bumped.
gotAway for a: moth (DP6) 40% · demo=true · shared=synths, recife
  never bumped check: ok (bumped: b)
```

**The bump, from a browser.** `/familiars/bump?room=BUMPZ&simulate=1&auto=1` in
headless Brave while a second "phone" knocked over `/api/bump` every 120 ms: the
page paired, the room reducer wrote one exchange with four lines
(`pair_ygvdvrrjq3 ghost x shot_a | 4 lines | building at 3 am.`) and the screen
showed the two orbs meeting with "the familiars are talking"
(`web/.shots/familiars_bump_room_BUMPZ_simulate_1_auto_1.png`).

**Screens** (393×852 unless noted, all in `web/.shots/`):

| screen | file |
| --- | --- |
| hatch | `familiars.png` |
| your familiar | `familiars_me_room_SHOTS.png`, `familiars_room_SHOT2.png` (the redirect) |
| bump · armed | `familiars_bump_room_SHOT2.png` |
| bump · sensing, live magnitude bar | `familiars_bump_room_SHOT2_simulate_1_auto_1.png` |
| bump · paired | `familiars_bump_room_BUMPZ_simulate_1_auto_1.png` |
| bump · exchange and result | `familiars_bump_room_SHOT2_last_1.png` |
| bump · arrived by keyed address | `familiars_bump_room_SHOT2_with_shot_b.png` |
| your night | `familiars_night_room_SHOTS.png` |
| the one that got away | `familiars_away_room_SHOTS.png` |
| stage (1280×720) | `familiars_stage_room_STAGE1.png`, `familiars_stage_room_EMPTY9_demo_1.png` |

`/familiars/dev?room=CODE&to=/familiars/me` seeds a room (two hatches, one bump,
forty demo villagers, a story) and adopts the first identity on this device: it
is how the screenshots above were produced, and it is the fastest way to put a
laptop into the demo state.

### Known gaps

- `POST /api/bump` (core, `src/lib/bump.ts`) read-modify-writes the pending list
  with `store.get` + `store.set`. Under a stream of bumps in one room, two
  concurrent writes can drop an entry and a pair is missed (reproduced by
  knocking every 250 ms from one member: an unrelated pair posted in between did
  not match; the same pair matched immediately once the room was quiet). Two
  phones bumping once is fine, and a missed bump just means tapping again, but on
  Upstash the window is a REST round trip. A Redis list push, or a compare-and-set
  retry, would close it. Not my file: reported, not touched.
- Clustering uses the `clusterLabel` that `familiars.hatch` already returns, and
  upserts it locally (max eight, fixed palette). The `familiars.cluster` task in
  `src/lib/tasks/familiars.ts` is therefore unused — one model call per hatch
  instead of two.
- The night screen leads with one card and folds the other two into the same dark
  card, the way the mockup draws it; tapping the card rotates which one leads.
