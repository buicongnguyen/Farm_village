# Chapter 10: Hands to help

Status: not started · Depends on: chapter 9 · Size: one to two sessions
Story source: `JOURNEY.md` 3 (Act III), `STORY.md` 4 (row 10)

## What the player gets

- The six jobs are taken by **people the player knows**, and they are **seen doing the work**: walking to the beds,
  the pens, the workshops, the orchard, the truck and the pond.
- An **evening report**: what the farm earned today and from what, with one line of advice from Maple.
- The start of Act III: the farm runs while the player plans.

## The deed

`when: s => hiredCount(s) >= 3 && (s.stats.handTasks ?? 0) >= 30`

(`hiredCount` and `s.stats.handTasks` already exist in `core/helpers.mjs`; confirm the stat is counted for all six
roles, and add it where it is missing.)

## Rules

- `HANDS.roles[role].who` (`content/economy.mjs`): the villager who takes the job once hired.
  `field: 'minh'`, `animals: 'grace'`, `workshop: 'lan'`, `orchard: 'elin'`, `driver: 'sam'`, `fisher: 'olaf'`.
  A role whose villager has not arrived yet is done by "a hand from the next valley" as now (no change to the rule).
- `handAt(s, role)` → the thing or cell the hand is working at, or null: recorded as `s.hands[role].last = { id, at }`
  each time the tick does a task (the tick already knows the target). The view reads it; the rules never do.
- **The evening report.** `s.today.earned = { crops, animals, workshop, orchard, fish, orders, truck, hands }`, added
  to wherever coins are gained (one helper `earn(ctx, source, coins)` in `core/today.mjs`, called from the six or
  seven `s.coins +=` sites; keep `gainCoins` as the single door). `reportOf(s)` → the rows, the day's total, the
  best source, and one advice id chosen by simple tests in order: barn nearly full → "send the truck";
  beds idle → "plant"; trays idle → "the workshops are waiting"; a hand not hired while the level allows → "hire";
  otherwise praise.
- The report is offered once per real day, on the first visit after 18:00 game time or on the next load (a card with a
  "Later" button; never blocking). `s.today.reportSeen`.

## Content and story

- `CHAPTERS` id 10, "Hands to help". Text: the farm is too big for one pair of hands, and nobody had to be asked
  twice; Chip takes the east beds, Honey the ovens, Dash the truck. Maple's line: a farm is run from the porch as
  much as from the field. Three pictures (hands in the field, Honey at the bakery, the evening table with the report).
- `BEATS`: `first-hand` exists (check); add `three-hands` (Rosie: "I can finally sit down"), `report-first` (Maple).
- Each named hand gets three short work lines for tap-to-chat while at work (`content/chatter.mjs`), in voice.
- Advice lines (five) in the four languages.

## View and art

- `view/people-view.mjs`: a hired villager's plan (`planFor`) prefers `handAt(s, role)` over the usual wander: walk
  to the cell beside the target, face it, play the matching clip (`Water`, `Harvest`, `Feed`, `Work`: check which
  clips the rigs have; `Work` exists for building), then return to their usual round when the hand is idle.
- The driver rides in the truck when it leaves (the driver seat node from the fleet work) and is hidden while away.
- A small tool in hand while working (watering can, basket): reuse the carried-rod attachment from fishing.
- No new models.

## Interface

- Friends → Hired hands: each role shows the villager's portrait and name, what they did last and how many tasks today.
- The evening report card (`ui/report-panel.mjs`, lazy): bars per source, total, advice with Maple's portrait,
  buttons "Good night" and one action for the advice (opens the right panel).
- Roadmap: stage "The valley wakes" completes at chapter 9; a new stage "The family farm" starts here with the
  milestones of chapters 10 to 12.

## Old saves

A farm with three hands and thirty tasks gets the chapter at once. Hands hired before this chapter keep working; the
villager simply appears in the role.

## Tests

Rules: `who` resolves only to arrived villagers; `handAt` after a tick task; `earn` sources add up to the day's coin
gain in a simulated day; the advice order; the report once a day; `when`. Browser (`tests/hands.browser.mjs`,
extend): hire the field hand, finish timers, see the named villager within two cells of a ripe bed; open the report.

## Risks

- People walking to work must respect pens and fences (the `penYard` rule from PR #72).
- The report must not open over a chapter card or a build in progress: queue it behind `modal.busy`.
