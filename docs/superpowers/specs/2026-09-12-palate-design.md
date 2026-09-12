# Palate — spec (v1)

Track: Food (+ IFM). Log what you love; your palate builds as a flavor profile. Point it at any menu, in any language, and it ranks the dishes for you and for the table. No dish is marked safe without a record. Visual reference: `mockups/index.html` §Palate (berry accent, match rings, petal chart).

## Screens

1. **Onboard** (`/`): name, "five dishes you love" (free text, chips as you add), "never" allergens (multi-select: sesame, peanut, shellfish, dairy, gluten, none). → palate vector.
2. **Your palate** (`/me`): petal chart over 6 axes (coconut/rich, smoky/charred, sour, herbal, sweet, fermented/funky), family cards with counts, the "never" banner, CTA "Point at a menu".
3. **Menu** (`/menu`): choose demo menu (Bangkok Balcony, a Pittsburgh diner, a Portuguese tasca) or paste menu text (v1; camera OCR via tesseract.js as stretch). Dishes ranked with match ring (0–100) and a one-line reason; unknown dishes greyed with "Ask"; allergen hits shown as "never" with red ring.
4. **Table** (`/table?room=CODE`): members join via QR; merged ranking: "everyone will love" (min score ≥ 75), "splits the table" (spread ≥ 40), CTA "Build the table's order · $" (sum of the picks).
5. **Ask the kitchen** (`/ask/:dish`): chef card in the menu's language + English, "They said no <allergen>" marks the dish known for this session.
6. **Stage** (`/stage?room=CODE`): merged flavor map (overlapping member circles, shared dishes highlighted), priors line, model ladder.

## Scoring (deterministic, server)

- `data/ingredients.json`: ~120 ingredients → axis weights (authored) + allergen tags. `data/menus/*.json`: demo menus with dishes `{name, price, description, ingredients?}`.
- Dish vector = mean of ingredient axis weights; unknown if < 2 known ingredients. Score = 100 · cosine(palate, dish) blended with family overlap; hard 0 + `never` flag if any ingredient carries a "never" allergen. Table: min/spread across members.

## Model tasks

- `palate.profile`: `{lovedDishes, never}` → `{axes:{coconut,smoky,sour,herbal,sweet,fermented} in [0,1], families:[{label,count}]}`.
- `palate.menu`: `{menuText, language?}` → `{restaurant?, dishes:[{name, price?, ingredients:string[], confidence:0-1, section?}]}` (used for pasted/OCR menus; demo menus ship parsed).
- `palate.reason`: `{dish, palate}` → `{reason: ≤ 14 words}` (batched per menu).
- `palate.chefCard`: `{dish, allergen, language}` → `{native, english}`.
- Mock: profile from keyword rules; reasons templated from top shared ingredients.

## Demo script

Judge names five dishes → petal chart forms → Bangkok Balcony menu re-ranks with reasons and one grey dish → two more judges join the table → "everyone will love" appears → grey dish → chef card in Thai → stage shows the merged map.

## Out of scope

Real restaurant data, ordering, accounts, nutrition.

## Acceptance

Scores reproducible; allergen hard-block verified; table merge with 3 members; chef card in Thai and Portuguese; works with `mock` and `ifm`.
