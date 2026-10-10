# Small fixes and polish (backlog)

Fixed between chapters, a few at a time, each in its own small PR or together with the next chapter when it touches
the same files. Anything the owner reports while testing goes to the top of "Open".

## Fixed

| What | PR |
|---|---|
| A path laid on an old building's lot blocked its rebuild for good; the Demolish tool could not lift a path, clear a ruin or take down an old village building; the old ruin stayed drawn over a rebuilt building | #78 |
| Village projects that are not about building (land five fish, buy a truck) said "Use build mode to finish this step" | #81 |
| The police post and company office could not be rebuilt (disabled button, mouse dragged the preview away, hidden path step) | #66, #69, #74 |
| "Village growth" on an old building opened the wrong panel | #73 |
| Land beyond the second parcel was never offered | #70 |
| Hens stayed behind when their coop was moved | #62 |
| People walked in a crouch | #54 |

## Open

| # | What | Where | How |
|---|---|---|---|
| 1 | A farm started in the plain mode has no upgradable farmhouse (`s.house` is null), so farmhouse levels, the garden and the room extras never appear there | `src/core/state.mjs`, `src/core/condition.mjs` | Give every farm `s.house = { level: 1 }` on load; keep wear only for the restore mode |
| 2 | The five new vegetables are used in no recipe (orders and market days do ask for them) | `src/content/goods.mjs` | Two or three recipes at the bakery or a kitchen (soup, chips, kimchi); chapter 6 added none |
| 3 | The eleven extra trees (maple, birch, cypress, fir, great oak, lemon, plum, mango, grape arbor, longan, lychee) cannot be planted | `src/content/buildings.mjs`, `src/content/goods.mjs` (`FRUITS`) | Add catalogue entries with unlock levels one or two per chapter; icons exist |
| 4 | No button to reset a profile | `src/ui/profiles-panel.mjs` | "Start this farm again", with a typed confirmation |
| 5 | Hired people are not seen walking to their work | `src/view/people-view.mjs` | Done in chapter 10 |
| 6 | Menus other than the Market square still carry long explanations | `src/ui/panel-renderers.mjs`, `src/ui/village-panels.mjs` | One pass per panel: main actions side by side, upgrades small, explanation as a small last line |
| 7 | A notice can cover the world for a few seconds and catch a tap meant for the map | `src/ui/hud.mjs` | Notices pass taps through except on their own button; shorten to three seconds over the map centre |
| 8 | Free-range animals sometimes cut a fence corner | `src/view/life-view.mjs` | Pick the next target through neighbouring cells of the range (a short path) instead of a straight line |
| 9 | A rare big fish caught in a small built pond is not seen in the water before it leaps | `src/view/pond-fish.mjs` | When the line's fish has no instance in that pond, borrow one for the bite |
| 10 | The piano has no stool; the chili icon reads as beads | `art/blender/build_farm_kit.py`, `build_items.py` | Stool beside the piano on the wall side; smooth chili pods |
| 11 | Three browser checks fail now and then under load (restore: farmhouse repair; juice: coins pour; cast: chapter card timing) | `tests/*.browser.mjs` | Remove the timing dependence in each; until then rerun once |
| 12 | The reserved-lot message says "stands here" even on a cleared lot | `src/core/grid.mjs` | Two messages: one for a standing ruin, one for a kept lot |
| 13 | The first-load size limit was raised to 1,150,000 bytes without trimming | `scripts/build.mjs` | In the release pass: move `content/hearts.mjs` text and `ui/build-view.mjs` behind `import()`, then lower the limit again |
| 14 | In the English edition the family portraits (2D faces) still show the original hair | `public/assets/icons/` portraits, `src/ui/icon.mjs` | Render a second portrait set from the tinted rigs, or tint the portraits with CSS filters per edition |

## How to report a new one

A line with: what you did, what happened, what you expected, and desktop or phone. A screenshot helps most.
