# Act IV groundwork: the far bank

Status: not started · Depends on: chapter 12 · Size: two to three sessions, three PRs
Story source: `JOURNEY.md` 3 (Act IV) and 6 (zones)

This file is not a chapter. It builds the ground chapters 13 to 15 stand on.

## What it delivers

A fourth zone north of the brook, the **riverside town**: a quay road, lots for tall buildings, and the rules, views
and budgets that let a few big buildings stand there without slowing phones.

## The land

- `content/world.mjs`: `RIVERSIDE = { x0: 32, x1: 99, z0: 1, z1: 6 }` (rows 0 to 7 are free of the brook: check
  with `isBrook` across every column and shrink `z1` where the brook's sine comes up).
- `inRiverside(x, z)`; `landOf(x, z)` returns `'riverside'` there.
- **The quay**: a fixed road along `z = 6..7` from the bridge (`x = 28..29`) east to `x = 99`, added to the road
  list as `road_quay`. Drawn with the cobble material and a low stone edge towards the water.
- **The old mill** already stands on this bank (chapter 8; `OLD_MILL` in `content/world.mjs`, cells 39–43 × 5–7): the
  quay passes behind it and no lot overlaps it. It is the quay's landmark.
- **Lots**: fixed sites, not free placing. `LOTS = [{ id: 'q1', x: 36, z: 1, w: 6, d: 5 }, ...]`, eight lots of
  6 × 5 cells with two-cell gaps, all with their door on the quay. A riverside building goes on a lot and nowhere
  else; nothing else goes on a lot. This reuses the fixed-site rule (`civicRebuildPlan` in `core/build.mjs`) with a
  lot picker instead of one site.
- Scenery (trees, rocks) is cleared from the zone in `view/world-view.mjs` once `s.firsts.bridge` is set; before
  that the bank looks wild.

## Rules

- Catalogue category `riverside` in `content/buildings.mjs`. Entries are added by their chapters (`apartment`,
  `hotel`, `halt`); this file adds the category, the lot rule and one test building behind the tester's menu only.
- `canPlace` for a `riverside` kind: must match a free lot exactly (`lotAt`); never needs a door path.
- `placeOnLot(ctx, { kind, lot })` wraps `place`.
- Walking: the bridge and the zone are walkable (`core/walk.mjs`), Explore mode's bounds grow north.
- Buying: lots are not bought; each building's price includes its lot.

## View and budgets

- **Tall buildings** need their own care. Each is one mesh with at most two materials; windows are part of the
  texture, lit at night by an emissive map that `view/daylight.mjs` already drives for cottages.
- **Levels of detail** (`view/lod.mjs`): near is the full model (under 6,000 triangles each); mid is a box with the
  same texture (under 200); far is a single tinted quad in the shared far mesh. With eight lots the worst case is
  eight near models: assert the far view stays within 120 draws and 300,000 triangles in `tests/far-view.browser.mjs`.
- **Camera**: the overview's north limit moves from the brook to row 0; the "tilt up" limit rises a little so a
  four-storey building is not cut off (`view/camera.mjs` bounds).
- **Shadows**: tall buildings cast long shadows over the brook; the shadow frustum (`view/daylight.mjs`) grows north
  only when the zone is in view.
- **The brook from the north side**: the bank mesh has no north lip today; add it in `view/brook.mjs`.

## Art

In the decor kit (`art/blender/build_farm_kit.py`), late: `quay_edge` (a stone edge piece, instanced), `quay_lamp`
(reuse the lane lamp with a taller post), `lot_sign` ("for the town": reuse `sale_sign` with another tint), and one
`riverside_block` test building. Chapter buildings come with their chapters.

## Interface

- The map and the minimap (if drawn) include the north bank.
- Build mode: choosing a riverside building flies the camera to the quay and shows the free lots as glowing
  outlines; tap one, confirm. Keys as elsewhere (Enter, R is unused there, Esc).
- A zone label "Riverside" in the place-name layer.

## Old saves

Nothing stands north of the brook in any save (the rules never allowed it). Assert on load and ignore otherwise.

## Tests

Rules: no lot cell is water or road; lots do not overlap; a riverside kind only on a free lot; nothing else on a
lot; `landOf`; walking over the bridge. Browser: the far view budget with eight test buildings; build-mode lot
picking by mouse, touch and keys.

## PR split

1. Land, quay, lots, walking, tests (no buildings).
2. Level-of-detail and camera work with the test building.
3. Build-mode lot picking and the zone label.

## Risks

- The brook's sine reaches row 8 at its highest; if any lot would touch it, drop the lot rather than move the brook.
- Phones: eight tall buildings near the camera at once is the budget risk. The lot spacing and mid-LOD distance are
  the two dials.
