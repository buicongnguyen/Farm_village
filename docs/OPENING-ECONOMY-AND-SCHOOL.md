# Hollowbrook — customer demand, opening choices, housing, and school activities

Date: 2026-10-08 (Asia/Seoul)

Status: evaluation of the user's proposal, with read-only inspection and an in-memory economy experiment. All changes described here are proposals. Gameplay, prices, starting funds, roads, and school access have not been changed.

**Latest decision, 2026-10-08:** keep the normal **500-coin start** and add small discoveries tied to exploration and effort. This supersedes the 1,000-coin opening recommendation recorded below. The earlier evaluation and simulation remain as historical research. See [LUCK-AND-HAPPY-PROGRESSION.md](LUCK-AND-HAPPY-PROGRESSION.md) for the current direction and dialogue review.

Companions: [useful dialogue and village news](DIALOGUE-AND-VILLAGE-NEWS.md), [audience and art research](RESEARCH-DIRECTION.md), [current roadmap](JOURNEY.md), and [cast and voices](STORY.md).

## 1. The user's proposal

- When the player produces a lot of bread while customers want cake or another product, customers should comment in a useful way.
- Introduce the wide world by focusing first on the farm.
- Make rental houses somewhat more expensive so housing does not immediately take over the opening.
- Consider about 1,000 starting coins, giving players room to emphasize farming and leisure, business and income, fishing, or learning.
- Keep the road to the school present in the world; repair it as part of progress.
- Let players enter the school and participate in learning activities or contests.

Interpretation: "higher rental-house price" means the player's cost to restore, build, or improve rental cottages. Increasing the rent received would increase housing's financial appeal and would pursue a different goal.

## 2. Overall evaluation

The ideas fit the intended broad audience. They connect three things the current game can develop further: production decisions, villagers who explain opportunities, and places that offer activities beyond earning coins.

**Recommendation: begin with one clear farming success, then offer several flexible interests within a shared village-restoration journey. Use customer demand to explain choices, and make the school a place to play as well as a milestone to restore.**

The main tensions to resolve are:

1. More starting money creates spending freedom, but current level and project gates still determine what can actually be done.
2. More expensive required cottages also delay families, school, and clinic progress. Housing is part of the story backbone.
3. Customer requests can encourage better planning only when their quantities, rewards, and prerequisites are visible and trustworthy.
4. School activities can be an early interest, but the fully reopened school currently arrives several days into the intended progression.

These are design decisions to make explicitly. A change to starting coins alone cannot resolve all four.

## 3. Current rules relevant to the proposal

The following facts were checked in the repository on the date above.

| Area | Current behavior | Implication |
|---|---|---|
| Normal opening | Restored village with 500 coins, barn capacity 200, 12 wheat, two bread, six planted beds, and broken buildings | The proposal doubles the normal starting money. The 50-coin empty-farm start is a legacy/test mode. |
| Farm repairs | Feed mill 25 coins, coop 25, bakery 90 | A basic working farm is affordable before adding 500 more starting coins, subject to progression rules. |
| Existing cottage repairs | Each currently costs 90 coins | Restoring the existing cottages does not use the escalating prices for constructing new ones. |
| New cottage prices | 150, 250, 900, 1,400, and higher by placed count | The actual new-build price depends on how many cottages already stand. These are not the prices of the initial repairs. |
| Base rental income | 12 coins per hour for a basic cottage, modified by charm, condition, and access; eight-hour accumulation cap | Housing value includes families and their contributions as well as rent. Higher construction costs require a payback review. |
| Fishing | The permanent village pond is already available for free | Buying the optional 120-coin pond is not necessary to start fishing and does not create another independent fishing line. |
| School reopening | Sequential projects, level 6, two families with children, 24 bread, ten corn bread, and 4,000 coins | Full school access is currently a substantial community milestone. |
| School road and building | School Lane, Civic Row, and an old school ruin are already on the map | Repairing existing infrastructure fits the setting. No new road from empty ground is needed to explain access. |
| School activities | Playable classroom interiors and contests are not implemented; a festival reward event already exists | An enterable school and actual contests would be new features, not merely new notification text. |

