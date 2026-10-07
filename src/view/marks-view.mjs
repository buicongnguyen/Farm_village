// Floating markers over things that want the player (PLAN-v0.3b): a bobbing gold coin over anything ready to collect
// (ripe crops and fruit, eggs and milk, finished goods, the market truck's takings) and a red "!" over anything broken.
// Two THREE.Points clouds, so every marker costs no more than one draw call each.
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { animalState } from '../core/animals.mjs';
import { treeState } from '../core/trees.mjs';
import { readyCount } from '../core/production.mjs';
import { isBroken } from '../core/working.mjs';

const CAP = 160, SIZE = 20;
function alertTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#e8382f'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 38px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cloud(map) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3));
  const mat = new THREE.PointsMaterial({ map, size: SIZE, sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false, alphaTest: 0.05 });
  const pts = new THREE.Points(geo, mat); pts.renderOrder = 20; pts.frustumCulled = false; pts.userData.n = 0; pts.visible = false; return pts;
}
export class Marks {
  constructor(world, game, land) {
    Object.assign(this, { world, game, land, acc: 0, list: { coin: [], alert: [] } });
    const coin = new THREE.TextureLoader().load('./assets/icons/ui-coin.webp'); coin.colorSpace = THREE.SRGBColorSpace;
    this.coin = cloud(coin); this.alert = cloud(alertTexture());
    world.scene.add(this.coin, this.alert);
    world.onFrame?.((dt, now) => this.frame(dt, now));
  }
  /** Where every marker belongs right now: { coin: [[x, y, z]], alert: [...] } (also read by the tests). */
  collect() {
    const s = this.game.s, now = this.game.now, coin = [], alert = [];
    for (const [id, p] of Object.entries(s.placed)) {
      const def = BUILDINGS[p.kind]; if (!def) continue;
      const [w, d] = footprint(p.kind, p.rot), x = (p.x + w / 2) * CELL, z = (p.z + d / 2) * CELL, high = p.kind === 'bed' ? 1.7 : def.fruit ? 3.6 : 4.2;
      if (isBroken(s, id) && !s.repairing?.[id]) { alert.push([x, high + 0.4, z]); continue; }
      let ready = false;
      if (p.kind === 'bed') ready = !!s.beds[id] && s.beds[id].doneAt <= now;
      else if (def.fruit) ready = treeState(s, id, now)?.state === 'ripe';
      else if (def.animals) ready = (s.animals[id] ?? []).some(a => animalState(a, now) === 'ready');
      else if (def.produces) ready = readyCount(s, id, now) > 0;
      else if (def.pond) ready = (s.fishing?.coins ?? 0) > 0 || (!!s.fishing?.line && s.fishing.line.doneAt <= now);
      else if (def.market) ready = (s.truck?.coins ?? 0) > 0;
      else if (def.stall) ready = (s.stall?.coins ?? 0) > 0;
      if (ready) coin.push([x, high, z]);
    }
    return { coin, alert };
  }
  frame(dt, now) {
    this.acc += dt; if (this.acc > 0.4 || !this.list.coin.length && !this.list.alert.length && this.acc > 0.1) { this.acc = 0; this.list = this.collect(); }
    const t = document.body.classList.contains('reduced-motion') ? 0 : performance.now() / 1000;
    for (const [key, pts] of [['coin', this.coin], ['alert', this.alert]]) {
      const list = this.list[key], arr = pts.geometry.attributes.position.array, n = Math.min(CAP, list.length);
      for (let i = 0; i < n; i++) { const [x, y, z] = list[i]; arr[i * 3] = x; arr[i * 3 + 1] = y + 0.18 * Math.sin(t * 3 + i * 1.7); arr[i * 3 + 2] = z; }
      pts.geometry.attributes.position.needsUpdate = true; pts.geometry.setDrawRange(0, n); pts.visible = n > 0; pts.userData.n = n;
      pts.material.size = SIZE * this.world.renderer.getPixelRatio();
    }
  }
}
