# Farm Village v0.3 — "Restore Hollowbrook"

The plan agreed with the user on 2026-10-07 after playing v0.1, and its history. Update the **Status** and **Log** sections
as work goes on.

## 1. Why

Playing v0.1 showed that a new player starts in an empty green field and must build everything before the fun starts.
Hay Day avoids this: the farm is already there. Our story also suggests the fix: Ada's farm and the village are run
down, so the game should be about **restoring what is already there**, not starting from nothing.

## 2. Decisions (agreed with the user)

| # | Decision |
|---|---|
| D1 | **Things are already there at the start**: farmhouse, fields, roads, farm buildings, rental cottages and a market. Many are worn or broken and need fixing first. |
| D2 | Anything can be **repaired, moved, demolished or rebuilt** (rebuilding a demolished thing is cheap). |
| D3 | **Very gentle decay**: buildings and roads wear only while the player plays, never stop working, cost only a little charm or rent when worn, and repair with one tap. Nothing gets worse while the player is away. |
| D4 | The **farmhouse** is a one-storey home at level 1, upgradeable and maintainable. |
| D5 | **Roads** are laid out from the start, copying the reference game's (Willowmere's) county road layout. Some stretches are damaged and need repair. |
| D6 | **Production buildings** (feed mill, bakery) are there but damaged; you repair them instead of building them. |
| D7 | **Rental cottages** are there but need repair before a family can move in. |
| D8 | A **market** and **transport**: goods go to market by a delivery truck on the road; the market square sells goods. |
| D9 | **Starting money** so the player can get going fast, plus a free daily "hurry" that finishes one timer (no store, no paid speed-ups). |
| D10 | **The household starts with three people**: the player, June and Pip. The children help with small chores (for example collecting eggs or watering while you are away). |
| D11 | **Neighbours sometimes fix something** for you on their visit, as a surprise bonus that takes stress away. |
| D12 | **Neater phone UI**: no long sideways swiping; more choices visible at once. |

## 3. Work packages

### P1 — The starting world (D1, D4–D7)
- A starting layout as data (`src/content/start.mjs`): the farmhouse, six tilled beds (wheat growing), the coop with a
  fence that has a gap, the feed mill and bakery (broken), two or three run-down cottages, the market square (closed),
  the full road network with the bridge, and paths to every door.
- The road network follows Willowmere's county layout: a ring road, lanes to each plot, a village street with a square.
- New games are created with this layout; old saves get the missing pieces placed around what the player built (save migration).
- The opening camera frames the farmhouse and the fields.

### P2 — Condition, repair, demolish, rebuild (D2, D3, D6, D7, D11)
- Every building, cottage and road stretch has a condition: **new → worn → shabby**, and some start **broken**.
- **Broken** things do not work until repaired (only at the start: feed mill, bakery, cottages, cracked roads, the coop fence).
  Repair costs coins (sometimes a few goods) and a short wait, then a celebration.
- **Wear** grows slowly with play time only (never while away), never breaks anything, and lowers charm and rent a little.
  One tap repairs it for a small cost.
- **Demolish** gives back part of the cost and leaves a plot marker that can be rebuilt cheaply.
- Neighbour visits sometimes repair one worn thing for free (with a thank-you line).
- The worn and broken look: tinted, cracked and boarded variants, plus scaffolding while a repair is under way.

### P3 — Market and transport (D8)
- The **market square** is restored as an early project. Its stalls sell spare goods (the roadside stall becomes part of it).
- A **delivery truck** carries order goods along the road to the market and comes back with the coins. The trip takes a
  minute or two, and the truck can be upgraded for more crates.
- Orders from the order board go by truck; the weekly cart stays the big order.

### P4 — Household and helpers (D10)
- You, June and Pip live in the farmhouse from the start.
- **Chores:** Pip collects ready eggs, June waters or replants a few beds. Children help a little while you are away.
  This is gentle: a few items, never the whole farm.
