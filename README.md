# Farm Village

The next game after Willowmere: a cozy, single-player farm and village game in the browser, where you lead your family
and grow your village. This repository starts with the plan; the code comes next.

## The plan

| Document | What it holds |
|---|---|
| [PROGRESS.md](PROGRESS.md) | **Where the work stands**: current status, decisions, the log and how to resume |
| [docs/GAME-CONCEPT.md](docs/GAME-CONCEPT.md) | **Read first.** What the game is, why (from the research), which activities stay, change or go, pace targets and the first playable version |
| [docs/DESIGN.md](docs/DESIGN.md) | The full design: story, controls, land grid and placement rules, farming, animals, production, orders, people, AI neighbours, cottages, the build order, charm, the first session minute by minute, interface |
| [docs/ECONOMY.md](docs/ECONOMY.md) | Every number (items, costs, rent, levels) and the pace it gives casual, steady and keen players |
| [docs/TECH-PLAN.md](docs/TECH-PLAN.md) | Stack, code layout, what is copied from Willowmere (code and models), data shapes, testing, performance budgets, shipping |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones M0–M6 to v0.1 with tasks and "done when", then v0.2–v1.0 |
| [prototypes/big-farm/](prototypes/big-farm/README.md) | Performance prototype: a 128 × 128 cell map with thousands of crops, drawn in 3D like a 2.5D game; measured results |
| [planning/pace-model.mjs](planning/pace-model.mjs) | A small model of a player that checks the economy before any game code exists: `node planning/pace-model.mjs steady 70` |
| [docs/GAME-DIRECTION.md](docs/GAME-DIRECTION.md) | Where Willowmere stands, the identity, the roadmap, land planned cell by cell with rentals and a required build order, testing, and how Willowmere becomes the kit for this game |
| [docs/MARKET-RESEARCH.md](docs/MARKET-RESEARCH.md) | Hay Day, Township, Stardew Valley, Animal Crossing and browser farm games: graded evidence, online play vs AI neighbours, and a scored ranking of directions |
| [docs/IDEAS.md](docs/IDEAS.md) | A broad catalogue of attractive ideas with design rules, effort, reuse and computed scores |

## Where these come from

GAME-CONCEPT, DESIGN, ECONOMY, TECH-PLAN and ROADMAP are written for this game. The other three documents were written for Willowmere (repository `../3d_farmer_fish_sell`, GitHub
`buicongnguyen/3d_farmer_fish_sell`, at commit `8f0aafe`). File paths inside them, such as `src/tales.mjs` or
`scripts/economy-sim.mjs`, refer to that repository: it is the starting kit this game will reuse (look, menus, interiors,
Town tales, saves, translation, deploy safety, Blender generators).

## First steps

1. Read PROGRESS.md for where things stand.
2. Review the plan: GAME-CONCEPT first, then DESIGN, ECONOMY, TECH-PLAN and ROADMAP.
3. Confirm or change the working decisions (GAME-CONCEPT section 7) and choose the hosting set-up.
4. Start with ROADMAP milestone M0.
