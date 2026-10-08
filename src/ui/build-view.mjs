// Build mode (DESIGN 4.2): the catalogue, the ghost, rotate / place / cancel, move, store, clear and undo.
// Small things (beds, paths, flowers, fences) are placed with one tap each, so a row can be painted quickly; bigger things
// show the ghost first and are placed with the tick button (or a second tap on the same spot). Every card shows the art
// kit's rendered icon; locked ones show a padlock with the level or project that opens them.
import { t, tParams, num } from '../kit/i18n.mjs';
import { tutorialOf } from '../content/story.mjs';
import { CATEGORIES, BUILDINGS, footprint } from '../content/buildings.mjs';
import { CELL, RUINS } from '../content/world.mjs';
import { canPlace, canPlaceEdge, occupant } from '../core/grid.mjs';
import { mayBuild } from '../core/projects.mjs';
import { placementPrice } from '../core/build.mjs';
import { CLEAR } from '../content/economy.mjs';
import { charmPreview } from '../core/homes.mjs';
import { sfx } from '../kit/sound.mjs';
import { iconHtml, glyph, coinMark } from './icon.mjs';

const TOOLS = [{ id: 'clear', icon: 'tool:clear', name: 'Clear' }, { id: 'move', icon: 'tool:move', name: 'Move' }, { id: 'store', icon: 'tool:store', name: 'Store' }, { id: 'demolish', icon: 'demolish', name: 'Demolish' }];
const QUICK = kind => BUILDINGS[kind].edge || (BUILDINGS[kind].size[0] === 1 && BUILDINGS[kind].size[1] === 1);

