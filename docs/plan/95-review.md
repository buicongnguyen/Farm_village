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

## Left open, and why

- **Marks in the world** on story objects (the two boards, the plaque, Grandpa Oak, the quay before it is paved):
  needs a small piece of art (a story mark) and a look at every chapter; a task of its own.
- **Card 5's cherries, card 6 and 7 giving away the flour company and the drawer, the festival poster found twice**:
  each is a rewrite of a whole chapter card in four languages; best done in the native read-through of the release pass.
- **Thin things that can be walked through** (lamps, bollards, sale signs, the flag, the farm gate's posts, the order
  board on the road): blocking a road or verge cell for a post would make people walk round nothing.
- Locked rows that only name a level ("Reach level N") still do not say how to level up.
