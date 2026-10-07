// The land around the map, so its edge never shows (world package):
//   a skirt that carries the lawn on past the edge and rises into low hills (y 3–10), with the roads and the brook
//   running out through it; a dense band of low-poly trees on those hills; hazy hill silhouettes further out; and a
//   far plane in the haze colour under everything, so the background colour can never show at any zoom or pan.
//   At each of the four road exits stands a neighbour's farm in silhouette (barn, silo, field strips) with a pennant.
// Haze is computed in the shader from how far a point lies outside the map, and daylight retints it (setHaze), so at
// night the far land melts into a very dark blue. Draws: skirt 1, far plane 1, tree band ≤ 8 (culled per side),
// farms 1. Triangles: about 9k skirt + ~28k trees when the whole ring is on screen.
import * as THREE from 'three';
import { toonRamp } from '../kit/toon.mjs';
import { N, CELL, ROADS, SKIRT, brookCurve } from '../content/world.mjs';
import { noise, grassTone, MID_TONE } from './ground.mjs';
import { NEIGHBOURS } from '../content/people.mjs';
import { t, onLanguageChange } from '../kit/i18n.mjs';
import { GROUND_COLORS } from './world-view.mjs';

export const MAP = N * CELL;   // 256 m
/** The haze colour every backdrop material fades to (linear); daylight sets it. */
export const HAZE = { value: new THREE.Color('#b9def0') };

/** How far a point (metres) lies outside the map. */
export const outside = (x, z) => Math.hypot(Math.max(0, -x, x - MAP), Math.max(0, -z, z - MAP));
const hazeAt = d => Math.min(1, smooth(22, 175, d) * 0.94 + smooth(150, 230, d) * 0.06);
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

const HAZE_GLSL = /* glsl */`
float fvHaze(vec2 p){
  vec2 o = max(vec2(0.0), max(-p, p - ${MAP.toFixed(1)}));
  float d = length(o);
  return min(1.0, smoothstep(22.0, 175.0, d) * 0.94 + smoothstep(150.0, 230.0, d) * 0.06);
}`;
/** Wind for swaying decorations: time and strength (0 with reduced motion). The world package's frame loop sets them. */
export const WIND = { time: { value: 0 }, amp: { value: 1 } };
/**
 * Patch a toon material so it fades into the haze colour outside the map. With sway, vertices carrying an aSway weight
 * (0 = rooted, 1 = tip) bend in the wind, phased by world position; geometry without aSway reads 0 and stays still.
 */
export function withHaze(material, { sway = false } = {}) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uHaze = HAZE;
    if (sway) { shader.uniforms.uWindTime = WIND.time; shader.uniforms.uWindAmp = WIND.amp; }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying float vHaze;
${HAZE_GLSL}${sway ? `
attribute float aSway;
uniform float uWindTime, uWindAmp;` : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>${sway ? `
  if (aSway > 0.0) {
    vec4 sw = vec4(position, 1.0);
    #ifdef USE_INSTANCING
    sw = instanceMatrix * sw;
    #endif
    sw = modelMatrix * sw;
    float ph = sw.x * 0.31 + sw.z * 0.23;
    float gust = 0.65 + 0.35 * sin(uWindTime * 0.37 + sw.x * 0.02);
    transformed.x += sin(uWindTime * 1.9 + ph) * 0.11 * aSway * uWindAmp * gust;
    transformed.z += cos(uWindTime * 1.43 + ph * 1.3) * 0.07 * aSway * uWindAmp * gust;
  }` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 hw = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
    hw = instanceMatrix * hw;
    #endif
    hw = modelMatrix * hw; vHaze = fvHaze(hw.xz); }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uHaze;
varying float vHaze;`)
      .replace('#include <tonemapping_fragment>', `gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, vHaze);
#include <tonemapping_fragment>`);
  };
  material.customProgramCacheKey = () => sway ? 'fv-haze-sway' : 'fv-haze';
  return material;
}
let decor = null;
/** The one material for world decorations (brook props, drifts, tufts): toon, vertex colours, haze and wind sway. */
export const decorMaterial = () => (decor ??= withHaze(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }), { sway: true }));
const hazeToon = () => withHaze(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));

