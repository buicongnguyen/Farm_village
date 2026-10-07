// The living cast's drawing (cast package): rigged, animated animals and people from Starline, shown two ways.
//   near the camera centre → a pooled SkinnedMesh with its own AnimationMixer (at most 8, about 25 m, a triangle budget)
//   everywhere else        → one instanced batch per rig, baked from the same model in a resting pose
// The views (life-view, people-view, critters) only keep "subjects": plain objects with a rig, a position, a facing and
// the clip they would like to play. The Cast hands actors to the subjects nearest the centre, with hysteresis so nobody
// flickers between the two, and draws the rest as instances. Rigged models load lazily, after the first frames.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, toonRamp } from '../kit/toon.mjs';
import { STANDINS } from './batches.mjs';

export const RIG_BASE = './assets/models/rigged/';
// height: metres on our map (animals and people are 1.3–1.4x their real size next to the buildings, as in Hay Day).
// walk: the speed (m/s, at our size) the Walk clip is authored for, so feet do not slide. tint: clothes can be recoloured.
export const RIGS = {
  hen:    { file: 'chicken', height: 0.95, walk: 0.95, bake: 'Idle' },
  cow:    { file: 'cow', height: 2.05, walk: 1.0, bake: 'Idle' },
  pig:    { file: 'pig', height: 1.1, walk: 1.0, bake: 'Idle' },
  goat:   { file: 'goat', height: 1.35, walk: 1.2, bake: 'Idle' },
  sheep:  { file: 'sheep', height: 1.3, walk: 1.1, bake: 'Idle' },
  duck:   { file: 'duck', height: 0.85, walk: 0.5, bake: 'Idle' },
  dog:    { file: 'dog', height: 1.05, walk: 1.9, run: 7.8, bake: 'Idle' },
  cat:    { file: 'cat', height: 0.85, walk: 0.8, bake: 'Idle' },
  crow:   { file: 'crow', height: 0.75, walk: 0.6, bake: 'Idle' },
  rabbit: { file: 'rabbit', height: 0.8, walk: 1.2, bake: 'Idle' },
  man:    { file: 'villager-man', height: 2.3, walk: 2.1, bake: 'Idle', tint: true },
  woman:  { file: 'villager-woman', height: 2.2, walk: 2.05, bake: 'Idle', tint: true },
  kid:    { file: 'villager-kid', height: 1.6, walk: 1.75, bake: 'Idle', tint: true },
  hana:   { file: 'hana', height: 2.1, walk: 2.0, bake: 'Idle', tint: true },
};
// Clothes slots that can be recoloured, by material name. Their vertices are baked white (keeping the shading), and the
// tint colour multiplies them back: per instance in a batch, per material on a skinned actor.
const SLOTS = [['hair', /hair/i], ['top', /shirt|dress|headscarf/i], ['bottom', /trousers|apron/i]];
// A wanted clip that a rig does not have falls back along these lists.
const FALLBACK = {
  Walk: ['Walk', 'Hop', 'Swim', 'Idle'], Run: ['Run', 'Walk'], Graze: ['Graze', 'Snuffle', 'Idle'], Peck: ['Idle'],
  Sleep: ['Sleep', 'Sit', 'Idle'], Sit: ['Sit', 'Sleep', 'Idle'], Call: ['Moo', 'Oink', 'Bleat', 'Bark', 'Flap', 'Hop', 'Wave', 'Idle'],
  Wave: ['Wave', 'Talk', 'Idle'], Talk: ['Talk', 'Idle'], Cheer: ['Cheer', 'Wave', 'Jump', 'Idle'], Carry: ['Carry', 'Walk'],
  Hammer: ['Hammer', 'Interact', 'Idle'], Sweep: ['Sweep', 'Idle'], Knead: ['Knead', 'Interact', 'Idle'], Fly: ['Fly', 'Flap', 'Idle'],
  Swim: ['Swim', 'Idle'], Wag: ['Wag', 'Idle'], Bark: ['Bark', 'Idle'], Flap: ['Flap', 'Idle'], Hop: ['Hop', 'Idle'], Idle: ['Idle'],
};

