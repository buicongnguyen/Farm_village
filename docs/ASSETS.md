# Assets and reused code

Everything here is original work or comes from the user's own projects. Nothing is downloaded from third parties except
the npm packages in `package.json` and the Nunito font (SIL Open Font License, `public/assets/FONT-LICENSE.txt`).

## Models (`public/assets/models/`)

| File | Source | Notes |
|---|---|---|
| `crops.glb`, `scenery.glb`, `farm.glb`, `town.glb` | Willowmere (`3d_farmer_fish_sell`, working copy at 6390128) `public/assets/models/` | Copied unchanged. Willowmere took the crop, scenery and farm kits from Zoo Garden (`cute_game`), and made `town.glb` with its own Blender generator (`art/blender/build_town.py`) |
| `rural-lite.glb` | Willowmere's `rural.glb` (at 11df8e9) | Only `home_t1`, `barn`, `mailbox`, `windmill`, `windmill_rotor`, kept by `art/blender/extract_kit.py` (2.5 MB → 0.5 MB) |
| `market-stall.glb`, `well.glb`, `animal-produce.glb` | Willowmere at 11df8e9 | Copied unchanged |
| `hero-tall.glb`, `hero-girl-tall.glb`, `hero-tiny.glb`, `hero-girl-tiny.glb` | Willowmere `public/assets/models/` (from Zoo Garden) | Copied unchanged; villagers and neighbours |
| `farm-kit.glb` | New: `art/blender/build_farm_kit.py` with Willowmere's `style.py` | Crops in three stages (wheat, carrot, corn, pumpkin, strawberry; authored `_mid` levels), feed mill + `feed_mill_sails`, bakery, coop with yard, cow barn, picket fence set, bench, lamp, order board, bed rim; anchor empties (AAA pass). Fixer pass: wheat re-authored as a dense golden stand (ripe 752 → 244 triangles near, 162 → 88 middle; sprouts bigger and greener), leaner corn, carrot and pumpkin middle levels, the cow barn's back and gable walls dressed (stable door, shuttered windows, loft hatch; two more window anchors) |
| `decor.glb` | New: `art/blender/build_farm_kit.py` (AAA pass) | Plank bridge, fountain, bunting, banner, For-sale sign, scaffold, window box, door lantern, flowerpots, doormat, path stones, obstacle bush / stump / log |
| `discovery-props.glb` | New: `art/blender/build_farm_kit.py` (AR-009) | Keepsakes `lucky_tin`, `lucky_button`, `lucky_box`: handheld, loaded only when a discovery shows one |
| `props.glb` | Starline (`3D_game_scene`, at 42424c7) `public/models/*.glb`, made by its `art/blender/build_props.py` | Scarecrow, haybale, sacks, crate, barrel, cart, signpost, postbox, street lamp, flowerpot, laundry line, beehive branch; joined into vertex-colour roots by `art/blender/extract_kit.py` (`art/blender/kits/props.json`), colours boosted 1.1–1.15, decimated `_mid` levels |
| `nature.glb` | Starline at 42424c7 `public/models/*.glb`, made by its `art/blender/build_nature.py` | Lily pads, reeds, stepping stones, rocks, flowers, hydrangea, bushes, grass tuft, broadleaf, maple, sakura, chestnut and peach trees (Starline `-lod` copies as `_mid`); `tree_peach_bare` (fruit node dropped), `tree_apple` / `tree_apple_bare` (peach recoloured red, leaves deeper green); colours boosted (`art/blender/kits/nature.json`) |
| `rural-extra.glb` | Willowmere `public/assets/models/rural.glb` (working copy at 6390128) | Silo, home_t0 / t2 / t3, picket and rail fence, round hay bale, tractor, pond dock, stump; vertex-colour roots (`art/blender/kits/rural-extra.json`) |
| `farm.glb` (AAA pass) | Willowmere `farm.glb` roots unchanged, plus Zoo Garden (`cute_game`, at 96f8748) `public/assets/models/farm.glb` goat, kid, goose, gosling, goat_shelter, goose_shelter | Rebuilt as vertex-colour roots by `art/blender/extract_kit.py` (`art/blender/kits/farm.json`) |
| `nunito.woff2` | Willowmere `public/assets/` | Font, with its license |

All models are vertex-coloured kit pieces with no textures. The game bakes each root node into one geometry
(`src/view/models.mjs`).

Every top-level GLB is compressed with gltfpack (meshopt, 8-bit normals and colours, float positions, named nodes kept)
by `art/blender/pack.mjs`; the decoder ships with three.js and is set in `models.mjs`. The first-wave kits went from
473 KB to about 280 KB gzipped, and the first scene on simulated 4G from 3.2 s to 2.2 s. gltfpack (npm `gltfpack`,
MIT) is a build tool only, not a dependency of the game.

