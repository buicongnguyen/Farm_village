# Chapter 20: The lights of two villages

Status: not started · Depends on: chapter 19 · Size: one session
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
