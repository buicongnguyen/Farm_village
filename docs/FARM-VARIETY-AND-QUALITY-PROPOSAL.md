# Farm variety, care and quality: proposed progression

Consolidated follow-up, 2026-10-12: use [the farm expansion implementation plan](FARM-EXPANSION-IMPLEMENTATION-PLAN.md) for the combined delivery order, machinery capacity proposal, northwest playground, economics and acceptance criteria. This document remains supporting rationale.


Date: 2026-10-12. Based on code through `70fea6e` and the owner's idea of more animals, grouped trees, exploration and gradual investment in better care and products.

Status: design proposal, not implemented. Read alongside [the economy review](ECONOMY-ACTIVITY-STORY-REVIEW-2026-10-12.md). Prices, premiums, timing and unlock levels require balance tests. No gameplay or deployment changes were made for this proposal.

## Evaluation

The idea can make Hollowbrook more interesting because investment becomes visible: a better home for familiar animals, a more useful orchard and new products that villagers notice. Exploration can reveal the next opportunity before the player buys it.

The important design goal is to give additions different roles. Ten species that all follow the same feed/wait/sell loop provide less variety than a few species connected to cooking, exploring, decorating and personal stories.

Keep the original animals and their names. Improve their home, learn better husbandry and build trust with them. A beginner's small coop can already be a safe, cheerful home; a larger yard then adds new behavior and benefits. Avoid a progression that asks the player to discard a beloved starter animal to buy a superior replacement. Optional breeds can later have different strengths or appearances without one breed making all others obsolete.

## Current implementation to preserve

- Productive animals: hens, cows and goats. Hens can already be bought up to eight per coop; cows and goats up to four per home. This is not a new capacity system starting from zero.
- Cows and goats already graze across owned fields. Hens stay around their coop/yard. Preserve existing free movement when upgrading the economy.
- Existing building output upgrades give 2x, 4x, 8x and 16x for unchanged inputs/time. Adding quality bonuses on top without rebalancing would worsen the inflation risk identified in the review.
- Existing fruit: apple, cherry, peach, orange and coconut. Existing optional meadow route produces honey.
- The asset queue documents duck, pig and sheep rigs, further shelters, and a delivered tree pack including lemon, plum, mango, grape, longan and lychee. Art availability is not equivalent to finished gameplay, compatible icons or tested phone performance.
- Preserve the 500-coin restored start, earned small discoveries, non-punitive absence, safe ordinary play at zero project energy and existing chapter-11 meadow/cannery choice.

## Four kinds of investment

| Investment | What the player gains | Main tradeoff |
|---|---|---|
| Capacity | More animals, trees or trays | More space, feed/input demand and goods to sell |
| Care and quality | Better habitat, learned care, select products and specialist requests | Setup effort and a modest premium; not exponential quantity |
| Convenience | A feeder, collection point, storage or trained helper | Less repeated tapping; not automatically the highest income |
| Specialization | A breed, recipe, orchard theme or discovery skill | A distinct useful role, with other choices remaining available |

Allow players to combine these over time. They should be choices about what helps their current farm, not permanent classes.

## Animal progression

| Animal | Base role | Better habitat/care | Distinct later use and story |
|---|---|---|---|
| Hen | Affordable eggs and early baking | Dry nesting corner, shaded scratching yard, learned feeding routine | Select eggs for a bakery or school picnic; the original named hens star in a family memory |
| Cow | Milk for butter and cooking | Better milking area, pasture shelter, brushing lesson | Select milk for a dairy recipe or hotel breakfast; a neighbour teaches a family recipe |
| Goat | Goat milk and cheese | Browsing corner, low climbing platform, milk stand | Herb cheese and a guided walk to an overgrown path; no crop destruction |
| Duck | Pondside activity and duck eggs | Safe bank, nesting shelter and a small duck pond/run | Swimming and ducklings as visible changes; custard or festive baking links the pond to the kitchen |
| Pig | Orchard/woodland exploration | Shaded pen, mud patch and a learned scent trail | Truffle finds and occasional authored keepsakes; a return-and-share story at the farmhouse |
| Sheep | A future craft chain | Pasture shelter and gentle shearing station | Wool to yarn to a blanket or scarf; a school craft display or home decoration |
| Bee | Expand the existing meadow branch | More flower variety and habitat improvements | A honey specialty and community tasting; retain the value of the existing story choice |

