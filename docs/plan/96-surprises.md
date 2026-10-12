# Surprises: lucky finds and events (first pack)

Status: **first pack built** (2026-10-12); second pack (dog show, giant crops, visitors) not started · Depends on: the farm notebook (#112) · Owner's request: "surprise items so that it is fun"

The farm notebook gives the player things to find out on purpose. This step adds things that happen **to** the player:
rare animals, a herd that grows by itself, a short event in the valley, two gifts for time played and work done, and an
album that keeps them. Second pack (not in this step): the dog show, giant crops, visitors.

## Rules every surprise follows

1. **It only adds.** Nothing is lost by missing one, and nothing has to be done at a set hour.
2. **Luck has a ceiling.** Every roll is seeded from the farm (no `Math.random` in the rules) and has a count after
   which the rare result is certain.
3. **One event at a time**, none before the farm has what the event is about.
4. **It shows in the world**, not only in a notice.
5. **It goes into the album**, as a silhouette until found.

## The five parts, and where each one sits

| Part | Where it happens | When | What it gives |
|---|---|---|---|
| Rare hens | the coop, on buying a hen | 1 in 8 black, 1 in 25 rainbow; a black one by the 12th hen since the last rare one, a rainbow one by the 30th hen | a black hen lays Black eggs (40), a rainbow hen Rainbow eggs (120); they look it in the pen |
| The herd grows | the goat barn and the cow barn | play time with the herd: a wild goat after 10 and 40 minutes with a goat, a calf after 15 and 50 minutes with two cows | a free animal, also in a full barn (two extra at most); a calf is small for ten minutes |
| Gold rush | the brook, the mailbox | every 12 minutes of play with a rented cottage: 1 in 3, certain on the third | five minutes: cottage rent doubled, and "Pan for gold" (12 pans, 25–74 coins each); glints on the brook; a pill for its length |
| Two gifts | the mailbox | one hour of play; the 100th truck trip | a letter: an uncle's house in town that pays rent into the mailbox; a letter: a truck for the fleet (coins when the fleet is full) |
| Lucky finds | the farm notebook, below the know-how | always | eight entries, silhouettes until found |

**Why these places.** Each surprise appears where the player already looks for that thing: hens at the coop, rent in
the mailbox, letters in the mailbox, the album beside the notebook. No new round button and no permanent pill (the
status row is full: #112). The gold rush has a pill only while it runs, like the market day and the festival.

## Design details

- **Play time** (`s.stats.playMs`): each tick adds the time since the last one, at most a minute, so a closed game or
  a jumped clock earns nothing. The herd, the rush and the first letter are counted in it.
- **State**: `s.surprises = { found, hens, rare, goat, calf, rushAt, misses, rush, house, houseFrom, truck }`,
  normalised on load. Animals carry `variant: 'black' | 'rainbow'`, `wild` or `bornAt`.
- **Rare hens look it**: two more rigs made from the chicken model by repainting its baked vertex colours at load
  (`def.paint`), so no new art file. Icons for the two eggs are the egg icon recoloured.
- **Gold rush rent**: `rentWaiting` adds, for each cottage, its rent for the part of the rush that lies in the time
  not yet collected. A pure function: nothing is stored per cottage.
- **Gifts by letter**: `LETTERS` already posts on a stat. Reading the letter is what gives the gift, as the letter's
  own reward would.
- **Orders, level-up cards, the supermarket**: the new goods are in none of them (no source the order board knows).

## Review of this plan (before building)

- *A rainbow hen worth ten times an egg could break the economy.* A hen lays one egg a round; a rainbow hen adds about
  108 coins a round, less than one pumpkin bed. Kept. Output upgrades multiply it like any egg: accepted.
- *Free animals in a full barn.* Capped at two extra per barn, so a barn of four holds six at most.
- *Tests that jump the clock would trigger events.* Play time grows by at most a minute per tick, and every event needs
  minutes of it. The browser suites tick a handful of times.
- *A pill for the rush.* The compact HUD suite counts pills on a farm with no rush, so its count stands.
- *An inherited cottage in the world would need a lot, a family and a project step.* The house is "in town": it pays
  rent and is not placed. This breaks rule 4 in a small way; the letter and the mailbox line say what it is.
- *A rare hen among a new farm's first hens leaves it short of plain eggs* (found by `tests/core.test.mjs` while building):
  the first four hens are always plain.
- *Dropped from the first pack*: the dog show and the cow show (they belong with the fair and need judging rules).

## Checks

- Unit tests: seeded rolls and their ceilings, eggs by variant, herd growth and its cap, the rush's rent and pans, the
  two letters, the save, the album.
- Browser: a rare hen in the pen, the rush's pill, panel and glints, the album.
- `npm test`, the smoke suite, every browser suite.
