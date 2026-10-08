# Hollowbrook — covered land, branching discoveries, and useful vehicles

Date: 2026-10-08 (Asia/Seoul)

Status: design evaluation and proposed sequence. No gameplay, map, art, or localization changes are implemented by this document.

Use [HOLLOWBROOK-IMPLEMENTATION-PLAN.md](HOLLOWBROOK-IMPLEMENTATION-PLAN.md) as the consolidated implementation entry point. It incorporates later skill decisions and the evaluation of Claude's research; its decision register takes precedence over earlier proposals here.

This extends [LUCK-AND-HAPPY-PROGRESSION.md](LUCK-AND-HAPPY-PROGRESSION.md), [DIALOGUE-AND-VILLAGE-NEWS.md](DIALOGUE-AND-VILLAGE-NEWS.md), and [RESEARCH-DIRECTION.md](RESEARCH-DIRECTION.md). The opening remains **500 coins**. Exact costs, locations, vehicle benefits, and unlock conditions below are proposals to test. The subsequent skill proposal and the user's decision to reserve energy for larger projects are recorded in [SKILLS-AND-ENERGY.md](SKILLS-AND-ENERGY.md).

## 1. The user's direction

Start with a small, readable home area. Cover unbought land and undiscovered nearby places with trees, overgrowth, old objects, and selective mist. Let the player glimpse something interesting beyond the boundary, then buy land, clear an entrance, inspect a place, or repair a route to discover more.

Build the valley's places and story connections in advance, but introduce their activities gradually. Children can notice clues; a small golden glint can draw attention. Tractors, trucks, motorbikes, cars, and old houses should become useful parts of that journey.

**Buying or discovering an area should begin a sequence of gains: useful space, something to inspect, a small discovery, a restoration opportunity, then an activity worth returning to.** The whole valley should not present its buildings and tasks at once.

This fits the existing two principles: luck follows effort and exploration; guidance leads to satisfying achievements and warm reactions.

## 2. Evaluation and improvements

The strongest part is making growth visible in the world. A formerly overgrown corner becomes somewhere the player recognizes and uses. This can support curiosity, personal choice, and a sense of accomplishment during solo play. Those are design expectations to test with players, not proven retention results for Hollowbrook.

Five refinements make the idea clearer:

1. **Show a promise before asking for effort.** A roofline, broken sign, old wheel, or sound from the brook gives the player a reason to investigate. A completely blank cloud offers little basis for choosing a direction.
2. **Give paid land an immediate use.** Show its price, buildable area, major restrictions, and broad purpose before purchase. Buying should reveal a usable patch or an included short clearing step. Further discoveries can remain under local overgrowth. Avoid charging for land and then revealing that all meaningful use requires several undisclosed purchases.
3. **Let exploration and ownership work differently.** A public footpath may be explored after clearing a fallen branch. Private farmland requires its purchase before building or taking resources there. Seeing a place does not automatically grant construction rights.
4. **Give each branch a different benefit.** An orchard corner supports farming; a brook route supports leisure and discoveries; a workshop supports later repairs. Multiple identical plots with different prices offer less meaningful choice.
5. **Leave something pleasant after the reveal.** A new activity, a character visit, or a visible improvement makes an area worth revisiting. A chest in an otherwise empty clearing is a brief reward, not a developed place.

Branches should remain flexible interests. Choosing fishing first must not permanently exclude farming, and optional discovery chains should not become hidden requirements for the school or clinic.

## 3. Covering the world without losing its color

Use several kinds of cover appropriate to the place:

| Place | Before discovery | Visible clue | What the action reveals |
|---|---|---|---|
| Unbought farm parcel | Tall grass, clustered saplings, a low boundary fence | Land sign and a glimpse of the terrain | Usable space and one local point of interest after purchase |
| Old orchard corner | Brambles, a fallen branch, leafy canopy | Fruit color or part of a stone wall | A garden nook, an old object, or space for another planting |
| Brook extension | Reeds, shrubs, a bend in the bank | A worn marker, water sound, or a dock silhouette | A new viewpoint, clue, or later fishing activity |
| Workshop or tractor shelter | Ivy, an old tarp, stacked boards | Part of a wheel or painted roof | An inspectable machine and a repair project |
| Old house | Overgrown garden and a partly hidden porch | A distinctive window, nameplate, or photograph clue | A family memory and a modest restoration opportunity |
| Farther valley | Simplified hills, tree bands, and restrained mist | A recognizable distant landmark | A later route or separate region |

Keep the proposed rich green foliage, terracotta roofs, turquoise water, and honey-gold accents. Concentrate mist at unexplored edges; a white blanket over the active farm would wash out the stronger color direction the user requested.

