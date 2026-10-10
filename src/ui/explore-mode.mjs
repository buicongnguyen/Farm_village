import { t, onLanguageChange } from '../kit/i18n.mjs';
import { modalOpen, onModal } from './modal.mjs';
import { learningStatus } from '../core/learning.mjs';
import { HOME_APPROACH, HOME_OBJECTS, HOME_MEMORY } from '../content/explore.mjs';
import { POND_FISHING_SPOTS, ORDER_BOARD, MAILBOX } from '../content/world.mjs';
import { installExplore, exploreState, exploreSession, startExplore, endExplore, homeOpen, routeExplore, moveExplore, atObject } from '../core/explore.mjs';
import { xz } from '../core/explore-navigation.mjs';
import { loadHomeRoom, ExploreRoom } from '../view/explore-room.mjs';
import './explore.css';

const instances = new WeakMap();
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const button = (action, text, cls = '', disabled = false) => `<button type="button" class="btn ${cls}" data-explore="${action}" ${disabled ? 'disabled' : ''}>${esc(t(text))}</button>`;
const editing = e => e.isComposing || e.target?.closest?.('input, textarea, select, [contenteditable="true"]');
const KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
/** opts.roam: start walking freely where the character stands (the HUD's Explore button) instead of heading for the
 *  farmhouse door; opts.who: the family member to control ('you' by default). */
