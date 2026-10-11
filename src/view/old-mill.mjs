// The old water mill on the brook (chapter 8; content/world.mjs OLD_MILL): scenery that stands from the start, its
// wheel still. When the sluice opens (s.firsts.sluice; the 'sluiceOpened' event when chapter 8's card is closed) the
// wheel turns for good and the brook runs fuller (view/brook.mjs setFull). Two draws; loaded with the village dressing.
import * as THREE from 'three';
import { OLD_MILL } from '../content/world.mjs';
import { loadKit, bake } from './models.mjs';
import { decorMaterial } from './backdrop.mjs';

// The wheel's hub in the mill's own frame (art/blender/build_farm_kit.py old_mill: WHEEL_X, WHEEL_Z, and the front wall).
const HUB = { x: 0.5, y: 1.2, z: 2.45 };
export class OldMill {
  constructor(world, game) {
    Object.assign(this, { world, game, speed: 0, target: 0 });
    this.load().catch(e => console.warn('old mill', e));
    game.on(r => { if (r.events?.some(e => e.type === 'sluiceOpened' || e.type === 'loaded')) this.sync(r.events.some(e => e.type === 'sluiceOpened')); });
  }
  get open() { return !!this.game.s.firsts?.sluice; }
  async load() {
    const kit = await loadKit('decor'); if (!kit.old_mill || !kit.old_mill_wheel) return;
    const body = new THREE.Mesh(bake(kit.old_mill, { center: false }), decorMaterial()); body.name = 'old-mill';
    body.position.set(OLD_MILL.x, 0, OLD_MILL.z); body.rotation.y = OLD_MILL.rot;
    const geo = bake(kit.old_mill_wheel, { center: false }); geo.computeBoundingBox(); const bb = geo.boundingBox;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);   // round its hub
    const wheel = new THREE.Mesh(geo, decorMaterial()); wheel.name = 'old-mill-wheel';
    const hub = new THREE.Vector3(HUB.x, HUB.y, HUB.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), OLD_MILL.rot);
    const pivot = new THREE.Group(); pivot.position.set(OLD_MILL.x + hub.x, hub.y, OLD_MILL.z + hub.z); pivot.rotation.y = OLD_MILL.rot; pivot.add(wheel);
    this.world.scene.add(body, pivot); this.body = body; this.wheel = wheel;
    this.sync(false);
    this.world.onFrame(dt => {
      if (document.body.classList.contains('reduced-motion')) return;
      this.speed += (this.target - this.speed) * Math.min(1, dt * 0.8);   // it creaks up to speed
      if (this.speed > 0.001) wheel.rotation.z += dt * this.speed;
    });
  }
  /** Match the sluice: the wheel's speed and the brook's fullness. `fresh`: it opened just now. */
  sync(fresh) {
    this.target = this.open ? 0.9 : 0;
    if (!fresh) this.speed = this.target;
    this.world.brook?.setFull?.(this.open ? 1 : 0);
  }
}
