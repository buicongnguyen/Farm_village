# Clearer guidance, compact HUD and delivered restoration art

Implementation: 2026-10-09, `codex/clearer-guidance-art`, from deployed main `027ec20`.
Integrates Claude's hospital-fit PR #29 (`f52860f`) and potting-bench PR #30 (`a56c93e`).

## What changes in play

The village title and current roadmap goal share one tracker. Orders and Projects retain their dedicated buttons,
without repeating the same destination in the status list. Small status chips keep goals, waiting rent and active
truck/fishing timers reachable. Menu captions, readable counts and at least 44 px button targets support phone use
and enlarged text. Existing colour tokens distinguish navigation, actionable work and unread messages. Timer
updates preserve keyboard focus instead of replacing every button.

Village ideas now include the current picnic step, an available clearing, garden lessons/repairs/free rest, a first
or unfinished school game, and gentle invitations around existing fishing/stone discoveries and street restoration.
The selectors check the real rules before offering a target. Opening **Show me** visits or previews it; the player
still confirms inspecting a clue, clearing a stone, buying land or paying for repairs through the normal controls.

Advice remains limited to three current suggestions plus earned milestone memories. Important order/source help
keeps priority. Already-read optional business reminders make room for fresh activity ideas. Read and postponed
topics remain saved across reloads, temporary shortages and language changes. English and Vietnamese use the same
facts and IDs; changing locale cannot replay a reward. The new invitations do not reveal hidden reward amounts.

The four existing lucky finds and their 110-coin maximum are unchanged, as are the 500-coin opening, all repair
prices, school costs and everyday energy rules. This release improves access to existing activities rather than
adding a new treasure economy, recipe or story chapter.

## Art and save compatibility

Claude's hospital now fits inside x ±3.9 m / z ±2.9 m. The clinic's 4 × 3-cell placement, doorway, upgrade stamp,
movement and wear behavior remain intact. Decoded model checks cover all rotations and legal adjoining objects.

The two art branches changed the same generated `decor.glb`. Their Blender source combined cleanly; Codex rebuilt
the merged source with Blender 4.5.9 and packed it through `art/blender/pack.mjs`, following the explicit integration
handoff. The other three generated GLBs are byte-identical. No art design, palette or generated anchor was changed.

AR-013's three models map to the existing four progress states:

| Saved completed repairs | Model |
|---|---|
| None | `potting_bench_overgrown` |
| Uncover only | `potting_bench_repaired` |
| Uncover and brace | `potting_bench_repaired` |
| All three, including trays | `potting_bench_done` |

The model changes at the same reserved farmhouse location and uses the same tap target. Temporary pieces disappear
when the delivered model loads. The final tray step remains an explicit action; seeing the repaired frame never
completes or pays for it. Model loading and save migration grant no materials, coins or story completion.
Save version 11 remains compatible: this release adds only finite read/defer topic IDs, not a new economy ledger.

## Release verification

Completed on the combined implementation:

- `npm test`: **407/407**, including rules, translations, story, decoded model bounds and advice history.
- `npm run sim` and native pace tests: pass; steady school and clinic remain day 3.
- Test build, **all 31 component browser suites**, and **28/28 main smoke checks**: pass.
- Coverage includes EN/VI phone/desktop and two landscape sizes at 130% text, hospital neighbors/rotations,
  bench stages/reload/late loading, and advice previews that cannot spend resources or select passing villagers.
- Phone render limits remain **120 draws / 300,000 triangles** across the measured zooms. The combined orchard
  fixture peaks at 118 draws / 287,812 triangles; the hospital and repaired bench also pass their dedicated checks.
- First-load code: **1,084,628 bytes test / 1,083,777 bytes production**, below the 1,100,000-byte cap.

- Production acceptance: **16/16 contexts** pass without `window.farm`: eight compact-HUD layouts, four guidance
  flows and four garden/school flows. They cover both languages, real startup/panel controls, saved postponements,
  explicit payment, zero-energy play and reloads. Test startup waits for game initialization before exercising the
  HUD, and supplies deterministic goals so the current date cannot change its expected ready count.

[PR #31](https://github.com/buicongnguyen/Farm_village/pull/31) records final CI, publication and live verification
after the authorized merge. Browser checks use Chromium with simulated
phone/desktop viewports, not physical devices. The optional WebKit run is unavailable on this machine;
these results do not claim Safari coverage.

## Next art and logic work

The first goat/dairy chain is scoped separately in [MEADOW-DAIRY-SCOPE.md](MEADOW-DAIRY-SCOPE.md), with AR-002's exact
first-delivery asset IDs and proposed economy values. It is not implemented by this release. Existing goat rig
reuse avoids commissioning duplicate animation. Miso, land deeds, larger covered regions, vehicles and chapters
6 onward remain separate work; coast/lighthouse and extra trees have not been commissioned here.
