# Chapter 11: The man from the city

Status: not started · Depends on: chapter 10 · Size: two sessions
Story source: `JOURNEY.md` 3 (Act III), `STORY.md` 4 (row 11)

## What the player gets

- A visitor, **Mr Albright**, with an offer for the meadow by the brook: a big cannery, or leave it green.
- **The one real choice of the story.** Both answers are good ones; each changes how the valley looks and earns.
- A **valley beauty meter** that counts trees, flowers, ponds and clean water, and pays back in visitors later
  (chapter 14).

## The deed

`when: s => !!s.story.albright`

The offer arrives when chapter 10 is seen, the level is 16 or more and the farm's worth passes a threshold
(`valueOf(s) >= 60,000` at testing pace). The player answers when ready; nothing happens while they wait.

## Rules

New file `src/core/valley.mjs`:

- `beautyOf(s)` → `{ score, parts: { trees, flowers, water, tidy, smoke } }`. Trees and fruit trees 2 each (cap 120),
  flower and hedge decor 1 each (cap 80), each pond 6, the dock 6, the sluice open 20, every unrepaired or worn thing
  −2, every factory −4 unless it has the green upgrade. Score is the sum, floored at 0. Pure and cheap (counts only).
- `beautyRank(score)` → 0..4 with names: Bare, Pleasant, Pretty, Lovely, Postcard.
- `albrightOffer(s)` → `{ open, answered }`.
- `answerAlbright(ctx, { choice })`: `'factory'` or `'meadow'`, once; stamps `s.story.albright`.
  - **factory**: unlocks the building `cannery` (catalogue, 5 × 4, level 16, high cost) with recipes that turn any
    three crops into `canned_goods` at a strong price and long time: the best coins per hour in the game. Beauty −20
    while it stands; `greenCannery` upgrade (cost) removes the penalty and its smoke.
  - **meadow**: the meadow becomes a kept wildflower field (fixed scenery east of the farm), beauty +30 for good, and
    unlocks `beehive` (1 × 1, makes `honey` over time, needs flowers within three cells) and the recipe
    `honey_cake` at the bakery.
  - Neither path closes a later chapter. The cannery owner can still plant; the meadow keeper can still build
    factories elsewhere.
- Beauty gives a small bonus now so it matters before the hotel: villagers' orders pay `+2%` per rank.

## Content and story

- `VISITORS` (new, small, in `content/people.mjs`): `albright`: not a villager, appears only around this chapter.
  He is polite, means well, and is honestly puzzled that anyone would say no. Not a villain (`README.md`).
- `CHAPTERS` id 11, "The man from the city". Two texts (`text.factory`, `text.meadow`) and two Maple lines; the card
  shows the one that matches. Rosie's and Bramble's lines differ too: Bramble, surprisingly, argues for the meadow.
- Beats: `albright-arrives` (the offer), `albright-wait` (Rosie: "sleep on it"), `albright-after` (one per choice).
- Goods: `canned_goods`, `honey`, `honey_cake` with icons. Buildings: `cannery`, `beehive` with models and icons.

## View and art

- Decor kit: `cannery` (brick hall, tall chimney as a separate node for smoke, loading bay; under 4,000 triangles),
  `beehive` (white boxes on a stand, under 300), `meadow_field` scenery (instanced flower clumps, far LOD a tinted
  quad), Mr Albright's car parked at the gate while the offer is open (reuse a truck body with a new tint if the
  kit has no car; else a small `car` piece, under 1,200).
- Mr Albright: `man` rig, grey suit tint, hat. Walks the lane and looks at the meadow.
- Smoke from the cannery chimney (`view/juice.mjs` particles) until the green upgrade.
- Beauty: a leaf mark in the top bar beside the level, tinted by rank.

## Interface

- The offer is a **full card with two big buttons** and a third, "Let me think", centred and tappable. Under each
  choice, three plain lines: what you get, what it costs the valley, what it opens.
- A confirm step ("This cannot be changed. Choose the meadow?").
- A Valley panel (from the leaf mark): the beauty parts as rows, the rank, and what would raise it most.

## Old saves

Farms at level 16 past chapter 10 get the visit on the next load. `s.story.albright` missing means unanswered.

## Tests

Rules: `beautyOf` for each part and its caps; the offer's conditions; each answer once and its unlocks; the other
path stays locked; `when`; no later chapter's `when` depends on the choice (a loop over `CHAPTERS` with both values).
Browser: jump to chapter 11, open the offer, choose each path in two runs, see the unlock and the card text.

## Session split

First PR: `valley.mjs`, the beauty meter and panel. Second PR: the visitor, the choice, both unlock sets, the card.
