# Chapter 8: Work for everyone

Status: not started · Depends on: chapter 7 · Size: one to two sessions · Level reach: 15
Story source: `STORY.md` 4 (row 8), `JOURNEY.md` 3

## What the player gets

- The **company office** matters: a manager arrives with it and speaks on the village board.
- The office's **first big delivery** buys the water rights back.
- The **sluice opens**: the brook runs fuller, the old mill's wheel turns, and every workshop works a tenth faster.
- The water thread ends here.

## The deed

`when: s => workingCount(s, 'company') > 0 && normalizeGrowth(s).settled >= 1`

(`settled` counts company deliveries that came home and were paid: `core/growth-state.mjs`.)

## Rules

- `s.firsts.sluice` is stamped when chapter 8 is seen (in `chapterSeen`, `core/today.mjs`, or a small `afterChapter`
  hook). From then on `productionDuration()` (`core/production.mjs`) multiplies by `0.9`.
- The manager: `content/people.mjs`: `{ id: 'bea', role: 'Office manager', arrives: 'company', noOrders: true, noGifts: true }`.
  She replaces the nameless voice of the company lines in `ui/village-growth-panel.mjs`.
- Project steps already exist (`company`); add nothing.
- Nothing else changes in the company rules: staff, brands and bulk requests stay as they are.

## Content and story

- Names: `bea` → choose with the chapter (brisk, kind, counts everything twice; Vietnamese pair **cô – cháu**).
- `CHAPTERS` id 8, "Work for everyone". Text: the first boxes with the village's own label leave on the truck; with
  Oak's notes and the officer's reports the village buys the water rights back; Rusty oils the sluice wheel; the gate
  lifts and the brook comes down loud. Maple's line: she had forgotten the sound of the mill wheel.
- `BEATS`: `water-rights` (chapter 8 seen; the manager, Rusty, Maple), `wheel-turns` (first collect after the sluice
  opens; Chip: he always wanted to see the wheel move).
- One letter from Oak (`ellis-…`, after his existing water letters): short, wry, proud. He is still upriver.

## View and art

- **The old mill** (new scenery, decor kit): a small stone and timber water mill with a wheel as a separate node, at a
  fixed place on the south bank (about cell 70, 17: check `isBrook` so the wheel hangs over water). It stands from
  the start, weathered, wheel still. Two nodes: `old_mill`, `old_mill_wheel`. Under 3,000 triangles together.
  Draw it in `view/world-view.mjs` with the other fixed scenery; turn the wheel as `view/dress.mjs` turns the
  windmill's rotor, only once `s.firsts.sluice` is set.
- **Fuller water**: `view/brook.mjs` widens the visible stream a little and brightens it after the sluice opens (a
  uniform or a second geometry; the rules' `isBrook` does not change).
- A one-off moment when the chapter card closes: the camera flies to the mill, the wheel starts, a splash and the
  cheer sound.
- Three chapter pictures (the labelled boxes, the sluice gate lifting, the wheel turning).

## Interface

- Village board: the manager's portrait and line at the top of the company section.
- Production panels: a small line "The mill wheel turns: trays finish a tenth faster" for the first few visits.

## Old saves

A farm whose company has already settled a delivery gets the chapter on its next action. The 0.9 factor applies to
trays started after the chapter, never to running ones.

## Tests

Rules: `when`; the factor only after the stamp and only for new trays; the manager arrives with the office; saves.
Browser: jump to chapter 8, send the first company delivery (finish timers), collect, see the card and the wheel.

## Risks

The old mill is new fixed scenery on cells a player may have used. Its site is north of the north lane, outside the
farm and the village, so nothing can stand there; assert that in a test with `landOf`.
