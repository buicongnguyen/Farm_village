// Day and night follow the player's own clock (DESIGN 3.3), or stay daytime (Settings). Night has a very dark blue sky
// (#0b1530) that the far land and the fog melt into, black-blue water, a deep-blue hemisphere light and cool moonlight,
// never darker than the ground stays readable; windows glow warm and lamps throw pools of light. Dawn and dusk are warm.
// The light is applied at once on load, when a setting changes and when the clock jumps, then follows the clock.
import * as THREE from 'three';
import { CELL, FARMHOUSE } from '../content/world.mjs';
import { footprint, BUILDINGS } from '../content/buildings.mjs';
import * as KINDS from './kinds.mjs';
import { NIGHT } from '../kit/toon.mjs';

const KEYS = [   // hour → sky, hemisphere (sky, ground, intensity), sun or moon (colour, intensity)
  [0, '#0b1530', '#4f6ad8', '#26306a', 1.1, '#9fb2ff', 0.8],
  [4.5, '#0b1530', '#4f6ad8', '#26306a', 1.1, '#9fb2ff', 0.8],
  [5.5, '#2a3a6e', '#8a90c8', '#4a4058', 1.15, '#ffb07a', 0.95],
  [7, '#ffd2a1', '#fff0d0', '#7a9a5a', 1.35, '#ffd29a', 2.0],
  [10, '#9fd3f0', '#fff6e0', '#7a9a5a', 1.5, '#fff1d6', 2.4],
  [16, '#9fd3f0', '#fff6e0', '#7a9a5a', 1.5, '#fff1d6', 2.4],
  [18.5, '#ffb37a', '#ffd9b0', '#7a6a50', 1.25, '#ff9a5a', 1.7],
  [20, '#1d2a5a', '#6a78c0', '#2c2f4a', 1.1, '#9fa8e0', 0.85],
  [21.5, '#0b1530', '#4f6ad8', '#26306a', 1.1, '#9fb2ff', 0.8],
  [24, '#0b1530', '#4f6ad8', '#26306a', 1.1, '#9fb2ff', 0.8],
];
const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
/** How much of night it is at an hour: 0 by day, 1 in the dark hours (smooth through dusk and dawn). */
export const nightAt = hour => { const h = ((hour % 24) + 24) % 24; return h < 4.5 || h >= 21.5 ? 1 : h < 6.5 ? 1 - (h - 4.5) / 2 : h >= 18.5 ? (h - 18.5) / 3 : 0; };
export function lightAt(hour) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= hour) i++;
  const a = KEYS[i], b = KEYS[i + 1], k = (hour - a[0]) / (b[0] - a[0]);
  const sky = mix(a[1], b[1], k), n = nightAt(hour);
  // the far haze: the sky by night, a lighter, greener mix of it by day
  const haze = sky.clone().lerp(new THREE.Color('#d8eef0'), 0.28 * (1 - n));
  return { sky, haze, hemiSky: mix(a[2], b[2], k), hemiGround: mix(a[3], b[3], k), hemi: a[4] + (b[4] - a[4]) * k, sun: mix(a[5], b[5], k), sunI: a[6] + (b[6] - a[6]) * k, nightness: n, night: hour < 5.5 || hour > 19.5 };
}

