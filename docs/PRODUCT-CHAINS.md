# Product chains: more value from the same farm goods

User request (2026-10-08): "do research to find products we can make from those things, like grape: grape wine, grape
oil, and many things more." These are real-world processed products for each raw good, grouped by the factory
that would make them. Processing can earn more from the same harvest (stage 3b of
`VILLAGE-GROWTH-PLAN.md`). The original **2–4× input value** was a design suggestion, not a rule used by every
implemented recipe. The actual values and the cost of each intermediate ingredient are listed below.

Kept cozy: alcohol stays as a gentle "fruit wine" only in an adult-oriented building tier; family-friendly
alternatives (juice, jam) remain part of that proposal. The tables after the implementation review describe future
possibilities, not a promise that those goods or factories are already available.

## Implementation and balance review — 2026-10-09

The production and village growth branch keeps the existing goods, tree, factory and truck prices. Its economic
change is independent production trays and additional optional customers, so changing the underlying prices at the
same time would make the effect on progression harder to assess. Revisit prices only after measuring actual play
with those changes; this review does not claim that the integrated pace/browser checks have already passed.

### Actual factory margins

All values below are base barn-sale coins, before order, shop, fruit-stand or truck premiums. Input cost means what
the ingredients could have sold for, not a second coin charge when cooking. The output column includes the whole
batch. Time is one newly started batch without a company worker.

| Recipe | Level | Inputs and their base value | Whole batch value | Value added by this step | Output ÷ input value | Time |
|---|---:|---|---:|---:|---:|---:|
| Apple juice | 6 | 3 apples = 27 | 1 bottle = 40 | +13 | 1.48× | 40 s |
| Carrot juice | 6 | 4 carrots = 16 | 1 bottle = 26 | +10 | 1.63× | 45 s |
| Orange juice | 6 | 3 oranges = 54 | 1 bottle = 70 | +16 | 1.30× | 60 s |
| Noodles | 8 | 4 wheat + 1 egg = 20 | 2 portions = 60 | +40 | 3.00× | 60 s |
| Instant noodles | 9 | 2 noodle portions + 1 carrot = 64 | 1 cup = 95 | +31 | 1.48× | 120 s |

The complete instant-noodle chain converts raw ingredients worth 24 coins (4 wheat, 1 egg and 1 carrot) into a
95-coin cup: +71 coins, or 3.96× raw value, across a 60-second noodle stage and a 120-second instant-noodle stage.
The +40 noodle margin is already inside that +71; adding it again would overstate profit. Growing and feeding time,
building purchases, occupied trays and collecting/selling are additional constraints.

**Keep the juice press at 600 coins and the noodle factory at 1,200 coins.** Juices add modest value to quick recipes;
fresh noodles offer the largest margin but require a working egg/feed chain. New order generation checks actual
renewable sources recursively, including learned recipes and working makers. A building count or orphaned queue
alone cannot create new demand. Existing saved order cards remain intact; their missing goods can use ingredient
guidance. The finite Lan picnic menu from PR #24 already gives both factories a story purpose, with juice, fresh
noodles and noodle cups followed by a shared meal; this pass does not add duplicate celebration scenes.

### What parallel production changes

Each purchased tray starts its own explicitly requested batch immediately. Inputs are paid once when that batch
starts; its quantity, recipe value and normal duration stay the same. Factories start with two trays and can reach
six. Extra trays cost 60, 200, 600 and 1,500 coins. A finished batch occupies its tray until collected. Already saved
serial jobs keep their saved completion times during migration.

More trays increase possible throughput when ingredients, barn space and player attention permit it. They do not
increase the per-batch margin, create free ingredients or automatically repeat recipes. The optional company worker
reduces the duration of new batches in one assigned factory by 10%; existing batches retain their timing. A manager
can start up to three batches with one explicit confirmation, paying all their inputs and requiring free trays.

### Premium crops and fruit trees

Herbs and ginseng are currently **valuable per harvest**, rather than the highest earning crops per hour. A non-wheat
crop spends one seed and harvests two items; keeping one for the next planting leaves one saleable item per cycle.
At continuous collection, herb (45 coins / 15 minutes) and ginseng (120 / 40 minutes) each provide 180 net base-sale
coins per bed-hour. Pumpkin gives 216 (18 / 5 minutes). The longer crops suit fewer visits and larger baskets. Keep
these numbers for now and describe that convenience honestly instead of promising a superior hourly return.

| Tree | Purchase | Base value per harvest | Regrowth | Gross base-sale coins/hour | Harvests to cover purchase | Earliest base-sale payback |
|---|---:|---:|---:|---:|---:|---:|
| Cherry | 70 | 3 × 7 = 21 | 40 s | 1,890 | 4 | 2 min 25 s |
| Apple | 120 | 3 × 9 = 27 | 50 s | 1,944 | 5 | 3 min 50 s |
| Peach | 240 | 3 × 15 = 45 | 5 min | 540 | 6 | 28 min |
| Orange | 300 | 3 × 18 = 54 | 6 min | 540 | 6 | 34 min |
| Coconut | 500 | 2 × 26 = 52 | 10 min | 312 | 10 | 96 min |

Hourly figures use the repeat harvest interval, with immediate collection each time. Payback includes each tree's
first growth delay and whole harvests. Trees hold one ripe harvest; these are not passive hourly payments while
away. Fast apples and cherries help the established opening pace, while orange/coconut broaden recipes and longer
visits. Keep prices and growth times in this release; treat the large early-tree advantage as a specific balance
question for a later measured pass.

### Fleet costs and selling premiums

