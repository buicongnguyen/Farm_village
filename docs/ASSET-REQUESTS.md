# Asset requests

The queue between the **logic lane** (usually Codex) and the **art lane** (usually Claude Code). The rules for both lanes
are in `AGENTS.md`. Anyone can add a request: the logic lane, the art lane or the user.

## How it works

1. **Ask.** Add a request below with the template. Use the next free id (AR-0nn) and the status `requested`.
2. **Carry on.** The logic lane builds the feature with a stand-in (see "Stock") and writes which one in the request.
   It never waits for art.
3. **Build.** The art lane sets `in progress`, builds on an `art/<topic>` branch, opens a pull request, and sets
   `delivered` with a delivery note. In the same pull request it registers the model and icon and switches the stand-in
   lines.
4. **Check.** After the merge, the logic lane checks the asset in play and sets `done`, or writes what is wrong.
5. **Change.** To change a request, edit it and add a dated line. Do not quietly rewrite a delivered one.

**Status values:** `proposed` (the art lane suggests it; the user or the logic lane confirms) → `requested` →
`in progress` → `delivered` (with the pull request) → `done`. Also `placeholder` (a copied icon is waiting to be
replaced) and `dropped`.

## Request template

```
### AR-0nn: <short name>
- Status: requested · Priority: P1 / P2 / P3 · For: <version or feature> · Asked by: <lane or user>, <date>
- What: <what it is and what the player does with it, one or two lines>
- Game ids: <building, good or kind ids, exactly as in src/content>
- Size: <footprint in cells at rotation 0 (1 cell = 2 m); the front faces +z>; height if it matters
- Anchors: <door, chimney, window ×n, light ×n, a part that moves, or none>
- Variants: <for example bare and ripe, broken and fixed, faded and restored, open and closed, levels 1-3>
- Moves: <static, or a separate node that spins or opens (like feed_mill_sails)>
- Icons: <icon ids>
- Stand-in now: <the existing model or icon used meanwhile>
- Notes: <story, style, references (patterns only)>
```

## Delivery note template

```
- Delivered: PR #<n>, branch art/<topic>, <date>
- Model: <kit>.glb, node `<name>` (and `<name>_mid`); <n> triangles; <w × d × h> m
- Anchors: <labels and counts>
- Icons: public/assets/icons/<id>.webp
- Registered: src/view/kinds.mjs (<entries>), src/content/icons.mjs (<ids>)
- Checked: npm test; browser screenshots on phone and PC; phone budgets at spans 24, 60, 140 and 220
- For the logic lane: <anything left to wire up>
```

## What the art lane can make

- **Good fit:** buildings, props, plants and trees, crops in growth stages, goods and items, icons, faded and restored
  versions, and simple moving parts (rotors, wheels, doors, lids). They are made by Python scripts in Blender, in the
  chunky low-poly toon style of `farm-kit.glb`, with vertex colours and one material.
- **Reused, not made new:** rigged characters and animals with walk cycles. We recolour rigs from the user's earlier
  games (the list is under "Stock").
- **Budgets** (`tests/assets.test.mjs`): building ≤ 8,000 triangles, prop ≤ 1,200, ripe crop ≤ 1,500, tree ≤ 3,500,
  animal ≤ 2,000. The whole scene stays within 120 draw calls and 300,000 triangles at every zoom.
- **Style:** `docs/RESEARCH-APPEAL.md` section 4 (palette, rules for gold, the celebration ladder). Take patterns from
  other games, never their art.

## Stock you can use now (no request needed)

