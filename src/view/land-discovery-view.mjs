// One local clue remains covered after buying useful land. Existing art only; no placement or reward side effects.
import { CELL } from '../content/world.mjs';
import { landBranchStatus } from '../core/land-discovery.mjs';

const IDS = ['land-clue:marker', 'land-clue:cover', 'land-clue:grass'];
export class LandDiscoveryView {
  constructor(world, game) {
    Object.assign(this, { world, game, site: null, key: null });
    this.unsubscribe = game.on(() => this.sync());
    this.sync();
  }
  sync() {
    const status = landBranchStatus(this.game.s), site = status.site;
    const found = !!status.found;
    const key = site ? `${site.parcel}:${site.x}:${site.z}:${found}` : '';
    if (key === this.key) return;
    this.key = key; this.site = site;
    const batches = this.world.batches;
    for (const id of IDS) batches.remove(id);
    if (!site) return;
    const x = (site.x + 0.5) * CELL, z = (site.z + 0.5) * CELL;
    // A reused wooden fence post stands in for the old planting marker; a bush and grass cover its base until inspected.
    batches.set(IDS[0], { model: 'fence:post', x, z, rot: 0, scale: 0.7 });
    if (!found) {
      batches.set(IDS[1], { model: 'weeds2', x: x + 0.3, z: z + 0.15, rot: 0, scale: 0.8 });
      batches.set(IDS[2], { model: 'weeds', x: x - 0.25, z: z + 0.25, rot: 0, scale: 0.8 });
    }
  }
  pick(cell) {
    this.sync();
    return cell && this.site && cell.x === this.site.x && cell.z === this.site.z ? this.site.parcel : null;
  }
  dispose() { this.unsubscribe?.(); for (const id of IDS) this.world.batches.remove(id); this.site = null; }
}
