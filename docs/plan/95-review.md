# Review after chapter 20: code, logic, story flow

Status: **done** (two passes, 2026-10-11); what is left is small and listed at the end · Depends on: chapter 20 · Before: the release pass

The story is complete, so this step reads the whole of it again as one thing. Three reviews were made from the code
(rules of chapters 11 to 20; the story's order and facts; how the player is led from chapter to chapter), and one
check was made in the running game (where the character can walk in Explore). What they found is listed here: what
was fixed in this pass, and what is left, with the reason.

## How the reviews were done

1. **Code**: every rules file of chapters 11 to 20, its panels and view hooks, read for real defects (state changed
   before a refusal, old saves, clocks set back or far forward, repeatable rewards, per-frame cost).
2. **Story**: chapters, scenes, letters, project steps, the Roadmap and the two story documents, read for order,
   people named before they arrive, facts that contradict each other, and text that assumes one chapter 11 answer.
3. **Guidance**: for every chapter, what the deed is and every way the interface leads to it.
4. **Walking**: the walking rules worked out for every cell at six stages of the game, and walked with the keys.

## Fixed in this pass

**Walking (Explore)**
- The brook's south bank is public ground: the stepping stones lead somewhere and the whole meadow can be entered.
- The two cells between the east fields and the east road are open.
- After the walk upriver (chapter 16) its path to the spring can be walked.
- Solid: the well, the windmill, the mailbox, the square's corner stalls, a kept meadow's hives, the county's plaque,
  a running fair's stalls and carts. Wild trees leave the newly open ground.

**Code**
- A clock moved back no longer locks the festival, the fair, the co-operative, the train, the hotel, the dividend
  or the quay's rent (`guardClock`).
- A long time away is not replayed guest by guest at the hotel, and does not add to the valley's name.
- The views ask a cheap "is a festival on" each frame (`festivalActive`), as they do for the fair.
- "Unlock everything" no longer throws a late farm back to the clinic step, and refuses a bad amount.
- A market day counts once even if the clock went back and forth.
- The Valley panel's water tip knows the spring; a very large goodwill is written short.

**Story**
- A letter tied to a chapter waits for the chapters before it (Grandpa Oak's "the gate is open" could come before
  the sluice opened).
- Chapter 10's card names no particular neighbours: the player may have hired others.
- The hotel's two scenes wait for chapter 13 (Nana Snow spoke before she had come).
- Mr Albright's last line fits both answers of chapter 11.

**Guidance**
- Village projects shows the story's step: optional steps (a quiet day at the pond, a second truck, the hospital)
  no longer hide it. The pond step and the hospital step have a button.
- The Build menu lists what has one fixed place (boat dock, festival stage) and what stands on the quay (quay
  house, hotel, halt); a tap leads to the place.
- The Roadmap leads to the quay; its stages follow the story (side goals are optional), with the levels they
  really need; nothing built is called "planned".
- The far bank's notice opens the quay. A pill shows while Grandpa Oak waits to walk upriver, and when the valley
  company can be founded. When the farm is busy, the Next chip names the story's step.
- Tester: a jump gives the level and the coins the chapter's own deed needs.

**The three decisions (owner, 2026-10-11: "think and suggest the improvement, and do it")**
- **Chapter 10 follows chapter 9.** The thirty tasks are counted from the day chapter 9 is seen (`s.story.handBase`).
  Chosen over moving the hands' unlock later, because hiring help early is good play; only the chapter waits.
- **Chapter 9 follows chapter 8.** The festival stage is a level 15 building, like the company office. Chosen over a
  story lock on the site, because a level is something the player already understands.
- **One account of the water.** The sluice was shut eleven years ago, when the mill closed, and the brook has run thin
  since. This spring somebody padlocked the gate and the brook dropped again: that is when Grandpa Oak went up. His
  letters and Constable Sage's already said this; chapter 16's card, his line at the spring and Rusty's line at the
  gate were changed to say it too.

**Land and upgrades (owner: "I did not see how to buy the land"; "an upgrade should show some change")**
- The Build menu's Farm tab begins with **A new field**: its price, how many of the sixteen are bought, and a tap that
  takes the view to the next field for sale and opens its panel. (Fields are sold one next to another, so the east
  side comes after the fields beside it.)
- The barn shows its room: hay, a silo, more hay, a second silo and a tractor stand beside it as it is upgraded.
  The trucks grow a little with every truck upgrade. (The farmhouse, the cottages and the hotel already changed.)

## Second pass (the owner: "fix the remaining defects and deploy")

- Chapter 19 on the cannery's side asks for the green cannery its card describes (the Green goals page shows it).
- Grandpa Oak's letters from upriver stop coming once he is home; the picnic plate scene is not played after that.
- Chip's line at the wheel, the pupils in the teacher's letter, "five farms in one valley" and Nana Snow's line.
- After a chapter's card a notice says what the story asks next and opens Village projects.
- "A third field" has a button; the valley company's needs and the prize's needs are buttons to where they are met.
- The story documents (`docs/JOURNEY.md` Acts III to V, `docs/STORY.md` section 4), `CLAUDE.md`, `AGENTS.md`,
  `PROGRESS.md` and `README.md` say what is true now.
- The first-load limit is 1,300,000 bytes: the story is complete, and the release pass moves story text behind
  `import()` (`90-release-pass.md` section 5).

## Third pass (the owner: "may you fix those issues", and what they met while playing)

- **A mark in the world.** A blue star floats over the place the story's step is worked on (the stand, the two boards,
  the quay and its lots, the sites, the next field): `storySpot` in `view/marks-view.mjs`. No star for an optional step.
