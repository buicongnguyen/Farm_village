# Farm Village — technical plan

How the game is built: the stack, the code layout, what is copied from Willowmere, the data shapes, testing,
performance budgets and shipping. The design is in `DESIGN.md`, the numbers in `ECONOMY.md`, the order of work in
`ROADMAP.md`.

## 1. Stack

| Part | Choice | Why |
|---|---|---|
| Language | JavaScript ES modules (`.mjs`), no framework | Same as Willowmere, so its kit files drop in unchanged |
| 3D | Three.js 0.180 | Same version as Willowmere and its models |
| Build | esbuild with code splitting | Fast; Willowmere's `scripts/build.mjs` already handles budgets, stamps and chunks |
| UI | Plain DOM and CSS over the canvas | Willowmere's HUD and menu CSS reused; text stays sharp and translatable |
| Tests | `node --test` (rules), Playwright (browser, phone sizes, WebKit) | Same as Willowmere |
| Art | Blender generators in Python (`art/blender/*.py` with `style.py`) | Original art, reproducible, same look as the kit |
| Hosting | GitHub Pages, deployed by GitHub Actions on push to `main` | Free static hosting, no servers |
| Node | 22 or newer | Same as Willowmere |

## 2. Code layout

```
Farm_village/
  index.html              loader with the stale-file guard (from Willowmere)
  src/
    core/                 the rules: pure JavaScript, no Three.js, no DOM, fully unit-tested
      state.mjs           state shape, new game, save version and migrations
      act.mjs             the only way to change state: act(state, action, payload, now) → { ok, reason, events }
      clock.mjs           real-time timers, offline catch-up, daily reset at 04:00 local
      rng.mjs             seeded random numbers kept in the state (orders, neighbours, daily picks)
      grid.mjs            cells, footprints, rotation, placement rules, path flood fill
      farm.mjs            beds, planting, growth, harvest
      animals.mjs         pens, feeding, produce
      production.mjs      buildings, queues, recipes
      barn.mjs            storage, capacity, holds for projects
      orders.mjs          the order board generator and delivery
      projects.mjs        the build order (steps, requirements, holds, "show the way" links)
      homes.mjs           cottages, families, rent, needs
      charm.mjs           charm per cottage and for the village
      levels.mjs          XP, levels, unlocks
      neighbours.mjs      AI neighbours: daily schedules, visits, help, trades, their orders
      today.mjs           the Today board contents and the daily gift rotation
      story.mjs           chapters and the tutorial steps
    content/              data only, no logic (easy to tune and translate)
      crops.mjs  animals.mjs  recipes.mjs  buildings.mjs  projects.mjs  people.mjs  neighbours.mjs  story.mjs  economy.mjs
    view/                 Three.js: draws the state, never changes it directly
      scene.mjs           renderer, lights (toon), sky, day and night
      camera.mjs          pan, pinch zoom, 90° turns, bounds, touch and mouse
      ground.mjs          terrain and the cell grid (vertex colours, one mesh per 32 × 32 chunk)
      batches.mjs         chunked InstancedMesh batches with three levels of detail (section 6)
      placed.mjs          everything placed, drawn through batches.mjs
      crops-view.mjs      crop growth stages and fields, drawn through batches.mjs
      ghost.mjs           build-mode ghost, green/red tint, footprint outline, charm overlay
      picking.mjs         taps and clicks to cells and objects, the sweep gesture
      people-view.mjs     avatar, family, villagers, neighbours walking (walk cycle, routes on paths)
      animals-view.mjs    animals wandering inside fences
      fx.mjs              collect icons flying to the HUD, sparkles, confetti
    ui/                   DOM menus
      hud.mjs  radial.mjs  orders-view.mjs  barn-view.mjs  build-view.mjs  projects-view.mjs  today-view.mjs
      album-view.mjs  dialog.mjs  story-card.mjs  settings-view.mjs  test-panel.mjs (test builds only)
    kit/                  files copied from Willowmere (section 3); changed only to stay generic
    main.mjs              boot: load save, catch up the clock, start view and UI, the game loop
    i18n/vi.mjs           the Vietnamese catalogue
  art/blender/            generators for new models (section 5)
  public/assets/          models, icons, font, music
  scripts/                build, serve, keep-chunks, vi-coverage, sim
  tests/                  *.test.mjs (rules), *-browser.mjs (Playwright), sim.test.mjs (economy targets)
  planning/pace-model.mjs the paper economy model (kept for comparison)
  docs/
```