export class BuildView {
  constructor(root, { game, world, ghost, hud }) {
    Object.assign(this, { game, world, ghost, hud, open: false, cat: 'farm', mode: null, kind: null, rot: 0, at: null, moving: null });
    this.el = document.createElement('div'); this.el.className = 'sheet build'; this.el.hidden = true;
    root.appendChild(this.el);
    this.bar = document.createElement('div'); this.bar.className = 'place-bar'; this.bar.hidden = true;
    root.appendChild(this.bar);
    this.el.addEventListener('click', e => this.click(e));
    this.bar.addEventListener('click', e => this.click(e));
    game.on(() => { if (this.open) { this.render(); this.refreshGhost(); } });
  }
  toggle() { this.open ? this.close() : this.show(); }
  show() {
    if (!this.open) {
      sfx('page');
      // the tutorial's path step opens on the paths tab, its beds step on the farm tab
      const step = tutorialOf(this.game.s)[this.game.s.story.tutorial ?? 0]?.id;
      if (step === 'path' || step === 'fence') this.cat = 'paths'; else if (step === 'beds') this.cat = 'farm';
    }
    this.open = true; this.el.hidden = false; this.hud.setMode('build'); this.render(); this.lift();
  }
  /** body.build-open and --build-h (the sheet's real height) let the guide, the HUD buttons and the place bar sit above it. */
  lift() {
    document.body.classList.toggle('build-open', this.open);
    document.body.style.setProperty('--build-h', `${this.open ? this.el.offsetHeight : 0}px`);
  }
  close() {
    this.open = false; this.el.hidden = true; this.bar.hidden = true; this.cancel(); this.hud.setMode(''); this.lift();
    this.game.do('endBuild');
  }
  click(e) {
    const b = e.target.closest('[data-cat],[data-kind],[data-tool],[data-bar]'); if (!b) return;
    sfx('click');
    if (b.dataset.cat) { this.cat = b.dataset.cat; this.render(); }
    else if (b.dataset.kind) this.select(b.dataset.kind);
    else if (b.dataset.tool) this.tool(b.dataset.tool);
    else if (b.dataset.bar === 'rotate') { this.rot = (this.rot + 1) % 4; this.refreshGhost(); }
    else if (b.dataset.bar === 'ok') this.confirm();
    else if (b.dataset.bar === 'cancel') this.cancel();
    else if (b.dataset.bar === 'undo') this.game.do('undo');
    else if (b.dataset.bar === 'close') this.close();
  }
  render() {
    const s = this.game.s, cats = CATEGORIES.map(c => `<button data-cat="${c.id}" class="tab${c.id === this.cat ? ' on' : ''}">${t(c.name)}</button>`).join('');
    const items = Object.entries(BUILDINGS).filter(([, d]) => d.cat === this.cat).map(([kind, d]) => {
      const may = mayBuild(s, kind), level = s.level < d.level, price = placementPrice(s, kind), stored = d.edge ? 0 : s.stored?.[kind] ?? 0;
      const locked = level || !may.ok;
      const note = level ? `${glyph('lock', 'g')} ${t('Level {level}', { level: d.level })}` : !may.ok ? `${glyph('lock', 'g')} ${t(may.reason, tParams(may.params))}` : stored ? t('{count} stored', { count: stored }) : price ? `${coinMark()} ${num(price)}` : t('Free');
      return `<button class="card${kind === this.kind ? ' on' : ''}${locked ? ' locked' : ''}${stored ? ' stored' : ''}" data-kind="${kind}" ${locked ? 'aria-disabled="true"' : ''}>${iconHtml(kind, '', 'icon')}<b>${t(d.name)}</b><small>${note}</small>${stored ? `<i class="badge">${stored}</i>` : ''}</button>`;
    }).join('');
    const tools = TOOLS.map(tl => `<button class="round small tool${this.mode === tl.id ? ' on' : ''}" data-tool="${tl.id}" aria-label="${t(tl.name)}" title="${t(tl.name)}">${iconHtml(tl.icon, '', 'btn-icon')}</button>`).join('');
    const scroll = this.el.querySelector('.tabs')?.scrollLeft;
    this.el.innerHTML = `<div class="build-top"><div class="tabs">${cats}</div><div class="tools">${tools}<button class="round small close" data-bar="close" aria-label="${t('Close')}">${glyph('close', 'g')}</button></div></div><div class="cards">${items}</div>`;
    // keep the chosen category in view (the tab row scrolls on a phone)
    const tabs = this.el.querySelector('.tabs'), on = tabs.querySelector('.tab.on');
    if (scroll != null) tabs.scrollLeft = scroll;
    if (on && (on.offsetLeft < tabs.scrollLeft || on.offsetLeft + on.offsetWidth > tabs.scrollLeft + tabs.clientWidth)) tabs.scrollLeft = on.offsetLeft - 8;
    const fade = () => tabs.classList.toggle('more', tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 4);   // the edge fades while more tabs hide
    fade(); tabs.addEventListener('scroll', fade, { passive: true });
    if (this.open) this.lift();
  }
  select(kind) {
    const s = this.game.s, d = BUILDINGS[kind], may = mayBuild(s, kind);
    if (s.level < d.level) { this.hud.refuse('Reach level {level} first', { level: d.level, kind, lock: 'level' }); return; }
    if (!may.ok) { this.hud.refuse(may.reason, may.params); return; }
    Object.assign(this, { mode: 'place', kind, rot: 0, moving: null });
    // start the ghost at the middle of the screen, so it is visible straight away
    this.at = this.world.cellAt(innerWidth / 2, innerHeight * 0.42); this.side = 'n';
    if (d.civicSite) {
      const site = RUINS.find(r => r.kind === kind), [w, depth] = footprint(kind, site.rot);
      this.rot = site.rot;
      const x = site.x + Math.floor((w - 1) / 2), z = site.z + Math.floor((depth - 1) / 2);
      this.at = { x, z, point: { x: (x + .5) * CELL, z: (z + .5) * CELL } };
      this.world.cam.flyTo?.((site.x + w / 2) * CELL, (site.z + depth / 2) * CELL, Math.min(this.world.cam.span, 40));
    }
    this.render(); this.refreshGhost();
  }
  tool(id) { Object.assign(this, { mode: id, kind: null, moving: null }); this.ghost.hide(); this.render(); this.renderBar(); }
  cancel() { Object.assign(this, { mode: null, kind: null, moving: null, at: null }); this.ghost.hide(); this.bar.hidden = true; if (this.open) this.render(); }
  /** The top-left cell for the current kind when the pointer is over cell (x, z). */
  anchor(kind, cell, rot) { const [w, d] = footprint(kind, rot); return { x: cell.x - Math.floor((w - 1) / 2), z: cell.z - Math.floor((d - 1) / 2) }; }
  edgeAt(cell) {
    const fx = cell.point.x / CELL - cell.x, fz = cell.point.z / CELL - cell.z;
    const d = { n: fz, s: 1 - fz, w: fx, e: 1 - fx }, side = Object.keys(d).sort((a, b) => d[a] - d[b])[0];
    return side === 'n' ? { x: cell.x, z: cell.z, side: 'n' } : side === 's' ? { x: cell.x, z: cell.z + 1, side: 'n' } : side === 'w' ? { x: cell.x, z: cell.z, side: 'w' } : { x: cell.x + 1, z: cell.z, side: 'w' };
  }
  check() {
    const s = this.game.s, kind = this.kind; if (!kind || !this.at) return { ok: false };
    if (BUILDINGS[kind].edge) { const e = this.edgeAt(this.at); return { ...canPlaceEdge(s, kind, e.x, e.z, e.side), edge: e }; }
    const a = this.anchor(kind, this.at, this.rot);
    return { ...(this.moving ? canPlace(s, kind, a.x, a.z, this.rot, { ignore: this.moving }) : canPlace(s, kind, a.x, a.z, this.rot)), a };
  }
  refreshGhost() {
    if (this.mode !== 'place' && this.mode !== 'moving') { this.ghost.hide(); return; }
    const c = this.check(); if (!this.at) { this.ghost.hide(); return; }
    if (c.edge) this.ghost.show(this.kind, c.edge.x, c.edge.z, 0, c.ok, { side: c.edge.side });
    else this.ghost.show(this.kind, c.a.x, c.a.z, this.rot, c.ok, { id: this.moving ?? undefined });
    this.renderBar(c);
  }
  renderBar(c = this.check()) {
    const s = this.game.s, placing = this.mode === 'place' || this.mode === 'moving';
    this.bar.hidden = !this.open || !this.mode;
    const hint = this.mode === 'clear' ? t('Tap weeds or rocks to clear them ({price} coins each)', { price: CLEAR.weeds })
      : this.mode === 'move' ? t('Tap something to move it') : this.mode === 'store' ? t('Tap something to put it in storage') : this.mode === 'demolish' ? t('Tap a building to take it down for part of its price')
      : c.ok ? (this.moving ? t('Moving is free') : `${t(BUILDINGS[this.kind].name)} · ${coinMark()} ${num(placementPrice(s, this.kind))}${this.charmNote(c)}`) : c.reason ? t(c.reason, tParams(c.params)) : t('Tap where it should go');
    const big = placing && !QUICK(this.kind);
    this.bar.innerHTML = `<div class="reason ${placing && !c.ok ? 'bad' : ''}">${hint}</div><div class="bar-buttons">
      <button class="round small" data-bar="undo" aria-label="${t('Undo')}">${glyph('undo', 'g')}</button>
      ${big ? `<button class="round small" data-bar="rotate" aria-label="${t('Rotate')}">${glyph('rotate', 'g')}</button><button class="round small ok" data-bar="ok" aria-label="${t('Place')}" ${c.ok ? '' : 'disabled'}>${glyph('check', 'g')}</button>` : ''}
      <button class="round small close" data-bar="cancel" aria-label="${t('Cancel')}">${glyph('close', 'g')}</button></div>`;
  }
  charmNote(c) {
    if (!c.a) return ''; const p = charmPreview(this.game.s, this.kind, c.a.x, c.a.z, this.rot);
    return p?.homes.length ? ` · ${glyph('charm', 'g')} ${t('+{charm} charm for {count} cottages', { charm: p.value, count: p.homes.length })}` : '';
  }
  /** Open build mode with `kind` chosen and its ghost at a suggested cell (from the projects panel). */
  start(kind, at) { if (!this.open) this.show(); this.select(kind); if (at) { this.at = at; this.refreshGhost(); } }
  /** Pointer moved over the map (mouse hover) — only moves the ghost. */
  hover(cell) { if (!cell || (this.mode !== 'place' && this.mode !== 'moving')) return; this.at = cell; this.refreshGhost(); }
  /** A tap on the map while build mode is open. */
  tap(cell) {
    if (!cell) return;
    const s = this.game.s;
    if (this.mode === 'clear') { this.game.do('clear', { x: cell.x, z: cell.z }); return; }
    if (this.mode === 'demolish') { const id = occupant(s, cell.x, cell.z); if (id) this.game.do('demolish', { id }); else this.hud.refuse('Nothing to demolish'); return; }
    if (this.mode === 'store') { const id = occupant(s, cell.x, cell.z); if (id) this.game.do('store', { id }); else this.hud.refuse('Nothing to store'); return; }
    if (this.mode === 'move') {
      const id = occupant(s, cell.x, cell.z); if (!id) { this.hud.refuse('Nothing to move'); return; }
      const p = s.placed[id]; Object.assign(this, { mode: 'moving', kind: p.kind, rot: p.rot, moving: id, at: cell }); this.refreshGhost(); return;
    }
    if (this.mode !== 'place' && this.mode !== 'moving') {
      const id = occupant(s, cell.x, cell.z); if (id) { const p = s.placed[id]; Object.assign(this, { mode: 'moving', kind: p.kind, rot: p.rot, moving: id, at: cell }); this.refreshGhost(); }
      return;
    }
    const sameSpot = this.at && this.at.x === cell.x && this.at.z === cell.z;
    this.at = cell;
    if (QUICK(this.kind) || sameSpot) this.confirm(); else this.refreshGhost();
  }
  confirm() {
    const c = this.check(); if (!c.ok) { this.refreshGhost(); if (c.reason) this.hud.refuse(c.reason, c.params); return; }
    if (c.edge) this.game.do('placeEdge', { kind: this.kind, ...c.edge });
    else if (this.moving) { const r = this.game.do('move', { id: this.moving, x: c.a.x, z: c.a.z, rot: this.rot }); if (r.ok) { this.mode = 'move'; this.moving = null; this.kind = null; this.ghost.hide(); this.renderBar(); } return; }
    else { const r = this.game.do('place', { kind: this.kind, x: c.a.x, z: c.a.z, rot: this.rot }); if (r.ok && !QUICK(this.kind)) { this.cancel(); return; } }
    this.refreshGhost();
  }
}