// Distance (metres) from the roads' and brook's lines where they run out of the map, for flattening and colour.
const roadLines = ROADS.map(r => r.x1 - r.x0 < 4 ? { axis: 'x', at: (r.x0 + r.x1 + 1) / 2 * CELL } : { axis: 'z', at: (r.z0 + r.z1 + 1) / 2 * CELL });
const roadDist = (x, z) => Math.min(...roadLines.map(l => {
  // only beyond the map edge that road leaves by
  if (l.axis === 'x') return (z < 0 || z > MAP) ? Math.abs(x - l.at) : 1e9;
  return (x < 0 || x > MAP) ? Math.abs(z - l.at) : 1e9;
}));
const brookDist = (x, z) => (x < 0 || x > MAP) ? Math.abs(z - (brookCurve(x / CELL) + 0.5) * CELL) : 1e9;

/** Ground height of the backdrop (metres). 0 at the map edge; low hills on the skirt; taller hazy ridges further out. */
export function heightAt(x, z) {
  const d = outside(x, z); if (d <= 0) return 0;
  const n1 = noise(x * 0.022 + 5.3, z * 0.022 - 2.1), n2 = noise(x * 0.06 - 11.7, z * 0.06 + 3.3);
  let h = smooth(5, 46, d) * (3 + 7 * n1 + 1.5 * n2);                     // the near hills: 3–10 m
  h += smooth(70, 130, d) * (6 + 14 * noise(x * 0.012 + 40, z * 0.012 - 9)); // the far ridges
  const road = 0.12 + 0.88 * smooth(3, 16, roadDist(x, z)), brook = smooth(6, 22, brookDist(x, z));
  const farm = smooth(0, 18, Math.min(...FARMS.map(f => Math.max(Math.abs(x - f.x) - 25, Math.abs(z - f.z) - 21))));
  return h * Math.min(road, brook) * farm;
}

/** Neighbour farms at the four road exits (metres): where the silhouettes stand and the trees keep clear. */
const FARMS = [
  { id: 'twins', x: 84, z: -44, rot: 0, flag: '#ff5a5f' },
  { id: 'mai', x: 84, z: MAP + 44, rot: Math.PI, flag: '#ffd23f' },
  { id: 'gus', x: -44, z: 206, rot: Math.PI / 2, flag: '#8f6bff' },
  { id: 'priya', x: MAP + 44, z: 206, rot: -Math.PI / 2, flag: '#3fb8ff' },
];
const nearFarm = (x, z, pad = 0) => FARMS.some(f => Math.abs(x - f.x) < 26 + pad && Math.abs(z - f.z) < 22 + pad);

// Small helpers to build merged, vertex-coloured geometry.
function colored(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(), c = new THREE.Color(color), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
export function merge(parts) {
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), sway = new Float32Array(n), hasSway = parts.some(p => p.attributes.aSway);
  let o = 0;
  for (const p of parts) {
    if (!p.attributes.normal) p.computeVertexNormals();
    pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); col.set(p.attributes.color.array, o * 3);
    if (p.attributes.aSway) sway.set(p.attributes.aSway.array, o);
    o += p.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (hasSway) g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
/** Give a geometry a sway weight that grows with height above its base (0 at y0, 1 at y1). */
export function swayByHeight(g, y0, y1, k = 1) {
  const p = g.attributes.position, a = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) a[i] = Math.max(0, Math.min(1, (p.getY(i) - y0) / (y1 - y0))) * k;
  g.setAttribute('aSway', new THREE.BufferAttribute(a, 1)); return g;
}
export const part = (geo, color, x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1) => colored(geo, color).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz)));

/** Low-poly trees for the band: a round broadleaf (26 triangles) and a pine (18). */
function bandTrees() {
  const round = merge([
    part(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 3, 1, true), '#7a5232', 0, 0.6, 0),
    part(new THREE.IcosahedronGeometry(1.25, 0), '#4f9e3c', 0, 2.2, 0, 0.3, 1, 0.92, 1),
  ]);
  const pine = merge([
    part(new THREE.CylinderGeometry(0.14, 0.2, 1, 3, 1, true), '#6e4a2c', 0, 0.5, 0),
    part(new THREE.ConeGeometry(1.15, 2.2, 6, 1, true), '#2f7d45', 0, 1.9, 0),
    part(new THREE.ConeGeometry(0.8, 1.6, 6, 1, true), '#3b8f4e', 0, 3.0, 0, 0.5),
  ]);
  // brighten the crowns' tops a little (fake sky light), darken their undersides
  for (const g of [round, pine]) {
    const p = g.attributes.position, c = g.attributes.color, top = g.boundingBox.max.y;
    for (let i = 0; i < p.count; i++) { const k = 0.82 + 0.3 * (p.getY(i) / top); c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); }
  }
  return { round, pine };
}

