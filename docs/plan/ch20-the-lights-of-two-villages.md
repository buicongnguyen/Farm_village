# Chapter 20: The lights of two villages

Status: **done** (PR #95) · Depends on: chapter 19 · Size: one session

## How to play it (for the owner)

1. After the county's prize, keep doing things together: every market day sold on, shared order, loaded train,
   festival, fair and handful of hotel guests makes the valley's name worth more. Village projects shows **The lights
   of two villages**; the Value page shows how far the billion is.
2. When the valley is worth **a billion** it gets its last title, and the **closing cards** come, five of them, one
   after another: the porch (the chapter's own words), the old village, the far bank, **everyone who came back** (a
   portrait and a name for each, and the families who came home to the quay), and thanks.
3. The story ends when the last card is closed. **Keep playing** goes back to the farm; **The valley album** and
   **Take a photograph** go on to the album or the photo mode.
4. Then the valley has its evening, whatever the clock says: dusk and every light for a minute, and the view flies
   slowly from the farmhouse to the old village and along the far bank.
5. **Nothing stops**: the market, the fair, the trains, the co-operative, the hotel and the dividend go on.
6. **The valley album** keeps the whole story: every chapter seen as a tile (tap one to read its card again), what the
   valley chose in chapter 11, its titles with their dates, and the day the story ended. It is in the Album and in
   Settings from chapter 1 on.

Tester (`?tester`): "Chapter 20" jumps to the county's prize; "Finish this chapter" brings the valley to a billion.

## What was built, where it differs from the plan below

- The deed is the valley's last title (`s.firsts['title:1000000000']`, stamped by `tickValley`). Seeing the chapter
  stamps `s.story.ended` once (`core/today.mjs`). `core/ending.mjs`: `castOf` (who is named), `albumOf`, `storyEnded`.
- `ui/closing.mjs` (the five cards) and `ui/valley-album.mjs` are loaded only when needed; the guide shows the closing
  cards instead of a chapter card for a chapter marked `closing`, and `guide.replay(id)` shows a seen chapter again.
- **The pictures are the porch, the old village and the far bank at dusk**, rendered from the game like every chapter
  picture. There is no special porch camera: the three views follow the last card instead (the evening look).
- **No family photograph keepsake**: the last card opens the existing photo mode (which saves a picture to the
  device). Posing the family and keeping the picture in the profile is left to the release pass.
- **No new music**: the ending plays the game's own soundtrack. The slowed theme is the release pass's sound work.
- **The album is in the Album panel and in Settings**, not on a title screen (the game has none).
- The far woods no longer glow green at night: the backdrop takes the same night grade as the rest of the world.
- Tester: `JUMPS[21]` exists so the last chapter can be finished; the jump buttons stop at 20.
- `tests/ending.test.mjs` (5), and a browser check that plays the ending.
Story source: `JOURNEY.md` 3 (Act V), `STORY.md` 4 (row 20), `STORY.md` 5 (the ending)

## What the player gets

- The valley's value reaches **a billion**.
- The **closing card**: an evening view from Maple's porch, the lights of the old village and the far bank, and
  everyone who came back named.
- The game goes on afterwards: nothing locks, and a "valley album" keeps the whole story to read again.

## The deed

`when: s => valueOf(s) >= 1_000_000_000`

At testing pace this should come within two or three sessions of chapter 19; tune the goodwill multiplier from
chapter 17, not the mark.

## Rules

- `s.story.ended = now` when chapter 20 is seen. Nothing is taken away and no timer stops.
- After the end: market days, the fair, trains, co-op orders and the hotel keep running. A small "Valley album"
  entry appears on the title screen and in Settings.
- A last keepsake: the family photograph (rendered from the game with the player's own farm behind the family).

## Content and story

- `CHAPTERS` id 20, "The lights of two villages". Text: Maple counts the lights on both banks from the porch and
  loses count twice; Oak says the brook sounds the way it did when they were courting; Sunny has fallen asleep on
  the step with a ribbon in her hand. The last line is Maple's and is about the player: the valley was only waiting
  for someone to stay.
- The closing sequence is five cards, not one: the porch; the old village; the far bank; the names (every villager,
  neighbour and newcomer the player met, with portraits, plus "and {n} families who came home" from
  `s.stats.returned`); thanks.
- No sequel hook. Pine Ridge is mentioned once, as the place the train goes next.

## View and art

- The porch view: a camera placed at Maple's porch at dusk looking north-east over the farm to the quay, with every
  night light on (cottage windows, lane lamps, quay lamps, hotel, the train passing once).
- The family photograph: the family rigs posed in front of the farmhouse (Cheer and Idle clips), rendered to a
  canvas and saved as the keepsake image (`toBlob`, kept in the profile store).
- Music: the main theme slowed, with the festival tune's drum joining for the names card.

## Interface

- The valley album (`ui/album-panel.mjs`, lazy): every chapter card with its pictures, readable again; the choice
  made in chapter 11; the titles and dates; the photograph.
- "Keep playing" closes the sequence. A share button for the photograph (download, not a network call).

## Tests

Rules: `when`; the end stamps once; nothing locks after it (run a tick, a sale, a market day); the names list
contains every arrived person. Browser: jump to chapter 20 with test value, see the five cards, reopen the album.

## Risks

Reaching a billion must be a matter of sessions, not weeks, at release pace too: the release pass sets the curve
with the simulation, and this chapter's test fixes only the order of chapters, not the time.
