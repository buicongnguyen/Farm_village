# Farm Village — game design (v0.1 to v1.0)

The detailed design behind `GAME-CONCEPT.md`. It covers what the player sees and does, the rules, and the content of the
first versions. The numbers are in `ECONOMY.md`, the code plan in `TECH-PLAN.md` and the order of work in `ROADMAP.md`.

**Working decisions** (from GAME-CONCEPT section 7, taken as proposed; change them here if you decide otherwise):

| Decision | Working answer |
|---|---|
| Energy bar | **None.** Timers, orders and storage set the pace. |
| Platform | **Phone first**, with full PC support (mouse and keys). Portrait and landscape. |
| Code start | **Fresh repository** that copies Willowmere's reusable parts (see `TECH-PLAN.md` section 3). |
| Name | **"Farm Village"** is the working name. The village inside the game is called **Hollowbrook** (placeholder, easy to rename). |
| Languages | English and Vietnamese from the first version. |
| Money | No real-money store and no premium currency. Pacing is generous and honest. |

---

## 1. Setting and story

**Premise.** Your grandparents Ada and Ellis kept a farm beside a quiet brook. The village around it has emptied over
the years: the school closed, the shop moved away and the houses fell empty. You arrive with your partner June and your
child Pip to take over the farm. Ada asks one thing: *"Bring the village back to life."*

**The arc** (each chapter is a short three-panel story card and a small celebration when it ends):

| Chapter | Title | Story beat | Ends when |
|---|---|---|---|
| 1 | A key and a seed tin | You arrive. Ada shows you the overgrown farm. | First harvest delivered to Ada |
| 2 | Something takes root | The farm starts working: hens, feed and the first loaves. | Feed mill and coop built |
| 3 | A light in the window | The first family, the Trans, rents the cottage by the brook. | First family moves in |
| 4 | A bell for the children | Two families with children ask for the school to reopen. | School opens (v0.1 ends here) |
| 5 | Someone to care for us | Four households: Hazel the nurse wants to reopen the clinic. | Clinic opens |
| 6 | Market day | Six households: the market square and its shops come back. | Market square opens |
| 7 | Safe streets | Eight households: Pearl reopens the police post. | Police post opens |
| 8 | Work for everyone | Ten households: the old company office brings bigger orders. | Company office opens |
| 9 | The village sings again | The festival stage. Hollowbrook is alive. | Festival stage built (v1.0 story end) |

The story never blocks free play. Between chapters the player farms, decorates and fills orders as they like.

## 2. The player's day: what a session looks like

A typical 10–15 minute visit:
1. **Open the game.** On the first visit of a real day the **Today board** greets you: a daily gift, what finished while
   you were away, the next project and a line from a villager.
2. **Collect.** Sweep-harvest the ready beds, collect eggs and milk, take bread from the bakery and rent from the mailbox.
3. **Fill orders.** Pick the orders you can complete from the board and deliver them.
4. **Start the next round.** Replant, queue production and feed the animals. Choose long crops if you are about to leave.
5. **Build or plan.** Place a new bed, a fence, flowers or a bench. Put coins toward the next project or a cottage upgrade.
6. **Meet people.** Talk to a villager walking past, accept an AI neighbour's trade, read a letter.

Everything keeps growing and producing while the game is closed. **Nothing spoils, dies or leaves.**

## 3. The world

