// The first session (DESIGN 15): Ada's guide card with the current step, markers on what to tap, HUD buttons that appear
// as the story unlocks them, and the chapter cards. "I know how" skips a step; "Skip tutorial" ends it.
import { t } from '../kit/i18n.mjs';
import { CHAPTERS, TUTORIAL } from '../content/story.mjs';
import { CELL, START_PARCEL, parcelOrigin } from '../content/world.mjs';
import { TUTORIAL_WEEDS } from '../core/state.mjs';
import { cellType } from '../core/grid.mjs';
import { showModal } from './modal.mjs';

const HUD_BUTTONS = ['build', 'orders', 'barn', 'projects', 'today'];
export class Guide {
  constructor(root, { game, world, hud }) {
    Object.assign(this, { game, world, hud });
    this.el = document.createElement('div'); this.el.className = 'guide'; this.el.hidden = true; root.appendChild(this.el);
    this.mark = document.createElement('div'); this.mark.className = 'pointer'; this.mark.hidden = true; root.appendChild(this.mark);
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      if (b.dataset.g === 'skip') this.game.do('tutorial', { skip: true });
      if (b.dataset.g === 'next') this.game.do('tutorial', { step: this.index + 1 });
      this.update();
    });
    game.on(() => this.update());
    world.onFrame(() => this.placeMarker());
    this.update();
  }
  get s() { return this.game.s; }
  get index() { return this.s.story.tutorial ?? 0; }
  get step() { return TUTORIAL[this.index] ?? null; }
  update() {
    if (this.busy) return; this.busy = true;
    try { this.refresh(); } finally { this.busy = false; }
  }
  refresh() {
    // move past finished steps
    while (this.step && !this.step.last && this.step.done(this.s)) this.game.do('tutorial', { step: this.index + 1 });
    this.chapters();
    const step = this.step;
    this.hud.show(step ? step.hud : HUD_BUTTONS);
    if (!step) { this.el.hidden = true; this.mark.hidden = true; return; }
    this.el.hidden = false;
    this.el.innerHTML = `<span class="face">👵</span><div class="say"><b>${t('Ada')}</b><p>${t(step.text)}</p>
      <div class="guide-buttons">${step.last ? `<button class="btn primary" data-g="skip">${t('Got it')}</button>` : `<button class="btn" data-g="next">${t('I know how')}</button><button class="btn ghost" data-g="skip">${t('Skip tutorial')}</button>`}</div></div>`;
  }
  /** Chapter cards, each once, in order. */
  chapters() {
    const s = this.s;
    for (const ch of CHAPTERS) {
      if (ch.id <= (s.story.chapter ?? 0) || this.shown?.has(ch.id) || !ch.when(s)) continue;
      (this.shown ??= new Set()).add(ch.id);
      showModal(`<div class="chapter"><span class="big">${ch.icon}</span><small>${t('Chapter {n}', { n: ch.id })}</small><h2>${t(ch.title)}</h2><p class="sub">${t(ch.subtitle)}</p><p>${t(ch.text)}</p>
        <button class="btn primary" data-close>${ch.id === 1 ? t('Begin') : t('Continue')}</button></div>`, { onClose: () => this.game.do('chapterSeen', { id: ch.id }) });
    }
  }
  /** Where the marker points: a cell on the map or a HUD button. */
  target() {
    const step = this.step, s = this.s; if (!step) return null;
    const o = parcelOrigin(START_PARCEL);
    if (step.point === 'weeds') { const w = TUTORIAL_WEEDS.map(([dx, dz]) => [o.x + dx, o.z + dz]).find(([x, z]) => cellType(s, x, z) === 'weeds'); return w && { cell: w }; }
    if (step.point === 'path') return { cell: [31, o.z + 4] };
    if (step.point === 'beds') return { cell: [o.x + 2, o.z + 1] };
    if (step.point === 'bed') { const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'bed'); return id && { cell: [s.placed[id].x, s.placed[id].z] }; }
    if (step.point === 'coop' || step.point === 'mill') { const kind = step.point === 'coop' ? 'coop' : 'feed_mill', p = Object.values(s.placed).find(q => q.kind === kind); return p ? { cell: [p.x, p.z] } : null; }
    return { button: step.point };
  }
  placeMarker() {
    const tg = this.target(); if (!tg) { this.mark.hidden = true; return; }
    let x, y;
    if (tg.button) { const r = document.querySelector(`[data-act="${tg.button}"]`)?.getBoundingClientRect(); if (!r || !r.width) { this.mark.hidden = true; return; } x = r.left + r.width / 2; y = r.top + r.height / 2; }
    else { const v = new this.world.cam.camera.position.constructor((tg.cell[0] + 0.5) * CELL, 0.3, (tg.cell[1] + 0.5) * CELL).project(this.world.cam.camera); x = (v.x + 1) / 2 * innerWidth; y = (1 - v.y) / 2 * innerHeight; }
    this.mark.hidden = false; this.mark.style.transform = `translate(${x}px, ${y}px)`;
  }
}
