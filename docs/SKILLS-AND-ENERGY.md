# Hollowbrook — learning useful skills and energy for larger projects

Date: 2026-10-08 (Asia/Seoul)

Status: design notes only. The user confirmed that **energy applies to larger exploration and repair projects; everyday play stays available**. Skill branches, lesson formats, recovery rules, and numerical tuning below remain recommendations. No code or live balance changes have been made.

Use [HOLLOWBROOK-IMPLEMENTATION-PLAN.md](HOLLOWBROOK-IMPLEMENTATION-PLAN.md) as the consolidated implementation entry point and [CLAUDE-RESEARCH-REVIEW.md](CLAUDE-RESEARCH-REVIEW.md) for the subsequent research evaluation.

Companion plans: [covered land and vehicles](EXPLORATION-AND-VEHICLES.md), [500 coins and small discoveries](LUCK-AND-HAPPY-PROGRESSION.md), [contextual advice and Village news](DIALOGUE-AND-VILLAGE-NEWS.md), and [school and the opening economy](OPENING-ECONOMY-AND-SCHOOL.md).

## 1. The idea, evaluated

The user proposes learning skills that enable new trees, ingredients, recipes, products, and repairs to bicycles, motorbikes, cars, and trucks. Experience can represent what the player has learned; a generous energy bar can represent the effort available for larger jobs.

This gives exploration a further purpose: a discovered workshop or old recipe can lead to a new capability. It also lets players develop interests through what they enjoy doing. The strongest reward is a new useful action, followed by a visible result and a character's response.

The main risk is adding too many requirements to the same activity. The game already has farm levels, coins, ingredients, buildings, project gates, and waiting times. A new skill system should give meaning to future capabilities without putting another lock on every existing tree or recipe.

Recommended loop:

> Do something useful → gain relevant practice → learn a capability → use it on a chosen project → discover a result → receive a warm, specific reaction.

Energy supports the larger project step. It should not erase learning or make ordinary earning unavailable.

## 2. Give each kind of progress a clear role

| System | Meaning | Recommended behavior |
|---|---|---|
| Farm experience and level | Overall progress in Hollowbrook | Preserve current XP and level unlocks initially |
| Skill practice | Growing familiarity with farming, cooking, or repairs | Earn through completed relevant work; retain permanently |
| Learned capability | Something the player now knows how to do | Unlock through a clear milestone or short practical lesson; retain permanently |
| Energy | Effort available for a larger exploration or repair job | Spend on explicitly marked project steps; recover generously |
| Coins and materials | What the chosen project needs | Show the full cost before starting; spend only through the relevant validated action |

Do not spend the player's farm XP to learn a skill or reduce their farm level. Energy is also not the currency for permanently buying knowledge. A practical lesson can include a larger hands-on job with an energy cost, but reading its instructions and keeping the learned ability do not drain energy.

Start with a few clear milestones and a compact skill page. There is no need for a large tree of tiny percentage bonuses, separate skill coins, and another permanently visible experience bar for each subject.

## 3. Three proposed skill branches

| Branch | Practice that makes sense | Example future capability | What it adds to the world |
|---|---|---|---|
| Growing | Harvesting crops or fruit; completing a relevant planting lesson | Grow a future tree variety, graft a tree, or prepare a special garden | A new orchard choice or a distinctive planted place |
| Cooking and making | Completing useful batches and fulfilling suitable requests | Learn a new preserve, ingredient preparation, or finished product | A new use for existing produce and a new kind of order |
| Repairs | Completing genuine repairs and small restoration lessons | Mend a bicycle, restore a machine, or prepare a later vehicle for a route | A restored object and a practical new activity |

Grafting, preserves, bicycle repair, and these skill tracks are proposals, not features currently available. New ingredients need explicit sources and recipes; “learn a product” must not imply that its inputs appear automatically.

Existing bread, corn bread, apple pie, carrot cake, and planted tree unlocks should remain available under their current rules in the first skill prototype. Introduce skills with new optional capabilities. If existing unlocks are later redesigned around skills, handle that as a separate balance and save-migration change.

Let the player learn all branches eventually. Choosing to repair a bicycle first should not permanently exclude cooking. Show the next useful milestone in each branch, but highlight only the one the player is currently following.

Fishing and nature knowledge could become a later branch if there is enough distinct content to justify it. Basic pond fishing remains available without adding a new skill requirement.

## 4. Vehicle repair should branch by purpose