// ── Glows: warm windows and lamp bulbs (camera-facing sprites) and the pools of light under them (flat on the ground) ──
const GLOW_VERT = /* glsl */`
attribute vec4 iGlow;    // x, y, z, size
attribute vec3 iTint;
attribute vec2 iFace;    // a window's outward facing (x, z), or 0 for a light seen from every side
uniform float uFlat; varying vec2 vUv; varying vec3 vTint;
void main(){
  vUv = position.xy; vTint = iTint;
  // a window on the far side of a house is not lit through its roof: fade it out as it turns away from the camera
  if (dot(iFace, iFace) > 0.0) vTint *= smoothstep(0.02, 0.25, (viewMatrix * vec4(iFace.x, 0.0, iFace.y, 0.0)).z);
  vec4 c = viewMatrix * vec4(iGlow.xyz, 1.0);
  if (uFlat > 0.5) { gl_Position = projectionMatrix * viewMatrix * vec4(iGlow.x + position.x * iGlow.w, iGlow.y, iGlow.z + position.y * iGlow.w, 1.0); }
  else { c.xy += position.xy * iGlow.w; c.z += 2.0; gl_Position = projectionMatrix * c; }
}`;
const GLOW_FRAG = /* glsl */`
uniform float uK; varying vec2 vUv; varying vec3 vTint;
void main(){
  float d = length(vUv);
  float a = (1.0 - smoothstep(0.0, 1.0, d)); a *= a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vTint * a * uK, 1.0);
}`;
class Glows {
  constructor(world, flat, max = 160) {
    const g = new THREE.PlaneGeometry(2, 2);
    this.attr = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.tint = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.face = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
    g.setAttribute('iGlow', this.attr); g.setAttribute('iTint', this.tint); g.setAttribute('iFace', this.face);
    this.uniforms = { uK: { value: 0 }, uFlat: { value: flat ? 1 : 0 } };
    const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, m, max); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.mesh.name = flat ? 'light-pools' : 'glows'; this.mesh.renderOrder = flat ? 2 : 4; this.max = max;
    world.scene.add(this.mesh);
  }
  set(list) {
    const n = Math.min(this.max, list.length);
    for (let i = 0; i < n; i++) { const [x, y, z, s, c, nx = 0, nz = 0] = list[i]; this.attr.setXYZW(i, x, y, z, s); this.tint.setXYZ(i, c.r, c.g, c.b); this.face.setXY(i, nx, nz); }
    this.mesh.count = n; this.attr.needsUpdate = true; this.tint.needsUpdate = true; this.face.needsUpdate = true;
  }
}
// farm buildings whose windows glow too (their doors get no porch light: only homes have one)
const LIT = new Set(['feed_mill', 'bakery', 'coop', 'cow_barn']);
const WARM = new THREE.Color('#ffb84a'), WINDOW = new THREE.Color('#ffc65a'), POOL = new THREE.Color('#ff9d3a');

