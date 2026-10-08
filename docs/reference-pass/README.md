# Reference pass: opening composition and item art

Written by the art lane on 2026-10-08. It responds to Codex's
[comparison with Xóm Nông Trại](../REFERENCE-GAME-COMPARISON.md) and to the user's request: "analyze the asset and menu
of nongtrai.jackle.dev … if something we need to do better in Blender drawing then make plan to do that and making
the asset for all items better". We learn patterns only. No art, meshes, icons or exact compositions are copied.

## Review of Codex's plan

The plan is sound and we keep its order: guidance first, then composition, then land, then production chains. Its
diagnosis of the opening matches what we measured: a long row of beds on a broad bright lawn, with the farmhouse
outside the frame. Two refinements:

1. **Item art was missing from it.** The report credits the reference's illustrated icons with giving its menus their
   identity, but it lists no item-art step. We add one, the item pass below, in the art lane.
2. **What the reference does with colour.** Its tended ground is calmer than ours, its wild land is darker and more
   olive, its soil is dark, and its warm roofs stand out against that. The fix is relative emphasis, not more
   saturation. Codex's report says the same, and we followed it.

Lane split, unchanged: Claude does step 3 (opening composition and presentation) and the item art. Codex does steps 1
and 2 (advice, guidance and missing-ingredient sources), and both lanes share steps 4 and 5 (a covered-land branch and
one connected production chain).

## Done in this PR

### Opening composition

| Change | Where | Cost |
|---|---|---|
| The restored village opens on **one picture of the home farm**. On a wide screen it shows the farmhouse, forecourt, road, all six beds and the mill. A portrait phone is too narrow to show the farmhouse and the beds at a readable size, so its frame keeps all six beds in the clear upper half, above Pip's bubble and Ada's card, with the mill and the farm path beside them. Spans stay under 40, so the opening draws at full detail | `src/ui/guide.mjs` (`HOME_FRAME`) | none |
| **Tended land:** owned farm parcels use a calmer green (`meadow #74b44a`), half the colour noise and a faint 2 × 2 plot grid, so buildable land reads as cared for | `src/view/world-view.mjs`, `src/view/ground.mjs` | none (vertex colours) |
| **Quieter wilds:** land not yet bought and the countryside shift warmer and more olive (a hue shift, not a darker value) with patches of sunlit dry grass, blended per corner so there is no seam where they meet kept grass. The brook and pond banks use the same tint (lawn `#6db446`) | `src/view/ground.mjs` (`wildTint`), `src/view/brook.mjs` | none |
| **Farmhouse forecourt:** about 60 warm stone tiles (0.9 m on a 1 m pitch) over a grout-coloured ground, from the porch steps toward the road. One path cell joins it to the road, in line with the path over to the farm. Two flower planters and a bench sit on it. It stays inside the farmhouse's fixed footprint, so nothing buildable is covered | `HOME_YARD` in `src/content/world.mjs`, `src/view/world-view.mjs`, `src/view/dress.mjs` | none (in the homestead's merged mesh, which hides at far zoom; the existing bench) |

Before and after: `opening-phone.jpg`, `opening-desktop.jpg`, `farmhouse-forecourt.jpg`, `farm-from-above.jpg`. Each pair
was captured the same way (the same load, timing and camera) from `main` (`d335560`) and from this branch.
We compared three lawn values (A, the current one; B, slightly less saturated; C, olive). We chose B. C turned dull,
against the art direction "vivid warm, not pastel".

### Item art

| Item | Before | After |
|---|---|---|
| wheat | a thin, dark sheaf | a full, bright sheaf with a red twine bow |
| bread | an orange oval with dots | a crusty loaf with flush pale scores and flour on the crust, and a roll, on a darker bread board |
| corn bread | a yellow block | five slices in a cast-iron skillet, the sixth resting on the rim so the dark pan shows; butter; a short handle |
| chicken feed, cow feed | jars | burlap sacks rolled open on the feed, with a yellow label and a big emblem (a hen's head, a cow's head): orange burlap for chickens, olive for cows |
| egg | one plain egg | two brown eggs and one cream egg in a darker straw nest, so it reads on cream panels |
| perch, carp, catfish, goldfish | 160 px copies from Willowmere | rendered by our icon rig at 256 px with the same light and outline; carp and catfish warmer; on the diagonal so they fill the square |

