# Plan for the next versions

Written 2026-10-10 by Claude, who now owns both the art and the logic lane. It replaces the open parts of
`JOURNEY.md` section 6 with what has shipped and what the user has asked for since. Each numbered item is one pull
request: rules with tests first, then art from the Blender generators in `art/blender/`, then the four languages,
then the browser suites, then deploy.

## Where we are

Live and on `main`: v0.4 (orchard, kennel, roadmap, clinic) plus, from this week, Explore mode with home activities
and bank fishing, eleven fish, hired farm hands, three rental-cottage shapes, village projects after the clinic, and
the first slice of v0.5 (goat barn, goats, dairy, butter and cheese).

Testing-time tuning is in force (the user's call): crops earn at least 8 coins a minute per bed, production trays
and trucks are cheap, casts bite in seconds. Before release, lengthen the timers again and rerun `scripts/sim.mjs`.

## v0.5: "Home and meadow" (in progress)

| # | Work | State |
|---|---|---|
| 1 | Goat barn, goats, goat feed and milk, dairy, butter and cheese | done (PR #65) |
| 2 | **The farmhouse grows to level 10.** (done, PR #68) Each level costs more and adds barn room. Outside, the house itself becomes bigger at levels 4 and 7, and the garden gains something at every level: flower beds, a bench and lamp, a swimming pool with loungers, a fountain, a gazebo, a flag. | done |
| 3a | **A better room at every house level.** Pictures, a plant, a lamp, a second rug, a painting, a piano, a chandelier, a grandfather clock and a trophy, one per level (`HOME_COMFORT`, kit `interior-extras.glb`). | done |
| 3b | A second and a third room at levels 4 and 7, as in Zoo Garden (a bedroom and a study, each with its own activity). | next |
| 4 | Dairy story: three short scenes (a corner for animals, the first butter, a cheese picnic), the old recipe note, and orders that ask for butter and cheese only once the farm can make them | after 3 |
| 5 | Factory staff: a hired worker in each production building keeps its trays running on the last recipe, so long chains need no tapping; the manager from the company office plans whole chains | after 4 |
| 6 | Menus pass: every panel as tidy as the Market square one (truck rows, actions side by side, upgrades small), fewer explanatory lines, more of the world visible | alongside |
| 7 | Catalogue entries and unlock levels for the eleven extra trees; profile reset button | small, alongside |

## v0.6: "The east meadow and the river"

From `JOURNEY.md` stage 3 and 4, in the order that gives the player something new soonest.

1. **Land deeds.** Goals and projects pay deeds; a new parcel costs deeds plus coins and says what it is for.
2. **The east meadow.** A covered region to the east that opens with deeds: grazing ground, wildflowers, room for a
   second goat barn and cow barn. Cows open earlier (level 5).
3. **Miso the cat and gentle mice.** A cat that lives at the farmhouse; mice take a grain or two from a full barn
   unless the cat is fed. Nothing is ever lost beyond a few goods a day.
4. **Chapter 6 and market day.** A weekly market in the square where villagers pay more for one kind of good.
5. **North parcels to the river.** Irrigation (beds by water grow faster), a boat dock, ducks and geese.
6. **Sheep and the loom.** Wool, cloth and the first clothes for the wardrobe.

## Zones (agreed 2026-10-10)

| Zone | Where | What goes there |
|---|---|---|
| Farm | the 4 x 4 parcels in the middle, all buyable | beds, animals, workshops, trees |
| Living | the village south of the main road | rental cottages, the square, shops |
| Company | the civic row in the south-east | school, clinic, police post, company office |
| Riverside town | between the north road and the river, and across the bridge | apartment blocks, a hotel, an office tower |

Tall buildings go by the river, at the far edge of the default view, so they hide nothing and make a skyline behind
the farm. The strip south of the river is only four cells deep, so most of the town stands on the far bank: that
needs new ground beyond the brook, tall models (decor kit, within the triangle budget through a strong middle
level of detail), and a reason to go there (rents and jobs that scale with the village). It is a stage of its own
after the farmhouse rooms and the dairy story.

## v0.7 and after (unchanged from JOURNEY.md)

Playground and Pip's homework games; horse and stable; evening report; Mr Albright's choice and valley beauty; the
Pine Ridge region by train; the valley fair and the finale.

## Rules that stay fixed

- Nothing is lost while the player is away. Hired hands and helpers work only while the game is open.
- Old saves keep everything: new steps and buildings are ticked off or opened, never taken back.
- The far view stays within 120 draw calls and 300,000 triangles; first-load code within 1,150,000 bytes.
- No new building goes in `farm-kit.glb` (first wave); late pieces go in the decor kit.
