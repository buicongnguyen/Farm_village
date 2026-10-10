# Chapter 6: Market day

Status: not started · Depends on: step 0 · Size: one to two sessions · Level reach: 6
Story source: `STORY.md` 4 (row 6), `JOURNEY.md` 3 (Act II), `MEADOW-DAIRY-SCOPE.md` (the three dairy scenes)

## What the player gets

- A **market day** that comes round every ten minutes for four (testing pace): one good of the day pays double.
- Land that says what it is for when it is for sale, and Bramble selling the third field at a fair price, grumbling.
- Three short dairy scenes (a corner for animals, the first butter, a cheese picnic).
- A newcomer: the **baker**, who arrives with the first market day and stands at the square.
- The water thread moves one step: Rusty and Dash learn who owns the land upriver.

## The deed

`when: s => (s.stats.marketDays ?? 0) >= 1 && s.parcels.length >= 3`

A market day counts once the player has sold at least one unit of the good of the day while it runs.

## Rules

New file `src/core/market-day.mjs`:

- `MARKET_DAY` in `content/economy.mjs`: `{ everyMs: paced(10 * MIN), lastsMs: paced(4 * MIN), bonus: 2, level: 6 }`
  (testing pace: every ten minutes for four; the release pace makes it every thirty for twelve).
- The first market day starts the moment the market opens for the farm (level 6 and a working square), so nobody
  waits for the first one. A tester's button starts the next one at once.
- `marketDayOf(s, now)` → `{ open, active, n, good, endsAt, nextAt }`. Pure: `n = floor((now − s.createdAt) / everyMs)`,
  active while `(now − s.createdAt) % everyMs < lastsMs`. `open` needs level 6 and a working market square.
- `marketGoods(s)`: what the farm can make now (crops at its level, recipes of its working buildings, fruit of its
  trees, eggs and milk if it keeps the animals). The good of the day is a seeded pick from it by `n`
  (`rng(hash(s.createdAt, 'market', n))`), so it is the same after a reload and never something the farm cannot make.
- `marketBonus(s, good, now)` → `2` for the good of the day while active, else `1`.
- `sellGood` (`src/core/market.mjs`) multiplies by `marketBonus`. A truck that leaves during a market day is paid the
  bonus for the units of that good it carries (stamp `u.marketGood = good` on `sendTruck`, pay on return).
- The first bonus sale in market day `n` does `s.stats.marketDays += 1` and stamps `s.marketDay = { n, counted: true }`;
  emits `marketDaySale { good, coins }`.
- `tickMarketDay(ctx)` in the tick list (`src/core/act.mjs`): when a new active `n` is seen, emit
  `marketDayStarted { good }` once (for the notice and the bunting).

Other rules:

- `arrived(s, v)` helper for villagers (`content/people.mjs` or `core/bonds.mjs`): `arrives` may be a building kind (as
  now) or `'chapter:6'`. Use it in `core/bonds.mjs`, `core/orders.mjs` and `view/people-view.mjs`.
- `s.stats.butterMade` counted beside `cheeseMade` in `collectProducts` (`src/core/production.mjs`).
- Two project steps after `juice` in `content/projects.mjs`, both locking nothing (the checklist after the clinic is
  kept by id since step 0, so they can go in the middle of it):
  `market_day` ("The first market day", level 6, done at `marketDays >= 1`) and
  `third_field` ("A third field", done at `parcels.length >= 3`).

## Content

