// Loads GLB kits and bakes every model root into one geometry with vertex colours (TECH-PLAN 6, rule 1), so each model
// draws with the shared toon material in one call per batch. Also makes the simplified middle level of detail until the
// Blender export provides *_mid models.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

const loader = new GLTFLoader();
const kits = new Map();
export const MODEL_BASE = './assets/models/'; // relative to the page (dist/index.html)
/** Load a GLB kit once: { name → Object3D } of its root nodes. */
export function loadKit(file) {
  if (!kits.has(file)) kits.set(file, loader.loadAsync(`${MODEL_BASE}${file}.glb`).then(g => Object.fromEntries(g.scene.children.map(c => [c.name, c]))));
  return kits.get(file);
}
/** One geometry with position, normal and colour; centred on x/z, standing on y = 0. */
export function bake(root) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert(), parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const c = (Array.isArray(o.material) ? o.material[0] : o.material)?.color ?? new THREE.Color(1, 1, 1);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  });
  const g = mergeGeometries(parts); g.computeBoundingBox();
  const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
/** Scale a baked geometry to a footprint width or a height, in metres. */
export function fit(g, { width, height }) {
  const s = g.boundingBox.getSize(new THREE.Vector3()), k = width ? width / Math.max(s.x, s.z) : height / s.y;
  g.scale(k, k, k); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
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