On purchase, reveal the parcel's shape and immediate use. A few remaining thickets can conceal individual discoveries; they should not keep the entire paid parcel unreadable. Reveal animations should be short, skippable, and have a reduced-motion alternative.

Use a brief gold glint for a real clue or notable find. Pair it with a recognizable object, a generous tap target, and an optional text hint. Stop the discovery glint after inspection. A permanent rapid blink on every boundary would make the world feel busy and reduce the value of gold as a signal.

Keep some mature trees, shaded corners, and flowers after clearing. Selective tree cutting can be an authored action, alongside clearing deadwood, brambles, and fallen branches; expanding the farm should still leave a lush valley.

## 4. Two related progression paths

The following describes the player's experience, not a required single implementation enum:

```text
PURCHASABLE FARM LAND
Covered parcel + visible boundary clue
    → inspect the land offer: price, purpose, restrictions
    → buy when eligible
    → reveal a usable patch and nearby points of interest
    → clear or inspect a particular object
    → gain a discovery, useful capability, or next project
    → return for farming, a visit, or another activity

PUBLIC OR STORY EXPLORATION
Partly concealed place + accessible clue
    → inspect and learn the next action
    → clear an authorized entrance or repair a route
    → reveal an explorable pocket
    → restore or use something there
    → open a later connection
```

Track discovery, access, ownership, and restoration separately. A public area can be accessible without being purchasable. An owned parcel can still contain an undiscovered keepsake. A revealed workshop can remain broken until the player chooses to repair it.

Do not make every place use every step. One entrance might need only a cleared branch; another might be a larger later restoration. Show the next real blocker and its cost before the player commits. A future feature that has not been built should be labeled as planned, without an active reward glint promising an obtainable prize.

## 5. What exists in the repository

Reviewed against branch `codex/v0.4-orchard`, commit `f0d8886`.

| Feature | Current behavior | Proposed addition |
|---|---|---|
| Unowned land | Tall grass, saplings, rocks, fences, and sale signs dress locked parcels. Purchase removes that dressing and generates normal terrain overgrowth. | Persistent discoveries and several authored points of interest within a parcel |
| Expansion | A 4 × 4 parcel layout; current rules allow two owned parcels. The second costs 500 coins and requires level 4 and adjacency. | More purposeful parcels and optional exploration branches, introduced in later stages |
| Clearing | Owned/buildable weeds and rocks can be cleared, including multiple cells. Weeds cost 2 coins and rocks 10. | Explicit obstacles such as a fallen tree, bramble entrance, or boarded gate |
| Trees | Wild trees are view scenery. Planted trees are separate objects. No wild-tree felling action exists. | Selected rule-backed tree obstacles with clear consequences |
| Truck | A functioning delivery system and a visible truck driving along Village Street already exist. | Later routes or distinct delivery opportunities using that system |
| Tractor | A sourced tractor model exists in `rural-extra.glb`; active tractor gameplay is absent. | Inspect, restore, and give it a useful farming job |
| Car and motorbike | No active player vehicle systems for these were found. | Later additions only when their routes and activities justify them |
| Old houses and civic buildings | Cottages can be repaired; the farmhouse repaired/upgraded; civic ruins tidied once. School and clinic rebuilding is implemented, while police/company reopening is planned. | Optional inspection scenes, keepsakes, and eventually interiors |
| Fog | The scene uses distance haze. | A separate presentation of undiscovered regions |

Repository references: [land dressing](../src/view/dress.mjs), [land and clearing rules](../src/core/build.mjs), [world layout](../src/content/world.mjs), [economy](../src/content/economy.mjs), [starting places](../src/content/start.mjs), [truck view](../src/view/land-view.mjs), [asset provenance](ASSETS.md), and [current fog](../src/view/world-view.mjs).

The starting farm parcel is `0,2`, on the western edge of the farm grid. Purchase expansion can go east, north, or south; west reaches the road and homestead. “Explore left and right” is a good experience goal, but literal land expansion in both directions would need a map change. Initially use an east farm branch and a north/public-path branch, with exact placement checked against existing roads and buildings.

The village pond is already available from the start. Preserve that access. A later brook discovery should add something beyond the pond rather than make existing fishing depend on buying land or finding a treasure. Existing cherry trees, fruit stands, and truck access likewise should not acquire extra discovery requirements accidentally.

## 6. A practical branch structure

```text
Home farm, family, existing pond — 500 starting coins
│
├─ Existing village story
│  repairs → families → school → clinic
│
├─ East: farm expansion
│  land preview → eligible parcel purchase → usable garden patch
│  → small discovery → optional orchard/workshop interest
│  → later tractor project and purposeful meadow expansion
│
└─ North or a nearby public path: exploration
   accessible clue → clear one authorized entrance
   → small brook or old-house pocket → memory/useful activity
   → later shortcut, dock, or village outing

Distant promises: old mill, garage roof, road bend, hills
```

