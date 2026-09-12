# HackCMU 2026 — problem-first ideation (overnight, v1)

Written 2026-09-12 ~01:00. Submission 16:00 (Google Form + 50-word track justification). Judging 16:00–18:30, classroom pitch, 3 min + ~1 min Q&A, 3 rooms. One track per submission, plus IFM optionally. Track prize depth scales with how many teams pick the track.

This is a catalog for manual ranking, not a decision. Read section 1 first (the ruler), score section 4 blind, then argue.

---

## 0. How this was built

The funnel is inverted on purpose: evidence of a pain → the motivation behind the phrase → a solution with a deterministic core → the LLM as interface or auditable component → the 3-minute scene. Sources: your handoff catalog (103 entries, used as the memory of what was already tried), the opening slides and Discord policies, the six voice notes, the Vento vault (core beliefs, method digest, F&B operator interviews), and five research sweeps tonight (IFM stack, prior art, past HackCMU winners, CMU/Pittsburgh evidence with live-probed APIs, travel and F&B evidence with open data).

Rules carried from the vault:

- Build on the motivation, not the phrase (the horse, the cart, the car).
- Enumerate constraints before solving; a problem without constraints is degenerate.
- Newly-cheap input × non-tech domain × market maker beats "AI agents" as a category.
- The demo shows the end of the pipeline and the wall (where the system refuses). Never "imagine that here…". Mock the interface if needed, never mock the result as real.
- What copies in two minutes was never a clause, it was bait.
- Memory: the handoff catalog is the taboo list. Related dead or unvalidated entries are cited on each card.

---

## 1. The ruler (written before the ideas)

### Must-haves
- **M1 Nameable person, recurring pain, evidence.** Behavior > request > opinion. A number or a quote with a source, not our intuition.
- **M2 Demo shows the end of the pipeline in under 3 minutes on real or honestly-labeled data.** Opens with the judge's own situation where possible (they are CMU students in Oakland at 4pm on a Saturday).
- **M3 Deterministic core.** A solver, simulation, matching, routing, or data pipeline that would work without the LLM; the LLM is an interface or an auditable component. This is the "not a ChatGPT wrapper" criterion made concrete.
- **M4 Fits one track literally.** The 50-word justification should write itself.
- **M5 Buildable to a demo slice by 4 people in ~12 hours with no step that depends on someone else's calendar.** No API keys we don't have, no manual approvals, no hardware we don't own.
- **M6 Uses a newly-cheap input.** Open small LLMs on-device, 512K context, JSON-schema output, tool calling, 40M free K2 tokens, or live open feeds verified tonight.

### Show-stoppers
- **S1 Solution first.** If the problem paragraph is thinner than the solution paragraph, kill it.
- **S2 Needs data we cannot get tonight and there is no honest synthetic fallback.**
- **S3 The wow depends on something we'd have to fake as real** (a push we can't send, a model we can't run, a prediction we can't defend).
- **S4 Judges already use a product that does this** with no defensible delta.
- **S5 Claims that die in Q&A** (predicting real humans, medical or legal advice).
- **S6 Already killed in the catalog** for a reason that still holds.

### Nice-to-haves
- **N1 K2 is load-bearing**, and the fleet story is real (small model local, big model remote).
- **N2 CMU-local**: the judges are the users.
- **N3 Someone would use it on Monday.**

### Newly-cheap inputs available tonight (verified)
| Input | Status |
|---|---|
| K2 Horizon 375B-A23B via `https://api.ifm.ai/v1` | OpenAI-compatible; 512K ctx; `response_format` json_object / json_schema; tools; streaming; `reasoning_effort` low/med/high with `reasoning_content` returned; 10M tokens/key/day. Only the 375B is hosted. |
| K2 Horizon 0.9B / 3.7B / 7B local | HF weights + GGUF; upstream llama.cpp needs the IFM fork branch; community MLX conversions exist for 0.9B and 32B (Mac). No browser port. Must spike before promising "on-device". IFM's own table: 0.9B = local mobile apps, 3.7B = doc summarization, 7B+uno = small agent chains, 32B = RAG/reasoning. |
| PRT GTFS static + GTFS-realtime | `rideprt.org/developerresources/GTFS.zip` and `truetime.portauthority.org/gtfsrt-bus/{vehicles,trips,alerts}` returned 200 with no key tonight. |
| WPRDC on-time performance by route | May 2026 weekday: 61C 36.2%, 61B 47.2%, 61A 51.5%, 28X 57.2%, 71C 58.1%, 71B 60.2%. CKAN datastore, no auth. |
| cmueats API v2 | `api.cmueats.com/v2/locations`: 45 locations, hours, coords, no auth. Only 10 of 37 with posted hours close at or after 22:00. No menus as data (PDF links only). |
| LaundryView | Per-machine status JSON, no auth (CMU key 7289). |
| Pittsburgh 311 | 968k rows, updated 4x/day, neighborhood + lat/long, no auth. |
| Allegheny food inspections | 405k violations, geocoded facilities, CC0; coverage ends 2025-07-31. NYC and Chicago equivalents keyless. |
| Open Food Facts, USDA FoodData Central, RecipeNLG | Allergen tags, nutrients, 2.2M recipes; keyless or free key. |
| BTS on-time CSV, FAA NAS status, aviationweather METAR/TAF, Amtraker | All keyless. Amadeus self-service is dead (Jul 2026). |
| The hackathon itself | ~200 hackers awake in one building until 16:00 is a seeded user base for anything multiplayer. |

