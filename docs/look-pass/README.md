# AR-001 look and collection-feedback pass (art lane)

Branch `art/look-pass`, based on `origin/codex/v0.4-orchard` (f0d8886) merged with `origin/main` (ff555e0). Matching
screenshots come from `node art/shots.mjs <dir> <url>` (same state, camera and game clock for both builds); each image here
is before (left) and after (right).

## What changed
| Area | Before | After | File |
|---|---|---|---|
| Lawn (mid tone) | `#6fbf4a` / mean `#74d043` | `#72bd3e` | `src/view/ground.mjs`, `src/view/world-view.mjs` |
| Farm meadow | `#8ee052` | `#84c846` | `world-view.mjs` |
| Paths / road | `#f0c070` / `#e6ab62`, edge ×0.8 | `#dfbd87` / `#d6ad78`, edge ×0.7 | `world-view.mjs` |
| Dirt patches | `#a8904e` (khaki) | `#b07c4e` | `ground.mjs` |
| Day fill / bounce | `#fff6e0` / `#7a9a5a` (olive) | `#eaf0ff` / `#6a9a48` | `daylight.mjs`, `toon.mjs` |
| Dusk (18:30) | fill `#ffd9b0`, bounce `#7a6a50`, sun `#ff9a5a` | fill `#b8c8f0`, bounce `#4f6e5a`, sun `#ffc88c` | `daylight.mjs` |
| Day water | deep `#2f86c4` | turquoise deep `#216778`, shallow `#3fb8c0` | `brook.mjs` |
| Tree leaves | lime `#8EE04A` | `#4fab45` / `#8fd04c` / `#3a8444` | `art/blender/build_farm_kit.py`, `farm-kit.glb` |
| UI tokens | ink `#4a2a12`, gold `#f2b21c` | ink `#392919`, gold `#e8aa24` (+ `--gold-hi`), warmer panel | `src/style.css`, roadmap card in `village.css` |
| Coin markers | coin + white glint | dark backing disc + warm glint | `src/view/marks-view.mjs` |
| Fruit picking | tree goes bare, no feedback | shake, falling fruit and leaves, star, glints, pop, "+n", icons fly to the barn (only what was stored) | `juice.mjs`, `fx.mjs`, new `collect-flow.mjs` |
| Golden carp | same pop as a perch | gold ring on the pond, star fountain, chime, gold-ringed floater | `juice.mjs` |
| Stall / fruit stand sale | coins poured into the wallet | a glint at the stand; coins fly only on collection (`coins`) | `fx.mjs`, `juice.mjs` |

No rewards, rarity, prices or eligibility changed. No crop faces. Reduced motion: no particles, floaters fade.

## Results
- `npm test`: 151 pass (new `tests/collect-flow.test.mjs`).
- Browser suites on port 5242: all pass, including new `tests/look.browser.mjs` (5 checks: pick burst, golden catch,
  truthful coins, reduced motion, budgets ≤120 draws and ≤300k triangles at spans 24-220 with effects running) and
  `tests/browser.mjs` 28/28. `restore.browser.mjs` "Next chip does the chore" is flaky on the unchanged baseline as well.
- First-load code 965 KB (limit 1,100 KB).

## Open for the logic lane
`picked.stored/sold`, optional `fishCaught.pond`, and sound ownership for picks: see "Notes between lanes" in
`docs/ASSET-REQUESTS.md`.
