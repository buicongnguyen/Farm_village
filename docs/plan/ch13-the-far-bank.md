# Chapter 13: The far bank

Status: **done** (PR #88, with the groundwork of `act4-far-bank.md`) · Size: one session

## How to play it (for the owner)

1. After chapter 12 the towpath on the far bank is open. Village projects shows **Pave the old quay** (level 14,
   2,500 coins): tap it, or tap the far bank east of the old mill. Paving lays cobbles along the water, sets a lamp in
   every lane and a sign on each of **seven lots**, and clears the wild trees from them.
2. Open the quay again (tap a sign, or the project **A house on the quay**). Pick a lot in the row of seven and build
   the **Quay house** (level 15, 9,000 coins): three storeys, a tea shop below, four flats above. Up to three can be
   built.
3. Four families come back to the valley with every quay house, and it **pays rent into the mailbox**: 220 coins every
   ten minutes, at most eight payments waiting. The "Rent" pill collects it with the cottages' rent, and so does the
   house's own panel (tap the house).
4. **Nana Snow**, the keeper of the quay, arrives with the first house and sits by its door: tap her to hear her. She
   passes on two letters from the families upstairs.
5. The first quay house closes **chapter 13**. At night its windows and the quay's lamps are lit across the water.

Tester (`?tester`): "Chapter 13" jumps to the open towpath; "Finish this chapter" paves the quay and builds a house
on the first lot.

## What was built, where it differs from the plan below

- `apartment` in `content/buildings.mjs` (`lot: true`, `flats: 4`), built by `buildOnLot`. Its numbers are in
  `RIVERSIDE.house` (`content/economy.mjs`). Levels and prices are the testing ones (the plan's level 18 and 12,000
  coins are for the release pass).
- Rent is counted per house (`s.flats[id].rentFrom`), not through the cottage rules: there are no tenant families to
  name. It is collected with the mailbox (`core/homes.mjs` adds `quayRent`).
- `s.stats.returned` counts the families who came back.
- The keeper `tuyet` (Nana Snow / Bà Tuyết / 매실 할머니 / うめばあちゃん) **takes no gifts and has no heart scenes**,
  like the other late villagers; she has her lines, two scenes and two letters. The shop's daily tea was left out.
- The roadmap stage "Across the river" is real, with this chapter's two deeds; chapters 14 to 16 add theirs.
- Models: `apartment` (with window anchors for the night), `quay_bollard`; icons for the house and the quay; a
  portrait; three chapter pictures.
- `tests/riverside.test.mjs` (6), and a browser check that plays the chapter.
Story source: `JOURNEY.md` 3 (Act IV), `STORY.md` 4 (row 13)

## What the player gets

- The **first riverside building**: a three-storey house of flats with a shop below, on the quay.
- A newcomer: the **keeper of the quay**, an old boatwoman who sells tea from the ground floor and knows every
  family that ever left the valley.
- Rent that comes in by itself, and families who come back because there is somewhere to live.

## The deed

`when: s => (s.counts.apartment ?? 0) > 0`

## Rules

- `content/buildings.mjs`: `apartment: { name: 'Quay house', cat: 'riverside', size: [6, 5], level: 18, cost: 12000, model: 'apartment', homes: 4, rentMs: paced(10 * MIN), rent: 220, max: 3 }`.
- Rent: the cottage rules (`core/rent.mjs`) already pay per home; let `apartment` use them with `homes: 4` and no
  tenant families to name (the tenants are "returned families": a count, not people).
- `s.stats.returned` rises by 4 per quay house: later chapters and the closing card use the number.
- The keeper: `content/people.mjs`: `{ id: 'tuyet', role: 'Keeper of the quay', arrives: 'apartment', noOrders: true }`.
  She does take gifts (tea things) and has two heart scenes, because the far bank needs one face.
- Project step `quay_house` ("A house on the quay", level 18, `site: 'q1'`).

## Content and story

- Names: `tuyet` → chosen in the four languages with the chapter. Working note: "Bà Tuyết" in Vietnamese (pair
  **bà – cháu**), a warm, teasing voice; the English name must not be Pearl (the officer's working id).
- `CHAPTERS` id 13, "The far bank". Text: the first lamp is lit on the far side; the keeper opens her shutters and
  reads names off a list of people who wrote to ask if it was true the village was back. Maple's line: she can see
  that lamp from her porch.
- Beats: `quay-lamp` (first night with the quay house), `tuyet-list` (the list of names; Dash offers to carry the
  replies).
- Two letters from returned families (short, grateful, each with a small gift).

## View and art

- Decor kit: `apartment` (three storeys, shop front with an awning, balconies with flower boxes, tiled roof;
  near under 6,000 triangles, mid box, far quad; night windows).
- The keeper: `granny` rig variant with a blue scarf; she sits outside the shop by day.
- Three chapter pictures (the quay at dusk, the keeper's list, Maple's porch looking across).

## Interface

- The quay house panel: rent ready, collect, homes filled, the shop's tea (a small daily gift).
- Roadmap: a new stage "The far bank" with the milestones of chapters 13 to 16.

## Tests

Rules: only on a lot; rent accrues and collects once; `returned` counts; the keeper arrives with it; `when`.
Browser: jump to chapter 13, build on a lot, see the card and the night windows.
