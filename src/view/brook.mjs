// The brook and the pond (world package). One smooth ribbon of water follows the brook's curve right through the map and
// out across the hills; the pond in the woods is the same water. A cheap shader paints deep to shallow across the
// channel, sine highlights drifting downstream and foam at the banks, and at night turns black-blue. Everything else is
// one merged, vertex-coloured mesh: the wet sandy bank, bank stones, swaying reeds, lily pads, the plank bridge where
// the road crosses, stepping stones north of the farm and the pond's dock. Ducks paddle on the pond (one instanced draw).
// Draws: water 1, props 1, ducks 1. Triangles: about 6k in all.
import * as THREE from 'three';
import { CELL, SKIRT, brookCurve, BRIDGE, STEPPING_STONES, POND, POND_DOCK, ROADS, inVillage, nearHome } from '../content/world.mjs';
import { HAZE, MAP, merge, part, swayByHeight, decorMaterial } from './backdrop.mjs';
import { grassTone, MID_TONE, noise, wildTint } from './ground.mjs';
import { GROUND_COLORS } from './world-view.mjs';
import { loadKit, bake, fit } from './models.mjs';

export const WATER_HALF = 3.6;   // metres from the brook's centre line to its banks
export const BANK_HALF = 5.6;    // ... to the outer edge of the sandy bank
/** The brook's centre line in metres. */
export const brookCentre = xm => (brookCurve(xm / CELL) + 0.5) * CELL;
const slope = xm => (brookCentre(xm + 0.05) - brookCentre(xm - 0.05)) / 0.1;
/** Pond ellipse in metres. */
export const POND_SHAPE = { x: (POND.x0 + POND.x1 + 1) / 2 * CELL, z: (POND.z0 + POND.z1 + 1) / 2 * CELL, rx: (POND.x1 - POND.x0 + 1) * CELL / 2 + 0.3, rz: (POND.z1 - POND.z0 + 1) * CELL / 2 + 0.3 };

const WATER = {
  day: { deep: '#216778', shallow: '#3fb8c0', foam: '#f4fbff', glint: '#d9fbff' },
  night: { deep: '#0a1424', shallow: '#13294a', foam: '#3a5a86', glint: '#6f8fc4' },
};
const lin = c => new THREE.Color(c);
const UP = new THREE.Vector3(0, 1, 0);

