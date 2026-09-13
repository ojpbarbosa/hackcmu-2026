# Hackathon playbook

A handoff from HackCMU 2026 (Sep 12–13, 2026). Familiars did not place in any track or sponsor prize. This file is the structured version of what we learned, written so the next hackathon starts from here instead of from zero.

## 1. What happened, honestly

| Phase | What we did | Hours | What it cost |
| --- | --- | --- | --- |
| Ideation | Problem-first brainstorm, ~15 ideas across four tracks, four mockups, four apps built overnight, then a pivot to one product | ~9 | The single most expensive phase. Four apps meant four half-products. The pivot to Familiars happened after the overnight build. |
| Build | Next.js on Vercel, Upstash, IFM K2, ElevenLabs, Querit; polling rooms; procedural creatures; wiggle-to-cast | ~10 | Real technical depth, but most of the last 6 hours went to bugs a demo would surface in minutes (lost writes under concurrency, layouts on real phones, sensor thresholds, provider payload shapes, function timeouts). |
| Deck and video | 12-slide deck built from mockups with narration; light theme, tech strip per slide | ~2 | Too wordy, too long, not personal. Winning decks and videos were direct, human, and got to the point in five seconds. |
| Pitch | Three minutes with judges, unrehearsed | 0 prep | It went badly. The idea needed thirty seconds we did not have a script for. |
| Demo | Laptop demo that depended on the wiggle and on a second user | – | A demo that needs another person, a phone sensor and a live model is three ways to fail in front of a judge. |

**The meta we missed.** TartanHacks winners were messaging and social media. HackCMU's Multiplayer track meant multiplayer games and innovation, not agentic AI social media. We built for the track name, not for what the track rewards.

**The team thought.** "AI agents that meet on your behalf" sounded great inside the group and landed flat outside it. Nobody outside the group heard the pitch until the judges did.

## 2. Root causes

1. **No external validation before committing.** The group bubble biased itself toward an idea that was not resilient. One two-minute reaction from a stranger is worth an hour of in-group ideation.
2. **Ideation ran too long and too wide.** Four ideas built in parallel is a portfolio, not a hackathon entry.
3. **We did not read the meta.** Past winners, judges' backgrounds, sponsor prize wording and the track's real meaning were never studied.
4. **Demo-last instead of demo-first.** The demo path was decided by what got built, not the other way round.
5. **The pitch was never rehearsed.** No thirty-second version, no three-minute version, no Q&A list.
6. **The video and deck were generated, not human.** Slides explained; winners showed.
7. **Scope sprawl into the final hours.** New features (directed casts, scout tuning) kept landing at hour 22 when the last hours should be rehearsal and polish of one path.
8. **No mid-hackathon feedback loop.** No sponsor tables visited, no Discord pulse, no mentor pitch.

## 3. The rule that fixes most of it

> **Before you build it, try to sell it.** Speak it aloud to a friend outside the group. How does it sound when you step outside? Do other people like it? A stranger's one to two minute reaction is worth an hour of ideating inside a bubble that keeps getting more biased and keeps building in isolation for solutions that are not it. Before committing: would they buy it? Gauge early, adapt product and pitch as needed.

Operationalized: no idea gets past hour two without three pitches to people outside the team, and the idea we commit to is the one that got the best *unprompted* reaction, not the one we liked most.

## 4. Ground plan for a 24-hour hackathon

Times are hours from kickoff. Each checkpoint has an output; if the output does not exist, stop building and produce it.

| Time | Do | Output |
| --- | --- | --- |
| Before | Read last two years of winners per track and per sponsor prize. Read the judges' bios. Write the "meta" in five lines: what each track actually rewards. | `meta.md` |
| 0:00–0:45 | Ideate against the meta, problem-first, three ideas maximum. For each: one-sentence pitch, the five-second understanding test, the demo in one line. | Three one-liners |
| 0:45–1:30 | **Sell test.** Each idea pitched aloud to three people outside the team (other teams, mentors, sponsors at their tables). Record reactions verbatim. | Reaction notes |
| 1:30 | **Commit** to one idea. Write the thirty-second pitch first, then the demo script (what the judge sees, in order, in ninety seconds). | `pitch.md`, `demo.md` |
| 1:30–2:30 | Design only the screens the demo script needs. One product, one journey. | Mockup |
| 2:30–12:00 | Build the demo path end to end before anything else. Single-device fallback for every multi-user or hardware moment. Deploy by hour 6 and keep it deployed. | Working demo path |
| 12:00 | **Mid-point pitch.** Pitch and demo to two sponsors and one mentor. Post in the Discord for reactions. Adjust product and pitch. | Feedback notes |
| 12:00–18:00 | Second pass: polish the demo path, add the one feature judges asked about. Nothing else. | – |
| 18:00 | **Feature freeze.** Record the video on a phone, human voice, one take if possible. Deck of at most six slides with big words. | Video, deck |
| 20:00–22:00 | Rehearse the thirty-second and three-minute pitches five times each, with a timer. Write the ten likely questions and answers. Assign who says what. | Rehearsed pitch |
| 22:00–24:00 | Fix only what breaks the demo. Charge devices, cache anything that depends on a network or a key, prepare the offline fallback. | Demo kit |

## 5. Principles

