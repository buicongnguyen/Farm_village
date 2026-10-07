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
| `farm-kit.glb` | New: `art/blender/build_farm_kit.py` with Willowmere's `style.py` | Wheat, feed mill, bakery, bench, lamp, order board |
| `nunito.woff2` | Willowmere `public/assets/` | Font, with its license |

All models are vertex-coloured kit pieces with no textures. The game bakes each root node into one geometry
(`src/view/models.mjs`).

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
