// The first session (DESIGN 15): the chapter cards, then Ada's guide card with the current step, a pulsing hand on what
// to tap, and HUD buttons that appear as the story unlocks them. "I know how" skips a step; "Skip tutorial" ends it.
// Onboarding: the chapter 1 card comes first and is truly modal (only Begin answers). The guide stays hidden until it
// is closed; then the camera flies to the weeds, the hand starts pulsing on one of them, and Ada speaks.
// Chapter cards show up to three story panels (public/assets/story/, crossfading; a missing picture just drops out),
// Ada's line and, for chapter 1, the village's name. Story beats (content/story.mjs BEATS) play once each, between cards.
import { t } from '../kit/i18n.mjs';
import { CHAPTERS, tutorialOf, BEATS, VILLAGE_NAME } from '../content/story.mjs';
import { RESTORE } from '../content/start.mjs';
import { levelOf } from '../core/working.mjs';
import { CELL, START_PARCEL, parcelOrigin } from '../content/world.mjs';
import { TUTORIAL_WEEDS } from '../core/state.mjs';
import { cellType } from '../core/grid.mjs';
import { showModal, modalOpen, onModal } from './modal.mjs';
import { showBeat } from './bonds-panels.mjs';
import { faceHtml, glyph } from './icon.mjs';
import { sfx } from '../kit/sound.mjs';

// The restored village's opening picture (cells and span in metres): a portrait phone, a wide screen. Spans stay under
// SPAN.mid (40, view/camera.mjs) so the opening draws at full detail (fluffy crops, bed rims, rigged villagers).
const HOME_FRAME = { tall: { x: 35.5, z: 60.5, span: 39 }, wide: { x: 29, z: 60, span: 39.5 } };