Sources: [game startup](../src/game.mjs), [economy](../src/content/economy.mjs), [starting village](../src/content/start.mjs), [building catalog](../src/content/buildings.mjs), [repair rules](../src/core/condition.mjs), [fishing](../src/core/fishing.mjs), [projects](../src/content/projects.mjs), [world layout](../src/content/world.mjs), and [festival trigger](../src/core/quests.mjs).

## 4. Customers should explain unmet demand

### Evaluation

This is a useful extension of the proposed dialogue system. It gives the player a reason to diversify production and makes customers seem aware of the farm.

The first version can use the existing order board. Current orders are explicit requests with quoted rewards; there is no market-wide supply-and-demand price simulation. Start by explaining those real requests before introducing a larger market system.

For example, a customer could say:

> You've got enough bread for my order. We're just missing the corn bread.

The wording refers to the player's prepared goods. Current orders are delivered together, so the customer should not claim to have received a partial delivery that never happened.

### What the game should check

Before suggesting a different product, consider:

- The amount in the barn and output already queued in production.
- Bread reserved for the current village project and other relevant commitments.
- The exact goods still missing from the customer's real request.
- Whether the alternative recipe is known and its building works.
- Whether the ingredients can be obtained at the player's current stage.
- Whether the player has already received or dismissed this advice.

If enough corn bread is already baking, the helpful response changes to reassurance that the order is underway. If eggs are missing, the useful suggestion concerns eggs. If the recipe is unavailable, describe it as future interest rather than an action the player should complete now.

Advice should remain available through the order or news panel, with a clear action such as viewing the request or highlighting the relevant production building.

### Bread is still useful

Bread is required for family arrivals, school restoration, and the clinic. A large stock can be deliberate preparation. Avoid judging the player solely by the number of loaves in storage.

Keep dependable outlets for surplus goods. Do not silently reduce a promised order payment, invent spoilage, or make old bread worthless after encouraging investment in it. Special demand can offer a visible opportunity while ordinary goods retain their established uses.

If a later version adds seasonal or limited demand, display its quantity and terms before the player commits ingredients. A finite picnic order is easier to understand than an invisible market that changes prices without explanation.

### Cake is a later example in the current game

Carrot cake is normally unlocked at level 7 and requires three carrots, two eggs, and one milk. The ordinary cow-barn route opens after the school. Early advice should therefore use a genuinely available alternative, such as corn bread after its requirements are met.

Higher selling price also does not automatically mean better business. At current base values:

| Product | Base value of inputs | Base sale value | Added sale value | Bakery time |
|---|---:|---:|---:|---:|
| Bread | 6 coins for three wheat | 12 | 6 | 30 seconds |
| Carrot cake | 66 coins for carrots, eggs, and milk | 110 | 44 | Five minutes |

These are comparisons against selling the ingredients at their base values, not complete profit estimates. They omit building costs, ingredient-production time, other sale channels, and project needs. They show why a larger sale price alone is insufficient: a real cake request, an available batch of ingredients, or a player's preferred session length may make cake attractive in a particular situation.

See [orders](../src/core/orders.mjs), [recipes and values](../src/content/goods.mjs), [production queues](../src/core/production.mjs), and [project reservations](../src/core/barn.mjs).

### Suggested message lifecycle

1. A customer posts a real request.
2. The farm has enough of one requested product but is missing another.
3. A relevant character explains the remaining need and a feasible next action.
4. The player chooses whether to act, save the suggestion, or do something else.
5. Production or delivery changes the message.
6. Completion produces a specific thank-you and retires the suggestion.

This fits the notification proposal: one new message for a meaningful opportunity, with updates to the same card rather than a growing stack of warnings.

## 5. A focused opening with flexible interests

### Recommended introduction