```text
Existing small repairs and optional practical lesson
    → basic repair knowledge
    → an optional bicycle project
    → engine knowledge when a suitable workshop and teacher are available
         ├─ tractor: a useful farm job
         ├─ motorbike: small courier errands or personal trips
         └─ car / later truck project: a meaningful travel or delivery route
```

This is an illustrative learning path, not a requirement to own every vehicle in sequence. The bicycle is a suitable small teaching project; later vehicle branches should open according to purpose and available content. A tractor need not require first buying a motorbike and car.

The existing market truck already functions. Keep it usable. A future truck skill should concern an optional upgrade, a different repair project, or a new route, rather than taking away current deliveries until the player earns a repair level.

Decide the bicycle's useful role before building its repair quest. It might support a short village errand or a family activity. A repair that only adds another parked object needs a stronger payoff. The same test applies to each larger vehicle.

Tomas is a natural later repair teacher, once he has arrived. Early repairs must remain possible before his introduction. Use an accessible practical lesson or an existing character's appropriate knowledge, without making every villager an expert mechanic.

## 5. Confirmed energy scope

The user selected: **“Larger projects only; everyday play stays available.”**

| Activity | Proposed energy treatment |
|---|---|
| Planting, harvesting, collecting eggs or fruit | No energy cost |
| Ordinary cooking, production queues, selling and fulfilling orders | No energy cost |
| Basic fishing, talking, reading hints, inspecting a discovery | No energy cost |
| Decorating, planning, checking a land offer, traveling home | No energy cost |
| Existing small weed/rock clearing and ordinary starter repairs | Preserve current behavior in the first prototype |
| New large fallen-tree removal, opening an overgrown route, major vehicle restoration | Clearly marked energy cost per planned project step |
| Work already started in production or a vehicle trip | Continues normally even if the player's energy reaches zero |

Large effort should be recognizable in the action. An ordinary tap on a small rock must not unexpectedly consume a resource that looks intended for major work.

At zero energy, the player can still farm, cook, sell, fish, talk, decorate, and make progress toward existing village goals. Offer an accessible way to recover and an optional suggestion for another enjoyable activity. Avoid repeated low-energy warnings while the player is doing work that does not need energy.

## 6. Make energy plentiful through the whole loop

A high starting number alone does not make energy generous. Generosity depends on the number of useful project steps it covers, recovery speed, availability of free recovery, and whether later jobs become much more expensive.

Recommended recovery design to prototype:

- Begin with a full reserve and show it only when its purpose is introduced.
- Recover gradually while enjoying ordinary activities or away from the game, up to a clearly displayed cap.
- Offer a free, accessible rest interaction at home from the moment energy is introduced. Keep the wait short and test it; do not require an expensive house upgrade or a meal recipe to escape zero energy.
- Let prepared food offer an optional boost later. Eating should be an explicit choice, with its effect shown; never automatically consume goods reserved for a customer or village project.
- A celebration or discovery may occasionally restore energy, but normal recovery must work without a lucky find.
- Explain how long it takes to regain enough for the selected job, and let the player return to that job easily.

Capacity, action costs, rest duration, and recovery rate are deliberately unset. Tune them together after the project steps exist. A first full reserve should comfortably support the introductory discovery project without forcing a break midway; playtests should also cover players who explore several optional projects in one session.

If the bar remains full almost all the time and never supports an interesting choice, simplify or remove it. If it repeatedly interrupts the chosen activity, lower costs or improve recovery. There is little value in adding a meter merely to display another number.

Use calm feedback: one compact bar with a readable number and a project-cost preview. Avoid urgency colors or persistent flashing whenever the reserve is less than full.

## 7. Skills can make villagers' advice more useful

Advice can explain a real missing capability, suggest a relevant lesson, or recognize the first use of a learned skill. It should consider ingredients, workshop access, money, energy, and the player's chosen goal together.

For the earlier bread-and-cake example, distinguish these cases:

- If a cake recipe is already known and usable, identify the real missing ingredient or available production slot.
- If the desired product is a future skill recipe, show the practical lesson and the actual benefit of learning it.
- If the product's ingredients or building are still unavailable, offer an achievable step or a different order; do not imply that earning more cooking practice alone solves the problem.
- If there is spare bread, suggest an available buyer or keep it for a suitable use. Do not assume surplus bread must be eaten for energy or converted to money immediately.

Skill practice should reward useful work without encouraging unlimited unwanted batches. Use modest practice from relevant completed actions and a few purposeful lessons. Avoid a milestone that teaches the player to make a large pile of unsellable bread simply because it is the cheapest way to gain skill.

