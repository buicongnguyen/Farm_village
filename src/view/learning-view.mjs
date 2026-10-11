// AR-013 stages within the reserved farmhouse lot. Only core actions uncover/repair the project.
import { LEARNING_SITE } from '../content/learning-site.mjs';
import { learningStatus } from '../core/learning.mjs';

const IDS = ['learning:frame', 'learning:cover', 'learning:trays'];
export class LearningView {
  constructor(world, game, ready) {
    Object.assign(this, { world, game, key: null, visible: false });
    this.unsubscribe = game.on(() => this.sync());
    this.sync();
    ready?.then(() => { if (!this.disposed) this.sync(); });
  }
  sync() {
    if (this.disposed) return;
    const status = learningStatus(this.game.s, this.game.now), batches = this.world.batches;
    this.visible = status.eligible || status.introduced;
    const model = status.complete ? 'potting_bench_done' : status.steps.length ? 'potting_bench_repaired' : 'potting_bench_overgrown';
    const delivered = batches.has(model);
    // A stage is redrawn when its late model arrives even if no game action changes progress.
    const key = `${this.visible}:${status.steps.length}:${delivered}:${batches.has('flowerpot')}`;
    if (key === this.key) return;
    this.key = key;
    for (const id of IDS) batches.remove(id);
    if (!this.visible) return;
    const { worldX: x, worldZ: z, rotation: rot } = LEARNING_SITE;
    if (delivered) { batches.set(IDS[0], { model, x, z, rot }); return; }
    // The first-frame and failed-download fallback remains usable, with the identical world target.
    batches.set(IDS[0], { model: 'bench', x, z, rot });
    if (!status.steps.length) batches.set(IDS[1], { model: 'weeds2', x: x + .3, z: z + .2, rot: 0, scale: .8 });
    if (status.complete && batches.has('flowerpot')) batches.set(IDS[2], { model: 'flowerpot', x: x - .5, z: z + .5, rot: 0, scale: .65 });
  }
  pick(cell) {
    this.sync();
    return !!cell && this.visible && cell.x === LEARNING_SITE.x && cell.z === LEARNING_SITE.z;
  }
  dispose() { this.disposed = true; this.unsubscribe?.(); for (const id of IDS) this.world.batches.remove(id); }
}
