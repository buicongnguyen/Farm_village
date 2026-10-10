// Tap something on the farm (outside build mode) and its actions appear around the finger (DESIGN 16): plant, harvest,
// feed, collect, buy, clear, pick fruit, buy land. Choosing plant or harvest arms a "sweep": drag across other beds, or
// tap them, to do the same; the seed bag or the sickle follows the finger and each bed pops (world.juice).
// The menu springs open. A tap on an animal in its pen opens its home's menu (life.animalAt). A For-sale parcel shows
// its price and level with a gold outline of the land; the weekly cart and the mailbox open their panels.
import * as THREE from 'three';
import { t, num } from '../kit/i18n.mjs';
import { sfx } from '../kit/sound.mjs';
import { CROPS, ANIMALS, FRUITS } from '../content/goods.mjs';
import { HOME_COMFORT } from '../content/explore.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { CLEAR } from '../content/economy.mjs';
import { ORDER_BOARD, BARN, FARMHOUSE, MAILBOX, CELL, PARCEL, parcelOf, isPond, POND_SHORE, ruinAt, RUIN_NAMES, TIDY, HOME_GARDEN } from '../content/world.mjs';
import { tidied, ruinStands } from '../core/ruins.mjs';
import { STEPS } from '../content/projects.mjs';
import { occupant, cellType, penOf } from '../core/grid.mjs';
import { plantPrice, cropOpen } from '../core/farm.mjs';
import { animalPrice, animalState } from '../core/animals.mjs';
import { treeState } from '../core/trees.mjs';
import { buyableParcels } from '../core/build.mjs';
import { cartHere, CART_SPOT } from '../core/cart.mjs';
import * as barn from '../core/barn.mjs';
import { shortTime } from '../core/clock.mjs';
import { iconHtml, coinMark, glyph } from './icon.mjs';
import { levelOf, isRepairing, repairCost, kindOf } from '../core/condition.mjs';
import { thingName, condLabel } from './repair-ui.mjs';
import { HOUSE, REPAIR } from '../content/economy.mjs';
import { hurryLeft, hurryable } from '../core/quests.mjs';
import { roadSegmentAt, parcelNote, inOldMill, inMeadow, COOPERATIVE_BOARD, TOWPATH_GATE, inRiverside, lotAt } from '../content/world.mjs';
import { fishable } from '../core/pond-bank.mjs';
import { siteAt, siteBuilt } from '../core/sites.mjs';
import { explorationStatus } from '../core/exploration.mjs';
import { learningStatus } from '../core/learning.mjs';

