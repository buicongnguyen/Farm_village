# Plan v0.3b — playtest round 2 (2026-10-07)

The user played the restored village and reported: not enough guidance (indicators, notifications, "next fun thing"), no main
character, villagers cannot be asked for anything, fish pond and fishing missing, trees too slow, broken things unclear, hens
blocked by a fence the player cannot make, nothing shows when a tree or crop is ripe, villagers do not walk between houses,
a language button outside Settings, and a crop menu that cannot be changed after choosing.

| # | Report | Verdict | Fix | Status |
|---|---|---|---|---|
| 1 | Seed menu: once chosen, the crop cannot be changed | Real bug: an armed press on a bed planted at once and took the drag, so no menu | A press that does not move is a tap and opens the menu; only a drag sweeps (camera.mjs, radial.mjs) | done |
| 2 | Language button outside Settings | Fair | Hidden from the HUD (kept in the DOM for tests); Settings has it | done |
| 3 | Hens need a fence the player cannot make | Fair: confusing in a restore start | Restored village: no fence rule, the coop yard comes whole; sandbox mode keeps the rule | done |
| 4 | Trees too slow | Fair | Apple level 2, first fruit 6 min, regrows 40 min; peach level 4, 15 min, 90 min. High-value slow trees come later | done |
| 5 | No sign that something is ripe or broken | Real UX gap | Floating bobbing coin over ripe crops, fruit, eggs and milk, finished goods, truck takings; red "!" over broken buildings (view/marks-view.mjs) | done |
| 6 | Not enough indices / next task | Fair | "Next:" chip with the one most useful thing; a tap flies there (core/next.mjs). Red dots on HUD buttons existed for orders, Today, projects | done |
| 7 | Broken things need a button to fix | Already there (tap the thing → Repair) but invisible | The red "!" and the Next chip lead to it | done |
| 8 | A main character | Missing | The player walks the farm: shown at the farmhouse, walks to the thing you tap, does the chore | planned |
| 9 | Everybody clickable, asks for something | Partly (talk bubbles) | A tap on a person gives a small errand or chat, rewards hearts/coins | planned |
| 10 | Fish pond, fishing for money (even "hacking" money) | Missing | Borrow Willowmere's pond/fish art and rules; villagers who fish sell their catch | planned |
| 11 | Trees: copy patterns from the reference game | Art | Add Willowmere tree variants | planned |
| 12 | People walk from home to other houses | Check life-view walkers | Walkers visit other cottages | planned |

Order: 1–7 done first (they are bugs and guidance); then 8, 9, 12 (people), then 10 and 11 (pond, trees).