### 3.1 Layout
- **The homestead** (the player's land) starts as a **12 × 12 cell** area (1 cell = 2 × 2 m, so 24 × 24 m) beside the
  farmhouse, partly overgrown. More land is bought in **parcels of 6 × 12 cells** (up to 4 extra parcels by v1.0).
- **The village** lies along the brook road: plots for cottages and civic buildings. In v0.1 the village area is also a
  cell grid (24 × 16 cells) where cottages and the school are placed. Empty civic buildings stand as boarded-up ruins
  until their project is built.
- **Around the edges:** the brook (later fishing), woods, and the roads to four AI neighbours' farms, seen at the map
  edge with their signposts.

### 3.2 Camera and controls
Phone first: you plan and tap. You do not have to walk to every bed.

| Action | Phone | PC |
|---|---|---|
| Move the camera | Drag with one finger | Drag with the mouse, or WASD/arrow keys |
| Zoom | Pinch | Mouse wheel |
| Turn the view | ⟳ button (90° steps) | Q / E |
| Act on something | Tap it: a small radial menu offers the actions | Click |
| Harvest, plant, feed in bulk | **Sweep:** after tapping a ready bed, drag the tool icon across the other beds | Same with the mouse held down |
| Build mode | 🔨 button | B |
| Order board, Today, Barn, Album | HUD buttons | O, T, I, J |

The avatar (you) walks to where you act and plays the action animation. That is for life and charm only; the action
itself happens straight away, so sweeping 20 beds never makes you wait.

### 3.3 Time
- **Real time.** Crops and production run on real minutes and keep running while the game is closed.
- **Day and night** follow the player's real local clock, with an "Always daytime" option in Settings.
- **The daily reset** is at 4:00 local time: Today board, daily gift, daily neighbour visits and the daily wishes.
- **Seasons** (v0.3) follow the real calendar month.

## 4. The land grid and building

### 4.1 Cells
Each cell holds one state: `grass`, `weeds`, `rock`, `path`, `tilled` or `water`. A placed item covers a cell or a group
of cells (its footprint).

| Thing | Footprint | Notes |
|---|---|---|
| Crop bed | 1 × 1 (tilled cell) | Plant one crop in it |
| Fruit tree (v0.2) | 1 × 1 | Harvest every few hours |
| Flower, bush | 1 × 1 | Charm |
| Bench, lamp, sign | 1 × 1 | Charm |
| Path tile | 1 × 1 | Connects doors to the road |
| Fence segment, gate | A cell **edge** | Animals need a closed fence with a gate |
| Coop | 2 × 2 | Up to 6 hens |
| Cow barn | 3 × 2 | Up to 4 cows |
| Feed mill | 2 × 2 | Production |
| Bakery | 3 × 2 | Production |
| Dairy (v0.2) | 3 × 2 | Production |
| Roadside stall | 2 × 1 | Sells spare goods to passers-by |
| Rental cottage | 3 × 3 | A family's home; the door side faces a path |
| School | 5 × 4 | Village project |
| Clinic | 4 × 3 | Village project |
| Market square | 6 × 5 | Village project, holds 3 shop stalls |
| Police post | 3 × 3 | Village project |
| Company office | 4 × 4 | Village project |
| Festival stage | 6 × 4 | Village project |

### 4.2 Placement
Build mode (🔨) opens the catalogue: **Farm**, **Animals**, **Production**, **Homes**, **Charm**, **Projects**.
1. Choose an item. A ghost model follows the finger or cursor, snapped to the grid.
2. The ghost is **green** when the spot is allowed and **red** when it is not. A one-line reason shows under it:
   "Needs a path to the door", "Overlaps the coop", "Outside your land".
3. **⟳** rotates (90° steps), **✔** places, **✕** cancels.
4. **Move:** in build mode, tap a placed item, then drag it. Moving is always free and keeps its contents (growing crops,
   animals, a running production queue).
5. **Store:** 📦 puts an item in the storage shed. It comes back later, free.

### 4.3 Rules (checked on every placement)
1. Inside land you own.
2. No overlap with another footprint, the farmhouse, water or rocks.
3. **Every building's door cell touches a path, and the path network connects to the road.** Paths are checked with a
   flood fill from the road. An unreachable building cannot be placed.
4. Crops only on tilled cells. Tilling a grass cell costs coins (the bed price in `ECONOMY.md`).
5. Animals only inside a closed fence that has at least one gate. The coop or barn must stand inside or on that fence.
6. Weeds and rocks must be cleared first (tap and pay a small fee). This is the first-session tutorial and a gentle coin
   sink for new land.

### 4.4 Undo and safety
- **Undo:** the last 10 build actions can be undone while still in build mode.
- **Refunds:** nothing is ever destroyed. A cottage cannot be stored while a family lives in it, but it can be moved
  (the family moves with it).

## 5. Farming

- **Planting:** tap an empty bed and choose a crop. Planting uses **one of that crop from the barn**; harvesting gives
  **two** (Hay Day's rule: no seed shop, you keep one to replant). Ada gives starting stock.
- **Never stuck:** **wheat is always free to plant.** Hens eat wheat as feed, and the pace model showed a player could
  feed all their wheat away and have nothing left to plant. If you run out of another crop, the plant menu offers one
  at its base price. Production and orders warn before they use the last of a crop ("This uses your last corn").
- **Growth:** visible in four model stages (sprout, young, growing, ready). Ready crops bob gently and show a sparkle.
- **No watering and no wilting.** In Willowmere, watering was the main chore. Here, crops simply take their time.
- **Speed-up:** none to buy. Neighbour visits (section 9) and later the greenhouse speed things up.

Crops by version (numbers in `ECONOMY.md`):
- **v0.1:** wheat, carrot, corn, pumpkin.
- **v0.2:** tomato, berry, sugarcane.
- **v0.3:** radish, sunflower, coffee, plus seasonal crops.

## 6. Animals

| Animal | Building | Eats | Gives | Version |
|---|---|---|---|---|
| Hen | Coop (6) | Chicken feed | Egg | v0.1 |
| Cow | Cow barn (4) | Cow feed | Milk | v0.1 |
| Sheep | Sheep shed (4) | Sheep feed | Wool | v0.2 |
| Pig | Pigsty (4) | Pig feed | Truffle | v0.3 |
| Bees | Beehive (no feed) | Flowers within 3 cells | Honey | v0.3 |

- Tap a hungry animal (or sweep over them) to feed it. After its time it shows its produce, and a tap collects it.
- Animals wander inside their fence (Willowmere's `pen-roam.mjs`). A bigger fenced area makes them visibly happier
  (more hopping, hearts) and adds charm. It never changes output, so a small pen is not a "mistake".

## 7. Production

Each production building has a **queue** (2 slots at the start, up to 6 with upgrades). Choose a recipe, the inputs leave
the barn, and the product appears when done. Collect it with a tap.

| Building | Recipes in v0.1 | Added later |
|---|---|---|
| **Feed mill** | Chicken feed, cow feed | Sheep feed, pig feed (v0.2–0.3) |
| **Bakery** | Bread, corn bread, carrot cake | Pumpkin pie (v0.2) |
| **Dairy** (v0.2) | – | Cream, butter, cheese |
| **Sugar mill** (v0.2) | – | Sugar (feeds the bakery's cakes) |
| **Loom** (v0.3) | – | Cloth, scarf (from wool) |
| **Café** (v0.4) | – | Dishes that villagers order and rate |

## 8. Selling: the order board

The order board stands by the farmhouse gate. It is the main way to earn coins.

**Order cards.** Each card shows who asks (portrait), a one-line story ("Mrs Tran wants to bake for her kids' first day"),
1–3 kinds of goods with amounts, and the reward in coins, XP and hearts with that person.

**Slots.** 3 cards at the start, 6 by v0.1's end (one more at levels 3, 5 and 7).

**Rules:**
- Deliver when you have everything: the goods leave the barn and the reward is paid with a small celebration.
- **Discard** a card you don't like: a new one arrives after **5 minutes**. There is no penalty.
- A filled card is replaced after **1 minute**.
- At least one card on the board can always be filled from what the player has or can make within 15 minutes (the
  generator checks this; see `ECONOMY.md` section 5).
- **Story orders** from the chapter (for example "10 bread for the school's opening day") are pinned with a ribbon and
  never time out.

**The roadside stall** (v0.1, from level 4) sells spare goods slowly: put up to 4 items on it at base price, and passing
villagers buy one every few minutes. It is a release valve for a full barn, not a better deal than orders.

**The weekly cart** (v0.2) is a large order of 6–9 crates due by the end of the week, for a big reward and a decoration.
Neighbours can help fill crates.

## 9. People

### 9.1 Your family
- **You:** pick a body and look at the start (Willowmere's hero bodies and looks).
- **June** (partner): tends the house. She gives a tip when you are stuck and runs the café later.
- **Pip** (child): follows you around, waves at animals and asks questions. From v0.3, "help Pip with homework" is one
  short, optional quiz a day that earns hearts and an album page and shapes Pip's interests. It never earns coins.
- **Ada and Ellis** (grandparents): Ada is the guide of the first chapters. Ellis teaches fishing (v0.2).

### 9.2 Villagers (they live in your village)
- Each family that rents a cottage brings 2–4 named people with a role, a line, likes and dislikes.
- **Civic villagers** come back when their building opens: Cora the teacher (school), Hazel the nurse (clinic),
  Hugo the baker (market), Pearl the officer (police), Bea the office manager (company).
- Villagers walk set daily routes between home, work and the square (Willowmere's `villagers.mjs` timetables).
- **Hearts (0–10)** rise when you fill their orders, give gifts they like, and grant their wishes.
  - At 3, 6 and 9 hearts a short heart scene plays (three lines and a picture), with a reward: a recipe, a decoration
    or a cottage furniture set.
- **Wishes:** once a day one villager wishes for something small and visible, such as a bench by the brook or flowers by
  their door. Granting it gives a big heart boost, and the change stays in the village.
- **Letters:** villagers post short letters in your mailbox to say thanks, share a recipe or tell a story.

**v0.1 cast** (first two families plus the teacher):
- **The Tran family:** Minh (carpenter), Lan (cook) and their son Bo (7). Cottage 1.
- **The Okafor family:** Grace (vet), Sam (postman) and their daughter Zara (8). Cottage 2.
- **Cora:** the teacher. She arrives with the school.

### 9.3 AI neighbours (instead of online players)
Four neighbouring farms with their own families, personalities and specialities. They are scripted, run in the browser
and are never rude.

| Neighbour | Personality | Speciality | Version |
|---|---|---|---|
| **Mai** (Lotus Farm) | Cheerful, early riser | Eggs, flowers | v0.1 |
| **Gus** (Old Mill Farm) | Grumpy-sweet, jokes | Wheat, bread | v0.1 |
| **Priya** (Hilltop Orchard) | Calm, wise | Fruit, honey | v0.2 |
| **The Nguyen twins** (Brookside) | Competitive, playful | Fish, racing | v0.3 |

**What they do:**
- **Visit:** 1–2 visits a day. A neighbour walks around your village and comments on what they see ("Your flowers by
  the bakery are lovely!", written from the real layout). They **help**: each visit speeds up 3 crops or 1 production
  slot by 30 minutes.
- **Post orders:** some order cards come from them, at slightly better pay.
- **Trade:** once a day, an offer to swap goods ("I'll give 4 eggs for 6 wheat"). Accept or decline, with no
  consequence either way.
- **Ask for help:** occasionally a neighbour asks for goods for their own project. Helping earns friendship and a gift
  later.
- **Festival rivals** (v0.3): they enter contests, win some, lose some, and always congratulate you.

They follow simple schedules with seeded random choices per day, so they feel alive but behave the same in tests.

## 10. Rental cottages and families

1. **Build** a cottage (Homes catalogue) in the village area, with its door on a path.
2. **Furnish:** basic (included), cozy or deluxe. Each level costs coins and goods (planks come later; in v0.1 coins and
   bread) and raises rent.
3. **A family moves in** the next time you open the game, with a short arrival scene. In the build order, specific
   families arrive at specific steps (section 11).
4. **Rent** accrues every hour into the mailbox, up to **8 hours** of rent. When the mailbox is full it simply stops
   adding; nothing is lost.
5. **Charm** around the cottage raises rent (section 12).
6. **Needs:** a family can ask for something (a path to the school, flowers nearby, the clinic). An unmet need lowers
   rent by a quarter until it is met. **Families never leave.** A sad face and a kind explanation are enough.

## 11. The build order: village projects

The 🏛 **Projects** tab lists the projects. Only the next project can be started, and its requirements are shown with
ticks. When a project opens:
- the ruin on the map lights up with a ghost outline;
- the player can place the building anywhere it fits in the village area;
- the player pays coins and delivers the goods;
- a short build animation and the chapter celebration follow.

| Step | Project | Needs | Unlocks |
|---|---|---|---|
| 1 | Clear the land, lay a path | Start | Tilling, build mode |
| 2 | Farm plot: 6 beds | Step 1 | Planting |
| 3 | Feed mill and coop | Level 2 | Hens, eggs, the bakery |
| 4 | First rental cottage | Level 3 | The Tran family, rent |
| 5 | Second rental cottage | Level 4 | The Okafor family, the roadside stall |
| 6 | **School** | 2 families with children, level 5 | Cora, the cow barn (cows from level 6) |
| 7 | Cottages 3–4 | School open | More families |
| 8 | **Clinic** | 4 households, level 8 | Hazel, the dairy |
| 9 | **Market square** | 6 households, 3,000 coins earned from orders in total | Hugo, three shop stalls, the weekly cart |
| 10 | **Police post** | 8 households | Pearl, street lamps, charm bonus |
| 11 | **Company office** | 10 households | Bea, big contracts (high-value orders) |
| 12 | **Festival stage** | Company office | Festivals (v0.3) |

**v0.1 ends after step 6 (the school).**

**Show the way.** The project card lists each missing good with a link to where it is made ("Needs bread → build a
bakery"), and opens the catalogue on that building if it is not built yet.

**Hold for project.** Once the next project's requirements are met, its goods are **held**: the barn marks them and the
order board will not use them (a card that would shows "Held for the school"). The player can release the hold with a
tap. Without this rule, the pace model's player kept delivering the school's corn bread to orders and opened the school
days late.

Existing ruins mean the player always knows what is coming. The ghost outline and the ticked list make the next goal
obvious, and the player still chooses *where* to build.

## 12. Charm

Charm makes layout matter (Township lacks this) without ever forcing a "correct" layout.
- Each cottage has a **charm score** from the cells within 3 cells of its footprint:
  - flower +1, bush +1, fruit tree +2, bench +2, lamp +2, fountain +4;
  - path in front of the door +2, brook within range +3;
  - animal pen or production building within range −1 each, down to a minimum of 0.
- **Rent bonus:** +2 % per charm point, up to +40 % at 20 points.
- **Village charm** is the total of all cottages. It is shown on the Today board and opens cosmetic rewards
  (a bigger welcome sign, bunting, a village banner) at milestones.
- In build mode, a **charm overlay** tints cells by how much charm a decoration placed there would add.

## 13. Progression

- **XP and level.** XP comes from harvesting (small), producing, filling orders (most) and building. Levels unlock crops,
  buildings, recipes and order slots. v0.1 runs from level 1 to about level 8.
- **Coins** are the only currency. Sinks: tilling beds, clearing land, buildings, animals, cottage upgrades,
  decorations, land parcels, barn upgrades and project costs.
- **The barn** holds all goods. It starts at **50** and is upgraded with coins (+25 each time). A full barn says so
  kindly and points to the order board and the stall.
- **The album** records chapters, first times (first egg, first family) and heart scenes. It becomes the family photo
  album in v0.3.

## 14. The Today board

Shown on the first visit of each real day, and any time from the HUD:
- **Daily gift:** a rotating 7-day set (coins, crops, a decoration, feed, a cottage furniture piece). Missing a day just
  pauses the rotation; there is no streak to lose.
- **While you were away:** "8 crops ready, 6 eggs, 1 bread batch, rent 96 coins".
- **Next project:** its requirements with ticks.
- **Village news:** a family moved in, a neighbour visited, someone's wish.
- **One villager line** of the day.

## 15. First session, minute by minute (the tutorial)

| Time | What happens | Teaches |
|---|---|---|
| 0:00 | Three story panels: the car on the brook road, the overgrown farm, Ada at the gate. Skip button. | Premise |
| 0:20 | Ada: "Let's clear a patch." Three weed cells glow. The player taps them. | Tapping, clearing |
| 0:40 | Ada: "A path to the gate." A ghost path appears and the player places 3 path tiles. | Build mode, paths |
| 1:10 | Six beds: the player places them on glowing tilled cells (free). | Placing, tilling |
| 1:30 | Plant wheat: tap a bed, then sweep across the others. The first wheat takes **30 seconds** (tutorial only). | Planting, sweeping |
| 2:00 | Harvest with a sweep. The barn opens to show 12 wheat. | Harvest, barn |
| 2:20 | First order from Ada: 6 wheat. Deliver it and earn coins plus XP. Level 2. | Order board |
| 3:00 | Replant with carrots (5 min). Build the feed mill (step 3). | Production building |
| 4:00 | Make chicken feed (5 min). Meanwhile, Gus the neighbour visits and helps 3 beds. | Neighbours |
| 6:00 | Build the coop and fence. Two hens arrive (gift from Mai). Feed them. | Fences, animals |
| 8:00 | Carrots ready. Two orders on the board; fill one. Level 3. | Order choice |
| 10:00 | Step 4 opens: the first cottage. Place it near the brook with a path. The Tran family's arrival is promised for the next visit (or in 2 minutes if the player stays). | Cottages, the build order |
| 12:00 | Free play. The Today board explains what will be ready when they come back. Chapter 1 celebration. | Coming back |

**First-session rules:**
- Only the HUD buttons the step needs are visible; the rest fade in as the story unlocks them.
- Every step can be skipped with "I know how".

## 16. Interface

- **HUD:**
  - **Top left:** level with an XP ring, then coins.
  - **Top right:** Today 📅, Album 📖, Settings ⚙.
  - **Bottom:** build 🔨, orders 📋 (with a badge for fillable orders), barn 🏚, projects 🏛.
- **Look:** Willowmere's and Zoo Garden's style: toon shading, glossy round buttons, warm vivid colours, compact cards.
- **Radial menu:** tapping a bed, animal or building opens 2–4 round action buttons around it (harvest, plant, feed,
  queue, move).
- **Feedback:** every collect sends the item icon flying to the barn button with a soft sound and a counter bump.
  Orders, level-ups and chapters each get a small celebration (confetti, villager cheer).
- **Accessibility:**
  - text size option;
  - colour-blind safe markers (shapes, not only colour, for ready and needs states);
  - reduced motion option;
  - every action reachable with one thumb in portrait.

## 17. Saves, settings and test mode

- **Saves:** automatic after each action (debounced) in browser storage, with three save profiles (from Willowmere's
  `profiles.mjs`). Export and import a save as a file. The save carries a version number, and older saves migrate.
- **Settings:** language (English/Vietnamese), sound and music volume, always daytime, text size, reduced motion,
  graphics quality (auto/low/high).
- **Test mode** (Settings → enter the test key): unlock everything, +10,000 coins, finish all timers now, skip to the
  next build step, add a family, set the clock forward by hours. It is left out of public builds by a build flag
  (Willowmere's key check in the browser was not safe).

## 18. What is deliberately not in the game

- Combat, enemies and the Pandora adventure (possible separate game from the same kit).
- An energy bar, crop wilting, spoiling, tenants leaving, or any loss for being away.
- Online multiplayer, chat, accounts or servers.
- Real-money purchases, premium currency, ads with rewards, timers that ask for payment.
- Job shifts for the player.
