# From a seed tin to the whole valley: the growth plan and story

This is the long road for Farm Village after v0.3: what the player unlocks, in what order, why each step is fun, and
the story that pulls them along. It extends `STORY.md` (cast, voices, chapters 1–9) and replaces the old v0.2–v1.0 lines
in `ROADMAP.md`. Status of each stage is in the table at the end. Written 2026-10-08 from the user's idea, a look at
other farm games, and the state of the game at v0.3.

**The idea in one line:** you come home to a run-down farm and, step by step, grow from a small farmer into the person
whose farm, company and kindness bring the whole valley back to life: a "farmer billionaire" whose wealth shows as a
thriving, beautiful valley.

---

## 1. The user's idea, evaluated

The proposed order: one more kind of tree → a bigger farm → more money → chickens and other animals → a dog and a cat
(the cat keeps mice away) → more crops → buy nearby land until the river → a village with a playground and a school
(lessons and games), houses you can enter, clothes to change → other towns → near the mountains, a new farm and town →
a big company, earning wisely and keeping the valley beautiful.

**What is right about it**
- **A clear ladder.** The best farm games always show the next thing to want. Hay Day opens the coop at level 3,
  cows at 6, pigs at 10, sheep at 16, the dog house at 20, the cat house at 21, the stable at 27 and the town at 31
  ([Hay Day levels](https://hayday.fandom.com/wiki/Experience_Levels/Levels_1-25)). The user's order (trees, land,
  animals, pets, town, company, new region) is the same shape, and fits our story better.
- **Farm, then town, then city.** Township's success comes from easing the player from crops to production to a town
  that grows, never overwhelming them ([Deconstructor of Fun on Township](https://www.deconstructoroffun.com/blog/2020/10/13/how-playrix-township-became-a-billion-dollar-game)).
  Our farm → village → company → second town is that path.
- **Growing while keeping the valley beautiful.** Coral Island runs two tracks, rebuilding the town and restoring the
  reef, and each restored part improves the world ([Coral Island review](https://www.neonlightsmedia.com/blog/coral-island-review-a-lush-blend-of-farming-and-environmentalism)).
  Stardew Valley makes the same point with the Community Center against JojaMart
  ([Community Center](https://stardewvalleywiki.com/Community_Center)). "Earn wisely and keep it green" is a strong,
  warm theme no big mobile farm game owns.
- **Giving people jobs.** Family Island lets you assign family members to tasks
  ([Family Island](https://walkthroughs.net/family-island-farm-game-adventure-walkthrough/)). Hiring villagers is how a
  growing farm stops being repeated tapping.

**What to adjust**
1. **"Billionaire" as a number can turn cozy into greedy.** Keep the dream, but measure success by the valley: the
   wealth ladder needs both money *and* a thriving village (families, beauty, jobs). The billion arrives at the end as
   the value of the company the player built, a celebration, not a grind target.
2. **Mice must never feel like loss.** A pest that eats your grain is stress. Mice only nibble a crumb now and then
   (never more than a few goods a day, never when the barn is low), and the cat turns it into a small joy: it catches
   them and leaves you a "gift" (a coin or a feather). Same for the dog: it chases crows off the beds (we already have
   crows and scarecrows).
3. **Scope.** Interiors, a wardrobe, school games, a second town and a mountain region are each as big as v0.3. They go
   in order, one per version, and the second region is its own map (a new scene), not a bigger 128 × 128 map: the phone
   budgets (120 draws, 300k triangles) stay safe.
4. **Do not copy.** The ladder and themes are common patterns; the art, names, numbers and story are our own.

### Where v0.3 stands against other farm games

The gaps this plan closes (from the evaluation of 2026-10-07):

| Area | Hay Day, Township and others | Farm Village at v0.3 | Closed in stage |
|---|---|---|---|
| Animal ladder | Hens → cows → pigs → sheep → goats, each with its own feed and product | Hens at the start, cows after the school; goat, goose and sheep models exist but cannot be bought; no horse | 3, 4, 6 |
| Production chains | Many machines (dairy, sugar mill, loom…), each opening new orders | Feed mill and bakery only | 3, 4 |
| Land | Cleared piece by piece with tools you earn | Land can be bought, but nothing says why | 3, 4 |
| Big orders | Truck and boat with large multi-item orders | Order board, market truck, weekly cart | 6 (contracts) |
| Help with chores | Workers and family members take tasks | June and Pip help a little | 6 (hiring) |
| Pets | Dog and cat houses, pets for fun | Biscuit and a sleeping cat, no purpose | 2, 3 |
| Long goals | Town, events, seasons | One story, goals, a weekly goal, the festival | 5–8 |
| Seeing what is next | An unlock list per level | A level-up card only | 2 (roadmap panel) |

---

## 2. The journey: eight stages

Each stage has one clear goal on screen, one new kind of fun, and one story chapter. Levels are targets for the
economy simulation (`npm run sim`), not promises.

Future cast proposals: **Priya** is a grower from a neighbouring farm, and **the twins** are two growers from another
valley holding. Their names, voices and first-meeting scenes must be settled before implementation. Introduce each
through an actual visit before any later co-operative dialogue assumes the player knows them; these are not current
residents or available mechanics.

| Stage | Levels | Goal on screen | What opens | The new fun |
|---|---|---|---|---|
| **1. Homecoming** (done) | 1–4 | "Bring the farm back" | Repairs, wheat, carrot, corn, hens, feed mill, bakery, village pond, market truck, first families | Fixing what is broken; first money |
| **2. The orchard** | 4–6 | "Plant an orchard" | **Cherry tree** (fast, cheap) and a fruit stand; orchard goals; the **dog's kennel** (Biscuit chases crows) | Trees that keep giving; a loyal friend |
| **3. The meadow** | 6–9 | "Buy the east meadow" | First **land deeds** (earned from goals, plus coins); **cows earlier (6)**, **goats (8)** with a **dairy** (cheese, butter); the **cat** (Miso keeps mice out of the barn) | A bigger farm; new chains (milk → cheese) and new orders |
| **4. Down to the river** | 9–13 | "Reach the river" | North parcels to the brook: **irrigation** (beds by water grow faster), a **boat dock**, river fish, **ducks and geese** (feathers → pillows); **sheep (12)** and a **loom** | The map opens up; water changes how you plan |
| **5. A village to be proud of** | 13–18 | "Make Hollowbrook a home" | **Playground** (families with children pay more and stay happy), **school activities** (Pip's homework: count, spell, English–Vietnamese word games), **enter the farmhouse**: rooms to decorate and a **wardrobe** to change clothes (Willowmere's garments) | Making it yours; learning while playing |
| **6. Hollowbrook Farm Co.** | 18–26 | "Reopen the company" | The old **company office**: **hire villagers** (gardener, herder, baker, driver, fisher), **contracts** (big city orders), the **horse and stable** (faster trips, riding) | The farm runs itself; you manage people |
| **7. Over the hills** | 26–35 | "Open the road to Pine Ridge" | A **second region** by the mountains: highland ranch, tea terraces, a small town with its own families; a **train halt** links the two | A new place to build, with what you learned |
| **8. The valley of plenty** | 35+ | "Make the valley thrive" | A **co-operative** with Mai, Gus, Priya and the twins; tourism (guest houses, a valley fair); the **Green Valley award**; the company's value reaches **a billion** | The finale: everything you built, celebrated |

Rules that hold across all stages:
- **One goal on screen.** The status stack and the village name always show the current stage goal and its progress.
- **Each animal opens a chain.** Hens → eggs → cakes; goats → milk → cheese; sheep → wool → cloth; geese → feathers →
  pillows. Each new chain adds new order lines, so orders never stay "always wheat".
- **Pets are friends with one small job.** Biscuit (dog) keeps crows off; Miso (cat) keeps mice out of the barn and
  brings gifts; later a horse carries you and speeds the truck. Pets never cost upkeep.
- **Land always says what it is for.** "East meadow: room for goats and the dairy." "Brookside: water for your beds."
- **Older work gets easier as you climb.** June and Pip help from level 3; hired villagers take whole jobs from stage 6.
  The player's taps go to new things, not old chores.

---

## 3. The story: five acts

The story is the roadmap: every chapter end opens the next stage. The mystery thread from `STORY.md` (the sluice gate,
the burned festival stage) runs through it and ends in Act III. Acts IV–V are new.

### Act I · Homecoming (chapters 1–4, done)
The key under the seed tin, the first harvest, the first family, the school bell. Ellis writes from upriver.

### Act II · The valley wakes (chapters 5–9, from `STORY.md`)
| # | Title | Opens | Story |
|---|---|---|---|
| 5 | Someone to care for us | Stage 2: the orchard | Marisol brings Dr Hazel home and the clinic reopens. Grace the vet sets up in its back room, and suggests a kennel for Biscuit. Ada plants a cherry tree "for the grandchildren's grandchildren". |
| 6 | Market day | Stage 3: the meadow | The square and its shops come back; Hugo the baker arrives. Tomas and Sam learn that the land upriver, with the sluice gate, belongs to a city flour company. Gus sells you the east meadow, grumbling, at a fair price. |
| 7 | Safe streets | Stage 4: the river | Pearl reopens the police post. Her old reports show the sluice was closed the summer before the mill shut. Olaf builds the boat dock. |
| 8 | Work for everyone | Stage 6: the company | The company office reopens; Bea runs it. Its first big contract buys the water rights back. The sluice opens and the mill wheel turns again. |
| 9 | The village sings again | (festival) | The stage is rebuilt. Gus tells the truth about the night of the fire; Ada's letter thanks him. Ellis comes home for good. |

(Stage 5, the village to be proud of, runs alongside chapters 7–8: the playground, the school activities and the
farmhouse rooms open as families settle.)

### Act III · The brook co-operative (chapters 10–12)
| # | Title | Story |
|---|---|---|
| 10 | Hands to help | The first hired villagers: Minh as builder, Lan as baker, Sam (who loves the long way home) as the truck driver. Bea teaches you to read the evening report. |
| 11 | The man from the city | Mr Albright of the flour company offers a fortune to build a big factory on the meadow. You may say yes (fast money, a grey building, the meadow gone) or no (a slower contract, the meadow stays). Both paths finish the story; the green one keeps the beauty bonus and Mai's friendship. |
| 12 | One river, many farms | Mai, Gus, Priya and the twins join a co-operative. Together you open the road over the hills. |

### Act IV · Over the hills (chapters 13–16)
Pine Ridge, a mountain village emptier than Hollowbrook ever was. Its keeper is Nana Tuyết, Ada's old friend from
school. You build a highland ranch (horses, sheep), tea terraces, and a train halt. Ellis guides you on the old fishing
paths; Pip finds the spring the brook comes from.

### Act V · The valley of plenty (chapters 17–20)
Two villages, one valley. The co-operative becomes a company the whole valley owns a share of. A valley fair, the Green
Valley award, and a closing card on the night the company's value reaches a billion: Ada, Ellis, June and Pip on the
porch, the lights of both villages below. Ada: "Your grandfather said the fish would tell him when to come home. I think
the whole valley told you."

**Story rules (in addition to `STORY.md`)**
- Nobody is a villain. Mr Albright is a businessman who learns something; Gus is grumpy, never mean.
- Every new system arrives through a person who needs it: Grace asks for the kennel, Hugo for the dairy, Bea for the
  first hire. The player always knows *why*.
- Money never solves a chapter alone: each chapter end needs a deed for the village (a family settled, a place restored,
  a promise kept).

---

## 4. Smart flow: guiding the player to grow wisely

| System | What the player sees | Why |
|---|---|---|
| **Roadmap panel** | The current stage, its goal, and the next three unlocks with their levels ("Level 8: goats and the dairy") | Always knows what to want next (the Hay Day lesson) |
| **Advisor** | Ada early, Bea from stage 6: one tip at a time, only when it helps ("Bread pays four times its wheat. Bake before you sell.") | Teaches earning wisely without a tutorial wall |
| **Evening report** | Once a day: what you earned, from where, and one suggestion ("Your hens sat hungry for an hour: a herder would keep them fed.") | Turns numbers into a plan |
| **Valley beauty** | A meter from charm, trees, flowers, clean ponds and wildlife; high beauty brings visitors who buy at the stall and tip | Being green *is* earning wisely; nothing is ever taken away |
| **Wealth titles** | Farmer → Market gardener → Rancher → Entrepreneur → Tycoon → Valley patron. Each needs coins *and* village progress (families, beauty, jobs) | The billionaire dream, kept kind |
| **Helpers → staff → company** | June and Pip help (now); hired villagers take whole jobs (stage 6); the company runs contracts (stage 6–8) | The bigger you grow, the less you repeat |
| **Land deeds** | Land costs deeds from goals plus coins, and each parcel says what it is for | Land is a reward for playing, not just a price |

---

## 5. Economy guardrails

- **Nothing is lost while away**, and wear, mice and crows stay tiny. Bad luck never takes more than a few goods a day.
- **Quick early, deeper later.** Early timers stay under a minute; each new stage adds a few longer, richer things
  (5–30 minutes) that reward coming back.
- **Net worth, not hoarded coins.** The billion is the company's value (buildings, contracts, land, valley beauty), shown
  with short numbers (1.2 K, 3.4 M, 1 B). Coins in hand stay in the thousands to millions.
- **Every price change runs through the simulation** (`scripts/sim.mjs`): casual, steady and keen players must each
  finish a stage in a believable number of days, and nobody gets stuck.

---

## 6. Build order

| Version | Stage | Main work | Size |
|---|---|---|---|
| **v0.4** | 2 + roadmap | Roadmap panel, cherry tree and fruit stand, Biscuit's kennel (crows), chapter 5 and the clinic | 2–3 weeks |
| **v0.5** | 3 | Land deeds, the east meadow, cows earlier, goats and the dairy, Miso the cat and gentle mice, chapter 6 and market day | 3 weeks |
| **v0.6** | 4 | North parcels to the river, irrigation, boat dock, ducks and geese, sheep and the loom, chapter 7 | 3 weeks |
| **v0.7** | 5 | Playground, Pip's homework games (counting, English–Vietnamese words), farmhouse rooms and wardrobe (Willowmere garments) | 3–4 weeks |
| **v0.8** | 6 | Company office, hiring and jobs, contracts, horse and stable, evening report, chapters 8–10 | 4 weeks |
| **v0.9** | Act III end | Mr Albright's choice, valley beauty, the co-operative, chapters 11–12 | 2–3 weeks |
| **v1.0** | 7 | Pine Ridge region (new map), train halt, highland ranch, chapters 13–16 | 5–6 weeks |
| **v1.1** | 8 | Valley fair, Green Valley award, wealth titles, the finale (chapters 17–20) | 3 weeks |

Each version: rules first with tests, then art (our own Blender pieces, or reused from our earlier games with the source
noted in `ASSETS.md`), then Vietnamese, then the browser suites, then deploy.

---

## 7. Open questions for the user

1. **Mr Albright's choice:** keep a real choice with two paths, or only the green path?
2. **Second region:** a new map you travel to by train, or a bigger single map (slower on phones)?
3. **Learning games in school:** English–Vietnamese words and simple maths, or other subjects?
4. **First of the new stages:** start v0.4 as written (orchard, kennel, roadmap), or jump to hiring and the company,
   which was your earlier idea?

## Status

Release status, 2026-10-08: the orchard logic is live through PR #1 and Claude's AR-001 look/feedback pass through PR #2. PR #3 closes AR-001 after production checks; current main is `a1607de`. The [consolidated plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md) and [Codex task list](CODEX-TASKS.md) distinguish that completed first pass from later expansion.

Follow-up review on `codex/dialogue-review`: `b03c38c` fixes in-transit visitor taps, refreshes observations at speech time, and corrects saved heart/charm news counts. Further changes remove obsolete hen translations and clarify Pia's role. English and Vietnamese share adaptive rules; the [character naming plan](CHARACTER-NAMING-PLAN.md) proposes a complete cast, including replacing Pip, while retaining stable save/art IDs. Proposed human names and future chapters are not implemented by this review.

The current playable slice implements three local farm profiles and four one-time discoveries, with the unchanged 500-coin opening plus at most 110 discovery coins per save. Today/Album cards retain earned memories and read state. See [Profiles and discoveries](PROFILES-AND-DISCOVERIES.md) for behavior and migration. This work is **on the review branch, not yet live**. Validation: 211 rules tests, all pace targets, all component browser suites after fixture corrections, and 28/28 smoke checks pass. Steady school and clinic day 3; test build 986,313 bytes, production 985,234 bytes. Phone/PC rendering budgets pass. Persistent contextual advice cards, covered land, skills/project energy, and meadow progression remain future work. [AR-009](CLAUDE-DISCOVERY-HANDOFF.md) is the next art brief; do not repeat completed AR-001.

| Stage | Status |
|---|---|
| 1. Homecoming | done (v0.3) |
| 2. The orchard | done: live 2026-10-08 (v0.4 logic in PR #1, AR-001 look pass in PR #2) |
| 3. The meadow | not started |
| 4. Down to the river | not started |
| 5. A village to be proud of | not started |
| 6. Hollowbrook Farm Co. | not started |
| 7. Over the hills | not started |
| 8. The valley of plenty | not started |
