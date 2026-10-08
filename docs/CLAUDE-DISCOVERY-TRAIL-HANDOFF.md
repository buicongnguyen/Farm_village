# Claude handoff: AR-010, an old-object discovery trail

Requested by the user on 2026-10-08. Coordinate with Codex, who is implementing the rules and UI on `codex/localized-character-names`. Current shared baseline: PR #9 merged as `f80ceb0`; Codex has integrated it. This request is separate from a broader icon pass and does not authorize every proposed art request.

## Message to Claude

Work in `C:\Users\n\source\repos\Farm_village-art` on a new `art/discovery-trail` branch based on current `origin/main`. Read AGENTS.md and this brief. Keep any existing uncommitted work safe; do not change Codex's checkout.

Your task is the art for **one optional old-object discovery trail**, AR-010. Codex owns its interaction rules, saved progress, dialogue, translations, notifications and rewards. Please do not implement any of those or modify `src/core`, `src/ui`, `src/main.mjs`, `src/content/exploration.mjs`, or localization files.

Story/presentation contract:

1. At the existing farmhouse forecourt, the player inspects an old box beside the bench. A little note points toward the village pond.
2. By the existing pond dock, the player inspects a small cache and finds a faded picnic ribbon.
3. Back at the farmhouse, Ada explains a warm family picnic memory. The player receives one existing flowerpot decoration and a retained memory, not a new jackpot. Ellis remains upriver. The trail is unrelated to the sluice key or water rights.

Create small original Blender props, using the existing AR-009 keepsakes as a style reference:

- `trail_porch_box_closed` and `trail_porch_box_open`: an old, friendly wooden box, with a tiny folded note visible only in the open version.
- `trail_pond_cache_closed` and `trail_pond_cache_open`: a little weathered tin with a restrained tuft of reeds or ivy attached; an open version reveals the ribbon. Keep it on dry ground beside the dock, not in the fishing water.
- `trail_picnic_ribbon`: a small cheerful keepsake, worn but cared for. No written names or lettering baked into the mesh or icon.

Deliver these in a separate packed `public/assets/models/exploration-props.glb`, generated through the Blender pipeline and `pack.mjs`. Aim below 1,000 triangles per prop, with a shared material/atlas and a consistent ground-level pivot. Document dimensions and anchors. Reuse suitable existing geometry where practical. Add `trail_picnic_ribbon.webp` through `render_icons.py`; do not regenerate unrelated icons or models.

You may add only the new kit registration in `src/view/kinds.mjs` and the new icon registration in `src/content/icons.mjs`; Codex will not edit those files during this slice. Do not manually edit the generated ANCHORS block. Do not place props in `dress.mjs`, `world-view.mjs`, or `land-view.mjs`, subscribe to game events, or add always-on glints. Codex will handle placement, picking, visibility, loading and stage changes after your delivery. Optional glow/reveal concepts can be demonstrated in screenshots; do not wire effect eligibility into shared runtime files.

Keep the current warm, vivid art direction and the phone limits (120 draws, 300k triangles). At most one state of each prop is shown at a time; future locations must not be revealed through an always-visible object. No new currency icons, energy bars, fog system, tree-cutting rules, crop faces, or story illustrations are needed for this request.

Record the generator, packed GLB, icon, triangle/material counts, provenance, dimensions, and preview images in `docs/ASSETS.md` and an AR-010 delivery note. Also correct the small provenance note from PR #9: forecourt planters now belong to `home-hedge`, not the merged plaza mesh. Preserve other agents' notes.

Use test port 5242. Run the required asset/build/browser checks for your changes, report which exact revision they cover, and open a PR. Do not push directly to main or merge/deploy this asset PR before Codex checks it with the trail logic. Deliver the branch/PR and exact node names. The logic can ship a working preview using the existing bench, menus, and AR-009 icons while this art is prepared.

## Ownership and integration

| Area | Active writer |
|---|---|
| New Blender props, packed kit, new ribbon icon, provenance | Claude |
| New kit/icon registration only | Claude |
| Content and English/Vietnamese dialogue | Codex |
| Rules, reward ledger, save migration, profiles | Codex |
| UI, radial actions, Today/Album, navigation and browser tests | Codex |
| Future placement/picking/loading in shared views | Codex, after Claude's delivery; record exact functions before editing |
| `docs/ASSET-REQUESTS.md` | Codex adds request; Claude later appends a delivery note after fetching it |

This is a complete small trail, not the complete covered-land system. Land purchases, ownership, scenery-tree clearing, skills, energy, vehicle restoration, and later story chapters remain separate releases. Neither lane should quietly expand the scope into those systems.
