// Chunked instancing with three levels of detail (TECH-PLAN 6, measured in prototypes/big-farm):
//   close  → full models,        8 × 8 cell chunks  (tight culling where triangles matter)
//   middle → simplified models, 16 × 16 cell chunks
//   far    → coloured stand-ins, 32 × 32 cell chunks (few draws when everything is on screen)
// Static models (buildings, fences) keep full detail at every zoom, in 16 × 16 chunks.
// Items are set and removed by id; only the batches they touch are rebuilt, once per frame in flush().
//
// Game feel lives here too, because it is cheapest where the instances are:
//   - crops and trees draw with the swaying toon material (kit/toon.mjs) at the close and middle levels;
//   - set() on an existing item that changes its model or scale eases it over 0.3 s (crops grow in by themselves);
//     an item whose chunk does not change is rewritten in place, with no rebuild;
//   - pulse(id) bounces or squishes one item, popCopy(id) leaves a copy that swells and vanishes, patch(id) turns
//     parts such as mill sails; all write single instance matrices;
//   - ContactShadows: one soft blob under every building, tree and plant, in two instanced draws for the whole map.
import * as THREE from 'three';
import { toon } from '../kit/toon.mjs';
import { CELL } from '../content/world.mjs';

export const CHUNKS = { near: 8, mid: 16, far: 64, static: 16, staticFar: 64 };
const LEVELS = ['near', 'mid', 'far'];
const white = g => { g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); return g; };
export const STANDINS = {
  crop: white(new THREE.ConeGeometry(0.55, 0.8, 5).translate(0, 0.4, 0)),
  tree: white(new THREE.IcosahedronGeometry(1, 0).scale(1, 1.3, 1).translate(0, 1.3, 0)),
  animal: white(new THREE.BoxGeometry(0.8, 0.7, 1.1).translate(0, 0.35, 0)),
};
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(0, 0, 1), side = new THREE.Vector3(1, 0, 0), v = new THREE.Vector3(), s3 = new THREE.Vector3();
const clamp01 = k => Math.min(1, Math.max(0, k));
const easeOut = k => 1 - (1 - k) * (1 - k), easeInOut = k => k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
const easeBack = k => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const MAX_ANIMS = 500;           // a whole-farm reload changes thousands of crops at once: past this they just snap
const NO_SHADOW = /^(sparkle|produce:|fence|gate|tuft|weeds$|pop:|village_bunting|bunting|plot_stakes|survey_stakes|quay_bollard)/;   // flags on strings and plot stakes cast no blob

/** Scale multipliers [xz, y] of an animation at time `now`, and whether it has finished. */
function animScale(a, now) {
  const k = clamp01((now - a.t0) / a.ms);
  let m;
  if (a.type === 'grow') m = a.from + (1 - a.from) * easeBack(k);
  else if (a.type === 'pop') m = k < 0.35 ? 1 + 0.3 * easeOut(k / 0.35) : 1.3 * (1 - easeInOut((k - 0.35) / 0.65));
  else m = k < 0.4 ? a.from + (a.to - a.from) * easeOut(k / 0.4) : a.to + (1 - a.to) * easeInOut((k - 0.4) / 0.6);
  if (a.squash) { const y = m, xz = 1 / Math.sqrt(Math.max(0.2, m)); return [xz, y, k >= 1]; }
  return [m, m, k >= 1];
}

