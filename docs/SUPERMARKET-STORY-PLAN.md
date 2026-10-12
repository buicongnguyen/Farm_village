# The village supermarket: implemented first slice

Status: implemented on `codex/village-supermarket`, 2026-10-12, following the user's approval after PR #108. Release checks are recorded in the pull request. This optional branch adds no chapter gate and does not alter chapters 1–20.

## What the player does

From level 12, Today and Village shops show the idea. Construction opens at level 14, with a working market square, school, and at least two **different** working food workshops (bakery, juice press, noodle factory, dairy or cannery). The 4 × 3-cell shop costs **4,200 coins**, stands in the village with a road-connected doorway, and has a limit of one. A broken shop points back to its repair location. Existing chapter progress remains valid.

Open the shop from its building, Today or Village shops. Go inside to visit checkout, produce and the tasting table, all of which open the same saved shop board. The exterior comes from the user's Willowmere game; interiors and dialogue load after the first frame. There is no extra permanent HUD button.

1. Read Granny Maple's plan (`ada`, Vietnamese Bà Mận).
2. Restore a chosen shelf for **120 coins**: garden, bakery or pond. Each can be restored once; a real renewable source is required.
3. Preview a basket of **8 units** across one or two goods. Garden and bakery selections follow actual working sources and ingredient chains; pond baskets use the permanent public pond's common fish.
4. Accept the basket to reserve its goods. See exactly what is available and what other requests need. Missing-good links open source help and retain a return route to this basket.
5. Deliver explicitly for **125% of base value**, rounded up once for the basket. Neither entering nor waiting sells anything. The next basket becomes available after **30 minutes**.
6. Supply each shelf at your own pace, then look behind the shelf for a thank-you card.

Cancellation is free and releases the basket's reservation immediately, including after the shop is demolished or broken. It advances the basket number and applies the same 30-minute wait, so repeated cancelling does not reroll instantly. Offers never expire. All ordinary activities cost zero project energy.

## Story and lasting changes

| Beat | Effort | Response and saved change |
|---|---|---|
| A shelf for our neighbours | Read the shop plan | Maple proposes a small place for local food. The introduction is saved. |
| Make it our own | Restore a section | Chip's guidance moves from preparing shelves to choosing a basket. Each section shows its own state. |
| Our first basket | Deliver one basket | Sunny's opening memory enters the album; a photograph appears on the counter. |
| A little variety | Deliver from a second distinct section | Honey celebrates variety; a sample tray appears on the tasting table. |
| Room for everyone | Deliver from all three sections, then inspect behind the shelf | Sunny finds a signed thank-you card. Its framed keepsake appears in the room. |

Stable memory IDs: `opening`, `variety`, `thankyou`. Today shows unread memories using its existing badge. The shop entry is also available from Family album. Reading acknowledges a memory, and rereading never pays coins or XP. The photographed keepsakes refresh while the room is open.

Dialogue follows shared game facts in English, Vietnamese, Korean and Japanese. Stable cast IDs keep the existing localized names and voices. A cake suggestion appears only for an actual carrot-cake basket, an unlocked recipe, and at least eight available loaves; surplus bread alone cannot trigger it. Missing goods, ready delivery, waiting, exploration and completion each have their own line. There is no guilt about absence.

The prepared shelves contain decorative sample goods; they are not a second inventory. This slice adds saved counter/photo, tasting-tray and framed-card changes. Per-product stocking art and changing shop signs remain future art work.

## Stock, payment and saves

- `supermarket` is an optional normalized version-1 record: introduction/opening timestamps; restored/supplied section timestamps; offer serial and saved request; completion count; next-basket timestamp; earned/read memories.
- The saved request contains its ID, section, quantities, offered time, acceptance flag and exact payment. Reloading, changing language or revisiting preserves it. No tick handler generates shop income.
- Accepted quantities are reserved centrally through `barn.free`/`barn.take`. Sales, cooking, trucks, drivers and workshop hands leave them alone. Project deliveries and planting also respect the reservation; planting may buy a seed instead.
- The shop's delivery calculation leaves the current project, open order cards and active company request in stock. Its own reservation is counted once. Source help uses the same context rather than incorrectly reporting that its own held basket is unavailable.
- Validation precedes spending, delivery and rewards. Malformed requests are discarded on normalization. Stale IDs, duplicate delivery, unsupported sections, unsafe payment amounts and invalid clocks refuse without mutation. Backward clocks bound the remaining wait to 30 minutes.
- Once its plan is introduced, the shop cannot be undone for a full construction refund. Ordinary movement, repair and demolition rules still apply. Removing it neither resets memories nor grants another opening reward.
- Project energy is untouched. The shop has no new XP awards, automatic profits, expiry penalty or mandatory chapter requirement.

## Assets and interaction contract

Source: the user's `3d_farmer_fish_sell` (Willowmere), revision `9ca557bed3ebc6c36906e2eb84582aef23f4375b`. No source repository or Claude worktree was changed.

- Exterior: separately packed `supermarket.glb`, node `supermarket`, scaled to 7.8 m maximum horizontal width inside an 8 × 6 m lot. Front faces +z. Generator: `art/blender/civic/build_supermarket.py`.
- Interior: `interior-supermarket.json`, from `civic-plans.mjs` and `scripts/build-civic-interiors.mjs`; existing packed cottage/facility furniture.
- Inside bounds: 19.6 × 16.8 m. Arrival `[0, 0, 6.4]`, exit stand `[0, 0, 7.6]`, doorway `[0, 0, 8.4]`.
- Interactions: `supermarket_checkout`, `supermarket_fresh`, `supermarket_sample`, `interior_exit`.
- The shop icon temporarily copies the market artwork at full/small sizes. A dedicated icon is requested in `ASSET-REQUESTS.md`; the exterior is the actual supermarket model.

## Additional production rooms in this slice

The reference has no dedicated dairy or feed-mill interior. These are new arrangements of its existing furniture, using the bakery shell, workbenches, grain sacks, scales, chillers, pails, plants and a rest corner. `production-interiors.mjs` owns the layouts; the same measured-room generator validates collision and walking routes.

| Building | IDs | Actual service |
|---|---|---|
| Feed mill | `mill_make`, `mill_grain`, `mill_tools` | Its own production queue, barn stock, garden-repair board |
| Dairy | `dairy_make`, `dairy_pantry`, `dairy_notes` | Its own production queue, barn stock, a short observation |

Entry uses the real building doorway and condition, with the established recovery exit. No new production timer, duplicate inventory or reward is attached to entering these rooms. Hospital, police, company, school, storage barn, bakery and farmhouse interiors remain from PR #108. Cow/goat homes, juice/noodle factories, the source timber workshop, hotels and other future workplaces need their own scoped layouts and activities.

## Verification and balance

The supermarket is an optional outlet, never an infinite multiplier on all sales. Its eight-unit basket cap and 30-minute wait preserve ordinary barn, market, kiosk, company and hotel routes. Prices can be tuned after longer player trials; early school pace remains covered by the existing casual/steady/keen simulation checks.

Rules cover the full three-section arc, all rewards, source eligibility, malformed imports, clock rollback, exact payments, reservation interactions, helpers/drivers, seeds, undo and migration. Room tests cover every route and doorway rotation. Browser checks cover actual checkout, source-card return, basket controls, memories, save/reload, feed/dairy production and exit, in English desktop and Vietnamese 390 px layouts, with zoom budgets. The full release suite and production verification are required before marking the branch live.
