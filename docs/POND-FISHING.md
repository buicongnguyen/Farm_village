# Fishing from the bank

User-approved scope, 2026-10-09: remove the floating pond platform, stop people sharing a fishing seat, show casting,
and add a timing minigame. This follows the public access repair in PR #37.

## Player flow

1. Tap the pond to open its controls. Selecting a person first sends that person to a free fishing place and opens
   the same controls; family members do not consume the player's bait or award catches.
2. Choose **Cast a line** or **Cast with bait**. The player walks to a reachable shore before casting. The button
   shows the walking state, so repeated taps cannot queue extra bait charges.
3. The rod swings forward, the line follows, and a float lands in the water. The float remains tappable while the
   player is elsewhere. Waiting or closing the panel never loses a fish.
4. Once a fish bites, **Reel in** opens a marker that travels back and forth every 3.6 seconds. Press **Reel now**
   inside the middle half of the meter. A miss leaves the same fish waiting and costs nothing.
5. **Reel gently** is always available for a ready fish. It skips timing and gives the identical seeded catch,
   rarity, album progress and rewards. Reduced-motion play uses this option directly.

## Rules and compatibility

- The public bank is permanently accessible without buying land or building a road. The player uses the center
  spot; two other spots are 4 metres apart. Travellers reserve before leaving and avoid occupied fishing places.
- Built ponds use reachable outside shore cells. A full or blocked shore refuses the trip. Cancellation, night,
  a moved/stored pond and the end of a visitor's rest release reservations.
- The player stays seated while a cast line waits. Reloading restores the trip without casting again; a removed
  built pond falls back to the public bank without losing the pending fish.
- Optional `line.reeling.startedAt` and `line.pond` fields preserve the current save format and older lines.
  Core actions validate readiness and the timing window using the game clock. UI input never reports its own score.
- Repeated catches cannot award twice. Misses and early reeling do not change resources. Closing a sheet, switching
  languages, going offline or rolling the clock backward never expires the catch.
- Existing bait odds, fishing wait times, sell prices, lucky discoveries and pacing are unchanged. Fishing costs
  no energy. This work does not implement the later meadow/dairy or coast expansion.

## View and art handoff

Only the pond platform's procedural planks/posts were removed; the river bridge and stepping stones remain.
The public shore is cleared of overlapping scenery. `FishingView` batches rods, lines and floats into three draws,
uses no new binary assets, and owns only presentation and picking. Gameplay stays in `src/core/fishing.mjs`.
Claude can replace the simple tackle later while preserving the seat and input contracts.

## Validation and release

In progress: rules tests, pacing, all component browser suites, smoke checks, production checks, PR CI, Pages and
live verification. The final release record will replace this paragraph after those checks complete.
