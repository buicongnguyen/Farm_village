// Sky life (world package): the "the world breathes" layer. Every family is one draw and moves in its vertex shader, so
// the CPU only writes a handful of numbers now and then.
//   clouds    6–10 puffs drifting high over the map with soft shadows sliding over the ground (shadows always; the puffs
//             fade in as the camera zooms out, so they never hide the farm while you work)
//   birds     a flock of 5–8 that crosses the view every 30–60 s, flapping and gliding
//   flutter   up to 40 butterflies and bees looping round flowers and crops near the camera (by day)
//   night     fireflies over the pond, the brook and the woods, and stars twinkling in the far haze
// setNight(k) (0 day .. 1 night) comes from daylight.mjs; reduced motion slows the clouds to a calm drift and rests the
// birds and butterflies.
import * as THREE from 'three';
import { CELL, POND } from '../content/world.mjs';
import { MAP } from './backdrop.mjs';
import { brookCentre } from './brook.mjs';

let seed = 333; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const SUN = new THREE.Vector3(-40, 80, 30).normalize();
const CLOUD_Y = 26, WIND = new THREE.Vector2(1.6, 0.7);   // metres per second
const WRAP = MAP + 240;                                    // clouds drift across a tile a little larger than the map

const DRIFT_GLSL = /* glsl */`
vec2 drift(vec2 base, float t){ vec2 p = base + vec2(${WIND.x.toFixed(2)}, ${WIND.y.toFixed(2)}) * t; return mod(p + 120.0, ${WRAP.toFixed(1)}) - 120.0; }`;

function cloudShadows(count, bases) {
  const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  g.setAttribute('iCloud', new THREE.InstancedBufferAttribute(bases, 4));   // base x, z, size, seed
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 0.2 }, uShift: { value: new THREE.Vector2(-SUN.x / SUN.y * CLOUD_Y, -SUN.z / SUN.y * CLOUD_Y) } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
attribute vec4 iCloud; uniform float uTime; uniform vec2 uShift; varying vec2 vUv; varying float vSeed;
${DRIFT_GLSL}
void main(){
  vUv = position.xz * 2.0; vSeed = iCloud.w;
  vec2 c = drift(iCloud.xy, uTime) + uShift;
  vec3 p = vec3(c.x + position.x * iCloud.z * 1.6, 0.11, c.y + position.z * iCloud.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: /* glsl */`
uniform float uOpacity; varying vec2 vUv; varying float vSeed;
void main(){
  // three soft lobes make a cloud-shaped shadow
  float a = 0.0;
  a = max(a, 1.0 - smoothstep(0.25, 0.62, length(vUv - vec2(-0.35, 0.05))));
  a = max(a, 1.0 - smoothstep(0.3, 0.7, length(vUv - vec2(0.15, -0.08))));
  a = max(a, 1.0 - smoothstep(0.2, 0.5, length(vUv - vec2(0.55, 0.12 * sin(vSeed * 7.0)))));
  if (a < 0.01) discard;
  gl_FragColor = vec4(0.05, 0.12, 0.2, a * uOpacity);
}`,
  });
  const mesh = new THREE.InstancedMesh(g, material, count); mesh.frustumCulled = false; mesh.name = 'cloud-shadows'; mesh.renderOrder = 1;
  return { mesh, uniforms };
}

function cloudPuffs(count, bases) {
  // one puff: five squashed low-poly balls, white with a soft lilac underside
  const parts = [], ico = new THREE.IcosahedronGeometry(1, 1);
  for (const [x, y, z, s] of [[0, 0, 0, 1.3], [1.4, -0.2, 0.2, 1], [-1.5, -0.25, -0.1, 0.95], [0.5, 0.45, -0.4, 0.9], [-0.6, 0.35, 0.5, 0.85]]) parts.push(ico.clone().scale(s * 1.3, s * 0.85, s).translate(x * 1.3, y, z));
  const g = new THREE.BufferGeometry(); let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o); nor.set(p.attributes.normal.array, o); o += p.attributes.position.count * 3; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('iCloud', new THREE.InstancedBufferAttribute(bases, 4));
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uNight: { value: 0 }, uSun: { value: SUN.clone() } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true,
    vertexShader: /* glsl */`
attribute vec4 iCloud; uniform float uTime; uniform vec3 uSun; varying float vLight;
${DRIFT_GLSL}
void main(){
  vec2 c = drift(iCloud.xy, uTime);
  float s = iCloud.z * 0.32;
  vec3 p = vec3(c.x, ${CLOUD_Y.toFixed(1)} + sin(uTime * 0.2 + iCloud.w * 6.0) * 0.4, c.y) + position * vec3(s * 1.2, s * 0.8, s);
  vLight = 0.72 + 0.28 * max(dot(normal, uSun), 0.0) + 0.1 * normal.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: /* glsl */`
