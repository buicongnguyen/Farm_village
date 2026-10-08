// The toon look (after Willowmere's toon.mjs and Zoo Garden): a 4-step light ramp, a warm hemisphere light and a sun,
// no tone mapping. One shared material for everything baked with vertex colours keeps draw calls low.
// toon({ sway: true }) is the same look with wind in the vertex shader (crops, flowers, bushes, tufts, tree crowns):
// vertices bend more the higher they sit, along one world wind with gusts rolling across the map, each plant on its own
// phase taken from its instance position. One uniform per frame (SWAY.uTime); no extra draws.
import * as THREE from 'three';

let ramp = null;
export function toonRamp() {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([90, 160, 215, 255]), 4, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  return ramp;
}
/** Wind shared by every swaying material. uStrength 0 stills it (reduced motion). */
export const SWAY = { uTime: { value: 0 }, uStrength: { value: 1 }, uWind: { value: new THREE.Vector2(0.86, 0.5) } };
/** Advance the wind (once per frame); quiet = reduced motion, which eases the sway to a stop. */
export function tickSway(dt, quiet = false) {
  SWAY.uTime.value = (SWAY.uTime.value + dt) % 3600;
  const s = SWAY.uStrength;
  s.value += ((quiet ? 0 : 1) - s.value) * Math.min(1, dt * 6);
  if (quiet && s.value < 0.01) s.value = 0;
}
/** Moonlight (review: the 23:00 night read as dim green): at night every toon surface is graded toward a cool blue by
 *  its brightness, so the land goes moonlit navy while lamp pools, windows and bulbs (their own materials) stay warm.
 *  view/daylight.mjs sets uMoon (0 by day, 1 in the dark hours). */
export const NIGHT = { uMoon: { value: 0 } };
const MOON_GRADE = `#include <dithering_fragment>
  {
    float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(lum) * vec3(0.42, 0.62, 1.25), uMoon * 0.75);
  }`;
function addNight(shader) {
  shader.uniforms.uMoon = NIGHT.uMoon;
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uMoon;').replace('#include <dithering_fragment>', MOON_GRADE);
}
function addSway(material) {
  material.onBeforeCompile = shader => {
    addNight(shader);
    Object.assign(shader.uniforms, SWAY);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uStrength;\nuniform vec2 uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  #ifdef USE_INSTANCING
    mat4 swayM = modelMatrix * instanceMatrix;
  #else
    mat4 swayM = modelMatrix;
  #endif
  vec2 root = swayM[3].xz;
  float h = max(transformed.y, 0.0);
  // low plants bend from the base, trees mostly in the crown
  float bend = h * 0.05 + h * h * 0.006;
  float gust = 0.6 + 0.4 * sin(dot(root, uWind) * 0.09 - uTime * 0.9);
  float phase = dot(root, vec2(0.37, 0.23)) * 3.0;
  float sway = (0.5 * sin(uTime * 1.9 + phase) + 0.25 * sin(uTime * 3.3 + phase * 1.7)) * gust;
  // the world wind in this instance's own frame (undo its rotation and uniform scale)
  float sc = max(1e-4, dot(swayM[0].xyz, swayM[0].xyz));
  vec3 local = (vec3(uWind.x, 0.0, uWind.y) * mat3(swayM)) / sc;
  transformed += local * sway * bend * uStrength;
  transformed.y -= abs(sway) * bend * 0.12 * uStrength;
}`);
  };
  material.customProgramCacheKey = () => 'fv-sway-2';
  return material;
}
const shared = new Map();
/** A toon material. Materials with the same options are shared. */
export function toon({ color = '#ffffff', vertexColors = true, transparent = false, opacity = 1, sway = false } = {}) {
  const key = `${color}|${vertexColors}|${transparent}|${opacity}|${sway}`;
  if (!shared.has(key)) {
    const m = new THREE.MeshToonMaterial({ color, vertexColors, gradientMap: toonRamp(), transparent, opacity });
    if (!sway) { m.onBeforeCompile = addNight; m.customProgramCacheKey = () => 'fv-toon-night-1'; }
    shared.set(key, sway ? addSway(m) : m);
  }
  return shared.get(key);
}
/** Lights for an outdoor scene; returns them so day and night can retint them. */
export function addLights(scene) {
  const hemi = new THREE.HemisphereLight('#eaf0ff', '#6a9a48', 1.55);
  const sun = new THREE.DirectionalLight('#ffe9c4', 2.45); sun.position.set(-40, 80, 30);
  scene.add(hemi, sun);
  return { hemi, sun };
}
