# Chapter 13: The far bank

Status: not started · Depends on: `act4-far-bank.md` · Size: one session
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
