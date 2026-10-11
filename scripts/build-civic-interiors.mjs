// The imported plans are data, not gameplay. Bake measured footprints into lazy room JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { bake } from '../src/view/models.mjs';
import { CIVIC_PLANS } from '../src/content/civic-plans.mjs';
import { CIVIC_INTERIORS } from '../src/content/civic-interiors.mjs';
import { roomClear, roomRoute, xz } from '../src/core/explore-navigation.mjs';
const root = new URL('../public/assets/models/', import.meta.url), kits = {};
for (const file of ['cottage-furniture', 'facility-props']) {
  const b = readFileSync(new URL(`${file}.glb`, root));
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
  for (const n of gltf.scene.children) kits[n.name] = n;
}
for (const [id, p] of Object.entries(CIVIC_PLANS)) {
  const spec = CIVIC_INTERIORS[id], furniture = [], colliders = [], boxes = {};
  const walls = p.walls.flatMap((w, index) => {
    let at = w.from; const spans = [];
    for (const [a, b] of w.gaps) { if (a > at) spans.push([at, a]); at = b; }
    if (at < w.to) spans.push([at, w.to]);
    return spans.map(([from, to], i) => ({ ...w, id: `wall_${index}_${i}`, from, to, height: w.height === 'full' ? 3.1 : .66 }));
  });
  for (const [i, piece] of p.pieces.entries()) {
    const g = bake(kits[piece.kit], { center: false }), scale = 1.2 * piece.s;
    const y = piece.hang ? piece.y - (g.boundingBox.min.y + g.boundingBox.max.y) / 2 * scale : piece.y;
    g.scale(scale, scale, scale); g.rotateY(piece.rot); g.translate(piece.x, y, piece.z); g.computeBoundingBox();
    const b = g.boundingBox.clone(); g.dispose();
    const use = Object.entries(spec.objects).find(([, o]) => o.role === piece.role)?.[0] ?? null;
    furniture.push({ id: `furniture_${i}`, kit: piece.kit, x: piece.x, z: piece.z, y, rot: piece.rot, scale, use });
    if (piece.block !== false && !piece.hang && !piece.y && b.max.y > .2) colliders.push({ id: `furniture_${i}`, min: [b.min.x + .07, b.min.z + .07], max: [b.max.x - .07, b.max.z - .07] });
    if (use) { if (!boxes[use]) boxes[use] = b; else boxes[use].union(b); }
  }
  for (const w of walls) colliders.push(w.axis === 'x' ? { id: w.id, min: [w.from, w.at - .11], max: [w.to, w.at + .11] } : { id: w.id, min: [w.at - .11, w.from], max: [w.at + .11, w.to] });
  furniture.push({ id: 'door_frame', kit: 'door_frame', x: 0, z: 8.4, scale: 1.1, use: 'interior_exit' }, { id: 'door', kit: 'door', x: -.7, z: 8.4, scale: 1.1, rot: -.35, use: 'interior_exit' });
  const data = { schemaVersion: 2, roomId: `${id}_interior`, site: id, kit: 'facility-props', trim: p.palette.trim,
    bounds: { room: { min: [-9.8, -8.4], max: [9.8, 8.4] }, wallHeight: 3.1, wallThickness: .22,
      avatarCentre: { min: [-9.34, -7.94], max: [9.34, 7.94] }, avatar: { radius: .3, height: 1.8 } },
    rooms: p.rooms.map(r => ({ ...r, wall: p.palette.walls[r.id], floor: p.palette.floors[r.id] })), walls, furniture, colliders,
    entry: { position: [0, 0, 6.4] }, exit: { id: 'interior_exit', stand: [0, 0, 7.6] },
    camera: { position: [3, 20, 22], target: [0, 0, 0], projection: 'orthographic' }, seats: [], interactions: [],
  };
  for (const [key, o] of Object.entries(spec.objects)) {
    // Some reference stands sit behind large props. Choose the nearest connected free spot, once at build time.
    let stand = o.stand;
    if (!roomClear(data, stand) || !roomRoute(data, xz(data.entry.position), stand).length) {
      const candidates = [];
      for (let dx = -2; dx <= 2; dx += .2) for (let dz = -2; dz <= 2; dz += .2) candidates.push([o.stand[0] + dx, o.stand[1] + dz]);
      candidates.sort((a, b) => Math.hypot(a[0] - o.stand[0], a[1] - o.stand[1]) - Math.hypot(b[0] - o.stand[0], b[1] - o.stand[1]));
      stand = candidates.find(at => roomClear(data, at) && roomRoute(data, xz(data.entry.position), at).length);
      if (!stand) throw Error(`${id}: unreachable ${key}`);
    }
    const b = boxes[key]; if (!b) throw Error(`${id}: missing target ${key}`);
    data.interactions.push({ id: key, stand: [stand[0], 0, stand[1]], focus: [(b.min.x + b.max.x) / 2, Math.min(1.4, (b.min.y + b.max.y) / 2), (b.min.z + b.max.z) / 2] });
  }
  data.interactions.push({ id: 'interior_exit', stand: data.exit.stand, focus: [0, 1.1, 8.4] });
  writeFileSync(new URL(`interior-${id}.json`, root), JSON.stringify(data, null, 2) + '\n'); console.log(`${id}: ${furniture.length} pieces, ${data.interactions.length} reachable interactions`);
}
