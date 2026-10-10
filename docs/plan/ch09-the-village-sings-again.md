# Chapter 9: The village sings again

Status: not started · Depends on: chapter 8 · Size: two sessions (stage and festival; Oak comes home)
Story source: `STORY.md` 3 (Bramble's arc, the fire) and 4 (row 9), `JOURNEY.md` 3

## What the player gets

- The **festival stage** rebuilt on the square.
- The **Harvest Festival**: an evening the player starts, with lanterns, music, everyone on the square, and a feast
  laid from the farm's own goods. It can be held again each week.
- Bramble tells the truth about the night of the fire; Maple's old letter thanks him.
- **Oak comes home** and from then on walks about the farm and fishes at the pond.
- The end of Act II.

## The deed

`when: s => (s.counts.stage ?? 0) > 0 && (s.stats.harvestFestivals ?? 0) >= 1`

Note: the existing "school festival" (`FESTIVAL` in `content/quests.mjs`, a reward after twelve goals) is a different
thing and stays as it is (`STORY.md` 3 says so).

## Rules

- **The stage.** `content/buildings.mjs`: `stage: { name: 'Festival stage', cat: 'projects', size: [4, 2], level: 12, cost: 1500, civicSite: true, max: 1, model: 'stage', door: false, charm: 6 }`.
  Its site is on the north edge of the village square, inside `PLAZA` (cells 39–42, 98–99), which nothing else may
  build on, so it is always free. Add it to `RUINS` with `model: 'stage_burned'` (a charred platform shown from the
  start: chapter 5 already mentions "where the festival stage once stood"). `canPlace` must let the stage itself onto
  the square.
- **The festival.** New `src/core/festival.mjs`:
  - `FESTIVAL_DAY` in `economy.mjs`: `{ kinds: 6, each: 3, lastsMs: paced(3 * MIN), everyMs: paced(30 * MIN), coins: 800, hearts: 1 }`.
  - `holdFestival(ctx, { goods })`: needs the stage, six different goods at three each from the barn, and no festival
    in the last `everyMs`. Takes the goods, stamps `s.festival = { at, until }`, `s.stats.harvestFestivals += 1`,
    pays the coins, gives every neighbour and villager one heart, emits `festivalStarted`.
  - `festivalOf(s, now)` → `{ active, until, readyAt }` for the views.
- **Oak.** `ellis` in `content/people.mjs` loses `away: true` once chapter 9 is seen: make `away` a test
  (`away: s => (s.story.chapter ?? 0) < 9`) and read it through one helper wherever `away` is read now.
- Project step `stage` ("The festival stage", `deliver: { bread: 10, apple_juice: 6 }`, `site: 'stage'`), after
  `company`.

## Content and story

- `CHAPTERS` id 9, "The village sings again". Text: the stage smells of new wood; lanterns go up one by one; Bramble
  asks to light the first, and tells it at last: a storm knocked over the lanterns he was minding, the stage burned,
  and he carried the children out. Maple's undelivered letter (already in Dash's heart scene) thanked him for that
  night. Maple's line: she waited thirty years to hand him that letter.
- A three-card beat sequence `gus-truth-1..3` shown during the first festival (Bramble, Dr Fern who treated his
  hands, Maple).
- `oak-home` beat right after the chapter card: Oak at the gate with his rods; Sunny runs. A last letter is not
  needed: he is there.
- Oak's tap-to-chat lines in `content/chatter.mjs` (ten short ones, wry, about fish and weather).
- Do not date the fire or the low-water summer.

## View and art

- Decor kit: `stage` (a timber stage with a striped canopy, steps, lantern strings on two poles; under 3,000
  triangles) and `stage_burned` (a blackened platform with two charred posts; under 600).
- **The festival evening** (`view/daylight.mjs`, `view/people-view.mjs`, `view/juice.mjs`): while `festivalOf` is
  active the sky goes to dusk whatever the clock says; lantern glows light along the square (the glow system in
  `daylight.mjs`); every villager who has arrived walks to the square and stands facing the stage, cheering now and
  then (the Cheer clip); confetti from `juice.mjs`; the music changes to a festival tune (`kit/sound.mjs`: a second
  pentatonic pattern, faster, with a drum).
- Oak: the `man` rig with grey hair, a green top and a fishing hat tint; by day he sits at a pond fishing spot (the
  seat system villagers already use), in the evening on the farmhouse bench.
- Three chapter pictures.

## Interface

- The stage's panel: the feast table (six slots filled from the barn, a "Fill from the barn" button), "Hold the
  Harvest Festival", and when the next one can be held.
- During the festival the HUD shows a "Festival" pill with the time left.

## Old saves

No farm has a stage, so the chapter is new for everyone. A farm whose square has paths across the site gets them
lifted by the rebuild.

## Tests

Rules: the stage only on its site; the festival's needs, cooldown and rewards, once each; Oak's `away` test; the
beats' order; saves. Browser: jump to chapter 9, rebuild the stage, fill the table, hold the festival, see dusk, the
gathering and the card; reload and find Oak at the pond.

## Session split

First PR: the stage, the festival rules and evening, the card. Second PR: Bramble's three cards and Oak coming home.
