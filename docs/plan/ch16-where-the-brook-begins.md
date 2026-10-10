# Chapter 16: Where the brook begins

Status: not started · Depends on: chapter 15 · Size: one session
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