| Kit (`public/assets/models/`) | What is in it |
|---|---|
| `farm-kit.glb` (ours) | Crops in three growth stages (wheat, carrot, corn, pumpkin, strawberry); coop, cow barn, feed mill (+ `feed_mill_sails`), bakery, fruit stand, kennel, pond, truck, order board, bench, lamp, picket set; trees `cute_round`, `cute_pine`, `cute_blossom`, `cute_apple`, `cute_peach`, `cute_cherry` (each fruit tree also `_bare`) |
| `decor.glb` (ours) | `plank_bridge`, `fountain`, `bunting`, `banner`, `sale_sign`, `scaffold`, `window_box`, `door_lantern`, `flowerpots`, `doormat`, `path_stones`, `obstacle_bush`, `obstacle_stump`, `obstacle_log` |
| `props.glb` (Starline) | `scarecrow`, `haybale`, `sacks`, `crate`, `barrel`, `cart`, `signpost`, `postbox`, `street_lamp`, `flowerpot`, `laundry_line`, `beehive_branch` |
| `nature.glb` (Starline) | `lilypads`, `reeds`, stepping stones, rocks, flowers, `hydrangea`, bushes, `grass_tuft`, broadleaf, maple, sakura and chestnut trees |
| `rural-extra.glb` (Willowmere) | `silo`, `home_t0`, `home_t2`, `home_t3`, `picket_fence`, `rail_fence`, `hay_round`, `tractor`, `pond_dock`, `stump` |
| `farm.glb` (Willowmere and Zoo Garden) | Animals: chicken, chick, cow, calf, duck, duckling, pig, piglet, dog, goat, kid, goose, gosling. Shelters: `chicken_shelter`, `duck_shelter`, `cow_shelter`, `pig_shelter`, `dog_shelter`, `goat_shelter`, `goose_shelter`. Also `pen_fence`, `pen_gate`, `feed_trough`, `water_trough`, `hay_bale`, `egg`, `milk`, `egg_basket`, `duck_egg`, `truffle` |
| `town.glb` (Willowmere) | Houses `house_gable`, `house_front`, `house_tall`, `house_hip`, `house_round`; `school`, `hospital`, `police`, `company` |
| `fish.glb` (Willowmere) | 19 fish (`fish_perch`, `fish_carp`, `fish_catfish`, `fish_golden`, `fish_koi`, `fish_eel` and more), `boot`, `bobber`, `lily_pad`, `lily_flower`, `reeds` |
| Rigged, animated (`src/view/skinned.mjs`) | hen, cow, pig, goat, sheep, duck, dog, cat, crow, rabbit; villager man, woman and kid; Hana (Ada) |
| Unused so far | the strawberry crop models and icon (there is no strawberry good yet), the `oink` sound |

## Queue

| Id | Name | For | Priority | Status |
|---|---|---|---|---|
| AR-001 | Look pass: colour, light, gold, celebrations | every screen | P1 | proposed |
| AR-002 | Meadow and dairy set | v0.5 (stage 3) | P1 | proposed |
| AR-003 | New uses for goods | v0.5-v0.6 | P2 | proposed |
| AR-004 | Story set pieces for chapters 6-9 | v0.6-v0.8 | P2 | proposed |
| AR-005 | Ellis on screen | the sluice payoff | P2 | proposed |
| AR-006 | Colour comes home (faded ruins) | restoration | P2 | proposed |
| AR-007 | Tết set | update for late January 2027 | P3 | proposed |
| AR-008 | Small happy faces on a few crops and fruit | optional charm | P3 | proposed, needs the user's yes |

Requests AR-001 to AR-008 are the art lane's proposals, drawn from `docs/JOURNEY.md` and `docs/RESEARCH-APPEAL.md`. The
user or the logic lane confirms each one (status `requested`), changes it, or drops it. Ids and sizes are suggestions:
the logic lane decides the final game ids.

### AR-001: Look pass: colour, light, gold, celebrations
- Status: proposed · Priority: P1 · For: every screen · Asked by: art lane, 2026-10-08
- What: the colour, light and gold pass from `docs/RESEARCH-APPEAL.md` sections 4 and 6 (suggestions 2 and 3):
  - three lightness steps on the ground (lawn, paths, soil), warm dirt instead of khaki;
  - a cool daytime fill light so shade is cool, not grey; a cleaner green bounce light;
  - dark edges or outlines on things the player can collect;
  - reward gold as a five-step ramp with an outline and a moving glint; gold kept for earned moments;
  - cheap shine (one highlight step for fruit, gold, glass and water; a warm rim light at dusk and in big moments);
  - the celebration ladder (small, medium, big), including a real moment for picking fruit and for the golden carp;
  - an orange wrench instead of the red "!" on things to repair; aqua target rings; the roadmap panel in the main UI
    colours.
- Files (code, art lane): `src/view/world-view.mjs` (`GROUND_COLORS`), `src/kit/toon.mjs`, `src/view/daylight.mjs`,
  `src/style.css` colour tokens, the look of `src/view/juice.mjs`, `src/ui/fx.mjs`, `src/view/marks-view.mjs`, and the
  roadmap panel colours in `src/ui/village.css`.
- For the logic lane: please leave those colour and effect values alone while this is open. If a feature needs a new
  effect, emit an event and add a line here.

### AR-002: Meadow and dairy set (stage 3)
- Status: proposed · Priority: P1 · For: v0.5 · Asked by: art lane, 2026-10-08
- What: what the meadow stage needs, following `docs/JOURNEY.md` (goats at level 8 with a dairy; Miso the cat keeps mice
  out of the barn; land deeds).
- Game ids (suggested): buildings `goat_barn`, `dairy`, `cat_basket`; goods `goat_milk`, `cheese`, `butter`; an icon for
  land deeds (`land_deed`); a small `mouse` model for the barn (no rig: it scurries in code).
