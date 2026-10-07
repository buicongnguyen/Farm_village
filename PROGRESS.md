# Farm Village — progress log

Where the project stands, what is being worked on, and what comes next. Read this first when picking the work up again.
Update it at the end of every work session: change the status, add a line to the log, and set the next step.

## Current status

- **Phase:** building v0.1. **M0–M5 are done** (locally; no GitHub remote yet). **Next: M6**, the v0.1 release:
  - a playtest with 3–5 first-time players;
  - fixes;
  - the release checklist;
  - the first deploy.
- **Live:** https://buicongnguyen.github.io/Farm_village/ (public repository github.com/buicongnguyen/Farm_village,
  pushed over SSH; every push to `main` runs the tests and deploys GitHub Pages, like Willowmere).
- **Waiting for the user:** playtest feedback (3–5 first-time players) for M6.
- **What works now** (`npm run dev`, then http://127.0.0.1:5240/; add `?new` for a fresh farm):
  - **The full v0.1 game:** farm, animals, production, orders, the village with families and the school, people and
    neighbours, the Today board.
  - **The first session:** chapter cards and Ada's guide.
  - **Settings:** language, sound and music, day and night, text size, motion, graphics, three save slots,
    export/import.
  - **The album** of chapters and first times.
- **Art still to make** (the M5 art items moved to the v0.2 art pass):
  - working animations for the feed mill and bakery;
  - cozy and deluxe cottage dressing;
  - the building scaffold animation;
  - `*_mid` models from Blender (the loader simplifies at runtime for now).

## Decisions so far

| Date | Decision | Where it is written |
|---|---|---|
| 2026-10-07 | Single-player cozy farm and village game; AI neighbours instead of online play; no combat | GAME-CONCEPT |
| 2026-10-07 | Keep farming, animals, production, orders; fishing as a side activity (v0.2); studying becomes Pip's homework (v0.3); job shifts and Pandora cut | GAME-CONCEPT section 4 |
| 2026-10-07 | Working answers: no energy bar, phone first, fresh repository using Willowmere's kit, "Farm Village" working name, village called Hollowbrook | DESIGN (top), GAME-CONCEPT section 7 |
| 2026-10-07 | **One renderer: 3D (Three.js) shown like 2.5D** (fixed tilted orthographic camera, pan, zoom, 90° turns). No separate 2D mode | DESIGN 3.2, TECH-PLAN 6, GAME-CONCEPT 7 |
| 2026-10-07 | **Large map:** 128 × 128 cells; the farm is 4 × 4 parcels of 16 × 16 cells (2,000–3,000 crops), with fields, helpers and tools. v0.1 stays small (30 beds); the large farm opens in v0.2 | DESIGN 3.1 and 5.1, ECONOMY 8, ROADMAP |
| 2026-10-07 | **Hosting:** public repository buicongnguyen/Farm_village, SSH push, Pages deployed by the workflow on push to main (same as Willowmere) | README, PROGRESS |
| 2026-10-07 | **Drawing rules:** baked vertex-coloured models, chunked instancing, three levels of detail with chunk sizes 8 / 16 / 32 | TECH-PLAN 6, prototypes/big-farm |

## Open questions

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
| 2026-10-07 | M4: village ruins, projects panel (requirements, deliver, "show the way", Build on the ruin), cottage panel (family, charm, rent, furnish), welcome cards, mailbox, people walking on paths (residents, Cora), neighbour visits with speech bubbles, Today board (gift, waiting, trades, news), charm preview; 16 browser checks pass | e79c364 |
| 2026-10-07 | M5: chapter cards and Ada's tutorial with HUD buttons unlocking step by step, pointer markers, I know how / skip; confetti; synthesised sounds and music; day and night from the real clock; settings (language, volumes, daylight, text size, motion, graphics with a frame-rate guard, three saves, export/import, start over); album of chapters and first times; one modal queue; first-frame models 5.3 → 1.5 MB; 30 tests, 19 browser checks | bb85ed8 |
| 2026-10-07 | Release candidate 0.1.0: production build smoke test (phone and PC, no test hooks), CHANGELOG, README how-to-run | a67d1ea |
| 2026-10-07 | Published: repository created, pushed over SSH, Pages enabled; CI failed once (tests depended on the time zone: GitHub runs UTC) and the tests now pin Asia/Seoul; live site checked on phone and PC with no errors or missing files | 7e9282f |
| 2026-10-07 | Big-farm prototype built and measured: per-level chunks (8/16/32) and three levels of detail keep phone budgets; plan updated (large map, fields, helpers, camera rule, rendering rules); PROGRESS.md added | 3af4e0d |
| 2026-10-07 | AAA integration (branch aaa-integrate): the six packages merged; their cross-package hooks applied (crop stages, sails, window glows from anchors, charm milestones, For-sale signs from the rules, plaza kept clear, story beats, nature scatter, meshopt rigs, pond ducks once); npm test 74/74; first load 986 → 849 KB (cast, juice, sky life and Vietnamese lines in their own chunks); every browser suite green; story panels rendered; ui-package hooks listed for the next stage | 94efa53 |

## How to resume

0. Deploy: commit and `git push` (SSH remote `origin`); the Pages workflow tests and publishes. Watch with `gh run list -R buicongnguyen/Farm_village`.

1. Read this file, then `docs/GAME-CONCEPT.md`.
2. `node_modules` is a junction to Willowmere's (`..\3d_farmer_fish_sell\node_modules`). If it is missing, recreate it with
   `cmd /c "mklink /J node_modules ..\3d_farmer_fish_sell\node_modules"`, or run `npm install`.
3. Prototype: `npm run proto`, then open `http://127.0.0.1:5240/prototypes/big-farm/`
   (`?dense` plants every farm cell, `?nolod` turns stand-ins off, `?nochunk` uses one batch for the whole map).
4. Measure the prototype again: `npm run proto:measure` (with the server running).
5. Economy model: `npm run pace -- steady 70`.
