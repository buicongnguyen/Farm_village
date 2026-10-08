# Old-object discovery trail: delivery and story review

Date: 2026-10-08. Status: **logic implemented; release validation recorded below**. Claude is preparing AR-010 art separately. This document distinguishes existing live discoveries, this new slice, and the larger unimplemented exploration plan.

## What Claude delivered

[PR #8](https://github.com/buicongnguyen/Farm_village/pull/8) added the working truck fleet. [PR #9](https://github.com/buicongnguyen/Farm_village/pull/9), merged as `f80ceb0`, improved the opening camera, farmhouse forecourt, owned/wild ground distinction, and ten item icons. Its [Pages workflow](https://github.com/buicongnguyen/Farm_village/actions/runs/37743276366) passed. The opening work changes presentation and camera behaviour; it adds no new treasure rules, story chapter, or energy/skill system. The forecourt bench is existing scenery. Existing locked parcels already have dressing and purchase controls; recolouring them did not implement a new exploration/reveal progression.

The new home setting is a useful story anchor. It gives us a recognizable place for a clue to begin and for a family story to end. Claude's ten revised icons improve the identity of products, but a broader icon pass remains separate.

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
| Visible clickable old box/tin models and staged reveals | AR-010 art requested; not placed in the world by this logic slice |
| Discover/purchase land with new covered-area states and meaningful revealed places | Planned; existing land purchase and scenery dressing are only the baseline |
| Selectively cut scenery trees to open routes | Planned; ordinary scenery trees are not currently removable obstacles |
| Major vehicle restoration, skill learning and project-only energy | Planned; the existing delivery trucks are already functional |
| School contests, enterable homes, later story chapters and river/festival resolution | Planned |

The four original coin finds are designed milestones, not random drops. They do not repeat every ten catches. Older saves retire already-passed fishing/street milestones without a payout or invented Album memory; new rock clearances are counted because older clearing totals did not identify rocks. That is one reason an established farm might not show a new lucky find. Another is presentation: the keepsake icons appear in notifications/cards, while the packed AR-009 models have not yet been used as world objects.

## This slice: The picnic we nearly forgot

After the first order is delivered on a restored farm, an optional trail appears in Today. The farmhouse's existing tap menu also offers **Explore the porch**. It never replaces repair or upgrade actions.

1. **Farmhouse porch:** inspect an old box through the exploration panel. A folded note points to a tin beside the pond dock. Ada and the child exchange a small joke about remembering the bread.
2. **Village pond:** follow the navigation button and inspect the tin. A faded yellow ribbon recalls a picnic basket. The family suggests taking it home; this is not an Ellis letter or a sluice key.
3. **Back at the farmhouse:** share the ribbon with Ada. She remembers carrying an empty bread basket all the way to the pond. The child volunteers to bring the bread next time; the partner takes care of the blanket.

Completing the final step grants **one existing flowerpot storage credit**, with no direct coin or XP prize. The catalogue's normal placement preview uses that credit. Standard decoration rules still apply afterward. The original 110-coin discovery budget, school/clinic progression, and normal farming remain unchanged.

Each earned step becomes a replayable memory. Current-stage hints change after the action; future steps are not all disclosed at once. Navigation only moves the camera and opens a panel; inspection is an explicit action. No energy, materials, purchase, waiting timer, random roll, or rare item is required.

**Current visual scope:** this slice is playable using the existing farmhouse/pond, interaction menus, character portraits, and AR-009 icons. It does not claim that the new box and tin already appear as independently clickable 3D models. Claude's AR-010 props will be integrated after their separate PR is reviewed. [The handoff](CLAUDE-DISCOVERY-TRAIL-HANDOFF.md) states ownership and asset names.

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

- Native suite: 258 tests passed; new trail rules, integrated order/action/save coverage, Vietnamese text and speaker checks included.
- Simulation: all native pace targets passed; `npm run sim` steady profile reaches school and clinic on day 3.
- Test build: 1,019,792 bytes of first-load code, below 1,100,000.
- New browser checks: 5/5 passed, including English/Vietnamese at 390 px and 1280 px, real order/inspection controls, save/replay, one-time reward, shared unread count, queued-card acknowledgment, duplicate activation and legacy favour visibility after arrival.
- All 19 component browser suites and 28/28 smoke checks passed. A final stored-gift price-preview correction is being checked before release.
- Art delivery: AR-010 pending. The test build is not a production deployment.
