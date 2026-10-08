# Farm Village — progress log

Where the project stands, what is being worked on, and what comes next. Read this first when picking the work up again.
Update it at the end of every work session: change the status, add a line to the log, and set the next step.

## Current status

- **Now: v0.3 "Restore Hollowbrook"** — the plan, decisions and its own log are in [docs/PLAN-v0.3.md](docs/PLAN-v0.3.md).

- **AAA pass (0.2.0) — fixer stage done on branch `aaa-integrate`** (not pushed, not merged to `main`). The six
  packages (juice, world, art, cast, story, play) and the ui package are merged; three reviewers (visual, rules, perf)
  reported 26 findings; every finding of severity 2 or more is fixed, with tests (see the log and CHANGELOG 0.2.0).
  - **Next:** a real-phone playtest of the AAA first session, then merge `aaa-integrate` into `main` and deploy.
  - Left over for v0.2: docs/ROADMAP.md, "Left over from the AAA pass".
  - Browser checks for the review: `tests/review.browser.mjs` (touch taps, the guide over the build sheet, a merged
    level card, bubbles, an all-ripe farm on budget, the boot error, the Vietnamese retry). Rules: `tests/review.test.mjs`
    with frozen v0.1 saves in `tests/fixtures/`.

**Before the AAA pass:**

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
| 2026-10-07 | **Build XP is paid once per new building of a kind** (a high-water count); undo takes it back; a finished project step clears the undo stack | DESIGN 4.4, ECONOMY 6 |
| 2026-10-07 | **Letters only name what has happened** (`stat` and `count` triggers, `also` for a second test); heart scenes for everyone who can earn hearts | STORY 5 |
| 2026-10-07 | **A v0.1 save settles its story on load** (old letters filed as read but the newest two, past beats marked seen, order lines in the poster's voice, items moved off the reserved garden and cart cells) | `src/core/upgrade.mjs` |
| 2026-10-07 | **Night is graded in the toon shader** toward moonlit blue by brightness (lamps, windows and bulbs stay warm); far-zoom clouds are a veil (42 % at most) | `src/kit/toon.mjs`, `src/view/sky.mjs` |
| 2026-10-07 | **A touch tap swallows the browser's compatibility click** (the camera's tap handler), so a menu that springs up under the finger is never pressed by the same tap | `src/view/camera.mjs` |
| 2026-10-07 | **The budget check includes an all-ripe farm** (a player back after hours finds every crop ripe) | `tests/review.browser.mjs` |

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
| 2026-10-07 | Code and logic review with fixes: baked walk cycle for the crowd (walkers no longer slide in a frozen pose), refusals leave no trace, bad input refused, clock cannot pay twice, one neighbour visit per login, rent rule matches placement, imported saves checked, slider fix; 94 unit tests, all browser suites | 8e1214d |
| 2026-10-07 | Big-farm prototype built and measured: per-level chunks (8/16/32) and three levels of detail keep phone budgets; plan updated (large map, fields, helpers, camera rule, rendering rules); PROGRESS.md added | 3af4e0d |
| 2026-10-07 | AAA integration (branch aaa-integrate): the six packages merged; their cross-package hooks applied (crop stages, sails, window glows from anchors, charm milestones, For-sale signs from the rules, plaza kept clear, story beats, nature scatter, meshopt rigs, pond ducks once); npm test 74/74; first load 986 → 849 KB (cast, juice, sky life and Vietnamese lines in their own chunks); every browser suite green; story panels rendered; ui-package hooks listed for the next stage | 94efa53 |
| 2026-10-07 | AAA ui package (branch aaa-integrate): rendered icons and toy SVG symbols replace every emoji in the HUD, panels, catalogue, tap menu and toasts; truly modal chapter card with story panels, Ada's line and Hollowbrook, then a flight to the weeds and a pointing hand; story beats once each; toasts deduped, two at most, lock refusals merged; level-up card with unlock tiles; rolling coin counter; hearts, gifts, wishes, mailbox letters, heart-scene and arrival cards; the weekly cart panel and the cart drawn at the gate; fruit picking, For-sale parcels with an outline, animal taps; photo mode; Test section; vivid cream-and-brown restyle with coloured rims and a title splash; 8 new browser checks (27/27), every suite green; first load 849 → 884 KB | 5135321 |