Begin near the farmhouse, existing beds, barn, and order board. Teach one complete cycle: harvest, understand the goods, sell or process something, and see the result.

After that first success, offer a few ideas through June or the Today board. Keep the world visible and allow exploration. Introduce nearby places before directing attention to every district in the large map.

The choices should be interests that can change between visits:

| Interest | Early experience | What it contributes |
|---|---|---|
| Farming and leisure | Tend crops, plant available trees, arrange a pleasant corner, spend time with family | Food, expression, memories, and steady farm progress |
| Business | Repair production, compare actual orders, plan batches, use available selling channels | Income, planning, and efficient use of ingredients |
| Fishing and nature | Fish at the existing pond, collect species, follow an optional nature clue | Relaxation, collection, and some sale income |
| Learning and community | See the school goal, try a small introductory activity, later enter the restored classroom | Puzzles, family participation, keepsakes, and village life |

Do not require a permanent class or career choice. A player can fish today and concentrate on baking tomorrow.

### Current limits on route freedom

The present progression still requires farm and cottage projects. More money does not remove those dependencies. Fishing currently yields fish and sale income but its catch and direct-sale actions do not award the ordinary XP needed for every level gate. It is an available activity, not yet a complete substitute progression route.

The initial design should promise different emphases within a shared journey. If fully independent routes are wanted later, define alternative contributions and progression credit explicitly, then test them. For example, a community project might eventually accept either a farm contribution or a fairly valued donation funded by fishing. That would be a new rule, not something the current system already supports.

## 6. Evaluating a 1,000-coin start

### Recommendation

**Use 1,000 coins as a prototype candidate.** It is compatible with the existing simulated school pace in the experiment below. Its main promise should be room to experiment and choose an improvement.

The opening should still communicate what the player can afford and why each available purchase is useful. A larger balance beside locked or poorly explained options would not create meaningful freedom.

At current prices, mill, coop, bakery, and two cottage repairs total 320 coins. Including the market and village-street repairs brings this to 396. These are eventual repair totals subject to level and project gates, not a claim that all can be bought immediately. Both fit within the current 500 coins; 1,000 gives additional room for other purchases and convenience.

### Read-only simulation experiment

Method: the existing `simulate` function, restored-village mode, seed 4242, 14 simulated days, and the existing casual, steady, and keen profiles. The exported starting-money value was temporarily changed only in the Node process, then restored. Repository files were unchanged. All other prices and rules were held constant.

| Starting coins | Casual school day | Steady school day | Keen school day | First cottage |
|---|---:|---:|---:|---|
| 500, current | 5 | 3 | 2 | Day 1 for all three profiles |
| 1,000, proposed | 5 | 3 | 2 | Day 1 for all three profiles |

The casual clinic moved from day 6 to day 5. Steady and keen clinic timing remained day 3 and day 2 respectively.

The observed school timings meet the existing targets: casual by day 10, steady on day 3–4, and keen no earlier than day 2.

**Limit:** this is a farming/project-focused bot using one seed, not a human playtest. It does not simulate fishing specialization, leisure priorities, customer-demand changes, revised house prices, or school contests. It does not establish that those future changes are balanced.

References: [simulation](../scripts/sim.mjs), [bot](../scripts/bot.mjs), and [pace tests](../tests/sim.test.mjs).

### What to test next when implementation is authorized

- Can a new player explain one useful purchase and one alternative?
- Does the player have a practical way to recover after an unhelpful purchase?
- Does the larger budget allow a satisfying optional choice without making the opening feel finished immediately?
- Can farming, fishing, and business interests contribute without trapping the player behind an unexplained level requirement?
- How does the starting budget behave across more seeds and more varied play styles?

Change starting money and housing prices in separate experiments first, so the effect of each can be understood.

## 7. Higher rental-house prices: adjust the right part of the journey

### Evaluation

More substantial housing investments can support a progression from farming to a prosperous village. However, price alone is a blunt way to keep the player focused. The first two families are prerequisites for the school, and four families are required for the clinic.

