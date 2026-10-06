# Farm Village — roadmap

The order of work from an empty repository to v1.0. Each milestone lists its tasks, what "done" means and how it is
tested. Times assume one main developer with AI help and are estimates only.

| Milestone | What | Estimate | Ends with |
|---|---|---|---|
| **M0** | Project setup and kit | 2–3 days | An empty scene deployed to Pages, tests running |
| **M1** | Rules core and economy simulation | 1 week | The whole v0.1 game playable in tests, pace targets passing |
| **M2** | World, camera and build mode | 1–1.5 weeks | Placing beds, paths, fences and buildings on a phone feels good; a full large farm holds the phone budgets |
| **M3** | The farm loop on screen | 1 week | Plant, feed, produce and fill orders, with saves |
| **M4** | Village, people and neighbours | 1 week | Cottages, families, rent, charm, the school project, Mai and Gus |
| **M5** | First session and polish | 1 week | Tutorial, story cards, celebrations, sound, Vietnamese, phone performance |
| **M6** | v0.1 release | 3–4 days | Playtested and live |
| | **v0.1 total** | **about 6–7 weeks** | |
| v0.2 | Fishing, dairy, more chains, clinic and market, heart scenes | 4–5 weeks | |
| v0.3 | Festivals, seasons, Pip's homework, album, pets, bees | 4–5 weeks | |
| v0.4 | Café, photo mode and postcards, visit by link, Tết and Mid-Autumn | 4 weeks | |
| v1.0 | All 12 build steps, polish, install as an app | 3 weeks | |

---

## M0 — Project setup and kit (2–3 days)

**Tasks**
- [ ] (waiting for the user) Decide hosting: a public repository, or a private source repository with a public play repository
  (`TECH-PLAN.md` section 8).
- [ ] (waiting for the user) Create the GitHub repository and push this one.
- [x] `package.json` (three 0.180, esbuild, playwright) and the code layout from `TECH-PLAN.md` section 2.
- [x] Copy the kit files and models listed in `TECH-PLAN.md` section 3. Record the source commit in `docs/ASSETS.md`.
- [x] `scripts/build.mjs` with the first-load budget; `npm run dev` on port 5240.
- [x] `index.html` with the loader guard; `keep-chunks.mjs`; the Pages workflow.
- [x] A blank scene: toon lights, the ground, the farmhouse, a camera you can pan and zoom.
- [x] `npm test` running an empty rules test and the translation coverage check.
- [x] `window.farm` test hook (test builds only).

**Done when:** the blank scene is live on Pages and opens on a phone, `npm test` passes, and a first browser test opens
the page and finds the canvas.

## M1 — Rules core and economy simulation (1 week)

All of `src/core/` and `src/content/` for v0.1, with no graphics.

**Tasks**
- [ ] `state.mjs`: the state shape (`TECH-PLAN.md` section 4), `newGame()` and save version 1.
- [ ] `act.mjs`: the dispatcher returning `{ ok, reason, events }`.
- [ ] `clock.mjs`: `doneAt` timers, the backward-clock clamp, the 04:00 daily reset.
- [ ] `grid.mjs`: cells, footprints, rotation, placement rules 1–6 from `DESIGN.md` section 4.3, and the path flood fill.
- [ ] `farm.mjs`, `animals.mjs`, `production.mjs`, `barn.mjs`: the v0.1 crops, animals and recipes from `ECONOMY.md`,
  with the "never stuck" rule (free wheat, buy at base price).
- [ ] `orders.mjs`: generator, size and reward formulas, feasibility check, discard and refill timers.
- [ ] `projects.mjs`: steps 1–6 with requirements, coins and goods, holds and the "show the way" links.
- [ ] `homes.mjs`, `charm.mjs`: cottages, families, rent with the 8-hour cap, needs and charm.
- [ ] `levels.mjs`: the XP curve and unlock table.
- [ ] `neighbours.mjs`: Mai and Gus, with daily seeded schedules, visits that help, trades and their orders.
- [ ] `today.mjs`, `story.mjs`: the daily gift rotation, chapters 1–4 and the tutorial steps as data.
- [ ] Unit tests for each module.
- [ ] `scripts/sim.mjs` and `tests/sim.test.mjs`: the three player profiles on the real `act()`.

**Done when:**
- `npm test` passes, including the simulation with the steady player's school on day 3–4, and no profile gets stuck.
- The simulation numbers are compared with `planning/pace-model.mjs`, and differences are explained in `ECONOMY.md`.