/** The soft blob material: a round or rounded-box falloff drawn in the shader, faded by fog. */
export function shadowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uColor: { value: new THREE.Color('#1f2f16') } },
    vertexShader: `attribute vec2 aShade; varying vec2 vUv; varying vec2 vShade;
      #include <fog_pars_vertex>
      void main() { vUv = uv * 2.0 - 1.0; vShade = aShade;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying vec2 vShade;
      #include <fog_pars_fragment>
      void main() {
        float d = vShade.x > 0.5 ? length(max(abs(vUv) - vec2(0.62), 0.0)) / 0.38 : length(vUv);
        float a = 1.0 - smoothstep(0.15, 1.0, d); a *= a * vShade.y;
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            a *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
          #endif
        #endif
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}
const BLOB = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
/** One instanced layer of blobs with stable slots (a free list, so a change uploads one matrix, not the whole layer). */
export class ShadowLayer {
  constructor(scene, material, cap = 1024) {
    Object.assign(this, { scene, material, slots: new Map(), free: [], high: 0, touched: new Set(), full: true });
    this.make(cap);
  }
  make(cap) {
    const old = this.mesh, mesh = new THREE.InstancedMesh(BLOB, this.material, cap);
    const shade = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2); shade.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry = BLOB.clone(); mesh.geometry.setAttribute('aShade', shade);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (old) { mesh.instanceMatrix.array.set(old.instanceMatrix.array); shade.array.set(old.geometry.attributes.aShade.array); this.scene.remove(old); old.geometry.dispose(); old.dispose(); }
    else for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, m4.makeScale(0, 0, 0));
    if (old) for (let i = old.count; i < cap; i++) mesh.setMatrixAt(i, m4.makeScale(0, 0, 0));
    mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.count = this.high; mesh.userData.shadows = true;
    this.scene.add(mesh); this.mesh = mesh; this.full = true;
  }
  put(id, x, z, sx, sz, rot, shape, alpha) {
    let i = this.slots.get(id);
    if (i == null) {
      i = this.free.length ? this.free.pop() : this.high++;
      if (i >= this.mesh.instanceMatrix.count) this.make(this.mesh.instanceMatrix.count * 2);
      this.slots.set(id, i);
    }
    this.mesh.setMatrixAt(i, m4.compose(v.set(x, 0.035, z), q.setFromAxisAngle(up, rot), s3.set(sx, 1, sz)));
    const a = this.mesh.geometry.attributes.aShade.array; a[i * 2] = shape; a[i * 2 + 1] = alpha;
    this.touched.add(i);
  }
  drop(id) {
    const i = this.slots.get(id); if (i == null) return;
    this.slots.delete(id); this.mesh.setMatrixAt(i, m4.makeScale(0, 0, 0)); this.touched.add(i);
    if (i === this.high - 1) this.high--; else this.free.push(i);
  }
  /** Upload what changed: single slots while few changed, otherwise the whole layer. */
  flush() {
    if (!this.touched.size && !this.full) return;
    const im = this.mesh.instanceMatrix, sh = this.mesh.geometry.attributes.aShade;
    im.clearUpdateRanges(); sh.clearUpdateRanges();
    if (!this.full && this.touched.size <= 48) for (const i of this.touched) { im.addUpdateRange(i * 16, 16); sh.addUpdateRange(i * 2, 2); }
    im.needsUpdate = sh.needsUpdate = true;
    this.touched.clear(); this.full = false;
    this.mesh.count = this.high;
  }
}

export class Batches {
  constructor(scene) {
    Object.assign(this, { scene, models: new Map(), items: new Map(), members: new Map(), meshes: new Map(), dirty: new Set(), level: 0 });
    this.material = toon();
    this.swayMaterial = toon({ sway: true });
    this.anims = new Map(); this.quiet = false; this.now = 0; this.popSeq = 0; this.changed = new Set();
    const mat = shadowMaterial();
    this.shadowMaterial = mat;
    this.shadows = { big: new ShadowLayer(scene, mat, 2048), small: new ShadowLayer(scene, mat, 4096) };
  }
  /** kind: 'crop' | 'tree' | 'animal' (three levels) or 'static' (always full). */
  register(name, { geo, mid = geo, kind = 'static', color = new THREE.Color(1, 1, 1) }) {
    const size = geo.boundingBox.getSize(new THREE.Vector3());
    const sway = (kind === 'crop' || kind === 'tree') && !/rock/.test(name);
    this.models.set(name, { geo, mid, kind, color, sway, standinScale: kind === 'tree' ? size.y / 2.6 : Math.max(size.x, size.z) / 1.1, shadow: this.shadowSpec(name, kind, size) });
  }
  /** Replace a registered model's geometry (a better kit arrived after the first scene): its batches are rebuilt with the
   *  new look on the next flush, and its items' contact shadows follow the new size. */
  swap(name, spec) {
    if (!this.models.has(name)) return this.register(name, spec);
    this.register(name, spec);
    for (const [key, mesh] of this.meshes) if (key.endsWith(`|${name}`)) { this.scene.remove(mesh); mesh.dispose(); this.meshes.delete(key); this.dirty.add(key); }
    for (const [id, it] of this.items) if (it.model === name) this.shadowFor(id, it);
  }
  /** How the blob under a model looks: layer, shape (0 round, 1 rounded box), size and darkness. */
  shadowSpec(name, kind, size) {
    if (NO_SHADOW.test(name) || kind === 'animal') return null;
    if (kind === 'static') {
      const box = Math.min(size.x, size.z) > 1.6;
      return box ? { layer: 'big', shape: 1, sx: size.x * 1.12 + 0.5, sz: size.z * 1.12 + 0.5, alpha: 0.5, lift: Math.min(0.5, size.y * 0.06) }
        : { layer: 'big', shape: 0, sx: Math.max(size.x, size.z) * 1.5 + 0.3, sz: Math.max(size.x, size.z) * 1.5 + 0.3, alpha: 0.42, lift: 0.1 };
    }
    if (kind === 'tree') { const r = Math.max(size.x, size.z) * 0.95; return { layer: 'big', shape: 0, sx: r, sz: r, alpha: 0.45, lift: Math.min(0.6, size.y * 0.08) }; }
    const r = Math.max(size.x, size.z) * 1.05 + 0.15;
    return { layer: 'small', shape: 0, sx: r, sz: r, alpha: name.startsWith('crop:') ? 0.5 : 0.34, lift: 0.04 };
  }
  has(name) { return this.models.has(name); }
  keysFor(item) {
    const m = this.models.get(item.model), cx = item.x / CELL, cz = item.z / CELL;
    const key = (level, size, what) => `${level}|${Math.floor(cx / size)},${Math.floor(cz / size)}|${what}`;
    // Buildings keep their authored shape; wider batches cut duplicate draws at valley zoom.
    if (m.kind === 'static') return [key('static', CHUNKS.static, item.model), key('staticFar', CHUNKS.staticFar, item.model)];
    return [key('near', CHUNKS.near, item.model), key('mid', CHUNKS.mid, item.model), key('far', CHUNKS.far, m.kind)];
  }
  /** Place or move an item: { model, x, z (metres), rot, scale, y, roll }. A changed model or scale eases in. */
  set(id, item) {
    if (!this.models.has(item.model)) throw new Error(`unknown model ${item.model}`);
    const old = this.items.get(id), keys = this.keysFor(item);
    if (old && !this.quiet && this.anims.size < MAX_ANIMS && old.x === item.x && old.z === item.z && (old.model !== item.model || (old.scale ?? 1) !== (item.scale ?? 1))) {
      const shown = (old.scale ?? 1) * (this.anims.has(id) ? animScale(this.anims.get(id), performance.now())[1] : 1);
      this.anims.set(id, { type: 'grow', t0: performance.now(), ms: 300, from: old.model !== item.model ? 0.5 : clamp01(shown / (item.scale ?? 1)) });
    }
    if (old && old.keys.length === keys.length && old.keys.every((k, i) => k === keys[i])) {
      // same chunks: rewrite the instance in place
      Object.assign(old, { rot: undefined, scale: undefined, y: undefined, roll: undefined, rollAxis: undefined }, item, { keys });
      this.write(id); this.shadowFor(id, old);
      return;
    }
    this.remove(id, true);
    const it = { ...item, keys }; this.items.set(id, it);
    for (const k of keys) { (this.members.get(k) ?? this.members.set(k, new Set()).get(k)).add(id); this.dirty.add(k); }
    this.shadowFor(id, it);
  }
  remove(id, keepAnim = false) {
    const old = this.items.get(id); if (!old) return;
    for (const k of old.keys) { this.members.get(k)?.delete(id); this.dirty.add(k); }
    this.items.delete(id);
    if (!keepAnim) this.anims.delete(id);
    for (const l of Object.values(this.shadows)) l.drop(id);
  }
  clear() { for (const id of [...this.items.keys()]) this.remove(id); }
  /** Bounce an item: its scale goes from → to → 1 over ms (squash: height only, keeping its volume). */
  pulse(id, { from = 0.6, to = 1.1, ms = 380, squash = false } = {}) {
    if (!this.items.has(id) || this.quiet) return false;
    this.anims.set(id, { type: 'pulse', t0: performance.now(), ms, from, to, squash });
    return true;
  }
  /** A transient copy of an item that swells to 1.3 and shrinks away in `ms`, then removes itself. Returns its id. */
  popCopy(id, ms = 250) {
    const it = this.items.get(id); if (!it || this.quiet) return null;
    const pid = `pop:${this.popSeq++ % 64}`;
    this.remove(pid);
    this.set(pid, { model: it.model, x: it.x, z: it.z, rot: it.rot, scale: it.scale, y: it.y });
    this.anims.set(pid, { type: 'pop', t0: performance.now(), ms, transient: true });
    return pid;
  }
  /** Change how an item is drawn without moving it between chunks (rot, roll, y), written in place. */
  patch(id, fields) {
    const it = this.items.get(id); if (!it) return;
    Object.assign(it, fields); this.write(id);
  }
  shadowFor(id, it) {
    const spec = this.models.get(it.model).shadow;
    for (const [name, l] of Object.entries(this.shadows)) if (!spec || name !== spec.layer) l.drop(id);
    if (!spec || it.y > 0.5 || id.startsWith('pop:')) return;
    const k = it.scale ?? 1, lx = spec.lift * k;
    this.shadows[spec.layer].put(id, it.x + lx * 0.6, it.z - lx * 0.45, spec.sx * k, spec.sz * k, spec.shape ? it.rot ?? 0 : 0, spec.shape, spec.alpha);
  }
  setLevel(level) {
    if (level === this.level) return; this.level = level;
    for (const [k, mesh] of this.meshes) mesh.visible = this.visibleFor(k);
    this.shadows.small.mesh.visible = level < 2;
  }
  visibleFor(key) { const lvl = key.slice(0, key.indexOf('|')); return lvl === 'static' ? this.level < 2 : lvl === 'staticFar' ? this.level === 2 : lvl === LEVELS[this.level]; }
  /** The instance matrix of an item in a batch of `level`. */
  compose(it, level, out = m4) {
    const m = this.models.get(it.model), far = level === 'far', a = this.anims.get(it.id);
    const k = (it.scale ?? 1) * (far ? m.standinScale : 1);
    let sx = k, sy = k;
    if (a) { const [mx, my] = animScale(a, this.now); sx *= mx; sy *= my; }
    q.setFromAxisAngle(up, it.rot ?? 0); if (it.roll) q.multiply(qr.setFromAxisAngle(it.rollAxis === 'x' ? side : fwd, it.roll));
    return out.compose(v.set(it.x, it.y ?? 0, it.z), q, s3.set(sx, sy, sx));
  }
  /** Rewrite one item's instances in place (unless its batch is rebuilt this frame anyway). */
  write(id) {
    const it = this.items.get(id); if (!it?.slots) return;
    it.id = id;
    for (const key of it.keys) {
      if (this.dirty.has(key)) continue;
      const mesh = this.meshes.get(key), i = it.slots[key];
      if (!mesh || i == null || mesh.userData.ids[i] !== id) continue;
      mesh.setMatrixAt(i, this.compose(it, key.slice(0, key.indexOf('|'))));
      this.changed.add(mesh);
    }
  }
  /** Rebuild the batches that changed since the last call and step the animations. Returns how many were rebuilt. */
  flush() {
    let n = 0;
    this.now = performance.now();
    for (const key of this.dirty) { this.rebuild(key); n++; }
    this.dirty.clear();
    for (const [id, a] of this.anims) {
      if (!this.items.has(id)) { this.anims.delete(id); continue; }
      const done = animScale(a, this.now)[2];
      if (done) { this.anims.delete(id); if (a.transient) { this.remove(id); continue; } }
      this.write(id);
    }
    for (const mesh of this.changed) mesh.instanceMatrix.needsUpdate = true;
    this.changed.clear();
    for (const l of Object.values(this.shadows)) l.flush();
    return n;
  }
  rebuild(key) {
    const ids = [...(this.members.get(key) ?? [])], [level, , what] = key.split('|'), old = this.meshes.get(key);
    if (!ids.length) { if (old) { this.scene.remove(old); old.dispose(); this.meshes.delete(key); } return; }
    const far = level === 'far', model = far ? null : this.models.get(what), geo = far ? STANDINS[what] : level === 'mid' ? model.mid : model.geo;
    const material = !far && model.sway ? this.swayMaterial : this.material;
    let mesh = old;
    if (!mesh || mesh.instanceMatrix.count < ids.length) {
      if (old) { this.scene.remove(old); old.dispose(); }
      mesh = new THREE.InstancedMesh(geo, material, Math.ceil(ids.length * 1.25) + 4);
      mesh.userData.batch = key; this.scene.add(mesh); this.meshes.set(key, mesh);
    }
    mesh.userData.ids = ids;
    ids.forEach((id, i) => {
      const it = this.items.get(id), m = this.models.get(it.model);
      it.id = id; (it.slots ??= {})[key] = i;
      mesh.setMatrixAt(i, this.compose(it, level));
      if (far) mesh.setColorAt(i, m.color);
    });
    mesh.count = ids.length; mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere(); mesh.visible = this.visibleFor(key);
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 0.6;      // room for sway and bounces
  }
  /** Draw statistics for tests. */
  stats() { let batches = 0, instances = 0; for (const m of this.meshes.values()) { batches++; instances += m.count; } return { batches, instances, items: this.items.size, anims: this.anims.size, shadows: this.shadows.big.slots.size + this.shadows.small.slots.size }; }
}