## Icons (`public/assets/icons/`)

| Files | Source | Notes |
|---|---|---|
| 92 WebP icons: all 92 rendered at 256 px from `icons.json` (the four fish since the reference pass) | New: `art/blender/render_icons.py` and `icon_post.py`, ported from Starline's scripts of the same names (at 42424c7) | Job list `art/blender/icons.json`. Goods from `art/blender/build_items.py` (new); buildings and decorations from our kits; tools: Starline `hammer.glb`, our shovel, sickle, glove and Starline crate; portraits: Starline `villager-man/woman/kid.glb`, `hana.glb`, `mika.glb`, `genzo.glb` (Starline `build_characters.py`), recoloured per person. Willowmere's and Starline's icon sheets were used only as a visual reference |

## Added in v0.3b
`farm-kit.glb` gained `truck` and `pond` (our own Blender pieces, `art/blender/build_farm_kit.py`). Icons `perch`, `carp`, `catfish`, `goldfish` are copied from Willowmere (`3d_farmer_fish_sell/public/assets/icons/fish/fish_perch|carp|catfish|golden.webp`); `round_tree`, `pine_tree` are rendered from Willowmere's `scenery.glb` (`tree_round`, `tree_pine`); `market`, `pond`, `truck` icons from our own kit.

`fish.glb` is Willowmere's fish kit (`3d_farmer_fish_sell/public/assets/models/fish.glb`, itself from Zoo Garden), packed with `art/blender/pack.mjs`; the ponds draw perch, carp, catfish and golden carp from it.

`farm-kit.glb` (AR-001 look pass): the cute tree and pine leaf colours were deepened in `build_farm_kit.py` (leafw `#4fab45`, leafwl `#8fd04c`, leafwd `#3a8444`, pinew `#2f8a50`, pinewl `#58b45e`) and the kit rebuilt; no geometry changed.

## Tools in `art/blender/`

| Script | What it does |
|---|---|
| `build_farm_kit.py` | farm-kit.glb, decor.glb, discovery-props.glb and `anchors-farm-kit.json` |
| `extract_kit.py` | kits from other GLBs as vertex-colour roots (spec files in `kits/`), or the legacy keep-these-roots mode |
| `anchors.mjs` | writes `ANCHORS` into `src/view/kinds.mjs` (farm-kit anchors, plus window points of the cottages and the farmhouse found from their glass faces) |
| `pack.mjs` | meshopt compression with gltfpack |
| `build_items.py`, `render_icons.py`, `icon_post.py` | icons |
| `sheet.mjs` | in-engine contact sheets (the game's bake, toon material and camera) for reviewing kits |

## Code adapted from Willowmere

| Here | Willowmere source | Change |
|---|---|---|
| `index.html` loader | `index.html` | Same stale-file guard; renamed keys (`fv-fresh-reload`, `__fvFresh`, `__fvSave`) |
| `scripts/build.mjs` | `scripts/build.mjs` | Same first-load budget and stamps; `--test-mode` flag; port 5240 |
| `scripts/keep-chunks.mjs` | `scripts/keep-chunks.mjs` | Site from `SITE_URL`; no first-run crawl |
| `.github/workflows/pages.yml` | `.github/workflows/pages.yml` | Same steps |
| `src/kit/i18n.mjs`, `tests/i18n.test.mjs` | `src/i18n.mjs`, `scripts/vi-coverage.mjs` | Rewritten small: English text as key, coverage as a unit test |
| `src/kit/toon.mjs` | `src/toon.mjs` | Rewritten small: same 4-step ramp and lights |
| `src/view/batches.mjs`, `camera.mjs`, `models.mjs`, `ground.mjs` | `prototypes/big-farm/main.mjs` (this repository) | The measured rendering approach |

## v0.4 orchard and clinic

- `farm-kit.glb`: original `cute_cherry`, `cute_cherry_bare`, paired `cherries`, `fruit_stand` and `kennel` pieces in `art/blender/build_farm_kit.py`, using the existing vertex-colour style helpers. Generated with Blender 4.5.9 LTS and packed with `art/blender/pack.mjs` (287,336 → 314,988 bytes for the packed kit).
- `clinic`: the existing `hospital` root in `town.glb`, originally authored by Willowmere's town generator; reused at a 4 × 3-cell footprint. No third-party asset added.
- Icons `cherry`, `cherry_tree`, `fruit_stand`, `kennel`, `clinic`: `art/blender/render_icons.py` jobs in `icons.json`, rendered from the roots above. `person-hazel`: the existing Starline villager-woman portrait with grey hair and a light coat, using the same generator and recorded source path.
- Chapter 5 reuses the existing clinic, petition and festival-poster story panels as the chapter's history; its text and ending are new.

## Truck fleet

- `decor.glb`: `truck_teal` and `truck_sun`, the second and third delivery trucks: the existing `truck()` pickup in
  `art/blender/build_farm_kit.py`, now with body, roof and cargo parameters (the red `truck` in `farm-kit.glb` is
  byte-identical). 1,144 triangles each. Original.

## AR-009 lucky finds

- `discovery-props.glb`: original `lucky_tin` (a teal tin with a cream label and red fish, brass rims, its lid, two
  coins, a puddle and a notched lily pad), `lucky_button` (a brass fish button with a four-hole centre and a tiny pond
  engraved on its back, against a soft blue cloth pouch) and `lucky_box` (a wooden trinket box with a teal lining and a
  slate pebble on ribbon-tied cloth). Made in `art/blender/build_farm_kit.py` with the existing vertex-colour helpers at a
  0.5 m working size and written at handheld size (× 0.3); Blender 4.5.9 LTS; packed with `art/blender/pack.mjs`.
  No third-party asset or reference-game art used.
- Icons `lucky_tin`, `lucky_button`, `lucky_box`: `art/blender/render_icons.py` jobs in `icons.json`
  (`raw:discovery-props`).
- Comparison images: `docs/discovery-props/`.

## Reference pass (opening composition and item art)

- Icons `wheat`, `bread`, `corn_bread`, `chicken_feed`, `cow_feed`, `egg`: new models in `art/blender/build_items.py`
  (original), rendered by `render_icons.py`.
- Icons `perch`, `carp`, `catfish`, `goldfish`: now rendered by our icon rig from Willowmere's fish kit
  (`3d_farmer_fish_sell/public/assets/models/fish.glb`, the user's own project, nodes `fish_perch`, `fish_carp`,
  `fish_catfish`, `fish_golden`). Carp and catfish are recoloured warmer. They replace the 160 px copies of
  Willowmere's fish icons.
- No new models in the game: the farmhouse forecourt is ground colour plus small tiles and two planters in the
  homestead's `home-hedge` mesh, and the existing bench.
- Before and after: `docs/reference-pass/`.

## Icon render v2

- All 92 icons re-rendered by `art/blender/render_icons.py` (Cycles, camera-relative area lights, a warm gradient world,
  a hidden bounce floor, per-icon `rough`/`metal`, camera `preset`s) and `icon_post.py` (a round 2.8 % outline). Same
  sources as before; no new third-party art. `farm-kit.glb`: the pond's water discs moved 4 and 8 mm apart (no change
  to node counts or bounds).

