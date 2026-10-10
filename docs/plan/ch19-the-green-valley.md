# Chapter 19: The green valley

Status: not started · Depends on: chapter 18 · Size: one session
Story source: `JOURNEY.md` 3 (Act V), `STORY.md` 4 (row 19)

## What the player gets

- **Beauty goals**: a short list that turns the valley green on purpose, whichever choice was made in chapter 11.
- **Titles** as the valley's value passes each mark.
- An **award** from the county: the valley is named the prettiest working valley, and a plaque goes up at the bridge.

## The deed

`when: s => beautyRank(beautyOf(s).score) >= 4 && valueOf(s) >= 100_000_000`

(The value mark is a testing number; the release pass sets the real one.)

## Rules

- `GREEN_GOALS` (`content/valley.mjs`, new): six goals with a count and a reward, shown as a checklist: plant 60
  trees; keep 4 ponds; flower every lane (30 flower decor along roads); no worn building; green the cannery or keep
  20 beehives (by the chapter 11 choice); line the quay with lamps and trees (lot fronts).
- `greenProgress(s)` → per goal `{ have, need, done }`. Each done goal adds beauty and pays once.
- **A cannery owner can reach rank 4**: the green upgrade plus the goals must be enough. Test it.
- Titles (`VALUE_TITLES`): at 100K "A going farm", 1M "The pride of the lane", 10M "The valley's larder",
  100M "Known in the city", 1B "The lights of two villages" (chapter 20). Stamped in `s.firsts` and shown once each.

## Content and story

- `CHAPTERS` id 19, "The green valley". Text differs by the chapter 11 choice in one paragraph: the cannery's
  chimney grows ivy and its yard an orchard, or the meadow is now a mile of flowers with a path through it. Mr
  Albright comes back, as a guest at the hotel, and admits the view is better than his drawings. Maple's line: she
  told him so.
- Beats: one per title; `albright-returns`.

## View and art

- Decor kit: `plaque` at the bridge; ivy and trees variant for the green cannery (`cannery_green`); flower-lined
  lane decals if the goal needs a cheap way to show it.
- A slow overview fly-through when the chapter is seen (camera path over the farm, the village, the quay).

## Interface

- Valley panel: a "Green goals" tab with the checklist and what each adds.
- Title cards (small, centred, tappable to dismiss).

## Tests

Rules: each goal's count; rank 4 reachable on both chapter 11 paths (a built state for each); titles once;
`when`. Browser: jump to chapter 19 with test state, tick the last goal, see the card and the fly-through.
