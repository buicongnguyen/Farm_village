// Day and night follow the player's own clock (DESIGN 3.3), or stay daytime (Settings). Night has a very dark blue sky,
// a cool low light and glowing lamps; dawn and dusk are warm. Updated every few seconds, smoothly.
import * as THREE from 'three';

const KEYS = [   // hour → sky, hemisphere (sky, ground, intensity), sun (colour, intensity)
  [0, '#0d1b3a', '#3a4f8a', '#1b2335', 0.55, '#7f93d6', 0.35],
  [5, '#24365f', '#6b77b0', '#3a3a40', 0.8, '#ffb07a', 0.8],
  [7, '#ffd2a1', '#fff0d0', '#7a9a5a', 1.3, '#ffd29a', 2.0],
  [10, '#9fd3f0', '#fff6e0', '#7a9a5a', 1.5, '#fff1d6', 2.4],
  [16, '#9fd3f0', '#fff6e0', '#7a9a5a', 1.5, '#fff1d6', 2.4],
  [18.5, '#ffb37a', '#ffd9b0', '#7a6a50', 1.2, '#ff9a5a', 1.6],
  [20, '#2a3566', '#5a6aa8', '#2a2a35', 0.75, '#8f8fd0', 0.5],
  [24, '#0d1b3a', '#3a4f8a', '#1b2335', 0.55, '#7f93d6', 0.35],
];
const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
export function lightAt(hour) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= hour) i++;
  const a = KEYS[i], b = KEYS[i + 1], k = (hour - a[0]) / (b[0] - a[0]);
  return { sky: mix(a[1], b[1], k), hemiSky: mix(a[2], b[2], k), hemiGround: mix(a[3], b[3], k), hemi: a[4] + (b[4] - a[4]) * k, sun: mix(a[5], b[5], k), sunI: a[6] + (b[6] - a[6]) * k, night: hour < 5.5 || hour > 19.5 };
}
export class Daylight {
  constructor(world, game) {
    Object.assign(this, { world, game, clock: 99 });
    world.onFrame(dt => { this.clock += dt; if (this.clock > 3) { this.clock = 0; this.apply(); } });
  }
  apply() {
    const d = new Date(this.game.now), always = this.game.s.settings.daylight === 'always';
    const hour = always ? 12 : d.getHours() + d.getMinutes() / 60, L = lightAt(hour), { hemi, sun } = this.world.lights;
    this.world.scene.background.copy(L.sky); hemi.color.copy(L.hemiSky); hemi.groundColor.copy(L.hemiGround); hemi.intensity = L.hemi;
    sun.color.copy(L.sun); sun.intensity = L.sunI;
    document.body.classList.toggle('night', L.night);
  }
}