This is a proposed branch arrangement, not the current map or a finalized dependency graph. Only two nearby optional interests should compete for attention initially. Keep the existing main story legible and the rest as distant promises.

The 500-coin extra parcel is a meaningful investment beside the 500-coin opening budget. Early discoveries should also exist on the starting farm or an accessible public route, so buying the parcel is not required to experience the new system. Advice must consider the money needed for the player's current planting or restoration plan.

Each new area should supply three things over time:

- **A practical gain:** usable space, a new activity, a shortcut, or a useful restoration.
- **A human connection:** someone remembers it, visits it, or responds to the player's work.
- **A reason to return:** a harvest, a changing interaction, a collection goal, or a later project.

Proposed example: buying an east parcel first opens space for a garden. A partly covered object offers a small inspection scene. Clearing its immediate surroundings reveals an old tool or keepsake. Later, a related workshop project opens a useful farming capability. The initial purchase remains worthwhile even if the player postpones that workshop.

## 7. Give vehicles different jobs

| Vehicle | Suggested role | Suitable introduction | Main design check |
|---|---|---|---|
| Truck | Bulk goods and market deliveries | Extend the existing truck when new contracts or destinations arrive | Preserve current delivery access; explain actual costs, goods, and returns |
| Tractor | Prepare a selected patch of newly owned land through an optional work order | Discover the parked machine, then restore it when the farm has enough land and the relevant character has arrived | Define a benefit beyond existing batch clearing, one-tap collection, and family help |
| Motorbike | Small courier errands and personal trips | Introduce with a route that supports these activities | Its jobs should differ from bulk truck deliveries |
| Car | Family outings and travel to a later region | Introduce when a destination has meaningful activities | Travel should lead to something worth doing, rather than a vehicle collection requirement |

For a tractor prototype, test a bounded land-preparation job that clears selected weeds on owned ground while the player does something else. State its full cost in advance, preserve crops and decorations, and choose its speed or cost benefit through balance testing. This is a candidate mechanic, not an established need or an approved automation system.

Introduce one vehicle project at a time. The first prototype can show an inspectable tractor using the existing asset; playable tractor work can follow after the discovery loop is enjoyable. Four broken vehicles at the start would create a large repair backlog before their purposes are clear.

Avoid adding fuel chores, driving physics, or a large garage economy to the first discovery prototype. Transport can begin with a simple useful trip and a readable animation. Vehicle art follows the existing Blender, packing, and provenance workflow when implementation begins.

## 8. Old houses and children can connect the discoveries

Use the existing farmhouse porch or another explicitly accessible old place for the first inspection. A photograph, seed tin, faded sign, or tool can connect the landscape to the family. An exterior inspection is a smaller first step than a fully navigable house interior.

Keep rental cottages and school prerequisites on their existing progression. An optional discovery should not silently add a new payment or scavenger hunt before a family can move in.

There are already useful story connections in [the heart scenes](../src/content/hearts.mjs): Tomas finds **50 coins under the old tractor seat**, and Bo reads the old mill sign while Pip wonders about treasure inside. Reuse those threads. Do not pay another 50 coins for the same tractor-seat find, and do not turn a later character's scene into an opening appearance before that person has arrived.

Pip can provide the first clues. Bo and the other children can join after their introductions. Children notice concrete details; adults can explain costs, land rights, or repairs.

Draft Pip lines, each shown only when true:

| Moment | English | Vietnamese |
|---|---|---|
| Before discovering a tractor | “There is a big wheel behind those leaves! Can we have a look?” | “Con thấy một bánh xe to sau bụi cây kia! Mình xem thử nhé?” |
| After the tractor is visible | “It is a tractor! Can it help in our field?” | “Máy cày kìa! Nó giúp nhà mình làm ruộng được không?” |
| After the first completed tractor job | “Our tractor did that! There is room to plant now!” | “Máy cày nhà mình làm đấy! Giờ có chỗ trồng cây rồi!” |

These are individual contextual lines, not a complete three-line story scene. Final scenes must follow [STORY.md](STORY.md), including character introductions, the silent player, and Vietnamese relationships. In particular, Pip uses **con**, Bo uses **cháu**, and adult voices keep their own pronouns.

A character should acknowledge inspection, discovery, repair, and use differently. Once the tractor is visible, the hidden-wheel hint has served its purpose. Once repaired, a repair suggestion must disappear. A clue can be reopened from Village news without repeatedly producing a new notification.

## 9. What the first play session could feel like

This is an experience sketch to playtest, not a measured 20-minute schedule or a requirement to reach level 4 immediately.