uniform float uOpacity, uNight; varying float vLight;
void main(){
  vec3 day = mix(vec3(0.78, 0.8, 0.95), vec3(1.0), smoothstep(0.75, 1.0, vLight));
  vec3 night = mix(vec3(0.1, 0.13, 0.25), vec3(0.22, 0.27, 0.45), smoothstep(0.75, 1.0, vLight));
  gl_FragColor = vec4(mix(day, night, uNight), uOpacity);
  #include <colorspace_fragment>
}`,
  });
  const mesh = new THREE.InstancedMesh(g, material, count); mesh.frustumCulled = false; mesh.name = 'cloud-puffs'; mesh.renderOrder = 3; mesh.visible = false;
  return { mesh, uniforms };
}

/** Flyer geometry (after the lightweight-game-objects sky-life template): body and wings; aWing 0 at the body, ±1 at the tips. */
function flyerGeometry(kind) {
  const pos = [], wing = [], tri = (a, b, c, wa, wb, wc) => { pos.push(...a, ...b, ...c); wing.push(wa, wb, wc); };
  if (kind === 'butterfly') {
    for (const s of [-1, 1]) {
      tri([0, 0, 0.12], [s * 0.55, 0, 0.32], [s * 0.62, 0, 0.0], 0, s, s); tri([0, 0, 0.12], [s * 0.62, 0, 0.0], [0, 0, -0.02], 0, s, 0);
      tri([0, 0, -0.02], [s * 0.45, 0, -0.05], [s * 0.32, 0, -0.38], 0, s * 0.8, s * 0.7);
    }
    tri([0, 0.02, 0.2], [0.03, 0, -0.3], [-0.03, 0, -0.3], 0, 0, 0);
  } else {
    for (const s of [-1, 1]) { tri([0, 0, 0.18], [s * 0.5, 0.02, -0.05], [0, 0, -0.12], 0, s * 0.5, 0); tri([s * 0.5, 0.02, -0.05], [s, 0, -0.25], [0, 0, -0.12], s * 0.5, s, 0); }
    tri([0, 0.03, 0.42], [0.06, 0, -0.1], [-0.06, 0, -0.1], 0, 0, 0); tri([0, 0, -0.1], [0.14, 0, -0.42], [-0.14, 0, -0.42], 0, 0, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
  return g;
}
const FLYER_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
}`;

