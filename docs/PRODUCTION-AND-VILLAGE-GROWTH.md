# Parallel trays, useful village shops and civic growth

Logic slice, 2026-10-09 (Asia/Seoul), branch `codex/production-village-growth`, starting from main `4377129`.
Claude's subsequent tree-fruit visibility pass, PR #25 (`1add9a4`), is merged into the release branch too.

## Handoff reconciliation

Claude's PR #23 item art was already included in main. Ingredient source help, a return path to the request, and suppression of competing guidance shipped in PR #24. AR-010's world models and trail rules shipped together in PR #18. Those two tasks require no duplicate implementation or merge.

## What changes

**Production:** every existing or purchased tray works independently, for every production building. New jobs begin immediately; short jobs can finish and be collected while a longer job continues. Ready output keeps its tray occupied until collected. Buying a tray does not change already-paid work. Save version 10 gives jobs stable tray IDs and preserves the exact completion times of legacy serial batches. Their future start times are explained in the panel; new jobs use parallel trays. Hurry affects one running tray, and a backward device clock cannot lengthen its duration. Recipe/help clocks use the same worker-adjusted duration as the action.

**Orders and story:** herb, ginseng, oranges, coconuts and all current factory products already existed in the random pool. The fix verifies actual renewable sources throughout a product's ingredient chain, including working makers, beds, planted trees, animals/feed, and learned recipes. Existing saved cards remain intact. Easy orders no longer count the same stored item several times. The bilingual Lan/Pip/June picnic scenes from PR #24 already connect the two factories to people; this release preserves those and adds optional civic/company memories.

**Village shops:** tap the existing fish/snack/garden kiosks at the lake or the plaza stalls, or open **Today → Village shops**. Decorative copies of the same shop share one saved request. Each offer discloses the goods, available quantity, base value and actual payment; confirming sells exactly that basket from unheld goods. Price is `ceil(base unit value × 1.35)` per unit, with no XP. A completed sale opens the next offer after 15 minutes; a free replacement takes 5 minutes. Offers never expire and nothing sells in the background. The fish buyer opens at level 2, snacks/plaza at 4, garden at 7. Only obtainable registered goods enter new requests. Missing-good help returns to the same shop. World taps and previews spend nothing.

**Civic/company:** from level 10, **Projects → Village growth** previews the hospital, police post and office. Police/company rebuild at their old civic sites; the preview explains and locates the one-tile entrance path. The hospital upgrades the existing clinic. Company work unlocks with two different working food factories. Arrived adults can be invited as one worker and one manager; children and travelling families cannot. The worker shortens new batches at an assigned factory by 10%. The manager helps confirm a finite plan of up to three batches after showing all inputs. There is no recurring wage or unbounded offline input consumption.

The three company requests repeat with bounded saved sequence counters, using an actual empty fleet truck and its capacity, travel and collection rules. Each pays once per trip; each story becomes unread once only. A police bonus is quoted at dispatch. Partial imported records do not recreate lost cargo/payment or trap subsequent requests. Earned memories remain readable even if the company or its factories later need repair. A used civic benefit cannot be kept while undoing its full purchase price. Exact costs and payoffs are recorded in [VILLAGE-GROWTH-PLAN.md](VILLAGE-GROWTH-PLAN.md); actual crop/factory/fleet margins are in [PRODUCT-CHAINS.md](PRODUCT-CHAINS.md).

**Menu work:** orders show circular item pictures with actual available/required counts. Full-size icon URLs remain until Claude supplies the small variants and new menu pictures; [AR-012](ASSET-REQUESTS.md) defines that integration contract. This release does not claim to complete the full status-stack/menu redesign.

## Art ownership and remaining work

Existing town models support the first police/company tier. Hospital tier art, worker outfits and label seals are requested in AR-011. Logic copied only the two authorized placeholder icons (clinic → police, market → company), with provenance in the request. Claude retains model generation, icons, colors, lighting and effects. The original checkout's unfinished mobile edits remain untouched.

Later hospital/police/office tiers, free-text company names, separate branded inventory products, automatic manager restocking, apothecary goods, supermarket/department store, new roads/entertainment, energy/skills and later story chapters remain planned. This slice keeps the current early economy and school pace.

## Validation and release

Validation completed on the integrated release:

- **355/355 native tests** and all pace targets pass; the steady simulation opens the school and clinic on day 3.
- **All 23 component browser suites verified.** The first complete run exposed an old cast-test setup that waited for distant crowd animations while still at the new opening close-up. Selecting its intended zoom before waiting fixed the test, without relaxing assertions. Cast, art, orchard, production/shops and civic suites passed again on the rebuilt integration.
- **28/28 smoke checks** passed, including phone/landscape/desktop, source icons, save/reload, first session, Vietnamese layout and rendering budgets.
- **Eight production acceptance contexts** passed: four new hospital/staff/company/shop flows and four earlier guidance/land/picnic flows, each in English/Vietnamese at 390 and 1280 px. They use normal controls and autosave, no debug hooks. New panels also fit at 130% text size; their pictures decode correctly.
- **Production first-load code: 1,094,983 bytes**, below the 1,100,000-byte cap. Civic phone checks cover seven zoom levels, peaking at 78 draws and 234,934 triangles. The broader dense-orchard checks remain below 120 draws and 300,000 triangles on phone and desktop.
- Review fixes include partial-import clinic refund protection, permanent accounting for used office/police benefits, unsupported shop goods, accurate backward-clock waits, and an autosave notification when an idle shop generates a new request.

Tests use isolated storage, not the user's farm, and browser viewports rather than physical phones. The mobile support suite exercised Chromium; WebKit's executable is not installed in this environment. The final clinic refund guard was covered by the final native run and production build/acceptance after the browser regression.

The release PR is the authoritative record for exact-head CI, authorized merge, Pages deployment and live acceptance. Its deployment result is recorded only after production verification. Dedicated art/remaining scope stays in AR-011/AR-012 and the sections above.
