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

- 494 native tests pass, including timing accounting, seat lifecycle, saved lines, actual tackle geometry and picking.
  Pacing is unchanged: steady school day 3; the complete pace tests pass.
- All 36 component browser suites and 28 smoke checks pass on the integrated release source. The initial interrupted
  run exposed discovery fixtures that used the player before asynchronous creation; those fixtures now wait for the
  real actor. A complete fresh run passed after the fix and after integrating main's HUD PR #38.
- Dedicated fishing checks pass in English/Vietnamese at 390 px and Korean/Japanese at desktop size, including
  enlarged text, real actor/pond/float taps, separate seats, visible tackle, no platform, timing miss/retry/reload,
  identical gentle catches, preserved keyboard focus after fees/inventory changes and stale built-pond refusal.
- Startup code: test build **1,098,529 bytes**; production **1,097,684 bytes**, under 1,100,000. Full-farm phone
  rendering remains within 120 draws / 300k triangles across the browser suites' zoom checks.
- Browser coverage uses Chrome. The optional WebKit run remains unavailable because the local runtime is absent.
- Hook-free production acceptance passes in Vietnamese desktop: actual player/pond taps, normal walking and casting,
  reload, the timing interface, gentle collection of the original seeded fish, and a second reload with no repeated
  reward. [PR #42](https://github.com/buicongnguyen/Farm_village/pull/42) records CI, Pages and live verification.

Gameplay handoff: `c646f22`; later commits integrate HUD PR #38, strengthen browser regressions and document the
user's separately requested Explore design. Explore has **no runtime implementation** in this release.
