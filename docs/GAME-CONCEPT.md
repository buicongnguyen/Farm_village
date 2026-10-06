# Farm Village — the game concept (October 2026)

This is the one page to read first. It states what the game is, based on the research, and which activities from
Willowmere stay, change or go.

The detailed plan:
- `DESIGN.md`: the full game design.
- `ECONOMY.md`: numbers and pace, checked by `planning/pace-model.mjs`.
- `TECH-PLAN.md`: code, reuse from Willowmere, testing and shipping.
- `ROADMAP.md`: milestones M0–M6 to v0.1, then v0.2–v1.0.

The background:

- `MARKET-RESEARCH.md`: the evidence and the scored directions.
- `IDEAS.md`: the wider list of ideas.
- `GAME-DIRECTION.md`: written to improve Willowmere; its land grid and build order carry over unchanged.

## 1. The game in one line

**Plan your land, grow a village, lead your family.** Farm Village is a cozy, single-player 3D farm-and-town game that
plays instantly in the browser on phones and PCs. Friendly AI neighbours take the place of online players.

## 2. Why this game: what the research says

| Finding | What it means for us |
|---|---|
| The biggest farm and life games are played alone; online play is an optional extra (Stardew, Animal Crossing, Township offline, Hay Day neighbourhood optional) | Single-player, no servers |
| The proven money loop is Hay Day and Township's: crops → production → orders → new buildings (A, score 88) | The order board and production chains are the core from day one, not a later fix |
| Township grows the town through community buildings that raise the population, but its layout does not matter (B, 85) | Our signature: land you plan cell by cell, a required build order (school first) and layout that matters through charm and paths |
| Story and people keep players for hundreds of hours (C, 83); cozy players come to relax at their own pace | Named villagers with tastes and heart scenes; no punishment, no pay pressure |
| A clear first quarter hour keeps players (D, 82) | One goal at a time; every system unlocks in order |
| Online play brings harassment (76 % of adult players, ADL 2023) and costs money | Scripted AI neighbours (E, 80): they visit, post orders, trade and compete at festivals, and are never rude |
| More action and combat scores low (I, 63) and splits the identity | No combat in this game |

**Lessons from Willowmere:**
- **Too much at once confused players:** a cozy sim and an action RPG shared one screen.
- **Goals ran out too soon:** the simulation found every goal passed by day 5, with crops ready in 32 seconds.
- **Two things already work and should carry over:** the look and the walk-in buildings with stories.

## 3. The core loop

```
 plant & raise ──► make goods ──► fill orders ──► coins + village points
      ▲                                                  │
      │                                                  ▼
 more land, people ◄── new families move in ◄── build the next project
 and new orders          (rent, workers)          (school, clinic, shops…)
```

Every activity in the game must feed this loop in at least one of three ways:
1. **Goods:** it produces something an order needs.
2. **Village:** it grows the village (land, buildings, people).
3. **People:** it deepens a relationship.

An activity that does none of these is cut or postponed. That rule answers the fishing and studying question below.

## 4. Activities: keep, change or cut

