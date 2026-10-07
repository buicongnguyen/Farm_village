# Juice package: where the sounds and effects come from

Every sound and effect added by the juice package was made for Farm Village from scratch. Nothing was recorded,
downloaded or copied from another game or sound library, so all of it is free to use under CC0 1.0 (public domain
dedication).

## Sound clips (`public/assets/sfx/`)

All 16 clips are synthesised by `public/assets/sfx/src/make_sfx.py`, using numpy, scipy filters and a fixed seed, and
encoded to mono AAC (`.m4a`) with ffmpeg. To make them again:

```
python public/assets/sfx/src/make_sfx.py path/to/ffmpeg
```

| Clip | Length | Size | How it is made | Played for |
|---|---|---|---|---|
| harvest.m4a | 0.42 s | 3.5 KB | crackles of band-passed noise (leaves), a swish and a low pluck | every harvest (juice) |
| pop.m4a | 0.16 s | 2.0 KB | a sine whose pitch rises quickly, plus a noise click | harvests, collections, products (main.mjs `pop`) |
| cluck.m4a | 0.52 s | 5.1 KB | three voiced pulses ("bok bok BAWK") through hen-like formants | hens collected, fed or bought |
| moo.m4a | 1.25 s | 9.9 KB | a gliding glottal buzz that opens from "mmm" to "ooo" formants | cows collected, fed or bought |
| oink.m4a | 0.50 s | 4.8 KB | two nasal, noisy grunts | pigs (ready for the cast package) |
| coin.m4a | 0.50 s | 4.2 KB | two bell tones (inharmonic partials), G6 then C7 | single coins (UI) |
| coins.m4a | 1.00 s | 7.1 KB | a cascade of eight bell tones and a shimmer | orders, rent, gifts, the stall (`coin`) |
| tick.m4a | 0.12 s | 1.8 KB | one short high bell | each coin landing in the counter |
| place.m4a | 0.40 s | 3.5 KB | a falling low sine, a wood knock and a tock | placing things (`place`) |
| level.m4a | 1.60 s | 10.0 KB | a brass arpeggio (filtered saw) into a held C chord, with bells | level up (`level`) |
| cheer.m4a | 1.90 s | 11.7 KB | a longer brass run, a chord and a sparkle of bells | projects done, families arriving (`cheer`) |
| page.m4a | 0.38 s | 3.4 KB | a noise swish with a rising band and paper crackles | letters and panels (for the ui package) |
| click.m4a | 0.05 s | 1.3 KB | a tiny sine and noise tick | buttons (`click`) |
| error.m4a | 0.32 s | 2.9 KB | two soft, filtered falling tones | refused actions (`error`) |
| ambience-day.m4a | 9.0 s | 46.7 KB | a brook (filtered, slowly modulated noise and bubbles) with three bird phrases and a far trill | the daytime bed |
| ambience-night.m4a | 8.0 s | 33.6 KB | a quieter brook with two crickets | the night bed |

Total: about 151 KB of clips, plus the 12 KB generator, under the 200 KB budget. `src/kit/sound.mjs` fetches the clips only
after the first tap, plays each one at a random pitch within ±6%, crossfades two copies of the ambience bed so the loop
never clicks, and falls back to the old synthesised tones while the clips load or if they cannot be decoded.

## Visual effects

These are all made in code, with no textures or models:

- **Wind sway** (`src/kit/toon.mjs`): a vertex shader patch on the toon material, after the wind-sway template in the
  shared lightweight-game-objects skill.
- **Contact shadows** (`src/view/batches.mjs`): a round or rounded-box falloff computed in a fragment shader.
- **Particles** (`src/view/particles.mjs`): a soft dot, a leaf, a ring, a star and a coin, drawn as signed distances
  in a fragment shader. The pool follows the ParticlePool pattern from the same skill.
- **Coin flights** (`src/ui/fx.mjs`): CSS radial gradients.