---

## 2. Evidence inventory (what actually hurts, with sources)

**CMU / Oakland**
- Bus reliability: 61C 36% on time (May 2026 weekday, WPRDC). PRT's own target is 73%. The 2028 plan still contains "no service after 11 pm" and a 35% cut; the Sept 2025 emergency budget only deferred it.
- Night gap: NightSafe ends 1:15 am, SafeRider is 9 pm–3 am and one trip per night. A PRT bus struck a CMU student at Fifth & Neville in Feb 2026; the same intersection had a hit in Jan 2025; Fifth Ave is on the city's High Injury Network.
- Late-night food: only 10 of 37 campus locations are open past 10 pm. Tartan EdBoard 2024: "you can get a meal without talking to another human."
- Loneliness: 57% of ~44k US students report loneliness (Trellis 2024), 64.7% in Active Minds/TimelyCare 2025; international grad students show higher anxiety per unit loneliness. Tartan 2025: "if you feel like you haven't found your people here at Carnegie Mellon, you're not alone."
- Meal plan: Green plan $8,298/yr, ~292 blocks/semester (~$14.20/block), blocks expire each semester, no API for balances.
- Airport: 28X at 57% on-time, 40–60 min, $3.75; ride-split posts in student groups (unverified, Reddit blocked).
- Group plans: 76% of group trips never leave the chat; the ones that happen take 83 messages and 19 hours (Talker/Discover 2026 survey; PR-grade source).

**Food operators (Vento vault, named people)**
- Dana (Proper Food, 18 stores SF/NY): daily fresh dispatch by Excel + email chain, swaps between stores several times a day; "60 to 80% goes to donations, target 10%"; "a portion is 12, served 8, 4 is process waste"; "we could never really afford custom software… this is a potential game changer." Everything must end in R365; R365 has promised it for two years.
- Doug (China Live, 9 systems): labor forecast cut 44 h / $900 in one day (~$120k/yr vs ~$100k profit) and he still didn't use it. Discounts ~8% of sales: "is that intentional or is someone stealing from you?"
- Linda (California GM): a wrong compliance alert "generates million-dollar lawsuits"; said no even for free.
- Talissa (4 stores, BR): the legally published monthly schedule is "the fake schedule they make for show"; reality is reshuffled weekly; freelancers over 3 days become a violation.
- Industry: 42% of US operators not profitable in 2025 (NRA 2026 report, not the Economist); median pre-tax margin 2.8% full-service; foodservice waste $157B = 14% of sales (ReFED 2026); DOL recovered $42.7M back wages in food service FY2025, 4,088 cases, more than any industry; 51% of restaurant AP accounts had a flagged invoice (Ottimate 2026); 18–22% inspection fail rates in NYC/Chicago, temperature control the #1 violation.
- Allergies: 33M Americans; 7–10% of allergic travelers react while traveling, clustered in non-English countries.

**Travel**
- June 2026 US on-time 73.1%, cancellations 1.71%; auto-refund rule (3h domestic / 6h international) still in force, compensation rule withdrawn Nov 2025.
- Amtrak Pennsylvanian (Pittsburgh) 63.9% on time, average 41 min late; Amtraker API is free.

---

## 3. Idea cards — three per track

Each card: problem → motivation → solution → deterministic core → K2 role and which model → 3-minute scene → premise chain and weakest clause → precedent → what survives copying → overnight slice → catalog memory.

### OPTIMIZATION