- Size: `goat_barn` 3 × 2 cells; `dairy` 3 × 2 cells; `cat_basket` 1 × 1 cell.
- Anchors: dairy: door, chimney, 2 windows; goat barn: door.
- Variants: broken and fixed for the dairy if it starts run down.
- Icons: `goat_barn`, `dairy`, `cat_basket`, `goat_milk`, `cheese`, `butter`, `land_deed`.
- Stand-in now: `goat_barn` → `goat_shelter` (farm.glb); `dairy` → `bakery`; the goat rig exists; icons: `milk` for the
  dairy goods.

### AR-003: New uses for goods
- Status: proposed · Priority: P2 · For: v0.5-v0.6 · Asked by: art lane, 2026-10-08
- What: the props and icons behind "every good has several uses" (`docs/RESEARCH-APPEAL.md` section 5).
- Game ids (suggested): buildings `compost_heap` (1 × 1; three states: empty, working, ready; a steam anchor) and
  `beehive` (1 × 1); goods `fertiliser`, `honey`, `jam_cherry`, `jam_apple`, `jam_peach`, `fish_pie`, `ca_kho`,
  `grilled_fish`, `pumpkin_pie`, `cherry_tart`, `peach_cobbler`, `custard`, `mooncake`, `crumbs`, `worm_bait`.
- Stand-in now: `beehive_branch` (props.glb) for the hive, `sacks` for the compost heap; icons: `bread` and `egg`.

### AR-004: Story set pieces for chapters 6-9
- Status: proposed · Priority: P2 · For: v0.6-v0.8 · Asked by: art lane, 2026-10-08
- What: the places and things that make the mystery's payoffs visible (`docs/RESEARCH-APPEAL.md` section 3):
  - **sluice gate** across the brook upriver, a world piece: variants with the old padlock, with the new lock, and open;
  - **old mill with a water wheel** by the brook: the wheel is a separate node that turns (like `feed_mill_sails`), with
    a still and a turning state;
  - **festival stage**: a burned ruin and the rebuilt stage;
  - **lanterns**: star lantern (*đèn ông sao*, in many colours), carp lantern (*đèn cá chép*), a lantern string;
  - **school bell** prop (a tap drops the key);
  - **clue board** in the farmhouse (a prop and a UI icon);
  - relic icons: `bell_rope`, `lantern_frame`, `padlock_e`, `ledger_page`, `cork_float`, `poster_scrap`.
- Stand-in now: `hospital` or `company` (town.glb) for the mill; `plank_bridge` for the sluice; `bunting` for lanterns.

### AR-005: Ellis on screen
- Status: proposed · Priority: P2 · For: the sluice payoff · Asked by: art lane, 2026-10-08
- What: Ellis walks in at the gate on Lantern Night. A recoloured villager man rig (older, grey hair, a fishing hat and
  vest), a fishing rod prop, and a portrait icon `person:ellis`.
- Stand-in now: the villager man rig with a grey tint.

### AR-006: Colour comes home (faded ruins)
- Status: proposed · Priority: P2 · For: restoration · Asked by: art lane, 2026-10-08
- What: unrepaired cottages and the civic row look faded (walls #C9BFB2, roofs #9C8F86, no flower boxes); a repair
  brings the colour back with a wave. Probably a colour fade in the existing batches rather than new models (cheaper);
  the art lane decides. It touches `src/view/land-view.mjs` (shared): coordinate before starting.

### AR-007: Tết set
- Status: proposed · Priority: P3 · For: an update in late January 2027 (Tết is around 6 February 2027; check a
  Vietnamese lunar calendar) · Asked by: art lane, 2026-10-08
- What: peach blossom (*hoa đào*) and yellow apricot (*hoa mai*) branches or trees, a kumquat pot, red couplets on doors,
  icons `banh_chung`, `five_fruit_tray`, `red_envelope` (it never pays coins), and a family photo frame.
- Notes: red and gold mean luck here; no white headbands or robes in the celebration.

### AR-008: Small happy faces on a few crops and fruit
- Status: proposed, needs the user's yes · Priority: P3 · Asked by: art lane, 2026-10-08
- What: a few hero crops and fruits get tiny faces, sleepy while growing and awake and smiling when ripe, seen only up
  close, never sad, with a setting to turn them off. The pattern comes from My Dear Farm; the art is our own.

## Notes between lanes

- 2026-10-08, art lane: added `AGENTS.md`, `CLAUDE.md`, this file and `docs/RESEARCH-APPEAL.md` on `main`. Logic lane:
  merge `origin/main` into your branch before your next task (only new files, no conflicts expected). The v0.4 pull
  request (#1) still contains art changes (`cute_cherry`, `fruit_stand`, `kennel`, new icons); from now on the art files
  are the art lane's. Section 6 of `docs/RESEARCH-APPEAL.md` lists small fixes for that pull request.