The second and third trucks cost 400 and 900 coins at levels 4 and 6. Ordinary market trips last 50 seconds and pay
1.20× load value (rounded once for the whole load). All trucks share capacity: 20, then 40 and 70 goods after the
300- and 700-coin size upgrades. More trucks carry more goods at once; they do not compound the 20% premium.

Ignoring rounding, recovering an extra truck's purchase solely from its 20% premium over immediate base sales
requires 2,000 or 4,500 coins of base-value goods through that truck. If the original truck already handles the
farm's output, the extra truck buys convenience rather than a new source of profit. Optional company contracts
have their own explicit quotes; they should not be included in this ordinary-trip comparison. **Keep fleet prices**
and communicate capacity and concurrency, then reassess only if actual surplus regularly outgrows transport.

Sources for these calculations: `src/content/goods.mjs`, `src/content/buildings.mjs`, `src/content/economy.mjs`,
`src/core/farm.mjs`, `src/core/trees.mjs`, `src/core/production.mjs`, `src/core/production-state.mjs`,
`src/core/company-benefits.mjs`, `src/core/market.mjs` and `src/content/contracts.mjs`.

## By raw good

| Raw good | Products (real-world) | Factory |
|---|---|---|
| **Grape** (new fruit tree/vine) | grape juice, raisins, grape jam, grape-seed oil, fruit wine, grape vinegar | juice press, dryer, jam kitchen, oil press, winery |
| Wheat | flour, bread, noodles, instant noodles, cookies, crackers, pasta, cake base | mill, bakery, noodle factory, snack factory |
| Corn | cornmeal, corn bread, popcorn, corn chips, corn oil, corn syrup, animal feed | mill, snack factory, oil press, feed mill |
| Rice (new crop) | rice flour, rice noodles (phở / bún), rice crackers, rice paper, sweet rice cakes | noodle factory, snack factory |
| Soybean (new crop) | soy milk, tofu, soy sauce, soybean oil, tempeh | dairy/soy kitchen, oil press, fermenting shed |
| Peanut (new crop) | peanut butter, peanut oil, roasted peanuts, peanut candy | oil press, snack factory |
| Potato / sweet potato (new crops) | chips, fries, starch, sweet potato cakes | snack factory |
| Carrot | carrot juice, carrot cake, pickles, dried carrot chips | juice press, bakery, pickling shed |
| Pumpkin | pumpkin soup, pumpkin pie, roasted seeds, pumpkin seed oil | kitchen, bakery, oil press |
| Strawberry | jam, smoothies, dried strawberries, strawberry cake, ice cream | jam kitchen, juice press, dairy |
| Apple | apple juice, cider vinegar, apple pie, dried apple rings, applesauce | juice press, bakery, dryer |
| Peach | peach jam, canned peaches, peach juice, dried peach | jam kitchen, cannery, juice press |
| Cherry | cherry jam, cherry juice, cherry pie | jam kitchen, juice press, bakery |
| Coffee / tea (new crops, hill land) | roasted coffee, instant coffee, green tea, jasmine tea, bottled tea | roastery, tea factory |
| Sugarcane (new crop) | sugar, cane juice, candy, molasses | sugar mill |
| Coconut (new tree) | coconut milk, coconut oil, coconut candy (kẹo dừa), dried coconut | oil press, candy kitchen |
| Mango / longan / lychee (new trees) | dried mango, longan dried fruit, juices, jam | dryer, juice press |
| Milk | butter, cheese, yogurt, ice cream, condensed milk | dairy |
| Egg | mayonnaise, custard, cakes, noodles (egg noodles) | kitchen, bakery, noodle factory |
| Honey (new: bees) | honey jars, beeswax candles, honey cake, mead-style drink | apiary, candle shop |
| Healing herb | herbal tea, balm, remedy drops, herb soap | apothecary |
| Ginseng | ginseng tea, ginseng tonic, ginseng candy, dried root gift box | apothecary (premium gift goods) |
| Fish | dried fish, fish sauce (nước mắm), canned fish, fish cakes | fish shed, cannery |
| Flowers (garden) | perfume, essential oil, dried flower bouquets, flower tea | perfumery, florist |
| Wool / cotton (new animals / crops) | yarn, cloth, clothes | spinning mill, tailor (the user's "clothes" idea) |

## Suggested factory ladder (one new building per step)

1. **Juice press** — apple, cherry, peach, carrot, grape → juices (fast, cheap, early).
2. **Jam kitchen** — any fruit + sugar → jam (sugar from a sugar mill later; until then fruit only).
3. **Noodle factory** — wheat (+ egg) → noodles → instant noodles (the user's example).
4. **Snack factory** — corn → popcorn / chips; wheat → cookies; peanuts → peanut candy.
5. **Oil press** — corn, peanut, soybean, pumpkin seeds, grape seeds → cooking oils (high value).
6. **Dairy** — milk → butter, cheese, yogurt, ice cream.
7. **Apothecary** — herb, ginseng → teas, tonics, gift boxes (premium; pairs with the hospital).
8. **Winery / tea factory** — grape → wine (adult tier) or juice; tea leaves → bottled tea.

Each factory: 2–3 upgrade levels (more queue slots, faster), and its products feed the supermarket and department
store of stage 4, which sell at a markup.

## Original first-slice suggestion (future extensions retained)

The implemented first slice is apple/carrot/orange juice plus wheat-and-egg noodles and instant noodles, described
above. Grape vines, grape juice, flour and the additional processing steps below remain proposals.

Grape vine (new fruit) + **juice press** (apple, grape, carrot juice) + **noodle factory** (flour from the mill,
noodles, instant noodles). Art: a grape vine with three stages and bunches, the two factory buildings with upgrade
tiers, and product icons (juice bottles, noodle packs, cup noodles). Logic: recipes, unlock levels, orders asking for
them.
