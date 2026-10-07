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
| 73 WebP icons, 256 px | New: `art/blender/render_icons.py` and `icon_post.py`, ported from Starline's scripts of the same names (at 42424c7) | Job list `art/blender/icons.json`. Goods from `art/blender/build_items.py` (new); buildings and decorations from our kits; tools: Starline `hammer.glb`, our shovel, sickle, glove and Starline crate; portraits: Starline `villager-man/woman/kid.glb`, `hana.glb`, `mika.glb`, `genzo.glb` (Starline `build_characters.py`), recoloured per person. Willowmere's and Starline's icon sheets were used only as a visual reference |

## Tools in `art/blender/`

| Script | What it does |
|---|---|
| `build_farm_kit.py` | farm-kit.glb, decor.glb and `anchors-farm-kit.json` |
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
