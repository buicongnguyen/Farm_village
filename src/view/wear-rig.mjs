// Optional costume fitting, loaded only when someone wears an outfit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hats (content/wardrobe.mjs): head pieces from the owner's Willowmere, cut by art/tools/build-wear.mjs into wear.glb in
// "head space" (origin on the top of the head, one unit = the head's width). A hat is bound rigidly to the head bone and
// merged into the rig's geometry, so it is in the skinned actor, the baked crowd pose and the walk cycle alike, at no
// extra draw call. A body in a hat is a rig of its own ("man+hat_straw"), made the first time someone wears it.
let wearKit = null;
const loadWear = (loader, base) => (wearKit ??= loader.loadAsync(`${base}wear.glb`).then(g => { const m = new Map(); g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (o.isMesh) m.set(o.name, o); }); return m; }).catch(e => { wearKit = null; throw e; }));
// Whole costumes (costumes.glb, "kit:<id>" in a rig's wear list) were cut for the chibi explorer of Zoo Garden and
// Willowmere: rigid parts in that body's own space. Each part is re-fitted onto the villager's bones: the head part as a
// hat is, the body over hips, spine and chest, a sleeve along the upper arm and forearm and a leg along thigh and shin,
// with the weights blended at the elbow and the knee so the cloth bends with the limb.
let kitFile = null;
const loadKits = (loader, base) => (kitFile ??= loader.loadAsync(`${base}costumes.glb`).then(g => {
  const m = new Map(); g.scene.updateMatrixWorld(true);
  g.scene.traverse(o => { if (o.isMesh) { const [kit, part] = o.name.split('__'); (m.get(kit) ?? m.set(kit, []).get(kit)).push({ part, mesh: o }); } });
  return m;
}).catch(e => { kitFile = null; throw e; }));
// the chibi the pieces were made on (hero.glb), metres: the top and width of its head, its torso, a shoulder and a hip
const CHIBI = { headTop: 2.18, headWidth: 1.16, torso: { y0: 0.5, y1: 1.06, half: 0.41 }, shoulder: [0.37, 1.08, -0.02], arm: 0.36, armR: 0.12, hip: [0.18, 0.52, 0], leg: 0.52, legR: 0.13 };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** The villager as the costume needs it: joints, the head's box, how thick the torso and the limbs are (model space). */
function measure(rig) {
  if (rig.fit) return rig.fit;
  const skel = rig.mesh.skeleton, index = Object.fromEntries(skel.bones.map((b, i) => [b.name, i]));
  const joint = name => index[name] === undefined ? null : new THREE.Vector3().setFromMatrixPosition(skel.boneInverses[index[name]].clone().invert());
  const P = rig.geo.attributes.position, SI = rig.geo.attributes.skinIndex, SW = rig.geo.attributes.skinWeight, v = new THREE.Vector3(), by = new Map();
  for (let i = 0; i < P.count; i++) {
    let best = 0; for (let c = 1; c < 4; c++) if (SW.getComponent(i, c) > SW.getComponent(i, best)) best = c;
    if (SW.getComponent(i, best) < 0.6) continue;
    const bone = SI.getComponent(i, best); (by.get(bone) ?? by.set(bone, []).get(bone)).push(v.fromBufferAttribute(P, i).applyMatrix4(rig.mesh.bindMatrix).clone());
  }
  const of = (...names) => names.flatMap(n => by.get(index[n]) ?? []), pct = (list, q) => list.length ? list.sort((x, y) => x - y)[Math.floor((list.length - 1) * q)] : 0;
  const head = new THREE.Box3().setFromPoints(of('head')), torso = of('hips', 'spine', 'chest'), cz = pct(torso.map(p => p.z), 0.5);
  const limb = (a, b, names) => { const A = joint(a), B = joint(b); if (!A || !B) return 0; const d = B.clone().sub(A).normalize(); return pct(of(...names).map(p => { const q = p.clone().sub(A); return q.sub(d.clone().multiplyScalar(q.dot(d))).length(); }), 0.85); };
  const sides = {};
  for (const tail of ['_L', '_R']) {
    const S = joint(`upperarm${tail}`), E = joint(`forearm${tail}`), W = joint(`hand${tail}`), H = joint(`thigh${tail}`), K = joint(`shin${tail}`), A = joint(`foot${tail}`); if (!S || !E || !W || !H || !K || !A) continue;
    sides[S.x < 0 ? -1 : 1] = { S, E, W, H, K, A, armR: limb(`upperarm${tail}`, `forearm${tail}`, [`upperarm${tail}`]), legR: Math.min(limb(`thigh${tail}`, `shin${tail}`, [`thigh${tail}`]), limb(`shin${tail}`, `foot${tail}`, [`shin${tail}`]) * 1.25),   // (the shin's, a little over: a thigh's vertices take in the seat and the shirt tail, which made costume legs huge)
      bones: { upper: index[`upperarm${tail}`], fore: index[`forearm${tail}`], thigh: index[`thigh${tail}`], shin: index[`shin${tail}`], foot: index[`foot${tail}`] } };
  }
  const low = Math.min(...[...by.values()].flat().map(p => p.y));
  return (rig.fit = { index, head, low, sides, torso: { y0: (joint('thigh_L') ?? joint('hips')).y, y1: joint('neck')?.y ?? head.min.y, cz,
    halfW: pct(torso.map(p => Math.abs(p.x)), 0.8), halfD: pct(torso.map(p => Math.abs(p.z - cz)), 0.85) } });
}
/** Where a chibi point of a part goes on this villager, and the bones that carry it: { p: Vector3, w: [[bone, weight]…] }. */
function refit(fit, part, x, y, z) {
  const C = CHIBI, bone = n => fit.index[n];
  if (part === 'head') {
    const width = Math.min(fit.head.max.x - fit.head.min.x, fit.head.max.z - fit.head.min.z) * HEAD_FIT / C.headWidth;
    return { p: new THREE.Vector3((fit.head.min.x + fit.head.max.x) / 2 + x * width, fit.head.max.y + (y - C.headTop) * width, (fit.head.min.z + fit.head.max.z) / 2 + z * width), w: [[bone('head'), 1]] };
  }
  if (part === 'body') {
    const T = fit.torso, v = (y - C.torso.y0) / (C.torso.y1 - C.torso.y0), chest = smooth(0.45, 0.8, v), hips = 1 - smooth(0.1, 0.4, v);
    return { p: new THREE.Vector3(x * T.halfW / C.torso.half * BODY_FIT, T.y0 + v * (T.y1 - T.y0), T.cz + z * T.halfD / C.torso.half * BODY_FIT),
      w: [[bone('chest'), chest], [bone('hips'), hips], [bone('spine'), Math.max(0, 1 - chest - hips)]] };
  }
  const arm = part.startsWith('arm'), side = fit.sides[(part.endsWith('left') ? -1 : 1)]; if (!side) return null;
  const from = arm ? side.S : side.H, mid = arm ? side.E : side.K, end = arm ? side.W : new THREE.Vector3(side.A.x, fit.low, side.A.z);
  const o = arm ? C.shoulder : C.hip, sx = part.endsWith('left') ? -1 : 1, t = (o[1] - y) / (arm ? C.arm : C.leg), kr = (arm ? side.armR / C.armR * LIMB_FIT : side.legR / C.legR * LEG_FIT);
  const d = end.clone().sub(from), len = d.length(); d.normalize();
  const f = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize(), u = new THREE.Vector3().crossVectors(f, d);
  const p = from.clone().addScaledVector(d, t * len).addScaledVector(u, (x - sx * o[0]) * kr).addScaledVector(f, (z - o[2]) * kr);
  const bend = mid.clone().sub(from).dot(d) / len, lower = smooth(bend - 0.1, bend + 0.1, t);
  if (arm) return { p, w: [[side.bones.upper, 1 - lower], [side.bones.fore, lower]] };
  const ankle = side.A.clone().sub(from).dot(d) / len, foot = smooth(ankle - 0.04, ankle + 0.06, t);
  return { p, w: [[side.bones.thigh, (1 - lower) * (1 - foot)], [side.bones.shin, lower * (1 - foot)], [side.bones.foot, foot]] };
}
/** One piece (its part and its mesh) as a skinned geometry on this rig, in the rig's own bind space. */
function fitPiece(rig, part, mesh, headSpace = false) {
  const asHair = part.endsWith('+hair'); if (asHair) part = part.slice(0, -5);   // hair pieces (buns, tails): white here, tinted with the wearer's hair
  const fit = measure(rig), src = mesh.geometry, n = src.attributes.position.count, C = src.attributes.color, v = new THREE.Vector3();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(src.attributes.position, i).applyMatrix4(mesh.matrixWorld);
    if (headSpace) v.multiplyScalar(CHIBI.headWidth).setY(v.y + CHIBI.headTop);   // a hat is stored from the top of the head
    const r = refit(fit, part, v.x, v.y, v.z); if (!r) return null;
    r.p.applyMatrix4(rig.mesh.bindMatrixInverse); pos.set([r.p.x, r.p.y, r.p.z], i * 3);
    col.set(C && !asHair ? [C.getX(i), C.getY(i), C.getZ(i)] : [1, 1, 1], i * 3);
    const w = r.w.filter(([b, k]) => b !== undefined && k > 0.001), sum = w.reduce((t, [, k]) => t + k, 0) || 1;
    w.slice(0, 4).forEach(([b, k], j) => { si[i * 4 + j] = b; sw[i * 4 + j] = k / sum; });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(Array.from(src.index.array)); g.computeVertexNormals();
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSlot', new THREE.BufferAttribute(new Float32Array(n).fill(asHair && rig.def.tint ? 1 : 0), 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}
/** A skirt made here, not loaded ("skirt:1" short, "skirt:2" to the knee, "skirt:3" long): sixteen pleats flaring from
 *  the waist, about 190 triangles. It takes the trousers' colour (the bottom tint), hangs from the hips and rides on the
 *  thighs (and the shins, when it is long) so it follows a stride. */
function skirtPiece(rig, length) {
  const fit = measure(rig), L = fit.sides[-1], R = fit.sides[1]; if (!L || !R || fit.index.hips === undefined) return null;
  const hipY = (L.H.y + R.H.y) / 2, kneeY = (L.K.y + R.K.y) / 2, ankleY = (L.A.y + R.A.y) / 2, T = fit.torso;
  const top = hipY + (T.y1 - hipY) * 0.2, foot = length <= 1 ? hipY + (kneeY - hipY) * 0.55 : length === 2 ? kneeY - (hipY - kneeY) * 0.06 : kneeY + (ankleY - kneeY) * 0.62;
  const SEG = 16, ROWS = 6, n = SEG * ROWS, pos = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), index = [], v = new THREE.Vector3();
  const flare = 1.45 + 0.2 * length;
  for (let r = 0; r < ROWS; r++) for (let s = 0; s < SEG; s++) {
    const t = r / (ROWS - 1), a = s / SEG * Math.PI * 2, y = top + (foot - top) * t, wide = 1.1 + (flare - 1.1) * Math.pow(t, 0.8), pleat = 1 + (s % 2 ? 0.07 : -0.03) * t, i = r * SEG + s;
    const x = Math.sin(a) * T.halfW * wide * pleat, z = T.cz + Math.cos(a) * T.halfD * 1.15 * wide * pleat;
    v.set(x, y, z).applyMatrix4(rig.mesh.bindMatrixInverse); pos.set([v.x, v.y, v.z], i * 3);
    const shade = 1 - 0.1 * (s % 2) - 0.08 * t; col.set([shade, shade, shade], i * 3);   // pleats and a darker hem
    const side = smooth(-T.halfW * 0.25, T.halfW * 0.25, x), ride = smooth(hipY + (top - hipY) * 0.5, hipY - (hipY - kneeY) * 0.45, y) * 0.9, low = smooth(kneeY + 0.02, kneeY - (kneeY - ankleY) * 0.25, y);
    const w = [[fit.index.hips, 1 - ride], [R.bones.thigh, ride * side * (1 - low)], [L.bones.thigh, ride * (1 - side) * (1 - low)], [R.bones.shin, ride * side * low], [L.bones.shin, ride * (1 - side) * low]]
      .filter(([, q]) => q > 0.001).sort((p, q) => q[1] - p[1]).slice(0, 4), sum = w.reduce((q, [, e]) => q + e, 0) || 1;
    w.forEach(([b, q], j) => { si[i * 4 + j] = b; sw[i * 4 + j] = q / sum; });
    if (r) { const p0 = (r - 1) * SEG + s, p1 = (r - 1) * SEG + (s + 1) % SEG, c1 = r * SEG + (s + 1) % SEG; index.push(p0, i, c1, p0, c1, p1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(index); g.computeVertexNormals();
  const N = g.attributes.normal, P = g.attributes.position, c = new THREE.Vector3(0, 0, T.cz).applyMatrix4(rig.mesh.bindMatrixInverse);   // normals must look out
  let out = 0; for (let i = 0; i < n; i++) out += (P.getX(i) - c.x) * N.getX(i) + (P.getZ(i) - c.z) * N.getZ(i);
  if (out < 0) { for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]]; g.setIndex(index); g.computeVertexNormals(); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSlot', new THREE.BufferAttribute(new Float32Array(n).fill(rig.def.tint ? 3 : 0), 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}
/** Put a wear list on a rig ("hat_straw", "kit:dz_pirate", or both joined by "+"): one merged geometry, no extra draw call. */
export async function putOn(rig, wear, loader, base) {
  const parts = [];
  try {
    for (const id of wear.split('+')) {
      if (id.startsWith('skirt:')) parts.push(skirtPiece(rig, +id.slice(6)));
      else if (id.startsWith('kit:')) for (const { part, mesh } of (await loadKits(loader, base)).get(id.slice(4)) ?? []) parts.push(fitPiece(rig, part, mesh));
      else { const piece = (await loadWear(loader, base)).get(id); if (piece) parts.push(fitPiece(rig, 'head', piece, true)); }
    }
    const merged = mergeGeometries([rig.geo, ...parts.filter(Boolean)], false); if (!merged) return;
    rig.geo.dispose(); rig.geo = merged; rig.mesh.geometry = merged;
  } finally { for (const g of parts) g?.dispose(); }
}
const LEG_FIT = 1.12;   // Claude's closer trouser and boot fit.
const BODY_FIT = 1.18, LIMB_FIT = 1.25;   // a costume's width over the torso, and over a limb (cloth outside the body)
const HEAD_FIT = 1.0;   // a hat's size against the head it sits on
