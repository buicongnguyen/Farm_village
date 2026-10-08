# Farm profiles and the first lucky discoveries

Prepared 2026-10-08. **Live through [PR #4](https://github.com/buicongnguyen/Farm_village/pull/4) at `ab6b230`.** [Pages deployment 37728932775](https://github.com/buicongnguyen/Farm_village/actions/runs/37728932775) passed.

This release of the [consolidated plan](HOLLOWBROOK-IMPLEMENTATION-PLAN.md) adds three visible farm profiles and four small discoveries to the existing village. [PR #6](https://github.com/buicongnguyen/Farm_village/pull/6) implements persistent business/blocker/activity advice, retained milestone memories and Claude's AR-009 icon integration. Merging into main triggers deployment; the [Pages workflow history](https://github.com/buicongnguyen/Farm_village/actions/workflows/pages.yml) records the production result. Covered land, learned skills, project energy, school interiors and the meadow remain later work; the playable story still ends at chapter 5. See the observed [reference-game comparison](REFERENCE-GAME-COMPARISON.md) for further design evaluation.

## Three independent farms

The cottage button near the top of the screen opens **Farm profiles**. Settings also has the same entry. Exactly three cards show the current farm, empty slots, or saved progress: player name, level, coins, chapter and last-played date. An empty slot starts the restored village with **500 coins**.

Existing `farm-village:save:1`, `:2`, and `:3` keys and their backups are retained. There is no copying progress between slots. Switching first saves the departing farm, then stops its autosave callbacks before navigation. Import and reset explicitly name their target and require confirmation. A failed save prevents switching. Another tab changing the shared profile selector does not change which farm an import or reset targets.

Unreadable saves use a healthy backup when available. Otherwise a recovery screen appears before a new game can overwrite anything. It offers another farm, an imported backup, or an explicitly confirmed reset. Invalid imports are rejected before replacing a save. Saves remain local to this browser; exporting from Settings creates a portable JSON backup.

## Four effort-earned finds

| Find | Successful action that earns it | Extra coins | Reaction |
|---|---|---:|---|
| A little tin from the pond | Second fish caught | 20 | Pip wants to keep the tin for future finds |
| The fish on the button | Tenth fish caught | 40 | June notices a fishing keepsake |
| A keepsake beneath a stone | Second owned rock cleared while this system is active | 30 | June welcomes room for something new to grow |
| A thank-you for Village Street | First completed restoration of the broken Village Street | 20 | Gus thanks the player for the smoother cart route |

These are designed one-time milestones, not random rolls or a prize every ten catches. The combined extra payout is capped at **110 coins per farm**. Normal fish income and other existing rewards remain separate. Clearing two rocks costs 20 coins and the street repair costs 40; the finds supplement those useful actions rather than making them a money loop. Repairing School Lane does not award this street reward.

Money is granted immediately by the successful core action. A short optional notification and sound announce the find. The Today button shows a numeric unread count, including during the opening. The record stays in Today and the album. Opening a record acknowledges it and shows the keepsake story and the villager's response; opening it again never pays again. The reward label says it has already been added to the balance.

English and Vietnamese select the same discovery IDs, conditions, rewards and read state. Text renders in the current language. Switching language does not make a find unread or award it again. Speaker voices follow STORY.md. The fish button is a small personal memory; it does not reveal Ellis's water-rights mystery or pretend that a later chapter has happened.

## Continuing an older farm

The profile/discovery release introduced save version 6, which initializes discovery state without giving a pile of missed rewards on load. The advice implementation advances to version 7 while preserving these discovery records. Known fishing milestones already passed and a street already restored are retired without money, album entries, or unread notices. A still-broken street and future catch milestones remain eligible.

Old clearing totals include weeds and cannot prove how many rocks the player cleared. Therefore old farms begin counting newly observed successful owned-rock clearances from zero. The stone story deliberately says a box was found while lifting a rock, without claiming it was the second rock the player ever cleared. Fresh profiles can experience all four finds.

## Rules and art contract

- Content: `src/content/discoveries.mjs`; behavior: `src/core/discoveries.mjs`, called after successful actions and completed repairs.
- Saved fields: `discoveries.catches`, `rocks`, `claimed`, `retired`, `read`; first-time markers also retain earned IDs. Counters stop at the last relevant milestone.
- Successful grants emit `discovery {id, coins, person}` and `coins {coins, source: 'discovery', id}`. No world-position field is promised. Reading emits no additional payment.
- Refused actions do not advance counters or create discovery state. Failed catches, weeds, unowned land, partial repairs and ordinary cosmetic maintenance do not qualify.
- PR #4 used stand-in icons. The PR #6 integration uses Claude's **AR-009** WebP icons `lucky_tin`, `lucky_button` and `lucky_box` in discovery cards, Today/Album entries and notifications; the street thank-you retains the existing envelope/coin treatment. Current discovery views do not load `discovery-props.glb`: it is a packed, registered asset available for a future 3D presentation. The logic integration changes no art-owned source or effect appearance. The scoped request is in [CLAUDE-DISCOVERY-HANDOFF.md](CLAUDE-DISCOVERY-HANDOFF.md).

## Acceptance checks

Rules tests cover exact thresholds, repeat/refused actions, additive money accounting, migrations, read state, save isolation, backup handling and storage failures. Browser tests use actual Cast/Reel, Clear, Repair, profile, import and reset controls in English and Vietnamese. They check the 500-coin start, all four finds, the 110-coin budget, optional cards, numeric badges, reloads, legacy imports, phone fit and recovery.

Delivery validation is recorded in CHANGELOG.md and CODEX-TASKS.md: 229 combined-tree native tests, all pace targets and 17 advice-build component browser suites pass. Smoke checks: **28/28 passed on the advice build**. AR-009 integration checks: **English/Vietnamese advice and discovery suites passed again after integration; 12 keepsake cards passed on phone/desktop in both languages (fit, exact 256 px icons, no extra payment, no GLB request and no errors)**. Final first-load code is **1,005,608 bytes** for the test build and **1,004,534 bytes** for production. The existing school pace, first-load code and phone rendering budgets still apply.

## How to try it in the live game

1. Open the cottage profile button and start an empty Farm 2 or Farm 3; the original farm stays in its slot.
2. Catch two fish to find the little tin. Continue to ten for the brass fish button.
3. Clear two rocks on owned land, or finish repairing Village Street, for the other finds.
4. Open Today when its number appears, read a memory, then find it again in the album through Settings. Reload to verify the memory and money remain without a second payment.
