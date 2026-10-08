# The truck fleet

Asked for by the user on 2026-10-08: "add more trucks so that we can deliver more goods when the farm grows too much
product". Built by the art lane at the user's request (rules, panel and models), on `art/truck-fleet`.

## How it plays

- **More trucks:** the market panel offers **Buy another truck**: the 2nd costs 800 coins at level 4, the 3rd 2,500
  coins at level 7 (`TRUCK.fleet` in `src/content/economy.mjs`). A farm can own three. Each truck runs its own trip
  (50 s) and pays the goods' value × 1.2, as before.
- **Bigger trucks** still upgrades the size (20 → 40 → 70 goods), now for every truck at once.
- **Fill the trucks with spare goods:** one tap loads every truck at the market, most plentiful goods first. It keeps
  what the open orders need, what the current project holds, all animal feed, and one seed per bed for crops that cost
  money to plant. Tapping a good in the panel still loads 10 at a time, onto the first truck with room.
- **Send 3 trucks:** one button sends every loaded truck; each comes back on its own. **Collect** takes every
  truck's coins at once.
- **When the barn fills up** (85 % or more), the Next chip offers "The barn is nearly full: load the trucks", then
  "Send the loaded trucks", then "Collect the truck's coins". A full barn otherwise sells its overflow at the base
  price, so the trucks pay 20 % more for the same goods.
- The status row counts the trucks on the road and shows the next one home; the coin marker over the market shows
  when any truck has takings.
- **On the map:** the trucks park in a row along Village Street by the market (red, teal, sunny yellow) and drive off
  west in a line. The teal and yellow pickups are in the late `decor.glb`; until it loads they show as the red one.

## Compatibility

The first truck is still `s.truck`, so every save, test and screen that knew one truck works unchanged. Bought trucks
live in `s.truck.fleet` (older saves get an empty list). Saves are validated: at most two extra trucks, each with a
load list. Actions without a `truck` index behave as before on a one-truck farm.

## Screenshots

- `fleet-parked-pc.jpg`: three trucks parked by the market (PC).
- `fleet-parked-phone.jpg`: the same on a phone.
- `fleet-panel-phone.jpg`: the market panel with three filled trucks and "Send 3 trucks" (phone, English).
- `fleet-panel-phone-vi.jpg`: the same in Vietnamese.