const loader = new GLTFLoader();
const rigs = new Map();          // name → Promise<Rig>
const loaded = new Map();        // name → Rig, once ready

/** Merge a rigged GLB's primitives into one skinned geometry with baked vertex colours, so one actor is one draw call. */
function mergeRig(def, gltf) {
  const root = gltf.scene; root.updateMatrixWorld(true);
  const meshes = []; root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  const slotOf = name => { const i = SLOTS.findIndex(([, re]) => re.test(name)); return def.tint && i >= 0 ? i + 1 : 0; };
  const tint = { hair: new THREE.Color(1, 1, 1), top: new THREE.Color(1, 1, 1), bottom: new THREE.Color(1, 1, 1) };
  const parts = meshes.map(m => {
    const src = m.geometry, n = src.attributes.position.count, mat = Array.isArray(m.material) ? m.material[0] : m.material;
    const base = mat?.color ?? new THREE.Color(1, 1, 1), slot = slotOf(mat?.name ?? ''), ao = src.attributes.color;
    if (slot) tint[SLOTS[slot - 1][0]].copy(base);
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), sl = new Float32Array(n).fill(slot);
    const P = src.attributes.position, N = src.attributes.normal, I = src.attributes.skinIndex, W = src.attributes.skinWeight;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = P.getX(i); pos[i * 3 + 1] = P.getY(i); pos[i * 3 + 2] = P.getZ(i);
      if (N) { nor[i * 3] = N.getX(i); nor[i * 3 + 1] = N.getY(i); nor[i * 3 + 2] = N.getZ(i); }
      const a = ao ? [ao.getX(i), ao.getY(i), ao.getZ(i)] : [1, 1, 1], c = slot ? [1, 1, 1] : [base.r, base.g, base.b];
      col[i * 3] = c[0] * a[0]; col[i * 3 + 1] = c[1] * a[1]; col[i * 3 + 2] = c[2] * a[2];
      for (let k = 0; k < 4; k++) { si[i * 4 + k] = I.getComponent(i, k); sw[i * 4 + k] = W.getComponent(i, k); }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSlot', new THREE.BufferAttribute(sl, 1));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    if (src.index) g.setIndex(Array.from(src.index.array));
    if (!N) g.computeVertexNormals();
    return g;
  });
  const geo = mergeGeometries(parts, false);
  const keep = meshes[0]; keep.geometry = geo; keep.frustumCulled = false;
  for (const m of meshes.slice(1)) m.parent.remove(m);
  return { template: root, mesh: keep, geo, tint };
}

