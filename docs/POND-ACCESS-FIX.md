# Public access to the village pond

The village pond is outside owned/buildable land. Players cannot fix a missing connection by buying or laying a road. Previously villagers snapped their destination to the closest road, while family/player movement rejected the public ground around the dock.

## Delivered behavior

- A permanent two-cell-wide footpath joins the west road to the existing dock. It is world data, so current and old saves gain access without changing ownership, coins, roads or progression.
- The ground uses the existing path colour. Scenery is filtered off the corridor after seeded placement, preserving the surrounding layout. No model, icon, Blender or palette changes are included.
- One weighted route planner permits public paths, roads, clear verges, village/home ground and owned farm land. Covered parcels, rocks/weeds, water, buildings, unrestored ruins, pens and fences remain obstacles. Roads remain preferred to grass and crop beds.
- Player, family and NPC fishing use exact reachable shores. Family members face the selected pond; visitors can complete a requested outing too. The player casts only upon actual arrival.
- Changed obstacles cause a new route or cancel the outing. Repeated commands, a different chore, nightfall and a moved/stored built pond cannot leave an old cast pending. There is no player teleport fallback.
- Routing is transient view state. Save format, profile IDs, costs, rewards, language editions and construction permissions are unchanged.

## Integration and validation

Claude PR #33 is incorporated through merge commit `635c457`, preserving its history and the newer localization/bubble fixes. Codex completed public path presentation, bounded terrain access, dynamic collision checks, shore selection and lifecycle regressions.

Validation:

- All 465 native tests and the pace simulation pass (steady school day 3).
- All 35 component browser suites pass, plus 28 smoke checks. The full run passed 34 suites; the pond test was corrected to respect Hana's existing animation fallback and passed its four-context rerun. There was no further game-code change.
- The pond browser test taps visibly rendered player/family/villager actors, then the pond, and verifies arrival, the supported fishing pose and player-only casting. Captured English/Vietnamese phone and Korean/Japanese desktop images show actors at the dock.
- Startup code: production 1,093,471 bytes; test build 1,094,316 bytes, both below 1,100,000. Phone rendering and first-load timing checks pass.
- Browser coverage uses Chrome on phone-sized and desktop viewports. The optional Safari/WebKit checks could not run because its local runtime is unavailable.
- Hook-free production acceptance passes in English on a 390 px phone and Vietnamese on a 1280 px desktop: ordinary controls select the player, the real-time walk ends with an automatic cast, land/coins/structures remain unchanged, and the line survives reload. The fixture includes the first day's normal garden decoration before comparing journey accounting.
- Publication verification is recorded in [PR #37](https://github.com/buicongnguyen/Farm_village/pull/37).

Release source: `codex/pond-access`, gameplay commit `bff1c69`. [PR #37](https://github.com/buicongnguyen/Farm_village/pull/37) records final-head CI, Pages deployment and live verification. It preserves the history of Claude PR #33; the tree pack in PR #32 is outside this change.
