# Chapter 18: The valley fair

Status: not started · Depends on: chapter 17 · Size: one to two sessions
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
