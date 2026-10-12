// Room shell and furniture adapted from the user's Zoo Garden house-view.ts (483913d).
// Keep the solid scenery batched and the seven activity targets separately pickable.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bake } from './models.mjs';

function slab(w, h, d, x, y, z, hex) {
  const box = new THREE.BoxGeometry(w, h, d), g = box.toNonIndexed(); box.dispose(); g.translate(x, y, z);
  const color = new THREE.Color(hex), colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set([color.r, color.g, color.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); g.deleteAttribute('uv'); return g;
}
export function buildCottage(kit, data, material) {
  const groups = new Map([['', []]]), plain = groups.get(''), meshes = [], b = data.bounds.room;
  plain.push(slab(b.max[0] - b.min[0] + .6, .5, b.max[1] - b.min[1] + .6, 0, -.33, (b.min[1] + b.max[1]) / 2, '#6e4330'));
  const roomAt = (x, z) => data.rooms.find(r => x >= r.rect.x0 && x <= r.rect.x1 && z >= r.rect.z0 && z <= r.rect.z1);
  for (const r of data.rooms) {
    const { x0, x1, z0, z1 } = r.rect, nx = r.pattern === 'tiles' ? Math.round((x1 - x0) / .7) : 1, nz = Math.round((z1 - z0) / (r.pattern === 'tiles' ? .7 : .5));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) plain.push(slab((x1 - x0) / nx, .08, (z1 - z0) / nz, x0 + (i + .5) * (x1 - x0) / nx, -.04, z0 + (j + .5) * (z1 - z0) / nz, r.floor[(i + j) % 2]));
  }
  const walls = data.walls.flatMap(w => {
    const cuts = [...new Set([w.from, w.to, ...data.rooms.flatMap(r => w.axis === 'x' ? [r.rect.x0, r.rect.x1] : [r.rect.z0, r.rect.z1])])].filter(v => v >= w.from && v <= w.to).sort((a, b) => a - b);
    return cuts.slice(1).map((to, i) => ({ ...w, from: cuts[i], to }));
  });
  for (const w of walls) {
    const mid = (w.from + w.to) / 2, length = w.to - w.from, half = data.bounds.wallThickness / 2;
    // Low inside dividers show the furniture and character, while their full footprints still block walking.
    const outer = w.axis === 'x' ? Math.abs(w.at - b.min[1]) < .01 || Math.abs(w.at - b.max[1]) < .01 : Math.abs(w.at - b.min[0]) < .01 || Math.abs(w.at - b.max[0]) < .01;
    const h = outer ? w.height : Math.min(w.height, .7);
    for (const side of [-1, 1]) {
      const hex = (w.axis === 'x' ? roomAt(mid, w.at + side * .4) : roomAt(w.at + side * .4, mid))?.wall ?? '#e9c39a';
      const skirt = new THREE.Color(hex).multiplyScalar(.78);
      plain.push(w.axis === 'x' ? slab(length, h, half, mid, h / 2, w.at + side * half / 2, hex) : slab(half, h, length, w.at + side * half / 2, h / 2, mid, hex));
      plain.push(w.axis === 'x' ? slab(length, .14, .03, mid, .07, w.at + side * (half + .015), skirt) : slab(.03, .14, length, w.at + side * (half + .015), .07, mid, skirt));
    }
    plain.push(w.axis === 'x' ? slab(length + .04, .08, data.bounds.wallThickness + .08, mid, h + .04, w.at, data.trim ?? '#a8683f') : slab(data.bounds.wallThickness + .08, .08, length + .04, w.at, h + .04, mid, data.trim ?? '#a8683f'));
  }
  for (const p of data.furniture) {
    if (!kit[p.kit]) throw Error(`Cottage furniture missing: ${p.kit}`);
    const g = bake(kit[p.kit], { center: false, ao: .45 });
    g.scale(p.scale ?? 1, p.scale ?? 1, p.scale ?? 1); g.rotateY(p.rot ?? 0); g.translate(p.x, p.y ?? 0, p.z);
    const id = p.memory ? `memory:${p.memory}` : p.use ?? ''; if (!groups.has(id)) groups.set(id, []); groups.get(id).push(g);
  }
  for (const [id, parts] of groups) {
    if (!parts.length) continue;
    const geometry = mergeGeometries(parts, false); parts.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(geometry, material); mesh.name = id || 'cottage-shell'; mesh.userData.interaction = id.startsWith('memory:') ? null : id || null; mesh.userData.memory = id.startsWith('memory:') ? id.slice(7) : null; if (mesh.userData.memory) mesh.visible = false; meshes.push(mesh);
  }
  return meshes;
}
