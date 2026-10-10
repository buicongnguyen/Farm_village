// The evening train (chapter 15, core/train.mjs): an engine and three wagons on the railway behind the quay. It rolls
// in from the east when a train arrives, waits behind the halt while the rules say it is there (a wagon shows its
// load once it is full), and pulls out to the west when it leaves. Steam from view/juice.mjs. Loaded with the village
// dressing; a handful of draws while it is in sight, none otherwise.
import * as THREE from 'three';
import { CELL, N, TRACK } from '../content/world.mjs';
import { loadKit, bake } from './models.mjs';
import { decorMaterial } from './backdrop.mjs';
import { trainOf, wagonFull } from '../core/train.mjs';

const GAP = 5.3, ARRIVE = 7, LEAVE = 9, FAR = 170, WAGONS = 3;   // metres between car centres; seconds in and out; how far off it starts
export class TrainView {
  constructor(world, game) {
    Object.assign(this, { world, game, phase: 'away', t: 0, puff: 0, group: null });
    this.load().catch(e => console.warn('train', e));
    game.on(r => {
      for (const e of r.events ?? []) {
        if (e.type === 'trainArrived') this.start('in');
        else if (e.type === 'trainLeft') this.start(this.phase === 'away' ? 'away' : 'out');
        else if (e.type === 'loaded') this.sync();
        else if (e.type === 'wagonLoaded') this.loads();
      }
    });
  }
  /** Where the middle of the train stops: behind the halt's lot. */
  stopX() { const p = Object.values(this.game.s.placed).find(x => x.kind === 'halt'); return p ? (p.x + 3) * CELL : N * CELL / 2; }
  async load() {
    const kit = await loadKit('decor'); if (!kit.train_engine || !kit.train_wagon) return;
    const mesh = node => new THREE.Mesh(bake(node, { center: false }), decorMaterial());
    const group = new THREE.Group(); group.name = 'train'; group.visible = false;
    const engine = mesh(kit.train_engine); engine.position.x = -GAP * 1.5; group.add(engine);
    this.wagons = Array.from({ length: WAGONS }, (_, i) => {
      const empty = mesh(kit.train_wagon), full = kit.train_wagon_full ? mesh(kit.train_wagon_full) : null;
      empty.position.x = (i - 0.5) * GAP; if (full) { full.position.x = empty.position.x; full.visible = false; group.add(full); }
      group.add(empty); return { empty, full };
    });
    group.position.z = (TRACK.z + 0.5) * CELL;
    this.world.scene.add(group); this.group = group;
    this.sync();
    this.world.onFrame(dt => this.frame(dt));
  }
  start(phase) { this.phase = phase; this.t = 0; if (this.group) { this.group.visible = phase !== 'away'; this.loads(); this.place(); } }
  /** Match the rules after loading a farm: a train that is at the halt stands there. */
  sync() { this.start(trainOf(this.game.s, this.game.now).here ? 'stop' : 'away'); }
  /** A full wagon shows its crates. */
  loads() {
    const here = this.game.s.train?.here;
    (this.wagons ?? []).forEach((w, i) => { const full = !!here?.wagons?.[i] && wagonFull(here.wagons[i]); if (w.full) { w.full.visible = full; w.empty.visible = !full; } });
  }
  place() {
    const g = this.group; if (!g) return;
    const p = this.phase === 'in' ? Math.min(1, this.t / ARRIVE) : this.phase === 'out' ? Math.min(1, this.t / LEAVE) : 0;
    const d = this.phase === 'in' ? FAR * (1 - p) ** 3 : this.phase === 'out' ? -FAR * p * p : 0;   // it brakes coming in, gathers speed going out
    g.position.x = this.stopX() + d;
  }
  frame(dt) {
    const g = this.group; if (!g || this.phase === 'away') return;
    this.t += dt;
    if (this.phase === 'in' && this.t >= ARRIVE) this.phase = 'stop';
    if (this.phase === 'out' && this.t >= LEAVE) { this.phase = 'away'; g.visible = false; return; }
    // the rules are the truth: a train that left while this tab slept is gone
    if (this.phase === 'stop' && !trainOf(this.game.s, this.game.now).here && !this.game.s.train?.here) { this.start('out'); return; }
    this.place();
    this.puff -= dt;
    if (this.puff <= 0 && !document.body.classList.contains('reduced-motion')) {
      this.puff = this.phase === 'stop' ? 0.7 : 0.16;
      this.world.juice?.smoke({ x: g.position.x - GAP * 1.5 - 1.55, y: 3.5, z: g.position.z }, this.phase === 'stop' ? 0.8 : 1.4);
    }
  }
}