Ducks should have a reason to exist beyond another egg colour. Pigs should introduce a discovery activity rather than become the highest-value passive crop. Sheep should wait until wool has a useful consumer; one rug or blanket route is enough initially.

An animal's normal output remains safe and predictable. Care upgrades add benefits; they do not introduce distress, death, lost affection or product spoilage when the player is absent. Petting is optional. Bought improvements and learned care persist. Habitats must remain understandable: a preview shows suitable space and access before money is spent.

A practical hen sequence:

1. Keep the current starter hens in their modest coop and name them.
2. Receive a specific request that makes an upgrade relevant, such as a bakery picnic basket.
3. Choose between another hen for volume, a yard improvement for quality, or a feeder for convenience.
4. Complete one short care lesson and the chosen improvement.
5. See new pecking/dust-bath behavior and a clear product benefit.
6. Deliver to the named requester; a remembered line and small permanent decoration acknowledge it.

## Quality without clutter or runaway money

Prototype with only two grades: regular and select. Start with eggs or milk before expanding to fruit and cooked goods. Group grades under the same inventory item, with a small clear marker when grade matters.

A candidate design is a predictable select batch every few completed collections after a habitat/care milestone. A progress marker makes effort understandable. Optional small surprises can remain, but required progress must not depend on luck. This proposal has not chosen a final frequency.

An illustrative premium is 20–30%, subject to simulation; it must be evaluated within the whole upgraded economy. At a 25% premium, a 12-coin egg earns 3 extra coins. An illustrative 300-coin improvement therefore needs 100 select eggs to repay through that premium alone. That is not a promise about how long repayment takes: collection schedule, premium frequency, buyer access and feed matter.

Important product rules:

- Regular products remain valid for ordinary recipes and story progress.
- Use regular goods first automatically; ask before consuming select goods where their quality would be wasted.
- Specialist requests are optional and appear only when the farm can produce the requested grade.
- Premium ingredients may transfer a bounded grade to a finished dish. Avoid multiplying the premium at every processing stage.
- Keep the value of premium stock in reservations, sale quotes, advice and the valley ledger consistent.
- Existing purchased upgrades require an explicit migration/compensation design before replacing exponential output. Do not silently remove what players bought.

## Tree groups as places to discover

| Group | Trees or plants | New use | Discovery/story |
|---|---|---|---|
| Kitchen garden | Existing apple and cherry | Reliable fruit, pies, small gifts | Start beside the house; preserve its usefulness throughout the story |
| Old family orchard | Existing peach plus plum | Jam, preserves and a picnic basket | An old recipe label leads to one surviving plum tree behind an overgrown gate |
| Citrus corner | Existing orange plus lemon | Drinks, marmalade or a lemon cake | A school refreshment stand or a neighbour's tasting afternoon |
| Sunny orchard | Existing coconut plus mango | Larger, less frequent harvests and fruit desserts | A visiting grower offers a cutting after a suitable corner is prepared |
| Remembered garden | Longan and lychee | Gift baskets and family harvest scenes | A neighbour remembers who planted the old trees; restore access and learn their care |
| Vine garden | Grape arbor | Fresh fruit, raisins or a picnic recipe | Repair the supports and turn the place into a family sitting corner |
| Shade and landmark trees | Maple, birch, fir, cypress and great oak | Beauty, habitat, a reading corner or swing | The reward can be a place people use, rather than another commodity |

These are future groupings, not new map regions or a climate simulation. A few existing farm corners can demonstrate the idea. Introduce one useful species at a time and show one next hint. Do not expose a catalogue of every locked tree at the opening.

Tree improvement should combine learned pruning/grafting, a well-prepared bed, suitable spacing and convenient harvesting. Let upgrades make visible changes and open select fruit or one recipe. Longer harvest intervals should support players who visit less frequently; balance earnings per visit as well as ideal continuous income.

Suggested exploration pattern: see a hint -> ask a neighbour -> learn a relevant skill -> clear or repair access -> harvest or meet something new -> choose its use -> see a lasting change. Opening the gate can reveal a memory and an investment opportunity together. Essential materials and directions should be explicit; the surprise is the extra keepsake.

## Extend the same principle to other items

