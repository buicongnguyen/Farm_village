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
import { rentWaiting } from '../core/homes.mjs';
import { truckCoins } from '../core/market.mjs';
import { MAILBOX, POND_DOCK } from '../content/world.mjs';

const CAP = 160, SIZE = 7;
function alertTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#e8382f'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 38px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sparkleTexture() {   // a four-point white glint
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.translate(32, 32); g.fillStyle = '#fff';
  g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 30; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function backingTexture() {   // a soft dark-brown disc behind each coin, so gold reads on golden wheat, sand and bright fruit
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 14, 32, 32, 31); r.addColorStop(0, 'rgba(74,42,18,.62)'); r.addColorStop(0.72, 'rgba(74,42,18,.5)'); r.addColorStop(1, 'rgba(74,42,18,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
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
    this.coin = cloud(coin); this.alert = cloud(alertTexture()); this.glint = cloud(sparkleTexture()); this.glint.material.blending = THREE.AdditiveBlending;
    this.glint.material.color.set('#ffe9a8');   // a warm glint: gold light, not white
    this.backing = cloud(backingTexture()); this.backing.renderOrder = 19;
    world.scene.add(this.backing, this.coin, this.alert, this.glint);
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
      else if (def.market) ready = !!s.truck && truckCoins(s) > 0;
      else if (def.fruitStand) ready = (s.fruitStand?.coins ?? 0) > 0;
      else if (def.stall) ready = (s.stall?.coins ?? 0) > 0;
      if (ready) coin.push([x, high, z]);
    }
    if ((s.fishing?.coins ?? 0) > 0 || (s.fishing?.line && s.fishing.line.doneAt <= now)) coin.push([(POND_DOCK.x + 0.5) * CELL, 2.2, (POND_DOCK.z + 0.5) * CELL]);   // the village pond
    if (rentWaiting(s, now) >= 10) coin.push([(MAILBOX.x + 0.5) * CELL, 2.2, (MAILBOX.z + 0.5) * CELL]);   // rent waiting in the mailbox
    return { coin, alert };
  }
  frame(dt, now) {
    if (this.hidden) { this.coin.visible = this.alert.visible = this.glint.visible = this.backing.visible = false; return; }   // (the lighting checks measure the world alone)
    this.acc += dt; if (this.acc > 0.4 || !this.list.coin.length && !this.list.alert.length && this.acc > 0.1) { this.acc = 0; this.list = this.collect(); }
    const t = document.body.classList.contains('reduced-motion') ? 0 : performance.now() / 1000;
    const dim = 1 - 0.5 * (this.world.daylight?.nightness ?? 0);   // markers soften at night
    for (const pts of [this.coin, this.alert]) pts.material.color.setScalar(dim);
    this.glint.material.color.set('#ffe9a8').multiplyScalar(dim);
    for (const [key, pts] of [['coin', this.coin], ['alert', this.alert]]) {
      const list = this.list[key], arr = pts.geometry.attributes.position.array, n = Math.min(CAP, list.length);
      for (let i = 0; i < n; i++) { const [x, y, z] = list[i]; arr[i * 3] = x; arr[i * 3 + 1] = y + 0.18 * Math.sin(t * 3 + i * 1.7); arr[i * 3 + 2] = z; }
      pts.geometry.attributes.position.needsUpdate = true; pts.geometry.setDrawRange(0, n); pts.visible = n > 0; pts.userData.n = n;
      pts.material.size = SIZE * this.world.renderer.getPixelRatio() * (key === 'coin' ? 1 + 0.1 * Math.sin(t * 6) : 1);
    }
    // the backing disc follows every coin (same bob), a little bigger
    { const bk = this.backing, ba = bk.geometry.attributes.position.array, bn = Math.min(CAP, this.list.coin.length);
      for (let i = 0; i < bn; i++) { const [x, y, z] = this.list.coin[i]; ba[i * 3] = x; ba[i * 3 + 1] = y + 0.18 * Math.sin(t * 3 + i * 1.7); ba[i * 3 + 2] = z; }
      bk.geometry.attributes.position.needsUpdate = true; bk.geometry.setDrawRange(0, bn); bk.visible = bn > 0; bk.material.size = SIZE * 1.55 * this.world.renderer.getPixelRatio(); }
    // the shine: a glint twinkling at the coins' upper right, each out of step with the next
    const g = this.glint, ga = g.geometry.attributes.position.array, cn = Math.min(CAP, this.list.coin.length);
    for (let i = 0; i < cn; i++) { const [x, y, z] = this.list.coin[i]; ga[i * 3] = x + 0.18; ga[i * 3 + 1] = y + 0.18 + 0.18 * Math.sin(t * 3 + i * 1.7); ga[i * 3 + 2] = z; }
    g.geometry.attributes.position.needsUpdate = true; g.geometry.setDrawRange(0, cn); g.visible = cn > 0;
    g.material.size = SIZE * 0.9 * this.world.renderer.getPixelRatio() * Math.max(0.15, 0.5 + 0.5 * Math.sin(t * 4.5));
  }
}