1. Arrive with 500 coins. The home farm and essential routes are clear; neighboring land is partly covered. Two nearby landmarks suggest future choices.
2. Complete an ordinary farm action. Pip notices something at an accessible edge. The hint names one concrete action and can be dismissed.
3. Inspect or clear one relevant obstacle. Reveal a small place or object, with a short visual change and a saved discovery.
4. Gain something modest and useful, or enjoy a keepsake and family exchange. If this is a coin discovery, use the agreed introductory reward plan rather than stacking an additional payout.
5. Return to farming, fishing, or an existing repair. A suitable character responds to what happened and suggests one available next step.
6. Preview the neighboring land's purpose and actual price. Buy it later when eligible and comfortable, then gain useful space immediately and explore its smaller discoveries over time.

A reward is not required at every cleared obstacle. Keep surprises varied: a clue, a recovered object, an album memory, a decoration, or a useful place. The proposed introductory coin schedule remains **110 extra coins once per save**, still awaiting balance testing; this document adds no new coin allowance.

## 10. Lessons from other games

**Animal Crossing: New Horizons:** the Nintendo-hosted beginner guide describes gaining traversal options, gathering items for a museum, opening shops, and bringing residents to the island. The relevant pattern is that an activity or capability makes more of the place useful. It does not establish that Hollowbrook needs the same costs or timing. [Nintendo-hosted guide, authored by GameWith](https://www.nintendo.com/jp/ichikara/acbaa/02_en.html).

**Stardew Valley:** its official 1.5 changelog describes an additional island region with hidden journal pages, puzzles, Golden Walnuts that unlock areas and content, and new character stories. Exploration can therefore connect clues, place access, and people. Hollowbrook can use that general structure with its own village memories and modest discoveries. [Official 1.5 changelog](https://www.stardewvalley.net/stardew-valley-1-5-update-full-changelog/).

These are examples of shipped mechanics, not evidence that a particular fog effect, reward amount, or vehicle will increase enjoyment. The proposed benefit for Hollowbrook is a hypothesis to assess through playtests.

## 11. Implementation constraints for a later coding phase

Authoring a place in advance does not require loading and drawing every detailed object at startup. Ordinary Three.js fog changes appearance with distance; visibility and culling are separate controls. See the official [Fog](https://threejs.org/docs/pages/Fog.html) and [Object3D](https://threejs.org/docs/pages/Object3D.html) documentation.

The current game loads model kits and uses instanced chunks and detail levels: [model loading](../src/view/models.mjs), [land view](../src/view/land-view.mjs), and [batches](../src/view/batches.mjs). Putting additional trees or mist in front of a building does not by itself remove the building's render or download cost. Dense cover may add cost.

For a future implementation:

- Keep discovery definitions and rewards in `src/content`; validate actions and persist progress through `src/core` and `act()`/`tick()`.
- Save discovery, access, ownership, claimed rewards, and restoration coherently. Reloads, batch clears, double taps, undo, and delayed animations must not duplicate rewards or undo a completed discovery incorrectly.
- Keep unrevealed content out of interaction targets, production, and advice unless it is deliberately available. Hidden NPCs should not walk through blocked places or announce unrevealed buildings.
- Instantiate only needed detail and defer appropriate asset groups. Preserve silhouettes and orientation landmarks with lightweight scenery. Screen cover alone is not a loading strategy.
- Maintain **≤120 draw calls and ≤300,000 triangles** at all supported zooms, including reveal animations and fully developed areas. Do not only measure the small starting view.
- Preserve existing saves: owned parcels, buildings, established routes, fishing, and unlocked services must not become inaccessible under new cover.
- Provide a simple way home and readable route landmarks. Wider exploration should not create long empty journeys or camera traps.
- Add Vietnamese for every shipped label, refusal, hint, and story line. Verify the speaker rules and small phone layouts.
- Test purchases, inaccessible-land refusals, reward idempotency, save migration, hint updates, pathfinding, and visibility boundaries. Add a rules test and browser check for each implemented feature.
- Run the established simulation and browser suites when code is built. Keep school pace: casual by day 10, steady day 3–4, keen no earlier than day 2. Optional branches must also remain affordable without treasure.

## 12. Recommended first prototype

Build one covered parcel with a clear purchase preview, an immediately useful revealed patch, and one further discovery; pair it with one small discovery reachable without buying land. Include one contextual Pip hint, one short reveal, and one saved Village news card. Use an old-house object or the existing tractor asset as the landmark.

First evaluate whether players can explain what they own, what they can explore, what the next action costs, and what changed because of their effort. Observe whether they return to the revealed area and remember its character moment. Then test a useful tractor job; motorbikes, cars, extra destinations, and full interiors can follow when their activities justify them.

The desired result is a village that grows from a familiar home into a place full of connected discoveries, with clear choices and enough useful activity in each newly opened corner.
