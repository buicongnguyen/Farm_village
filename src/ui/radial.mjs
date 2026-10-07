// Tap something on the farm (outside build mode) and its actions appear around the finger (DESIGN 16): plant, harvest,
// feed, collect, buy, clear. Choosing plant or harvest arms a "sweep": drag across other beds, or tap them, to do the same.
import { t, num } from '../kit/i18n.mjs';
import { CROPS, ANIMALS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { CLEAR } from '../content/economy.mjs';
import { ORDER_BOARD, BARN, FARMHOUSE, MAILBOX } from '../content/world.mjs';
import { rentWaiting } from '../core/homes.mjs';
import { occupant, cellType, penOf } from '../core/grid.mjs';
import { plantPrice } from '../core/farm.mjs';
import { animalPrice, animalState } from '../core/animals.mjs';
import * as barn from '../core/barn.mjs';
import { shortTime } from '../core/clock.mjs';

const near = (cell, spot, r) => Math.abs(cell.x - spot.x) <= r && Math.abs(cell.z - spot.z) <= r;
export class Radial {
  constructor(root, { game, world, panels, hud, people }) {
    Object.assign(this, { game, world, panels, hud, people, armed: null, armedUntil: 0, swept: new Set() });
    this.el = document.createElement('div'); this.el.className = 'radial'; this.el.hidden = true;
    root.appendChild(this.el);
    this.el.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) this.choose(b.dataset); });
    // drag across beds while a sweep is armed: the camera hands the drag to us instead of panning
    world.cam.dragHook = {
      start: (x, y) => { const id = this.bedAt(x, y); if (!this.isArmed() || !id || !this.applies(id)) return false; this.hide(); this.swept = new Set(); this.sweepBed(id); return true; },
      move: (x, y) => { const id = this.bedAt(x, y); if (id) this.sweepBed(id); },
      end: () => { this.armedUntil = performance.now() + 6000; },
    };
  }
  get s() { return this.game.s; }
  isArmed() { return this.armed && performance.now() < this.armedUntil; }
  bedAt(x, y) { const c = this.world.cellAt(x, y); const id = c && occupant(this.s, c.x, c.z); return id && this.s.placed[id]?.kind === 'bed' ? id : null; }
  applies(id) {
    const b = this.s.beds[id], now = this.game.now;
    return this.armed?.action === 'plant' ? !b : this.armed?.action === 'harvest' ? !!b && b.doneAt <= now : false;
  }
  sweepBed(id) {
    if (this.swept.has(id) || !this.applies(id)) return;
    this.swept.add(id);
    const r = this.armed.action === 'plant' ? this.game.do('plant', { id, crop: this.armed.crop }) : this.game.do('harvest', { id });
    if (!r.ok) this.armed = null;
    this.armedUntil = performance.now() + 6000;
  }
  hide() { this.el.hidden = true; this.target = null; }
  /** A tap on the map outside build mode. */
  tap(cell, x, y) {
    if (!cell) { this.hide(); return; }
    const s = this.s, id = occupant(s, cell.x, cell.z), now = this.game.now;
    if (id && s.placed[id].kind === 'bed' && this.isArmed() && this.applies(id)) { this.swept = new Set(); this.sweepBed(id); return; }
    const who = !id && this.people?.pick(x, y); if (who) { this.hide(); this.people.talk(who); return; }
    const p = id && s.placed[id], def = p && BUILDINGS[p.kind];
    let buttons = [], info = '';
    if (p?.kind === 'bed') {
      const b = s.beds[id];
      if (!b) buttons = Object.entries(CROPS).filter(([, c]) => c.level <= s.level).map(([c, def]) => {
        const price = plantPrice(s, c), have = barn.stock(s, c);
        return { act: 'plant', crop: c, icon: def.icon, label: def.free ? t('Free') : have ? `×${have}` : `🪙 ${price}` };
      });
      else if (b.doneAt <= now) { const all = Object.keys(s.beds).filter(k => s.beds[k].doneAt <= now).length; buttons = [{ act: 'harvest', icon: '🧺', label: t('Harvest') }, ...(all > 1 ? [{ act: 'harvestAll', icon: '🌾', label: t('All ({count})', { count: all }) }] : [])]; }
      else info = `${CROPS[b.crop].icon} ${shortTime(b.doneAt - now)}`;
    } else if (def?.produces) { this.hide(); this.panels.show('production', id); return; }
    else if (def?.stall) { this.hide(); this.panels.show('stall'); return; }
    else if (def?.home) { this.hide(); this.panels.show('cottage', id); return; }
    else if (p?.kind === 'school') info = t('The school is open!');
    else if (def?.animals) {
      const list = s.animals[id] ?? [], kind = def.animals, a = ANIMALS[kind], pen = penOf(s, id);
      const hungry = list.filter(x => animalState(x, now) === 'hungry').length, ready = list.filter(x => animalState(x, now) === 'ready').length;
      if (ready) buttons.push({ act: 'collect', icon: '🧺', label: t('Collect ({count})', { count: ready }) });
      if (hungry) buttons.push({ act: 'feed', icon: a.eats === 'chicken_feed' ? '🌰' : '🫘', label: t('Feed ({count})', { count: hungry }) });
      if (list.length < a.perHome) buttons.push({ act: 'buyAnimal', icon: kind === 'hen' ? '🐔' : '🐄', label: animalPrice(s, kind) ? `🪙 ${num(animalPrice(s, kind))}` : t('Free') });
      info = pen.closed ? `${t(a.name)} ${list.length}/${a.perHome}` : t(pen.reason ?? 'The fence has a gap');
    } else if (!id && ['weeds', 'rock'].includes(cellType(s, cell.x, cell.z))) buttons = [{ act: 'clear', icon: '🧹', label: `🪙 ${CLEAR[cellType(s, cell.x, cell.z)]}` }];
    else if (!id && near(cell, MAILBOX, 1)) { const rent = rentWaiting(s, now); if (rent) buttons = [{ act: 'collectRent', icon: '📬', label: `🪙 ${num(rent)}` }]; else info = t('The mailbox is empty'); }
    else if (!id && near(cell, ORDER_BOARD, 1)) { this.hide(); this.panels.show('orders'); return; }
    else if (!id && near(cell, BARN, 4)) { this.hide(); this.panels.show('barn'); return; }
    else if (!id && near(cell, FARMHOUSE, 4)) info = t('Your farmhouse');
    if (!buttons.length && !info) { this.hide(); return; }
    this.target = { id, cell };
    const r = Math.max(62, 28 + buttons.length * 9);
    this.el.innerHTML = (info ? `<div class="radial-info">${info}</div>` : '') + buttons.map((b, i) => {
      const a = -Math.PI / 2 + (i - (buttons.length - 1) / 2) * 0.9, bx = Math.cos(a) * r, by = Math.sin(a) * r;
      return `<button class="radial-btn" style="transform:translate(${bx}px,${by}px)" data-act="${b.act}"${b.crop ? ` data-crop="${b.crop}"` : ''}><span>${b.icon}</span><small>${b.label}</small></button>`;
    }).join('');
    const margin = r + 40;
    this.el.style.left = `${Math.min(innerWidth - margin, Math.max(margin, x))}px`; this.el.style.top = `${Math.min(innerHeight - margin, Math.max(margin + 20, y))}px`;
    this.el.hidden = false;
  }
  choose(d) {
    const g = this.game, { id, cell } = this.target ?? {}; this.hide();
    if (d.act === 'plant') { this.armed = { action: 'plant', crop: d.crop }; this.armedUntil = performance.now() + 6000; this.swept = new Set(); this.sweepBed(id); this.hud.toast(t('Drag across more beds to plant them'), 'info'); }
    else if (d.act === 'harvest') { this.armed = { action: 'harvest' }; this.armedUntil = performance.now() + 6000; this.swept = new Set(); this.sweepBed(id); }
    else if (d.act === 'harvestAll') g.do('harvest', { ids: Object.keys(g.s.beds).filter(k => g.s.beds[k].doneAt <= g.now) });
    else if (d.act === 'collect') g.do('collect', { home: id });
    else if (d.act === 'feed') g.do('feed', { home: id });
    else if (d.act === 'buyAnimal') g.do('buyAnimal', { home: id });
    else if (d.act === 'clear') g.do('clear', { x: cell.x, z: cell.z });
    else if (d.act === 'collectRent') g.do('collectRent');
  }
}