- They appear in the world (already drawn by the cast package) and speak on events.
- **Varied people from the reference game** (the user's request): Willowmere's hero bodies (man and woman at tiny, teen, tall
  and grown sizes, `hero-*.glb`), its 13 outfits (`wm-garments.glb`) and 4 kids' outfits (`wm-kids.glb`), moved with its
  part-based walk cycle (`walk-cycle.mjs`), so each family member has their own shape and clothes instead of sharing three
  bodies. Provenance goes in `docs/ASSETS.md`.
- **More item art from the reference game**: its crop icons (28), fish icons (20) and item icons (172) for the extra crops and
  the fishing planned for v0.2.

### P5 — Money, pace and the first session (D9)
- Starting money (about 500 coins) and starter goods; first-week daily gifts are larger.
- A free daily **hurry** that finishes one timer.
- A new, shorter tutorial about restoring: harvest the wheat, mend the coop fence, repair the bakery, fill Ada's order,
  repair the first cottage.
- Re-tune the economy simulation and its pace targets (`docs/ECONOMY.md`, `scripts/sim.mjs`, `tests/sim.test.mjs`).

### P6 — Phone UI (D12)
- Build catalogue as a grid (2–3 rows) with icon tabs instead of a long sideways strip.
- Compact order cards, so 5–6 fit on a phone screen.
- Repair and demolish in the tap menu; a "more" button gathers the rarely used HUD buttons.
- Landscape: panels on the side.

### P7 — Tests, docs and release
- Rules tests for condition, repair, wear (never while away), demolish/rebuild, truck trips, market sales, chores, hurry and
  migration of v0.1/v0.2 saves.
- Browser checks for the new first session on phone and PC; phone budgets (≤120 draws, ≤300k triangles) still met.
- CHANGELOG 0.3.0, PROGRESS.md, ROADMAP.md; deploy.

## 4. Order of work

P1 and P2 first (they change the rules and the save), then P3 and P4, then P5 (pace depends on all of them), then P6,
then P7. Each package is committed when its tests pass.

## 5. Status

| Package | Status |
|---|---|
| P1 Starting world | **done** (restored village as data, ring road, damaged roads, worn farmhouse; old saves keep what they built and do not get the new pieces) |
| P2 Condition and repair | **done** (repair, gentle wear, demolish and rebuild credit, farmhouse upgrade, neighbours mend things; broken things look run down, scaffolding while a repair runs) |
| P3 Market and transport | not started (the delivery truck and market square) |
| P4 Household and helpers | not started (chores for June and Pip; varied people from the reference game) |
| P5 Money, pace, first session | **done** (500 coins and starter goods, the restore first session with Ada, pace tests on the restored start). Still to do: the free daily "hurry" |
| P6 Phone UI | not started (grid catalogue, compact panels) |
| P7 Tests, docs, release | rules and browser tests written alongside each package; CHANGELOG 0.3.0 at the end |

## 6. Log

| Date | What happened | Commit |
|---|---|---|
| 2026-10-07 | The user played v0.1 and asked for a pre-built, restore-style start, gentle decay, a market with transport, starting money, a neater phone UI, a household of three with helping children, and neighbours who sometimes fix things. Plan written. | (this commit) |
| 2026-10-07 | The user asked to reuse the reference game's people shapes and item art: added to P4 (varied people) and the icon list. P1/P2 rules started (start layout data, road ring, repair/wear numbers). | 3206747 |
| 2026-10-07 | P1, P2 and most of P5 built: the restored village, repair/wear/demolish/farmhouse, the restore first session (Ada harvest → order → repair mill and coop → fence → hens → feed → repair a cottage), pace on the restored start (school day 8 / 3 / 2 for casual / steady / keen). 109 unit tests, 6 new browser checks, all suites green. | (this commit) |
| 2026-10-07 | Before this plan: the AAA pass (v0.2: art, world, juice, cast, story, play and ui packages) was merged and deployed. | a57b43d |