## M2 — World, camera and build mode (1–1.5 weeks)

The hardest part to get right on a phone, so it comes before the rest of the view. The rendering approach is already
proven by `prototypes/big-farm/` (done on 2026-10-07); M2 turns it into the game's code.

**Tasks**
- [ ] Open the big-farm prototype on a real mid-range phone (`HOST=0.0.0.0 node prototypes/serve.mjs`) and confirm
  30+ fps at every zoom. If it falls short, lower the close-zoom limit or the middle-detail share before going on.
- [ ] `camera.mjs`: the fixed tilted orthographic view, one-finger pan, pinch zoom, 90° turns, bounds; mouse, wheel and
  keys on PC.
- [ ] The 128 × 128 cell map with the farm's 4 × 4 parcels, the village area, the brook, roads and woods (`DESIGN.md`
  section 3.1).
- [ ] `ground.mjs`: the cell grid in 32 × 32 chunks; weeds, rocks, paths, tilled cells and water drawn from the state;
  only changed chunks rebuilt.
- [ ] `batches.mjs`: chunked instancing with three levels of detail and per-level chunk sizes (8 / 16 / 32), taken from
  the prototype; partial rebuilds when something changes.
- [ ] Blender export of `*_mid` models (Decimate, about 40 %) for crops, trees, plants and animals.
- [ ] `placed.mjs`: every placed kind drawn through `batches.mjs`.
- [ ] `picking.mjs`: tap to cell and object; the sweep gesture.
- [ ] `ghost.mjs` and `build-view.mjs`: the catalogue, a ghost offset above the finger, green or red with the reason,
  ⟳ ✔ ✕, move, store, undo (10 steps).
- [ ] The charm overlay in build mode.
- [ ] Fences on cell edges, with gates, and a closed-pen check.
- [ ] New art from `village-kit.glb`: path stones, weeds, rocks, bench, lamp, sign, order board.
- [ ] Browser test: place, rotate, move and store on a 390 × 844 portrait phone and a 844 × 390 landscape one.
- [ ] Budget test: a fully planted farm (all 16 parcels, fields) at close, middle and far zoom stays within 120 draws and
  300k triangles.

**Done when:**
- Three people try build mode on a real phone and can place a fenced pen with a path to the road without help.
- A real mid-range phone holds 30+ fps with a fully planted large farm.
- The budget test passes.

## M3 — The farm loop on screen (1 week)

**Tasks**
- [ ] `crops-view.mjs`: four growth stages per crop, the ready bob and sparkle.
- [ ] New art: `crop_wheat` stages; `feed_mill` and `bakery` with working animations.
- [ ] `animals-view.mjs`: hens and cows wandering in their fence, hungry and ready markers.
- [ ] `radial.mjs`: plant, harvest, feed, collect and queue actions; sweep for beds and animals.
- [ ] `barn-view.mjs`: items, capacity, upgrade, held goods.
- [ ] `orders-view.mjs`: cards with portrait, line, goods, reward, deliver and discard; a badge on the HUD.
- [ ] Roadside stall.
- [ ] `hud.mjs`: level ring, coins, buttons fading in by unlock.
- [ ] `fx.mjs`: icons flying to the barn, coin bursts.
- [ ] Saves through the kit's profiles, export and import.
- [ ] Browser tests: a full farm loop; save, reload and catch up after moving the clock forward 8 hours.

**Done when:** you can play from a fresh farm to level 5 in the browser with test mode off, and every action feels
instant.

## M4 — Village, people and neighbours (1 week)

**Tasks**
- [ ] The village area grid, the ruins of civic buildings (`ruin_boards`), and the building animation (`scaffold`).
- [ ] `projects-view.mjs`: the next project with ticks, held goods, "show the way" links, the ghost outline on the map.
- [ ] Cottages from `town.glb` houses, the cozy and deluxe dressing, the furnish menu.
- [ ] Families arriving (the Trans, the Okafors) with a short arrival scene; rent in the mailbox; needs with kind
  explanations.
- [ ] The school project and Cora; the cow barn unlocking with it.
- [ ] `people-view.mjs`: family, villagers and neighbours walking on paths (kit timetables), name labels, a tap for a
  line.
- [ ] Mai and Gus visiting: walking in, a comment written from the real layout, helping 3 crops, the daily trade.
- [ ] `today-view.mjs`: the daily gift, "while you were away", the next project, village news.

**Done when:** a player can reach the school from a fresh farm, the village visibly fills with people, and neighbours'
comments match what is on screen.