- **Cards 5, 6 and 7 and the poster line** no longer get ahead of the story: the cherries are in blossom, the gatepost
  is too worn to read, Pearl reads something twice, Poppy frames the poster seen at the clinic.
- **Posts are solid**: the verge's lamps and trees, the lamps by the brook road and on the square, the quay's lamps,
  bollards and sale signs, the company's flag (`POST_CELLS` and the quay's helpers in `content/world.mjs`). The order
  board stays open: it stands on the road people walk to the dock.
- **The festival stage stood in two market stalls and a lamp.** The square's stalls are in its south corners now
  (two, not three) and the lamp moved; `tests/square.test.mjs` keeps the stage's ground free.
- **The Reel button** sat on Barn, Orders and Build on a wide window in the farm view; it sits above them.
- **Any field can be bought from its panel.** After the first extra field the land panel always showed the Sunlit
  clearing (the keepsake of the first one), with no Buy button. Other fields have their own panel: price, what it is
  for, that its trees are cut on purchase, and Buy.
- **The trucks leave what the workshops cook with**: three batches of every ingredient of every recipe the farm can
  make stay in the barn (`kitchenKeep` in `core/market.mjs`), for "Fill" and for the truck driver.

## Left open, and why

- Locked rows that only name a level ("Reach level N") still do not say how to level up.
- The farm gate's posts and the order board can be walked through (both stand where people must pass).


## Integration review - 2026-10-13 (feature branch, not deployed)

Reviewed main's notebook, surprises, fruit-tree and home-life updates through `73fa8f5` with the pending farmhouse work board (PR #111). Preserved both sets of action handlers, tick hooks and save normalization when resolving the integration conflicts. Art outputs are taken from main without modification.

Reproduced and fixed:

- **Trees:** Undo consumed grafted-sapling quality, and storage removed grafting, Mango-apple fruit and branch progress. Stored trees now keep those permanent properties in a bounded-by-inventory `treeStore` record; a replanted tree waits a full regrowth cycle. New grafted saplings retain priority when both types are in storage. Picking or cutting a branch after placement blocks Undo, including on a previously stored tree, so Undo cannot duplicate cuttings.
- **Lucky events:** actions updated the same timestamp used for active play, so frequent clicks erased time toward discoveries. A dedicated saved tick timestamp includes that time, skips long absences and recovers when the clock moves back. The saved rush play-time counter also retains values beyond 1 billion milliseconds (about 278 hours), preventing repeated rolls on long-running farms. Successive gold rushes keep their pending rent windows until collection; windows are clipped to the rent cap and overlapping intervals cannot pay twice.
- **Guidance:** apple requests could point to Mango-apple trees; rare eggs fell through to fishing advice. Cards now use the actual produce, explain discoveries/grafting and navigate to the notebook or a matching tree/hen. Counts include thinning and purchased animal/workshop output upgrades. A rare hen needing repair leads to its own coop. New random orders also require the actual fruit/egg and its complete recipe chain; special produce cannot stand in for ordinary ingredients.
- **Home activities:** a future cooldown timestamp stayed in the future after clock rollback; it is now corrected once. At the knitting counter cap, the same last scarf was repeatedly treated as newly finished; only a new milestone gives that reward. Refused activities also leave session dialogue turns alone.
- **Wardrobe:** rejected inherited object keys and non-string item IDs without changing settings; imported invalid selections safely render as no costume/hat.
- **Tree clocks:** clock recovery now uses the tree's actual fruit, first-crop state and grafting bonus, matching the visible growth progress.

Coverage: `tests/review-growth.test.mjs` contains 16 targeted cases; `tests/review-growth.browser.mjs` checks source navigation and storage/reload in English and Vietnamese at 390 and 1280 pixels. No new visible strings were introduced; source cards reuse the existing translated notebook and discovery text.

Validation:

- `npm test`: 757/757 passed, including the 16 new review regressions. `npm run sim` passes; steady play reaches school and clinic on day 3.
- All 45 browser suites passed on the integrated build. After the final rule corrections, rebuilt and reran `review-growth`, `orchard`, `guidance-land-contracts`, `explore` and `explore-roam`; all passed. The work board passed its eight language/screen-size combinations in the full run.
- Final `tests/browser.mjs`: 50/50 passed, including chapters 1-20. Simulated 4G first scene: 2,713 ms against the 3,500 ms target. Rendering remained within 120 draws and 300,000 triangles at every tested zoom.
- Final test build: 1,296,452 first-load bytes; production build: 1,296,097 / 1,300,000 bytes (3,903 bytes headroom). Future additions still need the planned lazy-loading release pass.
- Browser coverage is Chromium desktop and phone emulation. The optional WebKit engine is unavailable locally; physical iPhone/Safari behavior is unverified.

No main merge or deployment is part of this review request. Previously lost upgrade metadata or overwritten rent windows cannot be reconstructed from old saves.