const near = (cell, spot, r) => Math.abs(cell.x - spot.x) <= r && Math.abs(cell.z - spot.z) <= r;
const nearCart = cell => cell.x >= CART_SPOT.x - 1 && cell.x <= CART_SPOT.x + CART_SPOT.w && cell.z >= CART_SPOT.z - 1 && cell.z <= CART_SPOT.z + CART_SPOT.d;
const bar = k => `<i class="progress"><i style="width:${Math.round(Math.max(0, Math.min(1, k)) * 100)}%"></i></i>`;
export class Radial {
  constructor(root, { game, world, panels, hud, people }) {
    Object.assign(this, { game, world, panels, hud, people, armed: null, armedUntil: 0, swept: new Set() });
    this.el = document.createElement('div'); this.el.className = 'radial'; this.el.hidden = true;
    root.appendChild(this.el);
    this.tool = document.createElement('div'); this.tool.className = 'sweep-tool'; this.tool.hidden = true; root.appendChild(this.tool);
    this.el.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) { sfx('click'); this.choose(b.dataset); } });
    // drag across beds while a sweep is armed: the camera hands the drag to us instead of panning
    world.cam.dragHook = {
      start: (x, y) => { const id = this.bedAt(x, y); if (!this.isArmed() || !id || !this.applies(id)) return false; this.swept = new Set(); this.from = id; return true; },
      move: (x, y) => { if (this.from) { this.hide(); this.follow(x, y); this.sweepBed(this.from); this.from = null; } this.follow(x, y); const id = this.bedAt(x, y); if (id) this.sweepBed(id); },
      end: () => { this.armedUntil = performance.now() + 6000; this.tool.hidden = true; },
    };
  }
  get s() { return this.game.s; }
  isArmed() { return this.armed && performance.now() < this.armedUntil; }
  bedAt(x, y) { const c = this.world.cellAt(x, y); const id = c && occupant(this.s, c.x, c.z); return id && this.s.placed[id]?.kind === 'bed' ? id : null; }
  applies(id) {
    const b = this.s.beds[id], now = this.game.now;
    return this.armed?.action === 'plant' ? !b : this.armed?.action === 'harvest' ? !!b && b.doneAt <= now : false;
  }
  /** The seed bag (with the crop) or the sickle under the finger while sweeping. */
  follow(x, y) {
    if (!this.armed) return;
    const html = this.armed.action === 'plant' ? `${glyph('bag', 'bag')}${iconHtml(this.armed.crop, '', 'seed')}` : iconHtml('tool:harvest', '', 'sickle');
    if (this.tool.dataset.html !== html) { this.tool.innerHTML = html; this.tool.dataset.html = html; }
    this.tool.hidden = false; this.tool.style.transform = `translate(${x}px, ${y}px)`;
  }
  sweepBed(id) {
    if (this.swept.has(id) || !this.applies(id)) return;
    this.swept.add(id);
    const r = this.armed.action === 'plant' ? this.game.do('plant', { id, crop: this.armed.crop }) : this.game.do('harvest', { id });
    if (!r.ok) { this.armed = null; this.tool.hidden = true; }
    else { const p = this.s.placed[id]; if (p) this.world.juice?.pop?.({ x: p.x, z: p.z }); }
    this.armedUntil = performance.now() + 6000;
  }
  /** Explore (lazy): Go inside from the farmhouse menu, or roam from the HUD button as yourself or the family member
   *  you tapped just before. */
  explore(roam = false) {
    const g = this.game, state = g.s, sel = this.people?.selected;
    const who = roam && sel?.family && !sel.pet && performance.now() < (this.people.selectedUntil ?? 0) ? sel.id : 'you';
    if (roam && this.people) this.people.selected = null;
    import('./explore-mode.mjs').then(m => g.s === state && m.openExplore(this, { roam, who })).catch(() => this.hud.toast(t('Could not open the farmhouse. Please try again.'), 'warn'));
  }
  hide() { this.el.hidden = true; this.target = null; this.outline(null); }
  /** A tap on the map outside build mode. */
  /** The menu of something that is worn, broken or being repaired: its state, and Repair (and its usual menu if it still works). */
  repairMenu(id, def) {
    const s = this.s, now = this.game.now, lv = levelOf(s, id), name = thingName(s, id) ?? '';
    if (isRepairing(s, id)) { const left = Math.max(0, s.repairing[id].doneAt - now); return { buttons: [], info: `${name} · ${condLabel(s, id)} · ${shortTime(left)}${bar(1 - left / REPAIR.broken.ms)}` }; }
    const cost = repairCost(s, id), buttons = [{ act: 'repair', id, icon: iconHtml('wrench', '', 'ic'), label: `${coinMark()}${num(cost)}`, disabled: s.coins < cost }];
    if (lv < 3 && s.placed[id]?.kind === 'school') buttons.push({ act: 'schoolActivity', icon: iconHtml('school', '', 'ic'), label: t('Open') });
    if (lv < 3 && (def?.produces || def?.fruitStand || def?.stall || def?.market || def?.pond || def?.home || def?.animals)) buttons.push({ act: 'open', icon: iconHtml(def.home ? 'cottage' : def.animals ? def.animals === 'hen' ? 'coop' : 'cow_barn' : def.fruitStand ? 'fruit_stand' : def.stall || def.market ? 'stall' : def.pond ? 'pond' : def.produces ? 'bakery' : '', '', 'ic'), label: t('Open') });
    return { buttons, info: `${name} · ${condLabel(s, id)}` };
  }
  /** The farmhouse: its repair when worn, and the upgrade to the next level. */
  houseMenu() {
    const s = this.s, lv = s.house?.level ?? 1, buttons = [];
    buttons.push({ act: 'goInside', icon: glyph('home', 'ic'), label: t('Go inside'), disabled: levelOf(s, 'house') >= 3 || isRepairing(s, 'house') });
    if (explorationStatus(s).eligible) buttons.push({ act: 'explorePorch', icon: iconHtml('lucky_box', '', 'ic'), label: t('Explore the porch') });
    const lesson = learningStatus(s, this.game.now);
    if (lesson.eligible || lesson.introduced) buttons.push({ act: 'learning', icon: iconHtml('wrench', '', 'ic'), label: t('Garden repairs') });
    const perk = HOME_GARDEN.find(g => g.name && g.level === lv + 1), inside = HOME_COMFORT.find(c => c.level === lv + 1);   // what the next level of the house brings, outside and in
    let info = `${t('Your farmhouse')} · ${t('Level {level}', { level: lv })}${perk ? ` · ${t('Next: {name}', { name: [perk.name, inside?.name].filter(Boolean).map(n => t(n)).join(' + ') })}` : ''}`;
    if (levelOf(s, 'house') > 0 || isRepairing(s, 'house')) { const m = this.repairMenu('house'); buttons.push(...m.buttons); info = m.info; }
    if (lv < HOUSE.levels && levelOf(s, 'house') < 3 && !isRepairing(s, 'house')) {
      const cost = HOUSE.upgradeCost[lv], need = HOUSE.level[lv], ok = s.level >= need && s.coins >= cost;
      buttons.push({ act: 'upgradeHouse', icon: glyph('up', 'ic'), label: s.level < need ? t('Level {level}', { level: need }) : `${coinMark()}${num(cost)}`, disabled: !ok });
    }
    return { buttons, info };
  }
  tap(cell, x, y, opts = {}) {
    if (!cell) { this.hide(); return; }
    this.last = { cell, x, y };
    const s = this.s, now = this.game.now;
    let id = occupant(s, cell.x, cell.z);
    // Advice/source links refer to a world cell, not the actor under their temporary screen coordinates.
    const animal = !opts.preview && !id && this.life?.animalAt?.(cell); if (animal) id = animal.home;
    // Pond controls remain available after sending a friend; the clear fishing bank wins over nearby actor picks.
    const pondHere = isPond(cell.x, cell.z) || (cell.x >= POND_SHORE.x0 && cell.x <= POND_SHORE.x1 && cell.z >= POND_SHORE.z0 && cell.z <= POND_SHORE.z1) || (id && fishable(s.placed[id]));
    const sel = !opts.preview && this.people?.selected;
    if (pondHere) {
      const pond = id && fishable(s.placed[id]) ? id : undefined;
      if (pond && !(sel && performance.now() < (this.people.selectedUntil ?? 0)) && !opts.open && levelOf(s, pond) > 0) {
        const { buttons, info } = this.repairMenu(pond, BUILDINGS[s.placed[pond].kind]); return this.open(cell, x, y, buttons, info, { id: pond });
      }
      this.hide();
      if (sel && performance.now() < (this.people.selectedUntil ?? 0) && !this.people.sendFishing(sel, pond ? s.placed[pond] : null)) this.hud.toast(t('The fishing spots are busy. Try again in a moment.'), 'info');
      if (this.people) this.people.selected = null;
      this.panels.show('pond', pond); return;
    }
    if (id && !opts.preview) this.people?.playerGo?.(cell);   // ordinary chores never interrupt a selected friend's fishing trip
    // a plain tap on an empty bed always opens the seed menu, so the crop can be changed; only a drag (or a harvest sweep) uses the armed tool
    if (!opts.preview && id && s.placed[id].kind === 'bed' && this.isArmed() && this.armed.action === 'harvest' && this.applies(id)) { this.swept = new Set(); this.sweepBed(id); return; }
    const ruin = !id && ruinAt(cell.x, cell.z);
    if (ruin && !(s.counts[ruin.kind] > 0) && (ruinStands(s, ruin.kind) || BUILDINGS[ruin.kind].civicSite)) {   // an old building on the civic row (or the lot it must return to): its name, what will bring it back, a tidy-up, or clear it away
      const step = STEPS[s.projects.step], next = step?.builds?.includes(ruin.kind), ruinButtons = [];
      if (next) ruinButtons.push({ act: 'projects', icon: glyph('projects', 'ic'), label: t('Rebuild') });
      if (['police', 'company'].includes(ruin.kind)) ruinButtons.push({ act: 'growthSite', icon: iconHtml(ruin.kind, '', 'ic'), label: t('Rebuild') });   // straight to this building's own rebuild panel
      if (ruinStands(s, ruin.kind)) ruinButtons.push({ act: 'clearRuin', icon: iconHtml('demolish', '', 'ic'), label: t('Clear away') });
      if (ruinStands(s, ruin.kind) && !tidied(s, ruin.kind)) ruinButtons.push({ act: 'tidyRuin', kind: ruin.kind, icon: glyph('sprout', 'ic'), label: `${coinMark()}${TIDY.coins}`, disabled: s.coins < TIDY.coins });
      return this.open(cell, x, y, ruinButtons, `${t(RUIN_NAMES[ruin.kind])} · ${!ruinStands(s, ruin.kind) ? t('Cleared, kept for the rebuild') : next ? t('Ready to rebuild') : tidied(s, ruin.kind) ? t('Tidied, waiting for its day') : t('Run down')}`, { ruin: ruin.kind });
    }
    const who = !opts.preview && !id && this.people?.pick(x, y);
    if (who && (who.person ?? who.id) === 'albright') { this.hide(); this.people.talk(who); this.panels.onOffer?.(); return; }   // the man from the city: his offer (chapter 11)
    if (who) { this.hide(); this.people.talk(who); if (!who.pet && !who.visitor) { this.people.selected = who; this.people.selectedUntil = performance.now() + 10000; this.hud.toast(t('Tap the pond to send {name} fishing', { name: this.people.nameOf(who) }), 'info', { icon: 'perch' }); } return; }
    if (id && !opts.preview && !opts.open && s.placed[id]?.kind === 'stage') { this.hide(); this.panels.show('festival'); return; }   // the festival stage: the Harvest Festival's panel
    // the old mill on the brook (scenery): what it is, and what its wheel does once the sluice is open (chapter 8)
    if (!id && !opts.preview && inOldMill(cell.x, cell.z)) return this.open(cell, x, y, [], `${iconHtml('feed_mill', '', 'mini')} ${t(s.firsts?.sluice ? 'The old mill: its wheel turns again, and every workshop works a tenth faster' : 'The old mill: its wheel has stood still since the water was shut off')}`);
    // the riverside (Act IV): a building on a lot, a free lot, or the quay itself open the quay's panel
    if (id && !opts.preview && !opts.open && s.placed[id]?.lot && levelOf(s, id) === 0) { this.hide(); this.panels.show('quay', s.placed[id].lot); return; }
    if (!id && !opts.preview && s.firsts?.bridge && inRiverside(cell.x, cell.z) && !this.people?.pick(x, y)) { this.hide(); this.panels.show('quay', lotAt(cell.x, cell.z)?.id); return; }
    // the co-operative's notice board on the square (chapter 12)
    if (!opts.preview && cell.x === COOPERATIVE_BOARD.x && cell.z === COOPERATIVE_BOARD.z && (s.story?.chapter ?? 0) >= 11) { this.hide(); this.panels.show('cooperative'); return; }
    // the old towpath's gate on the far bank: shut until chapter 12 is seen
    if (!id && !opts.preview && Math.abs(cell.x + 0.5 - TOWPATH_GATE.x) <= 1 && Math.abs(cell.z + 0.5 - TOWPATH_GATE.z) <= 1.5) return this.open(cell, x, y, [], `${iconHtml('gate', '', 'mini')} ${t(s.firsts?.bridge ? 'The old towpath: open along the far bank of the brook' : 'The old towpath: its gate has been shut for years')}`);
    // the brook meadow (chapter 11): the Valley panel, from the day the man from the city asks about it
    if (!id && !opts.preview && inMeadow(cell.x, cell.z) && (s.story?.chapter ?? 0) >= 10) { this.hide(); this.panels.show('valley'); return; }
    // a fixed site that waits for its building (the boat dock's place on the brook): its own panel
    if (!id && !opts.preview) { const st = siteAt(cell.x, cell.z); if (st && !siteBuilt(s, st.kind)) { this.hide(); this.panels.onSite?.(st.kind); return; } }
    const p = id && s.placed[id], def = p && BUILDINGS[p.kind];
    let buttons = [], info = '', land = null;
    if (p && !opts.open && levelOf(s, id) > 0) ({ buttons, info } = this.repairMenu(id, def));
    else if (p?.kind === 'bed') {
      const b = s.beds[id];
      if (!b) buttons = Object.entries(CROPS).filter(([c]) => cropOpen(s, c)).map(([c, def]) => {
        const price = plantPrice(s, c), have = barn.stock(s, c);
        return { act: 'plant', crop: c, icon: iconHtml(c, def.icon), label: def.free ? t('Free') : have ? `×${have}` : `${coinMark()}${price}` };
      });
      else if (b.doneAt <= now) { const all = Object.keys(s.beds).filter(k => s.beds[k].doneAt <= now).length; buttons = [{ act: 'harvest', icon: iconHtml('tool:harvest'), label: t('Harvest') }, ...(all > 1 ? [{ act: 'harvestAll', icon: iconHtml('ui:harvest_all', '', 'ic'), label: t('All ({count})', { count: all }) }] : [])]; }
      else { const full = CROPS[b.crop].growMs; info = `${iconHtml(b.crop, '', 'mini')} ${shortTime(b.doneAt - now)}${b.watered ? ` · ${t('Watered by the pond')}` : ''}${bar(1 - (b.doneAt - now) / full)}`; }
    } else if (def?.fruit) {
      const st = treeState(s, id, now), f = FRUITS[def.fruit];
      if (st?.state === 'ripe') buttons = [{ act: 'pick', icon: iconHtml(def.fruit), label: t('Pick ({count})', { count: f?.yield ?? 1 }) }];
      else if (st) info = `${iconHtml(def.fruit, '', 'mini')} ${t(def.name)} · ${shortTime(st.leftMs)}${bar(st.progress)}`;
      else info = t(def.name);
    } else if (def?.garden) info = `${iconHtml('garden_flower', '', 'mini')} ${t('Streak garden: day {count}', { count: s.today.days ?? 1 })}`;
    else if (def?.produces) { this.hide(); this.panels.show('production', id); return; }
    else if (def?.fruitStand) { this.hide(); this.panels.show('fruit_stand'); return; }
    else if (p?.kind === 'clinic') { this.hide(); this.panels.show('clinic', id); return; }
    else if (def?.civicSite) { this.hide(); this.panels.show('villageGrowth'); return; }
    else if (def?.pet) info = t('{pet:dog:short} watches the beds and chases crows. No upkeep needed.');
    else if (def?.stall) { this.hide(); this.panels.show('stall'); return; }
    else if (def?.market) { this.hide(); this.panels.show('market'); return; }
    else if (def?.pond) { this.hide(); this.panels.show('pond'); return; }
    else if (def?.home) { this.hide(); this.panels.show('cottage', id); return; }
    else if (p?.kind === 'school') { this.hide(); this.panels.show('schoolActivity'); return; }
    else if (def?.animals) {
      const list = s.animals[id] ?? [], kind = def.animals, a = ANIMALS[kind], pen = penOf(s, id);
      const hungry = list.filter(x => animalState(x, now) === 'hungry').length, ready = list.filter(x => animalState(x, now) === 'ready').length;
      if (ready) buttons.push({ act: 'collect', icon: iconHtml(a.gives), label: t('Collect ({count})', { count: ready }) });
      if (hungry) buttons.push({ act: 'feed', icon: iconHtml(a.eats), label: t('Feed ({count})', { count: hungry }) });
      if (list.length < a.perHome) buttons.push({ act: 'buyAnimal', icon: `${iconHtml(kind)}${glyph('plus', 'corner')}`, label: animalPrice(s, kind) ? `${coinMark()}${num(animalPrice(s, kind))}` : t('Free') });
      info = true ? `${t(a.name)} ${list.length}/${a.perHome}` : t(pen.reason ?? 'The fence has a gap');
    } else if (p) info = t(def?.name ?? '');
    else if ((land = buyableParcels(s).find(q => q.parcel === parcelOf(cell.x, cell.z)))) {
      if (s.mode === 'restore') { this.hide(); this.panels.show('land', land.parcel); return; }
      info = `${iconHtml('sale_sign', '', 'mini')} ${t(parcelNote(land.parcel))} · ${coinMark()} ${num(land.price)}${land.ok ? '' : ` · ${glyph('lock', 'g')} ${t(land.reason, land.params)}`}`;
      buttons = [{ act: 'buyParcel', parcel: land.parcel, icon: iconHtml('sale_sign'), label: t('Buy'), disabled: !land.ok }];
    }
    else if (cellType(s, cell.x, cell.z) === 'road' && roadSegmentAt(cell.x, cell.z) && levelOf(s, roadSegmentAt(cell.x, cell.z).id) > 0) ({ buttons, info } = this.repairMenu(roadSegmentAt(cell.x, cell.z).id));
    else if (['weeds', 'rock'].includes(cellType(s, cell.x, cell.z))) buttons = [{ act: 'clear', icon: iconHtml('tool:clear'), label: `${coinMark()}${CLEAR[cellType(s, cell.x, cell.z)]}` }];
    else if (cartHere(s) && nearCart(cell)) { this.hide(); this.panels.show('cart'); return; }
    else if (near(cell, MAILBOX, 1)) { this.hide(); this.panels.show('mail'); return; }
    else if (near(cell, ORDER_BOARD, 1)) { this.hide(); this.panels.show('orders'); return; }
    else if (near(cell, BARN, 4)) { this.hide(); this.panels.show('barn'); return; }
    else if (near(cell, FARMHOUSE, 4)) ({ buttons, info } = this.houseMenu());
    if (p?.kind === 'bed' && !opts.open && levelOf(s, id) === 0 && !s.beds[id] && Object.keys(s.placed).filter(k => s.placed[k].kind === 'bed' && !s.beds[k]).length > 1) buttons.push({ act: 'plantAll', crop: this.lastCrop ?? 'wheat', icon: iconHtml(this.lastCrop ?? 'wheat', '', 'ic'), label: t('All') });   // one tap: wheat in every empty bed
    if (p && id && hurryLeft(s) > 0 && hurryable(s, id, now)) buttons.push({ act: 'hurry', icon: glyph('clock', 'ic'), label: t('Hurry') });   // the free daily hurry
    if (!buttons.length && !info) { this.hide(); return; }
    this.open(cell, x, y, buttons, info, { id, land });
  }
  /** Show the menu round the finger: buttons and an info line; `target` is what the buttons act on. */
  open(cell, x, y, buttons, info, target = {}) {
    const land = target.land ?? null;
    this.target = { cell, ...target };
    this.outline(land);
    // Up to seven buttons fan round the finger. More than that (a long list of crops) would wrap round and overlap, so
    // they sit in tidy rows above the finger instead, as many columns as the screen holds.
    const n = buttons.length, grid = n > 7, cols = grid ? Math.max(3, Math.min(6, Math.ceil(n / 2), Math.floor((innerWidth - 24) / 74))) : 0, rows = grid ? Math.ceil(n / cols) : 0;
    const r = grid ? Math.max(cols * 37, rows * 80 + 30) : Math.max(64, 30 + n * 12);   // wide enough that a price label never touches the next button
    this.el.innerHTML = (info ? `<div class="radial-info">${info}</div>` : '') + buttons.map((b, i) => {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.9, row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols);
      const bx = grid ? (i % cols - (inRow - 1) / 2) * 74 : Math.cos(a) * r, by = grid ? -58 - (rows - 1 - row) * 82 : Math.sin(a) * r;
      return `<button class="radial-btn" style="--x:${bx.toFixed(1)}px;--y:${by.toFixed(1)}px;--i:${i}" data-act="${b.act}"${b.crop ? ` data-crop="${b.crop}"` : ''}${b.parcel ? ` data-parcel="${b.parcel}"` : ''}${b.id ? ` data-id="${b.id}"` : ''}${b.disabled ? ' disabled' : ''}>${b.icon}<small>${b.label}</small></button>`;
    }).join('');
    const margin = r + 44, mx = grid ? cols * 37 + 6 : margin, up = grid ? rows * 82 + 20 : margin + 20, down = grid ? 80 : margin;
    this.el.style.left = `${Math.min(innerWidth - mx, Math.max(mx, x))}px`; this.el.style.top = `${Math.min(innerHeight - down, Math.max(up, y))}px`;
    this.el.hidden = false; this.el.classList.remove('open'); void this.el.offsetWidth; this.el.classList.add('open');
    sfx('pop');
  }
  /** A gold outline over a parcel on offer (null hides it). */
  outline(land) {
    if (!land) { if (this.frame) this.frame.visible = false; return; }
    if (!this.frame) {
      // a flat frame: four strips round the parcel's edge (eight corners, eight triangles)
      const size = PARCEL * CELL, w = 0.9, o = [[0, 0], [size, 0], [size, size], [0, size]], i = [[w, w], [size - w, w], [size - w, size - w], [w, size - w]];
      const pos = [...o, ...i].flatMap(([x, z]) => [x, 0, z]), idx = [];
      for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; idx.push(k, 4 + k, n, n, 4 + k, 4 + n); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
      const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2).translate(size / 2, 0, size / 2), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.3, depthWrite: false }));
      this.frame = new THREE.Group(); this.frame.add(fill, ring); this.frame.name = 'parcel-outline'; this.frame.renderOrder = 5;
      this.world.scene.add(this.frame);
      this.world.onFrame?.((dt, now) => { if (this.frame.visible) ring.material.opacity = 0.7 + 0.3 * Math.sin(now / 180); });
    }
    this.frame.position.set(land.x * CELL, 0.12, land.z * CELL); this.frame.visible = true;
  }
  choose(d) {
    const g = this.game, { id, cell, land, ruin } = this.target ?? {}; this.hide();
    if (d.act === 'goInside') { this.explore(); return; }
    if (d.act === 'plant') { this.lastCrop = d.crop; this.armed = { action: 'plant', crop: d.crop }; this.armedUntil = performance.now() + 6000; this.swept = new Set(); this.sweepBed(id); this.hud.toast(t('Drag across more beds to plant them'), 'info', { icon: d.crop }); }
    else if (d.act === 'harvest') { this.armed = { action: 'harvest' }; this.armedUntil = performance.now() + 6000; this.swept = new Set(); this.sweepBed(id); }
    else if (d.act === 'plantAll') g.do('plant', { ids: Object.keys(g.s.placed).filter(k => g.s.placed[k].kind === 'bed' && !g.s.beds[k]), crop: d.crop });
    else if (d.act === 'tidyRuin') g.do('tidyRuin', { kind: ruin });
    else if (d.act === 'clearRuin') g.do('clearRuin', { kind: ruin });
    else if (d.act === 'projects') this.panels.show('projects');
    else if (d.act === 'hurry') { if (g.do('hurry', { id }).ok) this.world.juice?.pop?.({ x: g.s.placed[id].x, z: g.s.placed[id].z }); }
    else if (d.act === 'harvestAll') g.do('harvest', { ids: Object.keys(g.s.beds).filter(k => g.s.beds[k].doneAt <= g.now) });
    else if (d.act === 'collect') g.do('collect', { home: id });
    else if (d.act === 'feed') g.do('feed', { home: id });
    else if (d.act === 'buyAnimal') g.do('buyAnimal', { home: id });
    else if (d.act === 'clear') g.do('clear', { x: cell.x, z: cell.z });
    else if (d.act === 'pick') g.do('pick', { id });
    else if (d.act === 'repair') g.do('repair', { id: d.id });
    else if (d.act === 'upgradeHouse') g.do('upgradeHouse');
    else if (d.act === 'explorePorch') this.panels.show('exploration', 'porch');
    else if (d.act === 'learning') this.panels.show('learning');
    else if (d.act === 'schoolActivity') this.panels.show('schoolActivity');
    else if (d.act === 'villageGrowth') this.panels.show('villageGrowth');
    else if (d.act === 'growthSite') this.panels.onGrowthSite?.(ruin);
    else if (d.act === 'open') { const l = this.last; if (l) this.tap(l.cell, l.x, l.y, { open: true }); }
    else if (d.act === 'buyParcel') {
      const r = g.do('buyParcel', { parcel: d.parcel });
      if (r.ok && land) { this.fx?.confetti?.(40); this.world.cam.flyTo?.((land.x + PARCEL / 2) * CELL, (land.z + PARCEL / 2) * CELL, Math.max(this.world.cam.span, 60), 1000); }
    }
  }
}
