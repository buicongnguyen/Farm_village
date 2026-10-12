// Floating markers over things that want the player (PLAN-v0.3b): a bobbing gold coin over anything ready to collect
// (ripe crops and fruit, eggs and milk, finished goods, the market truck's takings) and a red "!" over anything broken.
// Two THREE.Points clouds, so every marker costs no more than one draw call each.
import { ICONS, SMALL_ICONS } from '../content/icons.mjs';
import { produceOf } from '../core/surprises.mjs';
import { rushActive } from '../core/surprises.mjs';
import * as THREE from 'three';
import { CELL } from '../content/world.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { animalState } from '../core/animals.mjs';
import { treeState } from '../core/trees.mjs';
import { readyCount } from '../core/production.mjs';
import { isBroken } from '../core/working.mjs';
import { rentWaiting } from '../core/homes.mjs';
import { truckCoins } from '../core/market.mjs';
import { brookZ, MAILBOX, POND_DOCK, SITES, RUINS, COOPERATIVE_BOARD, FAIR_BOARD, ALBRIGHT, QUAY, LOTS, PARCEL } from '../content/world.mjs';
import { currentStep, TAIL } from '../core/projects.mjs';
import { buyableParcels } from '../core/build.mjs';

/** Where the story's current step is worked on, in metres [x, y, z], or null: a blue star floats there. Only steps of
 *  the checklist (after the clinic), and never an optional one: the star always means "the story goes on here". */
export function storySpot(s) {
  const step = currentStep(s); return !step || s.projects.step < TAIL || step.optional ? null : stepSpot(s, step);
}
/** Where a step of Village projects is worked on, in metres, or null when it has no one place. `any`: also a thing that
 *  is built already and an early step's building (the panel's "where is this" tap), not only what the star marks. */
