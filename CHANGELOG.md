# Changelog

## Ingredient guidance, a sunlit clearing and a picnic menu (2026-10-08)

- Orders, recipes and picnic requests explain where missing goods come from, current blockers/costs, queued output and project-held stock. Source previews never spend or craft; a return control preserves the original request. Sheets suppress the tutorial pointer/incidental speech and defer earned story scenes until closed.
- Restored farms can preview one level-4, 500-coin expansion with an included clear 4 × 4 patch. An optional local planting-marker discovery gives one stored bench and a saved bilingual family memory. Older second-parcel choices remain usable; loading never changes their terrain or pays a reward.
- Lan's optional three-batch picnic menu connects carrot juice, fresh noodles and instant noodles to three saved scenes. Real deliveries pay 70, 150 and 300 coins once, with no deadline, extra delivery XP or normal-order-count changes. Finished goods remain deliverable after a maker is stored or breaks.
- Save version 9 preserves per-profile progress/read state and repairs malformed backup reward stamps on successful new claims. Earned memories use the existing Today badge and Album. English/Vietnamese use identical requirements and accounting.
- Includes Claude's latest item art through main `b0172d6`; the logic changes do not edit art assets. See [scope, review and release checks](docs/GUIDANCE-LAND-FOOD-DELIVERY.md).

## A picnic discovery trail and story-order fixes (2026-10-08)

