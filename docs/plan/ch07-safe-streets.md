# Chapter 7: Safe streets

Status: **done** (PR #82) · Depends on: chapter 6 · Size: one session · Level reach: 12

## How to play it (for the owner)

1. From level 8 a For-sale-style sign stands on the south bank of the brook, a few steps east of the road bridge.
   Tap it (or open Village projects → "A dock on the brook"). At level 10, with 800 coins, **Build** puts the boat
   dock there.
2. Tap the dock: the fishing panel opens as "Boat dock". Cast: you walk onto the deck and fish in the brook, where the
   rare fish bite twice as often. In Explore mode, walk onto the deck and cast as at any pond.
3. Plant a bed within three cells of a fish pond you built: it grows a fifth faster and its menu says "Watered by the
   pond".
4. Rebuild the police post (level 12). Constable Sage arrives and writes three letters, one after the other is read.
5. With the police post working and the dock built, the chapter 7 card appears.

Tester (`?tester`): "Jump to chapter 7" starts here; "8" arranges this chapter's deed.

## What was built, where it differs from the plan below

- **Fixed sites are their own small system** (`src/core/sites.mjs`), not the civic-ruin code: a building with
  `site: true` has one place (`SITES` in `content/world.mjs`), is built by `buildSite` from its own panel, and can
  never be placed, moved, stored or taken down by hand. Chapter 9's stage and later fixed things reuse it.
- The dock's site is cells (32–33, 13–14): outside the farm, the village and the road verge, so nothing of the
  player's can ever be in the way. The bank round it (`DOCK_BANK`) is public walking ground.
- **The dock is fishing water like a pond** (`waterOf`, `seatsOf`, `fishable` in `core/pond-bank.mjs`): the stretch of
  brook in front of it is on the list of ponds under the dock's id, so the pond panel, the walk to the seat (on the
  deck), Explore casting, the float and the swimming fish all work without a second fishing system. A line cast there
  is a `river` line: rare fish count double (`RIVER.rare`; with bait, four times).
- Watered beds: `wateredBed()` in `core/grid.mjs`, `WATERED` in `economy.mjs`; the bed keeps `watered: true`.
- The constable's working id is `pearl`; her names are Constable Sage / Cô Tre / 반듯 순경 / きりり巡査.
- The roadmap stage "Safe streets and work for all" is real now (police post, dock); chapter 8 adds its two deeds.
- No droplet mark on watered beds (the bed's menu says it); no new fish kinds.
Story source: `STORY.md` 4 (row 7), `JOURNEY.md` 3

## What the player gets

- The **police post** matters: an officer arrives with it, and her old reports arrive as three letters.
- A **boat dock** on the brook, built by Skipper: a better place to fish, in Explore mode too.
- **Ponds water the beds**: a crop bed within three cells of a fish pond you built grows a fifth faster.
- The water thread: the sluice was shut the summer before the mill closed.

## The deed

`when: s => workingCount(s, 'police') > 0 && (s.counts.dock ?? 0) > 0`

## Rules

- **The dock.** `content/buildings.mjs`: `dock: { name: 'Boat dock', cat: 'projects', size: [2, 2], level: 10, cost: 800, civicSite: true, max: 1, model: 'dock' }`.
  It has a fixed site on the south bank of the brook: add `{ kind: 'dock', x: 33, z: 14, rot: 0 }` to a new list
  `SITES` in `content/world.mjs` (not `RUINS`: nothing old stands there) and let `rebuildCivic` and `canPlace` read
  `RUINS.concat(SITES)`. Check with `isBrook` that the site's north edge touches water and none of its cells is water.
  The dock needs no door path (`door: false`).
- **River fishing.** `pondsOf(s)` in `core/pond-bank.mjs` gains the brook pool by the dock once it stands (an ellipse
  on the water beside it, `id: 'brook'`). `castLine({ pond: 'brook' })`: rare fish count double, as with bait.
  `pick()` in `core/fishing.mjs` takes that flag from the line. The bank rules already work for any pond in the list.
- **Watered beds.** `core/farm.mjs` `plant`: `growMs * (wateredBed(s, x, z) ? 0.8 : 1)`. `wateredBed` (new, in
  `core/grid.mjs`): any placed `pond` whose footprint is within three cells. Stamp `watered: true` on the bed so the
  view can show it and a later move of the pond does not change a growing crop.
- **The officer.** `content/people.mjs`: `{ id: 'pearl', role: 'Constable', arrives: 'police', noOrders: true, noGifts: true }`.
- **Letters** (`content/letters.mjs`): `pearl-1`, `pearl-2`, `pearl-3`, each `after` the one before, the first `when`
  the police post stands. Reward: a few coins or a keepsake, as other letters do.
- Project step `dock` ("A dock for the brook", level 10, `site: 'dock'`), after `police`.

## Content and story

- Names: `pearl` → choose in the four languages with the chapter (a calm, exact voice; Vietnamese pair **cô – cháu**).
- `CHAPTERS` id 7, "Safe streets". Text: the lamp over the police post is lit again; the officer reads thirty years
  of reports in a week; Skipper hammers the last plank of the dock and pretends it was nothing. Maple's line: she
  sleeps better with a lamp at the end of the lane.
- The three letters carry the finding in steps: (1) the reports are in order and mostly about lost hens; (2) one
  summer has pages about low water and complaints from the mill; (3) the sluice gate upriver was closed that summer,
  on the flour company's order, and the mill wheel had no water the next year. No dates (`STORY.md` 3).
- `BEATS`: `olaf-dock` (dock built; Skipper, Sunny), `pond-water` (first watered bed; Rosie).

## View and art

- `dock` in the decor kit (`art/blender/build_farm_kit.py`): a plank deck on posts reaching over the water, a moored
  rowing boat, a lantern post, a coil of rope. About 4 × 4 m, under 1,500 triangles. Icon for the catalogue.
- A watered bed shows a small droplet mark on its rim (reuse the marks layer in `view/marks-view.mjs`).
- The officer: `woman` rig, navy top, dark bottom.
- Three chapter pictures.

## Interface

- The dock is built from Village projects like the police post (the direct rebuild panel).
- The pond panel and the Explore "Cast a line" pill work at the dock.
- Bed info line: "Watered by the pond: grows faster".

## Old saves

A farm with the police post standing has half the deed. A farm with ponds beside its beds gets watered beds from
the next planting.

## Tests

Rules: the dock only on its site and only when the site is clear (a path there is lifted by the rebuild); the brook
pool exists only with the dock; rare odds at the brook; `wateredBed` distances and the 0.8 factor; the letters'
order; chapter `when`; old saves. Browser: jump to chapter 7, rebuild the police post, build the dock, cast from it
in Explore, see the card.

## Not in this chapter

Irrigation channels, ducks and geese, river-only fish. See `99-after-the-story.md`.
