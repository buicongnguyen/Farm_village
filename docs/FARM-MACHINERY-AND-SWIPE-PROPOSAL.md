# Farm machinery, swipe controls and gradual modernization

Consolidated follow-up, 2026-10-12: the owner proposed 30 crops per day by hand versus 300 per machine. [The farm expansion implementation plan](FARM-EXPANSION-IMPLEMENTATION-PLAN.md) records this target, distinguishes daily quotas from managed crop spaces, and supersedes the long-term recommendation here to stay within 30 beds. Latest owner refinement: machinery applies only to separately purchased and developed expansion fields; the existing garden remains for hand farming and helpers. Daily lockout/reset rules are not selected.


Date: 2026-10-12. Baseline: `70fea6e`. Design proposal only; no mechanics, prices, saves or deployed code changed.

Companion documents: [animal and orchard variety](FARM-VARIETY-AND-QUALITY-PROPOSAL.md) and [economy review](ECONOMY-ACTIVITY-STORY-REVIEW-2026-10-12.md).

## Recommendation

Introduce a small restored tractor with interchangeable attachments. Let the player swipe over a patch to preview the work, then confirm it. Machinery should make a larger, more specialized farm manageable and help the player carry out a useful plan. Its benefits can be capacity, seed efficiency, convenient collection or bounded automation; they should not all be another output multiplier.

Preserve a hand-tended garden near the house alongside mechanized field rows. An attractive small farm remains a valid play style. Optional driving can eventually add enjoyment in Explore mode, but should not be required for ordinary production or precise parking on a phone.

## What already exists

`src/ui/radial.mjs` already supports armed plant/harvest sweeps, Plant All and Harvest All. `src/core/farm.mjs` accepts multiple bed IDs. `src/ui/build-view.mjs` supports quick repeated placement of small objects. The current bed ceiling is 30, and crop growth already has a pond-proximity irrigation bonus.

Therefore, selling swipe planting or Harvest All as the tractor's main new ability would be misleading. Keep those existing controls available. The new system can add area construction, persistent field plans, context-sensitive machine work and an explicit limited work order.

The asset inventory lists a tractor in `rural-extra.glb`. That establishes an available visual starting point, not a finished drivable model or working attachments. Check dimensions, moving parts, collision and the phone budget before assigning art work.

## Research: what to adapt