/** A flock flying in a loose V along a straight pass; the CPU starts a pass by writing its start, direction and time. */
function birdFlock(count) {
  const g = flyerGeometry('bird'), iBird = new Float32Array(count * 4), iColor = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    iBird.set([side * row * 2.2 + (rand() - 0.5) * 0.6, -row * 2.4 + (rand() - 0.5) * 0.8, rand() * 6.28, 10 + rand() * 3], i * 4);
    const c = new THREE.Color(rand() < 0.75 ? '#fffaf0' : '#e8eef5'); iColor.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('iBird', new THREE.InstancedBufferAttribute(iBird, 4)); g.setAttribute('iColor', new THREE.InstancedBufferAttribute(iColor, 3));
  const uniforms = { uTime: { value: 0 }, uStart: { value: new THREE.Vector3(0, -999, 0) }, uDir: { value: new THREE.Vector2(1, 0) }, uT0: { value: -999 }, uSpeed: { value: 9 }, uCalm: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
attribute float aWing; attribute vec4 iBird; attribute vec3 iColor;
uniform float uTime, uT0, uSpeed, uCalm; uniform vec3 uStart; uniform vec2 uDir; varying vec3 vColor;
void main(){
  float t = uTime - uT0;
  vec3 fwd = normalize(vec3(uDir.x, 0.0, uDir.y)), right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 c = uStart + fwd * (t * uSpeed + iBird.y) + right * iBird.x;
  c.y += sin(t * 0.7 + iBird.z) * 0.6;
  c += right * sin(t * 0.9 + iBird.z) * 0.5;
  // flap for a while, then glide with wings up a little
  float beat = sin(t * iBird.w * uCalm + iBird.z * 3.0), glide = smoothstep(0.2, 0.6, sin(t * 0.45 + iBird.z));
  float flap = mix(beat, 0.25, glide);
  vec3 p = position * 0.95;
  p.y += flap * 0.55 * abs(aWing) * abs(p.x) * 0.9;
  vec3 up = cross(fwd, right);
  vec3 w = c + right * p.x + up * p.y + fwd * p.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  vColor = iColor * (0.85 + 0.15 * aWing * aWing);
}`,
    fragmentShader: FLYER_FRAG,
  });
  const mesh = new THREE.InstancedMesh(g, material, count); mesh.frustumCulled = false; mesh.name = 'birds'; mesh.visible = false;
  return { mesh, uniforms };
}

/** Butterflies and bees looping round anchors (flowers, crops) that the CPU refreshes near the camera every couple of seconds. */
function flutter(count) {
  const g = flyerGeometry('butterfly'), iAnchor = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4), iStyle = new Float32Array(count * 4), iColor = new Float32Array(count * 3);
  const butterflies = ['#ff7a00', '#ff2e88', '#19b5ff', '#ffd400', '#ff4040', '#8f5bff', '#22d36b'];
  for (let i = 0; i < count; i++) {
    const bee = i % 4 === 3;
    iStyle.set([bee ? 32 + rand() * 6 : 14 + rand() * 6, 0.5 + rand() * 0.9, rand() * 6.28, bee ? 0.19 : 0.31 + rand() * 0.15], i * 4);
    const c = new THREE.Color(bee ? '#ffc61a' : butterflies[i % butterflies.length]); iColor.set([c.r, c.g, c.b], i * 3);
  }
  iAnchor.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iAnchor', iAnchor); g.setAttribute('iStyle', new THREE.InstancedBufferAttribute(iStyle, 4)); g.setAttribute('iColor', new THREE.InstancedBufferAttribute(iColor, 3));
  const uniforms = { uTime: { value: 0 }, uCalm: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
attribute float aWing; attribute vec4 iAnchor, iStyle; attribute vec3 iColor;
uniform float uTime, uCalm; varying vec3 vColor;
void main(){
  // iAnchor: x, y (flower height), z, 1 = in use; iStyle: flap rate, loop radius, phase, size
  float t = uTime * uCalm, a = t * (0.9 + iStyle.y * 0.3) + iStyle.z;
  vec3 c = iAnchor.xyz + vec3(cos(a) * iStyle.y, 0.45 + 0.35 * sin(a * 1.7 + iStyle.z) + 0.15 * sin(t * 3.1 + iStyle.z), sin(a * 1.3) * iStyle.y * 0.8);
  vec3 fwd = normalize(vec3(-sin(a), 0.0, cos(a * 1.3) * 1.04)), right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd)), up = cross(fwd, right);
  float flap = sin(t * iStyle.x + iStyle.z * 3.0);
  vec3 p = position * iStyle.w * iAnchor.w;
  p.y += flap * 1.0 * abs(aWing) * abs(p.x);
  p.x *= 1.0 - 0.25 * abs(aWing) * max(flap, 0.0);
  vec3 w = c + right * p.x + up * p.y + fwd * p.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  vColor = mix(iColor, iColor.gbr * 1.15, abs(aWing) * 0.5) * (0.85 + 0.3 * abs(aWing));   // two-tone wings: vivid at the tips
}`,
    fragmentShader: FLYER_FRAG,
  });
  const mesh = new THREE.InstancedMesh(g, material, count); mesh.frustumCulled = false; mesh.name = 'butterflies';
  return { mesh, uniforms, anchors: iAnchor };
}

