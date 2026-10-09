// The 3D world: renderer, scene, camera, ground and the fixed scenery (roads, brook, woods, farmhouse, barn, ruins).
// It draws state; it never changes it (TECH-PLAN 2, rule 1).
import * as THREE from 'three';
import { addLights } from '../kit/toon.mjs';
import { GameCamera } from './camera.mjs';
import { Ground } from './ground.mjs';
import { Batches } from './batches.mjs';
import { loadKit, loadKitLater, bake, fit, simplify, averageColor } from './models.mjs';
import * as W from '../content/world.mjs';

// Saturated, warm toon palette (no tone mapping: colour comes from here, not from post-processing). The ground adds
// value-noise variation around these means (ground.mjs), so they are the average colour of each surface.
export const GROUND_COLORS = {
  grass: '#62b83c', meadow: '#6cba46', wildMeadow: '#6aa83a', path: '#e8c28a', road: '#dca870', tilled: '#7a4a2a',
  water: '#299ead', bank: '#d8bf86', plaza: '#dcc59a', weeds: '#6fb03d', rock: '#72bd3e', yard: '#b98a62',
};

const HARD = new Set([GROUND_COLORS.path, GROUND_COLORS.road, GROUND_COLORS.tilled, GROUND_COLORS.water, GROUND_COLORS.bank, GROUND_COLORS.plaza, GROUND_COLORS.yard]);
const EDGE = { [GROUND_COLORS.tilled]: 0.7, [GROUND_COLORS.path]: 0.7, [GROUND_COLORS.road]: 0.74, [GROUND_COLORS.bank]: 0.94, [GROUND_COLORS.plaza]: 0.86, [GROUND_COLORS.yard]: 0.8 };

/** Fixed scenery models, by kit: [name in kit, our name, size, kind]. */
const SCENERY = [
  ['farm-kit', 'cute_round', 'tree_round', { height: 5 }, 'tree'], ['farm-kit', 'cute_pine', 'tree_pine', { height: 6 }, 'tree'],
  ['farm-kit', 'cute_blossom', 'tree_blossom', { height: 4.8 }, 'tree'], ['scenery', 'bush', 'bush', { width: 1.6 }, 'crop'],
  ['scenery', 'flowers', 'flowers', { width: 1.2 }, 'crop'], ['scenery', 'rock', 'rock', { width: 1.4 }, 'crop'],
  ['scenery', 'tuft', 'tuft', { width: 0.8 }, 'crop'],
  ['rural-lite', W.FARMHOUSE.model, 'farmhouse', { width: W.FARMHOUSE.width }, 'static'], ['rural-lite', W.BARN.model, 'barn', { width: W.BARN.width }, 'static'],
  ['rural-lite', 'mailbox', 'mailbox', { height: 1.3 }, 'static'], ['rural-lite', 'windmill', 'windmill', { height: 9 }, 'static'],
  ['scenery', 'mushroom', 'mushroom', { width: 0.45 }, 'crop'], ['scenery', 'fence', 'picket', { width: 2 }, 'static'],
  ['scenery', 'gate', 'farm_gate', { width: 4.2 }, 'static'],
];

/** The art kit's nature.glb takes over the scenery's bushes, rocks, flowers and tufts once the first scene is up (a swap
 *  in place: same names, so the wilds, the locked land and the player's charm items all follow), using its authored _mid
 *  levels as the near look of the scatter. The wild trees stay on scenery.glb: nature's trees are 3.5k triangles (too
 *  heavy for hundreds of scattered trees) and their 344-triangle _mid levels look faceted beside the full trees players
 *  place, while the scenery's round trees and cones read as one style at every zoom. */
const NATURE = [
  ['bush_a_mid', 'bush', { width: 1.6 }, 'crop'], ['rock_a_mid', 'rock', { width: 1.4 }, 'crop'],
  ['flowers_a_mid', 'flowers', { width: 1.2 }, 'crop'], ['grass_tuft', 'tuft', { width: 0.8 }, 'crop'],
];

