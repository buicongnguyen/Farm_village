# Garden repairs, strawberries and school baskets

Implementation: 2026-10-09, `codex/learning-garden-school`, from deployed main `e05c800` (PR #26).
Claude's AR-011/AR-012 delivery `7cba0e4` (PR #27) is integrated locally at `b1896f5`.
[PR #28](https://github.com/buicongnguyen/Farm_village/pull/28) records exact-head CI, Pages deployment and production verification.

## What the player can do

After the Tran family has actually arrived and chapter 3 has been read, **Projects** and **Today** offer the old
potting bench. It is also accessible from the farmhouse and by tapping the small covered frame beside it. Opening
the page or visiting the spot costs nothing. Older farms made before restore mode use the same arrival/story gates.

Minh offers two short practical questions about a steady frame and draining seed trays. Mistakes get a gentle hint;
there is no payment, lost XP or limited number of attempts. Finishing teaches **Garden repairs** permanently. The
repair preview shows the entire cost and the next step before the player confirms any work.

| Step | Coins | Project energy | Result |
|---|---:|---:|---|
| Uncover the frame | 20 | 20 | Removes the cover; reveals Ellis's old strawberry label and an optional family memory |
| Brace the frame | 35 | 20 | Saves the strengthened frame; the last repair becomes available |
| Fit the seed trays | 25 | 10 | Finishes the bench, adds a second memory and unlocks strawberry planting |
| Total | **80** | **50** | A useful crop branch, without a new main-story prerequisite |

Steps can be paused indefinitely. Each explicit button pays for its own step once; there is no cancellation/refund
button after the work is completed. Looking, reading, reloading and replaying memories never pay again. The bench
occupies the existing reserved farmhouse footprint; it neither buys land nor overwrites the player's terrain.

Strawberries require the finished bench **and level 4**. They use an ordinary crop bed, take two minutes, yield two,
and have a base value/seed replacement price of 12 coins. One stored fruit can be replanted under the existing seed
rules. All older crops retain their original gates. New generated orders only ask for berries when they are
renewably obtainable; a saved/imported request can explain the missing lesson and return to the original order.

## Generous energy, only for project work

- The lesson introduction provides a **100-point reserve** once. The entire first project fits in half of it.
- Restore **one point per completed minute**, including while away, capped at 100. Full reserves do not bank time.
- **Rest at home** is free: 30 seconds restores up to 60 points. The rest continues after closing the page or reloading.
- Backward clock corrections cannot mint passive energy; the free rest stays reachable without a long penalty.
- Planting, harvesting, feeding, cooking, fishing, selling, classroom play and ordinary building/road repairs retain
  their existing rules at zero energy. Farm XP is never spent to learn a skill.

These are the first implemented values. Other skill trees and vehicle repairs remain separate designs. The opening
still provides 500 coins; the four earlier lucky finds still total at most 110 coins. The strawberry label is a happy
discovery with a useful eventual payoff, not another large cash injection.

## School baskets and the happy story

After Cora's school-opening chapter has been read and a school is working, tap the school or choose the activity
from Projects/Today. A panel shows three picture-basket questions. Simple rounds use counting, matching and adding;
challenge rounds add missing amounts and equal groups. There is no timer, cost or required homework. Adults and
children can play together without taking anything from the farm's barn.

An unfinished round resumes at the same question, including after an English/Vietnamese switch. Wrong answers leave
a gentle hint and allow another try. Optional notebook statistics record completed rounds and the best first-try
score. A new set replaces unfinished questions only through the explicit alternate-set controls. The first completed
round adds one Cora/Pip/June memory; later rounds vary the questions without more coins, XP or unread memories. Earned
memories stay readable if the school later needs repairs. This is the first classroom activity, not a new enterable
3D school interior, a school-road redesign or completion of every planned school feature.

The garden's two three-line scenes connect Pip's discovery, Ada's recollection of Ellis and Minh's practical help.
The school scene celebrates shared counting. Both languages use the same IDs, eligibility, progress and accounting;
Vietnamese keeps each speaker's established pronouns. The Today count and Album retain unread/earned memories, and
small completion notices acknowledge the learned skill, restored bench and first basket game.

## Saves, interface and art integration

Save version **11** adds bounded learning/energy and classroom records. Migration grants no resources, lessons,
unread discoveries or terrain changes. Backup stamps protect earned phases, lessons and read status against partial
optional records; a completed rest cannot be credited again from stale pending-rest data. Each local farm profile
keeps its own progress.

Panel contents load on first use to keep startup below 1.1 MB. The controller remains available while they load;
closing a panel prevents a late download from reopening it. A failed entry/dependency offers **Save and reopen**,
which refuses to navigate if saving fails and restores the same profile even if another tab changed the active slot.
Settings sliders and expanded details retain their existing behavior. A memory is acknowledged only when visible,
not while another story card covers it or the tab is hidden.

AR-011 selects Claude's hospital tier from the saved upgrade stamp, including after late model loading and reloads.
Wear uses that tier too. AR-012 supplies actual menu/animal pictures, declared 64 px icon variants and semantic look
tokens. Logic chooses only delivered small URLs and applies the existing green-confirm/blue-navigation/unread
conventions. No new Blender output, color palette or icon binary is authored by Codex.

The potting bench currently reuses `bench`, `weeds2` and `flowerpot`; **AR-013** requests a dedicated staged model.
Worker outfits and brand seals remain optional future art. Later meadow/dairy, regional exploration, transport,
localized display-name deployment, water-rights resolution and festival chapters are not claimed by this slice.

## Validation and release record

Rules, story/pronouns, translation coverage, refusal purity, migration, energy recovery and pace are covered by native
tests. New browser suites exercise real learning/classroom controls, saved progress, free recovery, zero-energy
ordinary play, world taps, strawberry growth, lazy-load failures and filled-farm zoom budgets. The production
acceptance script uses visible UI and normal per-profile saves without the test hook, in EN/VI at 390/1280 px with
130% text. Existing production/shop/civic and optional-discovery acceptance are retained.

Combined validation:

- **389 native tests pass**; `npm run sim` and pace assertions remain green, steady school/clinic day 3.
- **All 28 component browser suites verified**, including 25 new feature checks across the five new suites.
  The initial full run passed 24 suites. Four older suites assumed synchronous panel rendering or save version 10;
  their assertions now wait for actual content/use `SAVE_VERSION`, and the affected suites pass again.
- **28/28 smoke checks pass**, including 390 px Vietnamese panels, slider stability and a 2.97-second first scene in
  the simulated 4G-phone check. One original slider assertion also needed to await the loaded control.
- New strawberry/bench filled-farm measurements peak at **93 draws / 253,830 triangles**, under 120 / 300,000.
  Existing orchard, cast, civic and world budget suites pass, including the hospital tier at all sampled zooms.
- First-load code: **1,074,687 bytes test / 1,073,842 bytes production** (limit 1,100,000).
- Chrome phone/desktop screenshots were reviewed for the garden memories, bench stages, classroom controls and
  hospital model. The optional WebKit binary is unavailable on this machine; Safari was not verified in this pass.
- **12/12 local production contexts pass**: four learning/school, four business/civic and four existing optional
  discovery/food flows. They use normal UI/autosave with no `window.farm`, isolated profiles, both languages and both
  viewport sizes at 130% text. The release PR records the subsequent live verification and deployment links.