The tool gains `"roll"` in `art/blender/render_icons.py`. It turns a long subject in the icon square. Before and
after at 160 px and 48 px: `item-icons.png`. We tried a three-carrot bunch and dropped it, because the single carrot
reads better at 48 px.

## Icon render v2 (follow-up PR)

The item-art comparison measured our icons as pale and flat next to the reference's, with an outline that vanished at
chip sizes. All 92 icons are re-rendered by a new rig (`art/blender/render_icons.py`, `icon_post.py`):

- **Cycles** (96 samples, denoised; `--engine eevee` for drafts) for soft contact shadows and occlusion.
- **Lights in the camera's basis** (after `roll`), so light always comes from the top left of the picture: a large warm
  key, a soft warm fill at 25 %, a rim at 35 %; portraits get a 35 % brighter key so faces stay friendly.
- **A low warm world** (strength .3, warm earth below, cream above; v1 used a flat .8 fill) and a **bounce floor** the
  camera cannot see, for warm light and contact shade on undersides.
- **Per-icon surfaces** (`rough`, `metal` in `icons.json`): glossy fruit, eggs and heart; matte sacks and bread.
- **Camera presets** (`preset`: goods, dish, token, tool, fish, building) and a 1.18 margin for goods.
- **A round outline** 2.8 % of the icon (7 px at 256) instead of a 2 px square ring, so icons keep their edge at
  18–26 px.
- The pond's three water discs no longer share a height (coincident faces shadowed each other to black in Cycles).

Before and after: `icons-v1-v2.jpg` (every icon at 72 and 26 px), and the barn and build menus on a phone
(`icons-v2-barn.jpg`, `icons-v2-build.jpg`). The full plan, with the per-item model rebuilds still to do, is
`docs/REFERENCE-NONGTRAI.md`.

## Next (art lane), in order

1. **Remaining item icons, the same treatment.** Corn (husk peeled back, brighter kernels), milk (our own churn or
   bottle), apple pie and carrot cake (keep, slightly larger in frame), and the tool icons (check them at 48 px).
2. **World accents.** Small dressing near the home (a well or water jar, a cart, a doghouse by the kennel) and
   pebbles and tufts at the edges of tended land, all inside the phone budgets.
3. **Discovery presentation** (step 3, with Codex): show the keepsake model on the discovery card when the logic
   lane wants it (`discovery-props.glb`), with a restrained glint and the reduced-motion rules.
4. **Menu looks** (colour sections only; layout is Codex's): the menu comparison's concrete suggestions (round item
   tokens, button colour meanings, a tidier HUD status stack) will be listed in the next PR's plan, `docs/REFERENCE-NONGTRAI.md`.

## Review

A code reviewer and a visual reviewer went over the first version of this PR. We fixed the following:

- The opening spans were 40 and 48, which made the game draw the opening at mid detail. Both are now under 40.
- The phone frame cut off a bed. It now keeps all six in view.
- Bread and corn bread had geometry bugs.
- The forecourt tiles were too big and too flat, and its planters stretched the plaza mesh and stood on buildable land.
- The olive tint barely shifted the hue and left seams.
- The fish icons' outlines were clipped.
- The before images were not like-for-like.

The item-art comparison also found that our renders are pale and flat next to the reference's (lighting, values, soft
geometry, outline width at chip sizes). That is the next PR, for all 92 icons, with its full plan in
`docs/REFERENCE-NONGTRAI.md`.

## Checks for this PR

- `npm test` passes 237/237.
- Every browser suite passes on the composition build, including the look, world, art, restore and fleet budgets.
  `tests/browser.mjs` passes 28/28.
- First-load code is 1,011,094 of 1,100,000 bytes.
