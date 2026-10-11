# Meadow and dairy: next gameplay release contract

Prepared 2026-10-09. This is the next release's scoped design and art request, **not shipped gameplay**.
The current `codex/clearer-guidance-art` release implements interface/guidance and AR-011/AR-013 integration only.

## A complete first dairy loop

Let the player choose animal husbandry after the school without requiring it for the school, clinic or existing
family arrivals. Existing cows and milk remain available. The first delivery adds a goat shelter and goats, a dairy
that turns cow milk into butter and goat milk into cheese, source-aware orders and a short shared-table story.
Use the existing purchased clearing or any legal owned farm space: an older farm does not have to buy the same
parcel again. A larger covered meadow region and land deeds are a subsequent land-system change, not a hidden
prerequisite for this first production chain.

| Stable ID | Role | Initial tuning proposal, to verify before implementation |
|---|---|---|
| `goat_barn` | Goat home, 3 × 2 cells, front path required | Level 8 after school; 450 coins; one home, four goats maximum |
| `goat` | Existing goat rig; new rules entry | 180 coins each; one `goat_feed` → one `goat_milk` in 6 minutes |
| `goat_feed` | Feed-mill recipe | Level 8; two corn + one wheat → three portions in 40 seconds; value 8 each |
| `goat_milk` | Separate produce, distinguishable from cow milk | Base value 34; no automatic substitution in old recipes |
| `dairy` | Parallel production, 3 × 2 cells, front path required | Level 8 after school; 750 coins; existing tray prices/capacity rules |
| `butter` | Dairy recipe using existing cow chain | Two `milk` → one butter in 2 minutes; value 78 (+18 over milk's base value) |
| `cheese` | Dairy recipe using goats | Two `goat_milk` → one cheese in 3 minutes; value 94 (+26 over milk's base value) |

Values are simulation inputs, not promises of best profit. Include feed replacement, ingredient opportunity cost,
building/animal purchases, occupied trays and collection attention in comparisons. No change to the 500-coin
opening or four lucky finds' 110-coin maximum. Farming, feeding, production and selling cost no project energy.
Animals remain comfortable while ignored; ready goods wait without spoilage. No new daily deadline.

## Story and discovery

Use three short optional scenes: a useful corner for animals, Lan's first butter batch, and a shared cheese picnic.
Only arrived/introduced villagers speak. June can supply a fallback invitation before Lan is present. Ada recalls
packing bread for Ellis; Pip volunteers to count the picnic plates. Do not introduce a sluice key, imply Ellis has
returned or claim chapters 6–9 are finished. Final English and natural Vietnamese scenes must be authored together.

An old recipe note may be found through the first explicit dairy inspection. It is a once-earned memory with a
visible next use, not another cash payment. Re-reading, switching language and replaying a scene never pays again.
Demand appears only after the appropriate animal/feed chain and a working dairy make it renewable. Advice explains
the actual missing ingredient, finished tray or surplus; it does not ask for another batch already in production.

## Art contract: AR-002 first delivery

These IDs are ready for Claude's art work; tuning does not require renaming or redrawing them.

- `goat_barn` and `dairy`: packed GLB roots with matching names. Authored base-centre origin, front +z. Every part,
  including roof, trough, chimney base and porch, fits inside **x ±2.9 m, z ±1.9 m**, within the 6 × 4 m footprint.
  Keep a clear front-centre doorway. Goat barn: door anchor; dairy: door, chimney and two window anchors.
- `goat`: reuse `public/assets/models/rigged/goat.glb` and the existing `RIGS.goat` unless a concrete defect requires
  art repair. Review Idle/Walk/Graze-or-fallback/Bleat-or-fallback with the existing pooled cast; do not create a
  second goat identity. Render a matching `goat.webp` animal icon.
- Goods: `goat_feed`, `goat_milk`, `butter`, `cheese`, with clearly different milk bottles/labels and recognisable
  food shapes at 32 px. No branded variants or duplicate inventory goods.
- Icons: `goat_barn`, `dairy`, `goat`, `goat_feed`, `goat_milk`, `butter`, `cheese`, each normal and 64 px `sm/`
  versions. Register delivered IDs and `SMALL_ICONS` coherently; record their provenance in `docs/ASSETS.md`.
- Targets: buildings ≤8,000 triangles each; goat's pooled actor stays within current cast allocation. Keep overall
  120 draws / 300,000 triangles and 1.1 MB initial code limits. Optional asset loading must not grow first-wave kits.
- Deliver on one `art/*` PR with generators, registrations and packed output. Coordinate exact kit/anchor mapping
  before runtime edits. Reuse stock stand-ins while awaiting delivery.

Miso's basket/mice, land deeds, meadow ground-detail distribution, the larger covered region and chapter 6 remain
separate portions of the original AR-002 proposal. Ground-detail placement depends on the selected region and
clearance rules; do not build it into this first kit. No coast/lighthouse or additional tree commission is implied.

## Implementation and acceptance before its future release

1. Model feed, inventory, renewable sources, animal limits and parallel recipes behind validated `act()/tick()`.
2. Add read-only source previews, catalogue/animal icons, reversible placement and real ingredient counts.
3. Save progress per profile; legacy farms keep their land, cows, recipes, queues and earned memories. Loading
   never purchases an animal, grants feed or manufactures story completion. Test full barns and refused actions.
4. Author the three scenes and source/advice text in both languages; preserve stable internal IDs and pronouns.
5. Run native rules, pace simulations, browser suites and production acceptance. Measure margins in a small farm
   and a developed farm before committing the proposed prices. Keep casual school ≤10 days, steady 3–4, keen ≥2.
6. Review phone/desktop at 130% text, all model rotations, neighboring placements, cast limits, reloads and duplicate
   reward protection. Record measured results before calling this implemented or deploying it.

## Status, 2026-10-10: first dairy loop implemented

Shipped with the proposed numbers: `goat_barn` (450 coins, four goats), `goat` (180 coins, goat feed in, goat milk out
every 6 minutes), `goat_feed` at the feed mill, `dairy` (750 coins) making `butter` from two cow milk and `cheese` from
two goat milk. Both buildings open at level 8 after the school. Models `goat_barn` and `dairy` are in the decor kit
(`art/blender/build_farm_kit.py`), the four goods in `build_items.py`, seven icons rendered in both sizes. Rules tests:
`tests/dairy.test.mjs`. Not done yet from this document: the three story scenes, the recipe-note memory and the
source-aware order and advice text. Still open from v0.5 as a whole: land deeds, the east meadow region, Miso the cat,
chapter 6 and market day.

