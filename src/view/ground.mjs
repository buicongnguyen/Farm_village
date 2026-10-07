// The ground: one mesh per 32 × 32 cell chunk, two triangles per cell (TECH-PLAN 6, rule 5), no extra draws.
// cellLook(x, z) → { color, y, soft } is asked per cell; markDirty(x, z) rebuilds only that chunk on the next flush().
// Colour is per vertex, not per cell, so the lawn never shows a checkerboard:
//   soft ground (grass, meadow) blends three grass tones with two octaves of value noise taken at the vertex position,
//   so neighbouring cells share the colour at every shared corner; warm dirt patches show through in the wilds;
//   hard ground (paths, roads, soil) keeps its own colour with a faint grain, and darkens where it meets another surface;
//   grass darkens a little where it meets a path or soil, and under trees (shade stamps).
import * as THREE from 'three';
import { toon } from '../kit/toon.mjs';
import { N, CELL } from '../content/world.mjs';

export const GROUND_CHUNK = 32;
const V = N + 1;   // vertices per side

// Value noise (seeded hash, no textures); the backdrop uses the same function, so the lawn runs on into the hills.
const hash = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Two octaves, 0..1, in cell units. */
export const noise2 = (x, z) => noise(x * 0.11, z * 0.11) * 0.65 + noise(x * 0.37 + 17.3, z * 0.37 - 4.1) * 0.35;

// The three grass tones (light, mid, dark) and the warm dirt that shows through in patches.
const TONES = ['#a6d45a', '#6fbf4a', '#4f9e3c'].map(c => new THREE.Color(c));
const DIRT = new THREE.Color('#a8904e');
const tone = new THREE.Color();
/** The grass tone at a point (cells): a mix of the three tones; written into out. */
export function grassTone(x, z, out = tone) {
  const t = noise2(x, z);
  // a slow yellow-green drift on top, so big fields are not one green
  const warm = noise(x * 0.045 + 31.7, z * 0.045 + 8.2);
  if (t < 0.5) out.copy(TONES[2]).lerp(TONES[1], Math.min(1, t * 2.1)); else out.copy(TONES[1]).lerp(TONES[0], Math.min(1, (t - 0.5) * 1.9));
  out.r += (warm - 0.5) * 0.09; out.b -= (warm - 0.5) * 0.03;
  // a soft mottle at the scale of a cell or two, so close-up grass is not one flat sheet
  const m = (noise(x * 0.63 + 5.5, z * 0.63 - 3.1) - 0.5) * 0.1; out.r *= 1 + m * 0.8; out.g *= 1 + m; out.b *= 1 + m * 0.6;
  return out;
}
export const MID_TONE = TONES[1];

export class Ground {
  constructor(scene, cellLook) {
    Object.assign(this, { scene, cellLook, meshes: new Map(), dirty: new Set() });
    this.shade = new Float32Array(V * V);      // 0..1 darkening per vertex (tree shade, AO under things)
    this.wild = null;                          // (x, z) → true where dirt patches may show (set by the world view)
    this.material = toon();
    this.markAll();
  }
  markDirty(x, z) {
    // a cell on a chunk border also changes the edge shading of the chunk next to it
    for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
      this.dirty.add(`${Math.floor(nx / GROUND_CHUNK) * GROUND_CHUNK},${Math.floor(nz / GROUND_CHUNK) * GROUND_CHUNK}`);
    }
  }
  markAll() { for (let cz = 0; cz < N; cz += GROUND_CHUNK) for (let cx = 0; cx < N; cx += GROUND_CHUNK) this.dirty.add(`${cx},${cz}`); }
  flush() { for (const k of this.dirty) this.build(k); const n = this.dirty.size; this.dirty.clear(); return n; }
  /** Darken the ground in a soft disc (metres): shade under trees and props. Call markAll() (or markDirty) after. */
  stampShade(xm, zm, radius, strength) {
    const r = radius / CELL, cx = xm / CELL, cz = zm / CELL;
    for (let z = Math.max(0, Math.floor(cz - r)); z <= Math.min(N, Math.ceil(cz + r)); z++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(N, Math.ceil(cx + r)); x++) {
      const d = Math.hypot(x - cx, z - cz) / r; if (d >= 1) continue;
      const i = z * V + x; this.shade[i] = Math.min(0.4, this.shade[i] + strength * (1 - d * d));
    }
  }
  clearShade() { this.shade.fill(0); }
  build(key) {
    const [cx, cz] = key.split(',').map(Number), S = GROUND_CHUNK, W = S + 2;
    // the looks of this chunk's cells and a one-cell ring around them
    const looks = new Array(W * W);
    for (let z = -1; z <= S; z++) for (let x = -1; x <= S; x++) {
      const gx = Math.min(N - 1, Math.max(0, cx + x)), gz = Math.min(N - 1, Math.max(0, cz + z));
      looks[(z + 1) * W + x + 1] = this.cellLook(gx, gz);
    }
    const pos = new Float32Array(S * S * 18), col = new Float32Array(pos.length), nor = new Float32Array(pos.length);
    const corner = new THREE.Color(), base = new THREE.Color();
    // colour at corner (vx, vz) (chunk-local vertex) of a cell with this look
    const cornerColor = (look, vx, vz) => {
      const gx = cx + vx, gz = cz + vz;
      base.set(look.color);
      // the four cells that share this corner: is any of them a different surface?
      let edge = false;
      for (let dz = -1; dz <= 0 && !edge; dz++) for (let dx = -1; dx <= 0; dx++) if (looks[(vz + dz + 1) * W + vx + dx + 1].color !== look.color) { edge = true; break; }
      if (look.soft !== false) {
        grassTone(gx, gz, corner); corner.sub(MID_TONE); base.add(corner);           // the look sets the mean, the noise the variation
        if (look.wild) { const d = noise(gx * 0.21 + 91.1, gz * 0.21 - 7.7); if (d > 0.8) base.lerp(DIRT, Math.min(0.5, (d - 0.8) * 4)); }
        if (edge) base.multiplyScalar(look.edge ?? 0.88);
      } else {
        base.offsetHSL(0, 0, (noise(gx * 0.9, gz * 0.9) - 0.5) * (look.grain ?? 0.07));
        if (edge) base.multiplyScalar(look.edge ?? 0.82);
      }
      const sh = this.shade[gz * V + gx]; if (sh) base.multiplyScalar(1 - sh);
      return base;
    };
    let i = 0;
    for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) {
      const look = looks[(z + 1) * W + x + 1], y = look.y ?? 0;
      const x0 = (cx + x) * CELL, z0 = (cz + z) * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
      pos.set([x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0], i);
      const vs = [x, z, x, z + 1, x + 1, z + 1, x, z, x + 1, z + 1, x + 1, z];
      for (let k = 0; k < 6; k++) { const c = cornerColor(look, vs[k * 2], vs[k * 2 + 1]); col[i + k * 3] = c.r; col[i + k * 3 + 1] = c.g; col[i + k * 3 + 2] = c.b; nor[i + k * 3 + 1] = 1; }
      i += 18;
    }
    let mesh = this.meshes.get(key);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = g; }
    else { mesh = new THREE.Mesh(g, this.material); mesh.userData.ground = key; this.scene.add(mesh); this.meshes.set(key, mesh); }
  }
  /** The cell under a ray from the camera, or null. */
  pick(raycaster) {
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    const x = Math.floor(hit.x / CELL), z = Math.floor(hit.z / CELL);
    return x >= 0 && z >= 0 && x < N && z < N ? { x, z, point: hit } : null;
  }
}
