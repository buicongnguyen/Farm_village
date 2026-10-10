# Chapter 16: Where the brook begins

Status: **done** (PR #91) · Depends on: chapter 15 · Size: one session

## How to play it (for the owner)

1. When the chapter 15 card is closed, Grandpa Oak says he wants to walk up to the spring. Open **A walk upriver**
   in Village projects, **Where the brook begins** in the Roadmap, or tap Grandpa Oak.
2. Three stops, in order, each with a small deed first. Nothing is timed.
   - **The old weir**: a picnic from the barn (3 bread, 1 cheese, 2 apple juice).
   - **The heron pool**: land one fish at the boat dock after the weir.
   - **The spring**: plant ten trees in the valley after the walk has opened.
3. Each stop plays a short scene with Oak and Sunny and gives a **keepsake** (Oak's old float, a heron's feather, a
   bottle of spring water), coins and experience. The panel keeps the stop's picture, what was found and the keepsake.
4. Reaching the spring adds 10 to the valley's beauty for good, and closes **chapter 16**: why Oak stayed away.

Tester (`?tester`): "Chapter 16" jumps to the open walk; "Finish this chapter" walks all three stops.

## What was built, where it differs from the plan below

- `src/core/upriver.mjs` and `UPRIVER` in `content/exploration.mjs`, **beside** the picnic trail rather than inside
  it: that trail's save format is one fixed list with careful repair rules, and a second trail did not fit it.
  State: `s.upriver = { stops, trees0, fish0 }`; the deed is `s.upriver.stops.length >= 3`.
- "A named fish" became **any fish landed at the boat dock** since the stop before (`s.stats.riverFish`).
- The keepsakes live in the walk's own panel; there is no separate keepsake page yet (chapter 20's album can gather
  them).
- The stops' pictures are staged in the game west of the brook road with stones and bushes
  (`scripts/story-panels.mjs`), and double as the chapter card's pictures. There is no heron model: the pool is
  shown without the bird.
- `BEAUTY.spring` (10) is part of "Ponds and the brook" in the Valley panel.
- `tests/upriver.test.mjs` (5), and a browser check that walks the three stops on a phone.
Story source: `JOURNEY.md` 3 (Act IV), `STORY.md` 4 (row 16)

## What the player gets

- A quiet chapter between two busy ones: a **walk upriver** with Oak and Sunny, in three stops, to the spring.
- Three keepsakes, and the last piece of Oak's story: why he stayed away so long.
- The end of Act IV.

## The deed

`when: s => (s.exploration?.upriver ?? 0) >= 3`

## Rules

- Reuse the discovery trail (`src/core/exploration.mjs`, `content/exploration.mjs`), which already has stops with a
  need, a find and a reward. Add a second trail `upriver` with three stops: **the old weir**, **the heron pool**,
  **the spring**.
- Each stop is opened by a small deed that fits the farm at this point: bring a picnic (bread, cheese, juice), catch
  a named fish at the dock, plant ten trees since the chapter began. `visitStop(ctx, { trail: 'upriver', stop })`
  validates and stamps.
- Rewards: a keepsake each (`content/keepsakes.mjs`: Oak's old float, a heron feather, a bottle of spring water),
  XP, and at the spring `beauty +10` for good ("the spring is kept").
- Nothing here is timed.

## Content and story

- `CHAPTERS` id 16, "Where the brook begins". Text: the spring is a wet rock under a fern and Sunny is not
  impressed, until Oak tells her every drop in the mill race started there. Oak, at last: he went upriver to find
  out why the water stopped, found the gate, and stayed because he could not face coming home without having opened
  it. Maple's line (she did not come; her knees): "He always did take the long way round."
- Each stop is a three-line scene with Oak and Sunny in voice (`STORY.md` 2: Oak wry and short; Sunny counts things).
- No new mystery. This chapter closes Oak's absence and nothing else.

## View and art

- The stops are pictures, not places to walk: three painted-style panels rendered from small Blender sets
  (`art/blender/build_story_sets.py`, new, or scenes staged in the game's west margin and rendered through
  `scripts/story-panels.mjs`). Prefer staging in the game: reuse rocks, ferns, the heron from the critters, the
  brook material.
- Keepsake icons (three).

## Interface

- The trail opens from the roadmap and from Oak (tap him: "Walk upriver"). The trail panel is the discovery panel
  with the second trail's stops.

## Tests

Rules: each stop's need; order (a stop needs the one before); rewards once; `when`. Browser: jump to chapter 16,
complete the three stops with test goods, see the card.
