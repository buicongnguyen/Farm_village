// The wardrobe's hats: head pieces from the owner's own Willowmere (3d_farmer_fish_sell: gear-wear.glb, made for Zoo
// Garden, and disguises.glb), re-cut for Hollowbrook's villagers. Those games dress a chibi explorer made of rigid parts;
// ours are skinned people, so only the pieces that follow the head come across (a hat is rigid on any head). Each piece
// is written in "head space": the origin on the top of the chibi head, one unit = that head's width, material colours
// baked into the vertices. src/view/skinned.mjs sets a piece on a villager's own head by the same two measures.
//
//   blender -b --factory-startup --python art/blender/build_star_sailor.py -- <path to cute_game> <extra dir>/star-sailor.glb
//   node art/tools/build-wear.mjs <path to 3d_farmer_fish_sell> <hats.glb> <costumes.glb> <extra dir>
//   node art/blender/pack.mjs <hats.glb> public/assets/models/rigged/wear.glb
//   node art/blender/pack.mjs <costumes.glb> public/assets/models/rigged/costumes.glb
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [src, out = 'wear-raw.glb', outCostumes = 'costumes-raw.glb', extra = ''] = process.argv.slice(2);
// extra: a folder of our own costume files (art/blender/build_star_sailor.py writes star-sailor.glb there)
const locate = file => extra && existsSync(join(extra, `${file}.glb`)) ? join(extra, `${file}.glb`) : join(src, 'public', 'assets', 'models', `${file}.glb`);
if (!src) { console.error('usage: node art/tools/build-wear.mjs <path to 3d_farmer_fish_sell> [out.glb]'); process.exit(2); }
// the chibi head (hero.glb, node "head" at y 1.12, box x ±0.58, y −0.12…1.06): its top and its width
const HEAD_TOP = [0, 2.18, 0], HEAD_WIDTH = 1.16;
/** our id: [file, the nodes that make it] */
export const PIECES = {
  hat_straw: ['gear-wear', ['hat_straw@head']], hat_cowboy: ['gear-wear', ['hat_cowboy@head']], hat_leather: ['gear-wear', ['hat_leather@head']],
  hat_chef: ['gear-wear', ['hat_chef@head']], hat_party: ['gear-wear', ['hat_party@head']], hat_bunny: ['gear-wear', ['hat_bunny@head']],
  hat_frog: ['gear-wear', ['hat_frog@head']], hat_cat: ['gear-wear', ['hat_cat@head']], hat_bear: ['gear-wear', ['hat_bear@head']],
  hat_santa: ['gear-wear', ['hat_santa@head']], hat_pirate: ['gear-wear', ['hat_pirate@head']], hat_wizard: ['gear-wear', ['hat_wizard@head']],
  hat_graduate: ['gear-wear', ['hat_graduate@head']], hat_viking: ['gear-wear', ['hat_viking@head']], hat_samurai: ['gear-wear', ['hat_samurai@head']],
  hat_space: ['gear-wear', ['hat_space@head']], hat_halo: ['gear-wear', ['hat_halo@head']], crown: ['gear-wear', ['crown@head']],
  hat_lantern: ['gear-wear', ['hat_lantern@head']],
  hat_conical: ['disguises', ['dz_aodai_hat@head']], hat_turban: ['disguises', ['dz_aodai_man_turban@head']], hat_navy: ['disguises', ['dz_navy_cap@head']],
  hat_army: ['disguises', ['dz_army_helmet@head']], hat_knight: ['disguises', ['dz_knight_helmet@head']], hat_fairy: ['disguises', ['dz_fairy_crown@head']],
  hat_stars: ['disguises', ['dz_usa_hat@head']], hat_band: ['disguises', ['dz_vietnam_band@head']],
};

