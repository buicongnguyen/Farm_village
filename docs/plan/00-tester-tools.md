# Step 0: tools for fast testing

Status: **done** (PR #80) · Depends on: nothing · Size: one session, one PR

## How to use it (for the owner)

Open the game with `?tester` at the end of the address:
`https://buicongnguyen.github.io/Farm_village/?tester`. A small red "Tester" tag shows at the top of the screen.
Open Settings and scroll to **Test**:

- **Jump to chapter 2 … 6**: brings this farm to the start of that chapter (everything the earlier chapters ask for
  is built or done, their cards are behind you). It only goes forward; the farm is saved and reopened.
- **+10,000 coins**, **+5 levels**, **Finish every timer**, **Move a family in**, **Unlock everything**.

The tools stay until the browser tab is closed. A visit without `?tester` never shows them. Use a spare farm
(Farm 2 or 3 on the title screen) if you do not want to change your own.

## What was built, where it differs from the plan below

- **A** as planned. The clock buttons (+1 hour, +1 day) and "Next tutorial step" stay in test builds only: moving the
  clock of a real farm forward would leave its timers in the future on the next normal visit.
  `tests/tester.test.mjs`, a check in `tests/browser.mjs`, and `tests/tester.production.mjs` for the public build.
- **B** as planned: `PACE` and `paced()` in `content/economy.mjs`; `FV_PACE=release npm run sim`.
- **C** was built differently, and better for what the chapters need. The steps up to the clinic keep their position
  (they lock buildings and must run in order). The steps after the clinic, which lock nothing, are now a **checklist
  kept by id** (`TAIL` in `core/projects.mjs`): each is ticked off when it is true, in any order, paid once
  (`s.firsts['project:<id>']` is the record), and the step shown is the first one still open. A chapter can add a
  step anywhere after the clinic; an old farm that was past that point is simply asked for the new step. No save
  migration was needed.

## Why first

The owner plays the live site to test. Every chapter after this one must be reachable in minutes, and the game must
stay fast now but be easy to slow down for release. A third item protects old saves from the chapter work.

## A. Tester's menu

What exists: `src/core/testmode.mjs` has `testUnlockAll`, `testFinishTimers`, `testAddFamily` and more. They are in
`ACTIONS` in every build, but the Settings "Test" section is only drawn in test builds (`onTest` in `src/main.mjs`
is `TEST_MODE ? ... : null`).

Build:

1. `src/main.mjs`: read `params.has('tester')`. Remember it in `sessionStorage` (`fv-tester`) so a reload keeps it.
   Pass `onTest` when `TEST_MODE || tester`.
2. `src/core/testmode.mjs`, new actions:
   - `testAddCoins({ coins = 10000 })`, `testAddLevels({ levels = 5 })` (cap at `LEVELS.max`).
   - `testJumpChapter({ chapter })`: brings the farm to the START of that chapter. It runs a table
     `JUMPS = { 6: s => {...}, 7: ... }`; entry N makes every earlier chapter's deed true and marks chapters up to
     N−1 as seen (`s.story.chapter = N − 1`). Each entry reuses real actions where it can (`place` at
     `grid.findSpot`, `rebuildCivic`, `hireHand`) and only sets state directly for things that take time (families
     arrived, goods in the barn). It only moves forward: a farm already past N is refused.
   - Chapter PRs add their own `JUMPS` entry; this PR writes entries 2 to 6.
3. `src/ui/settings-panels.mjs`: the Test section gains "Jump to chapter" (a row of numbered buttons, only chapters
   that exist), "+10,000 coins", "+5 levels", next to the existing "Finish timers".
4. A small "Tester" tag in the HUD corner while it is on, so screenshots are never mistaken for normal play.

Rules to keep: every test action goes through `act()`; a refused one leaves no trace (`tests/act.test.mjs` checks
all actions); nothing here runs unless the player presses its button.

Tests: `tests/tester.test.mjs`: each `JUMPS` entry on a new farm and on a mid-game farm leaves `currentStep`,
`journeyOf` and every chapter `when` consistent; jumping backwards is refused; the save round-trips.
Browser: a check in `tests/browser.mjs` that `?tester` shows the section in a production-style build and that it is
absent without the flag.

## B. One pace switch

Today the "testing" numbers are spread over `economy.mjs` and `goods.mjs`. Collect them:

1. `src/content/economy.mjs`: `export const PACE = { mode: 'testing', time: { testing: 1, release: 3 }, price: { testing: 1, release: 1 } }`
   and `export const paced = ms => Math.round(ms * PACE.time[PACE.mode])`.
2. Apply `paced()` where timers are DEFINED, not where they are read, so the rest of the code and the tests do not
   change: `CROPS[*].growMs`, `FRUITS[*].firstMs/regrowMs`, `ANIMALS[*].everyMs`, `RECIPES[*].timeMs` (in
   `goods.mjs`); `TRUCK.tripMs`, `FISH.waitMs/baitMs/footMs`, `REPAIR.*.ms`, `HANDS.everyMs`, `CART`, the market day
   and festival periods added later (in `economy.mjs`).
3. A comment block listing every number that was eased for testing, so the release pass has one list:
   crop grow times (PR #66), tray costs and count (#59, #61), truck sizes (#66, #70), barn limit (#57), parcel prices
   (#70), bite times on foot (#61), farmhouse costs (#68), hand fees and wages (#62).
4. `scripts/sim.mjs` reads `PACE.mode` from an environment variable so `PACE=release npm run sim` can be run without
   editing code.

Tests: with `mode: 'testing'` every existing test passes unchanged. One new test loads the tables with
`mode: 'release'` (through a small factory or an env flag) and checks every timer grew by the factor.

## C. Project steps kept by id

`s.projects.step` is an index into `STEPS`. Chapters will add steps, and some belong in the middle of the list. An
index would then point at the wrong step in old saves.

1. Save `s.projects.at` (the id of the current step) beside the index, in `advance()` (`src/core/projects.mjs`).
2. On load (`migrate` in `src/core/state.mjs`): if `at` is present and `STEPS[step]?.id !== at`, set `step` to the
   index of `at`; if `at` is missing (old save), keep the index and write `at` from it.
3. Steps added in the middle are then safe: a farm past them has them ticked off by `advance()` on the next action
   without a second reward (guard `gainXp` and the `projectDone` event with `s.firsts['project:' + id]`, which
   `advance()` already stamps).

Tests: an old save at every index keeps its step after a step is inserted before it (simulate by loading with a
patched `STEPS`); no XP is paid twice.

## Steps for the session

1. C first (smallest, protects everything after).
2. B, run all tests, run `npm run sim` to see the pace targets still pass.
3. A, with `JUMPS` 2 to 6.
4. Docs: tick this file in `README.md`; add a line to the game's Settings help text is NOT needed (hidden feature).

## Risks

- `JUMPS` entries rot when chapters change their deeds. The test in A runs them all on every `npm test`.
- First-load size: `testmode.mjs` is already in the first load; the menu UI is in the lazy settings panel.