export class Backdrop {
  constructor(world) {
    this.world = world;
    this.material = hazeToon();
    this.group = new THREE.Group(); this.group.name = 'backdrop';
    this.group.add(this.buildSkirt(), this.buildFarPlane(), this.buildFarms(), ...this.buildTrees(), ...this.buildNames());
    world.scene.add(this.group);
    onLanguageChange(() => this.paintNames());
  }
  setHaze(color) { HAZE.value.copy(color); }
  /** The skirt: a grid around the map (fine near the edge, coarse far out), with heights, grass tones and haze. */
  buildSkirt() {
    const R = 240, coords = [];
    const push = (a, b, step) => { for (let v = a; v < b - 1e-6; v += step) coords.push(v); };
    push(-R, -SKIRT, 28); push(-SKIRT, 0, 6); push(0, MAP, 8); push(MAP, MAP + SKIRT, 6); push(MAP + SKIRT, MAP + R, 28); coords.push(MAP + R);
    const n = coords.length, idx = [], pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
    const c = new THREE.Color(), t = new THREE.Color(), road = new THREE.Color(GROUND_COLORS.road), bank = new THREE.Color(GROUND_COLORS.bank);
    const forest = new THREE.Color('#3f8a36'), ridge = new THREE.Color('#5c9a52'), grass = new THREE.Color(GROUND_COLORS.grass);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = coords[i], z = coords[j], d = outside(x, z), k = (j * n + i) * 3;
      const y = d > 0 ? heightAt(x, z) : 0;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      // colour: the lawn's tones near the edge, deeper greens on the hills, the road and the brook bank where they run out
      grassTone(x / CELL, z / CELL, t); c.copy(grass).add(t.sub(MID_TONE));
      c.lerp(forest, smooth(8, 40, d) * 0.55); c.lerp(ridge, smooth(70, 120, d) * 0.6);
      c.multiplyScalar(0.92 + 0.12 * Math.min(1, y / 9));                        // hilltops catch the light
      const rd = roadDist(x, z), bd = brookDist(x, z);
      if (rd < 3.2) c.lerp(road, 1 - smooth(1.6, 3.2, rd));
      if (bd < 5.5) c.lerp(bank, 1 - smooth(3.5, 5.5, bd));
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const inside = coords[i] >= 0 && coords[i + 1] <= MAP && coords[j] >= 0 && coords[j + 1] <= MAP;
      if (inside) continue;   // the map's own ground is drawn by ground.mjs
      const a = j * n + i, b = a + 1, cc = a + n, dd = cc + 1;
      idx.push(a, cc, dd, a, dd, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    g.computeVertexNormals();
    // keep the lawn's normals straight up where it is flat, so the toon ramp shows no seams at the map edge
    const nr = g.attributes.normal; for (let v = 0; v < nr.count; v++) if (pos[v * 3 + 1] <= 0.05) nr.setXYZ(v, 0, 1, 0);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, this.material); mesh.name = 'skirt'; mesh.frustumCulled = false;
    return mesh;
  }
  /** Far beyond the hills: one big plane in the haze colour under everything. */
  buildFarPlane() {
    const g = new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2).translate(MAP / 2, -3, MAP / 2);
    const m = new THREE.MeshBasicMaterial({ color: HAZE.value, fog: false });
    m.onBeforeCompile = s => { s.uniforms.diffuse = HAZE; };
    const mesh = new THREE.Mesh(g, m); mesh.name = 'far-plane'; mesh.frustumCulled = false; mesh.renderOrder = -1;
    return mesh;
  }
  /** The tree band: low-poly trees on the near hills, merged into one mesh per 96 m block, so off-screen blocks are culled. */
  buildTrees() {
    const trees = bandTrees(), round = template(trees.round), pine = template(trees.pine), blocks = new Map();
    let seed = 90210; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const step = 5.2, tint = new THREE.Color();
    let count = 0;
    for (let z = -SKIRT; z < MAP + SKIRT; z += step) for (let x = -SKIRT; x < MAP + SKIRT; x += step) {
      const px = x + (rand() - 0.5) * step * 0.9, pz = z + (rand() - 0.5) * step * 0.9, d = outside(px, pz), r1 = rand(), r2 = rand();
      if (d < 2.5 || d > SKIRT - 6) continue;
      if (roadDist(px, pz) < 6 || brookDist(px, pz) < 8 || nearFarm(px, pz, 4)) continue;
      // a dense band close in, thinning out with clearings further up the hills
      const dens = noise(px * 0.05 + 3, pz * 0.05 - 8), keep = d < 20 ? 0.3 : 0.3 + (d - 20) / 55;
      if (dens < keep) continue;
      const sc = 1.15 + r1 * 0.9, t = r2 < 0.38 ? pine : round, v = noise(px * 0.13, pz * 0.13);
      const key = `${Math.floor(px / 96)},${Math.floor(pz / 96)}`, B = blocks.get(key) ?? blocks.set(key, new Builder()).get(key), from = B.col.length;
      B.add(t, px, heightAt(px, pz) - 0.1, pz, px * 1.7 + pz, sc, sc * (0.9 + (count % 5) * 0.06), sc);
      tint.setRGB(0.86 + v * 0.3, 0.9 + v * 0.22, 0.8 + v * 0.2);
      for (let i = from; i < B.col.length; i += 3) { B.col[i] *= tint.r; B.col[i + 1] *= tint.g; B.col[i + 2] *= tint.b; }
      count++;
    }
    this.treeCount = count;
    return [...blocks].map(([key, B]) => { const mesh = new THREE.Mesh(B.build(), this.material); mesh.name = `band-${key}`; return mesh; });
  }
  /** Each neighbour's farm name on a pennant-coloured banner by the road, in the player's language. */
  buildNames() {
    this.names = [];
    for (const f of FARMS) {
      const who = NEIGHBOURS.find(n => n.id === f.id); if (!who?.farm) continue;
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, transparent: true }));
      const side = new THREE.Vector3(-21, 0, 13).applyAxisAngle(new THREE.Vector3(0, 1, 0), f.rot);
      sprite.position.set(f.x + side.x, 10.5, f.z + side.z); sprite.scale.set(16, 4, 1); sprite.name = `farm-name-${f.id}`;
      this.names.push({ sprite, canvas, tex, who, flag: f.flag });
    }
    this.paintNames();
    return this.names.map(n => n.sprite);
  }
  paintNames() {
    for (const n of this.names ?? []) {
      const g = n.canvas.getContext('2d'); if (!g) continue;
      const W = n.canvas.width, H = n.canvas.height;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(60,36,20,0.28)'; g.beginPath(); g.roundRect(10, 16, W - 20, H - 24, 34); g.fill();
      g.fillStyle = '#fff6e4'; g.beginPath(); g.roundRect(6, 8, W - 20, H - 24, 34); g.fill();
      g.fillStyle = n.flag; g.beginPath(); g.roundRect(6, 8, 30, H - 24, [34, 0, 0, 34]); g.fill();
      g.fillStyle = '#5a3a22'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = 54; const label = t(n.who.farm);
      do { g.font = `800 ${size}px Nunito, system-ui, sans-serif`; size -= 2; } while (g.measureText(label).width > W - 90 && size > 20);
      g.fillText(label, W / 2 + 12, H / 2 - 4);
      n.tex.needsUpdate = true;
    }
  }
  /** Neighbour farms in silhouette at the road exits: barn, silo, field strips, a fence line and a pennant. */
  buildFarms() {
    const parts = [], box = new THREE.BoxGeometry(1, 1, 1), roof = new THREE.CylinderGeometry(1, 1, 1, 3, 1).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
    const strips = ['#e9c74e', '#8fcf4a', '#a4683c', '#f0d860', '#6fbf4a', '#c98a4a'];
    for (const f of FARMS) {
      const local = [];
      // field strips (flat, following the ground loosely)
      for (let k = 0; k < 6; k++) local.push(part(box, strips[(k + Math.round(f.x)) % strips.length], -14 + k * 4.2, 0.08, 6, 0, 3.6, 0.16, 18));
      // barn: red walls, dark roof; silo: pale cylinder with a dome
      local.push(part(box, '#c8443a', 10, 3, -6, 0, 9, 6, 7), part(roof, '#5a4a5a', 10, 7.2, -6, 0, 4.6, 9.4, 2.4));
      local.push(part(box, '#f3ead8', 10, 2.4, -2.46, 0, 3, 4, 0.1));
      local.push(part(new THREE.CylinderGeometry(2, 2, 10, 10, 1, true), '#d9dde2', 17.5, 5, -7), part(new THREE.SphereGeometry(2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#9aa7b5', 17.5, 10, -7));
      // a fence line along the road side, and the pennant on its pole
      for (let k = 0; k < 7; k++) local.push(part(box, '#f2e6cc', -16 + k * 5, 0.6, 16, 0, 0.25, 1.2, 0.25));
      local.push(part(box, '#f2e6cc', 0, 0.9, 16, 0, 32, 0.18, 0.12));
      local.push(part(new THREE.CylinderGeometry(0.12, 0.12, 7, 5), '#7a5232', -21, 3.5, 13));
      local.push(part(new THREE.ConeGeometry(1.1, 3.4, 3).rotateZ(-Math.PI / 2), f.flag, -19.3, 6.2, 13, 0, 1, 1, 0.25));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(f.x, 0, f.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.rot), new THREE.Vector3(1, 1, 1));
      for (const p of local) parts.push(p.applyMatrix4(m));
    }
    // the roads running on out of the map, over the hills, into the haze
    for (const l of roadLines) for (const dir of [-1, 1]) {
      const pos = [], col = [], c = new THREE.Color(), road = new THREE.Color(GROUND_COLORS.road), edge = road.clone().multiplyScalar(0.82);
      const half = 2.2;
      for (let t = 0; t <= 170; t += 3) {
        const a = dir < 0 ? -t : MAP + t;
        const [x, z] = l.axis === 'x' ? [l.at, a] : [a, l.at];
        for (const s of [-1, -0.6, 0.6, 1]) {
          const px = l.axis === 'x' ? x + s * half : x, pz = l.axis === 'x' ? z : z + s * half;
          pos.push(px, heightAt(px, pz) + 0.05, pz); c.copy(Math.abs(s) === 1 ? edge : road); col.push(c.r, c.g, c.b);
        }
      }
      const idx = [], rows = pos.length / 12;
      for (let r = 0; r < rows - 1; r++) for (let k = 0; k < 3; k++) { const i = r * 4 + k, j = i + 4; if ((l.axis === 'x') === (dir > 0)) idx.push(i, j, i + 1, i + 1, j, j + 1); else idx.push(i, i + 1, j, i + 1, j + 1, j); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      const ng = g.toNonIndexed(); const n = new Float32Array(ng.attributes.position.count * 3); for (let i = 1; i < n.length; i += 3) n[i] = 1; ng.setAttribute('normal', new THREE.BufferAttribute(n, 3));
      parts.push(ng);
    }
    const mesh = new THREE.Mesh(merge(parts), this.material); mesh.name = 'neighbour-farms';
    return mesh;
  }
}
export { FARMS as NEIGHBOUR_FARMS, heightAt as backdropHeight };

/** A non-indexed template for Builder: positions, normals, colours (optional) and a 0..1 height fraction per vertex. */
export function template(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (!g.attributes.normal) g.computeVertexNormals();
  g.computeBoundingBox(); const top = g.boundingBox.max.y || 1, p = g.attributes.position, h = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) h[i] = Math.max(0, p.getY(i) / top);
  let col = g.attributes.color?.array;
  if (color) { const c = new THREE.Color(color); col = new Float32Array(p.count * 3); for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; } }
  return { pos: p.array, nor: g.attributes.normal.array, col, h, n: p.count };
}
/**
 * Fast merging of many small pieces into one geometry: copies a template's vertices with a placement (position, turn
 * about y, scale), an optional colour and a sway weight, straight into growing arrays (no geometry per piece).
 */