#### O1 · Leave By — reliability-aware departure times for Oakland
- **Problem.** The 61C is on time 36% of the time; the timetable is fiction, so students pick departure times blind and either miss things or leave 40 minutes early. Every judge in the room rides these buses.
- **Motivation behind the phrase.** "When is the bus?" really means "when do I have to leave to be there by 4:10 with 90% confidence?"
- **Solution.** Enter a deadline and a destination; the map shows, for every stop around you, the latest departure that still makes it with P ≥ 0.9, and which route to trust. Live vehicles move on the map.
- **Deterministic core.** Time-dependent routing over GTFS with empirical delay distributions per route × hour (WPRDC OTP as the prior, GTFS-RT samples logged tonight as the likelihood). Optimizing departure time subject to arrival-probability constraint is the optimization.
- **K2 role.** 375B as the natural-language intake and explainer with tool calls into the router ("the 61C is 36% on time this hour; the 71B at 8:12 gets you there at 92%"). Fleet story: 3.7B locally for the same intake if the spike works. K2 is not load-bearing here; honest N1 = medium.
- **3-minute scene.** Judge says "I need to be at Tepper by 4:10." Map paints leave-by times across Oakland and Squirrel Hill; live buses crawl in; the wall: the tool says "no route reaches 90% from Squirrel Hill after 3:35; here is the 70% option."
- **Premise chain.** Delay distributions per route-hour are estimable from OTP + a night of RT logging → routing engine handles transfers correctly → the map is legible → judges feel it. **Weakest clause:** per-trip delay distributions from one night of samples are thin; must label them.
- **Precedent.** Last Trip London, Transit app's "LAST" badge; Tokyo Last Train Map for the map language. None optimize against a reliability-weighted deadline.
- **Survives copying?** The data pipeline (OTP + RT logger + calibrated distributions) is the asset; the UI is not.
- **Overnight slice (est. 6–8 h, 2 people).** Start a GTFS-RT logger now (every 30 s to a file, zero risk). Load static GTFS, build the scan (the Cinderella backward scan already exists on Pietro's machine, ~0.05 s per target), fit delay priors from OTP, render a Leaflet map. Shares the engine with T1.
- **Catalog memory.** Last Train (killed on "credible probabilities require a validated delay model", which WPRDC + RT now provides), Curfew, Cinderella.

#### O2 · Dispatch — commissary-to-store allocation that cuts process waste
- **Problem.** Dana runs 18 stores from one commissary with an email chain and Excel; portions are made 12, served 8, wasted 4; 60–80% of surplus goes to donations against a 10% target. Foodservice waste is 14% of sales industry-wide. R365 has promised the feature for two years; PreciTaste sells it to chains only.
- **Motivation.** Not "a forecast"; a plan for tomorrow morning's van that a kitchen manager will actually follow and that lands in R365.
- **Solution.** Paste the dispatch thread and the void export; get tomorrow's per-store production and dispatch plan, with the expected waste and the swaps that avoid it.
- **Deterministic core.** Newsvendor per store × item with a service-level slider, plus a transshipment LP for mid-day swaps between stores. Objective: minimize expected waste + stockout cost.
- **K2 role.** 375B turns the dirty email/Excel chain into structured demand signals (JSON schema) and explains the plan in the manager's words; 3.7B locally for the daily thread summary (IFM's own "doc summarization" use case). The wall: items with no history are flagged "no data, not forecast."
- **3-minute scene.** Open with the real thread format (anonymized). Show the van plan, the projected waste bar dropping, then a 2pm swap between two stores. Then the wall.
- **Premise chain.** Synthetic sales are plausible enough → the LP is visibly better than "same as last week" → student judges accept an operator problem they don't have. **Weakest clause:** the last one; usefulness is real but not felt in the room.
- **Precedent.** Afresh (grocery), PreciTaste (chains), Corporación Favorita forecasting.
- **Survives copying?** The extraction-from-mess plus the swap LP; a forecast alone does not.
- **Overnight slice (5–7 h, 2 people).** Synthesize 18 stores × 30 items × 60 days; newsvendor + swap LP with `scipy`/`pulp`; K2 extraction prompt on a realistic thread; one chart.
- **Catalog memory.** Mise, Ninety-Four Cents (LP with explicit assumptions). Vento verdict on F&B: "entry door and network, not market" — fine for a hackathon, weak as a startup.