- [GIANTS: seeding and planting](https://www.farming-simulator.com/newsArticle.php?country=gb&lang=en&news_id=317) distinguishes seeders and planters; some machines combine preparation and seeding to save time and fuel. Adapt the meaningful tool roles and combined work, while simplifying crop compatibility and controls.
- [GIANTS: introduction to crops](https://www.farming-simulator.com/newsArticle.php?country=hu&lang=en&news_id=297) distinguishes ordinary grain work from specialized root-crop equipment. A single machine need not perform every job.
- [GIANTS: grapes](https://www.farming-simulator.com/newsArticle.php?country=hu&lang=en&news_id=299) connects row placement, specialist equipment and processing outlets. Adapt the connection between a planned orchard layout and its useful products, without copying the full maintenance workload.
- [Story of Seasons: life in Olive Town](https://www.storyofseasons.com/PoOT/lifeinolivetown/) describes tool upgrades that work more land at once. This is a useful cozy-game model of modernization through less effort.

These are game-design references. Proposed mechanics and financial benefits below are Hollowbrook design choices, not claims about real agricultural profitability or proven player retention.

## Proposed machine ladder

| Machine or attachment | Activity and control | Main benefit | Role in the story |
|---|---|---|---|
| Push seeder or small two-wheel cultivator | Select a short row; preview preparation/planting | A low-cost introduction to planned rows; modest seed efficiency if balanced | A neighbour teaches a useful first repair |
| Restored compact tractor + cultivator | Drag a rectangle or row on cleared owned ground; prepare the selected patch | Build several valid crop plots in one confirmed job | Uncover the village's old tractor, restore it and prepare a community patch |
| Seeder attachment | Paint an eligible patch and choose a crop; later recall a saved plan | Efficient use of seeds and selective planting across that patch | Prepare feed grain for new animals or ingredients for an actual order |
| Small grain harvester / harvesting attachment | Select ready wheat; add a separate corn attachment later if worthwhile | Harvest a named field and optionally perform one prepaid replant | The farm supplies its first larger community delivery |
| Vegetable lifting attachment | Select ready carrot/potato rows | A distinct vegetable specialization and collection convenience | A root-vegetable supper or school harvest display |
| Orchard collection cart | Select a group of ripe trees | One route through an orchard and delivery to the common inventory | Recover the family orchard and prepare its first fruit basket |
| Irrigation pump and hoses | Preview a bounded coverage area | Access to reliable irrigation away from the pond | Restore an old pump beside newly bought land |
| Sorting/packing bench | Select a real sale/request and its goods | A select-product outlet or clearly priced packing service | The supermarket introduces the farm's named produce |

This is a menu of future options, not one release. A working tractor should come before a large combine fleet. Use a few clear crop groups; do not require a separate expensive vehicle for every vegetable.

The irrigation proposal must integrate the existing pond bonus, not stack two unexplained speed boosts. An orchard cart should not count as a new fruit source or provide another reward for the same harvest.

## Swipe design

There are three distinct jobs: create plots, plant empty plots and harvest ready crops. Each has its own valid targets and cost; one gesture must not silently destroy crops or construct paid beds while the player intended to collect.

1. Tap the tool or machine and choose Prepare, Plant or Harvest.
2. Swipe across a row, paint a patch or drag a rectangle. Provide start/end taps as a non-drag alternative.
3. Preview eligible targets, skipped spaces, seed requirements, inventory capacity, total spending and any operating cost. Blocked tiles use an icon/pattern as well as colour.
4. Confirm once. A short animation shows the machine working while the player can continue elsewhere.
5. Show a compact result with the number of plots completed and an optional next action. Do not open a modal after every tile.

For example: a player paints a 4-by-3 area; the preview reports twelve potential plots, ten usable and two blocked by a path. The player can edit it or explicitly confirm the ten, subject to ownership, bed limits and affordability. No silently shrinking purchase after confirmation.

Phone input: one finger paints only while the tool is armed; ordinary gestures remain camera controls outside that mode. Pinch/second-finger interruption cancels the unfinished selection rather than spending money. Keep Confirm/Cancel within the safe screen area. Desktop gets click-drag and Escape to cancel. Precise tractor steering is optional later.

An empty-plot construction purchase can offer Undo before its plots are used, following existing refund rules. Already harvested goods or planted crops cannot be rolled back merely by replaying an animation.

## Modernization must have a real economic benefit

An upgrade is worthwhile when it changes at least one of these:

- **Effort:** fewer repeated decisions and trips for the same useful work.
- **Inputs:** a small explicit seed saving, measured against consumed stock as well as bought seeds.
- **Capacity:** a carefully balanced larger field that the current farm can supply and sell from.
- **Quality:** a useful preparation/handling capability with a bounded select-product benefit.
- **Planning:** one authorized harvest/replant cycle with the desired crop and a spending limit while the player explores.

Do not promise more profit merely because a tractor animation replaces an existing All button. Reducing touches only increases income when the player's time or collection cadence was a bottleneck. Compare against the controls and hired hands already available.

For a seed-efficiency prototype, consider a modest saving such as one paid seed in ten, with transparent integer accounting. Wheat is already free to plant, so it must not produce a cash refund. This is a tuning candidate, not a chosen number. Saved seed credits must not be farmable through cancellation/reload. The corresponding effective discount should work consistently when seeds come from stored produce.

Use an investment calculation that includes any saved input cost and actual additional sales, then subtracts operating costs. A simple payback quote is purchase price / additional net income per comparable visit. If the only measured benefit is convenience, say so. Do not present speculative extra income as guaranteed.

Keep machinery's efficiency and quality in the same balance model as animal/workshop upgrades. Adding another 2x or 16x stage would compound the existing problem. Larger production also requires real demand; otherwise the new machine mainly fills the barn with goods the player does not want.

## Field size, automation and storage

The existing thirty-bed ceiling means a large expensive tractor has limited practical use today. The first slice can validate area planning and efficient work within that limit. A later managed-field expansion is a separate balance decision, with plot and rendering limits explicitly checked. Do not raise the cap simply to justify selling a machine.

Start with one finite work order, not an endless repeating farm. A player might authorize: harvest this ready field, then replant corn once using these reserved seeds and at most this many coins. The machine does not make unapproved purchases, consume goods promised to a customer or restart indefinitely after a reload.

A later trained operator can carry out that finite plan. Integrate with the existing hired field hand; the same crop must not be processed by both. A stocked machine must not create free output while the app is closed. Finished crops stay safe, and the plan resumes or reports completion without penalties.

Current manual harvest can sell overflow through `barn.addOrSell`. Automatic jobs should instead preview capacity and have a clear stop/collect option; do not silently sell valuable select products or discard them. Any change to manual overflow behavior needs its own review.

A first version does not need fuel, battery timers, random breakdowns or daily maintenance. The price of acquiring/restoring the machine can be enough. If operating costs prove necessary, show them per authorized job. Everyday manual farming remains available without project energy. Only the optional major restoration may use the existing project-energy system, with free recovery.

## A story that earns the machine

1. A wheel and a faded number plate show beneath an old shed's cover.
2. A child points it out; a neighbour recognizes the tractor and recalls the school harvest.
3. A short repair lesson identifies the missing parts. The player earns or buys a clearly listed small set.
4. Restoring it changes the shed and grants the first cultivator attachment.
5. The first swipe job prepares a useful community patch, then leaves the player free to choose its crop.
6. A keepsake is found in the toolbox: a photo, old seed label or modest one-time gift. The machine's productivity is its principal economic reward.
7. Later attachments arrive through relevant customers and lessons, so the player sees why each would help.

This joins the user's themes: effort leads to discovery, discovery opens an investment, the investment changes the farm, and people remember it. The tractor can retain its repaired, colourful character while gaining modern equipment.

## Connection to animals and orchards

Choose a clear next business rather than buying every item immediately:

- More hens may make a seeder useful for their feed supply.
- Cows and goats can connect better pasture/feed preparation to select dairy requests.
- Ducks add a pondside branch that does not require a tractor first.
- Pigs can help uncover an orchard clue; the orchard cart then supports the restored trees.
- Sheep can later justify a small hay/forage activity and a craft route, if both are useful and well balanced.
- Plum, citrus or grape groups can each support a different sale or recipe; the same tractor does not have to unlock every group.

Keep existing animals, open grazing and quick manual controls. Upgrading care, quantity, convenience and specialization should offer alternatives at a similar stage, with clear tradeoffs.

## Recommended prototype and acceptance

First fix the confirmed advice and valuation defects from the economy review. Prototype only:

1. Owned-land row/rectangle preview with explicit costs and safe cancellation.
2. One restored compact tractor, a cultivator and a seeder.
3. One bounded seed-efficiency or field-plan benefit, chosen after comparing it against existing All controls and hired hands.
4. One short discovery/restoration story and useful first customer.

Save harvesters, orchard carts, bigger field limits and operators for later slices. Claude can adapt the existing tractor and model the attachments after their footprint, tool width and movement contract are settled.

Verification should cover legal land/paths, limits, changing affordability, reservations, input cancellation, mixed ripe/unripe crops, shared jobs with helpers, storage capacity, old saves and exact-once progress/rewards. Navigation must handle gates, paths, people and animals without trapping them or damaging beds. The first phone build must stay within 120 draw calls and 300,000 triangles at every zoom, using the existing lazy-load approach.

Playtest whether the machine feels satisfying, gives a useful decision and saves effort beyond the current bulk controls. If it is mainly decorative, present it honestly as decoration or change the mechanic before adding more vehicles.