## M5 — First session and polish (1 week)

**Tasks**
- [ ] The tutorial script from `DESIGN.md` section 15, with the gated HUD and "I know how" skips.
- [ ] Story cards for chapters 1–4, and celebrations for orders, level-ups, chapters and the school opening.
- [ ] Sounds for every action, and music for day, night and the celebrations (kit music engine).
- [ ] The Vietnamese catalogue complete (coverage check green); text fits on phones in both languages.
- [ ] Accessibility: text size, colour-blind safe markers, reduced motion, one-thumb reach in portrait.
- [ ] Performance pass on a mid-range phone: draw calls, triangles, load time against the budgets.
- [ ] Settings: language, volume, always daytime, quality.
- [ ] The album: chapters and first times.

**Done when:**
- A first-time player reaches the first cottage in about 12 minutes without help.
- The budgets in `TECH-PLAN.md` section 6 are met on a mid-range phone.

## M6 — v0.1 release (3–4 days)

**Tasks**
- [ ] A playtest with 3–5 first-time players (phone and PC). Write down where they hesitate and what they say. Ask
  whether they would come back tomorrow.
- [ ] Fix the top issues and re-run the simulation.
- [ ] Release checklist:
  - all tests green;
  - the browser suites pass on Chromium and WebKit;
  - screenshots reviewed;
  - the changelog written;
  - the `v0.1.0` tag.
- [ ] Deploy and check the live page on a phone, including an old tab still open from before the deploy.

**Done when:** v0.1 is live and at least 3 of the 5 testers want to come back the next day.

---

## After v0.1

### v0.2 — Deeper farm and the growing village (4–5 weeks)
- **The large farm:**
  - parcels 3–6;
  - fields (plant and harvest a block in one action);
  - helpers who tend fields;
  - the pace model tuned again for land and fields (`ECONOMY.md` section 8).
- **Fishing:**
  - the brook and the pond project, Ellis teaching, one calm catch;
  - fish in orders and in the field guide;
  - kit `fish.glb` and fishing code.
- **Production:** dairy (cream, butter, cheese), sugar mill, sheep and loom; tomato, berry and sugarcane.
- **Build steps 7–9:** cottages 3–6, the clinic (Hazel) and the market square (Hugo) with its three shop stalls.
- **The weekly cart:** a big order with crates, which neighbours can help fill.
- **Land:** parcels.
- **People:**
  - Priya the neighbour;
  - heart scenes at 3, 6 and 9 hearts;
  - gift tastes, villager wishes, letters in the mailbox.
- **Town tales for civic buildings:** kit `tales.mjs`.
- **Economy:** re-tune with the new products, so late steps ask for variety.

### v0.3 — Seasons and family (4–5 weeks)
- **More land and tools:** parcels 7–11, and the seed drill and harvester in the workshop.
- **The festival stage and festivals:** the fishing derby first, then the harvest fair. AI neighbours compete.
- **Seasons** from the real calendar, with seasonal crops and decorations.
- **Pip's homework:** a short optional daily quiz that shapes Pip's interests.
- **The family photo album:** snapshots at milestones.
- **Animals:** pets (kit `pets.glb`), bees and honey, the pigsty.
- **The Nguyen twins:** the fourth neighbour.
- **Build steps 10–11:** the police post and the company office.

### v0.4 — Sharing and culture (4 weeks)
- **Land and the tractor:** parcels 12–16, and the tractor for harvesting fields in one pass.
- **The café:** June runs it. Villagers order dishes and rate them, with a calm rush-hour mini-game.
- **Photo mode** and the village postcard.
- **Visit a friend's village by link:** a read-only snapshot packed into the link, with gift notes.
- **Tết and Mid-Autumn festivals:** red envelopes, peach blossoms, lanterns, mooncakes.

### v1.0 — Complete (3 weeks)
- **Build step 12** and the story's end (chapter 9), plus an endless goal after it (village charm milestones,
  festivals, generations later).
- **Install as an app** (works offline after the first load), and a QR code to copy a save to another device.
- **A full polish pass**, a performance pass and a playtest round.

## How the work is run

- Each milestone is its own branch, merged when its "done when" is met.
- `npm test` must pass on every merge. The simulation guards the pace.
- Deploys go only from `main`.
- When a feature changes a flow or a layout, its browser test changes in the same commit.
- After each milestone, update `ECONOMY.md` (if numbers changed), tick this roadmap and add a changelog line.