| Activity (as in Willowmere) | Decision | How it works in Farm Village | When |
|---|---|---|---|
| **Farming** (crops, flowers, fruit trees) | **Keep, core** | On grid cells you plan. Growth takes minutes to hours, not seconds. | First version |
| **Animals** (coop, pen, produce) | **Keep, core** | Animals need a fenced area with a gate. Their eggs, milk and wool feed production. | First version |
| **Cooking and crafting** | **Change** | Become production buildings: mill, bakery, dairy, jam kitchen, loom. Each chain makes goods for orders. | First version (2 buildings), more later |
| **Selling everything at the supermarket** | **Change** | The **order board** replaces it: villagers and AI neighbours ask for mixes of goods with a short story line. A roadside stall sells what is left. | First version |
| **Fishing** | **Keep, as a calm side activity tied into the loop** | Opens after the pond project. One simple, relaxing catch. Fish go to orders (fish soup, the café) and the field guide; the fishing derby is the first festival. | Second version |
| **Studying** (school quizzes for coins) | **Change: family, not income** | The school is a village project that families need before they move in. At home, "help Pip with homework" is one short, optional quiz a day that grows Pip's interests (later Pip's career). It earns hearts and an album page, not coins, so it never becomes a grind. | Third version, with the family features |
| **Job shifts** (police, company, clinic) | **Cut as player work** | You lead the village, so you don't clock in. These buildings are projects in the build order; once built, they hire villagers and give the village a service (the clinic keeps families happy, police raise charm, the office unlocks bigger orders). | Through the build order |
| **Hiring villagers** | **Keep, changed** | You staff your production buildings and shops with villagers, who make goods while you farm. | Second version |
| **House decorating and wardrobe** | **Keep, as rewards** | Earned from projects, festivals and friendships. Charm items (flowers, benches, lamps) also raise rent. | First version (basic), more later |
| **Rental cottages** | **New, core** | Build, furnish, and a family moves in and pays rent. Families are what the school and clinic are for. | First version (1–2 cottages) |
| **Energy bar** | **Cut (proposed)** | Timers and orders already set the pace; an energy bar on top makes a cozy game feel like a chore. | Decision needed |
| **Pandora adventure** (combat, bosses) | **Cut from this game** | It splits the identity and scored lowest. It can become its own game made from the same kit. | Not planned |
| **Vehicles** | **Postpone** | A bike once the village is big enough to need one. | Later |
| **Raffle and surprises** | **Change** | Become the daily gift on the **Today board** and occasional surprise visitors. | First version (Today board) |

**In short:**
- **Farming, animals, production and orders** are the game.
- **Fishing** stays as the relaxing side activity that feeds orders and festivals.
- **Studying** becomes a small family moment with Pip instead of a way to earn coins.
- **Job shifts and combat** go.

## 5. Pace targets

The pace is designed from the start. A paper model (`planning/pace-model.mjs`) already meets these targets with the
numbers in `ECONOMY.md`, and an economy simulation on the real rules will check them on every change.

| Measure | Target |
|---|---|
| A play session | 10–20 minutes, with a reason to come back later that day |
| Crop growth | 2 minutes (first crop) up to a few hours (late crops); production 5 minutes to 2 hours |
| First session | First harvest in under 2 minutes; first order filled in about 5 minutes; first cottage built in about 15 minutes |
| School | Built on day 3–4 of real play (steady player: 3 short visits a day) |
| Full first village (all 10 build steps) | 4–8 weeks of daily play |
| Coins | Always something worth saving for; a keen player must not finish all goals in a week |

## 6. The first playable version (v0.1)

**In:**
- One homestead on a grid: tilled cells, paths, fences, gates.
- Four crops, chickens and cows, and two production buildings (mill and bakery).
- The order board, with six villagers and two AI neighbours posting orders.
- Build steps 1–6: clear the land, farm plot, feed mill and coop, two rental cottages, then the **school**.
- The Today board with a daily gift.
- Saves, English and Vietnamese, phone and PC controls.
- Test mode with "unlock everything".

**Out (later versions):** fishing, festivals, homework with Pip, pets, the café, visits by link, more chains, build
steps 6–10.

**Done means:** a new player understands what to do without help, the simulation meets the pace targets, and three to
five first-time players want to come back the next day.

## 7. Working decisions

The open questions are answered as proposed, so planning can go on. Each can still be changed; see the table at the top
of `DESIGN.md`.

1. **Energy bar:** none.
2. **Platform:** phone first, with full PC support.
3. **Code start:** a fresh repository that copies Willowmere's reusable parts (`TECH-PLAN.md` section 3).
4. **Name:** "Farm Village" as the working name; the village in the story is Hollowbrook (placeholder).

Still open, to decide at M0: the hosting set-up, either a public repository or a private source with a public play
repository.
