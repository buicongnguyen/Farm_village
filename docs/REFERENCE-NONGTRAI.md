# Reference: nongtrai.jackle.dev, and the plan for better item art

> **Status, 2026-10-08.** Step 1 of section 6 (the render rig: Cycles with camera-relative lights, a warm low world,
> a bounce floor, per-icon surfaces, camera presets, margins and the 7 px round outline) is delivered with all 92
> icons re-rendered (PR "Icon render v2"). The `sm/` chip-size variants wait for the logic lane to load them
> (`iconHtml`); we will not ship unused files. Steps 2–7 (style helpers, the per-item model rebuilds, new icon ids, menu
> art, world assets) remain. Track progress in `docs/reference-pass/README.md`. This document is the research record
> written by the art lane's comparison workflow; its measurements were taken before the item pass in `39430a1`.

Art lane, 2026-10-08. This plan follows the item pass in commit `39430a1` (wheat, bread, corn bread, feed sacks, eggs and the four fish). It also builds on Codex's [REFERENCE-GAME-COMPARISON.md](REFERENCE-GAME-COMPARISON.md) and on [reference-pass/README.md](reference-pass/README.md).

We copy **patterns only**. No reference image, mesh, icon or composition goes into our game. The reference captures (screenshots and their atlas previews) stay out of this repository. Only our own before and after sheets get committed.

**Where the numbers come from:**
- Image statistics were measured on our current WebP files and on 154 reference item frames. The scripts are `icon_stats.py`, `ref_stats.py` and `interior.py` in the comparison session's scratchpad.
- Triangle counts come from `%TEMP%\fv-raw-items.glb`, built at 15:34 just before the item pass was committed.
- Code references are to `art/blender/*.py` at `5fe6d16`.

---

## 1. What nongtrai does well and poorly (patterns)

### Does well

1. **Light makes the form, not an outline.** Their icons look like clay or vinyl renders:
   - one large soft warm key light from the top-left
   - warm bounce light on the undersides and dark occlusion in creases
   - shadows that turn terracotta, not grey

   Measured on the inside of each icon (outline excluded): mean brightness 0.56, darkest 5 % at 0.29, brightest 5 % at 0.82, standard deviation 0.17. They have no outline and no drop shadow, and their icons still read on cream, white and dark backgrounds.
2. **Smooth, bevelled forms where geometry is free.** Their icons are offline renders, so every edge is rounded and every organic shape is subdivided: a deep-lobed pumpkin, a thick coin with a raised rim, wheat ears made of rows of grains.
3. **One camera rule per category:**
   - foods at about 30–35° elevation
   - every tool on the same diagonal, head at the top right
   - currency almost face-on
4. **Room around each icon.** The longest side fills about 81 % of the frame. Coverage averages 0.38 of the frame (range 0.09–0.61), so icons have even visual weight in a grid.
5. **Containers show processing.** The pattern is: bare crop, then sack or basket, then bowl or plate, then glass. Pale goods always sit in a darker, saturated container (eggs in a carton, flour in a coloured sack).
6. **Siblings are told apart by hue and emblem.** The two feed sacks differ by emblem and by the colour of what spills out. The coin is gold and the XP star is blue. Product families share one motif.
7. **Menu grammar:**
   - buildings sit on a grass-and-soil tile
   - list items sit on round cream tokens with an owned count
   - green means commit, blue means go somewhere, a red dot means unread
   - ready bubbles show the actual product
   - the camera pans so the building stays visible above its sheet
8. **The world reads at play zoom:**
   - crop stages grow strongly (0.34 m to 1.66 m)
   - fruit sits on the outside of the canopy
   - sparse grass, flower and rock scatter on every empty cell
   - a lower sun casts long shadows
   - wind sway is authored per vertex in Blender

### Does poorly (do not copy)

1. **The icons do not match the world.** A tile-roof cottage icon stands for a hip-roof house, a Holstein icon for brown box cows, and a rich feed-mill scene for a plain shed.
2. **Inconsistent sets.** Growth-stage sprites are nearly identical, and icon and world styles drift apart. Our icons are
   rendered from the same models as the world, so they can be regenerated consistently.
3. **4.9 MB of WebP atlases load at start, even on phones.** Ours: 92 icons, 818 KB in total, loaded only when needed.
4. **Their world models are weaker than ours:**
   - box-limbed animals of 600–780 triangles
   - faceted icosphere trees and plain box houses
   - house tiers that share one silhouette
   - a dimmed green night and sawtooth river banks
5. **The phone HUD is crowded:** a 7-button column, a chat ticker, a quest card and a gift banner. One level-up row even shows an untranslated id ("ga").
6. **Plain panels:** cream headers, and anonymous rows on the truck orders.

---

## 2. Side-by-side gaps

| Area | nongtrai | Hollowbrook now | Gap | Fix |
|---|---|---|---|---|
| Icon light | Soft warm area key, warm bounce, AO; darkest 5 % at 0.29, std 0.17 | `render_icons.py` lines 191-193: three suns (key 3.4, cool fill 1.0, back rim 3.0 at 3°); world colour `(.58,.52,.46)` at strength .8 lifts every shadow; no AO. Darkest 5 % at 0.45, std 0.12 (heart 0.04, xp 0.05, pumpkin 0.07) | Forms read as flat fills; pale goods vanish | 3.1 R1 |
| Geometry | Smooth, bevelled | `spindle()` forces flat shading (`style.py` line 496); 8–10-sided cones and spindles; 24-vertex coin; 20-face icosphere kernels | Wheat looks like quartz, the pumpkin like a tangerine, the strawberry like a gem | 3.1 R3, 3.3 |
| Readability at 22–58 px | No outline; air around each icon | `icon_post.py` line 19: `MaxFilter(5)` ring, about 2–3 px at 256 px, which is 0.4 px at 46 px and nothing at 26 px. `ortho_scale = max(w,h) * 1.1`, so the longest side fills 0.93; the fish (margin 1.02) touch the frame edge | The outline cannot be seen; thin items shrink to specks in chips | 3.1 R6, R7 |
| Pale goods | Off-white with tan shading, or inside saturated containers | Share of inner pixels brighter than 0.9: carrot_cake 52 %, milk 37 %, egg 26 %, feed sacks 15–16 % | White on white in barn tiles | 3.1 R2, 3.3 |
| Camera | One rule per category | Free `view` values per job: corn_bread [-30,52], pie [-30,40], sickle [0,10], shovel [-20,15] … | Reads as a pile of single icons, not one family | 3.1 R5 |
| Symbols | Thick coin with an emblem; XP star in a different hue | `coin()`: a 24-sided disc with an "I" bar that reads as "pause"; `star()`: plain yellow, the same hue as the coin; `heart()`: a flat extrusion | Coin and XP blur together at 26–38 px | 3.4 |
| Tools | One diagonal, one palette | Mixed sources (Starline hammer, Starline crate), mixed angles, grey steel (saturation 0.11) | The build tool row does not look like one set | 3.4 |
| Value tiers | Containers and garnish show worth | 15 goods priced 2–110 with no visual sign of value | Carrot cake (110) looks no richer than bread (12) | 3.1 R9 |
| Item budgets | n/a | 5 item models over 1,200 triangles: glove 1,596, carrot_cake 1,420, bread 1,280, chicken_feed 1,228, item_egg 1,220 | Triangles spent on box bevels and tiny icospheres, not on silhouettes | 3.1 R8 |
| Icon and world match | Mismatched | Rendered from the same GLBs the world draws | **We lead. Keep it.** | 3.1 R10 |

