# Review after chapter 20: code, logic, story flow

Status: **first pass done** (2026-10-11) · Depends on: chapter 20 · Before: the release pass

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

## Left open, and why

**Story order**
- Chapter 19's cannery card says the cannery is hidden by trees, but the deed does not ask for the green cannery.

**Story facts (text in four languages; one sitting with the story bible)**
- The water's timeline: Oak's letters, Constable Sage's letter, chapter 16 and the tutorial disagree on when the
  sluice was shut and when Oak left. Pick one account and align the four texts.
- The flour company is "revealed" three times (Oak's letter, card 6, Sage's letter); card 7 gives away the drawer
  marked Gates before Sage's letters.
- Small ones: card 5's cherries (already picked by then), Chip "since I was a boy", "seven pupils", "five farms on
  one river", the cheese picnic scene after Oak is home, the festival poster found twice, Nana Snow's eleven years.
- Oak's letters 2 to 9 can still arrive after he is home.

**Guidance**
- Chapter cards and scenes end with "Continue" only: a second button to the thing they announce.
- No mark in the world on story objects (the two boards, the plaque, Grandpa Oak, the quay before it is paved).
- Locked requirements that do not say how to meet them (valley company, the county's prize, the festival's feast,
  company deliveries, "Reach level N" in Village projects).
- "A third field" has no button; the market step does not say the market square must be mended first.

**Documents**
- `docs/JOURNEY.md` chapters 10 to 20 and its status table, and `docs/STORY.md` section 4, describe an older
  plan (Pine Ridge as Act IV, a flour-company Albright). Rewrite both from `src/content/story.mjs`.
- `CLAUDE.md`, `AGENTS.md`, `PROGRESS.md` and `README.md` describe the two-lane way of working and old versions.

**Walking**
- Lamps, the quay's bollards and sale signs, the order board, the company flag and the farm gate's posts can still
  be walked through (thin things, or things on a road).
