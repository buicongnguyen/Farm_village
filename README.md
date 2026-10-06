# Farm Village

The next game after Willowmere: a cozy, single-player farm and village game in the browser, where you lead your family
and grow your village. This repository starts with the plan; the code comes next.

## The plan

| Document | What it holds |
|---|---|
| [docs/GAME-CONCEPT.md](docs/GAME-CONCEPT.md) | **Read first.** What the game is, why (from the research), which activities stay, change or go, pace targets and the first playable version |
| [docs/GAME-DIRECTION.md](docs/GAME-DIRECTION.md) | Where Willowmere stands, the identity, the roadmap, land planned cell by cell with rentals and a required build order, testing, and how Willowmere becomes the kit for this game |
| [docs/MARKET-RESEARCH.md](docs/MARKET-RESEARCH.md) | Hay Day, Township, Stardew Valley, Animal Crossing and browser farm games: graded evidence, online play vs AI neighbours, and a scored ranking of directions |
| [docs/IDEAS.md](docs/IDEAS.md) | A broad catalogue of attractive ideas with design rules, effort, reuse and computed scores |

## Where these come from

GAME-CONCEPT.md is written for this game. The other three documents were written for Willowmere (repository `../3d_farmer_fish_sell`, GitHub
`buicongnguyen/3d_farmer_fish_sell`, at commit `8f0aafe`). File paths inside them, such as `src/tales.mjs` or
`scripts/economy-sim.mjs`, refer to that repository: it is the starting kit this game will reuse (look, menus, interiors,
Town tales, saves, translation, deploy safety, Blender generators).

## First steps

1. Review GAME-CONCEPT.md and answer its open decisions (section 7).
2. Decide how to start the code: a fresh project that copies Willowmere's reusable systems as a kit (recommended in
   GAME-DIRECTION section 6), or a fork of Willowmere.
3. Build the first playable version (GAME-CONCEPT section 6).
