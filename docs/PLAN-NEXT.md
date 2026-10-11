# Plan: finish the story

Updated 2026-10-11 by Claude (art and logic). It replaces the earlier version of this file and the build order in
`JOURNEY.md` section 6. The story itself (acts, chapters, cast rules) stays as written in `JOURNEY.md` section 3 and
`STORY.md`; this file says in what order it gets built and what each chapter needs.

**The detailed plan is in [`docs/plan/`](plan/README.md):** one file per step, with the rules, files, art, tests and
the order of work. This file is the overview; where the two differ, the folder is right.

## What changed in the plan, and why

The last two weeks added many systems (Explore mode, bank fishing, hired hands, ten house levels, goats and a dairy,
twelve crops, sixteen parcels). The story did not move: it still ends at chapter 5, the clinic. An honest review of
the game (2026-10-11) found it broad but shallow, with three to five hours of play before it repeats.

So the plan turns round:

1. **One chapter, one pull request.** Each PR ships a chapter card, the deed that triggers it, and only the system
   that chapter needs. A system no chapter needs waits until the story is finished.
2. **Most of the systems already exist.** Chapters 7, 8 and 10 need buildings and mechanics that are live today
   (police post, company office and contracts, hired hands). They are mostly writing, triggers and a little art.
3. **Stay fast.** The testing-time numbers stay until the last milestone, and a tester's menu lets the owner jump to
   any chapter, so every new chapter can be played minutes after it ships.
4. **Act IV moves across the river.** The plan had a second map (Pine Ridge) for chapters 13 to 16. The riverside
   town agreed on 2026-10-10 takes that place: it reuses the map, the bridge and the camera, and costs about a third
   of a new region. Pine Ridge stays possible later as an expansion; nothing in the story depends on it.

## Step 0: tools for fast testing (first, small)

| Item | What it does |
|---|---|
| **Tester's menu** | With `?tester` in the address, Settings gains a Tester section: jump to the start of any chapter, add 10,000 coins, add five levels, finish everything that is growing or baking. Off for ordinary players. Nothing in it can damage a save: a jump only moves forward. |
| **One pace switch** | A `PACE` table in `content/economy.mjs` that scales every timer (crops, trays, animals, trucks, bites) and the dearest prices. It ships as `testing`. Release balance later becomes one edit plus a rerun of `scripts/sim.mjs`. |
| **Chapter template** | The checklist at the end of this file, so every chapter PR has the same shape. |

## The chapters

Done: 1 to 5 (the key and the seed tin, the first harvest, the first family, the school bell, the clinic).

Names follow the cast in `content/people.mjs`. Where `JOURNEY.md` named someone the cast does not have (the baker,
the officer, the office manager), that person arrives with their building, as the teacher did with the school and
the doctor with the clinic. They are villagers, not families: no cottage and no heart scenes to write.

### Act II: the valley wakes

| # | Title | The deed that ends it | Needs that exist | Needs to build |
|---|---|---|---|---|
| 6 | Market day | Sell at the first market day and own a third parcel | Market square, village shops, sixteen parcels, the dairy | A weekly market day (one kind of good pays more); Gus's deed for the east parcels (land now says what it is for); the three dairy scenes with Lan |
| 7 | Safe streets | The police post stands and the dock is built | Police post rebuild, bank fishing | Old reports as three letters (the sluice was shut the summer before the mill closed); Olaf's boat dock on the brook; beds within three cells of water grow a fifth faster |
| 8 | Work for everyone | The company office stands and its first contract is delivered | Company office, contracts, trucks | The sluice opens: the brook runs fuller and the mill wheel turns (art); an office manager arrives with the office |
| 9 | The village sings again | The festival stage is rebuilt and the first festival held | Festival notes in `STORY.md` | A stage on the square; a festival evening (lanterns, music, everyone gathers); Gus tells the truth; Ellis comes home as a villager you can talk to |

### Act III: the brook co-operative

| # | Title | The deed that ends it | Needs that exist | Needs to build |
|---|---|---|---|---|
| 10 | Hands to help | Three hands hired and a full day's work done by them | Six hired hands | Named villagers take the jobs (Minh, Lan, Sam) and are seen walking to them; the evening report: what was earned, from where, one suggestion |
| 11 | The man from the city | The player answers Mr Albright | Nothing | The one real choice: a factory on the meadow (fast money, the meadow gone) or a slower contract (the meadow stays). A valley beauty meter that the choice moves. Both paths go on |
| 12 | One river, many farms | The co-operative is founded and the bridge road opened | Mai and Gus as neighbours | Two growers from outside, met through visits first; a shared order board for the co-operative; the bridge to the far bank opens |