export class WorldView {
  constructor(container, { cellLook } = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#a9ddf4');
    // haze at extreme zoom-out only (the camera sits 300 m from its target); daylight retints it with the sky
    this.scene.fog = new THREE.Fog('#bfe3f2', 345, 720);
    this.lights = addLights(this.scene);
    this.cam = new GameCamera({ x: (W.START_PARCEL ? W.parcelOrigin(W.START_PARCEL).x + 4 : 64) * W.CELL, z: (W.parcelOrigin(W.START_PARCEL).z + 8) * W.CELL, span: 70, bounds: { x0: 0, z0: 0, x1: W.N * W.CELL, z1: W.N * W.CELL } });
    this.cellLook = cellLook ?? ((x, z) => this.fixedLook(x, z));
    this.ground = new Ground(this.scene, (x, z) => this.groundLook(x, z));
    this.batches = new Batches(this.scene);
    this.cam.onChange(c => this.batches.setLevel(c.lod));
    this.raycaster = new THREE.Raycaster();
    addEventListener('resize', () => { this.renderer.setSize(innerWidth, innerHeight); });
    this.frameListeners = new Set();
  }
  /** The look of fixed ground (roads, brook, meadow); the game layers the player's cells on top. */
  fixedLook(x, z) {
    if (W.isBrook(x, z)) return { color: GROUND_COLORS.bank };   // the water itself is the brook mesh
    if (W.isRoad(x, z)) return { color: GROUND_COLORS.road, cobble: true };
    if (W.isPondPath(x, z)) return { color: GROUND_COLORS.path };
    // the farmhouse forecourt: the grout under its stone tiles (dress.mjs draws the tiles), and one step of path from it
    // to the road in line with the path over to the farm
    const Y = W.HOME_YARD; if (x >= Y.x0 && x <= Y.x1 && z >= Y.z0 && z <= Y.z1) return { color: GROUND_COLORS.yard, grain: 0.04 };
    if (x === Y.x1 + 1 && z === 63) return { color: GROUND_COLORS.path };
    // owned farm land is tended: calmer than the wild, with a faint plot grid (ground.mjs `tended`); land not yet bought
    // stays the rougher wild meadow
    if (W.inFarm(x, z)) return !this.owned || this.owned(W.parcelOf(x, z)) ? { color: GROUND_COLORS.meadow, tended: true } : { color: GROUND_COLORS.wildMeadow, wild: true };
    if (x >= W.PLAZA.x0 && x <= W.PLAZA.x1 && z >= W.PLAZA.z0 && z <= W.PLAZA.z1) return { color: GROUND_COLORS.plaza, grain: 0.16 };
    return { color: GROUND_COLORS.grass, wild: !W.inVillage(x, z) && !W.nearHome(x, z) };
  }
  /** What the ground draws for a cell: the game's look, sorted into soft (noise-blended grass) and hard surfaces. */
  groundLook(x, z) {
    const look = this.cellLook(x, z);
    if (look.color === '#86c062') { look.color = GROUND_COLORS.meadow; look.edge = 0.94; }   // weeds and rocks: the meadow under them
    if (HARD.has(look.color)) { look.soft = false; look.edge ??= EDGE[look.color]; }
    if (look.y && look.color !== GROUND_COLORS.water) look.y = 0;
    return look;
  }
  async loadScenery() {
    const kits = {};
    for (const [kit] of SCENERY) kits[kit] ??= await loadKit(kit);
    for (const [kit, src, name, size, kind] of SCENERY) {
      const geo = fit(bake(kits[kit][src]), size);
      // trees: a leaner middle level (hundreds of them stand in the woods at every zoom past the near one)
      this.batches.register(name, { geo, mid: kind === 'static' ? geo : simplify(geo, kind === 'tree' ? 0.28 : 0.4), kind, color: averageColor(geo) });
    }
    const c = W.CELL, at = (x, z) => ({ x: x * c + c / 2, z: z * c + c / 2 });
    this.batches.set('farmhouse', { model: 'farmhouse', ...at(W.FARMHOUSE.x, W.FARMHOUSE.z), rot: Math.PI / 2 });
    this.batches.set('barn', { model: 'barn', ...at(W.BARN.x, W.BARN.z), rot: Math.PI / 2 });
    this.batches.set('mailbox', { model: 'mailbox', ...at(27, 60), rot: Math.PI / 2 });
    this.batches.set('windmill', { model: 'windmill', ...at(W.WINDMILL.x, W.WINDMILL.z), rot: W.WINDMILL.rot });
    // the woods, groves, drifts and the rest of the dressing come from dress.mjs (dressWorld), right after this
    this.natureLater = loadKitLater('nature', 400).then(kit => {
      for (const [src, name, size, kind] of NATURE) {
        if (!kit[src]) continue;
        const geo = fit(bake(kit[src]), size);
        this.batches.swap(name, { geo, mid: simplify(geo, 0.5), kind, color: averageColor(geo) });
      }
    }).catch(e => console.warn('nature kit', e.message));
  }
  /** The cell under a screen point, or null. */
  cellAt(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.cam.camera);
    return this.ground.pick(this.raycaster);
  }
  /** Graphics quality (Settings): low draws fewer pixels; auto starts sharp and steps down if frames run slow. */
  setQuality(q) {
    this.quality = q; this.maxRatio = q === 'low' ? 1 : Math.min(devicePixelRatio, 2); this.ratio = this.maxRatio;
    this.renderer.setPixelRatio(this.ratio); this.renderer.setSize(innerWidth, innerHeight);
  }
  govern(dt) {
    if (this.quality !== 'auto' || navigator.webdriver) return;
    const g = (this.gov ??= { t: 0, frames: 0, slow: 0, fast: 0 }); g.t += dt; g.frames++;
    if (g.t < 1) return;
    const fps = g.frames / g.t; g.t = 0; g.frames = 0;
    if (fps < 34 && this.ratio > 1) { if (++g.slow >= 3) { g.slow = 0; this.ratio = Math.max(1, this.ratio - 0.35); this.renderer.setPixelRatio(this.ratio); this.renderer.setSize(innerWidth, innerHeight); } }
    else if (fps > 56 && this.ratio < this.maxRatio) { if (++g.fast >= 10) { g.fast = 0; this.ratio = Math.min(this.maxRatio, this.ratio + 0.25); this.renderer.setPixelRatio(this.ratio); this.renderer.setSize(innerWidth, innerHeight); } }
    else { g.slow = 0; g.fast = 0; }
  }
  onFrame(f) { this.frameListeners.add(f); return () => this.frameListeners.delete(f); }
  start() {
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!document.hidden) {
        for (const f of this.frameListeners) f(dt, now);
        this.govern(dt);
        this.ground.flush(); this.batches.flush();
        this.renderer.render(this.presentation?.scene ?? this.scene, this.presentation?.camera ?? this.cam.camera);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  info() { const r = this.renderer.info.render; return { draws: r.calls, triangles: r.triangles, lod: this.cam.lod, span: this.cam.span, ...this.batches.stats() }; }
}
