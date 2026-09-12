# Familiars — spec (v1)

Track: Multiplayer (+ IFM). Everyone at the event gets a familiar (a small persona seeded from three answers). Bump two phones and the familiars talk for ten seconds, then tell both humans the one thing worth talking about. At the end, each person gets their night's story. Visual reference: `mockups/index.html` §Familiars (emerald accent, orb).

## Screens

1. **Hatch** (`/`): name + three seed answers ("something you build", "where you're from", "one true thing about you") → server creates a familiar `{name (generated, one word), address (3 chars), aura (hue pair), seeds}`. Event code from QR (`?room=HACKCMU`).
2. **Your familiar** (`/me`): orb with monogram and aura gradient, name, address, stats (contacts, bumps, clusters), seed chips, CTA "Bump a phone to meet", secondary "Key an address".
3. **Bump** (`/bump`): arms DeviceMotion (iOS permission on tap); on a spike > threshold, sends `{type:'action', name:'bump', payload:{at: serverNow-adjusted, magnitude}}`; server pairs two bumps within 350 ms in the same event; fallback: type the other address. Then shows the exchange: two orbs meet, 4-line dialogue streams in as bubbles, then the "you both" result card with the other human's name and a locating hint (entered at hatch: "where are you sitting").
4. **Your night** (`/night`): story cards written from the graph (count, clusters, the callback, the one that got away).
5. **The one that got away** (`/away`): ghost orb, match ring (%), shared chips, CTA "Find them now" (shows their seat hint) / "Maybe tomorrow".
6. **Stage** (`/stage?room=HACKCMU`): force-directed village graph (d3-force), clusters colored, loners grey, live counters, model ladder.

## State (server)

```
{ code, familiars:{[id]:{id,name,address,aura,seeds,human:{name,seat},cluster,createdAt}},
  bumps:[{id,a,b,at,dialogue:[{who,text}],youBoth:string,hint:string}],
  pendingBumps:[{id,at,magnitude}], clusters:[{id,label,color,members:[id]}] }
```

Clustering: after each hatch, `familiars.cluster` task assigns the new familiar to an existing cluster or creates one (max 8). Cheap and good enough.

Match score for "got away": Jaccard over seed keywords + same cluster bonus, computed server-side; the top never-bumped familiar is the one that got away.

## Model tasks

- `familiars.hatch`: `{seeds, human.name}` → `{name, keywords:string[5], clusterLabel}`.
- `familiars.exchange`: `{a:{name,seeds}, b:{name,seeds}}` → `{dialogue:[{who:'a'|'b',text}] (4 lines, ≤ 12 words each), youBoth: string (≤ 8 words), suggestion: string}`.
- `familiars.story`: `{me, bumps, clusters, gotAway}` → `{cards:[{label,big?,text}] (3)}`.
- Mock: names from a list, dialogue templated from seeds; deterministic.

## Demo script

Two judges hatch (30 s each), bump phones → orbs meet on both screens, exchange streams, "you both" card. Stage shows the village built overnight from real hackers (seed the room with ~40 synthetic familiars labeled "demo" if fewer than 20 real ones joined). One judge's "night" and "got away" screens.

## Out of scope

Bluetooth/NFC, accounts, photo avatars, moderation.

## Acceptance

Bump pairing works on two iPhones in Safari with motion permission; fallback by address works; stage graph updates on hatch and bump; night story generated for any familiar with ≥ 1 bump.