- **Five-second test.** If the idea is not understood in five seconds by someone tired, it is not ready. The pitch is the product until the demo starts.
- **Demo first.** The demo script is written before the code. Everything built must appear in it. If it cannot be shown in ninety seconds, it is not built.
- **Never depend on another person, a sensor or a live model in the demo path.** Keep them as the impressive extra with a one-tap fallback: a "cast" button beside the wiggle, a seeded second user, cached model output labeled as such.
- **One product.** Four mockups were fun and cost the night. Build one journey.
- **Human beats generated.** A phone video of a person using the thing, speaking plainly, beats a rendered deck. Slides carry six words each.
- **Match the meta, then differentiate.** Win the track's actual game (a multiplayer track wants a room full of people playing), then add the twist.
- **Feedback beats ideation.** Every hour of building without an outside reaction is an hour at risk.
- **Sponsors are judges you can talk to early.** Visit their tables in the first two hours with the one-liner. Ask what would win their prize. Build that.
- **Freeze early.** The last six hours are for the pitch and the video, not features.

## 6. Pitch templates

**Thirty seconds.**
1. The moment (one sentence, a scene everyone recognizes).
2. What we built (one sentence, the noun and the verb).
3. What the judge will see (one sentence pointing at the demo).
4. Why it wins this track (one sentence in the track's own words).

**Three minutes with judges.**
- 0:00 thirty-second pitch, then hand them the device.
- 0:30–2:00 the demo script, narrated by one person while another drives. Never explain the stack unless asked; show the outcome.
- 2:00–2:30 how it works, three named technologies, one sentence each.
- 2:30–3:00 what is next, and the one question we want them to ask.

**Ten questions to prepare.** Why would anyone use it twice. What happens with one user. How is it different from X. What did you build in 24 hours versus before. What breaks at scale. Why this track. What did the sponsor tech actually do. What was hardest. What would you cut. Who is it for, specifically.

## 7. Checklists

**Pre-hackathon**
- [ ] Winners of the last two editions, by track and by sponsor, with one line each on why they won.
- [ ] Judges' bios; sponsors' prize wording copied verbatim.
- [ ] Starter kit deployed and tested: framework, hosting, shared state, model provider, screenshots script, video capture setup.
- [ ] Env keys collected before the event, stored in the hosting provider, verified with a health endpoint.

**First two hours**
- [ ] Meta in five lines.
- [ ] Three one-liners, each with the five-second test passed by an outsider.
- [ ] Nine outside reactions recorded (three per idea).
- [ ] One idea committed. Pitch and demo script written before code.

**Mid-point**
- [ ] Deployed demo path runs on one device with no other person present.
- [ ] Pitched to two sponsors and one mentor; notes recorded; pitch adjusted.
- [ ] Discord post with a screenshot; reactions read.

**Final six hours**
- [ ] Feature freeze announced in the team chat.
- [ ] Video recorded on a phone by a person, under ninety seconds, uploaded and linked.
- [ ] Deck of at most six slides, six words per slide, exported and opened on the presenting machine.
- [ ] Thirty-second and three-minute pitches rehearsed five times with a timer, roles assigned.
- [ ] Devices charged, network fallback, cached model outputs, the demo room code written down.

## 8. What worked technically (keep) and what cost time (avoid)

**Keep**
- Next.js on Vercel with a shared-state store and polling rooms: two phones stayed in sync with no socket infrastructure.
- One `act()` reducer per app with a single model gateway that reports which model actually answered. Honest attribution was easy to explain to sponsors.
- Mockup HTML with per-species SVG symbols and CSS variables, exported to frames by headless browser, reused for the deck and as the visual contract for the build.
- Parallel build lanes with shared contracts written first; four agents landed a full app in under an hour with zero type errors.
- A debug endpoint for every third-party provider. Bisecting Querit's rejected field through production took ten minutes; guessing would have taken an hour.

**Avoid**
- Building every idea before choosing. The four-app night was the biggest single loss.
- Slow model calls inside a read-modify-write loop. Every wiggle bumped the room version and dropped the slow hatch. Memoize per action or split into prepare and commit.
- Layouts verified only in a desktop frame. Real Safari eats 150 px; every screen must flow and scroll, with safe-area padding.
- Sensor thresholds tuned for one gesture reused for another. The bump math did not detect a wiggle.
- Assuming provider docs match the API. The documented sort field returned 400; the crawl endpoint needed a paid plan.
- Sequential model calls inside one serverless function. Parallelize and set the max duration.
- Late stack switches (a database adapter in the final hour) that nobody has time to verify.

## 9. Winning projects review (fill in at the next event)

For each winner, before the next hackathon: name, track or prize, one-line idea, what the five-second understanding was, how the demo worked with one device, what the video looked like, which sponsor tech was visibly used, and why it beat us. Observed this time without detail: TartanHacks winners leaned messaging and social; HackCMU Multiplayer winners were games and playful multi-device innovation, shown live with people in the room.

## 10. The Familiars record, for reuse

- Product: a small creature hatched from your voice that meets other people's creatures first, then hands you one line worth saying. Journey: spoken hatch, wiggle to cast, catch, duet, web home, nightly cast, scout deck, group match, recap.
- Repo: `web/` (Next.js 15), `docs/mockups/familiars.html` (visual contract), `docs/deck/familiars.pptx`, `docs/superpowers/specs` and `plans`.
- Production: https://hackcmu-2026.vercel.app; `/health` shows provider and store; `/api/scout/debug` shows the search provider.
- What still had value: the "manufacture the introduction" framing, the procedural creatures, the honest model ladder, the catch-from-any-tab sheet, the scout with sourced cards. Any of these could anchor a smaller, single-device entry in a social track.