/** The water material: shared by the brook and the pond. uNight 0..1 comes from daylight. */
function waterMaterial() {
  const uniforms = {
    uTime: { value: 0 }, uNight: { value: 0 }, uHaze: HAZE,
    uDeep: { value: lin(WATER.day.deep) }, uShallow: { value: lin(WATER.day.shallow) }, uFoam: { value: lin(WATER.day.foam) }, uGlint: { value: lin(WATER.day.glint) },
    uDeepN: { value: lin(WATER.night.deep) }, uShallowN: { value: lin(WATER.night.shallow) }, uFoamN: { value: lin(WATER.night.foam) }, uGlintN: { value: lin(WATER.night.glint) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
attribute vec2 aFlow;      // x: metres along the flow (pond: a ripple coordinate), y: -1..1 across (pond: 0 centre .. 1 shore)
varying vec2 vFlow; varying vec3 vWorld;
void main(){
  vFlow = aFlow;
  vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fragmentShader: /* glsl */`
uniform float uTime, uNight;
uniform vec3 uDeep, uShallow, uFoam, uGlint, uDeepN, uShallowN, uFoamN, uGlintN, uHaze;
varying vec2 vFlow; varying vec3 vWorld;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main(){
  float across = abs(vFlow.y);
  vec3 deep = mix(uDeep, uDeepN, uNight), shallow = mix(uShallow, uShallowN, uNight);
  vec3 foamC = mix(uFoam, uFoamN, uNight), glintC = mix(uGlint, uGlintN, uNight);
  float depth = 1.0 - across * across;
  vec3 col = mix(shallow, deep, smoothstep(0.05, 0.85, depth) * 0.85);
  // gentle colour drift so the channel is not one flat band
  col *= 0.94 + 0.12 * vn(vWorld.xz * 0.12 + vec2(uTime * 0.05, 0.0));
  // highlights: broken sine streaks drifting downstream
  float n = vn(vec2(vFlow.x * 0.25, vFlow.y * 2.5) + vec2(-uTime * 0.35, 0.0));
  float s = sin(vFlow.x * 1.1 - uTime * 2.4 + n * 5.0 + vFlow.y * 2.0);
  float streak = smoothstep(0.9, 0.985, s) * smoothstep(0.95, 0.3, across) * (0.55 + 0.45 * n);
  col = mix(col, glintC, streak * 0.55);
  // foam: a lacy band at the banks
  float edge = 0.86 + (vn(vec2(vFlow.x * 0.9 - uTime * 0.6, vFlow.y * 3.0)) - 0.5) * 0.16;
  float foam = smoothstep(edge, edge + 0.07, across);
  foam = max(foam, smoothstep(edge - 0.12, edge - 0.04, across) * step(0.62, vn(vec2(vFlow.x * 1.7 - uTime * 0.9, vFlow.y * 6.0))) * 0.6);
  col = mix(col, foamC, foam * (1.0 - uNight * 0.45));
  // haze outside the map (the same formula as the hills)
  vec2 o = max(vec2(0.0), max(-vWorld.xz, vWorld.xz - ${MAP.toFixed(1)}));
  float hz = min(1.0, smoothstep(22.0, 175.0, length(o)) * 0.94 + smoothstep(150.0, 230.0, length(o)) * 0.06);
  gl_FragColor = vec4(mix(col, uHaze, hz), 1.0);
  #include <colorspace_fragment>
}`,
  });
  return { material, uniforms };
}

/** The brook ribbon and the pond disc in one geometry. */
function waterGeometry() {
  const pos = [], flow = [], idx = [];
  // brook: from far west to far east, a vertex row every 1.5 m with three across (centre line, both banks)
  const x0 = -SKIRT - 130, x1 = MAP + SKIRT + 130, ACROSS = [-1, -0.5, 0, 0.5, 1];
  let u = 0, prev = null;
  for (let x = x0; x <= x1 + 1e-6; x += x < -8 || x > MAP + 8 ? 3 : 1.5) {
    const zc = brookCentre(x), k = slope(x), len = Math.hypot(1, k), nx = -k / len, nz = 1 / len;
    if (prev) u += Math.hypot(x - prev.x, zc - prev.z); prev = { x, z: zc };
    for (const v of ACROSS) { pos.push(x + nx * v * WATER_HALF, 0.05, zc + nz * v * WATER_HALF); flow.push(u, v); }
  }
  const rows = pos.length / 3 / ACROSS.length, A = ACROSS.length;
  for (let r = 0; r < rows - 1; r++) for (let a = 0; a < A - 1; a++) { const i = r * A + a; idx.push(i, i + 1, i + A, i + 1, i + A + 1, i + A); }
  // pond: rings round its centre
  const base = pos.length / 3, P = POND_SHAPE, SEG = 28, RINGS = [0, 0.45, 0.8, 1];
  for (const r of RINGS) for (let s = 0; s < (r ? SEG : 1); s++) {
    const a = s / SEG * Math.PI * 2, wob = r ? 1 + 0.06 * Math.sin(a * 3 + 1) : 1;
    pos.push(P.x + Math.cos(a) * P.rx * r * wob, 0.06, P.z + Math.sin(a) * P.rz * r * wob); flow.push(Math.cos(a) * r * 9 + P.x * 0.3, r * 0.97);
  }
  for (let s = 0; s < SEG; s++) idx.push(base, base + 1 + (s + 1) % SEG, base + 1 + s);
  for (let ri = 1; ri < RINGS.length - 1; ri++) {
    const a0 = base + 1 + (ri - 1) * SEG, a1 = a0 + SEG;
    for (let s = 0; s < SEG; s++) { const s1 = (s + 1) % SEG; idx.push(a0 + s, a0 + s1, a1 + s, a0 + s1, a1 + s1, a1 + s); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2)); g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

let seed = 4242; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const onRoad = xm => ROADS.some(r => r.x1 - r.x0 < 4 && xm > r.x0 * CELL - 2.5 && xm < (r.x1 + 1) * CELL + 2.5);

/** The bank: a strip from under the water's edge out to where the grass takes over, coloured to meet the lawn. */
// the lawn a bank's edge meets is wild outside the village and the homestead (world-view.mjs fixedLook)
const wildAt = (px, pz) => { const x = Math.floor(px / CELL), z = Math.floor(pz / CELL); return inVillage(x, z) || nearHome(x, z) ? 0 : 1; };
function bankGeometry() {
  const pos = [], col = [], idx = [], c = new THREE.Color(), t = new THREE.Color(), wet = lin('#a88d5a'), dry = lin(GROUND_COLORS.bank), grass = lin(GROUND_COLORS.grass);
  const x0 = -SKIRT - 60, x1 = MAP + SKIRT + 60, ACROSS = [0, 0.3, 0.65, 1], A = ACROSS.length;
  let rows = 0;
  for (let x = x0; x <= x1 + 1e-6; x += 2, rows++) {
    const zc = brookCentre(x), k = slope(x), len = Math.hypot(1, k), nx = -k / len, nz = 1 / len;
    for (const side of [-1, 1]) for (const a of ACROSS) {
      const off = side * (WATER_HALF - 0.6 + a * (BANK_HALF - WATER_HALF + 0.6) + (noise(x * 0.2, side * 3) - 0.5) * 0.9 * a);
      const px = x + nx * off, pz = zc + nz * off;
      pos.push(px, 0.02, pz);
      c.copy(wet).lerp(dry, Math.min(1, a * 1.7));
      if (a > 0.6) { grassTone(px / CELL, pz / CELL, t); t.sub(MID_TONE).add(grass); wildTint(px / CELL, pz / CELL, t, wildAt(px, pz)); c.lerp(t, (a - 0.6) / 0.4); }
      col.push(c.r, c.g, c.b);
    }
  }
  for (let r = 0; r < rows - 1; r++) for (let sd = 0; sd < 2; sd++) for (let a = 0; a < A - 1; a++) {
    const i = r * A * 2 + sd * A + a, j = i + A * 2;
    if (sd) idx.push(i, i + 1, j, i + 1, j + 1, j); else idx.push(i, j, i + 1, i + 1, j, j + 1);
  }
  // the pond's rim
  const base = pos.length / 3, P = POND_SHAPE, SEG = 28;
  for (const [r, w] of [[0.9, 0], [1.12, 0.4], [1.32, 1]]) for (let s = 0; s < SEG; s++) {
    const a = s / SEG * Math.PI * 2, wob = 1 + 0.06 * Math.sin(a * 3 + 1) + (w ? (noise(s, w * 9) - 0.5) * 0.08 : 0);
    const px = P.x + Math.cos(a) * P.rx * r * wob, pz = P.z + Math.sin(a) * P.rz * r * wob;
    c.copy(wet).lerp(dry, w ? 0.8 : 0); if (w === 1) { grassTone(px / CELL, pz / CELL, t); c.copy(wildTint(px / CELL, pz / CELL, t.sub(MID_TONE).add(grass), wildAt(px, pz))); }
    pos.push(px, 0.025, pz); col.push(c.r, c.g, c.b);
  }
  for (let ri = 0; ri < 2; ri++) { const a0 = base + ri * SEG, a1 = a0 + SEG; for (let s = 0; s < SEG; s++) { const s1 = (s + 1) % SEG; idx.push(a0 + s, a0 + s1, a1 + s, a0 + s1, a1 + s1, a1 + s); } }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const ni = g.toNonIndexed(); const n = new Float32Array(ni.attributes.position.count * 3); for (let i = 1; i < n.length; i += 3) n[i] = 1;
  ni.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return ni;
}

/** Stones, reeds and lily pads along the brook and round the pond; the bridge, the stepping stones and the dock. */
function propsGeometry() {
  const parts = [], rock = new THREE.OctahedronGeometry(1, 0), box = new THREE.BoxGeometry(1, 1, 1), pad = new THREE.CircleGeometry(1, 7, 0.4, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2);
  const reedBlade = new THREE.ConeGeometry(0.11, 1, 3, 1, true).translate(0, 0.5, 0), cattail = new THREE.CylinderGeometry(0.09, 0.09, 0.32, 4, 1, true);
  const stoneCols = ['#9aa3a8', '#b3b9bb', '#8c949b', '#a7a29a'], reedCols = ['#5cb33e', '#7cc443', '#45a03a'];
  const stone = (x, z, s, y = 0) => parts.push(part(rock, stoneCols[Math.floor(rand() * 4)], x, y + s * 0.12, z, rand() * 6, s, s * 0.45, s * (0.7 + rand() * 0.4)));
  const reeds = (x, z, h) => {
    for (let b = 0; b < 5; b++) {
      const bx = x + (rand() - 0.5) * 0.8, bz = z + (rand() - 0.5) * 0.8, bh = h * (0.6 + rand() * 0.55);
      const blade = reedBlade.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ((rand() - 0.5) * 0.5));
      parts.push(swayByHeight(part(blade, reedCols[b % 3], bx, 0, bz, rand() * 6, 1, bh, 1), 0, bh * 1.1, 1));
      if (b < 1) parts.push(swayByHeight(part(cattail, '#8a5230', bx, bh * 0.95, bz), 0, bh, 1));
    }
  };
  const lily = (x, z, s) => {
    parts.push(part(pad, rand() < 0.5 ? '#3f9e45' : '#56b04a', x, 0.075, z, rand() * 6, s, 1, s));
    if (rand() < 0.35) parts.push(part(new THREE.ConeGeometry(0.16, 0.18, 5), rand() < 0.5 ? '#ff7fa8' : '#fff1f5', x + 0.1, 0.16, z - 0.1));
  };
  // along the brook, inside the map and a little way out
  for (let x = -40; x < MAP + 40; x += 1.4 + rand() * 1.8) {
    if (onRoad(x)) continue;
    const zc = brookCentre(x), k = slope(x), len = Math.hypot(1, k), nx = -k / len, nz = 1 / len, side = rand() < 0.5 ? -1 : 1, roll = rand();
    const at = off => [x + nx * off, zc + nz * off];
    if (roll < 0.42) { const [px, pz] = at(side * (WATER_HALF - 0.1 + rand() * 0.9)); stone(px, pz, 0.45 + rand() * 0.6); if (rand() < 0.5) { const [qx, qz] = at(side * (WATER_HALF + 0.5)); stone(qx + 0.5, qz, 0.25 + rand() * 0.25); } }
    else if (roll < 0.74) { const [px, pz] = at(side * (WATER_HALF + 0.2 + rand() * 1.1)); reeds(px, pz, 1.1 + rand() * 0.6); }
    else { const [px, pz] = at(side * (1.2 + rand() * 1.5)); lily(px, pz, 0.38 + rand() * 0.22); if (rand() < 0.6) { const [qx, qz] = at(side * (1 + rand() * 1.4)); lily(qx + 0.8, qz, 0.3 + rand() * 0.15); } }
  }
  // the pond: reeds and stones round the rim (not at the dock), lily pads on the water
  const P = POND_SHAPE;
  for (let s = 0; s < 22; s++) {
    const a = s / 22 * Math.PI * 2 + rand() * 0.2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.5) continue;   // east side: the dock
    const r = 1.0 + rand() * 0.12, px = P.x + Math.cos(a) * P.rx * r, pz = P.z + Math.sin(a) * P.rz * r;
    if (s % 3 === 0) stone(px, pz, 0.35 + rand() * 0.35); else reeds(px, pz, 1.0 + rand() * 0.7);
  }
  for (let i = 0; i < 9; i++) { const a = rand() * Math.PI * 2, r = 0.45 + rand() * 0.4; lily(P.x + Math.cos(a) * P.rx * r, P.z + Math.sin(a) * P.rz * r, 0.4 + rand() * 0.2); }
  // stepping stones across the brook north of the farm
  { const x = STEPPING_STONES.x * CELL + 1, zc = brookCentre(x);
    for (let i = -2; i <= 2; i++) parts.push(part(new THREE.CylinderGeometry(0.62, 0.7, 0.3, 7), i % 2 ? '#c2c6c4' : '#aeb3b3', x + (i % 2) * 0.45, 0.1, zc + i * 1.6, i)); }
  // the plank bridge where the road crosses
  { const x0 = BRIDGE.x0 * CELL - 0.7, x1 = (BRIDGE.x1 + 1) * CELL + 0.7, xc = (x0 + x1) / 2, w = x1 - x0, zc = brookCentre(xc), L = 5.4;
    const arch = dz => 0.12 + 0.42 * (1 - (dz / (L + 0.6)) ** 2);
    for (let dz = -L; dz <= L + 1e-6; dz += 0.72) parts.push(part(box, Math.round(dz / 0.72) % 2 ? '#c08850' : '#b07a45', xc, arch(dz), zc + dz, 0, w, 0.14, 0.64));
    for (const sx of [x0 + 0.12, x1 - 0.12]) {
      for (let dz = -L; dz <= L + 1e-6; dz += L / 2) parts.push(part(box, '#8a5a32', sx, arch(dz) + 0.42, zc + dz, 0, 0.2, 0.95, 0.2));
      for (let s = -2; s < 2; s++) { const a = s * L / 2, b = a + L / 2, ya = arch(a) + 0.82, yb = arch(b) + 0.82; const rail = part(box, '#9b6a3c', sx, (ya + yb) / 2, zc + (a + b) / 2, 0, 0.14, 0.12, L / 2 + 0.1); rail.applyMatrix4(new THREE.Matrix4().makeTranslation(-sx, -(ya + yb) / 2, -(zc + (a + b) / 2)).premultiply(new THREE.Matrix4().makeRotationX(-Math.atan2(yb - ya, L / 2))).premultiply(new THREE.Matrix4().makeTranslation(sx, (ya + yb) / 2, zc + (a + b) / 2))); parts.push(rail); }
    }
    for (const sz of [-1, 1]) for (const sx of [x0 + 0.3, x1 - 0.3]) parts.push(part(box, '#6e4a2c', sx, 0.1, zc + sz * (WATER_HALF - 0.3), 0, 0.35, 0.5, 0.35));
  }
  // the pond's dock: planks out over the water on posts
  { const dx = POND_DOCK.x * CELL + 0.6, dz = (POND_DOCK.z + 0.5) * CELL;
    for (let i = 0; i < 7; i++) parts.push(part(box, i % 2 ? '#c08850' : '#b07a45', dx - i * 0.62, 0.32, dz, 0, 0.56, 0.12, 1.7));
    for (const [ox, oz] of [[-0.6, -0.8], [-0.6, 0.8], [-3.8, -0.8], [-3.8, 0.8]]) parts.push(part(box, '#6e4a2c', dx + ox, 0.25, dz + oz, 0, 0.18, 0.7, 0.18));
  }
  return merge(parts);
}

