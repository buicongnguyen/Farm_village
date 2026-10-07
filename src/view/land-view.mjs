// Draws the rules state on the map: cell colours, weeds and rocks, everything placed, fences on edges.
// sync() rebuilds from scratch (after loading); apply(events) updates only what an action changed.
import { N, CELL, ORDER_BOARD, RUINS } from '../content/world.mjs';
import { footprint } from '../content/buildings.mjs';
import { cellType } from '../core/grid.mjs';
import { KIND_MODELS, modelFor } from './kinds.mjs';
import { loadKit, bake, fit, simplify, averageColor } from './models.mjs';
import { GROUND_COLORS } from './world-view.mjs';

export class LandView {
  constructor(world, game) {
    Object.assign(this, { world, game, ready: false, pos: new Map() });
    world.cellLook = (x, z) => this.look(x, z);
  }
  /** Models arrive in two waves: the farm first (the first frame), the village's town buildings after it (TECH-PLAN 6). */
  async load() {
    const first = Object.entries(KIND_MODELS).filter(([, spec]) => spec.kit !== 'town');
    await this.register(first);
    this.world.batches.set('order_board', { model: 'order_board', x: (ORDER_BOARD.x + 0.5) * CELL, z: (ORDER_BOARD.z + 0.5) * CELL, rot: Math.PI / 2 });
    this.ready = true; this.sync();
    this.later = this.loadTown();
  }
  async loadTown() {
    await this.register(Object.entries(KIND_MODELS).filter(([, spec]) => spec.kit === 'town'));
    // ruins: the town buildings in faded, dusty colours (DESIGN 11)
    const town = await loadKit('town');
    for (const r of RUINS) {
      const geo = fit(bake(town[r.model]), { width: r.width }), c = geo.attributes.color;
      for (let i = 0; i < c.count; i++) { const g = (c.getX(i) + c.getY(i) + c.getZ(i)) / 3; c.setXYZ(i, g * 0.55 + c.getX(i) * 0.2 + 0.08, g * 0.55 + c.getY(i) * 0.2 + 0.07, g * 0.55 + c.getZ(i) * 0.2 + 0.05); }
      this.world.batches.register(`ruin:${r.kind}`, { geo, kind: 'static' });
    }
    this.sync();
  }
  async register(specs) {
    const kits = {};
    for (const [, spec] of specs) kits[spec.kit] ??= loadKit(spec.kit);
    for (const [name, spec] of specs) {
      if (this.world.batches.has(name)) continue;
      const kit = await kits[spec.kit], geo = fit(bake(kit[spec.node]), spec.width ? { width: spec.width } : { height: spec.height });
      this.world.batches.register(name, { geo, mid: spec.lod === 'static' ? geo : simplify(geo), kind: spec.lod, color: averageColor(geo) });
    }
  }
  get s() { return this.game.s; }
  look(x, z) {
    const fixed = this.world.fixedLook(x, z), s = this.s;
    if (!s) return fixed;
    const t = cellType(s, x, z);
    if (t === 'path') return { color: GROUND_COLORS.path };
    if (t === 'tilled') return { color: GROUND_COLORS.tilled, jitter: 0.02 };
    if (t === 'weeds' || t === 'rock') return { color: '#86c062' };
    return fixed;
  }
  /** World position of a placed item's centre. */
  centre(kind, x, z, rot) { const [w, d] = footprint(kind, rot); return { x: (x + w / 2) * CELL, z: (z + d / 2) * CELL }; }
  drawPlaced(id) {
    const p = this.s.placed[id], b = this.world.batches, old = this.pos.get(id);
    if (old) { this.world.ground.markDirty(old.x, old.z); this.pos.delete(id); }
    if (!p) { b.remove(id); return; }
    this.pos.set(id, { x: p.x, z: p.z }); this.world.ground.markDirty(p.x, p.z);
    if (p.kind !== 'bed' && !b.has(modelFor(p.kind, id))) return;      // its model is still loading; sync() draws it later
    if (p.kind === 'bed') { b.remove(id); return; }                     // beds are tilled ground; crops are drawn by crops-view (M3)
    const c = this.centre(p.kind, p.x, p.z, p.rot);
    b.set(id, { model: modelFor(p.kind, id), x: c.x, z: c.z, rot: p.rot * Math.PI / 2 });
  }
  drawCell(x, z) {
    const t = cellType(this.s, x, z), b = this.world.batches, id = `c${x},${z}`;
    if (t === 'weeds') b.set(id, { model: (x * 7 + z * 3) % 3 ? 'weeds' : 'weeds2', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 13 + z * 7) % 6, scale: 0.85 + ((x + z) % 3) * 0.1 });
    else if (t === 'rock') b.set(id, { model: 'rock', x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, rot: (x * 5 + z) % 6 });
    else b.remove(id);
    this.world.ground.markDirty(x, z);
  }
  drawEdge(key) {
    const [x, z, side] = key.split(','), kind = this.s.fences[key], b = this.world.batches, id = `e${key}`;
    if (!kind) { b.remove(id); return; }
    const X = +x * CELL, Z = +z * CELL;
    b.set(id, side === 'n' ? { model: kind, x: X + CELL / 2, z: Z, rot: 0 } : { model: kind, x: X, z: Z + CELL / 2, rot: Math.PI / 2 });
  }
  /** A ruin stays until its building stands somewhere in the village. */
  drawRuins() {
    for (const r of RUINS) {
      const id = `ruin:${r.kind}`, built = (this.s.counts[r.kind] ?? 0) > 0;
      if (!this.world.batches.has(id)) continue;
      if (built) this.world.batches.remove(id);
      else { const [w, d] = r.kind === 'school' ? [5, 4] : [4, 3]; this.world.batches.set(id, { model: id, x: (r.x + w / 2) * CELL, z: (r.z + d / 2) * CELL, rot: r.rot * Math.PI / 2 }); }
    }
  }
  sync() {
    if (!this.ready || !this.s) return;
    const b = this.world.batches;
    for (const id of [...b.items.keys()]) if (/^(p\d|c\d|e\d)/.test(id)) b.remove(id);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const t = this.s.cells[z * N + x]; if (t === 1 || t === 2) this.drawCell(x, z); }
    for (const id of Object.keys(this.s.placed)) this.drawPlaced(id);
    for (const key of Object.keys(this.s.fences)) this.drawEdge(key);
    this.drawRuins();
    this.world.ground.markAll();
  }
  apply(events) {
    if (!this.ready) return;
    for (const e of events) {
      if (e.type === 'cellChanged') this.drawCell(e.x, e.z);
      else if (e.type === 'placed' || e.type === 'moved' || e.type === 'stored') this.drawPlaced(e.id);
      else if (e.type === 'projectDone') this.drawRuins();
      else if (e.type === 'fenceChanged') this.drawEdge(`${e.x},${e.z},${e.side}`);
      else if (e.type === 'parcelBought' || e.type === 'loaded') this.sync();
    }
  }
}
