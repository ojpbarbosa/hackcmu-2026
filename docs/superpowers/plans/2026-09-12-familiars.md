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
- [ ] **Step 1:** Tests: hatch creates a familiar with a 3-char address and assigns a cluster; `bumpPaired` creates one Bump with 4 dialogue lines (mock); `gotAway` returns the highest-scoring never-bumped familiar and never returns someone already bumped. Implement; pass. Commit "feat(familiars): state, reducer, matching".

### Task 2: Prompts and mocks

- [ ] **Step 1:** `familiars.hatch`: "Given three seed answers and a human name, invent a one-word lowercase familiar name (animal or object, not the human's name), 5 keyword tags, and a two-word cluster label describing the person's scene (e.g. 'modular synths', 'wet lab'). JSON {name, keywords, clusterLabel}." `familiars.exchange`: "Two familiars meet for ten seconds. Write 4 alternating lines (a,b,a,b), each ≤ 12 words, in character, playful, referencing their seeds; then 'youBoth' (≤ 8 words: the one shared thing) and 'suggestion' (one line telling the humans what to do next, include where the other human is sitting from input). JSON {dialogue:[{who,text}], youBoth, suggestion}." `familiars.story`: "Write the person's night as 3 cards from the graph facts. JSON {cards:[{label,big?,text}]}: card 1 counts, card 2 the callback (a promise or detail from a bump), card 3 the room and the one that got away (do not reveal the name)."
- [ ] **Step 2:** Mocks deterministic from seeds (name list of 40 animals; dialogue templates mixing seed fragments). Commit "feat(familiars): prompts and mocks".

### Task 3: Screens

- [ ] **Step 1:** `useFamiliars()`: room from `?room=` default `HACKCMU` (create if missing), `useMember`; `me = state.familiars[member.id]`.
- [ ] **Step 2:** Hatch (`/familiars`): three TextFields with the seed questions from the spec, name, seat ("where are you sitting", placeholder "2nd floor, by the windows"), CTA "Hatch my familiar" → `hatch`, then redirect to `/familiars/me`.
- [ ] **Step 3:** Me: `Orb` (CSS radial gradient from `aura` hues, monogram = first letter of name), name H1, sub "your familiar · address XYZ", stat pills (contacts = distinct bumped, bumps, clusters touched), seed cards, CTA "Bump a phone to meet" → `/familiars/bump`, text "or key an address · XYZ is yours" → sheet with TextField → `bumpByAddress`.
- [ ] **Step 4:** Bump: `BumpSensor`: on CTA tap request motion permission; listen to `devicemotion`; compute magnitude `|a|-9.81` from `accelerationIncludingGravity`; when > 14 m/s² (tune) and 1.5 s since last, POST `/api/bump {app:'familiars', code, memberId, at: serverNow(), magnitude}`; then poll `GET /api/bump?bumpId=` every 300 ms up to 6 s; show states: arming ("hold your phone, bump it against theirs"), sensing (live magnitude bar), matched (two orbs meet with the spark), then the `Exchange` streams the bump's dialogue lines one per 900 ms into bubbles (left = me), then the result card (youBoth H3, suggestion body), CTA "We talked" → `/familiars/me`. If no match in 6 s: "no bump found · try again or key their address".
- [ ] **Step 5:** Night: on mount `act('story')` if none; render the dark `StoryCard` stack (label, big number, text, dividers) and "1/3" pager (swipe or tap), CTA "Show me who" → `/familiars/away`.
- [ ] **Step 6:** Away: `MatchRing` (SVG ring at score%), ghost orb "?", name + address, sub "never bumped · last seen <seat>", shared chips (keyword intersection), body line, CTA "Find them now" (reveals seat in a mint pill) and ghost "Maybe tomorrow".
- [ ] **Step 7:** `pnpm shots` for each route with a seeded room (`act('seedDemo',{n:40})` via the API); compare to the mockup; fix. Commit "feat(familiars): screens".

### Task 4: Stage

- [ ] **Step 1:** `/familiars/stage?room=HACKCMU`: `StagePage`; left: SVG force graph (`d3-force`: nodes = familiars colored by cluster, grey for never-bumped; links = bumps; simulation runs client-side, re-seeded when counts change), me ring and "pika · 94%" style labels for the two most recent bumps; right: counters, cluster legend, `ModelLadder`. Auto `seedDemo` when the room has < 20 familiars and `?demo=1`. Screenshot 1280×720; commit "feat(familiars): stage".

### Task 5: Verification

- [ ] **Step 1:** API-level demo: hatch A and B; POST two bumps 200 ms apart → pairId; state has a Bump with dialogue; `story` for A; `gotAway` for A returns B or a demo familiar. Browser: `/familiars/bump` renders the sensing state and, with `?simulate=1`, fakes a spike to exercise the flow without a phone. Record under "Verified". `pnpm typecheck && pnpm lint && pnpm test`; commit.

## Self-review

Screens 1–6 ↔ Tasks 3–4; bump contract ↔ core `/api/bump`; model tasks ↔ Task 2; seeding ↔ `seedDemo`; acceptance ↔ Task 5.