export class Brook {
  constructor(world) {
    this.world = world;
    const { material, uniforms } = waterMaterial(); this.uniforms = uniforms;
    this.water = new THREE.Mesh(waterGeometry(), material); this.water.name = 'brook-water'; this.water.frustumCulled = false;
    this.bank = new THREE.Mesh(merge([bankGeometry(), propsGeometry()]), decorMaterial()); this.bank.name = 'brook-props';
    world.scene.add(this.water, this.bank);
    this.loadDucks();
    world.onFrame((dt, now) => this.frame(dt, now));
  }
  setNight(k) { this.uniforms.uNight.value = k; }
  async loadDucks() {
    const kit = await loadKit('farm'), geo = fit(bake(kit.duck), { height: 0.62 });
    this.ducks = new THREE.InstancedMesh(geo, decorMaterial(), 3); this.ducks.name = 'pond-ducks'; this.ducks.frustumCulled = false;
    this.duckState = [0, 1, 2].map(i => ({ phase: i * 2.1, speed: 0.16 + i * 0.05, r: 0.35 + i * 0.17 }));
    this.world.scene.add(this.ducks);
  }
  frame(dt, now) {
    const t = now / 1000;
    this.uniforms.uTime.value = t % 10000;
    if (this.ducks) {
      const P = POND_SHAPE, m = this.m4 ??= new THREE.Matrix4(), q = this.q ??= new THREE.Quaternion(), v = this.v ??= new THREE.Vector3(), one = this.one ??= new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
      this.duckState.forEach((d, i) => {
        d.phase += dt * d.speed * (i % 2 ? -1 : 1);
        const a = d.phase, wob = Math.sin(a * 2.3 + i) * 0.12, x = P.x + Math.cos(a) * P.rx * (d.r + wob), z = P.z + Math.sin(a) * P.rz * (d.r + wob);
        const dx = -Math.sin(a) * P.rx, dz = Math.cos(a) * P.rz, dir = i % 2 ? -1 : 1;
        q.setFromAxisAngle(up, Math.atan2(dx * dir, dz * dir));
        this.ducks.setMatrixAt(i, m.compose(v.set(x, 0.02 + Math.sin(t * 2.1 + i) * 0.03, z), q, one));
      });
      this.ducks.instanceMatrix.needsUpdate = true;
    }
  }
}