/** Fireflies (near water and woods) and stars (in the far haze): one point cloud, additive, night only. */
function nightLights(fireflies, stars) {
  const n = fireflies.length + stars.length, pos = new Float32Array(n * 3), info = new Float32Array(n * 2);
  [...fireflies, ...stars].forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); info.set([p.star ? 1 : 0, rand() * 6.28], i * 2); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aInfo', new THREE.BufferAttribute(info, 2));
  const uniforms = { uTime: { value: 0 }, uNight: { value: 0 }, uPixel: { value: 2 }, uCalm: { value: 1 } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
attribute vec2 aInfo; uniform float uTime, uNight, uPixel, uCalm; varying float vA; varying float vStar;
void main(){
  vec3 p = position; float ph = aInfo.y, t = uTime * uCalm;
  if (aInfo.x < 0.5) p += vec3(sin(t * 0.5 + ph) * 1.4, sin(t * 0.8 + ph * 2.0) * 0.5, cos(t * 0.43 + ph) * 1.4);
  vStar = aInfo.x;
  float blink = aInfo.x > 0.5 ? 0.55 + 0.45 * sin(uTime * 1.3 + ph * 7.0) : 0.15 + 0.85 * pow(max(0.0, sin(t * 1.1 + ph)), 2.0);
  vA = blink * uNight;
  gl_PointSize = (aInfo.x > 0.5 ? 3.0 + 2.0 * fract(ph * 13.1) : 18.0) * uPixel;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: /* glsl */`
varying float vA; varying float vStar;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float halo = 1.0 - smoothstep(0.0, 0.5, d), core = 1.0 - smoothstep(0.05, 0.16, d);
  float a = (vStar > 0.5 ? 1.0 - smoothstep(0.1, 0.5, d) : halo * halo * 0.55 + core) * vA;
  if (a < 0.01) discard;
  vec3 c = vStar > 0.5 ? vec3(0.85, 0.9, 1.0) : vec3(1.0, 0.92, 0.45);
  gl_FragColor = vec4(c * a, a);
}`,
  });
  const points = new THREE.Points(g, material); points.frustumCulled = false; points.name = 'night-lights'; points.visible = false;
  return { points, uniforms };
}

