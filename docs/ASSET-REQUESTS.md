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
4. **Check.** The logic lane checks the asset in play on the PR or an integration branch before merging to `main`,
   because that merge deploys. Record acceptance or what needs changing; verify production after the approved merge,
   then set `done`.
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
- **Style:** `docs/HOLLOWBROOK-IMPLEMENTATION-PLAN.md` section 6 is the consolidated direction; section 4 of
  `docs/RESEARCH-APPEAL.md` supplies research and earlier proposals. Preserve the user's richer-color preference and
  the master plan's corrections rather than treating all older gold/red rules as requirements. Take patterns from
  other games, never their art.

## Stock you can use now (no request needed)

| Kit (`public/assets/models/`) | What is in it |
|---|---|
| `farm-kit.glb` (ours) | Crops in three growth stages (wheat, carrot, corn, pumpkin, strawberry); coop, cow barn, feed mill (+ `feed_mill_sails`), bakery, fruit stand, kennel, pond, truck, order board, bench, lamp, picket set; trees `cute_round`, `cute_pine`, `cute_blossom`, `cute_apple`, `cute_peach`, `cute_cherry` (each fruit tree also `_bare`) |
| `discovery-props.glb` (ours) | Keepsakes `lucky_tin`, `lucky_button`, `lucky_box` (AR-009): handheld presentation pieces, not placed on the map |
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
| AR-001 | Look pass: colour, light, gold, celebrations | every screen | P1 | done (live 2026-10-08) |
| AR-002 | Meadow and dairy set | v0.5 (stage 3) | P1 | proposed |
| AR-003 | New uses for goods | v0.5-v0.6 | P2 | proposed |
| AR-004 | Story set pieces for chapters 6-9 | v0.6-v0.8 | P2 | proposed |
| AR-005 | Ellis on screen | the sluice payoff | P2 | proposed |
| AR-006 | Colour comes home (faded ruins) | restoration | P2 | proposed |
| AR-007 | Tết set | update for late January 2027 | P3 | proposed |
| AR-008 | Small happy faces on a few crops and fruit | optional charm | P3 | proposed, needs the user's yes |
| AR-009 | Small discovery keepsakes and icons | introductory discoveries | P1 | delivered (PR #PRNUM, awaiting logic-lane check) |

Requests AR-001 to AR-008 originated as art-lane proposals, drawn from `docs/JOURNEY.md` and `docs/RESEARCH-APPEAL.md`.
AR-001 was built with the scope in `docs/CLAUDE-HANDOFF.md` and is live; the others remain proposed. The user or logic lane
confirms each separately, changes it, or drops it. Ids and sizes are suggestions: logic decides final game ids.

### AR-001: Look pass: colour, light, gold, celebrations
- Status: done: merged in PR #2 (`32e3a62`), checked in production 2026-10-08; see `docs/look-pass/README.md` · Priority: P1 · For: every screen · Asked by: art lane, 2026-10-08
- Scope: `docs/CLAUDE-HANDOFF.md` and the consolidated plan section 6 take precedence over the original proposed
  treatment below. No requirement to reserve gold solely for rewards, prohibit red errors, use universal outlines,
  or add scene-wide light flashes. Other asset requests are not automatically approved by this request.
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

### AR-009: Small discovery keepsakes and icons
- Status: delivered (PR #PRNUM, awaiting logic-lane check; delivery note in "Notes between lanes") · Priority: P1 ·
  For: introductory discoveries · Asked by: user / logic lane, 2026-10-08
- Scope: [CLAUDE-DISCOVERY-HANDOFF.md](CLAUDE-DISCOVERY-HANDOFF.md). First delivery is assets and registration only,
  on `art/discovery-props` in the art worktree. Codex owns rules, saves, UI behavior, story and English/Vietnamese
  content on `codex/dialogue-review`. AR-001 remains done; this request does not approve AR-002 through AR-008.
- What: three small keepsakes with different readable silhouettes: a little found tin; a brass fish-shaped button
  with a simple pond mark on its back; a small box with cloth and a smooth pebble. The street thank-you reuses the
  existing envelope/mail and coin treatment; it does not need a fourth model.
- Game ids: discovery `pond-tin` → asset `lucky_tin`; `pond-keepsake` → `lucky_button`;
  `stone-keepsake` → `lucky_box`; `street-thanks` → existing mail/coin treatment.
- Size: small handheld keepsake scale, not a placeable building and not a cell footprint; front +z, origin at base.
  Record final dimensions in the delivery note. Each complete prop is at most 1,200 triangles.
- Anchors: none required for the first static delivery. Do not add guessed world-location anchors.
- Variants: one readable static presentation per keepsake. Separate opening/closing animations are outside this delivery.
- Moves: static. Use the established warm, rich look and selective highlights; any later reveal should have a
  restrained glint. Coordinate new visual subscriptions before touching `src/view/juice.mjs` or `src/ui/fx.mjs`.
- Icons: `lucky_tin`, `lucky_button`, `lucky_box`, each with a matching WebP at `public/assets/icons/<id>.webp`.
- Deliver: Blender generator/source changes, meshopt-packed GLB output, matching icons, registry entries and
  provenance in one coherent art PR. A dedicated `discovery-props.glb` is a suitable packaging choice; record the
  actual kit path and exact node names. Never hand-edit generated `ANCHORS`.
- Stand-in now: existing icons only: `pond-tin` → `ui:coin`; `pond-keepsake` → `perch`;
  `stone-keepsake` → `tool:clear`; `street-thanks` → `ui:coin`. No new placeholder files or world actors are required.
  Art registers the new asset ids; Codex switches discovery-content icon references after integration.
- Rules context: second successful catch pays 20 coins; tenth pays 40; second newly observed successful owned-rock
  clear pays 30; completed broken restoration of Village Street (`road_south`) pays 20. Each is once per save,
  at most 110 coins total. These are authored discoveries, not repeating lottery rolls. Starting coins stay 500.
- Event contract: `discovery { id, coins, person }` plus `coins { coins, source: 'discovery', id }` for the same
  already-accounted reward. Neither event contains a position. Here `id` is a discovery id, not a placed-object id.
  Do not award coins, duplicate payment feedback, invent source coordinates, or spawn all props into the world.
- Notes: the fish button is a local pond keepsake; it does not advance the sluice/letter mystery. The full logic
  and profile scope is recorded in [PROFILES-AND-DISCOVERIES.md](PROFILES-AND-DISCOVERIES.md). Art can proceed with
  models and icons while Codex completes the UI integration and verification.

## Notes between lanes

- 2026-10-08, logic delivery: profiles and four lucky discoveries are pushed in `dc8223f` on `origin/codex/dialogue-review`, [PR #4](https://github.com/buicongnguyen/Farm_village/pull/4). The AR-009 event contract and existing-icon cards are ready for art integration. 211 rules tests, all browser components after fixture corrections, 28/28 smoke checks, pace and production build pass. AR-009 assets are still requested; production has not changed.

- 2026-10-08, logic verification: the AR-001 fruit test now checks fruit, leaf and glint shapes emitted by the pick action itself. Its former threshold of 20 particles depended on unrelated particles: one normal tree emits 19. No art handlers, particle values, models or colours changed. The orchard migration check now expects save version 6; discovery money is checked separately from ordinary fish income.

- 2026-10-08, logic lane, **AR-009 handoff**: the user requested three discovery keepsakes and matching icons on
  `art/discovery-props`. First delivery is assets/registration only; no new writer is reserved for `juice.mjs` or
  `fx.mjs`. Before a later effect subscription, record the named functions, active writer and committed handoff
  revision here. Codex is active on `codex/dialogue-review` for discovery eligibility/accounting, independent save
  profiles, UI and English/Vietnamese. Current source includes main `a1607de`, merged as `7e126fb`; AR-001's done
  status and every earlier art note below are preserved. New discovery work is not represented as already merged
  or deployed. Refer to `CLAUDE-DISCOVERY-HANDOFF.md` for the exact first delivery and event contract.
- 2026-10-08, logic lane, review handoff **`b03c38c`**: `PeopleView.visit` carries the visit number and `sayVisit`
  re-evaluates dialogue eligibility against the farm when the visitor actually speaks, once per visit. Preserve
  this behavior when making later actor/effect changes. Persisted heart/charm news now stores numeric `threshold`
  separately from timestamp `at`; live events keep their existing threshold in `at`. Do not treat a saved news
  timestamp as a heart/charm threshold or restore the older stale visitor line behavior.

- 2026-10-08, logic lane **handoff complete**, commit **`20e5f5b`**, PR #1: the additive contract below is implemented
  and covered by rules and English/Vietnamese phone tests. `main.mjs` now plays `pop` for picking fruit and `cheer`
  for a first rare species catch; repeated rare catches keep `pop`. `heartScene` additionally carries a numeric
  `variant` (or null), not dialogue text, for save-safe scene selection. All 175 rules tests, component browser suites,
  28 smoke checks and both builds pass. Production first load is 967,982 bytes. Claude can consume these events on
  its art branch; visual handler ownership remains with Claude. Review AR-001 in play before a production merge.

- 2026-10-08, art lane, **AR-009 delivered**: [PR #PRNUM](https://github.com/buicongnguyen/Farm_village/pull/PRNUM),
  branch `art/discovery-props` at `ARTCOMMIT`, merged with `origin/main` `ab6b230` (PR #4). Built to
  `docs/CLAUDE-DISCOVERY-HANDOFF.md`.
  - Source: `art/blender/build_farm_kit.py`, section "lucky finds (AR-009)" (new colours `cloth`, `clothd`, `clothl`,
    `pebble`); icon jobs in `art/blender/icons.json`. Blender 4.5.9 LTS, vertex colours, packed with
    `art/blender/pack.mjs` (meshopt). `farm-kit.glb` and `decor.glb` are byte-identical to `main`. Provenance:
    `docs/ASSETS.md`, "AR-009 lucky finds".
  - Kit: **`public/assets/models/discovery-props.glb`** (25.6 KB), nodes `lucky_tin`, `lucky_button`, `lucky_box`, one
    static mesh each. Nothing loads it yet: no world placement, no footprint, no `KIND_MODELS` entry; load it with
    `loadKit('discovery-props')` when a card or reveal needs a model. Front faces +z, origin at the base centre, metres.
  - `lucky_tin`: 1,076 triangles, 0.183 × 0.205 × 0.140 m (w × d × h, lid included): a teal tin with a cream label and
    red fish, brass rims, the lid leaning behind, two coins, a puddle and a notched lily pad beside it.
  - `lucky_button`: 1,032 triangles, 0.159 × 0.161 × 0.132 m: a brass fish button with a four-hole centre, an eye and
    the glint, leaning on a soft blue cloth pouch with a loose red drawstring. The tiny pond (ring, pool and ripple) is
    engraved on the button's back, which faces the pouch in this pose.
  - `lucky_box`: 816 triangles, 0.194 × 0.132 × 0.148 m: a wooden trinket box with a teal lining and one brass clasp, a
    smooth slate pebble (with the glint) on cream cloth tied with a red ribbon, a crumb of earth beside it.
  - Icons: `public/assets/icons/lucky_tin.webp`, `lucky_button.webp`, `lucky_box.webp` (256 px, transparent).
  - Registered: `src/view/kinds.mjs` `KITS['discovery-props']`; `src/content/icons.mjs` `ICON_IDS.keepsakes`.
    `tests/assets.test.mjs`: one check (≤ 1,200 triangles, handheld size, base origin, icon present, never placed).
  - Screenshots: `docs/discovery-props/` (stand-in vs new icons at 160 px and actual 48 px on dark and light panels; a
    close-up render of the three props).
  - `street-thanks`: no fourth asset. The existing treatment is the `mail` envelope glyph (`iconHtml('mail')`,
    `src/ui/icon.mjs`) with the `ui:coin` coin; there is no rendered envelope WebP. Which one its card shows is the
    logic lane's choice.
  - Checked on the merged tree: `npm test` 212/212; `npm run build:test` first-load code 986,420 of 1,100,000 bytes;
    every kit meshopt-packed (`tests/assets.test.mjs`); all 16 browser suites (with
    the new discoveries and profiles suites and the phone-budget checks) and `tests/browser.mjs` 28/28 pass on port 5242. Scene budgets (≤ 120 draws, ≤ 300,000
    triangles at every zoom) are unchanged because no scene loads the new kit.
  - No changes to `juice.mjs`, `fx.mjs`, `discoveries.mjs`, triggers, rewards, saves, dialogue or UI.
  - For the logic lane: switch the three stand-in icons in `DISCOVERIES` after integration (`ui:coin` → `lucky_tin`,
    `perch` → `lucky_button`, `tool:clear` → `lucky_box`) and check the cards on phone and PC in both languages. A
    later reveal or glint needs the shared-function handoff the brief describes.

- 2026-10-08, logic lane **active** after the user's start instruction: Codex owns the small conversation-selection
  changes in `src/view/people-view.mjs`, mailbox/heart-card behavior in `src/ui/bonds-panels.mjs`, core event metadata,
  and sound routing in `src/main.mjs`. Claude owns the AR-001 visual handlers in `src/ui/fx.mjs` and
  `src/view/juice.mjs`; Codex will not edit those files. No Blender, binary, palette or light changes are in this pass.
  The first implementation adds metadata without changing rewards: `picked { id, good, count, stored, sold, coins }`
  splits harvested units between storage and overflow sale; `barnSold` remains the single overflow-payment event.
  `fishCaught { fish, first, rare, stored, sold, coins }` uses the saved species album for `first` and the fish table's
  rarity flag. Actual `coins` collections identify `source: 'stall' | 'fruit_stand' | 'pond'`, with a placed `id`
  for the two stands when present, otherwise null. Sale events still mean takings waiting, not wallet transfers.
  Both lanes must review this additive contract before integrating visual handlers; final handoff is the logic PR.

- 2026-10-08, art lane: added `AGENTS.md`, `CLAUDE.md`, this file and `docs/RESEARCH-APPEAL.md` on `main`. Logic lane:
  merge `origin/main` into your branch before your next task (only new files, no conflicts expected). The v0.4 pull
  request (#1) still contains art changes (`cute_cherry`, `fruit_stand`, `kennel`, new icons); from now on the art files
  are the art lane's. Section 6 of `docs/RESEARCH-APPEAL.md` lists small fixes for that pull request.
- 2026-10-08, art lane: AR-001 delivered on `art/look-pass` (base: `origin/codex/v0.4-orchard` f0d8886 + `origin/main` ff555e0).
  Active writer during this pass: `src/view/juice.mjs` (`events`, new `picked`, `goldenCatch`, `waiting`), `src/ui/fx.mjs`
  (`result`), `src/view/marks-view.mjs`; new `src/view/collect-flow.mjs`. Look values: `src/view/world-view.mjs`
  (`GROUND_COLORS`, path/road edges), `src/view/ground.mjs` (grass tones, dirt), `src/view/daylight.mjs` (day and dusk
  keys), `src/kit/toon.mjs` (lights), `src/view/brook.mjs` (day water), `src/style.css` (ink, gold, panel tokens), the
  `.journey-goal` colours in `src/ui/village.css`, and the tree palette in `art/blender/build_farm_kit.py` (rebuilt
  `farm-kit.glb`). Requests for the logic lane: (1) add `stored` and `sold` to `picked` so the barn flight and "+n" are exact
  with mixed fruit overflow; (2) optional `pond` id on `fishCaught` (the gold burst uses the village pond); (3) leave pick and
  golden-carp sounds to `juice.mjs` (do not add `picked` to SOUNDS in `main.mjs`, or tell me and I remove mine);
  (4) `tests/restore.browser.mjs` "Next chip does the chore" is flaky on the unchanged baseline too (failed 4 of 5 runs).

- 2026-10-08, logic lane: merged `origin/main` at `ff555e0` into `codex/v0.4-orchard` (merge `0e4ed21`). The existing
  planning notes were preserved. `HOLLOWBROOK-IMPLEMENTATION-PLAN.md` combines the user's later choices with the
  evaluated research. The normal start stays 500 coins; the 110-coin discovery schedule is proposed tuning. The user
  explicitly selected energy for larger projects only, so AGENTS.md now records that exception to the older report.
- 2026-10-08, logic lane, recommended order (not blanket approval of the queue): start a scoped **AR-001** look and
  collection-feedback comparison while logic verifies the v0.4 fixes and story/dialogue integration. Keep the stronger
  orchard colors, test path-value separation and cooler fill, and preserve the vivid gold news badge. Do not require
  gold to mean only earned rewards, prohibit every red error treatment, or add automatic screen-wide light washes.
  **AR-006** can supply a small refinement in that pass; faded building variants already exist.
- 2026-10-08, logic lane: **AR-002** stays proposed until the next release's meadow/dairy rules and IDs are selected.
  Split **AR-003** into a chosen first recipe/use rather than commissioning the entire list. **AR-004** needs the
  story fact sheet first: old/new-lock variants and a key falling from the school bell are not settled mechanics.
  **AR-005** should be reusable for an Ellis visit and later homecoming, with presence controlled by logic. **AR-007**
  has no approved seasonal release deadline. **AR-008** remains proposed pending the user's explicit choice; the
  logic lane recommends leaving faces out of the initial look pass and judging a sample later if desired.
- 2026-10-08, logic lane, first feedback contract: `picked { id, good, count }` means a successful fruit harvest;
  overflow may also be sold via `barnSold`, so count alone does not guarantee all fruit entered storage.
  `stallSold { sold, coins }` means takings waiting at the stall, not a wallet transfer. `coins { coins }` is emitted
  on actual collection (including other collection sources); add source/location metadata through logic if needed.
  `fishCaught { fish }` identifies a catch; logic must define any new first/rare metadata. Art must not grant rewards
  from an animation. Agree active writers for the relevant `fx.mjs`/`juice.mjs` functions before changing handlers;
  art owns colors/motion and logic owns eligibility/accounting/tests. No handler work has started in this handoff.
- 2026-10-08, logic lane: the user requested a ready-to-send Claude message and a Codex task list, with logic work
  waiting for a later start instruction. Recorded those in `docs/CLAUDE-HANDOFF.md` and `docs/CODEX-TASKS.md`.
  AR-001 is requested for that handoff; no agent was automatically instructed to start implementation. During AR-001,
  Claude is the proposed active writer of visual handlers in `fx.mjs`/`juice.mjs`; Codex will avoid parallel edits
  there and own any necessary core payload or `main.mjs` sound-routing changes. Record the final handoff commit.
- 2026-10-08, art lane: combined check of `art/look-pass` with `codex/v0.4-orchard` at `7610c40`: 179 rules tests and every
  browser suite pass (`browser.mjs` 28/28). Logic's new `picked.stored/sold` and `fishCaught.first/rare` are used by the
  effects; pick and rare-catch sounds now come only from `main.mjs` (art removed its duplicates, `448502d`). At the user's
  request PR #1 and PR #2 were merged into `main` (`32e3a62`) and deployed; production loads on phone and PC with no errors
  and serves the new colours and effects. AR-001 is done. Logic lane: merge `origin/main` into your next branch first.
