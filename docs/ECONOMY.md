# Farm Village — economy and pace

The starting numbers for v0.1 to v1.0 and the pace they produce. Every number here also lives in
`planning/pace-model.mjs`, a small model of a player that runs before any game code exists. When the game's rules
exist, the real simulation replaces it (`ROADMAP.md`, M1), and the same targets apply.

```
node planning/pace-model.mjs steady 70           # milestones for a steady player
node planning/pace-model.mjs casual 70 --trace   # day-by-day state for a casual player
```

## 1. Pace targets

| Measure | Target | Model result (steady player) |
|---|---|---|
| First harvest | Under 2 minutes | 30 s (the tutorial's first wheat) |
| First order filled | About 5 minutes | Minute 2–3 |
| First cottage | First session | Day 1 |
| School (end of v0.1) | Day 3–4 | **Day 4**, at level 6 |
| All build steps (festival stage) | 4–8 weeks | **Day 42** (6 weeks) |
| Something left to buy | Always | Yes until about day 42; v0.2+ content must add sinks after that (section 7) |

**Player profiles in the model:**

| Profile | Visits a day | Minutes a day | School | Clinic | Market | Police | Office | Stage |
|---|---|---|---|---|---|---|---|---|
| Casual | 2 | 16 | day 8 | day 14 | day 24 | day 37 | day 59 | day 73 |
| **Steady** | 3 | 35 | **day 4** | day 10 | day 15 | day 23 | day 34 | **day 42** |
| Keen | 5 | 62 | day 3 | day 6 | day 9 | day 14 | day 21 | day 26 |

Levels for the steady player: 3 at the end of day 1, 6 on day 4, 8 on day 7, 12 on day 14, 17 on day 28, 21 on day 42.
A casual player takes about 10 weeks for everything, which is fine: nothing is lost by playing slowly.

**What the model found and the design now fixes:**
1. **A soft-lock:** hens eat wheat as feed, so the player could feed all their wheat away and have nothing left to
   plant. The fix is that wheat is always free to plant, and other crops can be bought at base price
   (`DESIGN.md` section 5).
2. **Orders stole project goods.** The fix is that goods for a reachable project are held from the order board
   (`DESIGN.md` section 11, "Hold for project"). Without it, the school opened on day 12.
3. **The missing building was not obvious.** Cottage 2 asks for bread, and the player saved coins for the cottage
   instead of buying the bakery that makes bread. The fix is that a project card links each missing good to where it
   is made ("Needs bread → build a bakery"), and that building comes first.

### 1.1 The simulation on the real rules (M1, 2026-10-07)

`npm run sim -- steady 14` plays the same three profiles through the game's own `act()` and `tick()`
(`scripts/sim.mjs`, `scripts/bot.mjs`). `tests/sim.test.mjs` fails the build if the targets break.

| Profile | First cottage | School (paper model) | Cottages 3–4 |
|---|---|---|---|
| Casual | day 2 | **day 7** (8) | day 9 |
| Steady | day 1 | **day 4** (4) | day 6 |
| Keen | day 1 | **day 3** (3) | day 3 |

**What the real rules added to the paper model:**
1. **The barn fills up.** With 30 beds a harvest is 60 crops, more than the 50-space barn. A player has to collect bread
   and eggs first, deliver orders to make room, and upgrade the barn early. The bot does this. In the game, the barn
   button must warn before it is full and suggest the upgrade (M3).
2. **Orders must fit the barn.** At higher levels the size formula asked for 57 wheat at once. Now no good may ask for
   more than a quarter of the barn, and cheap goods drop out of large orders.
3. **An unfinished fence blocks everything.** If coins run out halfway through a fence, no hens can move in, there are
   no eggs and no corn bread, and the school stalls. The coop must say "The fence has a gap" and show where it is (M2/M3).

### 1.2 The AAA pass: hearts, the weekly cart and fruit trees (2026-10-07)

The new content is placed so that it does not move the v0.1 pace:
- **The weekly cart** starts the day after the school opens, so it can never shortcut the school or the cottages after it.
- **Fruit trees** open at level 4 and 6. Apples and apple pie only appear on orders once a tree of that kind is planted,
  so the order generator, and the pace before the school, are unchanged for a player who plants none.
- **Heart scene rewards** default to decorations (a flowerpot, a bench, a fountain), not coins. The story pays coins only
  where the scene itself hands over money (Tomas's finds under the tractor seat, Olaf's sailor's silver): 170 coins in all.
  With 14 coin scenes (about 900 coins) the keen bot reached level 22 10.3% sooner with the cart and trees than without.
- **Order lines** in each poster's own voice use the same two random draws per card as before.

`tests/sim.test.mjs` now pins the hours to each level up to 10 from the v0.1 report (±10 %), and runs every profile with
and without the cart and the trees (every level within ±10 %, the school on the same day). Measured on the real rules:

| Profile | School | Cottages 3–4 | Level 10 (hours from the first visit) | Carts in 2 weeks | Fruit picked |
|---|---|---|---|---|---|
| Casual | day 7 | day 9 | 168 (v0.1: 168) | 4 | 102 |
| Steady | day 4 | day 6 | 96 (v0.1: 96) | 2 | 357 |
| Keen | day 3 | day 3 | 51 (v0.1: 51) | 3 | 807 |

Re-measured after the review fixes (fixer pass): the first cart now really comes the day after the school opens (it
used to arrive in the same action, because the school's first-time stamp was written after the cart check), and build
XP is paid once per new building. Levels up to 10 and the school day are unchanged; the steady player sends two carts
in the fortnight instead of four, and `tests/sim.test.mjs` now asks for two or more.

**What the simulation found:**
1. **The v0.1 bot could sit in a dead end for days.** With the barn full of wheat and no order it could fill, the keen
   player filled no order from day 5 to day 10. A real player would sell at the stall or discard a card, and the bot now
   does so too (after the school only, so the v0.1 targets are measured exactly as before). This is why levels past 14
   now come sooner for the keen player than in the v0.1 report.
2. **A cart of eggs could wait forever.** Eggs are slow, and orders want them too. A cart now holds at most one crate of
   animal produce, and a visiting neighbour fills the crate the player is furthest from filling.

### 1.2 The restored village (v0.3)

A new game opens on the run-down village with 500 coins, 12 wheat and 2 bread. The simulation plays it with `npm run sim -- steady 14 --restore`
(`tests/sim.test.mjs` guards it): repairs replace building, so the first family moves in on day 1 and the school is on day 3 for a steady
player. Repair prices: a broken feed mill or coop 25, a bakery or cottage 90, a road stretch 40; worn things 5–18 coins. Wear costs 5 % of rent
and 1 charm per level and counts only play time (a tick never counts more than 2 minutes).

| Profile | First cottage | School | Cottages 3–4 |
|---|---|---|---|
| Casual | day 1–4 | day 8 | day 9 |
| **Steady** | day 1 | **day 3** | day 4 |
| Keen | day 1 | day 2 | day 2 |

## 2. Items

Value is the base price: what the roadside stall pays and what order rewards are built from.

### 2.1 Crops (plant 1 from the barn, harvest 2; wheat is free to plant)

| Crop | Grows | Value | Level | Version |
|---|---|---|---|---|
| Wheat | 2 min | 2 | 1 | v0.1 |
| Carrot | 5 min | 4 | 2 | v0.1 |
| Corn | 15 min | 7 | 3 | v0.1 |
| Pumpkin | 1 h | 18 | 5 | v0.1 |
| Tomato | 30 min | 10 | 9 | v0.2 |
| Berry | 2 h | 26 | 11 | v0.2 |
| Sugarcane | 45 min | 12 | 12 | v0.2 |

**Harvest XP:** 1 per crop.

### 2.1b Fruit trees (placed once in build mode, picked again and again)

| Tree | Cost | Level | Fruit | Value | First fruit | Then every | Yield |
|---|---|---|---|---|---|---|---|
| Apple tree | 120 | 4 | Apple | 9 | 30 min | 3 h | 3 |
| Peach tree | 240 | 6 | Peach | 15 | 1 h | 5 h | 3 |

A tree counts **+2 charm** like a blossom tree, so it can stand by a cottage. Up to 12 of each. **Pick XP:** 1 per fruit.

### 2.2 Animals

| Animal | Price | Eats | Gives | Every | Value | Level | Max (per building) |
|---|---|---|---|---|---|---|---|
| Hen | 40 (first 2 free) | 1 chicken feed | Egg | 20 min | 12 | 2 | 6 per coop |
| Cow | 150 | 1 cow feed | Milk | 1 h | 30 | 6 | 4 per barn |

**Collect XP:** 2 per item.

### 2.3 Production

| Recipe | Building | Needs | Makes | Time | Value | Level |
|---|---|---|---|---|---|---|
| Chicken feed | Feed mill | 3 wheat | 3 | 5 min | 3 | 2 |
| Cow feed | Feed mill | 2 corn, 1 wheat | 3 | 10 min | 8 | 6 |
| Bread | Bakery | 3 wheat | 1 | 5 min | 12 | 3 |
| Corn bread | Bakery | 2 corn, 2 eggs | 1 | 30 min | 55 | 4 |
| Apple pie | Bakery | 3 apples, 2 wheat, 1 egg | 1 | 40 min | 70 | 5 |
| Carrot cake | Bakery | 3 carrots, 2 eggs, 1 milk | 1 | 45 min | 110 | 7 |

**Production XP:** value ÷ 4, rounded up.

**Margin check:** every recipe pays more than its inputs.
- **Crop recipes:** bread 12 against inputs worth 6; corn bread 55 against 38; apple pie 70 against 43; carrot cake 110
  against 66.
- **Feeds** add a small margin so they never feel like a loss: 9 against 6, and 24 against 16.

## 3. Orders

- **Size:** an order asks for goods worth about **16 + 14 × level** coins, split over 1–3 kinds of goods from what
  the player can make now. No good asks for more than a quarter of the barn's capacity.
- **Reward:** **coins = 1.3 × value of the goods**, and **XP = 0.3 × value**. AI neighbours' orders pay 1.4 × (v0.2).
- **Board slots:** 3 at the start, then +1 at levels 3, 5 and 7, up to 6.
- **Replacement:** a filled card is replaced after 1 minute. A discarded card is replaced after 5 minutes, with no
  penalty.
- **Feasibility:** at least one card can be filled with what the player has or can make within 15 minutes.
- **Mix:** the generator prefers goods the player has made recently, and puts one stretch card (a newer product) on
  the board at a time.
- **Roadside stall** (level 4): it sells at 1.0 × value, one item every 3–5 minutes, up to 4 items listed.
- **Order lines** come from the poster's own `orders` lines when the story gives them. Villagers marked `noOrders`
  (your own family) never post orders.

### 3.1 The weekly cart (`src/core/cart.mjs`)

- **When:** the first cart arrives at the farm gate the day after the school opens. After it is sent, the next one
  arrives the next game day.
- **Crates:** 6, seeded from the save and the cart number. Each holds one good from what the player can make, worth about
  **0.45 × order size** (no more than a quarter of the barn), with at most one crate of eggs or milk.
- **No timer:** the cart waits as long as it takes. Nothing expires and nothing is lost.
- **Reward:** coins = **1.4 × value of all crates**, XP = **0.25 × value**, plus a decoration into storage (hay bale,
  scarecrow, flowerpot, picket fence, street lamp, fountain, in turn).
- **Neighbours help:** a visiting neighbour fills the crate the player is furthest from filling, one a day and at most 2
  per cart, never the last one.

### 3.2 Hearts, gifts, wishes and letters (`src/core/bonds.mjs`)

| Source | Hearts |
|---|---|
| An order filled for that person | +0.25 |
| A gift (one a day per person) | +0.25, or **+1** for something they like |
| Their household's wish granted | +2 (and 5 XP) |

- Hearts run from 0 to 10 and never go down. **Heart scenes** play once at 3, 6 and 9 hearts, with the story's reward or a
  decoration (flowerpot, bench, fountain).
- **Wishes:** one a day for each household that has moved in, for a decoration they can build now. Placing it within 3
  cells of their cottage grants it.
- **Letters** arrive on chapter, level and heart thresholds. A letter can carry a small gift, given when it is first read.
- Heart scenes from orders alone: about 1 a day for a steady player in the first two weeks (16 in the simulation).

## 4. Costs

### 4.1 Land and farm

| Thing | Cost |
|---|---|
| Clearing a weed cell / a rock cell | 2 / 10 coins |
| Beds 1–6 | Free (tutorial) |
| Bed number *n* (7–30) | 10 × 1.15^(n − 6), rounded: bed 7 costs 12, bed 12 costs 23, bed 20 costs 71, bed 30 costs 286 |
| Bed allowance | Up to 6 + 3 × level beds (all 30 at level 8) |
| Path tile / fence segment / gate | 1 / 3 / 10 coins |
| Land parcel (16 × 16 cells) | 2nd parcel 500 (v0.1, level 4). From v0.2: parcels 3–6 cost 2,000 / 4,000 / 7,000 / 11,000; parcels 7–16 rise by about 40 % each, up to about 300,000 |

### 4.2 Buildings

| Building | Cost | Level |
|---|---|---|
| Feed mill + coop (step 3) | 70 | 2 |
| Bakery | 150 | 3 |
| Cow barn | Free with the school (step 6) | 6 |
| 3rd / 4th / 5th / 6th production slot (per building) | 60 / 200 / 600 / 1,500 | – |
| Barn upgrade (+25 storage, from 50) | 100, 200, 400, 800… (doubling) | – |
| Roadside stall | 80 | 4 |

### 4.2b Decorations (charm, DESIGN 12)

| Decoration | Cost | Level | Charm | Size |
|---|---|---|---|---|
| Flower bed | 5 | 1 | +1 | 1 × 1 |
| Flowerpot | 8 | 1 | +1 | 1 × 1 |
| Bush | 8 | 2 | +1 | 1 × 1 |
| Hay bale | 10 | 2 | +1 | 1 × 1 |
| Picket fence | 6 | 2 | +1 | 1 × 1 |
| Scarecrow | 20 | 3 | +1 | 1 × 1 |
| Blossom tree | 25 | 3 | +2 | 1 × 1 |
| Bench | 30 | 3 | +2 | 1 × 1 |
| Lamp | 40 | 4 | +2 | 1 × 1 |
| Fountain | 300 | 5 | +4 | 2 × 2 |
| Street lamp | 90 | 6 | +3 | 1 × 1 |

**Village charm** is the sum of every cottage's charm. At **8, 20 and 40** it puts up bunting, a village banner and a
bigger welcome sign, for good (`CHARM_MILESTONES`).

**The streak garden:** every game day you visit plants one flower in a 12 × 4 garden north of the farmhouse
(x 14–25, z 53–56; the cart stands at x 26–27, z 55–56). The flowers can't be moved, stored or lost; missing a day only means no flower that day.

### 4.3 Build steps (village projects)

| Step | Project | Needs | Coins | Goods |
|---|---|---|---|---|
| 1–2 | Clear land, path, 6 beds | Start | 0 | – |
| 3 | Feed mill and coop | Level 2 | 70 | – |
| 4 | Cottage 1 (the Trans) | Level 3 | 150 | – |
| 5 | Cottage 2 (the Okafors) | Level 4 | 250 | 5 bread |
| 6 | **School** | 2 families with children, level 5 | 700 | 10 bread, 4 corn bread |
| 7 | Cottages 3 and 4 | School | 900 / 1,400 | 10 bread / 6 corn bread |
| 8 | **Clinic** | 4 households, level 8 | 3,000 | 4 carrot cakes, 10 corn bread |
| – | Cottages 5 and 6 | Clinic | 2,000 / 2,800 | 3 / 5 carrot cakes |
| 9 | **Market square** | 6 households, 3,000 coins earned from orders | 6,000 | 8 carrot cakes, 30 bread |
| – | Cottages 7 and 8 | Market | 3,800 / 5,000 | 6 / 8 carrot cakes |
| 10 | **Police post** | 8 households | 9,000 | 10 carrot cakes |
| – | Cottages 9 and 10 | Police | 6,500 / 8,000 | 10 / 12 carrot cakes |
| 11 | **Company office** | 10 households | 15,000 | 15 carrot cakes, 20 corn bread |
| 12 | **Festival stage** | Company office | 20,000 | 20 carrot cakes, 20 milk |

From the clinic on, v0.2 products (cheese, butter, cloth, pie) will replace some of the carrot cakes, so the late steps
ask for variety rather than a pile of one item. Re-run the model when that changes.

## 5. Rent and charm

| Cottage level | Rent per hour | Upgrade cost |
|---|---|---|
| Basic | 3 | Included |
| Cozy | 6 | 400 coins |
| Deluxe | 10 | 1,500 coins (v0.2: plus cloth and furniture) |

- **Charm bonus:** +2 % per charm point, up to +40 % (`DESIGN.md` section 12). The model uses a typical +20 %.
- **Mailbox cap:** 8 hours of rent.
- **Unmet family need:** −25 % until it is met.
- **Rent at day 42** (steady player): 10 cottages, mostly cozy, give about 60–80 coins an hour. That is a fair share
  of income but less than orders, so farming stays the heart of the game.

## 6. Levels

- **Build XP:** 5 per paid or project building, once for each new building of a kind (placing again what was undone
  or stored pays nothing; undo takes the XP back). A finished project step pays 20.
- **Total XP to reach level L:** 10 × (L − 1)^2.6, rounded. Level 2 needs 10, level 3 needs 61, level 5 needs 368,
  level 8 needs 1,575, level 10 needs 3,027, level 20 needs 21,123.
- **Unlocks by level (v0.1):**

| Level | Unlocks |
|---|---|
| 1 | Wheat, beds, paths |
| 2 | Carrot, feed mill, coop, hens, chicken feed |
| 3 | Corn, bakery, bread, cottage 1, 4th order slot |
| 4 | Corn bread, cottage 2, roadside stall, apple tree, lamp |
| 5 | Pumpkin, apple pie, fountain, the school project, 5th order slot |
| 6 | Cow barn, cows, cow feed, peach tree, street lamp |
| 7 | Carrot cake, 6th order slot |
| 8 | Clinic project (v0.2 content follows) |

## 7. Known gaps to close in later versions

- **After the festival stage** (about day 42 for a steady player), the model ends with tens of thousands of unspent
  coins. The sinks that will absorb them:
  - land parcels;
  - charm decorations, which the model does not buy at all;
  - deluxe furniture sets;
  - v0.2 production buildings;
  - festival entries and prizes (v0.3).
  The weekly cart (section 3.1) now pays out rather than absorbing coins; it is a reason to keep producing.
- **Late build steps all ask for carrot cake**, the only high-value v0.1 product. v0.2's dairy, sugar mill and loom
  must spread them out.
- **Neighbour help** (speed-ups from visits) and the daily gift are in the real simulation but not in the paper model.
- **Gifts and wishes** are not used by the bot, so its hearts come from orders alone; heart scene rewards are decorations,
  which the bot does not place, so they do not change its pace.
- **A strawberry crop** (level 4) was planned for this pass but left out: any new level-4 good changes the order
  generator before the school, which moves the pinned v0.1 pace.
- **The model buys like a sensible player** who saves for the next project. A real player will waste some coins on
  decorations, so expect real pace to be a little slower than the model.

## 8. The large farm (v0.2 onwards)

The map allows a farm of 64 × 64 cells with 2,000–3,000 crop cells (`DESIGN.md` section 3.1). v0.1 keeps the 30-bed cap,
so the numbers above stand. Before v0.2, the pace model gets these additions and is tuned again:

- **Land:** buying parcels (section 4.1). The bed allowance becomes a **crop-cell allowance**: 30 + 60 per parcel beyond
  the first, up to about 3,000.
- **Fields and helpers:**
  - a field counts as its cells but costs one action;
  - a helper tends up to 4 fields for a daily wage of about 15 % of what those fields earn.
  The model's player stops being limited by taps and becomes limited by land, the barn and demand.
- **Demand grows with supply:**
  - order size scales with crop cells as well as level;
  - the weekly cart takes 6–9 crates;
  - the market square's three stalls sell continuously;
  - AI neighbours' trades get larger.
  Without this, a big farm floods the barn and coins pile up (the same problem Willowmere had).
- **Barn:** upgrades keep pace with land. Each parcel raises the barn's upgrade limit.
- **Targets for v0.2:**
  - buying all 16 parcels takes a steady player 3–5 months;
  - a full farm earns at most 3× what a 6-parcel farm does, so land stays worth buying without making older goals
    trivial;
  - no profile gets stuck or ends with more than a week of income unspent once everything is bought.

## 9. How to change a number

1. Change it in `planning/pace-model.mjs` and in this document.
2. Run the three profiles. Keep the steady player's school on day 3–4 and the festival stage in weeks 4–8.
3. Once the game exists, the same change goes into the game's content data, and its simulation test (M1) must still
   pass.

## v0.4 orchard

| Item | Opens | Price / timing |
|---|---|---|
| Cherry tree | Level 4 | 70 coins; 3 fruit after 25 s, then every 40 s; fruit base value 7 |
| Fruit stand | Level 4 | 80 coins; 3 stacks of up to 10 fruit; one fruit sold per 30 s at rounded 1.25 × base value |
| Biscuit's kennel | Level 5 | 90 coins; no upkeep, goods consumption or crop losses |
| Clinic | Level 6, school completed, four arrived households | 600 coins plus 12 bread and 9 cherries donated to the project |

The real-rules simulation plants the clinic's cherry tree before reserving its building price. Empty and restored starts both keep school days at casual 5, steady 3 and keen 2. All profiles finish the clinic and acquire the stand and kennel within fourteen days; `tests/sim.test.mjs` checks this alongside the earlier pace targets.