## AR-010 discovery trail

- `exploration-props.glb` (21 KB, meshopt; generator `art/blender/build_farm_kit.py`, section "discovery trail (AR-010)",
  Blender 4.5.9; original; one shared vertex-colour material). World size, base-centre pivot, front +z, no anchors:
  `trail_porch_box_closed` 428 tris (0.75 × 0.46 × 0.35 m), `trail_porch_box_open` 452 tris, `trail_pond_cache_closed`
  350 tris (about 0.8 m across with its earth patch and reeds), `trail_pond_cache_open` 372 tris, `trail_picnic_ribbon`
  328 tris (0.42 m wide). No lettering.
- Icon `trail_picnic_ribbon`: `render_icons.py` job (`raw:exploration-props`). Previews: `docs/discovery-trail/`.

## AR-011 / AR-012 (2026-10-09)

- `decor.glb` `hospital`: original Blender model in `art/blender/build_farm_kit.py` (the clinic's upgrade tier).
- `decor.glb` `potting_bench_overgrown`, `potting_bench_repaired`, `potting_bench_done`: original Blender models in `art/blender/build_farm_kit.py` (AR-013).
- `interior-farmhouse.glb` + `interior-farmhouse.json` (AR-015): original Blender models in `art/blender/build_farm_kit.py` (`interior_kit`): the farmhouse room shell, six furniture props and their `_mid` copies, anchor empties and the room metadata. Sofa seat fitted to the measured Sit clip of `villager-man` / `villager-woman`. Previews in `docs/ar015/`.
- Icons `police`, `company`: rendered from Willowmere's `town.glb` (the user's own project), replacing copied placeholders.
- Icons `hen`, `cow`: rendered from this repository's `public/assets/models/rigged/chicken.glb` and `cow.glb`
  (render_icons.py `self:` sources). `ui:today`, `ui:mail`, `tool:demolish`, `ui:harvest_all`: original models in
  `build_items.py`; `ui:projects`: our `scaffold`.
- `public/assets/icons/sm/`: 64 px variants of every icon, generated by `art/blender/icon_small.py`.