A new capability can create one Village news message. The badge counts unread news, not every unlearned skill. Reading the card clears its unread state; its lesson or project remains accessible. Subsequent successful use should replace the earlier hint with an acknowledgment.

Draft Pip reaction after a bicycle has actually been repaired:

- **EN:** “The bell works again! Can we try the bicycle?”
- **VI:** “Chuông lại kêu rồi! Mình thử đạp xe nhé?”

This line requires a real bicycle interaction. If riding is not implemented, replace the invitation with a truthful reaction to the repair. Keep all final dialogue and Vietnamese relationships consistent with [STORY.md](STORY.md).

## 8. Keep learning connected to the school without blocking the opening

Learn basic capabilities through farm practice and practical help before the school opens. School activities can later add optional lessons, contests, or playful demonstrations. Reopening the school should not be required to learn the bread recipe needed to reopen the school.

Cora's teaching scenes begin after her introduction. Children can celebrate discoveries and try suitable activities, while adult characters explain workshop or business decisions in their own voices.

The full school, family, and clinic journey retains its current prerequisites in the first prototype. New skills should not silently introduce mandatory coursework or energy expenses into those existing milestones.

## 9. Relevant game examples

**Hay Day:** Supercell's production-building documentation describes buildings unlocking at farm levels and gaining building experience through production, measured in hours. This provides a useful example of broad progression alongside familiarity with a particular activity. It does not establish that an energy system is necessary for Hollowbrook. [Supercell: Production Buildings](https://support.supercell.com/hay-day/en/articles/production-building.html).

**Stardew Valley:** the official 1.6 notes include skill books that grant experience and a mastery system granting perks and items. The transferable idea is that learning can produce permanent capabilities and rewards. Hollowbrook's early skill system should be much smaller than a late-game mastery system. [Official 1.6 changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/).

**Family Island:** its official help center documents an energy system and ways to replenish it. That demonstrates a replenishable activity resource as a separate design choice. For Hollowbrook, the user has chosen a narrower scope: larger projects only. [Family Island: Energy](https://melsoft-games.helpshift.com/hc/en/11-family-island/faq/1145-how-can-i-get-more-energy/).

These examples describe mechanics. They do not prove that adding more progress bars increases enjoyment; the skill and energy proposals need to be evaluated together in the actual game.

## 10. Current code and later verification

The current game has overall XP and level unlocks in [levels.mjs](../src/core/levels.mjs), with values in [economy.mjs](../src/content/economy.mjs) and recipes in [goods.mjs](../src/content/goods.mjs). No energy or dedicated skill-track system was found in the reviewed core/content files. Existing successful repairs already grant general XP through [condition.mjs](../src/core/condition.mjs).

When implementation is authorized:

1. Define skills, lessons, energy costs, and rewards in content data. Keep validation and state changes in core behind `act()`/`tick()`.
2. Validate prerequisites, full costs, ownership, access, and a reachable project before spending anything. A refused action must not consume energy, coins, or materials.
3. Grant practice for the intended completed work. Opening menus, failed actions, canceled queues, replayed scenes, and reloads must not grant repeat XP or discoveries. Define batch and helper credit deliberately.
4. Keep general XP and skill practice separate. Adding skill credit must not accidentally grant general XP twice and change school pacing.
5. Save the project step, resource spending, and reward coherently. Decide cancellation and undo behavior before exposing controls.
6. Regenerate energy through one consistent clock model, with a cap and sensible handling of reloads, offline time, and backward clock changes.
7. Preserve learned capabilities and existing service access when migrating old saves. Do not turn previously usable recipes or the current truck into locked features.
8. Verify that a player with zero energy and little money can recover and continue everyday play without buying anything.
9. Add Vietnamese for shipped labels and messages. Suggested terms for review are **Kỹ năng**, **Kinh nghiệm**, and **Thể lực**; use one consistent energy term across the bar, cost preview, and recovery explanation.
10. Test the introductory discoveries, skill rewards, existing coin rewards, and optional project costs together. Keep the 500-coin opening, the proposed 110-coin discovery budget unless explicitly revised, phone budgets, and school pace targets: casual ≤10 days, steady 3–4, keen ≥2.

## 11. Recommended sequence

First make one covered-area discovery enjoyable. Then add one useful learned capability and one larger project that demonstrates it. Introduce the energy bar alongside that project, with free recovery and all ordinary activities available at zero.

Expand to the three skill branches only after players understand the distinction between experience, a learned ability, and energy. Additional vehicles and recipes should each justify their own useful activity. This keeps the village's growth readable while leaving room for the larger development tree the user wants.
