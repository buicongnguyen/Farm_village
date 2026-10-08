// AR-010 props follow saved trail facts. Loading, drawing and picking never earn a clue or a reward.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { EXPLORATION_SITES } from '../content/exploration-sites.mjs';
import { explorationStatus } from '../core/exploration.mjs';
import { loadKitLater, tiers } from './models.mjs';

const MODELS = {
  porch: ['trail_porch_box_closed', 'trail_porch_box_open'],
  pond: ['trail_pond_cache_closed', 'trail_pond_cache_open'],
};
// Preserve both variants' authored origin. Forecourt tiles are 5 cm high; the cache's earth patch embeds in the bank.
const LIFT = { porch: 0.05, pond: 0.062 };
const matrix = new THREE.Matrix4(), point = new THREE.Vector3();

export class ExplorationView {
  constructor(world, game) {
    Object.assign(this, { world, game, loaded: false, loading: null, attempted: false, disposed: false, visible: new Map(), ready: Promise.resolve(false) });
    this.unsubscribe = game.on(() => this.sync());
    this.sync();
  }

  /** Optional load: false on failure, never a rejected boot promise. Explicit navigation may call this to retry. */
  ensureLoaded() {
    if (this.disposed) return Promise.resolve(false);
    if (this.loaded) return Promise.resolve(true);
    if (this.loading) return this.loading;
    this.attempted = true;
    this.ready = this.loading = loadKitLater('exploration-props').then(kit => {
      if (this.disposed) return false;
      const names = Object.values(MODELS).flat();
      for (const name of names) if (!kit[name]) throw new Error(`missing exploration prop ${name}`);
      for (const name of names) if (!this.world.batches.has(name)) {
        const t = tiers(kit, name, { scale: 1 }, 'static', { center: false });
        this.world.batches.register(name, { ...t, kind: 'static' });
      }
      this.loaded = true; this.sync(); return true;
    }).catch(error => {
      // Menu-based exploration stays available when the optional art cannot load.
      console.warn('Exploration props unavailable:', error.message);
      return false;
    }).finally(() => { this.loading = null; });
    return this.ready;
  }

  sync() {
    if (this.disposed) return;
    const status = explorationStatus(this.game.s), wanted = new Map();
    if (status.eligible) {
      const earned = new Set(status.earned.map(step => step.id));
      wanted.set('porch', MODELS.porch[earned.has('porch') ? 1 : 0]);
      if (earned.has('porch')) wanted.set('pond', MODELS.pond[earned.has('pond') ? 1 : 0]);
    }
    if (!this.loaded) {
      if (wanted.size && !this.attempted) this.ensureLoaded();
      return;
    }
    const batches = this.world.batches;
    for (const [place, ids] of Object.entries(MODELS)) {
      const next = wanted.get(place);
      for (const id of ids) if (id !== next) batches.remove(id);
      if (!next) continue;
      const site = EXPLORATION_SITES[place], existing = batches.items.get(next);
      if (!existing) batches.set(next, { model: next, x: site.x * CELL, z: site.z * CELL, y: LIFT[place], rot: 0 });
    }
    this.visible = wanted;
  }

  /** Client-screen coordinates. Close-up props get a 44 px minimum finger target; wider views use their actual bounds.
   * This only identifies visible props; the caller opens the appropriate panel and core validates any later action. */
  pick(x, y) {
    if (!this.loaded || this.disposed || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const camera = this.world.cam.camera; camera.updateMatrixWorld();
    let best = null, nearest = Infinity;
    for (const [place, id] of this.visible) {
      const item = this.world.batches.items.get(id), model = item && this.world.batches.models.get(item.model);
      if (!model?.geo.boundingBox) continue;
      this.world.batches.compose(item, 'static', matrix);
      const bounds = model.geo.boundingBox;
      point.copy(bounds.min).add(bounds.max).multiplyScalar(0.5).applyMatrix4(matrix).project(camera);
      if (point.z < -1 || point.z > 1) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const px of [bounds.min.x, bounds.max.x]) for (const py of [bounds.min.y, bounds.max.y]) for (const pz of [bounds.min.z, bounds.max.z]) {
        point.set(px, py, pz).applyMatrix4(matrix).project(camera);
        const sx = rect.left + (point.x + 1) * rect.width / 2, sy = rect.top + (1 - point.y) * rect.height / 2;
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
      }
      // A model wholly off screen is not an invisible edge target.
      if (maxX < rect.left || minX > rect.right || maxY < rect.top || minY > rect.bottom) continue;
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      // Expanding tiny distant props would steal nearby dock/mailbox/farmhouse taps. Navigation zooms in for inspection.
      const minimum = this.world.cam.span <= 40 ? 22 : 0;
      const halfW = Math.max(minimum, (maxX - minX) / 2), halfH = Math.max(minimum, (maxY - minY) / 2);
      if (Math.abs(x - cx) > halfW || Math.abs(y - cy) > halfH) continue;
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < nearest) { nearest = distance; best = place; }
    }
    return best;
  }

  dispose() {
    this.disposed = true; this.unsubscribe?.();
    for (const ids of Object.values(MODELS)) for (const id of ids) this.world.batches.remove(id);
    this.visible.clear();
  }
}