export function openExplore(radial, opts) {
  let mode = instances.get(radial);
  if (!mode) { mode = new ExploreMode(radial); instances.set(radial, mode); }
  return mode.open(opts);
}
const centre = c => c * 2 + 1, far = (p, x, z) => Math.hypot(p[0] - x, p[1] - z);
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
  async open({ roam = false, who = 'you' } = {}) {
    if (this.active) return;
    if (!roam && !homeOpen(this.game.s)) { this.hud.toast(t('Repair the farmhouse before going inside'), 'info'); return; }
    Object.assign(this, { roam, who, near: null, seat: null, enterOnArrival: false, scanClock: 0 });
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
      this.walker = people.walkers.get(who) ?? people.walkers.get('you'); if (!this.walker) throw Error('player loading');
      if (roam && this.walker.indoors) { this.close(); this.hud.toast(t('It is night and everyone is asleep. Explore in the morning.'), 'info'); return; }
      this.own = !!this.walker.player;   // only your own character goes inside and fishes for you
      this.room = new ExploreRoom(assets, this.state.settings);
      this.room.scene.background = this.world.scene.background;
      if (!startExplore(this.state, [this.walker.x, this.walker.z], assets.data, people.penCells())) throw Error('no safe approach');
      people.cancelTrip(this.walker); this.walker.controlled = true; this.walker.indoors = false;
      this.loading = false; this.game.do('introduceExplore'); this.target = roam ? null : 'door';
      if (!roam && !routeExplore(this.state, HOME_APPROACH)) this.notice = 'The way is blocked. Try another spot.';
      this.near = this.scan();
      this.world.cam.lookAt(...this.session.p, 28); this.render();
    } catch {
      if (this.active && generation === this.generation) { this.loading = false; this.error = true; this.render(); }
    }
  }
  clear() { this.keys.clear(); this.stick = [0, 0]; this.press = null; this.exitOnArrival = false; this.enterOnArrival = false; if (this.session) this.session.route = []; }
  /** Outdoors: the nearest thing worth doing something with (the door, the pond, a person, a bench, a ripe bed, the
   *  order board, the mailbox), with the label of its one action. Scanned a few times a second, not every frame. */
  scan() {
    const e = this.session; if (!e || this.inside) return null;
    const s = this.state, p = e.p, people = this.radial.people, now = this.game.now, out = [];
    const add = (id, d, max, label, params) => { if (d < max) out.push({ id, d: d / max, label, params }); };
    if (this.own) add('door', far(p, ...HOME_APPROACH), 3, 'Go inside');
    if (this.own && !s.fishing?.line) for (const [x, z] of POND_FISHING_SPOTS) add('pond', far(p, centre(x), centre(z)), 3.4, 'Fish here');
    for (const w of people.walkers.values()) if (w !== this.walker && !w.indoors && !w.pet && !w.player) add(`person:${w.id}`, far(p, w.x, w.z), 2.6, 'Talk to {name}', { name: people.nameOf(w) });
    add('board', far(p, centre(ORDER_BOARD.x), centre(ORDER_BOARD.z)), 2.8, 'Read the order board');
    add('mail', far(p, centre(MAILBOX.x), centre(MAILBOX.z)), 2.4, 'Open the mailbox');
    for (const [id, item] of Object.entries(s.placed)) {
      if (item.kind === 'bench') add(`bench:${id}`, far(p, centre(item.x), centre(item.z)), 2.2, e.seated ? 'Stand up' : 'Sit on the bench');
      else if (item.kind === 'bed' && s.beds[id]?.doneAt <= now) add(`bed:${id}`, far(p, centre(item.x), centre(item.z)), 2.2, 'Harvest');
    }
    return (e.seated && out.find(o => o.id.startsWith('bench:'))) || (out.sort((a, b) => a.d - b.d)[0] ?? null);
  }
  /** Do the nearby outdoor thing. Rules stay with their owners: these only call the same actions the farm view uses. */
  doNear(near) {
    const [kind, id] = near.id.split(':'), e = this.session, people = this.radial.people;
    if (kind === 'door') {
      if (far(e.p, ...HOME_APPROACH) <= .35) { const r = this.game.do('enterFarmhouse'); if (r.ok) { this.target = null; this.syncScene(); } else this.notice = r.reason; }
      else if (routeExplore(this.state, HOME_APPROACH)) { this.target = 'door'; this.enterOnArrival = true; }
      else this.notice = 'The way is blocked. Try another spot.';
    } else if (kind === 'pond') { const panels = this.panels; this.savedCamera = null; this.close(); panels.onFishCast?.(false); return; }   // fishing takes over; the camera stays on you
    else if (kind === 'person') { const w = people.walkers.get(id); if (w) { e.yaw = Math.atan2(w.x - e.p[0], w.z - e.p[1]); this.world.cam.lookAt(...e.p, 28); people.talk(w); } }
    else if (kind === 'board') this.panels.show('orders');
    else if (kind === 'mail') this.panels.show('mail');
    else if (kind === 'bench') {
      const b = this.state.placed[id];
      if (e.seated) { e.seated = false; this.seat = null; }
      else if (b) { e.seated = true; e.route = []; this.seat = { x: centre(b.x), z: centre(b.z), rot: (b.rot ?? 0) * Math.PI / 2 }; }
    } else if (kind === 'bed') { const r = this.game.do('harvest', { id }); if (!r.ok) this.notice = r.reason; }
    this.near = this.scan();
  }
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
    if (KEYS.has(k)) { this.keys.add(k); this.target = null; this.exitOnArrival = this.enterOnArrival = false; this.notice = null; }
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
    this.notice = null; this.exitOnArrival = this.enterOnArrival = false;
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
    if (!this.inside) return this.near?.id ?? null;
    return Object.keys(HOME_OBJECTS).find(id => atObject(this.state, id)) ?? null;
  }
  choose(action) {
    if (action === 'close') { this.close(); return; }
    if (action === 'retry') { const again = { roam: this.roam, who: this.who }; this.close(); this.open(again); return; }
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
    const id = this.nearest(); this.clear(); this.notice = null;
    if (!this.inside) { if (this.near) this.doNear(this.near); if (this.active) this.render(); return; }
    if (id === 'farmhouse_exit') { this.game.do('leaveFarmhouse'); this.target = null; this.syncScene(); }
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
      const e = this.session, seat = e.seated ? this.seat : (this.seat = null);
      Object.assign(this.walker, seat ? { x: seat.x, z: seat.z, rot: seat.rot, clip: 'Sit' } : { x: e.p[0], z: e.p[1], rot: e.yaw, clip: moving ? 'Walk' : 'Idle' }, { indoors: false, speed: 1 });
      if (moving) this.world.cam.lookAt(...e.p, 28);
      if (this.enterOnArrival && !e.route.length && far(e.p, ...HOME_APPROACH) > .35) this.enterOnArrival = false;   // the walk there was cut short
      if (this.enterOnArrival && far(e.p, ...HOME_APPROACH) <= .35) {   // Go inside was chosen from a few steps away
        this.enterOnArrival = false; const r = this.game.do('enterFarmhouse');
        if (r.ok) { this.target = null; this.syncScene(); } else this.notice = r.reason;
        this.render(); return;
      }
      if ((this.scanClock -= dt) <= 0) { this.scanClock = .2; const was = this.near?.label; this.near = this.scan(); if (was !== this.near?.label) this.lastNearest = undefined; }
    }
    const nearest = this.nearest();
    if (this.exitOnArrival && nearest === 'farmhouse_exit') { this.exitOnArrival = false; this.game.do('leaveFarmhouse'); this.syncScene(); this.render(); return; }
    if (nearest !== this.lastNearest) { this.lastNearest = nearest; this.render(); }
  }
  render() {
    if (!this.active) return;
    // Do not replace a captured direction button when the nearest-object label changes mid-hold.
    if (Math.hypot(...this.stick) && !this.busy) { this.renderPending = true; return; }
    const active = document.activeElement?.dataset.explore;
    const loading = this.loading ? t(this.roam ? 'Getting ready to explore…' : 'Opening the farmhouse…') : this.error ? t(this.roam ? 'Could not start exploring. Please try again.' : 'Could not open the farmhouse. Please try again.') : '';
    const nearest = this.nearest(), control = exploreState(this.state).controls;
    let card = '';
    if (this.card === 'memory') card = `<h2>${esc(t(HOME_MEMORY.title))}</h2><p><b>${esc(t('{person:pip:display}'))}</b> — ${esc(t(HOME_MEMORY.text))}</p><p><b>${esc(t('{person:june:display}'))}</b> — ${esc(t(HOME_MEMORY.reply))}</p><p>${esc(t('Saved in your home memories. Come back to read it anytime.'))}</p>${button('album', 'Open album', 'ghost')}${button('back', 'Back', 'ghost')}`;
    if (this.card === 'sofa') {
      const l = learningStatus(this.state, this.game.now);
      card = `<h2>${esc(t('A quiet moment at home'))}</h2><p>${esc(t('Put your feet up. The farm can wait a moment.'))}</p>`;
      if (l.canRest) card += button('rest', 'Rest for project energy', 'primary');
      else if (l.resting) card += `<p role="status">${esc(t('Your project rest is underway. You can keep exploring.'))}</p>`;
      card += button('stand', 'Stand up', 'ghost');
    }
    const outdoor = !this.inside && this.near, label = outdoor ? t(outdoor.label, outdoor.params) : HOME_OBJECTS[nearest] ? t(HOME_OBJECTS[nearest].label) : null;
    const who = this.walker && !this.own ? ` · ${this.radial.people.nameOf(this.walker)}` : '';
    const interact = `<button type="button" class="btn primary" data-explore="interact" ${label ? '' : 'disabled'}>${esc(label ?? t('Walk closer to interact'))}</button>`;
    const html = `<div class="explore-heading">${esc(t(this.inside ? 'At home' : 'Explore') + who)}</div>${card ? `<div class="explore-card" data-object="${this.card}" role="dialog" aria-label="${esc(t(this.card === 'sofa' ? 'A quiet moment at home' : HOME_MEMORY.title))}">${card}</div>` : ''}
      <div class="explore-controls">${card ? '' : `<p role="status">${esc(loading || t(this.notice ?? (this.inside ? 'Tap the floor to walk. Tap the sofa or memory shelf to visit it.' : this.roam ? 'Walk anywhere. Come close to people and places to do things.' : 'Walk to the door, then choose Go inside.')))}</p>`}
      ${!loading && !card ? `<div class="explore-actions">${interact}${this.inside && nearest !== 'farmhouse_exit' ? button('outside', 'Go outside', 'ghost') : ''}</div>` : ''}
      <div class="explore-actions">${this.error ? button('retry', 'Try again', 'primary') : ''}${button('close', 'Farm view', 'ghost')}${!loading && !card ? button('controls', control === 'tap' ? 'Use movement buttons' : 'Use tap controls', 'ghost') : ''}</div>
      ${!loading && !card ? `<small>${esc(t('Arrow keys or WASD to walk · E to interact'))}</small>` : ''}</div>
      ${!loading && !card && control === 'joystick' ? `<div class="explore-stick" role="group" aria-label="${esc(t('Movement controls'))}">${[['up','↑','Move up'],['left','←','Move left'],['down','↓','Move down'],['right','→','Move right']].map(([id,symbol,label]) => `<button type="button" class="btn" data-move="${id}" aria-label="${esc(t(label))}">${symbol}</button>`).join('')}</div>` : ''}`;
    if (this.html === html) return;
    this.html = html; this.stick = [0, 0]; this.el.innerHTML = html;
    this.el.style.fontSize = `${this.state.settings.textSize ?? 1}em`;
    this.el.querySelectorAll('[data-move]').forEach(b => {
      const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      b.addEventListener('pointerdown', e => { e.preventDefault(); this.target = null; this.exitOnArrival = this.enterOnArrival = false; this.stick = vectors[b.dataset.move]; b.setPointerCapture(e.pointerId); });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, () => { this.stick = [0, 0]; if (this.renderPending) { this.renderPending = false; this.render(); } });
    });
    if (active) this.el.querySelector(`[data-explore="${active}"]`)?.focus({ preventScroll: true });
  }
}
