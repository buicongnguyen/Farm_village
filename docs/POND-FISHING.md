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

## The cute_game feel (2026-10-09, user request)

The user asked for casting and reeling like Zoo Garden (repo cute_game, src/fishing.ts). Sitting at the water with a
line out, your character now plays it the cute_game way (view/fishing-play.mjs, rules in core/fishing-fight.mjs):

- In the last seconds before the core bite time, a fish's shadow swims up to the float and nibbles 1–3 times (the float
  dips). Then it bites: the float sinks and shakes, a splash, a vibration, and the round **Reel** button (where the Next
  chip sits; the chip hides while you fish) turns orange and pulses for 1.7 s.
- Strike on the bite, then **hold** Reel: progress rises, and so does line tension; the fish surges, and the line
  strains and turns red. Let go to ease it (cute_game's tension, progress and surge numbers, middle rod). Typical fights:
  perch 4 s, carp 5.5 s, catfish 8 s, golden carp 12 s. Win, and the fish leaps from the float into your arms.
- Kept from the approved rules: striking early, missing the bite, a slipped line or a slack line cost nothing; the
  fish swims off and comes back. The catch is still the line's seeded fish, awarded only by core reelIn (the
  equal-reward steady path). Reel gently stays in the panel; reduced motion lands the fish on the strike.
- Hold with a finger or mouse, or the Space bar; a keyboard or switch click toggles holding.
- The panel's old moving-marker meter is retired from the interface. Core startReeling / REEL_TIMING remain for old
  callers and saves.

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

## Fishing on foot from the bank (2026-10-10)

In Explore you fish as in Willowmere and Zoo Garden.

- **The whole bank is walkable.** `POND_BANK` (the pond plus three cells each way) is public ground in
  `core/walk.mjs`; only the water itself (`isPondWater`, the drawn ellipse) and the four lake kiosks block.
- **The rod comes out near water.** Within `BANK.reach` (3 m) of any pond, the village pond or one you built, the
  player holds the rod; it goes away past `BANK.leave` (4 m). The action pill reads "Cast a line".
- **Cast where you tap.** A tap on the water lands the float there (`castPlan`: 1.8 to 7 m from you, never closer
  than 0.7 m to the rim). Tapped from further off, you walk to the nearest shore and cast on arrival. With a line
  out and no fish on, another tap only moves the float: no second line and no second bait.
- **The catch lies on the grass.** A fish landed on foot is *held* (`reelIn { hold: true }` puts it in
  `s.fishing.bank`). It counts for the album, the caught total and goals at once, but it is not in the barn.
  Each fish gets its own place (`bankSpots`: three arcs round the angler, about 1.15 m apart, at least 1 m from
  the water, on open ground only). They pile only when every place is taken.
- **Packing.** Walking more than `BANK.pack` (2.5 m) from where you stood, going indoors, or fishing from a new
  spot packs the catch (`packCatch`): the fish go to the barn, overflow sells as usual, and a notice links to the
  barn. Fish are never lost: a held catch is saved, and `tickFishing` packs it by itself after `BANK_KEEP_MS`
  (10 minutes) or when a game is loaded with fish still on the grass.
- **The pond sheet is unchanged.** "Reel gently" from the fishing sheet, with no `hold`, still goes straight to the
  barn with the same `fishCaught` event.

Tests: `tests/pond-bank.test.mjs`, `tests/bank-catch.test.mjs`, and the fishing-on-foot check in
`tests/explore-roam.browser.mjs`.