- After the first delivered order, explore the farmhouse porch, follow a note to the pond, and bring a picnic ribbon home. Three optional English/Vietnamese scenes form one happy family memory; completing it grants one flowerpot in storage. Start from Today or the farmhouse's **Explore the porch** menu.
- Save version 8 keeps each farm's steps and read state, with durable completion markers. Reading, replaying, reloads and migration never grant another flowerpot. Only earned unread memories contribute to the Today badge; queued cards are acknowledged when visible.
- Personal favours now wait for the requesting household to arrive. Old premature requests remain saved and return after arrival without blocking three usable goal slots.
- Stored and rebuild-credit placement previews reflect the actual charge, so the earned flowerpot is visibly free to place.
- **AR-010 integrated:** Claude's PR #13 models and pink ribbon icon are connected to saved progression in [PR #18](https://github.com/buicongnguyen/Farm_village/pull/18). The porch box appears after the first order; its clue reveals the pond cache. World taps open explicit controls, state changes swap the models, and optional download failure leaves menus usable. Close-up targets remain finger-friendly; distant targets preserve ordinary fishing taps.
- **Validation:** the combined AR-010/logic tree passed 261 native tests, pace targets, all 19 component browser suites and 28/28 smoke checks. All 8 discovery checks passed after the final tap-target correction; four English/Vietnamese phone/desktop contexts passed local production acceptance. After the final factory merge, native/pace, discovery/art/orchard checks, all 28 smoke checks and four local production contexts passed again. The full 19-suite run preceded that final content merge. First-load code: 1,025,453 bytes test / 1,024,378 bytes production. [PR #18](https://github.com/buicongnguyen/Farm_village/pull/18) records deployment/live acceptance. Covered land, skills/project energy and later chapters remain planned; see [delivery and story review](docs/DISCOVERY-TRAIL.md).

## Playful local names — proposal only (2026-10-08)

- Replaced the withdrawn formal-name proposal with the user-confirmed playful/home-name direction. The [revised naming plan](docs/CHARACTER-NAMING-PLAN.md) records the inspected Zoo Pet reference, language sources, and candidate English/Vietnamese/Korean/Japanese aliases for the current and planned cast. Individual names are still proposed; runtime names, saves, story behavior, and the live game are unchanged.

## Food factories: juice press and noodle factory (2026-10-08)

- **Juice press** (level 6, 600): apple juice (40), carrot juice (26), orange juice (70). **Noodle factory** (level 8, 1,200): noodles (2 for 4 wheat + 1 egg, 30 each) and instant noodles (95). The same farm goods, worth 2–3× after processing. Models, product icons and Vietnamese names.

## Premium crops and the village growth plan (2026-10-08)

- **Healing herb** (level 7, 15 min, sells for 45) and **ginseng** (level 9, 40 min, sells for 120): new crops with their own growth-stage models and icons, the first step of `docs/VILLAGE-GROWTH-PLAN.md` (premium crops → services → food factories → shops → town → leisure).

## Icon render v2 — art lane (2026-10-08, PR preview)

- **Every icon re-rendered with richer light:** all 92 icons now come from a Cycles rig with a warm key from the top
  left of the picture, a soft fill and rim, a low warm sky and a hidden bounce floor, so goods, buildings and people have
  painted depth instead of a flat, pale look. Glossy fruit and eggs, matte sacks and bread.
- **Icons keep their edge in small chips:** a round outline about 7 px at 256 replaces the thin 2 px ring.
- **Consistent framing:** camera presets per kind of icon (goods, dishes, tokens, tools, fish, buildings) and more room
  around goods. The research and the remaining item-model plan are in `docs/REFERENCE-NONGTRAI.md`.

## Reference pass: opening composition and item art — art lane (2026-10-08, PR preview)

- **A first picture of home:** the restored village opens on the home farm, at full detail. A wide screen shows the
  farmhouse, its new stone forecourt, the road, the six beds and the mill; a phone keeps all six beds clear of Ada's card.
- **Calmer tended land, quieter wilds:** owned farm land is a calmer green with a faint plot grid; unbought land and
  the countryside lean olive. Crops, roofs and people stand out without louder colours. No new draw calls.
- **Farmhouse forecourt:** small warm stone tiles from the porch toward the road, joined to it by a step of path, with two
  flower planters and a bench.
- **Item icons:** a full wheat sheaf, a loaf and roll on a board, corn bread in a skillet, burlap feed sacks, eggs in
  a nest, and the four fish rendered by our own icon rig. Before and after in `docs/reference-pass/`.

## The truck fleet — art lane at the user's request (2026-10-08, PR preview)

- **More trucks for a growing farm:** buy a 2nd truck (400 coins, level 4) and a 3rd (900 coins, level 6) in the
  market panel. Each runs its own 50 s trip and pays the goods' value × 1.2; Bigger trucks now upgrades all of them.
- **One-tap loading:** "Fill the trucks with spare goods" loads every truck at the market, most plentiful goods first,
  keeping order needs, project goods, all feed and a seed per bed. "Send 3 trucks" sends every loaded truck; Collect
  takes all their coins at once.
- **A full barn has a next step:** at 85 % the Next chip offers to load the trucks, then to send them, then to collect.
- **On the map:** the trucks park in a row along Village Street (red, teal and sunny-yellow pickups, the new two in the
  late `decor.glb`) and drive off in a line; the status row counts the trucks on the road.
- **Compatibility and checks:** the first truck is still `s.truck` (extra trucks in `s.truck.fleet`, validated on
  load), so older saves and one-truck play are unchanged. New `tests/fleet.test.mjs` (8 rules tests) and
  `tests/fleet.browser.mjs` (4 phone/PC checks: buy, fill, send, drive, collect, Vietnamese panel, budgets).
  Screenshots in `docs/truck-fleet/`.

## Adaptive village ideas — PR #6 (2026-10-08)

**Live:** [PR #6](https://github.com/buicongnguyen/Farm_village/pull/6) merged as `a8b45988a8ff1549b10a164c48a5fda814b23eca`; [Pages deployment 37733300401](https://github.com/buicongnguyen/Farm_village/actions/runs/37733300401) passed. Production acceptance passed in eight isolated browser contexts: four fresh starts and four using explicit save fixtures, each covering phone-sized/desktop viewports in English/Vietnamese. UI/art assertions and page, console, HTTP and request-error checks passed. AR-009 is accepted and closed. These are browser viewport checks, not physical-device tests. The baseline release remains PR #4 at `ab6b230`.

- **Useful choices:** 18 authored topic types react to actual orders, bread surplus, missing ingredients or makers, queued and finished output, fruit-stand stock and income, affordable stand/queue options, and optional fishing. June uses the same current facts as the cards. English and Vietnamese share eligibility and saved topic/context IDs; 72 bilingual strings cover the new content and controls.
- **Persistent advice:** Today combines new unread ideas and discoveries into one numeric badge. Reading clears the unread contribution; postponing survives reload and language changes, and an eligible postponed idea can be brought back. Stale suggestions are rechecked before display and before following them. “Show me” opens existing controls; it never queues work, delivers goods, repairs, places buildings or spends coins automatically.
- **Visible conversation:** automatic June advice waits while a panel, modal or guide is visible, so speech behind those interfaces cannot mark a topic read. The contextual-dialogue browser regression checks this guard alongside ordinary tap/read behavior.
- **Earned memories:** first bread, school and clinic celebrations are earned once and retained in the Album. Character introductions gate school/clinic speech. Save version 7 preserves existing farms and retires known legacy milestones without inventing celebrations or paying extra rewards. This pass adds no story chapter beyond the existing chapter 5.
- **Validation:** 229 native tests pass on the combined advice/art tree; pace targets pass with steady school and clinic on day 3. All 17 component browser suites passed on the advice build. Smoke checks: **28/28 passed on the advice build**. Final first-load code: **1,005,608 bytes** in the test build and **1,004,534 bytes** in production, below 1,100,000. AR-009 integration checks: **English/Vietnamese advice and discovery suites passed again after integration; 12 keepsake cards passed on phone/desktop in both languages (fit, exact 256 px icons, no extra payment, no GLB request and no errors)**.
- **Discovery art integration:** Claude's AR-009 delivery is integrated. Discovery cards, Today/Album entries and find notifications use the three new WebP icons (`lucky_tin`, `lucky_button`, `lucky_box`); the street thank-you retains the existing envelope/coin treatment. These views do **not** load `discovery-props.glb`. The packed GLB is registered and available for a later 3D presentation. Art-owned source, effect appearance and reward behavior are unchanged by this wiring. The art delivery note below records Claude's asset work; the current runtime behavior is described here.
- **Remaining scope:** covered land, item-use cards, skills/project energy, meadow/dairy, vehicles and later story chapters remain planned. The new [reference-game comparison](docs/REFERENCE-GAME-COMPARISON.md) records observed reference behavior separately from proposed Hollowbrook work.

## Profiles, small discoveries, and review follow-up — live (2026-10-08)

[PR #4](https://github.com/buicongnguyen/Farm_village/pull/4) is merged and live at `ab6b230`; [Pages deployment 37728932775](https://github.com/buicongnguyen/Farm_village/actions/runs/37728932775) passed. The orchard logic and AR-001 look pass remain live through PRs #1 and #2.

- **Review fixes (`b03c38c`):** tapping a visitor during arrival no longer breaks later speech, and observations use the farm's state when spoken. Saved heart/charm news keeps milestone counts separate from timestamps. The follow-up removes obsolete hen translations, checks the canonical animal names, and describes Pia as a young neighbour. English and Vietnamese share the same adaptive selection rules; proposed human renaming remains documented only.
- **Farm profiles:** three independent local farms, with previews and switching from a cottage button or Settings. Saving, export/import, reset, recovery, and discovery history belong to the selected farm. Switching saves the departing farm and stops its autosave lifecycle. Incomplete imports are refused; corrupt saves use a healthy backup or offer recovery. Reset/import retain their intended destination when another tab changes the selected profile.
- **Four small finds:** keep the 500-coin start and add at most 110 coins per save: 20 on the second successful catch, 40 and a local pond keepsake on the tenth, 30 after two actual owned-rock clearances, and 20 when Village Street's first restoration finishes. Starting repair and repairing School Lane do not qualify. The keepsake does not advance Ellis's letters or reveal the sluice story.
- **Saved discovery memories:** optional cards in Today and the Album, a badge counting earned unread finds, and saved acknowledgment. Awards happen with successful work; opening cards, repeat taps, reload/import, and animations cannot pay again. Legacy saves retire known passed fishing/street milestones without money or invented album memories; rock counting starts with newly observed rock clearances.
- **Validation:** 211 rules tests and all pace targets pass; steady simulation reaches school and clinic on day 3. All component browser suites pass after targeted fixture corrections, plus 28/28 smoke checks. English/Vietnamese phone cards, save recovery, read-state persistence and phone/PC rendering budgets pass. First-load code is 986,313 bytes in the test build and 985,234 in production, below 1,100,000. The local test server was stopped.
- **Test reliability:** refresh the Next-chip fixture after changing crop readiness; check that art-fixture trees were actually planted on cleared ground; measure fruit/leaf/glint emission without counting unrelated particles. Migration and fishing tests explicitly account for schema version 6 and the separate discovery payment. Art appearance is unchanged.
- **Scope at this release:** see [Profiles and discoveries](docs/PROFILES-AND-DISCOVERIES.md). This release did not include persistent adaptive advice cards, covered-land progression, skills/project energy, meadow/dairy, or later story chapters. AR-001 is complete; [AR-009's discovery brief](docs/CLAUDE-DISCOVERY-HANDOFF.md) is the next art handoff.

## Planning and coordination — not a gameplay release (2026-10-08)

- **Logic lane:** consolidated the design and evaluated research, prepared the scoped Claude AR-001 handoff and Codex task list, and aligned the shared rules with the user's project-only energy decision. Clarified shared effect ownership, coherent asset delivery, and integration checks before a production merge. The user subsequently authorized the first logic pass below; larger expansion systems remain planned.

## Art lane: lucky-discovery keepsakes (AR-009, art PR, not released)

- **Keepsake props and icons:** three small original Blender keepsakes in a new kit, `discovery-props.glb`, that loads
  only when a discovery shows one: `lucky_tin` (the pond tin), `lucky_button` (the brass fish button with a pond
  engraved on its back, against its cloth pouch) and `lucky_box` (the trinket box with a smooth pebble on ribbon-tied
  cloth). Each is handheld size and under 1,200 triangles, with a matching 256 px icon and a restrained golden glint.
  Registered in `KITS['discovery-props']` and a `keepsakes` icon list; the logic lane switches its stand-in discovery
  icons. `street-thanks` needs no new art: it keeps the existing `mail` envelope glyph and coin. No new loads for
  players: `farm-kit.glb` and `decor.glb` are unchanged. Comparison images in `docs/discovery-props/`.

## 0.4.0 — The orchard (live 2026-10-08, PRs #1 and #2)

- **Look pass (AR-001, art lane):** a deeper, calmer lawn with paler warm paths and darker path edges; a cool daytime fill against the warm sun; a green dusk instead of olive; turquoise water; stronger orchard greens. Fruit picking gets its own burst, sound and "+n"; a golden carp gets a gold ring and star fountain. Coins fly to the wallet only when money is paid: takings waiting at a stall or the fruit stand just glint there. Coin markers get a dark backing and a warm glint. Comparison images in `docs/look-pass/`.
- **Contextual conversation:** June offers actions the farm can currently support, with different consecutive tips when another useful action exists. Ordinary NPC taps keep conversation available alongside the order board. Bo and Marisol notice the restored school and clinic; Mai and Gus use eligible farm observations. Pip names the first two hens consistently and distinguishes other animals and goods. The player responds silently.
- **Story order:** Ellis's clues arrive after the preceding letters are read. Existing read mail keeps its history; blocked unread clues show a hint and cannot reveal their contents. The water-rights thread no longer claims a nonexistent key quest or Ellis homecoming. School/clinic friendship scenes select appropriate dialogue while preserving their original rewards and save compatibility.
- **Collection rules:** cherry-only farms can receive generic fruit goals; Sam's apple favour remains apple-specific. Harvest and catch events report actual stored/overflow quantities, and collected takings identify their source. Fruit picking gets a sound cue; the first rare species catch gets a distinct cue. Refused fishing/collection actions leave state untouched, and invalid stall stacks cannot sell forever.
- **Art handoff (first logic pass):** documented additive event contracts for Claude's collection effects without changing models, icons, palettes, lighting or visual-effect handlers. Claude subsequently delivered the collection effects and corrected stall-sale wallet feedback in AR-001 (PR #2); PR #3 records production verification and closes that request.
- **Regression coverage:** added rules and English/Vietnamese phone checks for clue sequencing, contextual scenes and conversations, cherry goals, actual collection accounting, duplicate refusals and save/reload. Translation coverage includes new scene and conversation variants.
- **Historical validation for the first logic pass:** 175 rules tests, all component browser suites and 28/28 smoke checks pass. School pacing remains green (steady day 3). Production first-load code is 967,982 bytes of the 1,100,000-byte budget; tested phone/PC zooms remain below 120 draws and 300,000 triangles.

- **Vietnamese review:** corrected misleading actions, item names, crop counts, idioms and family forms of address across the interface, tutorials, letters and heart scenes. Biscuit keeps one name; clinic, charm and garden terms agree across panels; adult avatar choices say Nam/Nữ. The market cart label now agrees with its next-day return.
- **Localized rendering:** project locks translate their project names, repair status translates the full sentence before shortening it, and tapping visitors fills their dialogue placeholders. Hourly rent uses Vietnamese decimal commas. Repair news now names repaired roads and the farmhouse without crashing the Today panel.
- **Language checks:** added restoration, roadmap goals, quests, shared chatter and Pip's fallback reactions to translation/voice coverage, kept tutorial emphasis balanced, and added phone checks for the corrected dynamic text. Production smoke checks exercise both languages on phone and desktop.

- **Roadmap:** tap the village name for the current stage, deed progress and the next three unlocks. The goal stays in the status stack. Future meadow, dairy and cat features are explicitly marked as planned.
- **Orchard:** cherry trees open at level 4 for 70 coins, give three cherries after 25 seconds and regrow in 40 seconds. A fruit stand takes fruit stacks and pays a small premium as visitors buy; goods and takings persist across saves and away time. Takings have a map marker and a one-tap Next action.
- **Biscuit:** a kennel at level 5 gives the existing dog a job: run to grounded crows, bark them away and return home. He avoids fences and buildings and costs no upkeep. Reduced motion keeps crow protection without the chase animation.
- **Clinic and chapter 5:** after the school and four settled households, donate 12 bread and nine cherries, then rebuild the clinic for 600 coins on the civic row. Dr Hazel returns; Marisol is the nurse and Grace has a vet room. New orchard, kennel and clinic story moments keep each speaker's Vietnamese voice.
- **Night:** villagers leave an unfinished errand at dusk and walk directly home.
- **Saves:** v0.3 farms keep their money and buildings; an already-seen chapter 5 teaser becomes chapter 4 so the real clinic ending can play. The fruit stand has separate stock and takings.
- **Art and phones:** original Blender cherry tree, paired cherries, fruit stand and kennel; rendered icons and Hazel's portrait. Middle detail begins at span 40, distant detail at 90; wider distant batches keep the complete orchard and clinic inside 120 draws and 300k triangles, including detail boundaries.

- **Review fixes:** stored or demolished fruit stands settle only sales from time they were open; corrupt or partial saved stacks are normalized and cannot sell indefinitely. Cosmetic repairs preserve the sales clock, and stored or rebuilt trees use the full regrowth wait. Pet homes never wear out, and old kennel wear is cleared on load.
- **Build rules:** refused undo leaves its entire stack intact; undo cannot retain a new level while refunding its cost, or refund a harvested tree or used stand. Malformed land addresses and inherited object keys are refused before any changes.
- **Progress and story:** Homecoming stays current until the mill, coop and first-family goals are met. Future story moments cannot be acknowledged early; chapters queue in order, including when the first family arrives before the hens. Closing a chapter cannot open overlapping cards.
- **Biscuit and checks:** the dog replans when buildings or fences block his route and resumes after an obstruction is cleared. The simulation now sells spare fruit at the stand while preserving goods needed for projects and orders.

## 0.3.0 — Restore Hollowbrook (in progress)

- **Village life (v0.3f):** fishing happens at the village pond by the farmhouse (no pond on the farm at the start); Willowmere's 3D fish swim nose first under the water with swinging tails; tap a person, then the pond, and they go fishing (you cast a line when you arrive). Order cards list what to plant, make, collect or catch with a link to each place, the Next chip names the first step, and refusals say how to get past them. A school lane and civic row lead to the old school, clinic, police station and company; tap one for its name, what will rebuild it, and a one-time tidy-up. People say different things through the day (48 new lines, dealt so they rarely repeat). The barn upgrade costs 100 every time and adds 100; the village name shows how many projects are done and opens them.

- **Cute trees and warm colour (v0.3e):** new fat, round, bright-green trees (round, apple, peach, blossom, pine) drawn by our own Blender pieces; warmer, brighter ground, sky and light. **Lighter chores:** from level 3, June brings in up to four ripe beds and sows them again and Pip fetches eggs and milk every two minutes while you play; an "All" button sows wheat in every empty bed. Evaluation of fun and stress in docs/EVALUATION-v0.3.md. The "Next:" chip now does the chore in one tap (harvest every ripe bed, pick all fruit, collect eggs, goods, takings, rent, reel in), "All" sows the last crop you chose, and when everything is busy the chip says to enjoy the view.

- **Goals and a reason to return (v0.3d):** three live goals (counters and villager favours) with a weekly village goal; a free daily hurry token (and one more from each weekly goal) that finishes a growing crop, tree, repair, hen or bake; Ellis's letter trail (five new letters) ending in a school festival after twelve goals; fish and fruit albums; a name, a boy or girl figure and a shirt colour for you in Settings; old saves get the pond and the market square; the barn starts at 200; hens wander the farmyard; butterflies are smaller and in vivid two-tone colours; coin markers are tiny and shiny; smaller HUD buttons.

- **Quick and generous (v0.3c):** crops, trees, hens, feed and bakes now take 20–55 s; only a few premium things (pumpkin, peach, cow, carrot cake) take about 5 minutes. Beds cost a few coins and rise very slowly. Levels are gated by a steeper XP curve and the school by more work, so the story still takes days. A full barn sells the surplus on the spot and you can sell any good from the barn. Rent is worth having and families leave tips. The fence rule is gone. The order board is compact with a short Sell button. Turn and settings are at the top right, a status stack at the top left, the album lives in Settings. Coins over ripe things are smaller and shiny. See docs/EVALUATION-v0.3.md.

- **Playtest round 2 (docs/PLAN-v0.3b.md):** floating gold coins over ripe crops, fruit, eggs, goods, takings and bites, and red "!" over broken buildings; a "Next:" chip with the one most useful thing to do; you are on the farm as the main character and walk to what you tap; a villager with an order for you opens the order board when tapped; villagers call on each other's cottages and fishing folk sit by the pond; a fish pond at the start (cast a line, wait, reel in perch, carp, catfish or a golden carp; sell by truck; fishing villagers leave fees); round and pine trees; apple and peach trees come sooner and ripen faster; the hens need no fence in the restored village; the crop menu can be changed after choosing one (a press that does not move is a tap); the language button lives in Settings only.

- **The market square and the delivery truck:** the old market stands run down by the village street. Repair it and the street, then load spare goods onto the little red truck, send it to town (about a minute and a half) and collect more coins than the goods are worth. Bigger trucks carry more.

- **A village that is already there:** a new game opens on Hollowbrook as it stands: sown beds, a feed mill, coop, bakery and three cottages
  run down, a ring road with damaged stretches, a worn farmhouse, 500 coins. Nothing to build before the fun starts.
- **Repair instead of build:** tap a broken thing and repair it (coins and a short wait, with scaffolding). A repaired cottage welcomes the next
  family. Roads and the farmhouse can be repaired too; the farmhouse can be upgraded for more barn room.
- **Gentle wear:** buildings tire very slowly while you play (never while you are away), never stop working, and cost a few percent of rent;
  one tap mends them. Neighbours sometimes mend something for you.
- **Demolish and rebuild:** a Demolish tool gives part of the price back and leaves a half-price rebuild.
- **A new first session:** Ada guides you through harvest, the first order, the repairs, the coop's fence, the hens and the first cottage.

## Review fixes (2026-10-07)

A code and logic review of the whole game, each problem reproduced with a script before it was fixed.

- **Walking:** people and animals drawn without a skeleton (everyone at the default zoom) now swing their legs: a six-pose
  walk cycle is baked from each rig and chosen by the ground the walker covers, so feet keep time with the body.
- **Rules:** a refused action no longer leaves anything behind (a refused recipe or purchase used to create an empty
  production queue or animal list); `tutorial` and `chapterSeen` refuse bad input instead of storing NaN or marking
  every chapter reached; malformed lists and cell addresses are refused instead of throwing.
- **Clock:** moving the device clock back and forward no longer earns extra game days, the daily gift, wishes, weekly carts
  or neighbour visits; waits that are not stored as lengths shrink when the clock goes back.
- **Neighbours:** opening the game late no longer brings every missed visit at once (one visit per neighbour, so a story
  arc is not used up in one login).
- **Rent:** a family's "needs a path" rule now matches the placement rule (a door on the road counts; a cut-off path does not).
- **Saves:** an imported file with markup characters, or that is not a save, is refused; `?new` only works in test builds,
  so a stray link cannot replace a saved farm.
- **Interface:** the panels no longer redraw every second when they have no countdown, so a slider in Settings can be dragged.

## 0.2.0 — The AAA pass (2026-10-07, branch aaa-integrate, not yet published)

Hollowbrook raised toward a Hay Day-level look and feel: vivid warm colour, a living world, a cast that walks and
talks, a story with depth, and a first session that works by touch on a phone.

- **World:** saturated warm grass and meadows, ochre lanes, a brook with banks and a plank bridge, a village plaza with
  a well, woods and groves around the farm, ruins that show what the village needs next. Night is a moonlit very dark
  blue with black-blue water, warm windows and lamp pools.
- **Art:** crops in three growth stages (wheat, carrots, corn, pumpkins) with a dense golden wheat stand, raised beds
  of dark tilled soil, rebuilt feed mill with turning sails, bakery, coop and cow barn dressed on every side the camera
  sees, a picket-fence set, decorations (fountain, bunting, banner, flowerpots, street lamps, scarecrow, hay bales),
  cottages that are dressed as they are furnished, and animal pens with trodden earth and hay.
- **Cast:** rigged hens, cows, ducks and village people who walk the paths; June, Pip and the villagers talk in speech
  bubbles; neighbours Mai and Gus visit.
- **Game feel:** crops sway in one wind, things pop and bounce when planted, harvested and placed, flying icons, coin
  counter, confetti, smoke and sparkles; reduced motion calms all of it.
- **Story:** the chapter cards tell why Hollowbrook emptied and who Ada and Ellis are; story moments between chapters;
  hearts, gifts, daily wishes and heart scenes for every resident and for Ada, Cora, Mai and Gus (Ada's carry the
  Ellis thread, Gus's the lost Harvest Festival); letters in the mailbox that only name what has really happened.
- **New things to do:** the weekly cart at the farm gate (from the day after the school opens), fruit trees, the streak
  garden, village charm milestones, buying land at its For-sale sign, photo mode.
- **Interface:** warm cream panels with thick brown outlines and chunky buttons, rendered icons everywhere (no emoji),
  a title splash, a level-up card with the unlocks (extra tiles fold behind "+N more"), at most two toasts.
- **Phone first session (review fixes):** a tap on the map no longer also presses the menu button that springs up
  under the finger; Ada's guide folds to a chip above the build sheet and her hand points at the card to press; the
  build tabs get their own row; speech bubbles stay on screen.
- **Fairness (review fixes):** place-and-undo or store-and-place no longer mints XP; a finished project can no longer
  be undone for a refund; the daily gift waits while the barn is full; the stall only takes whole stacks; saves from
  v0.1 settle their story on load (no burst of old letters or replayed moments).
- **Robustness:** a first-scene file that fails twice shows a message with Try again; one failed download of the
  Vietnamese lines no longer breaks the language button; every accepted action is autosaved.
- **Budgets:** first load about 896 KB of code (limit 1.1 MB); a fully planted farm with every crop ripe stays under
  120 draws and 300k triangles at every zoom on phone and PC.

## 0.1.0 — release candidate (2026-10-07, not yet published)

The first playable version: from an overgrown farm to a village with a school.

- **Farm:** clear weeds and rocks, lay paths, place beds; wheat, carrots, corn and pumpkins grow in real time (wheat is
  always free to plant); plant and harvest by tapping and sweeping across beds.
- **Animals and production:** a feed mill and a coop with fenced hens; a cow barn after the school; a bakery with bread,
  corn bread and carrot cake; production queues with extra slots.
- **Selling:** the order board (villagers and neighbours), the roadside stall, and a barn with a capacity and upgrades.
- **Village:** the build order from clearing the land to the school; rental cottages with families who move in, pay rent
  and like charm; faded ruins show what comes next; "show the way" links each missing good to where it is made.
- **People:** families and the teacher walk the paths; Mai and Gus visit, help your crops, comment on what they see and
  offer a trade a day.
- **Every day:** the Today board with a daily gift (no streak to lose), what is ready, trades and village news.
- **First session:** chapter cards and Ada's step-by-step guide (each step skippable).
- **Comfort:** English and Vietnamese, day and night from your clock (or always daytime), sounds and music, text size,
  reduced motion, graphics quality, three save slots, export and import.
- **Under the hood:** a large 128 × 128 map drawn in 3D like a 2.5D game with chunked levels of detail; a fully planted
  64 × 64 farm stays within phone budgets; autosave; time away counts.