export const HUD_BUTTONS = ['build', 'orders', 'barn', 'projects', 'today', 'friends'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export class Guide {
  constructor(root, { game, world, hud }) {
    Object.assign(this, { game, world, hud, shown: new Set(), beats: new Set(), flying: false });
    this.el = document.createElement('div'); this.el.className = 'guide'; this.el.hidden = true; root.appendChild(this.el);
    this.mark = document.createElement('div'); this.mark.className = 'pointer'; this.mark.hidden = true; this.mark.innerHTML = `<i class="ring"></i>${glyph('hand', 'hand')}`; root.appendChild(this.mark);
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      // folded above the build sheet on a phone: a tap opens the card, a tap outside its buttons folds it again
      if (!b) { if (document.body.classList.contains('build-open')) this.el.classList.toggle('expanded'); return; }
      sfx('click');
      if (b.dataset.g === 'skip') this.game.do('tutorial', { skip: true });
      if (b.dataset.g === 'next') this.game.do('tutorial', { step: this.index + 1 });
      this.update();
    });
    game.on(() => this.update());
    onModal(() => this.update());
    world.onFrame(() => this.placeMarker());
    this.update();
  }
  get s() { return this.game.s; }
  get index() { return this.s.story.tutorial ?? 0; }
  get step() { return tutorialOf(this.s)[this.index] ?? null; }
  /** The guide waits while a story card is open, before the first chapter has been read, and while the camera flies. */
  get waiting() { return modalOpen() || (this.s.story.chapter ?? 0) < 1 || this.flying; }
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
    if (!step || this.waiting) { this.el.hidden = true; this.mark.hidden = true; return; }
    const key = `${this.index}|${t(step.text)}`;
    if (this.el.hidden || this.key !== key) {
      this.key = key; this.el.classList.remove('expanded');
      this.el.innerHTML = `${faceHtml('ada', 'face')}<div class="say"><b>${t('Ada')}</b><p>${t(step.text)}</p>
        <div class="guide-buttons">${step.last ? `<button class="btn primary" data-g="skip">${t('Got it')}</button>` : `<button class="btn" data-g="next">${t('I know how')}</button><button class="btn ghost" data-g="skip">${t('Skip tutorial')}</button>`}</div></div>`;
      if (this.el.hidden) { this.el.hidden = false; this.el.classList.remove('enter'); void this.el.offsetWidth; this.el.classList.add('enter'); }
    }
  }
  /** Chapter cards (each once, in order), then the story beats that are due. */
  chapters() {
    const s = this.s;
    // A later deed may happen first (a family can arrive before the first hens). Keep its chapter waiting.
    const ch = CHAPTERS.find(c => c.id > (s.story.chapter ?? 0));
    if (ch && !this.shown.has(ch.id) && ch.when(s)) {
      this.shown.add(ch.id);
      showModal(this.card(ch), { modal: true, cls: 'chapter-modal', onOpen: el => this.carousel(el), onClose: () => { this.game.do('chapterSeen', { id: ch.id }); if (ch.id === 1) this.begin(); } });
    }
    if ((s.story.chapter ?? 0) < 1) return;
    for (const beat of BEATS) {
      if (this.beats.has(beat.id) || s.story.beats?.includes(beat.id)) continue;
      let due = false; try { due = beat.when(s); } catch { /* a beat that needs more state */ }
      if (!due) continue;
      this.beats.add(beat.id);
      showBeat(beat, () => this.game.do('beatSeen', { id: beat.id }));
    }
  }
  card(ch) {
    const panels = (ch.panels ?? []).slice(0, 3);
    const strip = panels.length ? `<div class="panels" data-n="${panels.length}">${panels.map((p, i) => `<figure class="${i ? '' : 'on'}"><img src="${p.img}" alt="${esc(t(p.caption))}" onerror="this.parentNode.remove()"><figcaption>${esc(t(p.caption))}</figcaption></figure>`).join('')}
      ${panels.length > 1 ? `<div class="dots">${panels.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>` : '';
    return `<div class="chapter">${strip}<small>${t('Chapter {n}', { n: ch.id })}${ch.teaser ? ` · ${t('Coming soon')}` : ''}</small><h2>${t(ch.title)}</h2><p class="sub">${t(ch.subtitle)}</p>
      ${ch.id === 1 ? `<div class="ribbon">${t(VILLAGE_NAME)}</div>` : ''}<p>${t(ch.text)}</p>
      ${ch.ada ? `<p class="ada">${faceHtml('ada', 'mini-face')}<span><b>${t('Ada')}:</b> “${esc(t(ch.ada))}”</span></p>` : ''}
      <button class="btn primary big" data-close>${ch.id === 1 ? t('Begin') : t('Continue')}</button></div>`;
  }
  /** The story panels crossfade every few seconds (not with reduced motion); a missing picture has already dropped out. */
  carousel(el) {
    const box = el.querySelector('.panels'); if (!box) return;
    let i = 0;
    const show = k => { const figs = [...box.querySelectorAll('figure')], dots = [...box.querySelectorAll('.dots i')]; if (!figs.length) { box.remove(); return; }
      i = k % figs.length; figs.forEach((f, j) => f.classList.toggle('on', j === i)); dots.forEach((d, j) => d.classList.toggle('on', j === i)); if (dots.length > figs.length) dots.slice(figs.length).forEach(d => d.remove()); };
    box.addEventListener('click', () => show(i + 1));
    if (document.body.classList.contains('reduced-motion')) return;
    const timer = setInterval(() => { if (!box.isConnected) { clearInterval(timer); return; } show(i + 1); }, 3200);
  }
  /** After Begin: fly to the weeds, then the hand and Ada. */
  async begin() {
    const o = parcelOrigin(START_PARCEL), cam = this.world.cam;
    // the first scene: the weeds to clear, or in the restored village the home farm as one picture (opening composition
    // pass): the sown beds with the mill, the coop and the farm gate, and on a wide screen the farmhouse too. On a phone
    // the frame sits a little below the beds, so they stay clear of Ada's card at the bottom.
    const w = this.s.mode === 'restore' ? [RESTORE.placed[0].x - o.x + 2, RESTORE.placed[0].z - o.z] : TUTORIAL_WEEDS[0];
    this.flying = true; this.update();
    let x = (o.x + w[0] + 0.5) * CELL, z = (o.z + w[1] + 0.5) * CELL, span = Math.min(cam.span, 32);
    if (this.s.mode === 'restore') { const f = innerHeight > innerWidth ? HOME_FRAME.tall : HOME_FRAME.wide; x = (f.x + 0.5) * CELL; z = (f.z + 0.5) * CELL; span = f.span; }
    try { if (cam.flyTo) await cam.flyTo(x, z, span, 1100); else cam.lookAt(x, z, span); } catch { /* the camera was taken over */ }
    this.flying = false; this.update();
  }
  /** Where the marker points: a cell on the map or a HUD button. */
  target() {
    const step = this.step, s = this.s; if (!step) return null;
    const o = parcelOrigin(START_PARCEL);
    if (step.point === 'weeds') { const w = TUTORIAL_WEEDS.map(([dx, dz]) => [o.x + dx, o.z + dz]).find(([x, z]) => cellType(s, x, z) === 'weeds'); return w && { cell: w }; }
    // in build mode, first the tab and the card to press, then the spot on the map
    if (['path', 'beds', 'fence'].includes(step.point) && document.body.classList.contains('build-open')) {
      const kind = { path: 'path', beds: 'bed', fence: 'fence' }[step.point], cat = step.point === 'beds' ? 'farm' : 'paths';
      if (!document.querySelector(`.sheet.build .card.on[data-kind="${kind}"]`))
        return { el: document.querySelector(`.sheet.build .card[data-kind="${kind}"]`) ? `.sheet.build .card[data-kind="${kind}"]` : `.sheet.build .tab[data-cat="${cat}"]` };
    }
    if (step.point === 'fence') { const k = RESTORE.fenceRect.missing.find(key => !s.fences[key]); return k ? { cell: k.split(',').slice(0, 2).map(Number) } : null; }
    if (step.point === 'cottage') { const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'cottage' && levelOf(s, k) > 0); return id ? { cell: [s.placed[id].x + 1, s.placed[id].z + 1] } : null; }
    if (step.point === 'path') return { cell: [31, o.z + 4] };
    if (step.point === 'beds') return { cell: [o.x + 2, o.z + 1] };
    if (step.point === 'bed') { const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'bed'); return id && { cell: [s.placed[id].x, s.placed[id].z] }; }
    if (step.point === 'coop' || step.point === 'mill') { const kind = step.point === 'coop' ? 'coop' : 'feed_mill', p = Object.values(s.placed).find(q => q.kind === kind); return p ? { cell: [p.x, p.z] } : null; }
    return { button: step.point };
  }
  placeMarker() {
    const tg = !this.waiting && !this.el.hidden && this.target(); if (!tg) { this.mark.hidden = true; return; }
    let x, y;
    if (tg.button || tg.el) { const r = document.querySelector(tg.el ?? `[data-act="${tg.button}"]`)?.getBoundingClientRect(); if (!r || !r.width) { this.mark.hidden = true; return; } x = r.left + r.width / 2; y = r.top + r.height / 2; }
    else { const v = new this.world.cam.camera.position.constructor((tg.cell[0] + 0.5) * CELL, 0.3, (tg.cell[1] + 0.5) * CELL).project(this.world.cam.camera); x = (v.x + 1) / 2 * innerWidth; y = (1 - v.y) / 2 * innerHeight; }
    this.mark.hidden = false; this.mark.style.transform = `translate(${x}px, ${y}px)`;
  }
}