export class Sky {
  constructor(world, game) {
    Object.assign(this, { world, game, night: 0, nextBirds: 6 + rand() * 8, anchorClock: 99 });
    seed = 333;
    const CLOUDS = 9, bases = new Float32Array(CLOUDS * 4);
    for (let i = 0; i < CLOUDS; i++) bases.set([rand() * WRAP - 120, rand() * WRAP - 120, 14 + rand() * 12, rand()], i * 4);
    this.shadows = cloudShadows(CLOUDS, bases); this.puffs = cloudPuffs(CLOUDS, bases);
    this.birds = birdFlock(7); this.flutter = flutter(40);
    // fireflies round the pond, along the brook and at the woods' edges near the farm; stars out in the far haze
    const ff = [], P = POND;
    for (let i = 0; i < 22; i++) ff.push({ x: (P.x0 + rand() * (P.x1 - P.x0 + 6) - 3) * CELL, y: 0.8 + rand() * 1.2, z: (P.z0 + rand() * (P.z1 - P.z0 + 6) - 3) * CELL });
    for (let i = 0; i < 46; i++) { const x = rand() * MAP; ff.push({ x, y: 0.7 + rand() * 1.3, z: brookCentre(x) + (rand() - 0.5) * 14 }); }
    const trees = world.wilds?.trees ?? [];
    for (let i = 0; i < 70 && trees.length; i++) { const t = trees[Math.floor(rand() * trees.length)]; ff.push({ x: t.x + (rand() - 0.5) * 4, y: 0.8 + rand() * 1.6, z: t.z + (rand() - 0.5) * 4 }); }
    const stars = [];
    for (let i = 0; i < 520; i++) {
      const a = rand() * Math.PI * 2, r = MAP * 0.71 + 150 + rand() * 900;
      stars.push({ x: MAP / 2 + Math.cos(a) * r, y: -2.8, z: MAP / 2 + Math.sin(a) * r, star: true });
    }
    this.lights = nightLights(ff, stars);
    this.lights.uniforms.uPixel.value = Math.min(devicePixelRatio, 2);
    world.scene.add(this.shadows.mesh, this.puffs.mesh, this.birds.mesh, this.flutter.mesh, this.lights.points);
    world.onFrame((dt, now) => this.frame(dt, now));
  }
  setNight(k) {
    this.night = k;
    this.lights.uniforms.uNight.value = k; this.lights.points.visible = k > 0.02;
    this.puffs.uniforms.uNight.value = k;
    this.shadows.uniforms.uOpacity.value = 0.2 * (1 - k); this.shadows.mesh.visible = k < 0.98;
    this.flutter.mesh.visible = k < 0.5;
  }
  frame(dt, now) {
    const t = (now / 1000) % 100000, calm = document.body.classList.contains('reduced-motion') ? 0.25 : 1;
    this.time = (this.time ?? 0) + dt * calm;
    for (const u of [this.shadows.uniforms, this.puffs.uniforms]) u.uTime.value = this.time;
    for (const u of [this.birds.uniforms, this.flutter.uniforms, this.lights.uniforms]) { u.uTime.value = t; if (u.uCalm) u.uCalm.value = calm; }
    // the puffs fade in as the camera zooms out (they would cover the farm when working close), and even in the far view
    // stay a veil the farm shows through (review: an opaque puff hid a quarter of a full farm at span 220)
    const span = this.world.cam.span, fade = Math.min(1, Math.max(0, (span - 120) / 60)) * 0.42 * (1 - this.night * 0.85);
    this.puffs.uniforms.uOpacity.value = fade; this.puffs.mesh.visible = fade > 0.01;
    // birds: a new pass every 30–60 s, through the middle of the view, by day
    const b = this.birds.uniforms;
    this.nextBirds -= dt;
    if (this.nextBirds <= 0 && this.night < 0.5) { this.startBirds(t); this.nextBirds = 30 + rand() * 30; }
    this.birds.mesh.visible = t - b.uT0.value < 260 / b.uSpeed.value && this.night < 0.5 && calm === 1;
    // reduced motion: the birds and butterflies rest (out of sight); only the clouds drift, slowly
    this.flutter.mesh.visible = this.night < 0.5 && calm === 1;
    // butterflies: re-anchor near the camera now and then
    this.anchorClock += dt;
    if (this.anchorClock > 2.5) { this.anchorClock = 0; this.reanchor(); }
  }
  startBirds(t) {
    const cam = this.world.cam, a = rand() * Math.PI * 2, d = new THREE.Vector2(Math.cos(a), Math.sin(a)), b = this.birds.uniforms;
    b.uStart.value.set(cam.x - d.x * 120 + (rand() - 0.5) * 20, 18 + rand() * 6, cam.z - d.y * 120 + (rand() - 0.5) * 20);
    b.uDir.value.copy(d); b.uT0.value = t; b.uSpeed.value = 8 + rand() * 4;
  }
  /** Pick the anchors nearest the camera: flowers in the wilds, ripe or growing crops, decorative flowers placed by the player. */
  reanchor() {
    const cam = this.world.cam, list = [], s = this.game.s;
    const consider = (x, z, y) => { const d = (x - cam.x) ** 2 + (z - cam.z) ** 2; if (d < 70 * 70) list.push([d, x, y, z]); };
    for (const f of this.world.wilds?.flowers ?? []) consider(f.x, f.z, 0.35);
    for (const f of this.world.locked?.flowers ?? []) consider(f.x, f.z, 0.35);
    for (const [id, p] of Object.entries(s.placed)) if (p.kind === 'flowers' || (p.kind === 'bed' && s.beds[id])) consider((p.x + 0.5) * CELL, (p.z + 0.5) * CELL, 0.6);
    list.sort((a, b) => a[0] - b[0]);
    const arr = this.flutter.anchors.array, n = arr.length / 4;
    for (let i = 0; i < n; i++) {
      const near = Math.min(list.length, 260), pick = list[Math.floor(((i * 0.618034) % 1) * near)];   // spread over the nearest anchors
      if (pick && list.length) arr.set([pick[1] + (i % 3 - 1) * 0.4, pick[2], pick[3] + ((i >> 2) % 3 - 1) * 0.4, 1], i * 4); else arr.set([0, -50, 0, 0], i * 4);
    }
    this.flutter.anchors.needsUpdate = true;
    this.anchored = Math.min(n, list.length);
  }
}
