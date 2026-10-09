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

Validation so far: all 465 native tests and the pace simulation pass (steady school day 3). The test build uses 1,094,316 bytes of startup code, below the 1,100,000-byte limit. Native movement tests inspect actual positions, clips, cast timing, returns and cancelled actions; the browser check selects a character then taps the pond. Full component and smoke checks are in progress.

Release PR, CI, Pages and live acceptance: pending.
