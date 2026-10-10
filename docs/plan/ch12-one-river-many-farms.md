# Chapter 12: One river, many farms

Status: **done** (PR #87) · Depends on: chapter 11 · Size: two sessions

## How to play it (for the owner)

1. Close the chapter 11 card. Within a minute **two new neighbours call**, one after the other: **Juniper** from
   Hillside Orchard (east) and the twins **Pebble and Sprig** from Brookhead Farm (north, upstream; they come as two
   and finish each other's sentences). From then on they visit, offer a trade a day and post orders like Daisy and
   Bramble. Juniper trades fruit; the twins bring what your answer to Mr Albright did not give you (honey if you built
   the cannery, tins if you kept the meadow).
2. A scene brings the idea, and a **notice board** stands on the village square beside the stage. Tap it (or open
   "The co-operative" on the Today board, or the step in Village projects).
3. **Found the co-operative**: both newcomers must have called, and the founding gift comes from your barn (12 bread,
   6 cheese, 6 apple juice at testing pace).
4. **A shared order** is posted at once: three goods in large amounts. A neighbour brings a third of every line (the
   orange part of the bar); you send the rest from the barn with **Send 10** or **Send all**, a little at a time.
   When all three lines are full it pays well, and the next order comes fifteen minutes later.
5. The first filled order closes **chapter 12**. Closing the card takes the gate off the **old towpath**: the far bank
   of the brook can be walked, from the road bridge past the old mill to the east, and by the stepping stones too.

Tester (`?tester`): "Chapter 12" jumps to the newcomers' arrival; "Finish every timer" brings their first call at
once and the next shared order; "Finish this chapter" founds the co-operative and counts one order.

## What was built, where it differs from the plan below

- `src/core/cooperative.mjs` (named in full: `coop` is the hen coop): `foundingPlan`, `makeOrder`, `lineLeft`,
  `members`, the actions `foundCooperative` and `fillCooperative`, `tickCooperative`. State: `s.cooperative`.
  Numbers: `COOPERATIVE` in `content/economy.mjs`.
- **Founding does not ask for hearts.** Farm neighbours have a friendship number, not hearts with gifts; asking for
  two of each would have meant days of waiting. It asks that both newcomers have called, and for the gift.
- **The newcomers** are `priya` (the orchard grower; the earlier plan's rice needs goods the game does not have) and
  `twins` (one neighbour, two voices, two walkers). They arrive with chapter 11 (`arrives`), call once soon after
  (`NEIGHBOURS.firstCallMs`), and have remarks, an arc, order lines and heart scenes. `givesBy` picks the twins' goods
  by the chapter 11 answer.
- **The far bank is a towpath, not open ground**: `TOWPATH` / `inTowpath` in `content/world.mjs`, two cells wide along
  the north side of the water, round the old mill. It is clear of wild scatter from the start, faint and overgrown
  until the chapter is seen, trodden earth after. `s.firsts.bridge` opens it in `core/walk.mjs`. The gate
  (`TOWPATH_GATE`) stands on the bank beside the brook road, not on the road bridge, which neighbours cross every day.
  `act4-far-bank.md` builds the riverside town north of this path.
- A shared order's coins show in the evening sums as their own line.
- Models: `cooperative_board`, `towpath_gate`, `towpath_gate_open`; two portraits; three chapter pictures. The
  growers' carts do not park at the road end (left out).
- `tests/cooperative.test.mjs` (8) and a browser check that plays the chapter. `STACK=1` makes `tests/browser.mjs`
  say which line of a check failed.
Story source: `JOURNEY.md` 3 (Act III), `STORY.md` 4 (row 12)

## What the player gets

- Two **growers from outside the valley** come to trade: a rice grower and twin beekeepers (or millers, if the player
  chose the meadow and already keeps bees).
- The **co-operative**: the neighbours pool their goods. Shared orders that are bigger than any one farm, filled
  partly by the neighbours, paid to all.
- The **bridge road opens**: the far bank can be walked on. The end of Act III.

## The deed

`when: s => !!s.coop?.founded && (s.coop.filled ?? 0) >= 1`

## Rules

New file `src/core/coop.mjs`:

- Two new `NEIGHBOURS` entries (`content/people.mjs`): `priya` (rice and beans, `after: 'chapter:11'`) and `twins`
  (wax, flour or honey by the chapter 11 choice). Neighbours already have hearts, gifts, a shop and requests; these
  two reuse all of it.
- `canFoundCoop(s)` → needs chapter 11 seen, two hearts with four of the neighbours, and a founding gift
  (`COOP.gift`: 20 bread, 10 cheese, 10 apple juice from the barn, at testing pace).
- `foundCoop(ctx)`: takes the gift, stamps `s.coop = { founded: now, n: 0, filled: 0, order: null }`.
- **Co-op orders.** One at a time, a new one every `paced(15 * MIN)`: three goods in large amounts (60 to 200), a
  third of each amount is pledged by the neighbours and counted as already in. `fillCoop(ctx, { good, n })` moves
  goods from the barn; when all three lines are full `settleCoop` pays coins (about 1.4 times barn value), XP, and
  one heart with two neighbours. Seeded by `s.coop.n` so a reload shows the same order.
- `s.firsts.bridge` is stamped when chapter 12 is seen: `walkable` and the Explore mode allow the bridge cells and
  the north bank (`inRiverside`, see `act4-far-bank.md`; until that file's work lands, the bank is open ground with
  wild grass and nothing to build).

## Content and story

- Names for `priya` and `twins` in the four languages; `twins` is one neighbour with two voices in its lines.
- `CHAPTERS` id 12, "One river, many farms". Text: one cart cannot carry what the city asks for, but six can; the
  neighbours sign Maple's kitchen table instead of a paper; the bridge over the brook is swept and its gate taken off.
  Maple's line: nobody ever got rich alone in this valley.
- Beats: `coop-idea` (Daisy), `coop-founded` (Bramble signs first, to everyone's surprise), `bridge-open` (Sunny runs
  across and back).

## View and art

- A **co-op board** at the village square (decor kit `coop_board`: a notice board with a little roof, under 400
  triangles) at a fixed cell beside the well; tap to open the co-op panel.
- The two growers: rigs with their own outfits; their carts park at the north road end on order days (reuse the
  cart).
- The bridge: its closed gate (`bridge_gate`, a simple bar gate added now to the brook road's bridge, shown from the
  start) is removed with a small moment when the chapter is seen.
- Three chapter pictures.

## Interface

- Co-op panel (`ui/coop-panel.mjs`, lazy): the order's three lines with the neighbours' pledged share drawn in a
  second colour, "Send" and "Send all" per line, the reward, time until the next.
- Friends → Neighbours lists the two newcomers.
- Roadmap: the stage "The family farm" completes here.

## Old saves

No farm has a co-op. Farms far past the level see the idea beat at once after chapter 11.

## Tests

Rules: founding needs and takes exactly the gift; orders are seeded and survive a reload; filling validates before
it mutates; settling pays once; the bridge cells are walkable only after the stamp; `when`.
Browser: jump to chapter 12, found the co-op, fill an order (test goods), see the card; in Explore, cross the bridge.

## Session split

First PR: the two growers and the co-op rules and panel. Second PR: the bridge gate, the chapter and its pictures.