function readGlb(file) {
  const b = readFileSync(file), jl = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
  return { json, bin: b.subarray(20 + jl + 8) };
}
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }, READ = { 5126: ['readFloatLE', 4], 5125: ['readUInt32LE', 4], 5123: ['readUInt16LE', 2], 5121: ['readUInt8', 1] };
function accessor({ json, bin }, i) {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = SIZE[a.type], [fn, bytes] = READ[a.componentType];
  const stride = v.byteStride ?? n * bytes, base = (v.byteOffset ?? 0) + (a.byteOffset ?? 0), o = new Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) o[k * n + c] = bin[fn](base + k * stride + c * bytes);
  return o;
}
// column-major 4x4, as glTF writes them
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function local(n) {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = n.scale ?? [1, 1, 1], [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
function world(json, index) {
  let m = local(json.nodes[index]);
  for (let p = json.nodes.findIndex(n => n.children?.includes(index)); p >= 0; p = json.nodes.findIndex(n => n.children?.includes(p))) m = mul(local(json.nodes[p]), m);
  return m;
}
const files = new Map();
/** The nodes' triangles as one piece, colours baked; `place` maps a point of the chibi (world space) to where it is stored. */
function collect(id, file, names, place) {
  if (!files.has(file)) files.set(file, readGlb(locate(file)));
  const glb = files.get(file), { json } = glb, pos = [], nor = [], col = [], idx = [];
  for (const name of names) {
    const ni = json.nodes.findIndex(n => n.name === name); if (ni < 0) throw Error(`${file}: no node ${name}`);
    const m = world(json, ni);
    for (const prim of json.meshes[json.nodes[ni].mesh].primitives) {
      const P = accessor(glb, prim.attributes.POSITION), N = accessor(glb, prim.attributes.NORMAL), base = pos.length / 3, count = P.length / 3;
      const mat = json.materials[prim.material] ?? {}, c = mat.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1], e = mat.emissiveFactor ?? [0, 0, 0];
      const glow = mat.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1, rgb = [0, 1, 2].map(k => Math.min(1, c[k] + e[k] * Math.min(glow, 1) * 0.6));
      for (let k = 0; k < count; k++) {
        const [x, y, z] = [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]], [a, b, d] = [N[k * 3], N[k * 3 + 1], N[k * 3 + 2]];
        const w = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
        const nv = [m[0] * a + m[4] * b + m[8] * d, m[1] * a + m[5] * b + m[9] * d, m[2] * a + m[6] * b + m[10] * d], l = Math.hypot(...nv) || 1;
        pos.push(...place(w)); nor.push(...nv.map(v => v / l)); col.push(...rgb);
      }
      const I = prim.indices === undefined ? Array.from({ length: count }, (_, k) => k) : accessor(glb, prim.indices);
      for (const k of I) idx.push(base + k);
    }
  }
  return { id, pos, nor, col, idx };
}
const headSpace = w => w.map((v, q) => (v - HEAD_TOP[q]) / HEAD_WIDTH);
const hats = Object.entries(PIECES).map(([id, [file, names]]) => collect(id, file, names, headSpace));
// Whole costumes (the second file, fetched only when one is worn): every part of a kit, kept in the chibi's own space and
// named <kit>__<part>__<n> (part: head, body, arm-left, arm-right, leg-left, leg-right). skinned.mjs re-fits each part
// onto a villager's bones: the body over hips, spine and chest, a sleeve over the upper arm and forearm so it bends.
export const KITS = { dz_aodai: 'disguises', dz_aodai_man: 'disguises', dz_army: 'disguises', dz_dino: 'disguises', dz_fairy: 'disguises', dz_knight: 'disguises', dz_mage: 'disguises', dz_mecha: 'disguises', dz_navy: 'disguises', dz_ninja: 'disguises', dz_pirate: 'disguises', dz_snowman: 'disguises', dz_superhero: 'disguises', dz_usa: 'disguises', dz_vampire: 'disguises', dz_vietnam: 'disguises',
  armor_angel: 'gear-wear', armor_bone: 'gear-wear', armor_chef: 'gear-wear', armor_cloud: 'gear-wear', armor_hawaii: 'gear-wear', armor_hoodie: 'gear-wear', armor_kimono: 'gear-wear', armor_leaf: 'gear-wear', armor_leather: 'gear-wear', armor_santa: 'gear-wear', armor_space: 'gear-wear', armor_tux: 'gear-wear', armor_wings: 'gear-wear', armor_wolf: 'gear-wear' ,
  dz_star: 'star-sailor' };
const costumes = [];
for (const [kit, file] of Object.entries(KITS)) {
  if (!files.has(file)) files.set(file, readGlb(locate(file)));
  const { json } = files.get(file), root = json.nodes.find(n => n.name === kit); if (!root) throw Error(`${file}: no kit ${kit}`);
  const count = {};
  for (const ci of root.children ?? []) { const name = json.nodes[ci].name, part = name.split('@')[1]; if (!part) continue; count[part] = (count[part] ?? 0) + 1; 
    // buns and tails are hair: they take the wearer's own hair colour (skinned.mjs reads the "+hair" on the part)
    costumes.push(collect(`${kit}__${part}${/_(buns|tails)@/.test(name) ? '+hair' : ''}__${count[part]}`, file, [name], w => w)); }
}
// one mesh node for each piece: POSITION, NORMAL, COLOR_0 (floats; pack.mjs quantizes), 32-bit indices
function write(pieces, out) {
const chunks = [], views = [], accessors = [], meshes = [], nodes = []; let at = 0;
const put = (typed, target) => { const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); views.push({ buffer: 0, byteOffset: at, byteLength: b.length, target }); chunks.push(b); at += b.length; const pad = (4 - at % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); at += pad; } return views.length - 1; };
for (const p of pieces) {
  const P = new Float32Array(p.pos), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < P.length; k++) { min[k % 3] = Math.min(min[k % 3], P[k]); max[k % 3] = Math.max(max[k % 3], P[k]); }
  const n = P.length / 3, a = accessors.length;
  accessors.push({ bufferView: put(P, 34962), componentType: 5126, count: n, type: 'VEC3', min, max },
    { bufferView: put(new Float32Array(p.nor), 34962), componentType: 5126, count: n, type: 'VEC3' },
    { bufferView: put(new Float32Array(p.col), 34962), componentType: 5126, count: n, type: 'VEC3' },
    { bufferView: put(new Uint32Array(p.idx), 34963), componentType: 5125, count: p.idx.length, type: 'SCALAR' });
  meshes.push({ name: p.id, primitives: [{ attributes: { POSITION: a, NORMAL: a + 1, COLOR_0: a + 2 }, indices: a + 3, material: 0 }] });
  nodes.push({ name: p.id, mesh: meshes.length - 1 });
}
const bin = Buffer.concat(chunks), gltf = { asset: { version: '2.0', generator: 'Hollowbrook build-wear' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes,
  materials: [{ name: 'Wear', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }], accessors, bufferViews: views, buffers: [{ byteLength: bin.length }] };
let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(out, Buffer.concat([head, jh, json, bh, bin]));
console.log(`${pieces.length} pieces, ${pieces.reduce((n, p) => n + p.idx.length / 3, 0)} triangles -> ${out}`);
}
write(hats, out); write(costumes, outCostumes);
