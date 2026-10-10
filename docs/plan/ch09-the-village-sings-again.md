# Chapter 9: The village sings again

Status: **done** (PR #84, in one PR) · Depends on: chapter 8 · Size: two sessions (stage and festival; Oak comes home)

## How to play it (for the owner)

1. On the village square a burned platform stands where the old stage was. Tap it (or Village projects → "The
   festival stage"): at level 12, for 1,500 coins, **Build** puts the new stage there.
2. Tap the stage (or the project "The Harvest Festival"). The panel lays a feast from your barn: six different foods,
   three of each (made food first, then fruit, eggs and milk, then crops). **Hold the Harvest Festival**.
3. The evening begins whatever the clock says: dusk, strings of coloured lanterns over the square, a quicker tune
   with a drum, and everyone in the village walks to the square, faces the stage, cheers and waves. The hat pays more
   than the feast was worth and everyone you can give gifts to gains a heart. A "Festival" pill shows the time left
   (three minutes at testing pace).
4. When the evening is over the chapter 9 card appears: Bramble's story of the fire. Then a scene with Dr Fern and
   Bramble, then **Oak comes home**: from now on he walks about the farm and the village, fishes, and has things to
   say when tapped.
5. The festival can be held again after the village has rested (twenty minutes at testing pace).

Tester (`?tester`): "Finish every timer" also ends the evening; "Finish this chapter" builds the stage and counts a
festival.

## What was built, where it differs from the plan below

- One PR, not two.
- The stage is a fixed site (`core/sites.mjs`, as the dock): `SITES` has `ruin: 'stage_burned'`, which the world shows
  on the site until the building stands (instead of a sign). It costs coins only (no goods to deliver).
- `src/core/festival.mjs`: `feastOf`, `festivalOf`, `holdFestival`, `tickFestival`. The feast is chosen for the player
  (best first), not picked slot by slot. **The deed counts when the evening is over**, so the card does not cover it.
- The evening is spread over existing views, with no new view class: `daylight.mjs` (the hour is 20.4 while it
  lasts, unless the player chose "always daytime"; the lanterns are glows), `people-view.mjs` (`liveParty`: each
  walker takes a free place nearest the stage's front and retries if the way is blocked), `juice.mjs` (confetti at
  the start), `kit/sound.mjs` (`setMood('festival')`).
- Oak: `oakHome(s)` in `content/people.mjs` (chapter 9 seen); he is a walker with his own lines and likes to fish. The
  `away` flag stays in the data as documentation; nothing read it.
- Bramble's truth is on the chapter card; one scene follows it (`gus-truth`), then `oak-home`.
- Roadmap stage "The village sings again" (stage, festival).
- `tests/browser.mjs` takes `ONLY="text"` to run the checks whose name contains it.
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
