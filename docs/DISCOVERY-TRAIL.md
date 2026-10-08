# Old-object discovery trail: delivery and story review

Date: 2026-10-08. Status: **logic and AR-010 world integration complete and validated for [PR #18](https://github.com/buicongnguyen/Farm_village/pull/18)**. The PR records the final Pages deployment and live acceptance. This document distinguishes existing discoveries, this connected trail, and the larger unimplemented exploration plan.

## What Claude delivered

[PR #8](https://github.com/buicongnguyen/Farm_village/pull/8) added the working truck fleet. [PR #9](https://github.com/buicongnguyen/Farm_village/pull/9), merged as `f80ceb0`, improved the opening camera, farmhouse forecourt, owned/wild ground distinction, and ten item icons. Its [Pages workflow](https://github.com/buicongnguyen/Farm_village/actions/runs/37743276366) passed. The opening work changes presentation and camera behaviour; it adds no new treasure rules, story chapter, or energy/skill system. The forecourt bench is existing scenery. Existing locked parcels already have dressing and purchase controls; recolouring them did not implement a new exploration/reveal progression.

The new home setting is a useful story anchor. It gives us a recognizable place for a clue to begin and for a family story to end. Claude's later icon passes extended this treatment across the game's icon set; those newer icons are preserved in this integration.

## Current integration baseline

Main advanced to `e8f09a5` with newer icons, lower truck prices, healing herb/ginseng, orange/coconut/willow content, and additional growth plans. Codex merged that baseline and Claude's [AR-010 PR #13](https://github.com/buicongnguyen/Farm_village/pull/13) (`6f312aa`) into its integration branch at `94d1b8e`. Claude delivered the five-node packed exploration kit and ribbon icon; asset creation is complete. Staged placement, picking, and the pink butterfly-shaped ribbon's English/Vietnamese text and card icon are integrated. The later documentation-only company-stage update at `214b1df` is also merged. Combined validation is recorded below.

## Is the luck and exploration plan already implemented?

| Part | Actual status |
|---|---|
| Three local farm profiles and 500 starting coins | Live through PR #4 |
| Second successful catch | Live: one pond tin and 20 coins |
| Tenth successful catch | Live: one pond keepsake and 40 coins |
| Second actual owned-rock clearance counted by the discovery system | Live: one keepsake box and 30 coins |
| First completed restoration of Village Street (`road_south`) | Live: a thank-you and 20 coins |
| Discovery toast, Today badge, cards and Album memories | Live; milestone rewards total at most 110 coins per save |
| Connected farmhouse → pond → family-memory trail | Implemented in this logic slice; final validation/release recorded below |
| Visible clickable old box/tin models and staged reveals | AR-010 integrated and validated with the logic in [PR #18](https://github.com/buicongnguyen/Farm_village/pull/18); two staged clickable props, closed/open states and the ribbon icon |
| Discover/purchase land with new covered-area states and meaningful revealed places | Planned; existing land purchase and scenery dressing are only the baseline |
| Selectively cut scenery trees to open routes | Planned; ordinary scenery trees are not currently removable obstacles |
| Major vehicle restoration, skill learning and project-only energy | Planned; the existing delivery trucks are already functional |
| School contests, enterable homes, later story chapters and river/festival resolution | Planned |

The four original coin finds are designed milestones, not random drops. They do not repeat every ten catches. Older saves retire already-passed fishing/street milestones without a payout or invented Album memory; new rock clearances are counted because older clearing totals did not identify rocks. That is one reason an established farm might not show a new lucky find. Another is presentation: the keepsake icons appear in notifications/cards, while the packed AR-009 models have not yet been used as world objects.

## This slice: The picnic we nearly forgot

After the first order is delivered on a restored farm, an optional trail appears in Today. The farmhouse's existing tap menu also offers **Explore the porch**. It never replaces repair or upgrade actions.

1. **Farmhouse porch:** once the first order is delivered, the closed box becomes visible beside the bench. Its world tap opens an explicit inspection control; the existing Today and farmhouse menu routes remain available. Inspecting changes the box to its open state, and a folded note points to a tin beside the pond dock. Ada and the child exchange a small joke about remembering the bread.
2. **Village pond:** only after the porch clue does the closed tin become visible on dry ground by the dock. Tap it or follow the navigation button, then explicitly inspect it. The tin opens to reveal a faded pink, butterfly-shaped picnic ribbon, matching the delivered model and icon. The family suggests taking it home; this is not an Ellis letter or a sluice key.
3. **Back at the farmhouse:** share the ribbon with Ada. She remembers carrying an empty bread basket all the way to the pond. The child volunteers to bring the bread next time; the partner takes care of the blanket.

Completing the final step grants **one existing flowerpot storage credit**, with no direct coin or XP prize. The catalogue's normal placement preview uses that credit. Standard decoration rules still apply afterward. The original 110-coin discovery budget, school/clinic progression, and normal farming remain unchanged.

Each earned step becomes a replayable memory. Current-stage hints change after the action; future props remain hidden and unpickable until their clue is available, with only one closed/open state displayed at each site. Navigation and world-object taps only open the relevant controls; inspection is an explicit action. No energy, materials, purchase, waiting timer, random roll, or rare item is required. At close zoom, props have a 44 px minimum tap target; distant views use the actual model bounds so ordinary pond/farmhouse controls remain accessible.

**Current visual scope:** the delivered AR-010 box/tin models appear and open with saved progression; future clues stay hidden and unpickable. Existing menus and replayable cards remain usable if the optional kit cannot download. The final memory uses `trail_picnic_ribbon`; the standalone ribbon mesh is available but unplaced. Claude's palette, model geometry, icons and generator output are preserved. [The handoff](CLAUDE-DISCOVERY-TRAIL-HANDOFF.md) records the request; [ASSET-REQUESTS.md](ASSET-REQUESTS.md) records integration ownership.

The prose uses the current runtime names Ada, June and Pip. The [playful naming sheet](CHARACTER-NAMING-PLAN.md) remains a proposal; this feature does not silently adopt unreviewed names. All new UI and story text has authored Vietnamese, with the same facts and progression as English.

## Rules and saved progress

- Rules live behind `act()` in [core/exploration.mjs](../src/core/exploration.mjs); text is [content/exploration.mjs](../src/content/exploration.mjs).
- Save version 8 adds independent per-profile step/read state and a completion timestamp. Old farms may begin the optional trail; migration never gives its decoration automatically.
- The action validates eligibility, the exact next step, timestamp and final storage count before mutation. Final completion and the flowerpot are written together. Duplicate/out-of-order/refused actions leave the farm unchanged.
- Stable `firsts` stamps back up the reward marker if a partial imported save loses its exploration container. Neither loading nor normalizing grants items.
- The Today number counts only earned unread memories, together with existing advice and discoveries. A merely available trail is not unread work.
- Queued memories stay unread until their card actually opens. Repeated activation cannot enqueue duplicate copies of the same memory. Reading/replaying never pays again.
- The core does not change chapter, mail, water-mystery or discovery progress. Placing the earned flowerpot later follows ordinary decoration behaviour.

## Story review fix included

Personal favours could previously come from Lan or Sam before their families arrived, and claiming them could award early hearts. Generation and claim validation now use the same presence rules as the order board. An old premature request remains saved but hidden until the household arrives, leaving three usable visible goal slots. The original request then returns with its original ID/reward. Previously awarded hearts, rewards and history are preserved.

The gift path also exposed an existing price-preview mismatch: placing a stored decoration was free, but the placement bar showed its normal purchase price. The preview now follows the actual storage/rebuild-adjusted charge.

## How to improve the larger story next

The strongest next step is to finish small promises with connected activities and visible payoffs.

1. **A place, a person, a payoff.** Each old object should have a discoverable lead, one believable connection to a character, and a result visible in play or retained in the Album. Use the picnic trail as the first pattern; do not turn every object into a coin box.
2. **Different interests, equal warmth.** Farming can lead to a recipe memory, fishing to a riverside keepsake, and repair to an old workshop story. These should be optional branches, not three mandatory gates stacked on every chapter.
3. **Let people remember success.** Add a small number of fact-based follow-up lines to the relevant person after a discovery or real order. Keep customer advice tied to actual demand and available production. No repeated generic praise or invented shortages.
4. **Give existing celebrations a visible ending.** The current school celebration has a reward/toast; a short saved scene and later small gathering would make it feel like an event. Keep it separate from the later restored Harvest Festival and do not award the existing festival money again.
5. **Pay off the river story in order.** Later work should connect water rights, an authorized repair, running water, the mill, Ellis's actual return and the lantern festival. Keep the water dispute separate from the old stage fire. Do not promise a usable key or a returning character before the interaction/actor exists.
6. **Keep the joy specific.** A funny forgotten sandwich, a child's proud discovery, an old neighbour remembering who helped them: these suit the requested happy tone better than a constant stream of jackpots or guilt about being away.

The first following exploration release should implement **one covered place with a real activity**, with disclosed access/purchase costs, useful space, safe old-save migration and a clear route home. Skills/energy and major vehicle restoration should follow only when their actual activity is specified and tested.

## Validation and delivery

- **261 native tests pass**, including action validation, one-time reward/migration, favour-arrival rules, price preview accounting, translation coverage and speaker pronouns.
- **Pace passes:** all native profiles remain within their targets; steady school and clinic day 3 in `npm run sim`.
- **19 component browser suites and 28/28 smoke checks pass** on the combined newer-main/AR-010/logic tree. The final narrow tap-target correction was then verified by rerunning all **8 discovery checks**.
- Those eight checks cover English/Vietnamese at 390 px and 1280 px, real order and object/inspection taps, hidden/revealed props, model swaps, save/replay, free stored-gift placement, earned-only unread counts, queued-card acknowledgment, old favours after arrival, failed optional downloads, full-farm draw/triangle budgets and ordinary fishing taps at seven zooms.
- **Production build acceptance: 4/4 isolated contexts pass** locally, English/Vietnamese on phone-sized and desktop viewports. Acceptance starts from an explicit fresh-farm fixture with tutorial/chapter cards dismissed and an unfilled first order, then uses the actual order/inspection controls. All three scenes, real assets, save/reload/replay and error checks pass; production exposes no test hook. These are browser viewport checks, not physical-device tests.
- First-load code: **1,024,285 bytes test / 1,023,220 bytes production**, below 1,100,000. Phone/PC suites stay below 120 draws and 300,000 triangles. The separate packed discovery kit is 21,160 bytes and loads only when needed.
- Release: [PR #18](https://github.com/buicongnguyen/Farm_village/pull/18) integrates Claude's PR #13 history, keeping art and behavior together. The PR records the final CI result, Pages workflow and production-site acceptance. Runtime names remain unchanged; the playful name sheet is documentation only.