---

## 3. Blender item-art plan

### 3.0 Decisions where the three analyses disagreed

| Question | Decision | Why |
|---|---|---|
| Outline or none? | **Keep the outline, make it thicker** (round, 7 px at 256 px), and A/B test without it once the new light is in | Our UI draws every SVG glyph with a thick brown stroke (`O = '#5b3418'` in `src/ui/icon.mjs`). The rings match our brand, and a round dilation also thickens hair-thin parts such as the catfish whiskers. |
| AgX or Standard view transform? | **Keep Standard.** Get contrast from the lights, not from a tone curve | The runtime uses no tone mapping, so Standard keeps icon colours equal to the palette hex values. AgX desaturates bright yellows and oranges, which breaks the "vivid warm, not pastel" rule. |
| EEVEE or Cycles? | **Cycles for the final icon pass, EEVEE for drafts** (new `--engine` flag) | Cycles gives real bounce light and contact occlusion with no hand-placed fakes. About 92 offline renders is fine. |
| Bake subdivision into item models? | **No. Item models stay at 1,200 triangles or fewer.** Spend the triangles on silhouettes: smooth shading, enough segments, no tiny icospheres, fewer bevel segments on boxes | It honours the prop budget, keeps one source of truth (the icon is the model), and leaves item models ready if they ever appear in the world (stall crates, harvest fly-outs). |
| Their composition patterns (green bow on the sheaf, hen on the feed label, rice ear on the coin, orange handle with green grip and dirt smear on the shovel, brown eggs in a terracotta carton, cake slice) | **Use our own equivalents** (below): red twine knot, egg and hen-footprint label, cow-spot label, a Hollowbrook leaf-and-brook emblem, grip colour by tool, straw nest, whole cake with one wedge cut out | Patterns, never their art. |

### 3.1 Shared style rules

**R1. Light rig.** Changes in `render_icons.py`, functions `reset()` and `render()`:

1. Add `--engine cycles|eevee` to the argument loop (default `cycles`).
   - In `reset()`, for Cycles: `s.render.engine = 'CYCLES'` inside `try/except TypeError`, `s.cycles.samples = 96`, `s.cycles.use_adaptive_sampling = True`, `s.cycles.use_denoising = True`. Read the denoiser enum before setting it.
   - Keep `film_transparent`, `view_transform = 'Standard'`, `look = 'None'` and the `size * ss` resolution.
