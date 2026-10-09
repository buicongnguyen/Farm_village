import { t, onLanguageChange } from '../kit/i18n.mjs';
import { modalOpen, onModal } from './modal.mjs';
import { learningStatus } from '../core/learning.mjs';
import { HOME_APPROACH, HOME_OBJECTS, HOME_MEMORY } from '../content/explore.mjs';
import { installExplore, exploreState, exploreSession, startExplore, endExplore, homeOpen, routeExplore, moveExplore, atObject } from '../core/explore.mjs';
import { xz } from '../core/explore-navigation.mjs';
import { loadHomeRoom, ExploreRoom } from '../view/explore-room.mjs';
import './explore.css';

const instances = new WeakMap();
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const button = (action, text, cls = '', disabled = false) => `<button type="button" class="btn ${cls}" data-explore="${action}" ${disabled ? 'disabled' : ''}>${esc(t(text))}</button>`;
const editing = e => e.isComposing || e.target?.closest?.('input, textarea, select, [contenteditable="true"]');
const KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
export function openExplore(radial) {
  let mode = instances.get(radial);
  if (!mode) { mode = new ExploreMode(radial); instances.set(radial, mode); }
  return mode.open();
}
class ExploreMode {
  constructor(radial) {
    Object.assign(this, { radial, game: radial.game, world: radial.world, panels: radial.panels, hud: radial.hud, generation: 0, keys: new Set(), stick: [0, 0] });
    installExplore(); this.world.exploreMode = this;
    this.el = document.createElement('section'); this.el.className = 'explore-ui'; this.el.hidden = true; this.el.setAttribute('aria-label', t('Explore'));
    radial.el.parentElement.appendChild(this.el);
    this.el.addEventListener('click', e => { const b = e.target.closest('[data-explore]'); if (b && !b.disabled) this.choose(b.dataset.explore); });
    const canvas = this.world.renderer.domElement;
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.addEventListener(type, e => this.pointer(e), { capture: true });
    canvas.addEventListener('wheel', e => { if (this.active) { e.preventDefault(); e.stopImmediatePropagation(); } }, { capture: true, passive: false });
    addEventListener('keydown', e => this.key(e, true), true); addEventListener('keyup', e => this.key(e, false), true);
    addEventListener('blur', () => this.clear()); document.addEventListener('visibilitychange', () => this.clear());
    document.addEventListener('focusin', e => { if (editing(e)) this.clear(); });
    addEventListener('resize', () => this.room?.resize());
    onModal(open => { if (open) this.clear(); }); onLanguageChange(() => { this.clear(); this.render(); });
    this.game.on((r, action) => {
      if (action === 'load') this.close();
      else if (this.active) { this.session && (this.session.blocked = this.radial.people?.penCells()); this.render(); }
    });
    this.world.onFrame(dt => this.frame(dt));
  }
  get session() { return exploreSession(this.state); }
  get inside() { return this.session?.location === 'farmhouse_main'; }
  get busy() { return modalOpen() || !!this.panels.open || document.hidden || !!this.card; }
  async open() {
    if (this.active) return;
    if (!homeOpen(this.game.s)) { this.hud.toast(t('Repair the farmhouse before going inside'), 'info'); return; }
    this.state = this.game.s; this.active = true; this.loading = true; this.error = false; this.target = null; this.card = null; this.notice = null;
    const generation = ++this.generation;
    this.panels.close(); this.radial.hide(); this.radial.armed = null; this.radial.tool.hidden = true;
    this.world.cam.stop(); this.savedCamera = { x: this.world.cam.x, z: this.world.cam.z, span: this.world.cam.span };
    document.body.classList.add('explore-active'); this.el.hidden = false; this.render();
    try {
      const body = this.state.settings.playerBody === 'woman' ? 'woman' : 'man';
      const assets = await loadHomeRoom(body);
      if (!this.active || generation !== this.generation || this.game.s !== this.state) return;
      const people = this.radial.people; if (!people) throw Error('people loading'); people.sync();
      this.walker = people.walkers.get('you'); if (!this.walker) throw Error('player loading');
      this.room = new ExploreRoom(assets, this.state.settings);
      this.room.scene.background = this.world.scene.background;
      if (!startExplore(this.state, [this.walker.x, this.walker.z], assets.data, people.penCells())) throw Error('no safe approach');
      people.cancelTrip(this.walker); this.walker.controlled = true; this.walker.indoors = false;
      this.loading = false; this.game.do('introduceExplore'); this.target = 'door';
      if (!routeExplore(this.state, HOME_APPROACH)) this.notice = 'The way is blocked. Try another spot.';
      this.world.cam.lookAt(...this.session.p, 28); this.render();
    } catch {
      if (this.active && generation === this.generation) { this.loading = false; this.error = true; this.render(); }
    }
  }
  clear() { this.keys.clear(); this.stick = [0, 0]; this.press = null; this.exitOnArrival = false; if (this.session) this.session.route = []; }
  close() {
    if (!this.active) return;
    if (this.inside && this.game.s === this.state && !this.game.do('leaveFarmhouse', { recover: true }).ok) return;
    if (this.walker && this.session && this.game.s === this.state) { this.walker.x = this.session.p[0]; this.walker.z = this.session.p[1]; }
    this.clear(); this.active = false; ++this.generation;
    if (this.walker) { this.walker.controlled = false; this.walker.indoors = false; this.radial.people.cancelTrip(this.walker); this.walker.stay = 30; }
    endExplore(this.state); this.world.presentation = null; this.room?.dispose(); this.room = null; this.walker = null;
    document.body.classList.remove('explore-active', 'explore-inside'); this.el.hidden = true; this.el.replaceChildren(); this.html = null;
    if (this.savedCamera) this.world.cam.lookAt(this.savedCamera.x, this.savedCamera.z, this.savedCamera.span);
  }
  key(e, down) {
    if (!this.active || editing(e)) return;
    const k = e.key.toLowerCase();
    if (!KEYS.has(k) && !['e', 'enter', 'escape', 'q', '+', '=', '-'].includes(k)) return;
    // A focused button keeps its keyboard activation. Typing/IME always belongs to its field.
    if (k === 'enter' && e.target?.closest?.('button')) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (!down) { this.keys.delete(k); return; }
    if (this.busy) { this.clear(); if (k === 'escape' && this.card) { this.card = null; this.render(); } return; }
    if (KEYS.has(k)) { this.keys.add(k); this.target = null; this.exitOnArrival = false; this.notice = null; }
    else if (!e.repeat && (k === 'e' || k === 'enter')) this.choose('interact');
    else if (!e.repeat && k === 'escape') this.close();
  }
  pointer(e) {
    if (!this.active) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (this.busy || this.loading || this.error) { this.clear(); return; }
    if (e.type === 'pointerdown') {
      if (this.press) { this.press.cancelled = true; return; }
      this.press = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.target.setPointerCapture(e.pointerId);
    } else if (e.type === 'pointermove' && this.press?.id === e.pointerId) {
      if (Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 9) this.press.cancelled = true;
    } else if (e.type === 'pointerup' && this.press?.id === e.pointerId) {
      const press = this.press; this.press = null; if (!press.cancelled) this.tap(e.clientX, e.clientY);
    } else if (e.type === 'pointercancel') this.clear();
  }
  tap(x, y) {
    this.notice = null; this.exitOnArrival = false;
    if (this.inside) {
      const hit = this.room.pick(x, y); if (!hit) return;
      this.target = hit.id ?? null;
      const point = hit.id ? xz(this.session.room.interactions.find(o => o.id === hit.id).stand) : hit.point;
      if (!routeExplore(this.state, point)) this.notice = 'The way is blocked. Try another spot.';
    } else {
      const hit = this.world.cellAt(x, y); if (!hit) return;
      const door = Math.hypot(hit.x * 2 + 1 - 47, hit.z * 2 + 1 - 125) < 6;
      this.target = door ? 'door' : null;
      if (!routeExplore(this.state, door ? HOME_APPROACH : [hit.x * 2 + 1, hit.z * 2 + 1])) this.notice = 'The way is blocked. Try another spot.';
    }
    this.render();
  }
  nearest() {
    if (!this.session) return null;
    if (!this.inside) return Math.hypot(this.session.p[0] - 51, this.session.p[1] - 125) < .4 ? 'door' : null;
    return Object.keys(HOME_OBJECTS).find(id => atObject(this.state, id)) ?? null;
  }
  choose(action) {
    if (action === 'close') { this.close(); return; }
    if (action === 'retry') { this.close(); this.open(); return; }
    if (action === 'back') { this.card = null; this.clear(); this.render(); return; }
    if (action === 'album') { this.card = null; this.clear(); this.panels.show('album'); this.render(); return; }
    if (this.loading || this.error || modalOpen() || this.panels.open) return;
    if (action === 'controls') { this.clear(); this.game.do('exploreControls', { controls: exploreState(this.state).controls === 'tap' ? 'joystick' : 'tap' }); return; }
    if (action === 'rest') { this.game.do('restOnSofa'); this.render(); return; }
    if (action === 'stand') { this.session.seated = false; this.card = null; this.render(); return; }
    if (action === 'outside') {
      this.card = null; this.clear(); this.target = 'farmhouse_exit';
      this.exitOnArrival = true;
      if (!routeExplore(this.state, xz(this.session.room.exit.stand))) { this.game.do('leaveFarmhouse', { recover: true }); this.exitOnArrival = false; this.syncScene(); }
      this.render(); return;
    }
    if (action !== 'interact' || this.card) return;
    const id = this.nearest(); this.clear();
    if (id === 'door') {
      if (this.game.do('enterFarmhouse').ok) { this.target = null; this.syncScene(); }
    } else if (id === 'farmhouse_exit') { this.game.do('leaveFarmhouse'); this.target = null; this.syncScene(); }
    else if (id === 'farmhouse_sofa' && this.game.do('sitAtHome').ok) this.card = 'sofa';
    else if (id === 'farmhouse_memory_shelf' && this.game.do('readHomeMemory').ok) this.card = 'memory';
    this.render();
  }
  syncScene() {
    this.world.presentation = this.inside ? this.room : null;
    document.body.classList.toggle('explore-inside', this.inside);
    this.walker.indoors = this.inside;
    if (!this.inside) { this.walker.x = this.session.p[0]; this.walker.z = this.session.p[1]; this.world.cam.lookAt(...this.session.p, 28); }
  }
  frame(dt) {
    if (!this.active || !this.session || this.loading || this.error) return;
    if (this.game.s !== this.state) { this.close(); return; }
    if (this.busy) this.clear();
    const x = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0) + this.stick[0];
    const y = (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) + this.stick[1];
    const yaw = this.inside ? Math.atan2(9, 11) : this.world.cam.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    const moving = !this.busy && moveExplore(this.state, x * c + y * s, -x * s + y * c, dt);
    if (this.inside) this.room.frame(this.session, moving, dt);
    else {
      Object.assign(this.walker, { x: this.session.p[0], z: this.session.p[1], rot: this.session.yaw, clip: moving ? 'Walk' : 'Idle', indoors: false });
      if (moving) this.world.cam.lookAt(...this.session.p, 28);
    }
    const nearest = this.nearest();
    if (this.exitOnArrival && nearest === 'farmhouse_exit') { this.exitOnArrival = false; this.game.do('leaveFarmhouse'); this.syncScene(); this.render(); return; }
    if (nearest !== this.lastNearest) { this.lastNearest = nearest; this.render(); }
  }
  render() {
    if (!this.active) return;
    const active = document.activeElement?.dataset.explore;
    const loading = this.loading ? t('Opening the farmhouse…') : this.error ? t('Could not open the farmhouse. Please try again.') : '';
    const nearest = this.nearest(), control = exploreState(this.state).controls;
    let card = '';
    if (this.card === 'memory') card = `<h2>${esc(t(HOME_MEMORY.title))}</h2><p><b>${esc(t('{person:pip:display}'))}</b> — ${esc(t(HOME_MEMORY.text))}</p><p><b>${esc(t('{person:june:display}'))}</b> — ${esc(t(HOME_MEMORY.reply))}</p><p>${esc(t('Saved in your home memories. Come back to read it anytime.'))}</p>${button('album', 'Open album', 'go')}${button('back', 'Back', 'ghost')}`;
    if (this.card === 'sofa') {
      const l = learningStatus(this.state, this.game.now);
      card = `<h2>${esc(t('A quiet moment at home'))}</h2><p>${esc(t('Put your feet up. The farm can wait a moment.'))}</p>`;
      if (l.canRest) card += button('rest', 'Rest for project energy', 'primary');
      else if (l.resting) card += `<p role="status">${esc(t('Your project rest is underway. You can keep exploring.'))}</p>`;
      card += button('stand', 'Stand up', 'ghost');
    }
    const label = nearest === 'door' ? 'Go inside' : HOME_OBJECTS[nearest]?.label;
    const html = `<div class="explore-heading">${esc(t(this.inside ? 'At home' : 'Explore'))}</div>${card ? `<div class="explore-card" role="dialog" aria-label="${esc(t(this.card === 'sofa' ? 'A quiet moment at home' : HOME_MEMORY.title))}">${card}</div>` : ''}
      <div class="explore-controls"><p role="status">${esc(loading || t(this.notice ?? (this.inside ? 'Tap the floor to walk. Tap the sofa or memory shelf to visit it.' : 'Walk to the door, then choose Go inside.')))}</p>
      ${!loading && !card ? `<div class="explore-actions">${button('interact', label ?? 'Walk closer to interact', 'primary', !label)}${this.inside && nearest !== 'farmhouse_exit' ? button('outside', 'Go outside', 'ghost') : ''}</div>` : ''}
      <div class="explore-actions">${this.error ? button('retry', 'Try again', 'primary') : ''}${button('close', 'Farm view', 'ghost')}${!loading ? button('controls', control === 'tap' ? 'Use movement buttons' : 'Use tap controls', 'ghost') : ''}</div>
      ${!loading && !card ? `<small>${esc(t('Arrow keys or WASD to walk · E to interact'))}</small>` : ''}</div>
      ${!loading && !card && control === 'joystick' ? `<div class="explore-stick" role="group" aria-label="${esc(t('Movement controls'))}">${[['up','↑','Move up'],['left','←','Move left'],['down','↓','Move down'],['right','→','Move right']].map(([id,symbol,label]) => `<button type="button" class="btn" data-move="${id}" aria-label="${esc(t(label))}">${symbol}</button>`).join('')}</div>` : ''}`;
    if (this.html === html) return;
    this.html = html; this.stick = [0, 0]; this.el.innerHTML = html;
    this.el.style.fontSize = `${this.state.settings.textSize ?? 1}em`;
    this.el.querySelectorAll('[data-move]').forEach(b => {
      const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      b.addEventListener('pointerdown', e => { e.preventDefault(); this.target = null; this.exitOnArrival = false; this.stick = vectors[b.dataset.move]; b.setPointerCapture(e.pointerId); });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, () => { this.stick = [0, 0]; });
    });
    if (active) this.el.querySelector(`[data-explore="${active}"]`)?.focus({ preventScroll: true });
  }
}