- `content/world.mjs`: `parcelNote(id)` → one of four short purposes by position: the east column ("East meadow: room
  for goats and the dairy"), the north row ("North field: nearest the brook lane"), the south row ("South field: close
  to the village street"), else "Open field: room for anything". Shown in the for-sale round menu and the land panel.
- `content/people.mjs`: `{ id: 'hugo', name: '{person:hugo:display}', role: 'Baker', arrives: 'chapter:6', noOrders: true, noGifts: true, line: ... }`.
- `content/character-names.mjs`: `hugo` → en **Barley**, vi **Lúa** / **Chú Lúa**, ko **고소**, ja **こんがり** (not 보리 or
  こむぎ: those are the dog's names). Vietnamese pair **chú – cháu**; add him to the table in `STORY.md` 2.
- `content/story.mjs`:
  - `CHAPTERS` id 6, "Market day", subtitle "The square fills up again."; text: the square has stalls and bunting for
    the first time in years; Barley sets up his trays; Bramble sold the field "at a fair price, and do not thank me";
    Rusty noticed the name on the gatepost upriver. Maple's line: about the smell of fresh bread reaching her porch.
    Panels: the square with bunting; Barley at his trays; the gatepost by the locked sluice.
  - `BEATS`: `gus-field` (third parcel owned; Bramble, Rosie), `animal-corner` (goat barn working; Clover, Rosie),
    `first-butter` (`butterMade > 0`; Honey, Sunny), `cheese-picnic` (`cheeseMade > 0 && butterMade > 0`; Maple recalls
    packing bread for Oak, Sunny counts the plates), `flour-company` (chapter 6 seen; Rusty and Dash: the upriver land
    and its gate belong to a city flour company). Rules from `STORY.md`: no sluice key, Oak has not returned.
- `content/journey.mjs`: a real stage after "Home and dairy": `{ id: 'wakes', name: 'The valley wakes', goal: 'Bring the village back to life', level: 6, version: '0.6', milestones: [market day, three fields] }`.
  Later chapters add their milestones to it. `core/journey.mjs` picks the first stage whose milestones are not all
  done (replace the hand-written `homecoming / orchard / home` ladder with a loop; keep "level 4 before the orchard").

## View and art

- Bunting over the market square while a market day runs: the `bunting` piece is already in the decor kit; draw two
  spans at the market's position in `view/land-view.mjs` on `marketDayStarted`, remove when it ends (check on the
  half-second update).
- The baker uses the `man` rig with his own outfit in `view/people-view.mjs` (`OUTFITS.hugo`: white top, tan apron
  bottom, grey-brown hair); he stands by the market when he is not walking.
- Chapter pictures: three `PANELS` entries in `scripts/story-panels.mjs` (`ch6-1` to `ch6-3`), rendered from the game.
- No new models. No new icons (the notice uses the good's own icon).

## Interface

- Market square panel (`ui/panel-renderers.mjs`): first line "Market day: {good} pays double · {time} left" with the
  good's icon, or "Next market day in {time}" when it is not running.
- Barn panel: the good of the day's tile carries a small "×2" badge and its Sell button shows the doubled price.
- HUD: a status pill "Market day" while it runs (`ui/hud-status.mjs`), which opens the barn; a notice when one starts.
- For-sale land: the purpose line under the price.

## Old saves

A farm that already owns three parcels has half the deed at once. `marketDays` starts at 0 for everyone: the first
market day is new to all. `JUMPS[6]` (tester's menu) gives the farm chapter 5's state; `JUMPS[7]` adds the deed.

## Tests

Rules (`tests/market-day.test.mjs`): the schedule is a pure function of time and survives a reload; the good of the
day is always makeable; the bonus applies only to that good and only while active; the deed counts once per market day;
a truck sent during one is paid the bonus on return; below level 6 or without a working market nothing happens;
chapter 6 `when`; the five beats' `when`; the baker arrives only after chapter 6; roadmap stage "The valley wakes".
Language: every new string in the three packs (the existing i18n tests enforce it).
Browser (`tests/browser.mjs`): with the tester's jump to chapter 6, wait for a market day (move the test clock), sell
the good of the day, see the doubled coins, the pill and the chapter card.

## Steps for the session

1. `market-day.mjs` with tests. 2. `sellGood` and trucks. 3. Steps, roadmap loop, `arrived()`. 4. Story data, names,
languages. 5. Interface and bunting. 6. Panels. 7. Browser check, suites (`fleet`, `production-shops`, `hud-compact`,
`names`, `i18n`, `story`, `progression-review`, smoke). 8. Tick the table in `README.md`.

## Not in this chapter

Land deeds as a currency (parcels stay bought with coins), Miso the cat, recipes for the new vegetables, the old
recipe note. See `99-after-the-story.md`.