2. World: strength **.3** (from .8), with a vertical gradient (the world direction's Z drives a Mix Color): `#C98A50` below, `#FFF3DC` above.
3. Replace `sun()` with `area(loc, target, size, energy, color)`. Place the lights in the camera's basis, after `roll`, so light always comes from the top-left of the picture. Let `right` and `up` be the camera's local X and Y axes, `back = d`, and `R` the existing bounding-box diagonal.
   - **Key:** at `c + 2.2R·norm(-0.8·right + 0.9·up + 1.0·back)`, size `3R`, colour `(1, .93, .82)`, energy `K·(2.2R)²`. Tune K once, so the lit face of the coin (`#FFD866`) peaks at 0.92–0.95 brightness.
   - **Fill:** at `c + 2.5R·norm(1.0·right + 0.1·up + 0.8·back)`, size `4R`, **25 %** of the key, warm-neutral `(1, .97, .92)`. No blue.
   - **Rim:** at `c + 2.2R·norm(0.5·right + 0.8·up - 1.0·back)`, size `R`, **35 %** of the key (now 88 %), `(1, .92, .80)`.
4. **Bounce floor:** a plane at `lo.z - .001`, size `8R`, material `#E8B070` with roughness 1 and `visible_camera = False`. It adds warm bounce and contact occlusion on undersides without putting a floor into the icon. The CSS `drop-shadow` on `img.icon` stays the only cast shadow.
5. **Per-job surface:** new job keys `rough` and `metal`, applied to every imported material's Principled BSDF after `wire_vertex_colors()`. Item roots carry one `VC` material, so these keys act on the whole icon.
   - Defaults: goods .55 / 0
   - fruit, egg, pumpkin, heart: `rough .35`
   - burlap, bread, wood: `rough .75`
   - coin: `rough .3, metal .5`
6. Drop the painted "shine" blobs (`fruit()` and `egg()` in `build_items.py`) once real highlights show. Put one back only if the 48 px row loses its gloss.

**R2. Values.**
- Every material's shadow side must reach a brightness of 0.33 or less.
- Goods whites are capped at `#FFF4DC`; never `#FFFDF6` (the `frost`, `plate` and `milk` keys in `C`).
- Pale goods ride on a saturated, mid-value container or plate: nest, cloth, crate, dish.
- Shadows lean warm. Crevices go toward `(0.75, 0.62, 0.55)`, never grey.

**R3. Shape.**
- Smooth shading on every organic part. Give `spindle()` a `smooth=False` parameter; items pass `True`, and the farm kit keeps its current output byte for byte.
- Minimum segments around the silhouette: 24 for parts wider than 0.3 m, 12 for 0.1–0.3 m, 6 below that.
- Chunky proportions for a roughly 1 m item:
  - nothing visible thinner than 0.06 m (handles 0.07 m); thin stalks only inside bundles
  - emblems at least a quarter of the item's width
  - grains and kernels as bumps on a lathe surface rather than separate icospheres

**R4. Colour ramp and cavity.** New helpers in `style.py`, used through `vc_join()`:
- `to_vertex_colors(obj, tint=None, corner=None)`, where `corner(c, mat_name, co, n) -> c` is called once per loop. It is backwards compatible: the farm kit passes nothing.
- `ramp(mats, lo_hex, hi_hex, axis='z', z0=None, z1=None, gamma=1.0)` returns a `corner` callback. It blends only the named materials along height.
- `cavity(obj, strength=.35)` darkens concave vertices: the mean of `(neighbour - v)·normal` drives a multiply toward `(0.75, 0.62, 0.55)`. It works within connected surfaces (pumpkin lobes, sack folds). Cycles handles the gaps between separate parts.
- `blade(name, base, angle, length, width, curl, segs=4)` makes a curved, double-sided leaf or husk strip (about `8·segs` triangles). It replaces flat diamond `leaf()` pieces in items.
- Rule: every organic part gets a two-stop ramp (lighter, warmer top; darker, redder base).

**R5. Camera presets.** Add a `PRESETS` dict in `render_icons.py`. Merge it as `job = {**PRESETS[job.get('preset', '')], **job}`, so a job's own keys still override. Remove free `view` values from goods, tools and UI jobs; any remaining override must carry a `"why"` key, which the script ignores.

| Preset | view [az, el] | roll | margin | Used for |
|---|---|---|---|---|
| `goods` | [-40, 32] | 0 | 1.18 | crops, fruit, sacks, eggs, bread, milk |
| `dish` | [-35, 40] | 0 | 1.18 | corn bread, pie, cake (was 52° and 40°, which flattened them to discs) |
| `long` | [-40, 32] | 35 | 1.18 | carrot, corn, wheat (25) |
| `tool` | [-40, 32] | 45 | 1.15 | all five tools; head at the top right. Positive roll should turn the picture clockwise; check the first render and flip the sign if needed |
| `token` | [-20, 12] | 0 | 1.15 | coin, xp, heart |
| `fish` | [-65, 30] | 38 | 1.12 | the four fish |
| `building` | [-35, 28] | 0 | 1.10 | ui:barn, ui:orders and all buildings |

Remove the model-side tilts that the presets replace:
- `o.rotation_euler` in `carrot()` (35°), `corn()` (40°), `sickle()` (-25°) and `shovel()` (-30°)
- the `tmpc`, `tmpk`, `tmps` and `tmpv` joins that only exist to carry those tilts

**R6. Framing.** Default margin 1.18, so the longest side fills about 0.85 before the ring, and the 7 px ring has room.
- Long subjects get the diagonal (`long` and `tool` presets) instead of shrinking.
- Gate: alpha coverage of at least 0.25 for goods, tools and UI icons.
- Gate: no opaque pixel within 4 px of the frame edge.

**R7. Outline and small variants.** In `icon_post.py`:
- `ring(alpha, px)`: a round dilation, `GaussianBlur(px*0.5)` followed by `point(v -> min(255, v*10))`, then a `GaussianBlur(.8)`. Tune it so the measured ring on `ui-coin` is 7 ± 1 px. Use `px = round(size * 0.028)` (7 at 256), in the UI outline colour `#5B3418` instead of `(52,32,20)`.
- **Small variant:** downsample the 512 px render to 64 px first (premultiplied, as now), then `UnsharpMask(radius=.6, percent=80, threshold=1)`, then `ring(alpha, 2)`. Write it to `public/assets/icons/sm/<id>.webp`.
  - It goes in a subfolder because `tests/assets.test.mjs` asserts that the top-level `.webp` count equals `Object.keys(ICONS).length`. A folder does not end in `.webp`, so it is not counted.
  - The UI picks it for `img.mini`, `img.mark`, the radial marks and status rows. That is a logic-lane line in `iconHtml`; see section 5.
- Keep the 256 px WebP at `quality=88, method=6`.

**R8. Budget.** Every item root stays at **1,200 triangles or fewer**.
- After the `vc_join` loop, `build_items.py` collects the offenders and calls `raise SystemExit` listing them, so the build fails instead of printing quietly.
- Main savings:
  - box bevel `seg=3` down to `seg=2` (the sack)
  - no separate darker-base meshes (use the ramp instead)
  - kernels and grains as surface bumps
  - leaflets at `ico(subdiv=1)` instead of 2

**R9. Containers and value grammar.** Write this table into the header of `build_items.py` and follow it for every new good:
- raw crop or fruit: bare
- feed: burlap sack
- baked goods: board, skillet, tin or plate
- dairy: bottle
- fish: bare, on the diagonal

Goods worth **50 coins or more** (corn_bread 55, apple_pie 70, goldfish 70, carrot_cake 110) get one richer cue: a checked cloth, a doily or a garnish of the source crop. Families share one motif: a wheat-ear brand on the bread board, carrots on the cake, an apple beside the pie, a cow-spot pattern on the cow-feed label and the milk.

**R10. Keep what already works.**
- Building and decor icons stay rendered from the GLBs the world draws.
- Never hand-paint or image-generate icons.
- When a goods model changes, check that the matching world crop still looks related (section 4, W1).

### 3.2 Gates in `icon_post.py` (printed per icon, `WARN` on failure)

The script measures each icon on alpha eroded by 3 px at 128 px. It writes `art/blender/icons-meta.json` with the opaque rectangle, pivot, coverage, fill and the statistics below. That file goes in `art/`, not `public/`, so the icon test is unaffected.

| Metric | Ours now | nongtrai | Gate (goods, tools, UI) |
|---|---|---|---|
| Darkest 5 % brightness | 0.45 | 0.29 | 0.33 or less |
| Brightest 5 % minus darkest 5 % | 0.36 | 0.53 | 0.45 or more |
| Standard deviation | 0.12 | 0.17 | 0.15 or more |
| Inner pixels brighter than 0.9 | up to 52 % | (the milk's darkest 10 % sits at 0.47) | 12 % or less |
| Mean inner saturation | 0.56 | 0.60 | 0.55 or more |
| Alpha coverage | 0.07–0.65 | 0.09–0.61 | 0.25 or more |
| Longest side fill (before ring) | 0.93–1.00 | 0.81 | 0.82–0.88 |
| Opaque pixels within 4 px of the edge | up to 6 (fish) | 0 | 0 |
| Triangles per item root | up to 1,596 | n/a | 1,200 or fewer (`build_items.py`) |

### 3.3 Goods: every id in `GOODS` (`src/content/icons.mjs`)

The "Budget" column gives triangles now and the estimated target. Every row also inherits R1–R9.

**Crops and fruit**

| Id | Source (now → new) | Problem now | Exact change | Preset · budget |
|---|---|---|---|---|
| `wheat` | `raw:items` / `item_wheat` | 23 upright, flat-shaded 6-sided spindle ears in a symmetric fan; coverage 0.31; reads as a yellow brush at 26 px and as crystals at 256 px | `sheaf()`: 11 ears from a new local `ear(base, dir, length=.34, r=.05, beads=7, sides=5)`. Each is a lathe whose profile alternates radius `r`/`.7r` per bead, each ring twisted half a segment, smooth. Corner ramp: crests `#F5C242`, grooves `#D9A02E`, tips `#FFE07A`. Ears sit on 3-sided stalks that arc out from the bundle top and lean 35–60° outward; the 3 front ears droop toward the camera. Keep the `bundle` cylinder (14 verts), flute alternate vertices by ±.012, stripe it `#E9B84A`/`#C9902F`, and tint its bottom cap `#C9902F` (drop the `cutends` mesh). `tie` torus at `major_segs=12, minor_segs=4`. Bigger red twine knot: two `torus` loops (major .09, minor .03, 8×4) and two tails in `#E8333A`. Ours stays red, not their green bow. | `long`, roll 25 · 1,056 → about 1,130 |
| `carrot` | `raw:items` / `item_carrot` | 10-vertex flat cone and 5 diamond leaves splayed in a circle; reads as an orange star | `carrot()`: `lathe` with profile `[(0,-.5),(.07,-.42),(.1,-.3),(.14,-.15),(.165,0),(.18,.15),(.17,.28),(0,.32)]`, 24 segments, `smooth_angle=180`. Scale the rings at z -.3, -.15, 0 and .15 by .94 for grooves; bend with `x += .06·t²` (t=0 at the shoulder, 1 at the tip). Ramp `#FF8A1F` to `#E5600F` at the tip, shoulder ring `#D9550C`. Tops: 3 fronds fanning upward at ±20° (`stalk` r .03, 4 sides, .35–.45 long), each with 3 leaflets (`ico` subdiv 1, r .07, scale (1, .45, .7)) in `#3FAE3A`/`#7BDB4F`. | `long` · 236 → about 1,130 |
| `corn` | `raw:items` / `item_corn` | Spindle cob, 50 faceted kernel icospheres and 3 flat husks splayed outward; "corn reads poorly" | `corn()`: capsule cob `lathe` (r .17, h .8, 16 segments, 12 rings). Push alternating vertices out by .015 for kernel bumps; corner tint by ring parity `#FFD23F`/`#FFE680` with `#E0A820` grooves. Remove the 50 `P('kern')` (about -1,000 triangles). Husks: 4 `blade()` strips; 3 hug the lower 60 % of the cob, one peels back. Ramp `#7DC94A` at the base to `#C8EC7E` at the edge. 6 silk strands (`stalk`, 3 sides, `#E8C46A`) at the tip. | `long` · 1,064 → about 550 |
| `pumpkin` | `raw:items` / `item_pumpkin` | 16 segments with a 10 % rib dip, a thin 6-vertex stem and a flat leaf; reads as a tangerine | `pumpkin()`: 32 segments, 11 profile points, `smooth_angle=180`. Replace the dip loop with `f = 1 - .2·abs(cos(5·ang))**.6` (10 lobes). Lower the top pole into a dimple. `cavity()` plus a corner tint: creases ×.7 toward `#E2550F`, lobe crests `#FFA040`. Stem: `cyl` with 8 verts, r .1 tapering to .06, bent, ramped `#6E8F2A` to `#9CCB3B`. A curled 5-segment `stalk` tendril and one `blade()` leaf. | `goods` · 252 → about 750 |
| `strawberry` | `raw:items` / `item_strawberry` | Flat-shaded 8-sided spindle; reads as a red gem or lantern | `strawberry()`: heart-profile `lathe` (widest .3 at 70 % of the height, rounded tip), 24 segments, 9 points, smooth. 21 seeds (`ico` subdiv 0, scale (1,1,.5)) placed on the surface along the profile radius and sunk .01. Calyx of 7 `leaf()` pieces lying flat with curled tips (`droop=-.03`), `#3FAE3A`. Ramp `#E8213F` to `#B8102A` at the tip. | `goods` · 516 → about 880 |
| `cherry` | `raw:farm-kit` / `cherries` → `raw:items` / `item_cherry` | Reads fine at 48 px, but its model ships in `farm-kit.glb` (first wave) and no game code uses it | New `item_cherry` in `build_items.py`: two `sphere(segs=20, rings=12)` of r .3 with top dimples, one `#D8243B` and one `#B81F2A` for depth, ramped toward `#A0102A` at the bottom. Forked stems as 3-segment `stalk` chains with 5 sides from one knot, and one `blade()` leaf. Then delete `piece('cherries', cherries())` from `build_farm_kit.py` (no `KITS` entry lists it), rebuild, and `cmp` the other roots. | `goods` · (farm-kit) → about 980 |
| `apple` | `raw:items` / `item_apple` | Plain sphere; at 48 px it is one of three warm balls (apple, peach, pumpkin) | `fruit()`: `sphere(segs=20, rings=12)`; pull the top and bottom pole rings in .05 for dimples. Ramp `#E8333A` to `#B81F2A` (`appled`) downward, plus a soft `#F5B21E` blush patch on one side. `rough .35` (glossy). | `goods` · 332 → about 500 |
| `peach` | `raw:items` / `item_peach` | The same mesh as the apple, in orange | `fruit()` gains a `kind` parameter. For the peach: the front-half vertices near the x=0 plane pulled in ×.93 (a suture crease), a slight point at the top, a blush ramp from `#FF5A5A` (lit side) to `#FFB36A`, `rough .7` (matte fuzz against the glossy apple), and two `blade()` leaves. | `goods` · 332 → about 540 |

**Produce, feed and baked goods**

| Id | Source (now → new) | Problem now | Exact change | Preset · budget |
|---|---|---|---|---|
| `egg` | `raw:items` / `item_egg` | Pale nest on cream (26 % of inner pixels above 0.9); over budget | `egg()`: two brown eggs (`#E9A868`, `#D98C4A`, new `C` keys `eggb1`/`eggb2`) and one cream egg (`#FFF1D8`), each `sphere(segs=14, rings=10)`. Nest darker: torus `#C99A3A` at `major_segs=16, minor_segs=6`, with 8 straw `stalk` strands in `#8A5A22` (was 16). `nestbed` cyl with 12 verts. Drop `shine`. A straw nest, not their carton. | `goods` · 1,220 → about 1,040 |
| `milk` | `3d_farmer_fish_sell/.../farm.glb` / `milk` → `raw:items` / `item_milk` | Borrowed model; white bottle on white tile (37 % above 0.9) | New `item_milk`. Its parts must not be named `milk`, to avoid the root-name collision. Bottle `lathe` with 24 segments and a shoulder and neck. Milk `#FFF4DC`, ramped to `#E8D2B0` at the base. An opaque pale "glass" shoulder band `#CFEAF2` above the milk line. Our blue cap `#2F9FD8` (24-vert `cyl`). A cow-spot label band: 5 flat `#3A2A20` discs (`cyl` with 8 verts, depth .01) on a `#FFF4DC` band, the family motif shared with cow feed. Drop the `view [-25,18]` override. | `goods` · borrowed → about 770 |
| `chicken_feed` | `raw:items` / `chicken_feed` | Burlap `#E2C08A` is near white in greyscale; emblem too small; over budget | `sack()`: `box('sack', bev=.17, seg=2)` (was 3). Burlap `#D08A4A`, seam `#A9622E`, rolled rim `#E8B070` (change the `burlap`/`burlapd`/`burlapl` values; only the sacks use them). Label `#FFD23F`, with the emblem twice as big: a large brown egg (`#D98C4A`) and a 3-toed hen footprint (3 `stalk` toes, `#8A4B25`). Heap kernels 14 → 8 and spill 8 → 5. | `goods` · 1,228 → about 950 |
| `cow_feed` | `raw:items` / `cow_feed` | Same issues; cannot be told from chicken feed at 26 px | Same `sack()` with a hue split: olive burlap `#9AA64A` (pass the sack colour as a parameter), label `#2F9FD8`, cow-spot emblem (3 `#3A2A20` flat discs on a `#FFF4DC` patch), green pellet heap `#7A9A3A`. | `goods` · 1,188 → about 950 |
| `bread` | `raw:items` / `bread` | Score boxes stick up out of the loaf like candles; flour floats .08 above the crust; board and loaf the same tan; over budget | `loaf()`: loaf `sphere(segs=24, rings=14)`. Make the scores **grooves**: push loaf vertices inside three slanted bands in by .02 and tint them `breadl`. That adds no triangles; delete the `score` boxes. Place flour on the surface with `z = cz + rz·sqrt(1-(dx/rx)²-(dy/ry)²) + .005`, 6 dots. Delete `base` and ramp the crust `#A8622A` (base) to `#E39A48` (top) instead. Board `#9C6236` with a `#7A4A28` edge and a tinted wheat-ear brand patch (no triangles). | `goods` · 1,280 → about 1,120 |
| `corn_bread` | `raw:items` / `corn_bread` | `view [-30,52]` turns it into a flat disc | `cornbread()`: lift `cb` so its top edge clears `panrim` by .03. Lift the wedge higher and tilt it toward the camera. Checker-tint the top faces `#F5BE3A`/`#E0A020` for crumb. Value cue (55): a red-and-cream checked cloth under the handle (a 4×4-grid `box`, `#E8333A`/`#FFF4DC`). | `dish` · 1,076 → about 1,150 |
| `carrot_cake` | `raw:items` / `carrot_cake` | White frosting on a white plate (52 % above 0.9); over budget | `cake()`: a whole cake with a 60° wedge missing, built with `extrude_outline` 300° sectors. The cut faces show layers: sponge `#D98A3A` (2 layers, `bev=0`), cream `#FFF1D8` (2 thin layers, `bev=0`), top frosting `#FFF1D8` with bevel. Bigger piped carrots (`cone` with 8 verts, r .06, h .22, ×6) and leaf tufts. Plate solid `#35B6F2` with a `#8FDBFF` rim (`torus` 24×4). Value cue (110): a scalloped `#FFF4DC` doily ring under the cake. | `dish` · 1,420 → about 1,100 |
| `apple_pie` | `raw:items` / `apple_pie` | Grey tin (`iron #B9C0CC`); `view [-30,40]` | `pie()`: a fluted teal dish `#1FB5B0` (new key `dish`) instead of the grey tin. Crimp the `crust` torus (alternate minor radius ±.015). Lattice ramped `#E8A35A` to `#C47B3A`, with `#FFE07A` apple-chunk dots in the gaps. Value cue (70) and family motif: half an apple (`sphere(12,8)`, cut face `#FFF1D8`) beside the dish. | `dish` · 928 → about 1,100 |

**Fish** (borrowed from `3d_farmer_fish_sell/public/assets/models/fish.glb`; no model changes)

| Id | Problem now | Exact change in `icons.json` | Preset |
|---|---|---|---|
| `perch` | Margin 1.02 clips it (3–6 px on the edge) | `preset: fish`, margin 1.12. Keep `view [-90,28]` with `"why": "side-on shows the stripes"` | `fish` |
| `carp` | Clipping | `preset: fish`, margin 1.12; keep the `recolor` | `fish` |
| `catfish` | Grey-brown (saturation 0.38), hair-thin whiskers, a dark round tail blob | `preset: fish`, margin 1.12. Recolour `Fish catfish body` `#A07A4A`, `Fish catfish fin` `#8A6440`, `Fish catfish spots` `#6E5440`. Import once to check which material the tail cap uses, and recolour it to the fin colour. The 7 px round ring thickens the whiskers. | `fish` |
| `goldfish` | Margin 1.04, slight clipping | `preset: fish`, margin 1.12, keep roll 24. Value cue (70, rare): optionally a 4-point `#FFF4DC` sparkle root in `build_items.py`, added through `group` | `fish` |

### 3.4 Tools and UI symbols: every id in `TOOLS` and `UI`

Each tool's grip colour is its identity:
- clear: red `#E8573F`
- harvest: green `#3FAE3A`
- move: sky `#35B6F2`
- store: teal `#1FB5B0`
- build: gold `#FFC83A`

Shared parts: handle r .07 in `#C77A3A` with darker grain bands (`#8A4B25`), and warm steel `#C9D2DC` with a bright `#FFFFFF` edge (tinted edge faces).

| Id | Source (now → new) | Problem now | Exact change | Preset · budget |
|---|---|---|---|---|
| `tool:clear` | `raw:items` / `shovel` | Grey iron (saturation 0.11), thin handle (r .045), tilted -30° in the model | `shovel()`: handle r .07; D-grip from a half `torus` (major .1, minor .03, 12×4) and a crossbar; red sleeve `cyl` r .08. Spade blade as a 12-point `extrude_outline` (depth .05, `bev=.015`) with the bright edge. A soil clump (`ico` subdiv 1, `#7A4A2A`) on the tip instead of their smear. Remove `rotation_euler`. | `tool` · 776 → about 600 |
| `tool:harvest` | `raw:items` / `sickle` | Rendered straight-on (`[0,10]`); the blade is 10 kinked stalk segments | `sickle()`: one crescent `extrude_outline` (14 outer and 14 inner arc points, depth .04, `bev=.012`, seg 1); the inner cutting edge tinted `#FFFFFF`. Handle r .07, green sleeve, ferrule `#5B6477`. Remove `rotation_euler`. | `tool` · 328 → about 320 |
| `tool:move` | `raw:items` / `glove` | Flat yellow; well over budget | `glove()`: palm `sphere(12, 8)`; fingers `cyl` with 8 verts at `bev=.03, seg=1`; tips `sphere(8, 6)`; fingers spread slightly with the thumb out. Ramp `#FFD866` to `#D99A2B`; sky cuff `#35B6F2` with a stitched band. Yellow rubber stays ours, not their leather. | `tool`, roll 20 · 1,596 → about 930 |
| `tool:store` | `raw:props` / `crate` (Starline) → `raw:items` / `tool_crate` | Dark (brightness 0.36, std 0.07); borrowed. The tool means "put a building in storage" (`build-view.mjs` line 116) | New `tool_crate`: an open crate with `#C98A4A` slats and `#8A4B25` posts, `bev=.02, seg=1`. A teal band `#1FB5B0` with a cream down-arrow stencil (tinted faces). A miniature cottage (`box` plus `extrude_outline` gable in our roof red `#E8573F`) sinking into it. | `goods` · borrowed → about 700 |
| `tool:build` | `3D_game_scene/public/models/hammer.glb` → `raw:items` / `tool_hammer` | Dark (brightness 0.44); borrowed; looks like the SVG demolish mallet | New `tool_hammer`: steel head (`box`, `bev=.02`, plus a round striking face `cyl` with 16 verts) and a claw; handle r .07 with a gold grip sleeve, crossing a warm plank (`#E3A05A`) with one nail. Our set's hammer, never a mallet. | `tool` · borrowed → about 500 |
| `ui:coin` | `raw:items` / `coin` | 24-sided disc with an "I" bar (reads as pause or "1"); std 0.08 | `coin()`: body `cyl` with 48 verts, depth .16, `bev=.03, seg=1`. Raised rim `torus` (major .42, minor .04, 48×4) around a recessed face `cyl` (r .34, 48 verts). Embossed Hollowbrook mark at +.02: a 10-point `extrude_outline` leaf over two brook-wave strips. Rim `#F5B21E`, face `#FFD866`, emboss ramped down to `#C98A10`. `rough .3, metal .5`. Remove `mark`. | `token` · 612 → about 850 |
| `ui:xp` | `raw:items` / `xp` | Plain yellow star, the same hue as the coin; std 0.05 | `star()`: `extrude_outline` with `bev=.08` and 3 segments. Poke both caps (`bmesh.ops.poke`) and push the centres out ±.08 for a domed star. Gold rim `#F5B21E` on the bevel faces, blue face `#2F95EA` on the caps (the HUD level-ring blue). No text. | `token` · 276 → about 200 |
| `ui:heart` | `raw:items` / `heart` | Flat extrusion in one pink; std 0.04 | `heart()`: 40-point outline. Inset each cap twice (`bmesh.ops.inset_region`, .05 then .08) and push the rings out in Y by .05 and .09 for a pillow; poke the centres; `bev=.07` with 2 segments. Ramp `#FF4F7B` on the lobes to `#E0285A` at the tip. `rough .35`. | `token` · 412 → about 800 |
| `ui:barn` | `3d_farmer_fish_sell/.../rural.glb` / `barn` | Fine: it is the world's `rural-lite` barn | No model change. Re-render with `preset: building`, margin 1.12, and check it in the 26 px row. | `building` |
| `ui:orders` | `raw:farm-kit` / `order_board` | Notes are small at 26 px | No model change at first. If the notes blur in the 26 px row, enlarge them in `board()` (`build_farm_kit.py`) from .3 to .36. That also changes the world board, which stays within budget. | `token` view, building margin |

### 3.5 New icons (art lane; register each id in `src/content/icons.mjs` in the same commit)

The test asserts one icon file per `ICONS` id, so each file and its registration must land together.

| New id | Source | Notes |
|---|---|---|
| `hen`, `cow` (and later `chick`) | `public/assets/models/rigged/chicken.glb` and `cow.glb`, the models that walk in the world | Add a `self:` prefix to `src_path()` that resolves to `ROOT`. New job key `pose: {action, frame}` (assign the action, then `scene.frame_set`). Idle frame, `view [-40,18]`, margin 1.05. Add an `ANIMALS` list to `ICON_IDS`. |
| `ui:today` | `build_items.py`: a tear-off wall almanac with a sunflower | Replaces the flat SVG on the HUD |
| `ui:projects` | `raw:decor` / scaffold, grouped with `tool_hammer` | Replaces the temple SVG |
| `ui:mail` | `raw:props` / `postbox` | The same postbox as the world |
| `tool:demolish` | `build_items.py`: a crowbar over a split plank | Never a mallet. `build-view.mjs` currently asks for `'demolish'`, which resolves to the SVG glyph, so the logic lane switches it to `tool:demolish`. |
| `ui:harvest_all` | `build_items.py`: a woven basket holding low versions of our wheat, carrot, corn and pumpkin | For the radial "All (N)" button |

---

## 4. World-asset changes worth doing next

These go in separate PRs after the items. Each must keep 120 draws or fewer and 300k triangles or fewer at every zoom (span 24/40/70/130/260 on a 390 px phone), plus the per-root budgets in `tests/assets.test.mjs`: ripe crop 1,500, `_mid` at most half of the near model, tree 3,500, prop 1,200, and **feed_mill, bakery and coop each at least 2,500**. They must also keep first-wave gzip bytes at 772,564 or fewer.

| # | Change | Where | Budget impact | Verify |
|---|---|---|---|---|
| W1 | **Crop silhouettes.** Each stage grows at least 1.4× in height or changes its dominant colour. The ripe state shows the product on the camera side. Minimum feature 0.25 m (0.4 m if it must read at span 70). **Wheat ripe:** mound top .18; about 30 stalks (`st` r .022) on a phyllotaxis disc of r .8; nodding ears `sp(r=.065, h=.32, sides=4)` leaning out .5–.7 and toward the camera; 1.15–1.25 m; about 600 near / 180 `_mid`. Mid wheat: the same stalks in green, no ears, 0.7 m. **Corn:** 3×3 stalks (r .06), leaves .2 wide, ripe cob `sp(.10, .42)` with husks open, 1.6 m ripe. **Carrot ripe:** 5 shoulders r .18 standing .18–.22 above the soil, leaning toward the camera, tops behind them, one pulled carrot lying on the soil. | `wheat()`, `corn()`, `carrot()` in `build_farm_kit.py` | Ripe 1,500 or fewer near; `_mid` at most half | `node art/blender/sheet.mjs crops.png "farm-kit:^crop_" --game --cols 6 --cell 2.4`. Re-render the `bed` icon (it groups `crop_carrot_ripe`), and the wheat, corn and carrot icons, so icon and world stay related. |
| W2 | **Fruit on the canopy shell.** Fruit r .30–.34 (`sub=1`), 10–12 per ripe tree, centred at `puff + n·0.92·r_puff` with `dot(n, (0,-.74,.67)) > .2`. The bare state carries 5 small green fruit, so ripening shows. Two puff layouts per tree type. Cherries move onto the front and top shell. | `cute()`, `cherry_tree()` | Tree 3,500 or fewer | Sheet at span 40; re-render `apple_tree`, `peach_tree`, `cherry_tree` |
| W3 | **Flower clump grammar.** A leaf dome (`blob` r .25, `leafd`) with 5–9 chunky heads (r .07–.10), at least .14 m across, .35–.5 m tall. Use it for `garden_flower`, `flowers` and the wild drifts. | New decor roots; `kinds.mjs` entries (art lane) | Prop 1,200 or fewer | Phone shots at span 40 and 70 |
| W4 | **Lawn scatter set.** Daisy rosette, clover, dandelion, 3-blade grass clump, pebble pair, and a 0.6 m verge clump; each 40 triangles or fewer. They feed a seeded, merged per-chunk dressing on empty owned cells, denser near fences, paths and plinths. | Pieces in `decor.glb`; runtime in `src/view/dress.mjs` `reserved()` (shared file: note it in ASSET-REQUESTS first) | 1–2 merged meshes per 32×32 chunk, no new materials | Draw count at span 130 and 260 |
| W5 | **Pond.** Water as a 2–3 ring disc ramped `#7FD8F2` (rim) to `#1F8FCF` (centre). A warm sand bank (about `#D9B97A`) replaces the grey ring; 2–3 clusters of larger rocks with moss caps; lily pads from `fish.glb`; thicker cattails. Match the brook to the same ramp. | `pond()` | Building budget | Span 40 desktop shot |
| W6 | **Obstacles.** About 1.4 m in a 2 m cell. Rocks: light warm top, darker base band, moss cap. Weeds: bright yellow-green with seed heads. Far stand-ins (`averageColor()`) stay mid-value. | Obstacle roots in decor | Prop 1,200 or fewer | Span 130 sheet: no dark specks |
| W7 | **Village kit.** New `build_village_kit.py` (move `roof_rows`, `timber_wall`, `window` and `gable` into `style.py`). 5 cottage silhouettes (gable, cross-gable, hip with dormer, tall narrow, L with porch). School (brick band, bell cupola), clinic (white plaster, teal roof, red-cross board), workshop. The unrestored state uses the same mesh: X planks, the scaffold, and a desaturated tint through `piece(..., tint=)`. Retire `house_round`. | New script, new kit | 1.5–3k per cottage with `_mid`; replaces 68.7k of `town.glb` | Restore before and after at dusk |
| W8 | **Bevel trim.** `bev=0` on boards, mullions, slats, rails and pickets under .15 m; keep bevels of .05 m or more on silhouette edges only. Print the per-root change in `build()`. | `bx()` default and call sites | Frees triangles, but **re-spend them in feed_mill, bakery and coop** so each stays at 2,500 or more | `npm test` budgets |
| W9 | **Baked AO and cavity.** Cycles `bake(type='AO', target='VERTEX_COLORS')`, each root baked alone with a temporary ground plane, multiplied in at .35–.5 (never below .55), plus `cavity()` on crops. Then lower the `ao` passed to `models.mjs` bake for those roots, so they are not darkened twice. | `build()` in `build_farm_kit.py` | None | `sheet.mjs` before and after |
| W10 | **Light.** Sun elevation from about 58° down to 42–45°; `Ground.stampShade` under buildings and bed groups, not only trees. | `src/kit/toon.mjs` line 81 (light values are art lane) | Check the shadow-camera frustum and shadow-pass draws | Draw count at every zoom |
| W11 | **Sway weights.** A `_SWAY` float attribute: 0 on trunks, rims and mounds; 0→1 along stalks; 1 on ears, leaves and fruit. Needs `export_attributes=True` in `export_vc()`; `models.mjs` keeps it through `mergeGeometries` and `addSway` multiplies by it. | `piece()`, `export_vc()`, `toon.mjs` | No draws | Watch at span 24 |

---

## 5. Menu and HUD suggestions

### Art lane (Claude: `art/blender/**`, `public/assets/icons/**`, colour tokens and colour sections, the look of effects)

1. **`base: "tile"` job option** in `render_icons.py` for the build catalogue:
   - a bevelled slab sized to the footprint × 1.15, height about 0.12 × max(w, d)
   - top in meadow `#74b44a` with a lighter rim, sides in soil `#8a5a34`
   - its vertices included in the framing points

   Use it for every building, fence, gate, path, lamp, bench, banner, scarecrow and fountain. Trees, flowers and the bush get `"base": "disc"`. This fixes lamp, street_lamp and banner (coverage 0.07–0.09) and the washed-out white fence, picket, gate and path. The tile copies their pattern, not their art.
2. **Small variants** (R7) in `public/assets/icons/sm/`, plus the review-sheet rows in section 6.
3. **Token look** as colour tokens in `src/style.css`: `--token-bg` (radial gradient from `#F3E2BF` to paper), `--token-ring` `#D9B98A` (3 px), and `ok` (leaf) and `short` (berry) ring variants. The logic lane applies the classes.
4. **Colour semantics tokens:**
   - `.btn.go` in sky (`--sky` / `--sky-dark`) for Show me, plan steps and Go-to links
   - `.badge.ready` in leaf green for counts the player can act on
   - berry red stays for new or unread
5. **New rendered icons** (3.5): hen, cow, today, projects, mail, demolish, harvest_all, and Ada waving full-body (`villager-woman.glb`, 256×320 "peek") for the level-up card corner.
6. **Marker atlas:** `icon_post.py` composites 64 px cells (cream disc, leaf-green ring, our outline) for each crop, fruit, egg, milk, bread and feed, plus `sickle` and `coin`, into one WebP. The look of `marks-view.mjs` belongs to the art lane.
7. **Harvest fly-out:** replace the literal `⭐` in `src/view/juice.mjs` line 190 (and the golden-carp floater) with `iconHtml('ui:xp', '', 'mini')`. The look of juice effects is ours.
8. **Chimney smoke:** 3–5 small cream-grey puffs that rise, grow, drift with the wind and fade, instead of the bright additive ball that reads as a lamp.
9. **Catalogue tab icons** from existing renders (bed, coop, bakery, cottage, fountain, fence, school), a gold selected-tab colour, and the tracker-card look reusing the ribbon colours.

### Logic lane (Codex: `src/ui/**`, `src/core/**`, `tests/**`; requested through `docs/ASSET-REQUESTS.md`)

1. **Small variants:** a one-line change in `iconHtml` (`src/ui/icon.mjs`) to use `icons/sm/<id>.webp` when `cls` is `mini`, `mark`, `seed` or a status row. Add a test that every `ICONS` id has an `sm` file, once the art PR has delivered them.
2. **Animals:** `levelup.mjs` `iconOf` tries the animal id before `ANIMALS[id].home`; the radial `buyAnimal` uses `iconHtml(a.id)` with the plus corner (`radial.mjs` line 144); the Animals tab shows the animal.
3. **HUD:** switch the right-column buttons to `ui:today`, `ui:projects`, `ui:mail` and the build row to `tool:demolish`. Add 11–12 px stroked labels under the right-column buttons on phone, and pill labels in the tool row.
4. **Build catalogue:**
   - a vertical grid (3 columns on phone, up to 6 on desktop)
   - a `2/2` chip with a check instead of the 5-line "built all you can" sentence
   - an input → output · time line on animal and production cards
   - a red `Lv N` badge on locked cards
   - collapse the sheet while a ghost is being placed
5. **Barn:** tap to select, then a sticky sell bar: − / qty / + / Max (`barn.free()`, so goods held for orders are never sold) and "Sell · total".
6. **Status stack:** merge the ribbon and the journey row into one tracker card at least 44 px tall; move the Orders and Goals counts onto their button badges; show running timers as chips on their buttons.
7. **Panels:**
   - ease the camera so the tapped building sits above `--sheet-h` (about 300 ms, instant with reduced motion)
   - from 1100 px wide, dock panels as a right-hand column about 460 px wide
   - recipe cards get an owned-count token, a visible Make or Bake pill, and the timer at the top right
8. **Orders:** missing needs shown greyscale with a red have/need count.
9. **Radial:** pills at least 8 px apart; always show the info pill (crop · Ripe); "All (N)" uses `ui:harvest_all`.
10. **Ready markers:** add an `aFrame` attribute to the single `THREE.Points` draw so each marker picks its atlas cell. Merge adjacent ripe beds of one crop into one marker ×N from span 40. The coin stays for cash only.
11. **Level-up card:** add a "Level N+1 in X XP" line; use the `.ribbon` class for the title.

---

## 6. Order of work and how to verify

| Step | Work | PR | Done when |
|---|---|---|---|
| 0 | **Baseline.** Copy `public/assets/icons` to `%TEMP%\fv-icons-before`. Run the stats for every goods, tool and UI icon and record them in the appendix of this doc. | — | Table recorded |
| 1 | **Rig only, no model changes.** R1 (Cycles, area lights, world, bounce floor, `rough`/`metal`), R5 presets in `icons.json`, R6 margins, R7 ring and `sm/` variants, 3.2 gates, `icons-meta.json`, new sheets. Re-render all 92 icons. Then A/B the outline: keep it unless the no-outline set passes every gate and reads in the 26 px row on cream and white. | `art/icon-rig` | Darkest 5 % at 0.33 or less on most icons from light alone; no fish touching the edge; `npm test` green |
| 2 | **Style helpers:** `corner=` in `to_vertex_colors()`/`vc_join()`, `ramp()`, `cavity()`, `blade()`, `spindle(smooth=False)`. Rebuild the farm kit **without using them** and `cmp` `farm-kit.glb` and `decor.glb` against main: they must be identical. | same PR | Byte-identical kits |
| 3 | **Crops and fruit:** wheat, carrot, corn, pumpkin, strawberry, apple, peach, cherry (and remove `cherries` from the farm kit). R8 hard check in `build_items.py`. | `art/items-2` | All 8 pass the gates; 1,200 triangles or fewer each |
| 4 | **Pale goods and products:** egg, milk, both feeds, bread, corn bread, carrot cake, apple pie; value cues. | same PR | 12 % or less of inner pixels above 0.9 on every good |
| 5 | **Tools and symbols:** shovel, sickle, glove, `tool_crate`, `tool_hammer`, coin, xp, heart; fish `icons.json` fixes; ui:barn and ui:orders re-rendered. | same PR | The tool row reads as one set at 46 px; coin and xp differ by hue at 26 px |
| 6 | **New ids and menu art:** 3.5 icons with `icons.mjs` registration, `base: tile/disc`, colour tokens, marker atlas, juice `⭐`. File the logic-lane requests in `docs/ASSET-REQUESTS.md`. | `art/menu-art` | `npm test` green: icon count equals `ICONS` |
| 7 | **World W1–W11**, crops first. | One PR per row group | Budgets at every zoom |

**Every step:**

1. `blender -b --factory-startup --python art/blender/build_items.py`
   - prints triangles per root and fails on any root over 1,200
   - Blender is `3D_claudeopus55\.tools\blender-4.5.9-windows-x64\blender.exe`
2. `blender -b --factory-startup --python art/blender/render_icons.py -- [ids] [--engine eevee for drafts]`
   - prints `STAT` per icon; `WARN` lines must be zero for goods, tools and UI, or each one justified in the PR
3. **Before and after sheets.** `icon_post.py` gets `--compare <before_dir> <after_dir> [ids]`. It writes:
   - `docs/reference-pass/items-before-after-160.png`: each id at 160 px, before and after, on cream `#FFF4DE`, white and dark `#3A4252`
   - `docs/reference-pass/items-before-after-48.png`: 48 px rows on the same three tiles, a 26 px row from the `sm/` variant, and a greyscale 48 px row

   The default `art-icons.png` review sheet also moves from 128 px cells to 160 px.
4. Run a visual review agent over both sheets ("does each read as what it is at 26 and 48 px; does anything read as treasure, jewels or a money bag").
5. `npm test`. `tests/assets.test.mjs` checks:
   - icon files exist and match `ICONS`
   - triangle budgets
   - meshopt packing (after `node art/blender/pack.mjs`)
   - first-wave bytes
6. Game check on art port 5242: `node art/shots.mjs <dir> <url>` before and after, for the barn panel, orders panel, build tool row, bakery radial and level-up card, on a 390 px phone and on desktop. Then `GAME_URL=… node scripts/run-browser-suites.mjs`.
7. **Icon bytes:** the total stays at or under about 1.2 MB. It is 818 KB now; the `sm/` files add about 190 KB and load only at chip sizes.