### Act IV: across the river (was Pine Ridge)

| # | Title | The deed that ends it | Needs to build |
|---|---|---|---|
| 13 | The far bank | The first building of the riverside town stands | Ground beyond the brook; tall buildings in the decor kit with strong middle levels of detail; Nana Tuyết, Ada's school friend, keeps the empty quay |
| 14 | Rooms with a view | A hotel is open and its first guests arrive | Guests as a new kind of income (rooms let by the night, paid by valley beauty) |
| 15 | The evening train | The halt is built and the first train stops | A train halt on the north road; goods sent by train (large orders, long trips) |
| 16 | Where the brook begins | Pip finds the spring | A walk in Explore mode with Ellis and Pip upriver: three places to find, no timers |

### Act V: the valley of plenty

| # | Title | The deed that ends it | Needs to build |
|---|---|---|---|
| 17 | A share for everyone | The co-operative becomes a company the valley owns | Net worth shown as the valley's value (buildings, land, contracts, beauty), with short numbers |
| 18 | The valley fair | The fair is held | A yearly fair on the square and the quay: stalls, a contest for the best produce |
| 19 | The green valley | The Green Valley award is won | Beauty goals across both banks; wealth titles that need coins and village progress |
| 20 | The lights of two villages | The value reaches a billion | The closing card: Ada, Ellis, June and Pip on the porch |

## Order of work

1. Step 0 (tester's menu, pace switch).
2. Chapters 6, 7, 8, 9 in order. Chapters 7 and 8 are quick because their buildings are live.
3. Chapter 10 (mostly writing and the evening report), then 11 and 12.
4. The far bank: ground and the first tall buildings, then chapters 13 to 16.
5. Chapters 17 to 20.
6. Release pass: the pace switch to `release`, the simulation, a real soundtrack, an open playtest.

Sizing, as a guide only: chapters 6 to 10 are about one working session each; 11 and 12 about two; the far bank is
the largest single piece (four to six sessions); Act V about one each.

## What waits until the story is done

Extra farmhouse rooms; more animals (ducks, geese, sheep, the loom); the cat and the mice; factory staff per building;
the horse; the playground and homework games; more recipes for the new vegetables beyond what a chapter asks for;
Pine Ridge. Small fixes and anything the owner reports while testing still go in at once, between chapters.

## Chapter PR checklist

- A `CHAPTERS` entry (title, subtitle, text, Ada's line, three picture panels) and its `when` test in `content/story.mjs`.
- The deed is something the player does, never a wait, and is already true for a farm that did it earlier.
- A village project step that points at the deed, and a roadmap stage or milestone that names it.
- Only people who have arrived speak. Every new system arrives through a person who needs it.
- English first, then Vietnamese written to be natural, then Korean and Japanese.
- Rules tests for the trigger and for old saves; one browser check that plays the chapter end to end.
- The tester's menu can jump to it.
- The far view stays within 120 draw calls and 300,000 triangles; first-load code within 1,150,000 bytes.

## Zones (agreed 2026-10-10)

| Zone | Where | What goes there |
|---|---|---|
| Farm | the 4 x 4 parcels in the middle, all buyable | beds, animals, workshops, trees |
| Living | the village south of the main road | rental cottages, the square, shops |
| Company | the civic row in the south-east | school, clinic, police post, company office |
| Riverside town | between the north road and the river, and across the bridge | apartment blocks, a hotel, an office tower, the train halt |

## Rules that stay fixed

- Nothing is lost while the player is away. Hired hands and helpers work only while the game is open.
- Old saves keep everything: new steps and buildings are ticked off or opened, never taken back.
- Nobody is a villain. Money never ends a chapter alone: each needs a deed for the village.
- No new building goes in `farm-kit.glb` (first wave); late pieces go in the decor kit.

## Done so far in v0.5 (for the record)

Goat barn, goats and the dairy (PR #65); farmhouse to level 10 with a growing garden (#68) and a room that improves
with it (#72); six hired hands (#62, #71, #74); sixteen parcels (#70); five more vegetables (#75); the look of each
language edition (#76).
