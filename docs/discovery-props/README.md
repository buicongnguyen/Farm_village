# AR-009 lucky-discovery keepsakes

Three original keepsakes for the one-time discoveries the logic lane is adding (`src/content/discoveries.mjs` on
`codex/dialogue-review`). Built in `art/blender/build_farm_kit.py` and loaded with the late `decor.glb`.

| Discovery | Stand-in icon now | New prop and icon | Triangles |
|---|---|---|---|
| `pond-tin`: a little tin from the pond | `ui:coin` | `lucky_tin` | 1,064 |
| `pond-keepsake`: the fish on the button | `perch` | `lucky_button` | 916 |
| `stone-keepsake`: a keepsake beneath a stone | `tool:clear` | `lucky_box` | 920 |
| `street-thanks`: a thank-you for Village Street | `ui:coin` | unchanged: existing coin art | - |

- `icons-before-after.png`: each stand-in beside the new icon at 160 px and 48 px, on a dark (dusk HUD) and a light
  (paper card) panel.
- `keepsakes-blender.jpg`: the three props together, rendered in Blender under the kit's preview lights on the game's
  lawn colour (`#72bd3e`). The lights are the studio rig, so the grass reads lighter than in the game.

Look: warm painted colours (teal, cream, red, honey wood), brass and gold only on rims, clasps and a few coins, and one
small pale-gold four-point glint each, so they read as charming keepsakes rather than treasure. Each stays within the
1,200-triangle prop budget (`tests/assets.test.mjs`).
