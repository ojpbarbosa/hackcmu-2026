# Cast — spec (v1)

Track: Multiplayer (+ IFM). One prompt lands on every phone in a circle at the same second; answers stay locked until everyone answers; close friends get a plan that goes live only when a quorum pulls the line. Visual reference: `mockups/index.html` §Cast (electric→violet accent).

## Screens

1. **Join / circle** (`/`): enter name + room code (from QR) or create a circle. Shows members as avatars. Host has "Cast now" (demo trigger) and "Schedule tonight" (random minute in the next 2 h; v1 keeps a countdown to a server time).
2. **The cast lands** (`/cast`): countdown ring (server time), prompt in H2, member status dots (cast / typing / waiting), primary CTA "Cast your answer" opens the composer sheet. Phone vibrates (`navigator.vibrate`) and plays a short reel tone (Web Audio) when the cast opens.
3. **Locked answers** (`/tonight`): own answer visible; others blurred with "locked" chips; unlocks all when the last member submits (reveal animation: blur → sharp). Pill "3 of 4 cast".
4. **Catch** (`/catch`): plan card (title, venue, subtitle, date/time, "X picks the room" chip), quorum bar with threshold marker, member avatars with pulled state, CTA "Pull the line" → becomes "Caught · invite sent" at quorum; "Add to calendar" (ICS download) and "Suggest a different night" (re-asks the model).
5. **The pond** (`/pond`): timeline of past casts with answer counts and caught plans; tapping opens answers.
6. **Stage** (`/stage?room=CODE`): dark projector view: the pond grid, "why this cast" reasons, model ladder from observability events.

## State (server)

```
{ code, members:[{id,name,avatar,color}], mode:'fishing'|'catch',
  casts:[{id, prompt, openedAt, answers:{[memberId]:{text, at}}, revealedAt|null, reasons:string[]}],
  plans:[{id, title, venue, subtitle, when, pickerId, pulls:[memberId], quorum:number, caughtAt|null}],
  scheduledAt:number|null }
```

Actions: `create`, `join`, `castNow`, `schedule`, `answer`, `pull`, `newPlan`, `setMode`.

## Model tasks

- `cast.prompt`: input `{members, history:[{prompt, answers}], mode}` → `{prompt: string, mode: 'fishing'|'catch', reasons: string[3], rejected: string[]}`; the prompt must not repeat a topic from the last 14 days; reasons cite history.
- `cast.plan`: input `{answers of the latest cast, members, city:'Pittsburgh', avoid:[venues from history]}` → `{title, venue, subtitle, whenISO, pickerId, why}`; must be concrete and within 30 min of CMU.
- Mock content: seeded 14-day history for "the basement" (the mockup's content) so the pond and stage look full on first run.

## Demo script (3 min)

Judges scan QR → join "the basement". Presenter taps "Cast now" → all phones buzz at once, ring counts down, prompt appears → each answers → last answer unlocks the reveal on every phone → "Catch" shows the plan, judges pull, quorum, caught → stage shows why this cast was chosen and the model ladder.

## Out of scope

Push notifications, real scheduling across days, accounts, photos.

## Acceptance

Four browsers in one room: cast lands within 300 ms on all; reveal only after the fourth answer; quorum at 3 of 4; stage updates live; works with `mock` and `ifm` providers.