export class Daylight {
  constructor(world, game) {
    Object.assign(this, { world, game, bucket: null });
    world.daylight = this;
    this.bulbs = new Glows(world, false); this.pools = new Glows(world, true);
    world.onFrame(() => {
      // follow the clock: re-light whenever the game minute changes (also catches clock jumps at once)
      const b = Math.floor(this.game.now / 30000) + (this.game.s.settings.daylight === 'always' ? 0.5 : 0);
      if (b !== this.bucket) { this.bucket = b; this.apply(); }
    });
    game.on(r => {
      const ev = r.events ?? [];
      if (ev.some(e => e.type === 'settingChanged' || e.type === 'loaded')) this.apply();
      if (ev.some(e => ['placed', 'moved', 'stored', 'loaded', 'familyArrived', 'projectDone'].includes(e.type))) this.placeGlows();
    });
    world.onLampsChanged = () => this.placeGlows();
    this.placeGlows();
    this.apply();
  }
  hour() {
    if (this.game.s.settings.daylight === 'always') return 12;
    const d = new Date(this.game.now); return d.getHours() + d.getMinutes() / 60;
  }
  apply() {
    const L = lightAt(this.hour()), { hemi, sun } = this.world.lights, w = this.world;
    w.scene.background.copy(L.sky); hemi.color.copy(L.hemiSky); hemi.groundColor.copy(L.hemiGround); hemi.intensity = L.hemi;
    sun.color.copy(L.sun); sun.intensity = L.sunI;
    w.scene.fog?.color.copy(L.haze);
    w.backdrop?.setHaze(L.haze);
    w.brook?.setNight(L.nightness);
    w.sky?.setNight(L.nightness);
    NIGHT.uMoon.value = L.nightness;
    const k = Math.max(0, (L.nightness - 0.15) / 0.85);
    this.bulbs.uniforms.uK.value = k * 1.1; this.pools.uniforms.uK.value = k * 0.55;
    this.bulbs.mesh.visible = this.pools.mesh.visible = k > 0.01;
    this.lightness = L; this.nightness = L.nightness;
    document.body.classList.toggle('night', L.night);
  }
  /** Windows on the farmhouse, every cottage and the farm buildings (the art kit's window and door anchors), lamps placed
   *  by the player (their bulb anchor) and the village's own lamp posts. */
  placeGlows() {
    const bulbs = [], pools = [], s = this.game.s, b = this.world.batches;
    // item: the batch item when it is drawn ({ model, x, z, rot }), else a stand-in with the footprint centre
    const windows = (item, w, d, door = true) => {
      const wins = KINDS.anchorPoints(item.model, 'window', item), c = Math.cos(item.rot), sn = Math.sin(item.rot);
      const at = (lx, ly, lz) => [item.x + lx * c + lz * sn, ly, item.z - lx * sn + lz * c];
      if (wins.length) for (const p of wins) bulbs.push([p.x + p.nx * 0.08, p.y, p.z + p.nz * 0.08, 0.55, WINDOW, p.nx, p.nz]);
      else for (const lx of [-w * 0.24, w * 0.24]) bulbs.push([...at(lx, 1.5, d / 2 + 0.08), 0.6, WINDOW, sn, c]);   // no anchors: two windows beside the door
      if (!door) return;
      const [dp] = KINDS.anchorPoints(item.model, 'door', item), fx = sn, fz = c;   // the front faces +z, turned by rot
      if (dp) { pools.push([dp.x + fx * 0.9, 0.13, dp.z + fz * 0.9, 2.4, POOL]); bulbs.push([dp.x + fx * 0.15, Math.max(1.05, dp.y + 1), dp.z + fz * 0.15, 0.5, WARM, fx, fz]); }
      else { pools.push([...at(0, 0.13, d / 2 + 1.5), 2.4, POOL]); bulbs.push([...at(0, 1.05, d / 2 + 0.12), 0.5, WARM, sn, c]); }
    };
    const fh = b.items.get('farmhouse') ?? { model: 'farmhouse', x: (FARMHOUSE.x + 0.5) * CELL, z: (FARMHOUSE.z + 0.5) * CELL, rot: Math.PI / 2 };
    windows({ ...fh, model: 'farmhouse' }, FARMHOUSE.width, FARMHOUSE.width * 0.9);
    const lampTop = KINDS.ANCHORS.lamp?.light?.[0]?.[1] ?? 2.3;
    for (const [id, p] of Object.entries(s.placed)) {
      const def = BUILDINGS[p.kind], lit = p.kind === 'cottage' || LIT.has(p.kind);
      if (!lit && p.kind !== 'lamp' && p.kind !== 'street_lamp') continue;
      const [fw, fd] = def?.size ? footprint(p.kind, p.rot) : [0, 0];
      const cx = (p.x + fw / 2) * CELL, cz = (p.z + fd / 2) * CELL, rot = p.rot * Math.PI / 2;
      if (lit) { const it = b.items.get(id), model = it?.model?.replace(/~$/, '') ?? KINDS.modelFor(p.kind, id); windows({ model, x: it?.x ?? cx, z: it?.z ?? cz, rot: it?.rot ?? rot }, fw * CELL * 0.9, fd * CELL * 0.9, p.kind === 'cottage'); }
      else if (p.kind === 'lamp') { bulbs.push([cx, lampTop, cz, 0.75, WARM]); pools.push([cx, 0.13, cz, 3.6, POOL]); }
      else { bulbs.push([cx, 2.85, cz, 0.8, WARM]); pools.push([cx, 0.13, cz, 4, POOL]); }   // street lamp (props kit, 3 m tall)
    }
    for (const l of this.world.lamps ?? []) if (b.items.has(l.id)) { bulbs.push([l.x, l.y, l.z, 0.75, WARM]); pools.push([l.x, 0.13, l.z, 3.6, POOL]); }
    this.bulbs.set(bulbs); this.pools.set(pools);
    this.glowCount = { bulbs: bulbs.length, pools: pools.length };
  }
}
