# Changelog

## 0.3.0 — Restore Hollowbrook (in progress)

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
