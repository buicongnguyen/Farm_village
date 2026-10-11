# Chapter 15: The evening train

Status: **done** (PR #90) · Depends on: chapter 14 · Size: two sessions

## How to play it (for the owner)

1. Once the quay is paved, **old rails** lie in the grass along the north edge of the map, behind the lots.
2. Open the quay, pick a free lot and build the **Railway halt** (level 17, 18,000 coins): a platform under a teal
   canopy, a little station with a clock, a signal. The rails are relaid.
3. A minute later the **first train** rolls in from the east with a whistle and stops behind the halt: an engine and
   three wagons. A pill "Train" counts down the eight minutes it waits; a train comes every twenty-five minutes.
4. Tap the halt (or the pill): each **wagon** asks for one good in a large amount. **Load 10** or **Load all** from
   the barn. A full wagon shows its crates on the train.
5. When the train leaves it pays: a **full wagon** pays its goods at 1.6 times their price, a part-loaded one what is
   in it, and **three full wagons** add 500 coins. A train that leaves empty costs nothing.
6. The first train that leaves with a full wagon closes **chapter 15**.

Tester (`?tester`): "Chapter 15" jumps to the quay with its house and hotel; "Finish every timer" brings the next
train at once, or sends the one at the halt on its way; "Finish this chapter" builds the halt and counts one train.

## What was built, where it differs from the plan below

- `src/core/train.mjs`: `tickTrain` (arrive, wait, leave; trains missed while the game was shut left empty, and one
  still waiting is found at the halt), `makeWagons`, `trainOf`, `trainPays`, the action `loadWagon`. State:
  `s.train`. Numbers: `TRAIN` in `content/economy.mjs`.
- **The halt goes on any free lot**, not only the easternmost: a tester may already have built on that lot, and the
  railway runs behind all of them. The train stops behind whichever lot holds the halt.
- **One PR**, not two: the schedule without wagons had nothing to play.
- A part-loaded wagon is paid at barn price for what is in it (the plan paid only full wagons); nothing is lost by
  trying.
- The timetable is kept in `s.train` (next arrival, the train at the halt) rather than being a pure function of the
  clock: the wagons must be saved anyway.
- `view/train-view.mjs` (loaded with the village dressing): its own meshes from the decor kit, moved along the
  track; steam through `juice.smoke`; a whistle (`kit/sound.mjs`). The village does not gather on the platform, and
  the hired driver does not load wagons (both left out).
- Models: `halt` (with window anchors), `track`, `track_old`, `train_engine`, `train_wagon`, `train_wagon_full`.
- `tests/train.test.mjs` (6), and a browser check that plays the chapter.
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
