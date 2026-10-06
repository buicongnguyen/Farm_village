// The toon look (after Willowmere's toon.mjs and Zoo Garden): a 4-step light ramp, a warm hemisphere light and a sun,
// no tone mapping. One shared material for everything baked with vertex colours keeps draw calls low.
import * as THREE from 'three';

let ramp = null;
export function toonRamp() {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([90, 160, 215, 255]), 4, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  return ramp;
}
const shared = new Map();
/** A toon material. Materials with the same options are shared. */
export function toon({ color = '#ffffff', vertexColors = true, transparent = false, opacity = 1 } = {}) {
  const key = `${color}|${vertexColors}|${transparent}|${opacity}`;
  if (!shared.has(key)) shared.set(key, new THREE.MeshToonMaterial({ color, vertexColors, gradientMap: toonRamp(), transparent, opacity }));
  return shared.get(key);
}
/** Lights for an outdoor scene; returns them so day and night can retint them. */
export function addLights(scene) {
  const hemi = new THREE.HemisphereLight('#fff6e0', '#7a9a5a', 1.5);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.position.set(-40, 80, 30);
  scene.add(hemi, sun);
  return { hemi, sun };
}
