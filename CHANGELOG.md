# Changelog

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