Making all early cottages expensive taxes every play style and delays the characters who provide much of the game's warmth. The existing tests also expect the first cottage on the first day for relevant profiles.

### Recommended approach

- Keep the first family's restoration affordable and clearly tied to the homecoming story.
- Keep the second family's cost compatible with the school pace. The third and fourth households also need review because they gate the clinic.
- Make later investment choices meaningful through new construction, comfort upgrades, and eventually optional expansion after required community housing.
- Introduce the farm first through the initial activity sequence, camera focus, and useful goals, then offer the family project after the player has completed a farming cycle.
- Present what a home brings: a particular family, routines, help, stories, and rent. It should be more than an income counter.

The current implementation uses the first cottage's base price when calculating all existing cottage repairs. Raising only later new-build prices would leave the 90-coin initial repairs unchanged. Raising the first base price would also affect repair, wear, and demolition values. Any intended distinction between affordable restoration and costly expansion must be expressed deliberately in the rules.

Review rental payback before increasing prices. At an unmodified 12 coins per hour, a 90-coin repair corresponds to 7.5 hours of accrued base rent; charm, access, wear, tips, and collection caps affect the actual result. Later construction and upgrades already have substantially longer base-rent payback. A higher price is useful only if the resulting investment still feels worthwhile.

There is no validated replacement price curve in this document. Test the 1,000-coin opening first, then tune the specific housing investments that evidence shows are too easy or too dominant.

## 8. Repair the existing route to the school

### Existing geography

The world already has School Lane, Civic Row, and the old school ruin. Starting damage is currently assigned to the north lane and village street, not School Lane. General path connectivity does not currently treat road damage as a school-access restriction; the delivery truck has its own explicit village-street repair requirement.

Therefore, "repair the road to enter the school" would require a new progression rule and a visible reason in the world. Merely changing road appearance would not create that gameplay connection.

### Proposed sequence

1. The player can see the old school and the route from the beginning.
2. A character explains what the road repair will improve, and what is still needed for the school itself.
3. Restore the existing stretch through a small, clearly scoped community project. Show the location and progress.
4. The completed repair visibly improves the route and is acknowledged by villagers.
5. When the school is restored, selecting its door offers entry to a usable classroom scene.

Credit a road or building the player already repaired. Existing saves should not be asked to rebuild the same infrastructure or lose access they already earned.

### Early learning versus full school reopening

To preserve current school pacing, introduce a small school-related preview before the full reopening, such as a courtyard nature challenge or an activity Pip brings home. The exact preview must fit the story; Cora currently arrives with the reopened school, so an earlier appearance would need an intentional story revision.

After reopening, the player can enter the classroom and take part in regular activities. This gives an early taste of the learning interest without treating a small activity as completion of the full restoration milestone.

If the intention is instead full school entry on the first day, that is a larger progression change. It would need a new distinction between an accessible room and a fully functioning school, or an explicit revision of the existing school milestone and pace targets. This document recommends preserving the full reopening milestone while testing the preview approach.

## 9. A school that offers enjoyable activities

### First scope

Start with one readable classroom, Cora, a few usable objects, and one well-developed contest. Selecting the school door should take the player into that place, where choosing a board or table starts an activity and a clear exit returns to the village.

A small illustrated or fixed-camera interior can establish that experience. A full set of freely navigable interiors throughout the village would be a separate expansion.

### Activity candidates

| Activity | Approachable version | Optional harder version |
|---|---|---|
| Harvest basket challenge | Match pictures or count produce | Plan a basket that meets several requirements |
| Nature club | Match fish, fruit, or animals to pictures | Connect habitats, seasons, or observed clues |
| Market puzzle | Choose the goods a customer requested | Compare ingredient costs, output, and limited production time |
| Word game | Match a familiar object with a word | Optional English–Vietnamese vocabulary practice |

