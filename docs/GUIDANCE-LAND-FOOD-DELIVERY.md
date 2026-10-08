# Ingredient help, a sunlit clearing and a picnic menu

Logic delivery, 2026-10-08. Baseline: main `b0172d6`, including Claude's item-art PR #23. The isolated `codex/guidance-land-contracts` worktree keeps the original checkout's unfinished mobile edits intact.

## What this completes

This is the bounded follow-up to steps 2, 4 and 5 of [the comparison plan](REFERENCE-GAME-COMPARISON.md). Saved advice/news was already live through PRs #6/#7. Opening composition and the staged porch/pond discovery models were already integrated through PRs #9/#13/#18; those assets were not waiting for another logic implementation.

### Ingredient guidance

- Tap an order's goods or preparation steps, a recipe's **Find** button, or a picnic request's ingredients. The card explains current inventory, project-held goods, what remains missing, the actual source, its price or prerequisite, ready/queued output, recipe inputs and useful uses.
- Follow the exact existing maker, bed, animal home or pond, or preview the appropriate catalogue category. This never plants, harvests, crafts, repairs, buys or delivers automatically. An armed harvest tool is disarmed before previewing a bed.
- Nested ingredient cards retain a back stack. A return control takes the player back to the original order, producer or picnic request, including the original order's position. Both languages use the same facts.
- A sheet suppresses the tutorial pointer and incidental speech. Earned story scenes wait until the sheet is closed; their saved acknowledgment still belongs to actually seeing/dismissing them.

### One covered-land branch

- **Sunlit clearing** appears in Today/Projects from level 4, and an offered parcel can always be inspected directly on the map. The preview discloses the existing **500-coin**, level-4 price, the **16 × 16** parcel, an included clear **4 × 4** patch, normal further clearing prices, current bed/recipe limits, and the optional keepsake.
- Purchasing still permits only one extra parcel. The branch defaults east of home but follows whichever second parcel the player buys. Existing saves that chose another parcel retain that land and can discover its new memory without buying again.
- The whole owned parcel is immediately usable. A small planting-marker clue remains locally covered until the player explicitly inspects it for free. It uses existing wooden-post/grass/bush art; no new model download or paid clearing gate is added.
- Inspection reveals an Ada/Pip/June memory and gives **one bench in storage**. No coins or XP. Reading, repeating, changing language or reloading cannot grant another bench.
- The decorative clue chooses empty grass and avoids buildings, paths and fences. It never reserves building space; if the player builds there, it moves to another safe spot. Fully occupied old parcels retain the same panel inspection. Loading changes no old terrain, objects or rewards.
- The earlier picnic trail remains available without buying land. This is not general scenery-tree harvesting or an unrestricted expansion of the map.

### One connected food story

Lan proposes **A picnic menu** after the Tran family's arrival and homecoming chapter. The menu is normally surfaced from level 6; a farm already holding the required finished goods may participate sooner. Finding the earlier picnic ribbon changes Lan's invitation but is not a mandatory gate, so old empty-start farms can also participate.

| Batch | Goods delivered | Payment | Production connection |
|---|---|---:|---|
| Something bright to pour | 2 carrot juice | 70 coins | Carrots → juice press |
| A basket of fresh noodles | 4 noodles | 150 coins | Wheat + eggs → noodle factory; two portions per batch |
| The last things for our picnic | 2 instant noodles + 2 carrot juice | 300 coins | Fresh noodles + carrots → instant noodles; another juice batch alongside |

Each batch has its own saved scene, ending with the family sharing the actual food at the pond. The payoff is a replayable scene, not a new animated gathering or chapter 6. Existing villagers, buildings, recipes and icons are reused.

Accepting is free and creates no expiry, inventory reservation or penalty. Prerequisites account for shared stock, project reservations, queued goods and already-fed animals. Storing or breaking a maker preserves the request and explains recovery. Finished goods can still be handed over without rebuilding their old maker. Delivering consumes only the specified unheld goods and pays once.

The **520 coins total** are payment for manufactured goods across three finite requests; they do not increase the opening lucky-find budget. They grant no extra delivery XP and do not increment normal order counts, advance village projects or resolve the Ellis/water story. New earned memories contribute to the existing Today unread badge and remain in the Album.

## Saves, review and lane boundaries

Save version 9 adds `landDiscovery` and `contracts` to each local profile. Stable IDs and independent earned/read records preserve bilingual behavior. Secondary `firsts` markers protect completed rewards if an imported primary record is missing; successful deliveries/discoveries repair invalid backup values. Later surviving contract completions retire missing earlier stages without inventing scenes or paying again.

Review fixed remaining-vs-total ingredient counts, catalogue categories overridden by tutorial defaults, ready batches blocked behind earlier queued output, repair project prerequisites, eggs from broken coops, invalid reward backup markers, and future-batch details closing during redraws. The new story and Vietnamese are included in translation and speaker-pronoun checks.

Codex owns these rules, UI behavior, story and translations. Claude retains models/icons, palettes, lighting and effects. Shared behavior edits and baseline are recorded in [ASSET-REQUESTS.md](ASSET-REQUESTS.md). The new view uses existing models only.

## Validation and release record

The final game tree at `e533d96`, including main `b0172d6`, passed:

- **304/304 native tests**, including story voices, translation coverage, migration, action atomicity and reward accounting.
- **Pace simulation and all pace targets**; steady school and clinic both day 3.
- **All 21 component browser suites**, including **15/15** new guidance/land/food checks, plus **28/28** main smoke checks. Phone budgets remain within 120 draws and 300,000 triangles at every tested zoom.
- Test and production builds: **1,069,742 / 1,068,656 bytes** of first-load code respectively, below the 1,100,000-byte limit.
- **4/4 local production acceptance contexts**: English/Vietnamese at 390 px and 1280 px, using the real menu and controls without the debug hook.

Browser acceptance uses isolated saves, never the user's farm. It covers actual food production/delivery, ingredient return navigation, world clue taps, one-time rewards, saved replay and pointer/speech suppression. Screenshots were reviewed after their images decoded. The same production acceptance script (`tests/optional-branches.production.mjs`) is used after deployment. [PR #24](https://github.com/buicongnguyen/Farm_village/pull/24) records the exact released commit, Pages result and live acceptance; the documentation-only follow-up does not alter the tested game.

## Still separate work

Project-only energy and a learned skill, a substantial repair project, meadow/dairy, classroom activities, vehicle restoration, company hiring and bulk contracts, hospital/police and later chapters remain separate planned releases. The current food requests do not claim to implement those systems. Parallel bakery slots and the lighthouse coast still require the user's choice. Playful localized character names remain a proposal, not a runtime rename.
