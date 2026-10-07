// Loads GLB kits and bakes every model root into one geometry with vertex colours (TECH-PLAN 6, rule 1), so each model
// draws with the shared toon material in one call per batch.
// - Kits are meshopt-compressed (art/blender/pack.mjs); the decoder is set here, so load every kit through loadKit().
// - bake() keeps a root's own vertex colours (COLOR_0) multiplied by its material colours, and darkens low and
//   downward-facing vertices (cheap baked ambient occlusion: models sit on the ground instead of floating).
// - tiers() uses the kit's authored <name>_mid / <name>_far roots for the lower levels of detail when they exist, and
//   falls back to simplify() for the middle level.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const kits = new Map();
export const MODEL_BASE = './assets/models/'; // relative to the page (dist/index.html)
/** Load a GLB kit once: { name → Object3D } of its root nodes. */
export function loadKit(file) {
  if (!kits.has(file)) kits.set(file, loader.loadAsync(`${MODEL_BASE}${file}.glb`).then(g => Object.fromEntries(g.scene.children.map(c => [c.name, c]))));
  return kits.get(file);
}
/** Load a kit once the page is idle after the first frame (TECH-PLAN 6, loading order). */
export function loadKitLater(file, delayMs = 0) {
  if (kits.has(file)) return kits.get(file);
  return new Promise(resolve => {
    const go = () => resolve(loadKit(file));
    const idle = () => (globalThis.requestIdleCallback ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 50));
    requestAnimationFrame(() => setTimeout(idle, delayMs));
  });
}
/** A float copy of a (possibly quantized or normalized) attribute with `n` components. */
function floats(attr, n) {
  const out = new Float32Array(attr.count * n), get = ['getX', 'getY', 'getZ', 'getW'];
  for (let i = 0; i < attr.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = k < attr.itemSize ? attr[get[k]](i) : 1;
  return new THREE.BufferAttribute(out, n);
}
/** One geometry with position, normal and colour; centred on x/z, standing on y = 0 (center: false keeps the authored
 *  origin, for pieces modelled around their footprint centre). ao: 0 = none, 1 = full. */
export function bake(root, { ao = 1, center = true } = {}) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert(), parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', floats(src.attributes.position, 3));
    if (src.attributes.normal) g.setAttribute('normal', floats(src.attributes.normal, 3)); else g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const c = (Array.isArray(o.material) ? o.material[0] : o.material)?.color ?? new THREE.Color(1, 1, 1);
    const vc = src.attributes.color, col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0, v = 0; i < col.length; i += 3, v++) {
      col[i] = c.r * (vc ? vc.getX(v) : 1); col[i + 1] = c.g * (vc ? vc.getY(v) : 1); col[i + 2] = c.b * (vc ? vc.getZ(v) : 1);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  });
  const g = mergeGeometries(parts); g.computeBoundingBox();
  const b = g.boundingBox;
  if (center) { g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.computeBoundingBox(); }
  g.computeBoundingSphere();
  if (ao) occlude(g, ao);
  return g;
}
/** Baked ambient occlusion by height and facing: the lowest part of a model (a quarter of its height, at most 1.2 model
 *  units) darkens toward its base, and faces that look down darken a little more. */
export function occlude(g, strength = 1) {
  const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, h = Math.max(1e-3, g.boundingBox.max.y);
  const reach = Math.min(h * 0.25, 1.2), floor = 1 - 0.3 * strength, under = 1 - 0.2 * strength;
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, p.getY(i) / reach)), s = t * t * (3 - 2 * t);
    let k = floor + (1 - floor) * s;
    if (n && n.getY(i) < -0.35) k *= under;
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
  c.needsUpdate = true;
  return g;
}
/** The factor that scales a baked geometry to a footprint width, a height, or a fixed scale. */
export function fitFactor(g, { width, height, scale } = {}) {
  if (scale) return scale;
  const s = g.boundingBox.getSize(new THREE.Vector3());
  return width ? width / Math.max(s.x, s.z) : height ? height / s.y : 1;
}
/** Scale a baked geometry to a footprint width, a height, or by `scale` (pieces authored in metres use scale 1). */
export function fit(g, size) {
  const k = fitFactor(g, size);
  if (k !== 1) { g.scale(k, k, k); g.computeBoundingBox(); g.computeBoundingSphere(); }
  return g;
}
const simplifier = new SimplifyModifier();
/** The middle level of detail: about `keep` of the triangles. */
export function simplify(geo, keep = 0.4) {
  const merged = mergeVertices(geo.clone()), n = merged.attributes.position.count;
  const g = simplifier.modify(merged, Math.floor(n * (1 - keep))); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
/** The average colour of a baked geometry (for far stand-ins). */
export function averageColor(g) {
  const c = g.attributes.color.array, out = new THREE.Color(0, 0, 0); let n = 0;
  for (let i = 0; i < c.length; i += 9) { out.r += c[i]; out.g += c[i + 1]; out.b += c[i + 2]; n++; }
  return out.multiplyScalar(1 / Math.max(1, n));
}
/**
 * The levels of detail of a kit root: { geo, mid, far?, color, scale }. `size` is { width } | { height } | { scale }.
 * Authored <node>_mid and <node>_far roots are scaled by the same factor as the full model. lod 'static' keeps the
 * full model at every level.
 */
export function tiers(kit, node, size, lod = 'static', { ao = 1, center = true } = {}) {
  const root = kit[node];
  if (!root) throw new Error(`model ${node} is not in its kit`);
  const full = bake(root, { ao, center }), k = fitFactor(full, size);
  const scaled = g => { if (k !== 1) { g.scale(k, k, k); g.computeBoundingBox(); g.computeBoundingSphere(); } return g; };
  const geo = scaled(full);
  const mid = lod === 'static' ? geo : kit[`${node}_mid`] ? scaled(bake(kit[`${node}_mid`], { ao, center })) : simplify(geo);
  const far = kit[`${node}_far`] ? scaled(bake(kit[`${node}_far`], { ao, center })) : undefined;
  return { geo, mid, far, color: averageColor(geo), scale: k };
}