Use a harvest basket challenge as the first candidate: it connects directly to the farm, works with pictures, and can grow into a planning puzzle for adults. It should be enjoyable as an activity, rather than a compulsory lesson inserted between farming actions.

### Contest and reward design

- Offer untimed practice and optional challenge rounds.
- Let adults and children cooperate or take turns on one device.
- Keep instructions short, with examples and immediate, helpful feedback.
- Let players retry freely and leave without losing goods or progress.
- Reward a keepsake, a drawing for the classroom, a character moment, or a modest decoration.
- Keep repeated rewards small enough that contests do not become the mandatory fastest way to fund the farm.
- Allow learning activities to remain available without a narrow real-world attendance window.
- Make vocabulary and reading difficulty selectable; language proficiency should not block the village's main progression.

A completed contest should produce a concrete celebration: Pip puts the ribbon on the classroom wall, Cora mentions the solution, or the family album gains a memory. The existing festival payout is a separate event and should not accidentally trigger with every contest replay.

## 10. Bring the proposals together through evolving dialogue

One possible sequence, with all dialogue treated as draft concepts:

| Moment | Character response | Useful next action |
|---|---|---|
| Bread supply covers known needs, but a corn-bread request is incomplete | Lan points out the missing item and its ingredients | View the real request or bakery recipe |
| The missing batch is queued | June notes that the baking is underway | Let it run while doing another activity |
| The player wants a change of pace | Pip invites the player to the pond or a currently available school activity | Show the place without committing resources |
| A household restoration becomes feasible | Ada explains who could move in and what is still needed | Inspect the cottage project and cost |
| The school route is repaired | A relevant villager acknowledges the improved route | Show the next legitimate school step |
| A contest is completed | Cora recognizes the achievement; a visible keepsake appears | View the memory or return to free play |

One notification card should follow each opportunity through its state changes. Suppress advice that has been read or declined until circumstances materially change. Use the notification number for unread messages, not for every unfinished activity.

Final in-game lines must be authored in English and natural Vietnamese, with the speaker relationships and pronouns in STORY.md. These draft examples are not additions to the localization files.

## 11. Suggested implementation order, for a future coding task

1. **Demand-aware dialogue using existing orders.** Begin with bread and corn bread, real inventory and queued output, and one useful next action.
2. **An opening-budget trial at 1,000 coins.** Keep prices unchanged initially and compare observed choices with the current 500-coin opening.
3. **A farm-focused introduction and flexible suggestions.** Include the already-free pond and clearly label future school access.
4. **Targeted housing evaluation.** Adjust specific later investments only after measuring their effect on family, school, and clinic timing.
5. **The school route and one enterable classroom activity.** Make it a complete experience with a visible consequence and a clear return to the village.
6. **Broader routes and additional contests.** Expand only after the first loop demonstrates useful choices and comfortable pacing.

For implementation, keep rules and advice eligibility in `src/core` behind the established action/tick boundaries, content in `src/content`, presentation in the view/UI layers, and every displayed string in Vietnamese localization. Preserve the existing phone budgets and run the required rules, simulation, build, and browser checks when gameplay changes are made.

## 12. Decisions and remaining uncertainty

| Proposal | Evaluation |
|---|---|
| Customers explain bread surplus and unmet alternative requests | Recommended, using actual requests and available production first |
| Focus first on farming in a wide world | Recommended through the introduction and presentation of choices |
| Start with 1,000 coins | Reasonable prototype value; current bot experiment preserves school timing |
| Raise all rental-house costs immediately | Refine: protect required family arrivals and test later investments separately |
| Let players switch between farming, business, fishing, and learning interests | Recommended; fully independent progression routes need additional rules |
| Repair the existing school route | Recommended as a visible, credited community action; not currently an access gate |
| Enter the school and play contests | Recommended as a small first interior and one optional, replayable activity |

The central design test is whether the player can explain what they want to do next, understand why it helps, and choose a different enjoyable activity without feeling stuck. The simulation is a useful balance check; watching real players make those choices is still necessary.
