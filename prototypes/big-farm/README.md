# Big farm prototype

**Question:** can a large map with thousands of crops run well on phones, with one 3D renderer shown like a 2.5D game?
**Answer:** yes, with three levels of detail and chunk sizes that match each level. With crops in fields, every zoom
level stays inside the phone budgets.

## What it shows

- **The map:** 128 × 128 cells (256 m × 256 m), with a brook, roads, woods (about 3,000 trees, bushes, flowers and
  rocks), an orchard and two pens (48 hens, 16 cows, which move every frame).
- **The village:** 16 cottages, plus the school, clinic, police post and company office.
- **The farm:** 64 × 64 cells, fenced. Planting comes in two layouts:
  - **fields** (the default): 4 × 4 fields with a path between them, 2,704 crops, one crop and growth stage per field,
    as the game will plant them;
  - **dense** (`?dense`): every cell planted with a random crop and stage, 4,096 crops. This is the worst case.
- **The look:** Willowmere's real models (`crops.glb`, `scenery.glb`, `farm.glb`, `town.glb`, copied from
  `3d_farmer_fish_sell` at 6390128) and the toon style.
- **The camera:** fixed, tilted and orthographic. Drag to pan, pinch or wheel to zoom, ⟳ to turn.

## How it is drawn

1. **Baked models:** each model is baked to one geometry with vertex colours. There are no textures; one draw call
   covers a whole batch.
2. **Instancing:** one `InstancedMesh` per model per chunk.
3. **Three levels of detail, each with its own chunk size:**

| Zoom (view span) | Models | Chunk |
|---|---|---|
| Close (up to 55 m) | Full models | 8 × 8 cells: tight culling where triangles matter most |
| Middle (55–110 m) | Simplified, about 40 % of the triangles | 16 × 16 cells |
| Far (over 110 m) | Tiny stand-ins (5–20 triangles) coloured per instance | 32 × 32 cells: few draws when everything is on screen |

4. **What never changes:** buildings and fences keep their full models at every zoom (16 × 16 chunks).
5. **Ground:** one mesh per 32 × 32 cell chunk, with one flat-coloured quad per cell.
6. **Animals:** they have their own batches, updated every frame.

## Results (2026-10-07)

Measured with `measure.mjs` in headless Chrome on this PC's GPU, 3 seconds per row.
- **Phone:** a 390 × 844 screen at 3× pixel density (drawn at 2×), with the CPU slowed 4×.
- **PC:** 1280 × 800.

The frame rate is capped at 60, so the useful numbers are CPU time, draw calls and triangles, compared with the phone
budgets: **≤ 120 draws** and **≤ 300k triangles**.

| Device | Layout | Zoom | CPU per frame | Draws | Triangles |
|---|---|---|---|---|---|
| Phone | Fields | Close (40 m) | 2.1 ms | 42 | 199k |
| Phone | Fields | Middle (90 m) | 2.2 ms | 78 | 151k |
| Phone | Fields | Far (200 m) | 2.2 ms | 87 | 175k |
| Phone | Dense | Close | 2.3 ms | 94 | 312k |
| Phone | Dense | Middle | 2.6 ms | 114 | 259k |
| Phone | Dense | Far | 2.4 ms | 86 | 189k |
| PC | Fields | Close / middle / far | 0.4–0.5 ms | 45 / 96 / 104 | 210k / 183k / 247k |

**What each optimisation saved** (dense layout on the phone):

| Set-up | Close | Middle | Far |
|---|---|---|---|
| One batch for the whole map (no chunks), with levels of detail | 2,177k tris | 736k | 287k |
| Full models only, 16-cell chunks | 646k | 969k | 1,540k, 261 draws |
| 32-cell chunks with levels of detail | 1,180k | 398k | 206k |
| 16-cell chunks with levels of detail | 646k | 259k | 181k |
| 8-cell chunks everywhere | 310k | 181k, 273 draws | 159k, 305 draws |
| **Per-level chunks (8 / 16 / 32), the final set-up** | **312k** | **259k** | **189k** |

**What we learned:**
- **Triangles are the limit, not the CPU.** Even slowed 4×, the CPU needs under 3 ms a frame.
- **Close zoom needs small chunks; far zoom needs big ones.** One size cannot do both, so each level of detail gets its
  own.
- **Middle zoom looks the same with simplified models** (compare `shots/phone-fields-mid.png` with the full models).
  In the game, Blender's Decimate modifier makes them at build time instead of SimplifyModifier at load time.
- **Fields beat random planting:** one crop per field means fewer models per chunk, so fewer draws. The worst case
  (4,096 random crops) is only just over budget at close zoom.
- **Limits of this test:** it does not measure a real phone's GPU. Before M2 is done, open the prototype on a real
  mid-range phone (see below) and check that it holds 30+ fps.

## Run it

```
npm run proto                          # http://127.0.0.1:5240/prototypes/big-farm/
HOST=0.0.0.0 node prototypes/serve.mjs # then on a phone on the same Wi-Fi: http://<PC IP>:5240/prototypes/big-farm/
npm run proto:measure                  # the table above; results.json and shots/ are written next to this file
```

**URL options:**
- `?dense`: the worst-case planting.
- `?nolod`: full models at every zoom.
- `?nochunk`: one batch for the whole map.
- `?chunk=16`: one chunk size for every level.

**measure.mjs options:**
- `SETUPS='{"name":"?query"}'`: measure other set-ups.
- `DEVICES=phone`: measure one device only.
- `GPU=0`: use the software renderer.
