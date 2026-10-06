// The 3D world: renderer, scene, camera, ground and the fixed scenery (roads, brook, woods, farmhouse, barn, ruins).
// It draws state; it never changes it (TECH-PLAN 2, rule 1).
import * as THREE from 'three';
import { addLights } from '../kit/toon.mjs';
import { GameCamera } from './camera.mjs';
import { Ground } from './ground.mjs';
import { Batches } from './batches.mjs';
import { loadKit, bake, fit, simplify, averageColor } from './models.mjs';
import { rng } from '../core/rng.mjs';
import * as W from '../content/world.mjs';

export const GROUND_COLORS = { grass: '#8cc96b', meadow: '#9dcf73', path: '#e3c99a', road: '#d9bf8e', tilled: '#9a6a44', water: '#4aa6d8', weeds: '#7cb85a', rock: '#8cc96b' };

/** Fixed scenery models, by kit: [name in kit, our name, size, kind]. */
const SCENERY = [
  ['scenery', 'tree_round', 'tree_round', { height: 5 }, 'tree'], ['scenery', 'tree_pine', 'tree_pine', { height: 6 }, 'tree'],
  ['scenery', 'tree_blossom', 'tree_blossom', { height: 4.5 }, 'tree'], ['scenery', 'bush', 'bush', { width: 1.6 }, 'crop'],
  ['scenery', 'flowers', 'flowers', { width: 1.2 }, 'crop'], ['scenery', 'rock', 'rock', { width: 1.4 }, 'crop'],
  ['scenery', 'tuft', 'tuft', { width: 0.8 }, 'crop'],
  ['rural', W.FARMHOUSE.model, 'farmhouse', { width: W.FARMHOUSE.width }, 'static'], ['rural', W.BARN.model, 'barn', { width: W.BARN.width }, 'static'],
  ['rural', 'mailbox', 'mailbox', { height: 1.3 }, 'static'], ['rural', 'windmill', 'windmill', { height: 9 }, 'static'],
];

export class WorldView {
  constructor(container, { cellLook } = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#9fd3f0');
    this.lights = addLights(this.scene);
    this.cam = new GameCamera({ x: (W.START_PARCEL ? W.parcelOrigin(W.START_PARCEL).x + 4 : 64) * W.CELL, z: (W.parcelOrigin(W.START_PARCEL).z + 8) * W.CELL, span: 70, bounds: { x0: 0, z0: 0, x1: W.N * W.CELL, z1: W.N * W.CELL } });
    this.cellLook = cellLook ?? ((x, z) => this.fixedLook(x, z));
    this.ground = new Ground(this.scene, (x, z) => this.cellLook(x, z));
    this.batches = new Batches(this.scene);
    this.cam.onChange(c => this.batches.setLevel(c.lod));
    this.raycaster = new THREE.Raycaster();
    addEventListener('resize', () => { this.renderer.setSize(innerWidth, innerHeight); });
    this.frameListeners = new Set();
  }
  /** The look of fixed ground (roads, brook, meadow); the game layers the player's cells on top. */
  fixedLook(x, z) {
    if (W.isBrook(x, z)) return { color: GROUND_COLORS.water, y: -0.15, jitter: 0.01 };
    if (W.isRoad(x, z)) return { color: GROUND_COLORS.road };
    if (W.inFarm(x, z)) return { color: GROUND_COLORS.meadow };
    return { color: GROUND_COLORS.grass };
  }
  async loadScenery() {
    const kits = {};
    for (const [kit] of SCENERY) kits[kit] ??= await loadKit(kit);
    for (const [kit, src, name, size, kind] of SCENERY) {
      const geo = fit(bake(kits[kit][src]), size);
      this.batches.register(name, { geo, mid: kind === 'static' ? geo : simplify(geo), kind, color: averageColor(geo) });
    }
    const c = W.CELL, at = (x, z) => ({ x: x * c + c / 2, z: z * c + c / 2 });
    this.batches.set('farmhouse', { model: 'farmhouse', ...at(W.FARMHOUSE.x, W.FARMHOUSE.z), rot: Math.PI / 2 });
    this.batches.set('barn', { model: 'barn', ...at(W.BARN.x, W.BARN.z), rot: Math.PI / 2 });
    this.batches.set('mailbox', { model: 'mailbox', ...at(27, 60), rot: Math.PI / 2 });
    this.batches.set('windmill', { model: 'windmill', ...at(17, 54), rot: 0.4 });
    this.scatterWilds();
  }
  /** Woods, bushes, flowers and rocks outside the farm, village, roads and brook (seeded, the same in every game). */
  scatterWilds() {
    const r = rng(20261007); let n = 0;
    for (let i = 0; i < 12000 && n < 2600; i++) {
      const x = r.int(W.N), z = r.int(W.N);
      if (W.isRoad(x, z) || W.isBrook(x, z) || W.inFarm(x, z) || W.inVillage(x, z) || W.nearHome(x, z) || Math.abs(z - W.brookZ(x)) < 3) continue;
      const roll = r(), model = roll < 0.32 ? r.pick(['tree_pine', 'tree_round', 'tree_round']) : roll < 0.45 ? 'bush' : roll < 0.62 ? 'flowers' : roll < 0.7 ? 'rock' : 'tuft';
      this.batches.set(`wild${n++}`, { model, x: (x + 0.2 + r() * 0.6) * W.CELL, z: (z + 0.2 + r() * 0.6) * W.CELL, rot: r() * 6.28, scale: 0.8 + r() * 0.4 });
    }
  }
  /** The cell under a screen point, or null. */
  cellAt(clientX, clientY) {
    const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.cam.camera);
    return this.ground.pick(this.raycaster);
  }
  onFrame(f) { this.frameListeners.add(f); return () => this.frameListeners.delete(f); }
  start() {
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!document.hidden) {
        for (const f of this.frameListeners) f(dt, now);
        this.ground.flush(); this.batches.flush();
        this.renderer.render(this.scene, this.cam.camera);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  info() { const r = this.renderer.info.render; return { draws: r.calls, triangles: r.triangles, lod: this.cam.lod, span: this.cam.span, ...this.batches.stats() }; }
}