export function stepSpot(s, step, any = false) {
  const cell = (x, z, y = 4.6) => [x * CELL, y, z * CELL];
  const placed = kind => { const p = Object.values(s.placed).find(q => q.kind === kind); if (!p) return null; const [w, d] = footprint(kind, p.rot); return cell(p.x + w / 2, p.z + d / 2, 6); };
  const site = kind => { const st = SITES.find(x => x.kind === kind) ?? RUINS.find(x => x.kind === kind); if (!st) return null; const [w, d] = st.size ?? footprint(kind, st.rot ?? 0); return cell(st.x + w / 2, st.z + d / 2, 5.2); };
  const lot = kind => placed(kind) ?? (() => { const taken = new Set(Object.values(s.placed).map(p => p.lot).filter(Boolean)), free = LOTS.find(l => !taken.has(l.id)); return free ? cell(free.x + free.w / 2, free.z + free.d / 2, 4) : null; })();
  switch (step.id) {
    case 'market_day': return placed('market');
    case 'third_field': { const next = buyableParcels(s)[0]; return next ? cell(next.x + PARCEL / 2, next.z + PARCEL / 2, 4) : null; }
    case 'juice': return placed('juice_press'); case 'noodles': return placed('noodle_factory');
    case 'police': case 'dock': case 'company': case 'stage': return placed(step.id) ? (any ? placed(step.id) : null) : site(step.id);
    case 'first_contract': return placed('company');
    case 'harvest_festival': return placed('stage');
    case 'albright': return s.story?.albright ? null : cell(ALBRIGHT.stand[0] + 0.5, ALBRIGHT.stand[1] + 0.5, 3.4);
    case 'cooperative': case 'cooperative_order': return cell(COOPERATIVE_BOARD.x + 0.5, COOPERATIVE_BOARD.z + 0.5, 3.6);
    case 'quay': return cell((QUAY.x0 + QUAY.x1 + 1) / 2, (QUAY.z0 + QUAY.z1 + 1) / 2, 3.4);
    case 'quay_house': return lot('apartment'); case 'hotel': case 'ten_guests': return lot('hotel'); case 'halt': case 'first_train': return lot('halt');
    case 'valley_company': return placed('company');
    case 'valley_fair': return cell(FAIR_BOARD.x + 0.5, FAIR_BOARD.z + 0.5, 3.8);
    case 'anglers': return any ? cell(POND_DOCK.x + 0.5, POND_DOCK.z + 0.5, 3) : null;
    default: { if (!any) return null; const kind = step.site ?? step.builds?.find(k => !['path', 'bed', 'fence', 'gate'].includes(k)); return kind ? placed(kind) ?? site(kind) : null; }   // hands, the walk upriver (a pill leads to Grandpa Oak), the green goals, the billion: no one place
  }
}
function storyTexture() {   // a blue disc with a white star: "the story goes on here"
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#2f8fe8'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill(); g.stroke();
  g.translate(32, 33); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 8 : 18; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const CAP = 160, SIZE = 7, BADGE = 6.4;   // BADGE: a ready badge's size against a coin's
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
/** A ready thing's badge: what is ready, in a cream disc with a gold ring (our own rendered icon; the ring alone until
 *  the picture has loaded). One texture for each good, made the first time it is needed. */
const badges = new Map();
function badgeTexture(good) {
  if (badges.has(good)) return badges.get(good);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = img => {
    g.clearRect(0, 0, 128, 128);
    g.beginPath(); g.arc(64, 68, 54, 0, Math.PI * 2); g.fillStyle = 'rgba(60,36,12,.28)'; g.fill();                 // a soft shadow under the disc
    const fill = g.createRadialGradient(52, 46, 6, 64, 62, 56); fill.addColorStop(0, '#ffffff'); fill.addColorStop(1, '#ffeec2');
    g.beginPath(); g.arc(64, 62, 52, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
    g.lineWidth = 8; g.strokeStyle = '#f2b02a'; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = '#b9791a'; g.beginPath(); g.arc(64, 62, 56, 0, Math.PI * 2); g.stroke();
    if (img) g.drawImage(img, 26, 24, 76, 76);
    g.beginPath(); g.ellipse(48, 34, 22, 9, -0.5, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();   // a gloss on the upper left
    tex.needsUpdate = true;
  };
  draw(null);
  const url = SMALL_ICONS[good] ?? ICONS[good];
  if (url) { const img = new Image(); img.onload = () => draw(img); img.src = url; }
  badges.set(good, tex); return tex;
}
function cloud(map) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 3), 3));
  const mat = new THREE.PointsMaterial({ map, size: SIZE, sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false, alphaTest: 0.05 });
  const pts = new THREE.Points(geo, mat); pts.renderOrder = 20; pts.frustumCulled = false; pts.userData.n = 0; pts.visible = false; return pts;
}
export class Marks {
  constructor(world, game, land) {
    Object.assign(this, { world, game, land, acc: 0, list: { coin: [], money: [], badge: {}, alert: [], story: [] }, badge: new Map() });
    const coin = new THREE.TextureLoader().load('./assets/icons/ui-coin.webp'); coin.colorSpace = THREE.SRGBColorSpace;
    this.coin = cloud(coin); this.alert = cloud(alertTexture()); this.glint = cloud(sparkleTexture()); this.glint.material.blending = THREE.AdditiveBlending;
    this.glint.material.color.set('#ffe9a8');   // a warm glint: gold light, not white
    this.backing = cloud(backingTexture()); this.backing.renderOrder = 19;
    this.story = cloud(storyTexture());
    this.gold = cloud(this.glint.material.map); this.gold.material.blending = THREE.AdditiveBlending; this.gold.material.color.set('#ffd866');
    world.scene.add(this.backing, this.coin, this.alert, this.glint, this.story, this.gold);
    world.onFrame?.((dt, now) => this.frame(dt, now));
  }
  /** Where every marker belongs right now: { coin: [[x, y, z]], alert: [...] } (also read by the tests). */
  collect() {
    const s = this.game.s, now = this.game.now, coin = [], alert = [], money = [], badge = {};
    // a product that is ready shows itself (its icon in a badge); money that waits shows a coin
    const mark = (good, at) => { coin.push(at); if (good && (SMALL_ICONS[good] ?? ICONS[good])) (badge[good] ??= []).push(at); else money.push(at); };
    for (const [id, p] of Object.entries(s.placed)) {
      const def = BUILDINGS[p.kind]; if (!def) continue;
      const [w, d] = footprint(p.kind, p.rot), x = (p.x + w / 2) * CELL, z = (p.z + d / 2) * CELL, high = p.kind === 'bed' ? 1.7 : def.fruit ? 3.6 : 4.2;
      if (isBroken(s, id) && !s.repairing?.[id]) { alert.push([x, high + 0.4, z]); continue; }
      let ready = false, good = null;
      if (p.kind === 'bed') { ready = !!s.beds[id] && s.beds[id].doneAt <= now; good = s.beds[id]?.crop; }
      else if (def.fruit) { const st = treeState(s, id, now); ready = st?.state === 'ripe'; good = st?.fruit; }
      else if (def.animals) { const an = (s.animals[id] ?? []).find(a => animalState(a, now) === 'ready'); ready = !!an; good = an ? produceOf(an) : null; }
      else if (def.produces) { const job = s.production?.[id]?.queue?.find(j => j.doneAt <= now); ready = readyCount(s, id, now) > 0; good = job?.recipe; }
      else if (def.pond) ready = (s.fishing?.coins ?? 0) > 0 || (!!s.fishing?.line && s.fishing.line.doneAt <= now);
      else if (def.market) ready = !!s.truck && truckCoins(s) > 0;
      else if (def.fruitStand) ready = (s.fruitStand?.coins ?? 0) > 0;
      else if (def.stall) ready = (s.stall?.coins ?? 0) > 0;
      if (ready) mark(good, [x, high + (good ? 0.5 : 0), z]);
    }
    if ((s.fishing?.coins ?? 0) > 0 || (s.fishing?.line && s.fishing.line.doneAt <= now)) mark(null, [(POND_DOCK.x + 0.5) * CELL, 2.2, (POND_DOCK.z + 0.5) * CELL]);   // the village pond
    if (rentWaiting(s, now) >= 10) mark(null, [(MAILBOX.x + 0.5) * CELL, 2.2, (MAILBOX.z + 0.5) * CELL]);   // rent waiting in the mailbox
    const spot = storySpot(s);
    // a gold rush: glints all along the brook (core/surprises.mjs)
    const gold = rushActive(s, now) ? Array.from({ length: 90 }, (_, i) => { const x = 10 + i * 1.25; return [(x + 0.5) * CELL, 0.5, (brookZ(Math.round(x)) + ((i * 7) % 5) * 0.5 - 1 + 0.5) * CELL]; }) : [];
    return { coin, money, badge, alert, story: spot ? [spot] : [], gold };
  }
  frame(dt, now) {
    if (this.hidden) { this.coin.visible = this.alert.visible = this.glint.visible = this.backing.visible = this.story.visible = this.gold.visible = false; for (const b of this.badge.values()) b.visible = false; return; }   // (the lighting checks measure the world alone)
    this.acc += dt; if (this.acc > 0.4 || !this.list.coin.length && !this.list.alert.length && this.acc > 0.1) { this.acc = 0; this.list = this.collect(); }
    const t = document.body.classList.contains('reduced-motion') ? 0 : performance.now() / 1000;
    const dim = 1 - 0.5 * (this.world.daylight?.nightness ?? 0);   // markers soften at night
    for (const pts of [this.coin, this.alert, this.story]) pts.material.color.setScalar(dim);
    this.glint.material.color.set('#ffe9a8').multiplyScalar(dim);
    for (const [key, pts] of [['money', this.coin], ['alert', this.alert], ['story', this.story]]) {
      const list = this.list[key] ?? [], arr = pts.geometry.attributes.position.array, n = Math.min(CAP, list.length);
      for (let i = 0; i < n; i++) { const [x, y, z] = list[i]; arr[i * 3] = x; arr[i * 3 + 1] = y + 0.18 * Math.sin(t * 3 + i * 1.7); arr[i * 3 + 2] = z; }
      pts.geometry.attributes.position.needsUpdate = true; pts.geometry.setDrawRange(0, n); pts.visible = n > 0; pts.userData.n = n;
      pts.material.size = SIZE * this.world.renderer.getPixelRatio() * (key === 'money' ? 1 + 0.1 * Math.sin(t * 6) : key === 'story' ? 7 + 0.5 * Math.sin(t * 4) : 1);
    }
    { const gp = this.gold, list = this.list.gold ?? [], arr = gp.geometry.attributes.position.array, n = Math.min(CAP, list.length);
      for (let i = 0; i < n; i++) { arr[i * 3] = list[i][0]; arr[i * 3 + 1] = list[i][1]; arr[i * 3 + 2] = list[i][2]; }
      gp.geometry.attributes.position.needsUpdate = true; gp.geometry.setDrawRange(0, n); gp.visible = n > 0;
      gp.material.size = SIZE * 4.2 * this.world.renderer.getPixelRatio() * Math.max(0.35, 0.7 + 0.3 * Math.sin(t * 5.5)); }
    // the badges: one cloud for each good that is ready somewhere (made when first needed, hidden when none is)
    const ready = this.list.badge ?? {};
    for (const [good, pts] of this.badge) if (!ready[good]?.length) pts.visible = false;
    for (const [good, list] of Object.entries(ready)) {
      let pts = this.badge.get(good); if (!pts) { pts = cloud(badgeTexture(good)); pts.renderOrder = 21; this.world.scene.add(pts); this.badge.set(good, pts); }
      const arr = pts.geometry.attributes.position.array, n = Math.min(CAP, list.length);
      for (let i = 0; i < n; i++) { const [x, y, z] = list[i]; arr[i * 3] = x; arr[i * 3 + 1] = y + 0.2 * Math.sin(t * 2.6 + i * 1.7 + x); arr[i * 3 + 2] = z; }
      pts.geometry.attributes.position.needsUpdate = true; pts.geometry.setDrawRange(0, n); pts.visible = n > 0; pts.userData.n = n;
      pts.material.color.setScalar(dim); pts.material.size = SIZE * BADGE * this.world.renderer.getPixelRatio() * (1 + 0.05 * Math.sin(t * 5));
    }
    // the backing disc follows every coin (same bob), a little bigger
    { const bk = this.backing, ba = bk.geometry.attributes.position.array, bn = Math.min(CAP, (this.list.money ?? []).length);
      for (let i = 0; i < bn; i++) { const [x, y, z] = (this.list.money ?? [])[i]; ba[i * 3] = x; ba[i * 3 + 1] = y + 0.18 * Math.sin(t * 3 + i * 1.7); ba[i * 3 + 2] = z; }
      bk.geometry.attributes.position.needsUpdate = true; bk.geometry.setDrawRange(0, bn); bk.visible = bn > 0; bk.material.size = SIZE * 1.55 * this.world.renderer.getPixelRatio(); }
    // the shine: a glint twinkling at the coins' upper right, each out of step with the next
    const g = this.glint, ga = g.geometry.attributes.position.array, cn = Math.min(CAP, (this.list.money ?? []).length);
    for (let i = 0; i < cn; i++) { const [x, y, z] = (this.list.money ?? [])[i]; ga[i * 3] = x + 0.18; ga[i * 3 + 1] = y + 0.18 + 0.18 * Math.sin(t * 3 + i * 1.7); ga[i * 3 + 2] = z; }
    g.geometry.attributes.position.needsUpdate = true; g.geometry.setDrawRange(0, cn); g.visible = cn > 0;
    g.material.size = SIZE * 0.9 * this.world.renderer.getPixelRatio() * Math.max(0.15, 0.5 + 0.5 * Math.sin(t * 4.5));
  }
}
