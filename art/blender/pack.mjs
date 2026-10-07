// Compress a GLB kit with gltfpack (meshopt geometry compression, 8-bit normals and colours, float positions) and keep
// every named node, so kit roots and anchor empties keep their names. The game sets the meshopt decoder in
// src/view/models.mjs. Packing a 2.5 MB kit gives about 0.6 MB, and gzip on top roughly halves it again.
//
//   node art/blender/pack.mjs <in.glb> <out.glb>
//
// gltfpack comes from the npm package `gltfpack` (MIT). It is not a dependency of the game: set GLTFPACK to its
// cli.js (or binary), or keep a copy in a sibling repository's node_modules (searched below), or have npx fetch it.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error('usage: node art/blender/pack.mjs <in.glb> <out.glb>'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url)), repos = resolve(here, '..', '..', '..');
const candidates = [process.env.GLTFPACK, join(here, '..', '..', 'node_modules', 'gltfpack', 'cli.js'),
  ...['Choice_of_life', 'Choice_of_life_3D', 'Farm_village'].map(r => join(repos, r, 'node_modules', 'gltfpack', 'cli.js'))].filter(Boolean);
const found = candidates.find(p => existsSync(p));
const args = ['-i', input, '-o', output, '-cc', '-kn', '-vpf'];
const r = found
  ? (found.endsWith('.js') ? spawnSync(process.execPath, [found, ...args], { stdio: 'inherit' }) : spawnSync(found, args, { stdio: 'inherit' }))
  : spawnSync('npx', ['--yes', 'gltfpack@1.3.0', ...args], { stdio: 'inherit', shell: true });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`packed ${input} (${statSync(input).size} bytes) -> ${output} (${statSync(output).size} bytes)`);
