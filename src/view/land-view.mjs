// Draws the rules state on the map: cell colours, weeds and rocks, everything placed, fences on edges.
// sync() rebuilds from scratch (after loading); apply(events) updates only what an action changed.
import { N, CELL, ORDER_BOARD } from '../content/world.mjs';
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
  async load() {
    const kits = {};
    for (const spec of Object.values(KIND_MODELS)) kits[spec.kit] ??= await loadKit(spec.kit);
    for (const [name, spec] of Object.entries(KIND_MODELS)) {
      if (this.world.batches.has(name)) continue;
      const geo = fit(bake(kits[spec.kit][spec.node]), spec.width ? { width: spec.width } : { height: spec.height });
      this.world.batches.register(name, { geo, mid: spec.lod === 'static' ? geo : simplify(geo), kind: spec.lod, color: averageColor(geo) });
    }
    this.geometries = name => this.world.batches.models.get(name)?.geo;
    this.world.batches.set('order_board', { model: 'order_board', x: (ORDER_BOARD.x + 0.5) * CELL, z: (ORDER_BOARD.z + 0.5) * CELL, rot: Math.PI / 2 });
    this.ready = true; this.sync();
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
  sync() {
    if (!this.ready || !this.s) return;
    const b = this.world.batches;
    for (const id of [...b.items.keys()]) if (/^(p\d|c\d|e\d)/.test(id)) b.remove(id);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const t = this.s.cells[z * N + x]; if (t === 1 || t === 2) this.drawCell(x, z); }
    for (const id of Object.keys(this.s.placed)) this.drawPlaced(id);
    for (const key of Object.keys(this.s.fences)) this.drawEdge(key);
    this.world.ground.markAll();
  }
  apply(events) {
    if (!this.ready) return;
    for (const e of events) {
      if (e.type === 'cellChanged') this.drawCell(e.x, e.z);
      else if (e.type === 'placed' || e.type === 'moved' || e.type === 'stored') this.drawPlaced(e.id);
      else if (e.type === 'fenceChanged') this.drawEdge(`${e.x},${e.z},${e.side}`);
      else if (e.type === 'parcelBought' || e.type === 'loaded') this.sync();
    }
  }
}
