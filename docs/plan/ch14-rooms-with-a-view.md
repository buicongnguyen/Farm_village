# Chapter 14: Rooms with a view

Status: **done** (PR #89) · Depends on: chapter 13 · Size: one to two sessions

## How to play it (for the owner)

1. Open the quay (tap a free lot's sign, or the step **A hotel on the quay** in Village projects), pick a free lot and
   build the **Hotel** (level 16, 14,000 coins): a rose house with a teal roof and a terrace on the quay.
2. **Guests come by themselves** while a room is free: one every two minutes in a bare valley, every forty seconds in
   a "Pretty" one, every twenty-four in "A picture postcard". A guest stays eight minutes, then pays 120 coins for the
   room and a tip of 40 for every beauty rank and one more.
3. Tap the hotel: its **rooms** are a row of doors. Each staying guest shows the **breakfast** they wish for (a made
   food your farm can make) and the time left. **Serve** it from the barn and that guest tips double. A pill
   "Breakfast · ready" shows when a wish is in the barn. Serving is never required.
4. The coins wait **at the desk**, 4,000 at most: collect them in the panel.
5. **Add a floor** twice: nine rooms (8,000 coins), then twelve (15,000). The building grows a storey each time.
6. Two or three guests stroll on the quay while rooms are taken: tap one to hear what they saw from their window.
7. With the hotel built and **ten guests** gone home content, the chapter 14 card appears.

Tester (`?tester`): "Chapter 14" jumps to the quay with its first house; "Finish every timer" sends the staying
guests on their way and brings the next to the door; "Finish this chapter" builds the hotel and counts ten guests.

## What was built, where it differs from the plan below

- `src/core/hotel.mjs`: `tickHotel` (guests leave and arrive in order, also over the time the game was shut),
  `hotelOf`, `breakfastReady`, `remarkOf`, the actions `serveGuest`, `collectHotel`, `upgradeHotel`. State: `s.hotel`.
  Numbers: `HOTEL` in `content/economy.mjs`.
- **The tip is `tip x (1 + rank)`**, not `tip x rank`: in a bare valley a guest still tips, so serving breakfast
  always pays something.
- The hotel is a riverside building (`lot: true`): built from the quay's panel on any free lot.
- Guests' remarks are content (`GUEST_REMARKS` in `content/people.mjs`, with what each needs to be true).
- The tester's jump now also reaches the level a chapter's own deed needs (`PLAY_LEVEL` in `core/testmode.mjs`).
- Models: `hotel`, `hotel_t1`, `hotel_t2` (two, three and four floors of rooms) with window anchors: every window is
  lit at night, not one per taken room. Guests carry no suitcase.
- A filled desk is told by the panel; there is no pill for it (only the breakfast pill).
- `tests/hotel.test.mjs` (8), and a browser check that plays the chapter.
Story source: `JOURNEY.md` 3 (Act IV), `STORY.md` 4 (row 14)

## What the player gets

- A **hotel** on the quay, and **guests** who come because the valley is beautiful.
- The beauty meter from chapter 11 now pays: prettier valley, more guests, better tips.
- Guests ask for breakfast: a new kind of small, quick order that uses the farm's best goods.

## The deed

`when: s => (s.counts.hotel ?? 0) > 0 && (s.stats.guests ?? 0) >= 10`

## Rules

New file `src/core/hotel.mjs`:

- `hotel: { cat: 'riverside', size: [6, 5], level: 20, cost: 20000, model: 'hotel', rooms: 6, max: 1 }`.
- `HOTEL = { stayMs: paced(8 * MIN), arriveMs: paced(2 * MIN), room: 120, tip: 40 }`.
- `tickHotel(ctx)`: while a room is free, a guest arrives every `arriveMs / (1 + beautyRank)`. A guest stays
  `stayMs`, then pays `room + tip * beautyRank`, counted in `s.stats.guests`.
- **Breakfast.** Each staying guest has one wish (a good from a short list of made foods: bread, butter, cheese,
  juice, honey cake, noodles). `serveGuest(ctx, { room })` takes one unit from the barn and doubles that guest's tip.
  Never required; an unserved guest still pays.
- Upgrades: `rooms` 6 → 9 → 12 (cost), each adding a floor to the model.
- Coins held at the hotel until collected, with a cap (as cottages), so the player visits it.

## Content and story

- `CHAPTERS` id 14, "Rooms with a view". Text: the first guests are a couple who honeymooned here before the mill
  shut; they ask for the same room, and it is the only one with its old wallpaper. Maple's line: tell them breakfast
  is from our own oven.
- Guests are not named characters. Ten short guest remarks for the hotel panel, about what they saw from the window;
  the remark pool depends on what the valley has (ponds, orchard, the wheel turning, the meadow or the cannery).
- Beats: `first-guests`, `full-house` (all rooms taken once).

## View and art

- Decor kit: `hotel` in three heights (`hotel_t0..t2`, as the cottage tiers), a striped awning, a terrace with
  tables on the quay side; near under 6,000 triangles each, mid box, far quad; night windows per room taken.
- Guests: two or three walkers on the quay and the bridge while rooms are taken (reuse villager rigs with travel
  tints and a suitcase prop; under 300 triangles for the case).
- Three chapter pictures.

## Interface

- Hotel panel: rooms as a row of doors (free, staying with time left and wish, ready to pay), "Serve" per guest,
  "Collect", the beauty rank and what it adds.
- A HUD pill when a guest's wish can be served from the barn.

## Tests

Rules: arrivals scale with rank; a guest pays once; serving validates stock first and doubles the tip only; the cap;
upgrades; `when`. Browser: jump to chapter 14, build the hotel, finish timers, serve, collect, see the card.

## Risks

Idle income must stay below active play at the same level (the simulation checks this in the release pass); keep
the hotel under a quarter of a busy farm's coins per hour.