export class Builder {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.sway = []; }
  add(t, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, color = null, swayK = 0, flat = false) {
    const c = Math.cos(ry), s = Math.sin(ry), { pos, nor, col, sway } = this;
    for (let i = 0; i < t.n; i++) {
      const vx = t.pos[i * 3] * sx, vy = t.pos[i * 3 + 1] * sy, vz = t.pos[i * 3 + 2] * sz;
      pos.push(vx * c + vz * s + x, vy + y, -vx * s + vz * c + z);
      const nx = t.nor[i * 3], nz = t.nor[i * 3 + 2]; nor.push(nx * c + nz * s, t.nor[i * 3 + 1], -nx * s + nz * c);
      if (color) col.push(color.r, color.g, color.b); else col.push(t.col[i * 3], t.col[i * 3 + 1], t.col[i * 3 + 2]);
      sway.push(flat ? swayK : swayK * t.h[i]);
    }
    return this;
  }
  /** Append a finished geometry (position, normal, colour, optional aSway). */
  addGeometry(g) {
    const n = g.attributes.position.count;
    for (let i = 0; i < n * 3; i++) { this.pos.push(g.attributes.position.array[i]); this.nor.push(g.attributes.normal.array[i]); this.col.push(g.attributes.color.array[i]); }
    for (let i = 0; i < n; i++) this.sway.push(g.attributes.aSway ? g.attributes.aSway.array[i] : 0);
    return this;
  }
  get empty() { return this.pos.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