| 2026-10-07 | AAA fixer pass, rules: build XP once per new building (place + undo or store + place minted 500 XP in 100 cycles), no undo past a finished project step (the school was refundable), the cart the day after the school (it came in the same action), story beats in order (Ada names the Okafors before Lan thanks them), event-true letter triggers, the daily gift waits for barn room, stall stacks of one or more (negative stacks minted goods), Elin likes peaches, heart scenes for Ada, Cora, Mai and Gus (+36 Vietnamese lines), autosave on every accepted action, v0.1 saves settle their story (frozen fixtures), charm catches up on load, refusals leave no trace, June and Pip's pronouns; 13 new rule tests | 664f767 |
| 2026-10-07 | AAA fixer pass, phone: a touch tap no longer presses the menu that springs up under it (it planted corn, harvested, could buy land), Ada's guide folds to a chip above the build sheet and her hand points at the card, the sheet opens on the step's tab, build tabs on their own row, HUD buttons step aside in build mode, merged level card folds extra tiles with sticky buttons, bubbles clamped by their width with the name on its own line, boot error with Try again, Vietnamese download retried with a fresh URL | f56bee7 |
| 2026-10-07 | AAA fixer pass, art and budget: all-ripe farm 358k → 288k triangles at span 90 (PC) by re-authoring wheat (dense golden stand, 752 → 244 near, 162 → 88 middle), leaner corn, carrot and pumpkin middle levels and woods; bed rims read as tilled soil; review browser suite (10 checks) | ee23026 |
| 2026-10-07 | AAA fixer pass, look: moonlit blue night, far clouds a veil, cow barn back and gables dressed, cottage backs with flower boxes, bushes and flowers, pens with trodden earth and hay; CHANGELOG 0.2.0, docs | ec6847f |

## How to resume

0. Deploy: commit and `git push` (SSH remote `origin`); the Pages workflow tests and publishes. Watch with `gh run list -R buicongnguyen/Farm_village`.

1. Read this file, then `docs/GAME-CONCEPT.md`.
2. `node_modules` is a junction to Willowmere's (`..\3d_farmer_fish_sell\node_modules`). If it is missing, recreate it with
   `cmd /c "mklink /J node_modules ..\3d_farmer_fish_sell\node_modules"`, or run `npm install`.
3. Prototype: `npm run proto`, then open `http://127.0.0.1:5240/prototypes/big-farm/`
   (`?dense` plants every farm cell, `?nolod` turns stand-ins off, `?nochunk` uses one batch for the whole map).
4. Measure the prototype again: `npm run proto:measure` (with the server running).
5. Economy model: `npm run pace -- steady 70`.

## Codex handoff — v0.4 (2026-10-08)

Started from Claude's clean `576ab26` on branch `codex/v0.4-orchard`. The orchard, roadmap, fruit stand, Biscuit's kennel, clinic and chapter 5 are implemented. Save version 5 resets only the former chapter 5 teaser for older saves. The clinic's civic-row doorstep is connected and the project ghost preserves the ruin's footprint and rotation.

The rendering stress check includes a fully ripe farm, twelve cherry trees, the stand, kennel, clinic and four households, sampling both sides of the detail boundaries. Middle detail begins at 40 m, distant detail at 90 m; static buildings retain their geometry but batch more widely at distant zoom. Every profile can complete the v0.4 orchard; school pace stays casual day 5, steady day 3, keen day 2.

Publication remains a PR branch pushed over Git SSH. Review the PR and play its preview before merging to main, which triggers the existing GitHub Pages production workflow. Future v0.5+ work remains unstarted. Check Codex's commits before resuming edits.

Validation: 125/125 unit tests; npm run sim; build:test; every browser suite (including the repaired review suite); 28/28 main browser checks. New orchard stress checks sample 11 zooms on phone and PC, including detail boundaries.


## Codex code and logic review — v0.4 (2026-10-08)

Reviewed progression, story queues, core actions, saves, timer lifecycles, pet navigation and view caches. Fixed stored-stand back pay, corrupt fruit stacks, cosmetic-repair sales delays, tree storage cooldown shortcuts, pet upkeep, build refund/XP loopholes, mutating refused undo, malformed parcel addresses and inherited action/item keys. Homecoming now waits for its deeds; chapter acknowledgements require the next eligible chapter, and modal callbacks cannot open overlapping cards. Biscuit replans around new obstacles, retries cleared routes and uses a free resting spot; animal pen caches refresh on topology changes even when counts stay equal.

The simulation now stocks the fruit stand with surplus fruit and uses actual building footprints. Production smoke saves use past completed simulation days and acknowledge chapters in order. Added rule and browser regressions. Validation: 144/144 unit tests; school pace unchanged; all existing browser suites and 28/28 main checks; final orchard and chapter-order suites retested after the timer fixes. First load remains below 1.1 MB, and the ripe orchard stress stays below 120 draws and 300k triangles across the eleven zoom samples on phone and desktop.

Keep publishing on `codex/v0.4-orchard` through PR #1. Main still awaits the user's playtest and review before merging; future stages are unchanged.
