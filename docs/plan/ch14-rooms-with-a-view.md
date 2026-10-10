# Chapter 14: Rooms with a view

Status: not started · Depends on: chapter 13 · Size: one to two sessions
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
