# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: static HTML for the mockup page tonight (published as an artifact, phone frames per app); the working prototypes are mobile-web PWAs opened in a phone browser, so mockups are designed for a browser on a phone, no native iOS chrome.

## Users

Four prototypes for HackCMU 2026 (24-hour hackathon at Carnegie Mellon, judging Saturday 16:00–18:30, 3-minute classroom pitch to a panel of CMU students plus about a minute of Q&A). The team of four builds tonight, shows the mockups to mentors and judges at 09:00, then commits to one.

- **Cast** — friend circles (3–8 people) who have drifted into logistics-only chat. Used once a day at an unpredictable minute, phone in hand, wherever they are.
- **Familiars** — people at a crowded event (this hackathon: ~200 strangers in one building; later conferences, orientations, dorm floors). Used in short bursts when two people are physically together.
- **Detour** — a person with 30–90 free minutes who wants to walk somewhere they've never been, at home or abroad, possibly without data roaming. Used while walking, one-handed, glancing.
- **Palate** — a person deciding what to eat, alone or at a table with others, often from a menu in a language or format they can't fully read. Used at the table, quickly.

Secondary audience for every surface: the judges and the IFM sponsor table, who see each app for three minutes on a projector and on the presenter's phones.

## Product Purpose

- **Cast.** One prompt ("cast") drops on every phone in a circle at the same second, hidden until everyone answers, then revealed. Fishing mode for people who barely know each other (discovery prompts); catch mode for close friends (a concrete plan that breaks the group's routine and goes live only when a quorum "pulls the line"). The Pond, the circle's answer history, is the home screen. Success: the circle talks about something other than logistics today, and one plan a week leaves the chat.
- **Familiars.** Everyone gets a familiar: a creature with a small-model persona seeded from three answers. Bump two phones (accelerometer spike matched server-side; QR fallback) and the familiars talk for ten seconds, trade one memory each, and tell both humans the one thing worth talking about. Familiars grow from every bump. At the end each person receives their night's story: who they met, what they had in common, and "the one that got away" (the most similar person they never bumped). Success: strangers talk, and remember why.
- **Detour.** Give a time budget, an endpoint, and a mood. The phone shows a compass and one sentence at a time, never the route, never the destination. An orienteering solver builds a walk that maximizes places you've never been under the time budget; the model writes each nudge from what is actually on that corner. Works offline with the small model on the device. Success: you arrive on time having seen something new, and you looked at the city, not the phone.
- **Palate.** Log what you love; your taste builds as a flavor galaxy (dishes mapped to shared flavor compounds). Point it at any menu (PDF, photo, another language) and it re-lights the menu for you. Table mode merges several palates and finds the dishes everyone will like. Success: a confident order in under a minute, at any table, anywhere.

## Positioning

- Cast: synchronized reveal plus quorum commitment plus a memory of the whole circle in one context; the prompt is conditioned on everything the circle has ever answered. BeReal had the moment and nothing to say; planners have the plan and no ritual.
- Familiars: the agents meet so the humans can. Bump had the gesture and no brain; LinkedIn has the graph and no moment.
- Detour: the anti-map. Every map app optimizes the fastest route to a known place; Detour optimizes novelty to an unknown one and hides the map on purpose.
- Palate: taste as a portable profile owned by the person, not the restaurant or the review site.

## Operating Context

- Demo: a projector or big screen for the shared view (the Pond, the village graph, the hidden route, the flavor galaxy) plus two to four phones in judges' hands. Judges join by scanning a QR. Every demo shows the end of the pipeline and "the wall" (the moment the system refuses: no plan without quorum, no destination shown, unknown ingredients stay grey, an unverifiable claim drawn dotted).
- Ambient light: a lit classroom at 4 pm for judging; dim rooms and outdoors at night for real use of Cast, Familiars, and Detour; restaurant lighting for Palate.
- The IFM sponsor (Institute of Foundation Models) provides the K2 Horizon model fleet. Each app shows which model did what: small models (0.9B / 3.7B) for private, local, per-person work; the 375B for decisions and narration; reasoning traces visible on the big screen.

## Capabilities and Constraints

- Web only, mobile-first, opened in a phone browser; no iOS push notifications (sound and vibration while the app is open are enough for the demo).
- K2 Horizon 375B is hosted (OpenAI-compatible, 512K context, JSON-schema output, tool calling, reasoning traces). Small models run locally on a laptop via MLX if the spike succeeds; "on-device" is not claimed until it does. K2 is text-only; any image input goes through OCR first.
- Bump detection: DeviceMotion on both phones matched within ~300 ms server-side; QR as fallback.
- Detour cannot use GPS indoors; the judging demo simulates position on the big screen and shows a recorded real walk, labeled.
- Palate ingredient priors come from flavor-compound and recipe datasets; "unknown" is a first-class answer and no dish is marked safe without data.
- Undecided: which app is submitted, and to which track (Cast and Familiars fit Multiplayer; Detour fits Traveling or Optimization; Palate fits Food; IFM is an optional second track).

## Brand Commitments

- Names are final for the mockups: Cast, Familiars, Detour, Palate.
- Four independent identities. Each app picks whatever visual world is best for it; they may or may not resemble one another. No shared brand is required.
- The team is competing for the Best Design prize as well as a track prize. The user (a designer) has asked explicitly for work that does not read as AI-generated: no template looks, no generic cards, distinctive type and color, unique controls.
- Voice: plain, specific, second person, no hype. Controls name their action.

## Evidence on Hand

- Research notes with sources in `2026-09-12-problem-first-ideation.md` (loneliness figures, BeReal's rise and fall, PRT reliability, campus dining hours, allergy statistics, F&B operator quotes).
- Verified open feeds: cmueats hours API, PRT GTFS and GTFS-realtime, WPRDC datasets. Flavor-compound data exists on a teammate's machine from earlier work.
- No real users yet for any of the four; every screen's content is authored demonstration data and must be labeled synthetic where it could be mistaken for real usage.

## Product Principles

1. The visualization is the product: the Pond, the village, the hidden route, the galaxy are home screens, not reports.
2. Show the wall. Every flow has a moment where the system refuses, and that moment is designed, not hidden.
3. Small local, big remote. Private work stays with the person; decisions and narration come from the large model, and the split is visible.
4. One gesture per ritual: a cast answered, a bump, a step, a photo of a menu. Nothing needs a settings screen to be understood.
5. Real content everywhere; labeled synthetic usage where it could mislead.

## Accessibility & Inclusion

One-handed use while walking (Detour) and in dim rooms (Cast, Familiars): large targets, high contrast in both light and dark ambient conditions. Menus and casts may be in languages other than English; typography must carry Portuguese, Hindi, and Chinese without falling back to a system face for the display voice.
