# Chapter 18: The valley fair

Status: **done** (PR #93) · Depends on: chapter 17 · Size: one to two sessions

## How to play it (for the owner)

1. Once the valley company is founded, a **ribbon board** stands at the west edge of the village square. Tap it, or
   open **The valley fair** in Village projects or the Roadmap.
2. The panel has a card for each class: **Field** (a crop or a fruit, judged by Clover), **Kitchen** (something made,
   judged by Honey) and **Pond** (a fish, judged by Skipper). Each card shows what the barn can enter (it takes 3 of
   one kind) with **one to five stars**; the most promising is chosen already, a tap chooses another.
3. What makes a good entry: a finer good; one you **know** (the more of it you have grown, made, picked or caught, the
   better); and the judge's **soft spot** (two goods each, shown on the card).
4. **Open the fair** (1,500 coins). The judging is told on the panel, class by class: the judge's verdict, the four
   entries in order (Hollowbrook and the three valleys) and your ribbon. Gold pays 900, silver 500, bronze 300, and a
   class's first gold 600 more. The judge who gave a ribbon grows a heart fonder.
5. For three minutes the fair is on the square: stalls and carts round it, the judging table with the judges behind
   it, visitors from the three valleys, the whole village gathered. A pill in the top bar counts it down.
6. When it ends it counts as a deed for the valley's goodwill, and **chapter 18** closes if a ribbon came home. The
   valleys rest forty minutes before the next fair; the rivals are a little stronger each time (six times at most).

Tester (`?tester`): "Chapter 18" jumps to the founded company; put three of something in the barn and open the fair.
"Finish this chapter" holds a fair with a ribbon for you.

## What was built, where it differs from the plan below

- `src/core/fair.mjs`: `partsOf` (base, know, taste), `starsOf`, `wobbleOf`, `rivalsOf`, `optionsOf`, `fairOf`,
  `tickFair`, the actions `chooseEntry` and `holdFair`. Numbers: `FAIR` in `content/economy.mjs`.
- **Knowing a good** is counted from a new `s.stats.grown[good]` (harvests and finished batches), the fruit album and
  the fish album. Old saves start it from nothing, which is fair: the fair is new to them too.
- **No fish length**: a catch has no length in this game, so the pond class is scored like the others (how rare the
  fish is, how many of its kind were caught, Skipper's soft spot).
- **Entries are chosen for you** (the most promising), so the fair can be opened with one tap; a tap changes one.
  A class with nothing to enter is left out, and one entry is enough to hold a fair.
- **The deed counts any ribbon**, not only gold: `s.fair.ribbons` is every medal won, `s.fair.best` the best one per
  class. With three rivals a first fair nearly always brings one home, and gold still has to be earned.
- **The judging is told at once on the panel** (a class every second and a half) while the fair runs on in the world;
  the results were decided when it opened, from the save's own seed, so a reload cannot change them.
- **One verdict per judge and ribbon** (twelve lines), not three each.
- **The fair is on the village square**, not on the quay: the square already gathers everyone, and what the player
  has built on the quay cannot be in the way. Stalls and carts stand only on free grass round the square.
- **Ribbons show on the panel and the ribbon board**; they do not hang on the farmhouse wall (the interior kit is not
  touched). This goes to the release pass.
- Six visitors on every device (the plan's cap for phones was eight).
- Models: `fair_stall`, `fair_stall_b`, `judging_table`, `ribbon_board`; the visitors' carts are the props kit's cart.
  Icons: `ribbon_gold`, `ribbon_silver`, `ribbon_bronze`, `ribbon_board`.
- `tests/fair.test.mjs` (7), and a browser check that plays the chapter.
Story source: `JOURNEY.md` 3 (Act V), `STORY.md` 4 (row 18)

## What the player gets

- A **fair** on the quay and the square, with visitors from three valleys.
- A **produce contest**: enter your best in three classes; the judges are villagers with tastes you already know.
- Ribbons that hang in the farmhouse.

## The deed

`when: s => (s.stats.fairs ?? 0) >= 1 && (s.fair?.ribbons ?? 0) >= 1`

## Rules

New file `src/core/fair.mjs`:

- The fair is held by the player, like the Harvest Festival (reuse `festival.mjs`'s gather and evening): needs the
  valley company, a fee, and a cooldown of `paced(40 * MIN)`.
- **Classes**: Field (a crop), Kitchen (a made food), Pond (a fish). The player enters one item per class from the
  barn or the fish chest.
- **Scoring**, pure and explained to the player: base from the good's value tier; `+` for quantity grown lately
  (`s.stats.grown[good]`, "you know this crop"); `+` for the judge's taste (each judge has two liked goods, shown as
  hints in their gift likes); `+` for fish length against the kind's record; a small seeded wobble. Three rivals with
  seeded scores that rise with each fair, so winning stays possible but not automatic.
- Ribbons: gold, silver, bronze per class. `s.fair.ribbons` counts golds; each first gold gives a keepsake ribbon
  for the farmhouse wall (`HOME_COMFORT` slot) and coins.
- `s.stats.fairs += 1` per fair held.

## Content and story

- `CHAPTERS` id 18, "The valley fair". Text: three valleys' worth of carts on the bridge road; Honey judges bread
  with her eyes closed; Skipper measures every fish twice and the winner three times. Maple's line: her mother's
  ribbon is still in the drawer, and now it has company.
- Judges: Honey (Kitchen), Clover (Field), Skipper (Pond), each with three verdict lines per medal, in voice.
- Rival growers are named only by valley ("the Pine Ridge entry").

## View and art

- Decor kit: `fair_stall` (two tints), `ribbon_board`, `judging_table`; bunting from the market day across the quay.
- Visitors: the hotel's guest walkers in larger number while the fair runs (cap for phones: eight).
- Ribbons on the farmhouse wall (three small decals in the interior kit).
- Three chapter pictures.

## Interface

- Fair panel: three class cards; pick an entry (the picker shows the hinted score as one to five stars, never the
  number); "Open the fair"; then the judging, one class at a time with the judge's portrait and verdict; results.
- A ribbons page in keepsakes.

## Tests

Rules: scoring parts are monotonic (more grown never scores less); seeded rivals survive a reload; an entry is taken
from stock exactly once; ribbons once; cooldown; `when`. Browser: jump to chapter 18, enter three goods, hold the
fair, see a verdict and the card.
