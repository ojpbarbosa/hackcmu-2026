# Detour — spec (v1)

Track: Traveling (alt: Optimization) (+ IFM). Give a time budget, an endpoint and a mood; it walks you somewhere you've never been, one sentence at a time, and never shows the route or the destination. Visual reference: `mockups/index.html` §Detour (orange accent, fogged map).

## Screens

1. **Set out** (`/`): time slider (15–90 min), "end at" (venue picker from a short list around CMU + current location), mood chips, CTA "Start walking". Starting point = geolocation (fallback: pick "Tepper" / "Gates" / "Cathedral").
2. **Walking** (`/walk`): MapLibre map (OpenFreeMap style, no key) with a fog overlay leaving a ~100 m clear circle around the user; heading cone; HUD pills (minutes left, endpoint · ETA); nudge card ("nudge 4 of 7", sentence, "Got it", hide). Position from `watchPosition`; a "demo walk" toggle replays the route at 1.4 m/s for the classroom.
3. **The wall**: tapping the map opens the sheet "the route stays hidden." with Keep walking / End early.
4. **Arrival** (`/done`): full route revealed on the map, stats (distance, new-to-you count, phone looks), place chips, CTA "Save the walk".
5. **Stage** (`/stage?room=CODE`): dark map with candidate corners, chosen route, timestamps, solver line, model ladder.

## Data

- `server/data/oakland.json`: walking graph + POIs fetched once from Overpass for bbox (40.437, -79.965) to (40.452, -79.935) (script `scripts/fetch-osm.ts`, cached, committed). Nodes/edges from highway=* walkable ways; POIs from amenity/shop/tourism/leisure/historic with names.
- Novelty: "never visited" v1 = not in the user's saved walks + a bias toward POIs off the main avenues (Forbes/Fifth).

## Solver (server, deterministic)

Orienteering by greedy insertion: from start, choose up to 7 POIs maximizing novelty score subject to total walking time (Dijkstra on the graph at 1.35 m/s) ≤ budget with 3 min slack to the endpoint; return `legs:[{fromNode,toNode,poi,path:[latlng],seconds}]`. Log candidates considered.

## Model task

- `detour.nudges`: `{legs:[{poi:{name,tags}, turn:'left'|'right'|'straight', streetFrom, streetTo}], mood}` → `{nudges:string[N]}`; one sentence each, ≤ 9 words, never names the destination, sensory when possible ("left where it smells like bread").
- `detour.story` (arrival): `{legs, stats}` → `{title, line}` for the arrival card.
- Mock: templated nudges from turn + POI category.

## Demo script

Presenter sets 45 min → Tepper → "somewhere new"; the phone shows fog + nudge; "demo walk" advances position live on the projector map which shows the hidden route; a judge taps the map → the wall; arrival reveals the route with six new places.

## Out of scope

Offline model on device (say "runs on a laptop tonight"), turn-by-turn voice, saving across devices.

## Acceptance

Solver returns a feasible walk for any budget 15–90 from three start points; nudges generated (mock or live); fog map renders on iPhone Safari; demo walk replays end to end in < 2 min at 20× speed.
