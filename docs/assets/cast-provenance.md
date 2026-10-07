# Cast assets: where they come from

The living cast (animated animals, villagers, the family and critters) uses rigged, animated models from the user's own
Starline project (repository `3D_game_scene`, commit `42424c7`, folder `public/models/`). They were made there with the
Blender scripts `art/blender/farm_animal_kit.py`, `build_animals.py` and `build_characters.py`. All are original work:
vertex colours with baked ambient occlusion, no textures, one skin per model.

| File in `public/assets/models/rigged/` | Starline source | Source SHA-256 (first 12) | Clips kept | Used for |
|---|---|---|---|---|
| chicken.glb | chicken.glb | 75da80822182 | Flap, Idle (pecks), Walk | hens |
| cow.glb | cow.glb | 1d3948c0ff9d | Graze, Idle, Moo, Sleep, Walk | cows |
| pig.glb | pig.glb | 48c2c37337b6 | Idle, Oink, Sleep, Snuffle, Walk | (ready for pigs) |
| duck.glb | duck.glb | f493f381dd96 | Idle, Swim | ducks on the brook and pond |
| goat.glb | goat.glb | 85fdcf362fb1 | Bleat, Graze, Idle, Sleep, Walk | (ready for goats) |
| sheep.glb | sheep.glb | 16fe96b3f517 | Bleat, Idle, Run, Walk | (ready for sheep) |
| dog.glb | dog.glb | 6b558e1a4b54 | Bark, Idle, Run, Sit, Sleep, Wag, Walk | the farm dog, Biscuit |
| cat.glb | cat.glb | 86586462c40d | Idle, Sit, Sleep, Walk | the farmhouse cat |
| crow.glb | crow.glb | 87535f79488e | Fly, Hop, Idle | crows on open fields |
| rabbit.glb | rabbit.glb | 44ac02fd9105 | Hop, Idle | rabbits at the meadow edge |
| villager-man.glb | villager-man.glb | 9e06a4a16f1d | Carry, Cheer, Hammer, Idle, Jump, Sit, Sweep, Talk, Walk, Wave | men |
| villager-woman.glb | villager-woman.glb | ba18c83177d1 | the same ten | women, June |
| villager-kid.glb | villager-kid.glb | b9db608124b9 | the same ten | children, Pip |
| hana.glb | hana.glb | 7d324b72ff1b | Cheer, Idle, Knead, Talk, Walk, Wave | Ada (grey hair and headscarf, lavender dress) |

## Changes made for Farm Village

The files were slimmed for the web with a small Node script (it reads and rewrites the GLB JSON and binary chunk
directly; geometry, skins and materials are untouched):

- Clips the game never plays were dropped: Kick, Throw, Bow, Run and Interact from the three villagers, Bow from Hana.
- Animation tracks that only hold a bone's rest pose were dropped (three.js returns an unanimated bone to its rest
  pose), and tracks that hold any other constant pose keep a single key.
- The binary chunk was repacked with only what is still used: 5.8 MB in total became 4.9 MB.

At run time (`src/view/skinned.mjs`) each model's primitives are merged into one skinned geometry whose vertex colour is
the material colour times the baked occlusion, so an animated actor is one draw call with the shared toon material.
Clothes (hair, top, bottom) are baked white and recoloured per person by a tint. The same model posed on its first Idle
frame is baked into a static geometry for the instanced crowds, with two lighter copies made by vertex clustering for the
middle and far views. Heights on our map are 1.3–1.4 times life size next to the buildings, as in Hay Day.
