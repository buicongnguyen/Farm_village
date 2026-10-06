# Farm Village — progress log

Where the project stands, what is being worked on, and what comes next. Read this first when picking the work up again.
Update it at the end of every work session: change the status, add a line to the log, and set the next step.

## Current status

- **Phase:** building v0.1. **M0–M3 are done** (locally; no GitHub remote yet). **Next: M4**, the village: cottages and
  families on screen, the projects panel with "show the way", the school, people walking, Mai and Gus visiting, and
  the Today board.
- **Waiting for the user:** hosting (public repository, or private source with a public play repository) before the
  first push and deploy.
- **What works now** (`npm run dev`, then http://127.0.0.1:5240/; add `?new` for a fresh farm):
  - **Building:** clear the land, place paths and beds.
  - **Farming:** plant by tapping, then sweep across more beds; crops grow in stages; harvest.
  - **Animals and production:** feed mill and coop with fenced hens; the bakery and its queue.
  - **Selling:** fill orders on the order board; the barn has a capacity and an upgrade; the roadside stall.
  - **Saving:** the game saves itself and counts time away.
  - **Phone budget:** a fully planted large farm holds it.

## Decisions so far

| Date | Decision | Where it is written |
|---|---|---|
| 2026-10-07 | Single-player cozy farm and village game; AI neighbours instead of online play; no combat | GAME-CONCEPT |
| 2026-10-07 | Keep farming, animals, production, orders; fishing as a side activity (v0.2); studying becomes Pip's homework (v0.3); job shifts and Pandora cut | GAME-CONCEPT section 4 |
| 2026-10-07 | Working answers: no energy bar, phone first, fresh repository using Willowmere's kit, "Farm Village" working name, village called Hollowbrook | DESIGN (top), GAME-CONCEPT section 7 |
| 2026-10-07 | **One renderer: 3D (Three.js) shown like 2.5D** (fixed tilted orthographic camera, pan, zoom, 90° turns). No separate 2D mode | DESIGN 3.2, TECH-PLAN 6, GAME-CONCEPT 7 |
| 2026-10-07 | **Large map:** 128 × 128 cells; the farm is 4 × 4 parcels of 16 × 16 cells (2,000–3,000 crops), with fields, helpers and tools. v0.1 stays small (30 beds); the large farm opens in v0.2 | DESIGN 3.1 and 5.1, ECONOMY 8, ROADMAP |
| 2026-10-07 | **Drawing rules:** baked vertex-coloured models, chunked instancing, three levels of detail with chunk sizes 8 / 16 / 32 | TECH-PLAN 6, prototypes/big-farm |

## Open questions

- Hosting: a public repository, or a private source repository that deploys to a public play repository (decide at M0).
- Final game name.

## Plan documents

| File | Status |
|---|---|
| `docs/GAME-CONCEPT.md` | Done |
| `docs/DESIGN.md` | Done, including the large map, fields, helpers and the camera rule |
| `docs/ECONOMY.md` + `planning/pace-model.mjs` | Done for v0.1 (30 beds). The large-farm re-tune is planned for v0.2 (ECONOMY section 8) |
| `docs/TECH-PLAN.md` | Done, including the measured rendering rules |
| `docs/ROADMAP.md` | Done; M2 includes the real-phone check and the budget test |
| `prototypes/big-farm/` | Done; measured |
| `docs/MARKET-RESEARCH.md`, `docs/IDEAS.md`, `docs/GAME-DIRECTION.md` | Background from Willowmere |

## Log

| Date | What was done | Commit |
|---|---|---|
| 2026-10-07 | Repository created with the research and ideas from Willowmere | 823b0e3 |
| 2026-10-07 | Game concept: what the game is; activities kept, changed or cut | 35f3656 |
| 2026-10-07 | Detailed plan: DESIGN, ECONOMY with the pace model, TECH-PLAN, ROADMAP | 90dd5d4 |
| 2026-10-07 | The user confirmed phone performance is fine (their earlier reference code runs well on phones); started executing the roadmap | – |
| 2026-10-07 | M0: build, loader guard, keep-chunks, Pages workflow, first scene (ground chunks, farmhouse, barn, woods, camera), i18n coverage test, browser suite | 50373cd |
| 2026-10-07 | M1: rules core (grid, farm, animals, production, barn with holds, orders, build order, cottages with rent and charm, neighbours, Today, stall) behind act()/tick(); full Vietnamese for content and reasons; simulation on the real rules meets the pace targets; found and fixed: order XP bug, oversized orders, barn overflow handling | 63a36e2 |
| 2026-10-07 | M2: land view from the rules state (cells, weeds, rocks, placed things, fences), build mode (catalogue, ghost, rotate/place/move/store/clear, fences on the nearest edge, undo), HUD with level and coins; 30 tests and 10 browser checks pass | b80badb |
| 2026-10-07 | M3: farm-kit models from Blender (wheat, feed mill, bakery, bench, lamp, order board); crops in growth stages, animals wandering in their fences, produce and sparkles; tap menu with sweep; order board, barn, production and stall panels; flying icons; autosave with backup and time-away catch-up; budget check on a fully planted 64 × 64 farm (≤ 69 draws, ≤ 143k triangles); quick tutorial wheat now lasts until the first harvest | 2857418 |
| 2026-10-07 | Big-farm prototype built and measured: per-level chunks (8/16/32) and three levels of detail keep phone budgets; plan updated (large map, fields, helpers, camera rule, rendering rules); PROGRESS.md added | 3af4e0d |

## How to resume

1. Read this file, then `docs/GAME-CONCEPT.md`.
2. `node_modules` is a junction to Willowmere's (`..\3d_farmer_fish_sell\node_modules`). If it is missing, recreate it with
   `cmd /c "mklink /J node_modules ..\3d_farmer_fish_sell\node_modules"`, or run `npm install`.
3. Prototype: `npm run proto`, then open `http://127.0.0.1:5240/prototypes/big-farm/`
   (`?dense` plants every farm cell, `?nolod` turns stand-ins off, `?nochunk` uses one batch for the whole map).
4. Measure the prototype again: `npm run proto:measure` (with the server running).
5. Economy model: `npm run pace -- steady 70`.
