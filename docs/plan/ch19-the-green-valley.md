# Chapter 19: The green valley

Status: **done** (PR #94) · Depends on: chapter 18 · Size: one session

## How to play it (for the owner)

1. After the first fair with a ribbon, the Valley panel has a third page, **Green goals** (also from **The green
   valley** in Village projects and the Roadmap).
2. **Six goals**, each counted from what stands in the valley: thirty trees; twenty-five flower beds and flowerpots;
   two fish ponds; eight benches and lamps; nothing left worn; and, by your answer to Mr Albright, five beehives (you
   kept the meadow) or the cannery made a green one. A goal reached pays once (400 to 1,000 coins), stays reached and
   adds 4 to the valley's beauty for good.
3. **Titles**: as the valley's value passes 100K, 1M, 10M and 100M it gets a new name, told in a notice and a short
   scene (*A going farm*, *The pride of the lane*, *The valley's larder*, *Known in the city*).
4. **The county's prize** (bottom of the page) asks for two things at once: the valley is **A picture postcard** (the
   top beauty rank, 110) and it is **worth 100M**. The value grows with everything done together: at testing pace
   every deed adds a fifth to the valley's name.
5. When both hold, **chapter 19** closes. Seeing its card puts **a plaque at the bridge** and the view flies once over
   the farm, the village and the quay. A kept meadow is then thick with flowers with a path of stones through it; a
   cannery's yard has grown into an orchard. Tap the plaque for the green goals.
6. Once three goals are reached, **Mr Albright comes back** as a guest: he stands on the quay before the hotel.

Tester (`?tester`): "Chapter 19" jumps to the fair behind you; "Finish this chapter" reaches every goal, plants what
the picture postcard still needs and brings the valley's name past the mark.

## What was built, where it differs from the plan below

- `GREEN_GOALS` in `src/content/valley.mjs`; in `src/core/valley.mjs`: `greenOpen`, `greenProgress`, `greenAward`,
  `tickValley` (stamps goals, titles and the deed). `BEAUTY.goal`, `VALLEY.marks`, `VALLEY.step` in
  `content/economy.mjs`.
- **The goals fit the game as it is**: a farm can hold two ponds and five beehives, so those are the counts (the plan
  said four and twenty); thirty trees and twenty-five flowers, not sixty and thirty, at testing pace; "eight benches
  and lamps" stands in for the plan's "line the quay", because nothing can be placed on the quay.
- **The deed is stamped the first time both hold** (`s.firsts.greenValley`), so a roof that wears afterwards does not
  take the prize back. The story's `when` reads the stamp.
- **The goodwill dial**: `VALLEY.step` is 1.2 at testing pace and 1.08 at release pace (it was 1.08 for both in
  chapter 17). Chapter 20's plan asks for exactly this: tune the multiplier, not the marks.
- Titles are told by a notice and a two-line scene each, not by a card of their own. The last title (a billion) is
  chapter 20's.
- No ivy model for the cannery: after the award its yard grows eight fruit trees, and the card says so.
- Models: `plaque`, `path_stone`. `tests/green.test.mjs` (6), and a browser check that plays the chapter.
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