| System | Improvement direction | Decision it creates |
|---|---|---|
| Crop beds | Better soil, irrigation and a seed-saving lesson | More planted area versus improved existing beds |
| Feed mill | Learn a new feed recipe; bulk preparation or storage improvements | Meet another species' needs versus save routine work |
| Bakery/dairy | Extra capacity, a select recipe or a convenient collection station | Volume versus specialist orders versus convenience |
| Fishing rod | Clearer bite indication, easier line control or access to a guided fishing spot | Accessibility and exploration, rather than only higher sale prices |
| Barn | Capacity, sorting, reserved-stock clarity and a collection point | Store more versus avoid mistakes and repeated trips |
| Trucks | Capacity, useful scheduling and specific delivery roles | Bulk surplus versus a community request; keep driving overhead understandable |
| Supermarket | Themed shelves and returning named customers | Choose a useful outlet for an orchard, dairy or pond specialty |
| Farmhouse | A kitchen recipe, display shelf and furniture arrangement | Turn progress into a home that reflects the player's interests |
| Tools | Area actions, clear previews and taught repair abilities | Save time or access a new optional activity |

Use only a few upgrade dimensions per system. A large upgrade screen full of tiny percentages would undermine the welcoming family audience.

## Guidance and investment clarity

Every investment card should show cost, required space/materials, what visibly changes, additional feed or inputs, the benefit and the next useful customer/recipe. Estimate payback in deliveries or visits using actual farm conditions when feasible; label estimates and show their assumptions.

Contextual advice examples, to be authored in all active languages later:

- If egg demand exceeds supply: a neighbour suggests another hen, provided the coop has room and feed is available.
- If an actual select-egg request is available: suggest improving the yard, with its cost and exact requirement.
- If milk is already piling up: suggest a dairy recipe or customer before another cow.
- If the player checks infrequently: suggest a larger, slower harvest or collection convenience, not the most profitable activity under nonstop tapping.
- If money is tight: give an achievable existing activity before advertising an expensive animal.

Show a profitable option, a relaxing/exploration option and the story goal without implying all three are chores. People should acknowledge what was actually chosen and later mention the result. Stock, queued yield, reservations and building condition must be correct before an advice line is eligible.

## Useful references

[Story of Seasons: Pioneers of Olive Town](https://www.storyofseasons.com/PoOT/lifeinolivetown/) describes tool upgrades that improve work coverage, ingredients with several uses, expanding shop selections and requests that change the town. The applicable lesson is to connect investment to useful capabilities and visible development.

[Hay Day's production-building guide](https://support.supercell.com/hay-day/en/articles/production-building.html) describes capacity expansion and mastery benefits from using a building. The applicable lesson is to distinguish capacity from learned improvement; Hollowbrook does not need its paid-currency structure.

[Stardew Valley's official features](https://www.stardewvalley.net/about/) connect skills with recipes, professions, new areas and relationships. The applicable lesson is that variety is stronger when activities develop capabilities and connect to people.

These references support broad design patterns. They do not establish that any proposed premium, unlock or specific animal mechanic here is balanced or proven enjoyable.

## Recommended first implementation slice

First resolve the two confirmed economy-review defects and measure the current multiplier system. Then:

1. One care/quality path for existing hens, with the same named animals retained and a useful customer request.
2. One new animal: ducks, with pond behavior and one useful recipe.
3. One discoverable tree: plum, using the delivered art and one old-family-recipe story.
4. One investment comparison card that respects the farm's actual stock, upgrades and preferred visit length.

Cows and goats can follow using the proven quality rules. Add pigs with a real exploration trail next. Add sheep only with its first meaningful craft. More orchard groups should follow demonstrated player interest, not all arrive in the same update.

Before expanding: verify that volume, quality and convenience are each reasonable choices; new goods have real consumers; existing animals and saves remain intact; short visits stay satisfying; and grazing/room movement stays clear of crops and paths within the established phone budgets. Human playtests should determine whether players form preferences and remember a discovery, not merely purchase every next item.

## Machinery follow-up

The owner subsequently asked for swipe-operated machines and modernization. See [the machinery proposal](FARM-MACHINERY-AND-SWIPE-PROPOSAL.md) for the existing bulk controls, machine ladder, profit model and bounded tractor prototype. That can be a separate pilot before adding several species; the lists above are not a commitment to ship all additions together.
