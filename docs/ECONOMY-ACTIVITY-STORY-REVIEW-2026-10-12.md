# Hollowbrook: economy, activities and story review

Date: 2026-10-12. Reviewed code: `70fea6e92088a26f5a684b2dc8fcc14bd9066087` (main through PR #110).

This is an assessment and proposed improvement order. It does not change the economy, existing farms, chapter requirements or published game.

## Verdict and limits

Hollowbrook has a substantial playable foundation and a coherent, warm story. It is not yet at the depth, balance and consistency expected of a polished major commercial life-simulation game. The largest gap is the quality of repeated decisions and their consequences, rather than the number of buildings or chapters.

AAA is a production category, not an objective measure of fun. Animal Crossing is a useful large-production cozy benchmark; Stardew Valley is an indie depth benchmark; Hay Day is a commercial mobile production-loop benchmark. These are different products and none should be copied wholesale. Hollowbrook's browser performance budget and solo, family-friendly direction remain valuable constraints.

Evidence in this review: current rule/content files; all 20 chapter cards and their triggers; existing progression bot; three restored-start, 14-day simulations with seed 4242; isolated reproductions through real `act()` handlers; calculations from current content; official reference-game documentation. This is not a fresh human playtest, a complete 25–40-hour playthrough, a graphics certification or retention measurement. The previous sync passed 711 unit tests and a production build; those checks establish correctness within their coverage, not enjoyment.

## 1. Economy: findings

### E1. The published economy is still at testing pace — high priority

`src/content/economy.mjs:13` defaults `PACE.mode` to `testing`; the browser has no Node environment override. The production build does not select release pace. `docs/plan/90-release-pass.md` explicitly leaves release balance and a complete progression simulation unfinished.

Current timing includes 20-second wheat, 30-second bread, 45-second hen collections, 50-second truck trips, market days every 10 minutes and festivals every 20 minutes. This supports quick feedback but can make an active farm demand repeated collection rather than interesting planning.

Changing every timer to three times as long will not fix relative profitability, exponential output, missing activity roles or excessive menu repetition. Decide the intended rhythm first: a satisfying short visit plus optional longer exploration. Include both frequent players and people checking once or twice daily.

### E2. Upgrades multiply throughput and efficiency together — high priority

In `src/core/output.mjs`, upgrades give 2x, 4x, 8x and 16x output at farm levels 3, 6, 10 and 14. Ingredients and batch duration remain unchanged. Workshops also grow from 2 to 10 independent trays; all eight extra trays cost a combined 1,320 coins (`SLOTS`).

A fully upgraded ten-tray workshop has 80 times the output per unit time of its original two-tray version, provided ingredients, collections and storage keep up. It needs five times as many recipe inputs, not 80 times. That is a large productivity jump. Feed also lasts ten animal collections, and the feed mill itself can multiply its output.

These were deliberate development choices, not automatically code defects. Before changing them, model several alternatives and preserve purchased upgrades in old saves. Potential directions: separate capacity, convenience and efficiency upgrades; make later upgrades offer new quality or mastery choices; balance input requirements and sale outlets together. Avoid compensating only by making all future buildings vastly more expensive.

### E3. Some early products outperform later ones — high priority

The following figures use current testing times. Animal/tree figures are ideal continuous **gross base-value output**, not realized player income: no sale bonus, animal purchase, feed cost, travel, collection delay or downstream recipe value. Workshop figures subtract the base sale value of consumed ingredients, but exclude their growing time, fixed investment and sale logistics.

| Comparison | Current calculated result | Interpretation |
|---|---:|---|
| Full base coop: 8 hens | 128 coins of eggs/minute | Over five times a full base cow barn's direct output value |
| Full base cow barn: 4 cows | 24 coins of milk/minute | Milk has recipe uses, but needs a clearer economic role |
| Full base goat barn: 4 goats | 22.67 coins of goat milk/minute | Cheese adds a reason to keep goats; direct income is weak |
| Full 16x coop | 2,048 coins of eggs/minute | Strong inflation risk if collection and sales are automated |
| Apple tree | 32.4 coins/minute, tree costs 120 | Excellent for frequent collection |
| Peach / orange tree | 9 coins/minute, costs 240 / 300 | Slower attention cadence, but much lower throughput |
| Coconut palm | 5.2 coins/minute, costs 500 | Needs useful demand or another distinct advantage |
| Base apple pie | 29.45 added-value coins per tray-minute | Stronger active bakery use than carrot cake |
| Base carrot cake | 8.8 added-value coins per tray-minute | Longer unattended batch, but weaker throughput |
| Base noodles / instant noodles | 40 / 15.5 added-value coins per tray-minute | Further processing is not automatically the best use of the machine |

A slower item can still be worthwhile: less attention, a particular order, a gift, an achievement or a different ingredient constraint. The concern is whether players can understand that role and find enough occasions to use it. Do not equalize everything blindly. Give each chain a reason to exist and measure return per visit and per action as well as per minute.

### E4. The late-game value target can reward repeating the same deed — high priority

`src/core/valley.mjs:63–83` values the valley as assets times goodwill. At testing pace goodwill is `1.2 ** deeds`; the count includes market days, co-operative orders, trains, festivals, fairs and each five hotel guests. The final billion is a valuation, not spendable coins.

Holding assets constant at 100,000, 38 deeds exceed 100 million and 51 exceed a billion. With 500,000 in assets, the corresponding counts are 30 and 42. Other chapter and beauty gates still apply. These are formula demonstrations, not predicted completion times.

Repeated activity counts can therefore move the final number very quickly without equivalent new development. Hotel guest counts also contribute; actual passive-income share has not been measured across the whole campaign.

Recommendation: reward a mixture of restored places, varied contributions, sustainable production and personal milestones. Keep a readable financial number if desired, but give the ending visible community conditions rather than making repetition of the easiest deed the strongest strategy. Compare against the existing release proposal of passive income below 40%; treat that figure as a proposed target, not a measured current result.

### E5. Confirmed defect: output upgrades disappear from valley accounting

`assetsOf()` counts coins, stock, buildings, parcels, selected works, animals and beauty, but not purchased output upgrades. An isolated restored-farm fixture with 50,000 coins and a working coop was upgraded through `act('upgradeOutput')`:

- Valid upgrade price: 460 coins.
- Assets before: 51,628.
- Assets after: 51,168.
- The farm becomes more productive but loses exactly 460 in displayed assets. At unchanged goodwill its valuation and dividend base also fall.

This contradicts the function's stated intention that investing in upgrades preserves value. Add recognized upgrade investments consistently, check refunds/demolition so value cannot be counted twice, and cover old saves. Inspect house, barn and truck investments at the same time; only the output case was reproduced here.

### E6. Confirmed defect: advice/source help ignores upgraded batch yield

`src/core/advice.mjs:32` sums queued output using the recipe's base `makes`. `src/core/good-help.mjs:38–42` does the same for ready/queued quantities.

Reproduction through a real production action: an upgraded bakery has one bread tray cooking and an order needs eight loaves. Advice selects `order-make`; source help reports one loaf queued and status `make`. Collecting that same tray actually gives 16 loaves. The correct guidance is to wait for or collect the existing batch.

This directly weakens the promised smart business guidance. Use the same effective yield calculation as production collection, including differing building upgrades, reservations and full-barn behavior. Add regression coverage for a partially fulfilled request and upgraded trays in multiple buildings.

### E7. Sale outlets need distinct purposes

The regular truck pays 1.2x base value; ordinary orders start at 1.3x, before applicable beauty bonuses; the supermarket pays 1.25x and limits baskets to eight goods with a 30-minute interval. These routes are not equivalent because capacity, goods, story and availability differ.

The shop currently works well as a small optional memory/story route. Its premium alone is not a strong reason to prefer it to normal orders. A distinct role could be themed local customers, product discovery, shelf personalization or a lasting recipe/contact reward. Keep easy bulk selling for surplus; do not force every sale through a minigame.

## 2. What the simulation actually validates

Restored start, seed 4242, real `act()`/`tick()` rules, 14 calendar days:

| Profile | Scheduled minutes/day | School day | Clinic day | Day-14 level | Day-14 coins |
|---|---:|---:|---:|---:|---:|
| Casual | 16 | 4 | 5 | 10 | 68,331 |
| Steady | 35 | 3 | 3 | 13 | 162,891 |
| Keen | 62 | 2 | 2 | 15 | 314,920 |

These satisfy the existing school targets. The bot follows the early build order and orchard; it does not act through all 20 chapter cards, spend on the full later economy or buy output upgrades. Its chapter counter remains zero because it does not acknowledge chapter cards. Day-14 cash is therefore **not** proof of whole-game inflation: the bot omits many later expenses.

Extend simulation before claiming release balance. Required routes: farm/production specialist, fishing/exploration player, mixed casual family player and automation/business player; both chapter-11 choices; several seeds; short and long visits; old saves with bought upgrades. Track chapter times, active actions, idle waiting, net income by source, storage stalls, maximum affordable upgrades and the gap between different viable strategies. Use a full human playthrough to validate what the bot cannot measure.

## 3. Activities: variety exists, but depth is uneven

Implemented strengths include planting and production chains, animal care, fishing with bite timing and line tension, relationships and gifts, a counting game, a repair lesson, staged discoveries, decoration, workforce choices, a competition fair, home activities, hotel breakfasts and supermarket memories. Ordinary play does not require project energy. Failed fishing attempts preserve the fish/bait opportunity. These support the intended gentle tone.

The nine civic/production interiors define 27 interaction points: 17 open an existing service panel and 10 show a fixed observation. This count excludes farmhouse activities and school/fishing gameplay behind those links. Entering a room is useful and atmospheric, but currently usually provides another route to the same menu. The supermarket's three objects all open its shop board.

The farmhouse already has more than scenery: sitting, a memory shelf, tea, drawing, daily planning and a wardrobe. The next improvement should build on those systems, not discard them.

Recommended small activities with persistent consequences:

| Place | Proposed activity | Persistent result |
|---|---|---|
| Bakery | Choose a festival recipe suited to an actual request; optional short preparation activity | A recipe variant, displayed dish or baker's personal memory |
| Police post | Match one found object to contextual clues from its owner | A returned keepsake and changed conversation |
| Clinic | Prepare a neighbour's comfort basket from explicitly requested goods | A thankful visit or garden decoration; no illness punishment |
| School | Help with a local exhibition using a discovery, drawing or crop | A visible class display and family scene |
| Supermarket | Pick a garden, picnic or fishing theme and satisfy a few associated customers | Shelf dressing and a named customer who remembers the visit |
| Home | Arrange a small set of earned objects, then invite a neighbour for tea | A photographed corner and contextual conversation |

Make these optional, accessible, short and easy to resume. Keep ordinary production buttons for players who prefer business management. Adult depth should come from planning and personal choices; the counting activity can remain a separate family/child option.

## 4. Story: a good emotional arc with a weaker middle-to-end play structure

All 20 chapter cards are implemented in `src/content/story.mjs`. The outline is clear:

1. Chapters 1–5: return home, harvest, bring families back, school and clinic.
2. Chapters 6–9: revive the market, investigate the old reports, restore water and hold the festival.
3. Chapters 10–12: share work, choose cannery or meadow, create the co-operative.
4. Chapters 13–16: revive the far bank, hotel and train, then take the family walk to the spring.
5. Chapters 17–20: shared ownership, fair, green award and the lights of the restored valley.

The strongest details are specific and human: the first window lit; soup from a neighbour; the delayed thank-you letter after the fire; a familiar sound from the mill; the small spring under the fern; counting lights from the porch. Keep these. The chapter-11 branch has both mechanical and later text consequences, and the ending allows continued play.

The main weaknesses are:

- **Too much important action is reported afterward.** Many gates are build/collect/count conditions. Seeing chapter 8 opens the sluice (`core/today.mjs:74`); the player does not personally carry the investigation through a final valve-opening activity. A few playable scenes would give the actions more weight.
- **Most chapter progression is linear.** Chapter 11 is the main major branch. That is not inherently bad, but smaller remembered choices would let players express whether their Hollowbrook is about food, nature, learning or neighbours.
- **The strongest mystery resolves around chapters 8–9.** Subsequent chapters introduce useful systems, but need a fresh personal question to connect them. For example: which neighbours will come back, what do they hope to bring, and what kind of home are we making for them?
- **The return home in chapter 9 and explanation at the spring in chapter 16 are consistent, but the emotional gap is long.** Add an invitation or kept promise at the return so the later walk feels awaited rather than delayed exposition.
- **The final value threshold risks overshadowing the people.** Let the finale acknowledge places restored, relationships nurtured, a chosen project and a final shared act. Financial success can support that scene.
- **NPC depth is uneven.** The code contains 51 personal heart scenes across 17 characters. Several newer civic characters have chapter dialogue but no comparable personal heart arc. Extend a few important newcomers before adding another large cast.
- **Discoveries are strongest at the opening.** The four introductory coin finds pay a total of 110 once per save: catch 2, catch 10, rock 2 and street repair. Further picnic, land, garden, school, upriver and shop memories do exist. The missing part is a continuing, clearly paced supply of optional discoveries through the middle game, not the whole discovery system.

Keep the approved 500-coin start, small earned luck, hopeful tone and project-only energy. For later finds, vary rewards: a recipe clue, a keepsake, a shortcut, a decoration or a new conversation. Essential progression must remain available without lucky drops. Do not turn rewards into arbitrary jackpots or pressure to log in daily.

Suggested story improvement: choose one three-scene community request per act. Each should have a hint in the world, a useful player action, a choice, an NPC response and a visible keepsake. Reuse current rooms and cast. For example, preparing the revived school's first exhibition could link fishing finds, the classroom, a bakery contribution and a family evening without creating another currency or map.

## 5. Comparison with polished reference games

These observations are based on official feature descriptions; the implications for Hollowbrook are design judgments, not proof of what every player enjoys.

| Reference | Verified design pattern | Lesson for Hollowbrook |
|---|---|---|
| [Hay Day: production buildings](https://support.supercell.com/hay-day/en/articles/production-building.html) | Level-based production buildings, expanding slots and mastery rewards for using machines | Give production a long learning curve and distinguish convenience from profitability |
| [Hay Day: Town Basics](https://ingame.help.supercellsupport.com/hay-day/en/articles/town-basics-2.html) | Visitors need appropriate services, farm goods and time; service rewards include separate town reputation | Connect places through a person's request instead of offering many interchangeable sell buttons |
| [Animal Crossing: island activities](https://animalcrossing.nintendo.com/new-horizons/explore/) | Collections, seasonal/time-dependent creatures, decoration, flowers and conversations | A collection or attractive personal corner can reward play without adding coins |
| [Nintendo: Happy Home Paradise](https://www.youtube.com/watch?v=iyyC4C0ywCM) | Characters request furniture; the rest of the vacation-home design is left to the player | Turn an interior into a place the player authors, with clear but flexible requests |
| [Stardew Valley: official features](https://www.stardewvalley.net/about/) | Multiple skill tracks, fishing collections, personal relationship scenes, restoration choices and customization | Make different kinds of play develop their own capabilities while contributing to shared goals |

Hollowbrook already has elements of all three. What it lacks is the same amount of tested depth and integration between them. More imported rooms, expensive lighting or a larger download will not by themselves close that gap. It can become a strong cozy browser game without matching a large console game's content budget.

## 6. Recommended implementation order

### First: reliable decisions and measurable balance

1. Fix upgraded-output accounting in advice/source help and the valuation omission. Add targeted regressions; review reservation handling with those changes.
2. Extend the simulator through all 20 chapters and both branch choices. Preserve existing opening targets until a replacement pacing plan is explicitly agreed.
3. Model output/slot growth, animal and fruit roles, net sale routes and passive income. Tune them as a connected economy with save-compatible handling of purchased upgrades. Do not silently switch live farms to a slower pace.
4. Audit guidance: show the useful result, missing resource and actual next action. Separate a profitable task, a relaxing option and a story goal without filling the screen with badges.

### Second: deepen one connected experience

5. Implement one short community story across existing rooms, with different valid contributions for a farmer, fisher or decorator. Make its ending visible in the village.
6. Give two or three important NPCs personal follow-up scenes, and add a handful of midgame discoveries tied to effort and location.
7. Add one meaningful room customization activity. Reuse earned objects before expanding the asset catalogue.

### Third: validate the intended experience

8. Follow the existing release plan's two rounds of five new-player sessions. Include adults and family play, phone and desktop. Ask players what they were trying to do, where they were confused and whether they want to return.
9. Record voluntary activity choices, repeated clicks, abandoned goals and how long players wait without an appealing alternative. Do not interpret technical test success as retention evidence.
10. Finish sound, performance on an actual mid-range phone, save compatibility and native-language review. Then set release pace and repeat the whole-story playthrough.

Proposed success criteria: all three play preferences can afford their next useful improvement; a player can explain the current story goal; waiting on one task leaves another appealing activity; new upgrades preserve correct guidance; key story moments are enacted and remembered; there is a comfortable stopping point after a short session. Timing and income thresholds should be measured and agreed, not invented as promises.

## 7. Reproduction notes

The early simulation used `simulate(profile, 14, { restore: true, seed: 4242 })` from `scripts/sim.mjs` for casual, steady and keen. Its schedule is exported as `PROFILES`.

Calculated values:

- Animal home gross/minute = animals per home × product base value × output multiplier / collection minutes.
- Tree gross/minute = fruit per collection × base value / regrowth minutes.
- Recipe added value/tray-minute = (base yield × output multiplier × product value − sum of input quantities × input base values) / batch minutes.
- Deeds to valuation = ceiling(log(target / assumed assets) / log(1.2)), holding assets fixed.

Both defect reproductions used isolated in-memory fixtures; no user's save was read or changed. The advice fixture had a working bakery, two slots, output upgrade 4, thirty wheat, no project reservation and an eight-bread order. One accepted `produce` action resulted in misleading `order-make`/source `make`; `collectProducts` at completion yielded sixteen bread. The valuation fixture upgraded a working restored coop at level 14 and compared `assetsOf()` before and after.

All recommendations remain unimplemented by this review. No code or deployment was changed.