#### O3 · Wind Tunnel — find the least-harmful transit cut and hear the city react
- **Problem.** PRT's standing 2028 plan cuts 35% of service and ends buses at 11 pm for 180k residents; the decision is made on budget lines and public-comment meetings that sample the loud. Nobody can see, before the vote, which cut hurts fewest late-night riders, or how neighborhoods would react.
- **Motivation.** Policymakers want foresight and arguments they haven't heard, cheaply, before rollout. That is a real want; "predicting the public" is not on offer and we must say so.
- **Solution.** Type the constraint ("save $X, no service after 11 pm") and the optimizer searches the space of cuts (which routes, which hours) minimizing access loss computed from GTFS; then 50 grounded Pittsburgh personas (built from neighborhood-level OTP, 311, and stop-usage data) deliberate on the proposal in a social graph for a few rounds. The screen shows the Pareto front (savings vs access loss) and the opinion graph animating, with the quote that flipped each node.
- **Deterministic core.** Access-loss metric from time-respecting GTFS reachability (Empty Chairs / Hard Stop in the catalog) + a search over cut configurations (greedy/evolutionary). The agent layer is qualitative and labeled as such.
- **K2 role.** Load-bearing. 375B as policymaker/mutation operator with `reasoning_content` shown; villagers on 375B at low reasoning effort with JSON output, or 3.7B/7B locally if the spike works (the fleet story IFM's own page invites: "simulating human behavior through AI agents"). 512K context holds the entire town history.
- **3-minute scene.** "PRT must cut 35%." The frontier appears; pick a point; the map shows what disappears after 11 pm; the village argues; a Squirrel Hill nurse flips a Shadyside student; the optimizer amends. The wall: "protocol slider" showing the result moves when who-talks-to-whom changes, which is the main critique of these sims turned into a feature.
- **Premise chain.** GTFS cut simulation is tractable tonight → agent reactions are interesting, not just consensus mush → judges accept "explores arguments, does not predict." **Weakest clause:** consensus collapse and sycophancy; mitigate with persona-anchored priors and temperature, and by showing the divergence.
- **Precedent.** MiroFish, AgentSociety (UBI experiment), Emergence World (cross-model divergence), Simile. None has a live demo where the optimizer and the society are in one loop.
- **Survives copying?** The access-loss engine + the optimization loop; the village alone is a 2023 idea.
- **Overnight slice (8–10 h, 3 people).** Reuse the reachability scan; define 8–12 candidate cuts; compute access loss; persona generation cached once; 12 villagers × 3 rounds live, 50 × 5 rounds pre-run and replayed; force graph with D3.
- **Catalog memory.** Hard Stop, Empty Chairs, Articulation; Slime Mold Transit Authority.

**Runner-up (Optimization):** *Schedule Repair* — minimum-edit repair of a messy weekly schedule to compliance (breaks, overtime, freelancer-day limits); DOL $42.7M back wages; Talissa's "fake schedule"; Linda's lawsuit fear becomes the wall (cite the statute, never auto-apply). Strong evidence, weak visual, legal-adjacent claims.

### MULTIPLAYER

#### M1 · Cast — the same line drops in every phone in the circle at the same time
- **Problem.** Friend groups slide into logistics-only chat and autopilot; 57–65% of students report loneliness; 76% of group plans die in the chat, the survivors cost 83 messages. BeReal proved that simultaneity bonds people (70M DAU) and died as a one-trick photo feature. Timeleft/222 stop at the dinner; Friday and Howbout optimize convenience, not novelty.
- **Motivation.** Not "an icebreaker." A shared reason to talk today that isn't logistics, and a plan that actually leaves the chat.
- **Solution.** Every day at the same minute, everyone in the circle gets the same cast with a synchronized 10-second countdown. Answers are hidden until everyone has cast (BeReal's rule applied to answers). Two modes: *fishing* (people who barely know each other, discovery prompts) and *catch* (close friends, a concrete plan that deliberately breaks the group's routine, going live only when a quorum pulls the line). The cast is conditioned on the circle's whole history.
- **Deterministic core.** Quorum commitment (plan revealed only above threshold), routine-deviation scoring from past check-ins, reveal gating, graduation state machine from fishing to catch. If wired to O1/T1, the wall: no plan that someone can't get home from.
- **K2 role.** 375B generates casts from the circle memory (512K context = the entire history in one call, with reasoning shown on the big screen as "why this cast"). 0.9B on-device for a privacy mode if the MLX spike works ("local mobile apps" is IFM's stated 0.9B use case); otherwise say "laptop-class local model" and not "phone."
- **3-minute scene.** Four phones on the desk buzz at once with the reel sound. Countdown. Cast: "A place in Pittsburgh you've walked past 50 times and never entered." Answers land, hidden, then reveal. Catch: "Thursday 7pm, Nationality Rooms, Pietro picks the room." Lines pull, tension rises, 3 of 4, caught, calendar invite. The wall: the reasoning panel shows it rejected a plan because two members had answered "Tepper" three days running.
- **Premise chain.** Sync + reveal is theatrical in a classroom → memory-conditioned prompts feel different from generic ones in one demo → judges don't file it as a wrapper. **Weakest clause:** the third; the mechanics and the reasoning panel carry it or nothing does.
- **Precedent.** BeReal (sync), Gas (dead), Locket/Yope (async), Friday (weekly planner agent), Bumble BFF AI icebreakers (1:1).
- **Survives copying?** Circle memory + quorum + routine-deviation together; the daily prompt alone copies in an hour.
- **Overnight slice (6–8 h, 2–3 people).** Next.js + WebSocket room, PWA on 4 phones, server-fired cast, reveal gating, quorum bar, K2 prompt with a seeded 14-day circle history, big-screen reasoning panel. Push notifications on iOS are not needed for the demo (app open, sound on).
- **Catalog memory.** Quorum, Abilene/One Person Away, Rare Thread, Last Round.

#### M2 · Walk Out Together — leave the building with someone heading your way
- **Problem.** NightSafe ends 1:15 am, SafeRider runs one trip a night; a PRT bus hit a CMU student at Fifth & Neville in Feb 2026, a year after a hit at the same corner; Fifth is on the High Injury Network. People leave Gates and Hunt at 2 am alone because asking in a group chat feels needy.
- **Motivation.** Not "a safety app." Zero-friction pairing with someone already leaving in the same direction, right now, without the social cost of asking.
- **Solution.** Press "leaving Gates, toward Shadyside" and the app pairs you with people leaving within 10 minutes along your direction; it proposes the lit route that avoids High-Injury-Network crossings; both phones confirm meeting at the door.
- **Deterministic core.** Time-windowed matching on direction and departure; routing on OSM with a penalty layer from WPRDC crash data; co-location confirmation.
- **K2 role.** Minimal, and honestly so: 0.9B on-device to parse "leaving now-ish toward Squirrel Hill" into a structured request. Submit without IFM or with a thin IFM story.
- **3-minute scene.** Two judges' phones: one presses leave, the other gets "someone is leaving Gates in 4 min toward Forbes & Murray"; the route draws, avoiding Fifth & Neville; both confirm at the door. The wall: no one within 10 minutes, so it shows the SafeRider window and the last 61 that is actually predicted to come (from O1's engine).
- **Premise chain.** Students would press it → density at 2 am is enough → the hackathon (200 people leaving the same building) proves density for the demo. **Weakest clause:** real-life density outside a hackathon.
- **Precedent.** Companion, SafeWalk-style apps; campus escort services. The delta is direction-matching plus the crash-data route, not the panic button.
- **Survives copying?** Thin. The value is local density, which a university, not a hackathon, has.
- **Overnight slice (4–6 h, 2 people).** PWA, WebSocket presence, greedy matching, Leaflet with a crash-penalty overlay.
- **Catalog memory.** Hermit, Cold Trail, Earshot (physical proximity concerns).

#### M3 · Town Hall — join the village and see your argument travel
- **Problem.** Student town halls and PRT public-comment meetings are attended by the few and dominated by the loud; most students never weigh in on dining changes, shuttle cuts, or building hours, and never see whether their argument changed anyone.
- **Motivation.** Low-stakes participation with visible consequence: "did what I said move anyone?"
- **Solution.** The judges' phones join a live deliberation as residents alongside 50 K2 personas on a real local policy (e.g., "Tepper closes at midnight"). Each human comment enters the graph; the screen shows which agents it flipped and why, and how the human trajectories differ from the agents'.
- **Deterministic core.** Opinion-dynamics graph with logged influence edges (who convinced whom, with the quote), aggregate metrics per round.
- **K2 role.** Load-bearing: 375B villagers with JSON stance + reason + target, reasoning traces visible.
- **3-minute scene.** Policy on screen; villagers start arguing; a judge types "grad students work nights"; three nodes flip and glow; the metric moves. The wall: the model flags when a human comment contains a claim it cannot verify and marks that edge dotted.
- **Premise chain.** Agents respond to human input non-trivially → the graph reads at a glance → "participation" is a problem judges believe. **Weakest clause:** the problem is thinner than O3's; this is the multiplayer skin of the same engine.
- **Precedent.** Human-agent interaction in synthetic social networks (arXiv 2502.01340, no product); Pol.is for real deliberation.
- **Survives copying?** Only together with O3's engine.
- **Overnight slice.** O3 + a phone join flow (2 h on top of O3).
- **Catalog memory.** Spoiler, No Winner, Kingmaker (all rejected for "cycles/paradoxes may not appear"; here the mechanic does not depend on a paradox).

### TRAVELING

#### T1 · Night Map — what you can still do tonight and get home from
- **Problem.** After 11 pm the network thins; the 2028 plan removes it entirely; NightSafe stops at 1:15. Students pick a destination without knowing when their last realistic way home leaves, and groups meet where one person is stranded.
- **Motivation.** "Where can we go tonight" means "where can all of us still get home from, at what time, with a bus that will actually show."
- **Solution.** Drop your home pin (or four pins for a group); the map shows the region you can still return from, shrinking as the clock advances; venues inside the region from cmueats/OSM; the group version shows the intersection and who shrinks it.
- **Deterministic core.** Backward time-respecting scan over GTFS (exists, ~0.05 s per target), reliability-weighted with O1's delay priors; intersection over group members; Shapley-style attribution of who shrinks the region (shap.py exists).
- **K2 role.** 375B as an agent with tools `feasible_region(t)`, `venues_in(region)`, proposing the venue and time in one sentence; this is a real tool-use story. Medium load-bearing.
- **3-minute scene.** Four pins; 10 pm region; the clock scrubs to 12:30 and Lawrenceville disappears; the K2 agent picks the venue inside the remaining region and names who's the constraint. The wall: at 1:20 the region is Oakland only, so it says so.
- **Premise chain.** Engine reproduces → walking assumptions don't dominate → the group shrink is legible. **Weakest clause:** radius sensitivity (the 18:09 vs 01:53 example in the handoff); must state assumptions on screen.
- **Precedent.** Tokyo Last Train Map (station-oriented), Last Trip London. Group intersection with attribution is not in either.
- **Survives copying?** The calibrated engine; the map language is public.
- **Overnight slice (6–8 h, 2 people; shares engine with O1).** Recover the scan from Pietro's scratchpad or rewrite it (RAPTOR-ish backward, ~150 lines); grid the city; Leaflet with a time scrubber.
- **Catalog memory.** Cinderella (interesting, not quite there), Overlap/Last Call, Dead Weight, Curfew corrections 1–5 in the handoff.

#### T2 · Split the Ride — airport pooling that forms itself
- **Problem.** PIT is far, the 28X is on time 57% of the time, and every break the group chats fill with "anyone flying out Dec 18 around 2?" Coordination is manual and most requests go unanswered.
- **Motivation.** Get to the airport cheaper and with certainty, without hunting for a match.
- **Solution.** Enter flight or time window and pickup area; the pool forms automatically as others enter; it shows the fare split, the pickup point, and, live, whether the 28X is actually predicted to arrive in time (GTFS-RT).
- **Deterministic core.** Interval matching with capacity and detour limits; fare split by shared distance; 28X reliability from O1's data.
- **K2 role.** Thin: parse free-text posts ("flying Dec 18 2pm, Morewood") into structured requests with 0.9B/3.7B locally. Submit without IFM or with a small story.
- **3-minute scene.** Four phones enter windows; two pools form; one shows "28X predicted 14 min late, pool anyway"; the fare split appears.
- **Premise chain.** Students enter requests before the day → pools have ≥2 people → fare split is fair enough. **Weakest clause:** liquidity; a hackathon can't prove it, the winter break can.
- **Precedent.** Baggage Claim in the catalog; university rideshare boards; Uber shared rides (dead in most cities).
- **Survives copying?** Thin outside the campus community.
- **Overnight slice (4–5 h, 2 people).**
- **Catalog memory.** Baggage Claim, Split.

#### T3 · Will I Make It — connection risk and what you're owed
- **Problem.** US on-time is 73%, 1.7% cancelled; late-aircraft and NAS delays are the main causes; people learn about a missed connection at the gate. The 3h/6h automatic-refund rule exists and almost nobody knows when it applies. Locally: the Amtrak Pennsylvanian is 64% on time, 41 minutes late on average.
- **Motivation.** Before booking or on the day: "what's the probability I make this connection, what should I do now, and what am I owed if it breaks."
- **Solution.** Enter an itinerary; the tool computes make-probability from BTS delay distributions by carrier × airport × hour, adjusted by live FAA NAS status and METAR/TAF; on disruption it states the refund eligibility with the rule quoted.
- **Deterministic core.** Empirical delay distributions and connection-time convolution; live status overrides.
- **K2 role.** 32B-class RAG use: apply the DOT rule text to the case and quote it; 375B via API tonight. Medium load-bearing. The wall: "not eligible; here is the sentence that says so."
- **3-minute scene.** Judge's holiday itinerary; PIT→ORD→home; 41% chance of making the 45-minute connection today; the alternative at 88%; then the refund panel.
- **Premise chain.** BTS CSVs are usable overnight → live layers add signal → judges have flights soon. **Weakest clause:** we cannot validate the probability today; label as historical.
- **Precedent.** Last Train's stochastic routing idea (killed for lacking a delay model), Hopper, Google Flights "often delayed."
- **Survives copying?** Weak; the data is public and Google already shows "often delayed." The refund-rule layer is the delta.
- **Overnight slice (5–7 h, 2 people).**
- **Catalog memory.** Last Train, Right of Passage (travel version: quote presence ≠ legal interpretation).

**Runner-up (Traveling):** *F-1 travel check* for international students (real anxiety, CMU OIE warnings) — legal interpretation risk and no structured source; RAG over state.gov with quotes only. Show-stopper S5 unless framed as "quotes, never advice."

### FOOD

#### F1 · Table for Now — a table with strangers in the next 15 minutes
- **Problem.** Only 10 of 37 campus spots are open past 10 pm; "you can get a meal without talking to another human"; 57–65% of students lonely. The hackathon itself has 200 people eating alone at their laptops at 2 am.
- **Motivation.** Not "find friends." Eat in the next 15 minutes with someone, at a place that is actually open, with one sentence to start.
- **Solution.** Press once; within 15 minutes you're matched to 2–3 others heading to the same open place (cmueats hours + coords); the table gets one opening line from an on-device model based on opt-in interests. The table closes with "done" from two phones at the same location.
- **Deterministic core.** Open-location filter by live hours, small-group matching with a walking-time constraint, co-location close.
- **K2 role.** 0.9B on-device generates the opening line (privacy story; interests never leave the phone) if the spike works; 375B otherwise, labeled. Light but honest.
- **3-minute scene.** Run it for real during the hackathon overnight; the demo opens with the actual tables formed at 1 am (the buyer's own data). Then a live match among judges' phones with cmueats showing what is open at 4:30 pm.
- **Premise chain.** Hackers use it tonight → matches happen → judges see real usage. **Weakest clause:** we must ship by ~2 am to collect real tables.
- **Precedent.** Timeleft (weekly, curated, strangers), Bumble BFF, Rare Thread in the catalog.
- **Survives copying?** Thin as a product; strong as a demo.
- **Overnight slice (4–5 h, 2 people).** PWA + WebSocket + cmueats; ship early, post the link in the hackathon Discord.
- **Catalog memory.** Rare Thread, Roundtable, Overlap.

#### F2 · Pre-Inspection — what the inspector will flag, before they come
- **Problem.** 18–22% of inspections fail in NYC/Chicago; temperature control is the #1 violation; Allegheny has 405k violation rows; immigrant-owned independents get no prep tooling (Zenput/Jolt sell to chains). Chicago's open model found violations 7.5 days earlier.
- **Motivation.** Not "compliance software." A one-page checklist of the 8 things most likely to be flagged in *this* kind of kitchen, in plain language, before the visit.
- **Solution.** Type or paste your menu and a few kitchen facts; get the ranked list of violations for facilities like yours (type, cuisine, neighborhood, season), each with the real violation text and frequency, and a checklist.
- **Deterministic core.** Violation-frequency model from the Allegheny dataset (facility type × menu categories × month); nearest-neighbor over facility descriptors.
- **K2 role.** 375B maps a menu to risk categories with JSON output and writes the checklist in the operator's language (multilingual). The wall: no claim without a row in the dataset; stale coverage (ends 2025-07) displayed.
- **3-minute scene.** Pick an Oakland restaurant the judges know; show its real history; then the predicted next flags and the checklist in Spanish and English.
- **Premise chain.** Dataset loads → menu-to-category mapping is sensible → judges accept an operator user. **Weakest clause:** the judges don't own a restaurant; usefulness is real, not felt.
- **Precedent.** Chicago food-inspection model (city repo), Blueroll grades.
- **Survives copying?** The dataset is public; the delta is the menu-conditioned prior and the language.
- **Overnight slice (5–6 h, 2 people).** Load CSV, frequency tables, nearest neighbors, K2 mapping, one page.
- **Catalog memory.** Consumer Alert (rejudge unfinished; "old violations are not current conditions" still applies, so present as priors).

#### F3 · Chef Card — a menu in any language, decoded for your allergy
- **Problem.** 33M Americans have food allergies; 7–10% of allergic travelers react while traveling, clustered in non-English-speaking countries; sesame became the 9th major allergen in 2023 and menus rarely disclose. International students at CMU eat out in a language they may not read, and travel home.
- **Motivation.** Not "an allergy app." Point at a menu, know which dishes are safe, likely, unknown, and hand the kitchen a card in their language.
- **Solution.** OCR a menu photo (tesseract, since K2 is text-only), K2 maps each dish to ingredient priors from RecipeNLG/Open Food Facts/FDC, outputs per-dish risk with confidence and the reason, and generates a chef card in the local language.
- **Deterministic core.** Ingredient-prior lookup and allergen tag matching; confidence from prior coverage; "unknown" is a first-class answer.
- **K2 role.** Load-bearing and well-fitted: multilingual JSON output over a long menu; 3.7B locally for the offline-abroad story if the spike works.
- **3-minute scene.** A judge's real allergy; a PDF menu from cmueats and a Portuguese menu; the three-color dish list; the wall: two dishes marked unknown with "ask: does the sauce contain sesame?" in Portuguese.
- **Premise chain.** OCR is good enough on a phone photo → priors cover common dishes → judges trust a graded answer. **Weakest clause:** any medical-sounding certainty; keep confidence visible and the "ask the kitchen" default.
- **Precedent.** Equal Eats (paid cards), Fig (packaged foods), HappyCow (no API). Menu-level decoding with confidence is the delta.
- **Survives copying?** Moderate; the multilingual pipeline is reproducible, the graded honesty is the product.
- **Overnight slice (5–6 h, 2 people).**
- **Catalog memory.** Five Meals / Blind Spot (do not claim diagnosis), The Common Note (flavor data exists locally).

**Runners-up (Food):** *Invoice price-creep detector* (51% of AP accounts flagged; OCR + ERS/BLS benchmarks; operator-only), *Meal-block burn planner* (no balance API, manual entry), *Group order under restrictions* (Roundtable/Blast Radius; menus lack ingredients).

---

## 4. Scoring matrix (fill blind, then argue)

Weights adapted from the vault's decision funnel. Score 0–5 per cell; multiply; sum. Each person scores alone first.

| Weight | Criterion | Question |
|---|---|---|
| 3 | Pain evidence | Is the problem paragraph stronger than the solution paragraph? Behavior > request > opinion. |
| 3 | 3-minute scene | Does the end of the pipeline and the wall show on real or honestly-labeled data? |
| 2 | Deterministic core | Would it work without the LLM? Is the difficulty real? |
| 2 | Originality / Red Queen | What survives a two-minute copy? |
| 2 | Track relevance | Does the 50-word justification write itself? |
| 2 | Build risk (inverse) | Demo slice by 12:00 with no external dependency? |
| 1 | IFM load-bearing | Is K2 core, and is the fleet story true? |

| Card | Track | Pain ×3 | Scene ×3 | Core ×2 | Red Queen ×2 | Relevance ×2 | Risk ×2 | IFM ×1 | Total |
|---|---|---|---|---|---|---|---|---|---|
| O1 Leave By | Optimization | | | | | | | | |
| O2 Dispatch | Optimization | | | | | | | | |
| O3 Wind Tunnel | Optimization | | | | | | | | |
| M1 Cast | Multiplayer | | | | | | | | |
| M2 Walk Out Together | Multiplayer | | | | | | | | |
| M3 Town Hall | Multiplayer | | | | | | | | |
| T1 Night Map | Traveling | | | | | | | | |
| T2 Split the Ride | Traveling | | | | | | | | |
| T3 Will I Make It | Traveling | | | | | | | | |
| F1 Table for Now | Food | | | | | | | | |
| F2 Pre-Inspection | Food | | | | | | | | |
| F3 Chef Card | Food | | | | | | | | |

Cross red-team rule from the vault: each person writes three falsifiable objections to someone else's top pick, never defends their own. Output: one priority, one backup; the rest die with a reason written down.

Families that share an engine (build one, get two): O1 + T1 (+ M2's fallback and M1's wall) share the GTFS reliability engine. O3 + M3 share the village. F1 + M1 share the room/WebSocket shell.

---

## 5. Spikes to run before anyone builds (each ≤ 20 min)

1. **K2 API**: get the key at `platform.ifm.ai/r/hackcmu`, call `IFM/K2-Horizon-375B-A23B` with `response_format: json_schema` and `reasoning_effort: low`; measure latency and the daily cap header. Every LLM card depends on this.
2. **Local K2 on a Mac**: `pip install mlx-lm` and try the community 0.9B MLX conversion; if it answers in under 2 s, the "on-device" story is true for M1, F1, F3, O2. If not, say "laptop-class local model" or drop it.
3. **GTFS-RT logger**: fetch `truetime.portauthority.org/gtfsrt-bus/vehicles` every 30 s to a file. Costs nothing, and every hour not logged is delay data O1/T1/M2/T2 won't have.
4. **Recover Pietro's scan**: check whether `scan.py`, `gtfs/`, `oak_grid.json`, `shap.py` survive in the temporary scratchpad on Pietro's machine; copy them out now.

---

## 6. Morning consult — one falsifying question per family

- **Transit family (O1/T1/M2/T2)** to mentors: "Would you trust a 90%-confidence leave-by time computed from one night of real-time samples plus monthly on-time rates? What would make you not trust it?"
- **Village family (O3/M3)** to the IFM table: "Is a policy optimizer that uses a synthetic population as the qualitative layer, with the protocol exposed as a slider, the kind of 'simulating human behavior' you mean on your K2 page? What would you need to see to call it non-trivial use of reasoning?"
- **Cast (M1)** to judges: "If four phones buzz at once and reveal only after everyone answers, is that a product or a party trick? What would make you use it Thursday?"
- **Operator cards (O2/F2)** to any mentor who has run a kitchen: "Rank these three pains: waste in dispatch, inspection prep, wage compliance."
- **Food/allergy (F3)** to an international student: "Would you show the kitchen a card generated by this? What would stop you?"
- **Table for Now (F1)**: don't ask; ship it before 2 am and read the log at 9 am.

---

## 7. What was deliberately not re-derived

From the catalog's memory, not reopened: crispness meter (rejected by you), K=1 / The Taster / Five Meals headline claims (information bounds fail), Exchange Rate agency version (rejudge 28.5), physical audio positioning games (Marco, Green Light, Earshot ranging), Pixel Mob (room too small), K2Zip/Horizon Ladder (prior art, heavy), Menujack (security demo, weak Food relevance).
