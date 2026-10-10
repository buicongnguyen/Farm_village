# Chapter 15: The evening train

Status: not started · Depends on: chapter 14 · Size: two sessions
Story source: `JOURNEY.md` 3 (Act IV), `STORY.md` 4 (row 15)

## What the player gets

- The old **railway halt** reopened at the east end of the quay, and a **train** that stops every evening.
- **Train orders**: three wagons to fill before it leaves, the biggest single sale in the game.
- The valley is on the map again.

## The deed

`when: s => (s.counts.halt ?? 0) > 0 && (s.stats.trains ?? 0) >= 1`

## Rules

New file `src/core/train.mjs`:

- `halt: { cat: 'riverside', size: [6, 5], level: 22, cost: 30000, model: 'halt', max: 1 }` on the easternmost lot
  only (`lot: 'q8'`); the track runs along row 0 east–west as fixed scenery from the start of Act IV (rusty), and is
  cleaned when the halt is built.
- `TRAIN = { everyMs: paced(25 * MIN), stopMs: paced(8 * MIN), wagons: 3 }`.
- `trainOf(s, now)` → `{ here, leavesAt, nextAt, wagons: [{ good, need, have, coins }] }`, pure from
  `s.train.startedAt` and a seed, like the market day.
- `loadWagon(ctx, { wagon, n })` moves goods from the barn into a wagon; a full wagon is paid when the train leaves
  (about 1.6 times barn value); three full wagons add a bonus (coins and a keepsake the first time).
  A train that leaves with nothing costs nothing.
- `s.stats.trains` counts trains that left with at least one full wagon.
- Hands: the driver hand loads a wagon from the barn if hired (half the work, as all hands).

## Content and story

- `CHAPTERS` id 15, "The evening train". Text: the first train is four minutes late and nobody minds; half the
  village comes to the platform just to hear it; Dash, who has carried the post by bicycle for twenty years, puts a
  sack on board and salutes. Maple's line: she counted the wagons as a girl and still does.
- Beats: `rails-cleared`, `first-whistle`, `full-train`.
- A station voice is not needed; the halt has no keeper (Dash meets every train).

## View and art

- Decor kit: `halt` (a small platform building with a clock and a canopy, under 4,000 triangles), `track`
  (instanced rail piece), `train_engine` and `train_wagon` (under 3,000 and 1,200; wagons show crates when full).
- The train (`view/train-view.mjs`, in the `living` lazy set): rolls in from the east along row 0, stops, leaves
  west; steam puffs from `juice.mjs`; a whistle in `kit/sound.mjs`; lit windows in the evening.
- People gather on the platform the first time (the festival's gather routine).
- Three chapter pictures.

## Interface

- Halt panel: the three wagons with goods, bars, "Load" and "Load all", the time until it leaves, the reward.
- HUD pill "Train at the halt" with the time left; a notice when it arrives.

## Tests

Rules: the schedule is pure and survives a reload; loading validates before it mutates; payment once at departure;
the bonus; `when`. Browser: jump to chapter 15, build the halt, move the clock, load a wagon, see the train leave
and the card. Far view: train and track inside the budgets.

## Session split

First PR: halt, track, train view and schedule (no orders). Second PR: wagons, orders, the chapter.