/** Pose a copy of the rig on a clip frame and bake it into a static geometry (root space, unscaled). */
function bakePose(rig, clipName) {
  const copy = cloneSkinned(rig.template), mixer = new THREE.AnimationMixer(copy), clip = rig.clips.get(clipName);
  if (clip) { mixer.clipAction(clip).play(); mixer.update(0.0001); }
  copy.updateMatrixWorld(true);
  let sm = null; copy.traverse(o => { if (o.isSkinnedMesh) sm = o; });
  const src = sm.geometry, n = src.attributes.position.count, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const p = new THREE.Vector3(), q = new THREE.Vector3(), nv = new THREE.Vector3(), m = sm.matrixWorld;
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(src.attributes.position, i); nv.fromBufferAttribute(src.attributes.normal, i);
    q.copy(p).addScaledVector(nv, 0.01);   // the normal follows the skin: skin a point a little way along it too
    sm.applyBoneTransform(i, p).applyMatrix4(m); sm.applyBoneTransform(i, q).applyMatrix4(m);
    nv.copy(q).sub(p).normalize();
    pos.set([p.x, p.y, p.z], i * 3); nor.set([nv.x, nv.y, nv.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', src.attributes.color.clone()); g.setAttribute('aSlot', src.attributes.aSlot.clone());
  g.setIndex(src.index.clone()); g.computeBoundingBox(); g.computeBoundingSphere();
  mixer.stopAllAction(); mixer.uncacheRoot(copy);
  return g;
}

/**
 * A lighter copy of a baked pose by vertex clustering: snap vertices to a grid of `cells` steps across the model, merge
 * the ones that share a grid cell, a clothes slot and a colour, and drop the triangles that collapse. Linear time (a few
 * milliseconds), so it can run on the phone without a hitch, unlike an edge-collapse simplifier.
 */
function lighter(geo, cells) {
  const pos = geo.attributes.position, col = geo.attributes.color, slot = geo.attributes.aSlot, n = pos.count;
  const box = geo.boundingBox, step = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) / cells;
  const ids = new Map(), remap = new Int32Array(n), acc = [];
  for (let i = 0; i < n; i++) {
    const q = c => Math.min(7, Math.floor(c * 8));
    const key = `${Math.round((pos.getX(i) - box.min.x) / step)},${Math.round((pos.getY(i) - box.min.y) / step)},${Math.round((pos.getZ(i) - box.min.z) / step)},${slot.getX(i)},${q(col.getX(i))}${q(col.getY(i))}${q(col.getZ(i))}`;
    let id = ids.get(key);
    if (id === undefined) { id = acc.length; ids.set(key, id); acc.push([0, 0, 0, 0, 0, 0, 0, slot.getX(i)]); }
    const a = acc[id]; a[0] += pos.getX(i); a[1] += pos.getY(i); a[2] += pos.getZ(i); a[3] += col.getX(i); a[4] += col.getY(i); a[5] += col.getZ(i); a[6]++;
    remap[i] = id;
  }
  const P = new Float32Array(acc.length * 3), C = new Float32Array(acc.length * 3), S = new Float32Array(acc.length);
  acc.forEach((a, i) => { P.set([a[0] / a[6], a[1] / a[6], a[2] / a[6]], i * 3); C.set([a[3] / a[6], a[4] / a[6], a[5] / a[6]], i * 3); S[i] = a[7]; });
  const src = geo.index ? geo.index.array : Array.from({ length: n }, (_, i) => i), index = [], seen = new Set();
  for (let t = 0; t < src.length; t += 3) {
    const a = remap[src[t]], b = remap[src[t + 1]], c = remap[src[t + 2]];
    if (a === b || b === c || a === c) continue;
    const k = [a, b, c].sort((x, y) => x - y).join(','); if (seen.has(k)) continue; seen.add(k);
    index.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('aSlot', new THREE.BufferAttribute(S, 1));
  g.setIndex(index); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const idle = () => new Promise(r => (globalThis.requestIdleCallback ?? (f => setTimeout(f, 16)))(() => r(), { timeout: 400 }));

/** Load a rig once: merged skinned template, clips, baked crowd geometries and its scale on our map. */
export function loadRig(name) {
  if (!rigs.has(name)) rigs.set(name, (async () => {
    const def = RIGS[name], gltf = await loader.loadAsync(`${RIG_BASE}${def.file}.glb`), ms = [];
    let t0 = performance.now();
    const rig = { name, def, clips: new Map(gltf.animations.map(c => [c.name, c])), ...mergeRig(def, gltf) };
    ms.push(performance.now() - t0); await idle(); t0 = performance.now();
    const pose = bakePose(rig, def.bake), box = pose.boundingBox;
    rig.k = def.height / Math.max(0.05, box.max.y - Math.min(0, box.min.y));
    rig.lift = -Math.min(0, box.min.y) * rig.k;   // feet on the ground
    pose.scale(rig.k, rig.k, rig.k); pose.translate(0, rig.lift, 0); pose.computeBoundingBox(); pose.computeBoundingSphere();
    rig.tris = tris(rig.geo);
    ms.push(performance.now() - t0); await idle(); t0 = performance.now();
    rig.near = rig.tris > 3200 ? lighter(pose, 48) : pose;
    ms.push(performance.now() - t0); await idle(); t0 = performance.now();
    rig.mid = lighter(pose, 16);
    ms.push(performance.now() - t0); rig.ms = ms.map(Math.round);   // main-thread work per step (the longest is what a player could feel)
    const c = new THREE.Color(0, 0, 0), col = pose.attributes.color.array; let n = 0;
    for (let i = 0; i < col.length; i += 9) { c.r += col[i]; c.g += col[i + 1]; c.b += col[i + 2]; n++; }
    rig.color = c.multiplyScalar(1 / Math.max(1, n));
    const size = pose.boundingBox.getSize(new THREE.Vector3()); rig.standin = Math.max(size.x, size.z) / 1.1;
    rig.clipFor = want => { for (const c2 of FALLBACK[want] ?? [want, 'Idle']) if (rig.clips.has(c2)) return c2; return [...rig.clips.keys()][0]; };
    loaded.set(name, rig);
    return rig;
  })());
  return rigs.get(name);
}
export const rigReady = name => loaded.get(name) ?? null;

/** The toon material, with the clothes tint for tinted rigs (instanced: per-instance attributes; skinned: uniforms). */
function castMaterial(tinted, uniforms = null) {
  if (!tinted) return toon();
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  m.onBeforeCompile = sh => {
    if (uniforms) Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aSlot;
#ifdef USE_INSTANCING
attribute vec3 iHair; attribute vec3 iTop; attribute vec3 iBottom;
#else
uniform vec3 uHair; uniform vec3 uTop; uniform vec3 uBottom;
#endif`).replace('#include <color_vertex>', `#include <color_vertex>
#ifdef USE_INSTANCING
  vec3 tH = iHair, tT = iTop, tB = iBottom;
#else
  vec3 tH = uHair, tT = uTop, tB = uBottom;
#endif
  vColor.rgb *= aSlot > 2.5 ? tB : aSlot > 1.5 ? tT : aSlot > 0.5 ? tH : vec3(1.0);`);
  };
  m.customProgramCacheKey = () => 'cast-tint';
  return m;
}
let crowdTint = null;

const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();

/**
 * The cast: subjects in, actors and instances out. One per world (castOf(world)).
 * A subject: { rig, x, z, y?, rot, scale?, clip, speed?, tint?, hidden?, lift?, bob?, pitch?, farHide?, skinnedOnly?,
 *   priority?, critter?, pose?(bones, t) }. The cast sets subject.actor while it is drawn skinned.
 */
export class Cast {
  constructor(world, { max = 8, radius = 25, triBudget = 60000, critters = 4 } = {}) {
    Object.assign(this, { world, max, radius, triBudget, maxCritters: critters, subjects: new Set(), actors: [], spare: new Map(), crowds: new Map() });
    Object.assign(this, { queue: [], loading: false, startAt: Infinity, frames: 0, clock: 1, mixerMs: 0, time: 0 });
    world.onFrame((dt, now) => this.frame(dt, now));
  }
  add(subject) { this.subjects.add(subject); this.want(subject.rig); return subject; }
  remove(subject) { if (subject.actor) this.release(subject.actor); this.subjects.delete(subject); }
  /** The first scene is up (the land is drawn): rigged models may start downloading a moment later. */
  arm(delay = 1500) { this.startAt = Math.min(this.startAt, performance.now() + delay); this.frames = 0; }
  want(name) { if (!rigReady(name) && !this.queue.includes(name) && RIGS[name]) this.queue.push(name); }
  /** Rigs download one at a time once the first scene has settled, in the order they were first wanted. */
  pump() {
    if (this.loading || !this.queue.length || performance.now() < this.startAt || this.frames < 10) return;
    const name = this.queue.shift(); this.loading = true;
    loadRig(name).catch(e => console.warn(`[cast] ${name}: ${e.message}`)).finally(() => { this.loading = false; });
  }
  /** Hide the whole cast (the budget check measures the scene with and without it). */
  setEnabled(on) { this.enabled = on; if (!on) for (const a of this.actors) if (a.subject) this.release(a); }
  frame(dt, now) {
    this.frames++; this.time += dt; this.pump();
    if (this.enabled === false) { for (const c of this.crowds.values()) { c.mesh.count = 0; c.mesh.visible = false; } return; }
    if ((this.clock += dt) > 0.2) { this.clock = 0; this.select(); }
    const t0 = performance.now();
    for (const a of this.actors) if (a.subject) this.drive(a, dt);
    this.mixerMs = this.mixerMs * 0.9 + (performance.now() - t0) * 0.1;
    this.drawCrowds();
  }
  /** Who gets an actor: the nearest subjects to the camera centre, within the radius, the count and the triangle budget. */
  select() {
    const cam = this.world.cam, close = cam.lod === 0, list = [];
    for (const s of this.subjects) {
      const rig = rigReady(s.rig); if (!rig || s.hidden || !close) continue;
      const d = Math.hypot(s.x - cam.x, s.z - cam.z), r = this.radius * (s.actor ? 1.15 : 1);   // hysteresis: leaving is wider than entering
      if (d < r) list.push([d - (s.actor ? 3 : 0) - (s.priority ?? 0), s, rig]);
    }
    list.sort((a, b) => a[0] - b[0]);
    const chosen = new Set(); let budget = this.triBudget, critters = 0;
    for (const [, s, rig] of list) {
      if (chosen.size >= this.max || rig.tris > budget || (s.critter && critters >= this.maxCritters)) continue;
      chosen.add(s); budget -= rig.tris; if (s.critter) critters++;
    }
    for (const a of this.actors) if (a.subject && !chosen.has(a.subject)) this.release(a);
    for (const s of chosen) if (!s.actor) this.assign(s);
  }
  assign(s) {
    const rig = rigReady(s.rig), spares = this.spare.get(s.rig) ?? [];
    let a = spares.pop();
    if (!a) {
      const root = cloneSkinned(rig.template); let mesh = null; root.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
      const uniforms = rig.def.tint ? { uHair: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() } } : null;
      mesh.material = castMaterial(!!rig.def.tint, uniforms); mesh.frustumCulled = false;
      const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
      a = { rig, root, mesh, uniforms, bones, mixer: new THREE.AnimationMixer(root), actions: new Map(), clip: null, current: null, once: null };
      a.mixer.addEventListener('finished', e => { if (a.once && e.action === a.once.action) a.once = null; });
      this.actors.push(a); this.world.scene.add(root);
    }
    a.subject = s; s.actor = a; a.root.visible = true; a.clip = null; a.once = null; a.current = null;
    a.mixer.stopAllAction();
    if (a.uniforms) for (const k of ['hair', 'top', 'bottom']) a.uniforms[`u${k[0].toUpperCase()}${k.slice(1)}`].value.set(s.tint?.[k] ?? rig.tint[k]);
    this.drive(a, 0, true);
  }
  release(a) {
    const s = a.subject; if (s) s.actor = null;
    a.subject = null; a.root.visible = false; a.mixer.stopAllAction(); a.once = null;
    (this.spare.get(a.rig.name) ?? this.spare.set(a.rig.name, []).get(a.rig.name)).push(a);
  }
  action(a, name) {
    if (!a.actions.has(name)) a.actions.set(name, a.mixer.clipAction(a.rig.clips.get(name)));
    return a.actions.get(name);
  }
  /** Follow the subject: place the actor, crossfade to the wanted clip, play one-shots, advance the mixer. */
  drive(a, dt, first = false) {
    const s = a.subject, rig = a.rig, k = rig.k * (s.scale ?? 1);
    a.root.position.set(s.x, (s.y ?? 0) + rig.lift * (s.scale ?? 1) + (s.lift ?? 0), s.z);
    a.root.rotation.set(s.tilt ?? 0, s.rot ?? 0, 0, 'YXZ'); a.root.scale.setScalar(k);
    if (s.once && s.once !== a.onceSeen) {   // a one-shot (Moo, Flap, Wave, Cheer): play it, then go back to the loop
      a.onceSeen = s.once; const name = rig.clipFor(s.once.clip), act = this.action(a, name);
      act.reset().setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.timeScale = 1; act.play();
      if (a.current && a.current !== act) a.current.crossFadeTo(act, 0.15, false);
      a.once = { action: act }; a.current = act; a.clip = null;
    }
    if (!a.once) {
      const name = rig.clipFor(s.clip ?? 'Idle');
      if (name !== a.clip) {
        const act = this.action(a, name);
        act.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).play();
        if (first) act.time = Math.random() * act.getClip().duration;   // herds do not move in step
        if (a.current && a.current !== act) a.current.crossFadeTo(act, first ? 0 : 0.25, false);
        a.current = act; a.clip = name;
      }
      if (a.current) a.current.timeScale = s.speed ?? 1;
    }
    a.mixer.update(dt);
    s.pose?.(a.bones, this.time);
  }
  /** Everyone without an actor, as instances of their rig's baked pose at the camera's level of detail. */
  drawCrowds() {
    const lod = this.world.cam.lod, count = new Map();
    for (const s of this.subjects) {
      if (s.actor || s.hidden || s.skinnedOnly || (lod === 2 && s.farHide)) continue;
      const rig = rigReady(s.rig); if (!rig) continue;
      const c = this.crowd(rig, lod, (count.get(rig) ?? 0) + 1); if (!c) continue;
      const i = count.get(rig) ?? 0; count.set(rig, i + 1);
      const k = (s.scale ?? 1) * (lod === 2 ? rig.standin : 1);
      eu.set((s.pitch ?? 0) + (s.tilt ?? 0), s.rot ?? 0, 0);
      c.mesh.setMatrixAt(i, m4.compose(v3.set(s.x, (s.y ?? 0) + (s.lift ?? 0) + (s.bob ?? 0), s.z), qt.setFromEuler(eu), s3.set(k, k, k)));
      if (c.tints) for (const [slot, attr] of c.tints) { const col = s.tint?.[slot] ?? rig.tint[slot]; tc.set(col); attr.setXYZ(i, tc.r, tc.g, tc.b); }
    }
    for (const [key, c] of this.crowds) {
      const n = c.lod === lod ? count.get(c.rig) ?? 0 : 0;
      c.mesh.count = n; c.mesh.visible = n > 0;
      if (n) { c.mesh.instanceMatrix.needsUpdate = true; if (c.tints) for (const [, attr] of c.tints) attr.needsUpdate = true; }
    }
  }
  crowd(rig, lod, need) {
    const key = `${rig.name}|${lod}`, old = this.crowds.get(key);
    if (old && old.cap >= need) return old;
    if (lod === 2 && rig.def.tint) return null;
    const cap = Math.max(8, Math.ceil(need * 1.5)), tinted = !!rig.def.tint && lod < 2;
    const geo = lod === 0 ? rig.near : lod === 1 ? rig.mid : STANDINS.animal;
    const mat = tinted ? (crowdTint ??= castMaterial(true)) : toon();
    if (old) { this.world.scene.remove(old.mesh); old.mesh.dispose(); }
    const g = tinted ? geo.clone() : geo, mesh = new THREE.InstancedMesh(g, mat, cap);
    mesh.count = 0; mesh.frustumCulled = false; mesh.userData.cast = key;
    let tints = null;
    if (tinted) tints = ['hair', 'top', 'bottom'].map(slot => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); g.setAttribute(`i${slot[0].toUpperCase()}${slot.slice(1)}`, a); return [slot, a]; });
    if (lod === 2) for (let i = 0; i < cap; i++) mesh.setColorAt(i, rig.color);
    this.world.scene.add(mesh);
    const c = { rig, lod, cap, mesh, tints }; this.crowds.set(key, c);
    return c;
  }
  /** For tests and the budget check. */
  stats() {
    const active = this.actors.filter(a => a.subject);
    return { actors: active.length, spare: this.actors.length - active.length, tris: active.reduce((n, a) => n + a.rig.tris, 0), mixerMs: +this.mixerMs.toFixed(3),
      rigs: [...loaded.keys()], lodTris: Object.fromEntries([...loaded].map(([k, r]) => [k, [r.tris, tris(r.near), tris(r.mid)]])), loadMs: Object.fromEntries([...loaded].map(([k, r]) => [k, r.ms])), queue: [...this.queue], subjects: this.subjects.size, clips: active.map(a => `${a.rig.name}:${a.once ? 'once' : a.clip}`) };
  }
}
const tc = new THREE.Color();
/** The world's cast (made on first use). */
export const castOf = world => (world.cast ??= new Cast(world));
