# Chapter 12: One river, many farms

Status: not started · Depends on: chapter 11 · Size: two sessions
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