**Core rules of the code:**
1. **The view never changes the state; only `act()` does.** Every action returns `{ ok, reason, events }`. The UI shows
   the reason on refusal. The view plays the events (sounds, flying icons, celebrations).
2. **`core/` is pure.** It takes `now` (milliseconds since 1970) as a parameter and never reads the clock or the DOM. Tests
   and the economy simulation run it at any speed.
3. **Content is data.** Names, prices, times, recipes, lines and story live in `content/`, so tuning and translating
   never touch the logic. This also makes the code a kit for future games.

## 3. What is copied from Willowmere

From Willowmere (`../3d_farmer_fish_sell`, github.com/buicongnguyen/3d_farmer_fish_sell) (copy, don't link; note the source commit in `docs/ASSETS.md`).

### 3.1 Code

| Willowmere file | Becomes | Use |
|---|---|---|
| `src/toon.mjs` | `src/kit/toon.mjs` | Toon materials and lights (Zoo Garden look) |
| `src/fields.mjs` (`groundColor`) | `src/view/ground.mjs` | Vertex-coloured ground recipe |
| `src/hud-reference.css`, `src/menus-reference.css` | `src/kit/` | HUD and menu look |
| `src/shop-view.mjs` rows, `src/panel-scroll.mjs` | `src/kit/` | Compact catalogue rows, scrolling panels |
| `src/i18n.mjs`, `scripts/vi-coverage.mjs`, `scripts/vi-lib.mjs` | `src/kit/`, `scripts/` | Translation and the coverage check in `npm test` |
| `src/profiles.mjs`, `src/profiles-view.mjs`, `src/save-layout.mjs` | `src/kit/` | Save profiles, validation, export/import |
| `src/governor.mjs` | `src/kit/` | Automatic graphics quality on slow phones |
| `src/sun-shadow.mjs`, `src/shadow-proxy.mjs` | `src/kit/` | Cheap shadows |
| `src/avatar.mjs`, `src/walk-cycle.mjs` | `src/kit/` | Character bodies, looks and walking |
| `src/villagers.mjs` (timetables), `src/villager-labels.mjs` | `src/kit/` | People's daily routes and name labels |
| `src/pen-roam.mjs`, `src/pen-range.mjs` | `src/kit/` | Animals wandering in a fenced area |
| `src/decor-view.mjs`, `src/home-plan.mjs` | Pattern for `src/view/ghost.mjs` | Ghost placement, rotation, collisions |
| `src/tales.mjs` | `src/kit/` | Building stories, later (v0.2) |
| `src/music/`, `src/audio-ctx.mjs` | `src/kit/` | Music engine and sound |
| `src/test-hook.mjs`, `src/render-probe.mjs` | `src/kit/` | Browser test hook, render checks |
| `scripts/build.mjs`, `scripts/keep-chunks.mjs`, `scripts/serve-dist.mjs` | `scripts/` | Build with first-load budget, 7-day chunk keeping, local server |
| `index.html` loader | `index.html` | `import()` guard: saves and reloads once when files changed after a deploy |
| `.github/workflows/pages.yml` | `.github/workflows/` | Pages deploy |
| `scripts/economy-sim.mjs` | Pattern for `scripts/sim.mjs` | Economy simulation on the real rules |

Not copied: Pandora, combat, regions, titans, vehicles, fishing (until v0.2), the old economy (`game.mjs`,
`content.mjs`) and `main.mjs`. These are too tied to Willowmere.

### 3.2 Models (checked in Willowmere's `public/assets/models/`)

| File | Pieces used | For |
|---|---|---|
| `farm.glb` | `chicken`, `chick`, `cow`, `calf`, `pen_fence`, `pen_gate`, `feed_trough`, `water_trough`, `coop`, `hay_bale`, `cow_shelter`, `egg`, `milk`, `egg_basket`; later `pig`, `duck`, `dog` | Animals, coop, cow barn, fences |
| `crops.glb` | `crop_sprout`, `crop_carrot`, `crop_pumpkin`, `crop_goldcorn` (corn), `crop_berry`, `crop_radish`, `crop_coffee` | Crops (wheat, tomato and sugarcane are new) |
| `rural.glb` | `barn` (the storage barn), `silo`, `mailbox`, `windmill` + `windmill_rotor`, `picket_fence`, `rail_fence`, `hay_round`, `tractor`, `farm_a`–`farm_d` (neighbours' farms at the map edge), `home_t0`–`home_t3` (farmhouse) | Farm buildings and edges |
| `town.glb` | `house_gable`, `house_front`, `house_tall`, `house_hip`, `house_round` (rental cottages), `school`, `hospital` (clinic), `police`, `company` | Cottages and village projects |
| `scenery.glb` | `tree_blossom`, `tree_round`, `tree_pine`, `bush`, `flowers`, `tuft`, `rock`, `stone_step`, `fence`, `gate`, `mushroom` | Charm items, weeds and rocks to clear, path stones |
| `market-stall.glb`, `well.glb`, `village-trees.glb` | As named | Roadside stall, village well, extra trees |
| `hero*.glb`, `hero-parts.glb`, `wm-garments.glb`, `wm-kids.glb` | Bodies and clothes | Family, villagers, neighbours |
| `house.glb`, `kitchen.glb` | Furniture | Cottage furnishing levels (v0.2 interiors) |
| `fish.glb`, `pets.glb` | – | v0.2 fishing, v0.3 pets |
| `nunito.woff2` | – | Font |

The town buildings are large (`town.glb` 1.7 MB, `rural.glb` 2.4 MB). They load after the first scene, and the
pieces not yet needed load later (section 6).

### 3.3 Blender generators
Copy `art/blender/style.py`, `build_town.py`, `build_rural.py` and `build_facility_props.py` as the base for new models,
so everything matches.

## 4. Data shapes

```js
// state (saved as JSON; version bumps come with a migration in state.mjs)
{
  version: 1, createdAt, lastSeen,            // epoch ms
  rng: 12345,                                  // seeded random state
  coins: 0, xp: 0, level: 1,
  land: {
    parcels: ['home'],                          // owned parcels
    cells: 'base64 of a Uint8Array',            // one byte per cell: 0 grass, 1 weeds, 2 rock, 3 path, 4 tilled, 5 water
    placed: [ { id: 'p17', kind: 'coop', x: 4, z: 6, rot: 1 } ],
    fences: [ { x: 3, z: 5, side: 'n', kind: 'fence' | 'gate' } ],
  },
  beds: { 'p3': { crop: 'wheat', doneAt } },   // keyed by placed id
  animals: { 'p17': [ { kind: 'hen', fedAt, doneAt } ] },
  production: { 'p20': { slots: 2, queue: [ { recipe: 'bread', doneAt } ], ready: [ 'bread' ] } },
  barn: { cap: 50, items: { wheat: 6 }, held: { bread: 10 } },
  orders: { slots: 3, cards: [ { id, from: 'lan', need: { bread: 2 }, coins, xp, hearts, story: false, readyAt } ] },
  projects: { step: 3, done: [ 'clear', 'plot', 'mill_coop' ] },
  homes: { 'p30': { level: 0, family: 'tran', rentFrom } },
  people: { lan: { hearts: 2, giftsToday: 0, scenes: [] } },
  neighbours: { mai: { friendship: 1, lastVisit, tradeToday } },
  today: { lastReset, giftDay: 3, seen: false },
  story: { chapter: 1, tutorial: 'plant', seenCards: [] },
  stats: { harvested: 0, ordersFilled: 0, orderCoins: 0 },
  settings: { lang: 'en', daylight: 'real', textSize: 1, reducedMotion: false, quality: 'auto' },
}
```

- **Timers** store `doneAt` (an absolute time), never "seconds left". Loading a save needs no catch-up loop: anything
  with `doneAt <= now` is ready. Rent is computed from `rentFrom` with the 8-hour cap.
- **Clock changes:** if the device clock jumps backward, timers never become longer than their full duration
  (`doneAt` is clamped to `now + duration`). Jumping forward is allowed; this is a single-player game.
- **Saves:** written to `localStorage` under `farm-village:profile:<n>`, debounced to one second, and also on
  `visibilitychange`. A backup copy is kept and the last good save is restored if parsing fails.

## 5. New art (Blender, original)

| Model | Pieces | Notes | Version |
|---|---|---|---|
| `crops2.glb` | `crop_wheat` (4 stages), `crop_corn` stages if `crop_goldcorn` has none, `crop_tomato`, `crop_sugarcane` | Same style as `crops.glb` | v0.1 (wheat), v0.2 |
| `*_mid` versions of every crop, tree, plant and animal | About 40 % of the triangles (Blender Decimate), exported next to the full models | Used at middle zoom | v0.1 |
| `production.glb` | `feed_mill` (2 × 2), `bakery` (3 × 2) with a chimney smoke marker, `dairy`, `sugar_mill`, `loom` | Small, readable from the planning camera; each has a "working" animation node | v0.1 (mill, bakery), v0.2 |
| `village-kit.glb` | `path_stone`, `path_gravel`, `bench`, `lamp`, `fountain`, `sign`, `order_board`, `weeds_a/b`, `rock_small`, `ruin_boards` (boarded-up overlay for empty civic buildings), `scaffold` (building animation) | Charm items and the tutorial clearing | v0.1 |
| `cottage-dressing.glb` | Window boxes, porch lights, flower pots | Show the cozy and deluxe levels on the outside | v0.1 |
| `market.glb` | Market square with 3 stalls | – | v0.2 |
| `stage.glb` | Festival stage | – | v0.3 |

**Icons:** item icons are rendered from the models at build time (as Willowmere does), so new items automatically get an
icon.

## 6. Rendering and performance

**One renderer, shown like 2.5D.**
- **Camera:** Three.js with a fixed tilted orthographic camera (about 54° down), 90° turns and zoom.
- **No second renderer:** no 2D mode and no separate phone renderer. Every feature is drawn once and tested once.

**Proven by `prototypes/big-farm/`:**
- **The scene:** a 128 × 128 cell map, 2,704 crops in fields, about 3,000 trees and plants, 64 moving animals and the
  village.
- **Phone results** (390 × 844 screen, CPU slowed 4×): at most **199k triangles, 87 draw calls and 2.3 ms of CPU per
  frame** at every zoom.
- **Worst case** (4,096 crops planted at random): 312k triangles at close zoom.

| Budget | Target |
|---|---|
| First load (HTML + JS + CSS + first-scene models) | ≤ 1.1 MB compressed; the build fails above it |
| Time to first scene | ≤ 3 s on a mid-range phone over 4G |
| Frame rate | 60 fps on PC; 30+ fps on a mid-range phone with a full farm |
| Draw calls | ≤ 120 on phones at every zoom |
| Triangles drawn | ≤ 300,000 on phones at every zoom |
| CPU per frame | ≤ 8 ms on a phone (the prototype needs about 2.5 ms slowed 4×) |

**The drawing rules** (each one measured in the prototype):
1. **Baked models.** Every model is one geometry with vertex colours and no textures. Blender exports it that way;
   the loader merges any leftover parts. One material, `MeshToonMaterial` with the kit's 4-step ramp, is shared by
   everything.
2. **Instancing.** One `InstancedMesh` per model per chunk. Nothing in the world is drawn one by one, except the
   player's avatar and a few close-up characters.
3. **Three levels of detail**, switched by zoom:

| Zoom (view span) | Models | Chunk size |
|---|---|---|
| Close (up to 55 m) | Full models (crops about 350 triangles) | 8 × 8 cells |
| Middle (55–110 m) | Simplified models, about 40 % of the triangles, made by Blender's Decimate at build time | 16 × 16 cells |
| Far (over 110 m) | Stand-ins of 5–20 triangles, coloured per instance (crop, tree, animal) | 32 × 32 cells |

   Close zoom needs small chunks for tight culling, and far zoom needs big ones for few draws. One chunk size fails
   one end: 32-cell chunks drew 1.18M triangles close up, and 8-cell chunks needed 305 draws far out.
4. **Static batches.** Buildings and fences keep full models at every zoom in 16 × 16 chunks; there are few of them.
5. **Ground** is one mesh per 32 × 32 cell chunk, with one flat-coloured quad per cell. When cells change (tilling,
   paths), only that chunk is rebuilt.
6. **Rebuilding batches.** When something is planted, grows a stage, is placed or is moved, only the batches of that
   chunk and model are rebuilt, at most once a frame. Growth stages change on timers, so a few chunks change per
   second, not every frame.
7. **Moving things** (animals, people) have their own batches per kind, updated every frame, with level of detail too.
8. **Renderer settings:**
   - pixel ratio capped at 2;
   - antialiasing off at ratio 2 and above;
   - no real-time shadows on phones (blob shadows from the kit's `shadow-proxy.mjs`);
   - the graphics governor lowers the pixel ratio if frames run slow;
   - rendering pauses when the tab is hidden.
9. **Loading order:**
   - **First:** the farm, crops and animals.
   - **After the first frame:** the town buildings (1.7 MB).
   - **Last:** everything else, when first needed.
10. **The rules are tested.** A browser test (from `prototypes/big-farm/measure.mjs`) loads a fully planted farm and fails
   if any zoom level goes over the draw-call or triangle budget.

**Still to check:** a real mid-range phone's GPU (the prototype ran on a PC GPU with the CPU slowed). This is part of M2.

## 7. Testing

| Kind | What | When |
|---|---|---|
| Rules unit tests (`node --test`) | Every `core/` module: placement rules, path connectivity, timers and offline catch-up, orders feasibility, holds, rent cap, charm, levels, migrations | Every change (`npm test`) |
| Economy simulation (`tests/sim.test.mjs`) | Plays the casual, steady and keen profiles on the real `act()` with a fake clock; **fails if the steady player's school is not on day 3–4 or the festival stage is outside weeks 4–8**, or if any profile ever gets stuck | Every change (`npm test`) |
| Translation coverage | Every player-visible string has a Vietnamese line | Every change (`npm test`) |
| Browser suites (Playwright) | First session from start to the first cottage; build mode on a phone (portrait and landscape); orders; save and reload; offline catch-up (move the clock forward 8 hours); WebKit | Before each release, and nightly in CI |
| Screenshot review | Fixed camera shots of the farm and village at set times, compared by eye at each release | Each release |
| Playtests | 3–5 first-time players per release: can they reach the first cottage without help, and do they want to come back | Each release |

The browser hook `window.farm` exposes `state()`, `act()`, `setNow(ms)` and `skipTutorial()`, in test builds only.

## 8. Build, run and ship

| Command | Does |
|---|---|
| `npm run dev` | Build and serve with reload on a fixed local port (choose one not used by other games: 5240) |
| `npm run build` | Production build into `dist/`; fails above the first-load budget |
| `npm test` | Rules tests, economy simulation, translation coverage |
| `npm run test:browser` | Playwright suites against `GAME_URL` (default: the local server) |
| `npm run sim -- steady` | Print the economy milestones for one profile |

- **Test mode** exists only in builds made with `--test-mode` (esbuild `define`); public builds leave the code out
  entirely.
- **Deploy:** push to `main` → GitHub Actions builds, runs `npm test`, keeps the last 7 days of chunks
  (`keep-chunks.mjs`), and publishes to Pages.
- **Hosting choice (to decide at M0):** a public repository (simplest), or a private source repository that deploys to
  a public play repository (as the Lantern Picnic does).
- **Releases:** tagged `v0.1.0`, `v0.2.0` and so on, each with a short changelog in `CHANGELOG.md`.

## 9. Risks and how the plan handles them

| Risk | Handling |
|---|---|
| Phone performance with a big farm and village | Proven in `prototypes/big-farm/`: per-level chunks, three levels of detail, the governor, and a browser test on the budgets. Still to confirm on a real phone in M2 |
| The economy drifts as content grows | The simulation test fails the build when pace targets break |
| Placement feels fiddly on phones | Large snap targets, an offset ghost above the finger, an undo stack; tested on real phone sizes in M2 before anything else is built on it |
| Too much at once for new players | Tutorial script plus gated HUD (`DESIGN.md` section 15); playtests each release |
| Stale files after a deploy break old tabs | Willowmere's loader guard and 7-day chunk keeping, copied in M0 |
| Kit files drift from Willowmere | Copied once with the source commit noted; fixes flow by hand; the kit stays small |
