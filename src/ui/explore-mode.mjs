import { t, onLanguageChange } from '../kit/i18n.mjs';
import { modalOpen, onModal } from './modal.mjs';
import { learningStatus } from '../core/learning.mjs';
import { HOME_APPROACH, HOME_OBJECTS, HOME_MEMORY } from '../content/explore.mjs';
import { PLAYER_COLORS } from '../core/today.mjs';
import { FISH_TABLE } from '../content/goods.mjs';
import { LETTERS } from '../content/letters.mjs';
import { fillable } from './panels.mjs';
import { unread } from '../core/bonds.mjs';
import { ORDER_BOARD, MAILBOX } from '../content/world.mjs';
import { installExplore, exploreState, exploreSession, startExplore, endExplore, homeOpen, routeExplore, moveExplore, atObject, homeCooldown, OUTDOOR_SPEED } from '../core/explore.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { animalState } from '../core/animals.mjs';
import { treeState } from '../core/trees.mjs';
import { isWorking } from '../core/working.mjs';
import { BANK, nearestPond, pondAt, castPlan, shorePoint, waterDistance } from '../core/pond-bank.mjs';
import { RIGS } from '../view/skinned.mjs';
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
const ZOOM = { min: 24, max: 120, start: 28 };   // outdoors: as close as the farm view allows, out to a wide look round
const centre = c => c * 2 + 1, far = (p, x, z) => Math.hypot(p[0] - x, p[1] - z);
class ExploreMode {
  constructor(radial) {
    Object.assign(this, { radial, game: radial.game, world: radial.world, panels: radial.panels, hud: radial.hud, generation: 0, keys: new Set(), stick: [0, 0] });
    installExplore(); this.world.exploreMode = this;
    this.el = document.createElement('section'); this.el.className = 'explore-ui'; this.el.hidden = true; this.el.setAttribute('aria-label', t('Explore'));
    radial.el.parentElement.appendChild(this.el);
    // The thumb stick (Zoo Garden's: fixed bottom-left, 52 px of travel, an 18 % dead zone, full speed past it). It is one
    // permanent element beside the panel, so the panel can redraw (a new nearby action) while a thumb is on the stick.
    const joy = this.joyEl = document.createElement('div'); joy.className = 'explore-joy'; joy.hidden = true; joy.setAttribute('role', 'group'); joy.innerHTML = '<i></i>';
    radial.el.parentElement.appendChild(joy);
    const knob = joy.firstElementChild, R = 52;
    this.joyReset = () => { this.joy = false; this.stick = [0, 0]; knob.style.transform = ''; };
    const move = e => {
      const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const len = Math.hypot(dx, dy) || 1;
      if (len > R) { dx *= R / len; dy *= R / len; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stick = len < R * .18 ? [0, 0] : [dx / Math.min(len, R), dy / Math.min(len, R)];
    };
    joy.addEventListener('pointerdown', e => { if (!this.active || this.busy) return; e.preventDefault(); this.joy = true; this.target = null; try { joy.setPointerCapture(e.pointerId); } catch { /* not an active pointer */ } move(e); });
    joy.addEventListener('pointermove', e => { if (this.joy) move(e); });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) joy.addEventListener(event, () => this.joyReset());
    this.el.addEventListener('click', e => { const b = e.target.closest('[data-explore]'); if (b && !b.disabled) this.choose(b.dataset.explore); });
    const canvas = this.world.renderer.domElement;
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.addEventListener(type, e => this.pointer(e), { capture: true });
    canvas.addEventListener('wheel', e => { if (this.active) { e.preventDefault(); e.stopImmediatePropagation(); if (!this.busy) this.zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12); } }, { capture: true, passive: false });
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
  /** Tap or thumb stick: the saved choice (touch screens are given the stick on their first visit, in open()). */
  get control() { return exploreState(this.state).controls; }
  get busy() { return modalOpen() || !!this.panels.open || document.hidden || !!this.card; }
  async open({ roam = false, who = 'you' } = {}) {
    if (this.active) return;
    if (!roam && !homeOpen(this.game.s)) { this.hud.toast(t('Repair the farmhouse before going inside'), 'info'); return; }
    Object.assign(this, { roam, who, near: null, seat: null, rod: null, enterOnArrival: false, actOnArrival: null, castOnArrival: null, scanClock: 0, joy: false });
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
      const first = !exploreState(this.state).introduced, touch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && innerWidth < 900);
      this.loading = false; this.game.do('introduceExplore'); this.target = roam ? null : 'door';
      if (first && touch) this.game.do('exploreControls', { controls: 'joystick' });   // phones start with the thumb stick
      if (!roam && !routeExplore(this.state, HOME_APPROACH)) this.notice = 'The way is blocked. Try another spot.';
      this.near = this.scan();
      if (roam) { this.hintUntil = performance.now() + 5000; setTimeout(() => this.active && this.render(), 5100); }   // the welcome line steps aside
      this.span = ZOOM.start; this.world.cam.lookAt(...this.session.p, this.span); this.render();
    } catch {
      if (this.active && generation === this.generation) { this.loading = false; this.error = true; this.render(); }
    }
  }
  /** Zoom the roaming camera (wheel, pinch, + and -). The room indoors keeps its fixed view. */
  zoom(factor) {
    if (!this.session || this.inside || !Number.isFinite(factor)) return;
    this.span = Math.min(ZOOM.max, Math.max(ZOOM.min, (this.span ?? ZOOM.start) * factor));
    this.world.cam.lookAt(this.world.cam.x, this.world.cam.z, this.span);
  }
  clear(keepStick = false) { this.keys.clear(); if (!keepStick) this.joyReset(); this.actOnArrival = this.castOnArrival = null; this.press = null; this.touches?.clear(); this.pinch = 0; this.exitOnArrival = false; this.enterOnArrival = false; if (this.session) this.session.route = []; }
  /** Outdoors: the nearest thing worth doing something with (the door, the pond, a person, a bench, a ripe bed, the
   *  order board, the mailbox), with the label of its one action. Scanned a few times a second, not every frame. */
  scan(p = this.session?.p, reach = 1, all = false) {
    const e = this.session; if (!e || this.inside) return all ? [] : null;
    const s = this.state, people = this.radial.people, now = this.game.now, out = [];
    const add = (id, d, max, label, params, at) => { if (d < max * reach) out.push({ id, d: d / max, label, params, at, max }); };
    if (this.own) add('door', far(p, ...HOME_APPROACH), 3, 'Go inside');
    if (this.own && !s.fishing?.line) { const bank = nearestPond(s, ...p); add('pond', Math.max(0, bank.d), BANK.reach + .01, 'Cast a line'); }   // anywhere round any pond
    for (const w of people.walkers.values()) if (w !== this.walker && !w.indoors && !w.player) add(`person:${w.id}`, far(p, w.x, w.z), 2.6, w.pet ? 'Pet {name}' : 'Talk to {name}', { name: people.nameOf(w) }, [w.x, w.z]);
    add('board', far(p, centre(ORDER_BOARD.x), centre(ORDER_BOARD.z)), 2.8, 'Read the order board', null, [centre(ORDER_BOARD.x), centre(ORDER_BOARD.z)]);
    add('mail', far(p, centre(MAILBOX.x), centre(MAILBOX.z)), 2.4, 'Open the mailbox', null, [centre(MAILBOX.x), centre(MAILBOX.z)]);
    for (const [id, item] of Object.entries(s.placed)) {
      const def = BUILDINGS[item.kind]; if (!def) continue;
      if (item.kind === 'bench') add(`bench:${id}`, far(p, centre(item.x), centre(item.z)), 2.2, e.seated ? 'Stand up' : 'Sit on the bench', null, [centre(item.x), centre(item.z)]);
      else if (item.kind === 'bed') { if (s.beds[id]?.doneAt <= now) add(`bed:${id}`, far(p, centre(item.x), centre(item.z)), 2.2, 'Harvest', null, [centre(item.x), centre(item.z)]); }
      else if (def.fruit || def.animals || def.produces) {   // the farm's own collecting, done on foot
        const [w, d] = footprint(item.kind, item.rot), at = [(item.x + w / 2) * 2, (item.z + d / 2) * 2], max = Math.max(w, d) + 2.4, dist = far(p, ...at);
        if (dist >= max * reach) continue;
        if (def.fruit) { if (treeState(s, id, now)?.state === 'ripe') add(`fruit:${id}`, dist, max, 'Pick fruit', null, at); }
        else if (def.animals) {
          const list = s.animals[id] ?? [];
          if (list.some(a => animalState(a, now) === 'ready')) add(`animals:${id}`, dist, max, 'Collect', null, at);
          else if (isWorking(s, id) && list.some(a => animalState(a, now) === 'hungry')) add(`feed:${id}`, dist, max, 'Feed the animals', null, at);
        } else if ((s.production?.[id]?.queue ?? []).some(j => j.doneAt <= now)) add(`goods:${id}`, dist, max, 'Collect', null, at);
      }
    }
    out.sort((a, b) => a.d - b.d);
    if (all) return out;
    return (e.seated && out.find(o => o.id.startsWith('bench:'))) || (out[0] ?? null);
  }
  act(action, params) { const r = this.game.do(action, params); if (!r.ok) this.notice = r.reason; return r.ok; }
  /** One press gathers every ripe bed within a few steps, one after another (Zoo Garden's staggered harvest). */
  harvestNear(p) {
    const s = this.state, now = this.game.now, state = s;
    const ids = Object.keys(s.beds).filter(id => s.beds[id]?.doneAt <= now && s.placed[id] && far(p, centre(s.placed[id].x), centre(s.placed[id].z)) < 7)
      .sort((a, b) => far(p, centre(s.placed[a].x), centre(s.placed[a].z)) - far(p, centre(s.placed[b].x), centre(s.placed[b].z)));
    ids.forEach((id, i) => setTimeout(() => { if (this.active && this.game.s === state && state.beds[id]?.doneAt <= this.game.now) this.act('harvest', { id }); }, i * 140));
  }
  /** The thing with this id if it is within reach now (a ripe bed stands for any ripe bed beside you). */
  inReach(id) { return this.scan(this.session.p, 1, true).find(o => o.id === id || (id.startsWith('bed:') && o.id.startsWith('bed:'))) ?? null; }
  /** Cast from the bank where you stand, to the tapped spot on the water (or straight out). With a line already out and
   *  no fish on yet, this just moves the float. The catch itself stays with core/fishing.mjs. */
  cast(tap) {
    const e = this.session, s = this.state, bank = nearestPond(s, ...e.p), play = this.world.fishingPlay, line = s.fishing?.line;
    if (!this.own || !this.rod || bank.d > BANK.leave) return false;
    if (line && ['bite', 'fight'].includes(play?.phase)) return true;   // a fish is on: the Reel button has it
    if (!line) { const r = this.game.do('castLine', { pond: bank.pond.id }); if (!r.ok) { this.notice = r.reason; return true; } }
    const to = castPlan(bank.pond, e.p, tap);
    e.route = []; e.seated = false; e.yaw = Math.atan2(to[0] - e.p[0], to[1] - e.p[1]);
    Object.assign(this.rod, { cast: to, from: [...e.p], castAt: this.world.fishingView.time, landed: false });
    return true;
  }
  /** A tap on the water: cast there if you are at the bank, otherwise walk to the nearest shore and cast on arrival. */
  tapWater(pond, point) {
    const e = this.session;
    if (waterDistance(pond, ...e.p) <= BANK.reach) { this.cast(point); return; }
    if (routeExplore(this.state, shorePoint(pond, e.p))) this.castOnArrival = point; else this.notice = 'The way is blocked. Try another spot.';
  }
  /** Tap a thing: walk to a free spot beside it, then do its action on arrival. */
  walkTo(target) {
    const e = this.session, [x, z] = target.at;
    // free spots beside it: the ring right next to it first (nearest side to you), then further rings for big buildings
    const ring = r => [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]].map(([dx, dz]) => [x + dx, z + dz]).sort((a, b) => far(e.p, ...a) - far(e.p, ...b));
    const spots = [...ring(2), [x, z], ...ring(4), ...ring(6)].filter(spot => far(spot, x, z) < target.max - .3);   // only where it is in reach
    if (this.inReach(target.id)) { this.doNear(target); return true; }   // already beside it
    for (const spot of spots) if (routeExplore(this.state, spot)) { this.actOnArrival = target.id; return true; }
    return false;
  }
  /** Do the nearby outdoor thing. Rules stay with their owners: these only call the same actions the farm view uses. */
  doNear(near) {
    const [kind, id] = near.id.split(':'), e = this.session, people = this.radial.people;
    if (kind === 'door') {
      if (far(e.p, ...HOME_APPROACH) <= .35) { const r = this.game.do('enterFarmhouse'); if (r.ok) { this.target = null; this.syncScene(); } else this.notice = r.reason; }
      else if (routeExplore(this.state, HOME_APPROACH)) { this.target = 'door'; this.enterOnArrival = true; }
      else this.notice = 'The way is blocked. Try another spot.';
    } else if (kind === 'pond') this.cast(null);   // straight out from where you stand
    else if (kind === 'person') { const w = people.walkers.get(id); if (w) { e.yaw = Math.atan2(w.x - e.p[0], w.z - e.p[1]); this.world.cam.lookAt(...e.p, this.span); people.talk(w); } }
    else if (kind === 'board') this.panels.show('orders');
    else if (kind === 'mail') this.panels.show('mail');
    else if (kind === 'bench') {
      const b = this.state.placed[id];
      if (e.seated) { e.seated = false; this.seat = null; }
      else if (b) { e.seated = true; e.route = []; this.seat = { x: centre(b.x), z: centre(b.z), rot: (b.rot ?? 0) * Math.PI / 2 }; }
    } else if (kind === 'bed') this.harvestNear(e.p);
    else if (kind === 'fruit') this.act('pick', { id });
    else if (kind === 'animals') this.act('collect', { home: id });
    else if (kind === 'feed') this.act('feed', { home: id });
    else if (kind === 'goods') this.act('collectProducts', { building: id });
    this.near = this.scan();
  }
  close() {
    if (!this.active) return;
    if (this.inside && this.game.s === this.state && !this.game.do('leaveFarmhouse', { recover: true }).ok) return;
    if (this.walker && this.session && this.game.s === this.state) { this.walker.x = this.session.p[0]; this.walker.z = this.session.p[1]; }
    this.clear(); this.active = false; ++this.generation;
    if (this.walker) { this.walker.controlled = false; this.walker.indoors = false; this.radial.people.cancelTrip(this.walker); this.walker.stay = 30; }
    this.joyEl.hidden = true; if (this.world.fishingView) this.world.fishingView.angler = null; this.rod = null; endExplore(this.state); this.world.presentation = null; this.room?.dispose(); this.room = null; this.walker = null;
    document.body.classList.remove('explore-active', 'explore-inside'); this.el.hidden = true; this.el.replaceChildren(); this.html = null;
    if (this.savedCamera) this.world.cam.lookAt(this.savedCamera.x, this.savedCamera.z, this.savedCamera.span);
  }
  key(e, down) {
    if (!this.active || editing(e)) return;
    const k = e.key.toLowerCase();
    if (!KEYS.has(k) && !['e', 'f', 'enter', 'escape', 'q', '+', '=', '-'].includes(k)) return;
    // A focused button keeps its keyboard activation. Typing/IME always belongs to its field.
    if (k === 'enter' && e.target?.closest?.('button')) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (!down) { this.keys.delete(k); return; }
    if (this.busy) { this.clear(); if (k === 'escape' && this.card) { this.card = null; this.render(); } return; }
    if (KEYS.has(k)) { this.keys.add(k); this.target = null; this.actOnArrival = null; this.exitOnArrival = this.enterOnArrival = false; this.notice = null; }
    else if (k === '+' || k === '=' || k === '-') this.zoom(k === '-' ? 1.12 : 1 / 1.12);
    else if (!e.repeat && (k === 'e' || k === 'f' || k === 'enter')) this.choose('interact');
    else if (!e.repeat && k === 'escape') this.close();
  }
  pointer(e) {
    if (!this.active) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (this.busy || this.loading || this.error) { this.clear(); return; }
    const touches = (this.touches ??= new Map());
    if (e.type === 'pointerdown' || (e.type === 'pointermove' && touches.has(e.pointerId))) touches.set(e.pointerId, [e.clientX, e.clientY]); else if (e.type !== 'pointermove') touches.delete(e.pointerId);
    if (touches.size === 2) {
      const [a, b] = [...touches.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (this.pinch && dist > 0) this.zoom(this.pinch / dist);
      this.pinch = dist; if (this.press) this.press.cancelled = true; return;
    }
    this.pinch = 0;
    if (e.type === 'pointerdown') {
      if (this.press) { this.press.cancelled = true; return; }
      this.press = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.target.setPointerCapture(e.pointerId);
    } else if (e.type === 'pointermove' && this.press?.id === e.pointerId) {
      if (Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 9) this.press.cancelled = true;
    } else if (e.type === 'pointerup' && this.press?.id === e.pointerId) {
      const press = this.press; this.press = null; if (!press.cancelled) this.tap(e.clientX, e.clientY);
    } else if (e.type === 'pointercancel') this.clear(true);
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
      const door = Math.hypot(hit.x * 2 + 1 - 47, hit.z * 2 + 1 - 125) < 6, point = [hit.x * 2 + 1, hit.z * 2 + 1];
      this.target = door ? 'door' : null; this.actOnArrival = null; this.castOnArrival = null;
      const water = this.own && hit.point ? pondAt(this.state, hit.point.x, hit.point.z) : null;
      if (water) { this.tapWater(water, [hit.point.x, hit.point.z]); this.render(); return; }
      if (door && this.own) { this.doNear({ id: 'door' }); this.render(); return; }   // a tap on the farmhouse: walk to the door and go in
      const thing = door ? null : this.scan(point, .75);
      if (thing?.at && thing.id !== 'pond') { if (!this.walkTo(thing)) this.notice = 'The way is blocked. Try another spot.'; }
      else if (!routeExplore(this.state, door ? HOME_APPROACH : point)) this.notice = 'The way is blocked. Try another spot.';
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
    if (action === 'controls') { this.clear(); this.game.do('exploreControls', { controls: this.control === 'tap' ? 'joystick' : 'tap' }); return; }
    if (action === 'rest') { this.game.do('restOnSofa'); this.render(); return; }
    if (action === 'tea') {
      const r = this.game.do('brewTea');
      this.said = !r.ok ? t(r.reason) : r.guest ? t('You shared a pot of tea with {name}. A heart grows.', { name: this.radial.people?.nameOf({ id: r.guest }) ?? r.guest }) : t('A quiet cup of tea. +{xp} XP', { xp: r.xp });
      this.render(); return;
    }
    if (action === 'draw') {
      const r = this.game.do('drawInJournal');
      this.said = r.ok ? t('A new drawing for the journal. +{xp} XP', { xp: r.xp }) : t(r.reason);
      this.render(); return;
    }
    if (action === 'journal') { this.card = null; this.clear(); this.panels.show('quests'); this.render(); return; }
    if (action.startsWith('shirt:')) {
      const value = action.slice(6);
      if (this.game.do('setting', { key: 'playerColor', value }).ok && this.room?.player) {   // the room's own actor wears it at once
        this.room.player.tint = { ...this.room.player.tint, top: value };
        for (const actor of this.room.cast.actors) actor.uniforms?.uTop.value.set(value);
      }
      this.render(); return;
    }
    if (action === 'stand') { this.session.seated = false; this.card = null; this.render(); return; }
    if (action === 'outside') {
      this.card = null; this.clear(); this.target = 'farmhouse_exit';
      this.exitOnArrival = true;
      if (!routeExplore(this.state, xz(this.session.room.exit.stand))) { this.game.do('leaveFarmhouse', { recover: true }); this.exitOnArrival = false; this.syncScene(); }
      this.render(); return;
    }
    if (action !== 'interact' || this.card) return;
    const id = this.nearest(); this.clear(true); this.notice = null;
    if (!this.inside) { if (this.near) this.doNear(this.near); if (this.active) this.render(); return; }
    if (id === 'farmhouse_exit') { this.game.do('leaveFarmhouse'); this.target = null; this.syncScene(); }
    else if (id === 'farmhouse_sofa' && this.game.do('sitAtHome').ok) this.card = 'sofa';
    else if (['farmhouse_kitchen', 'farmhouse_desk', 'farmhouse_table', 'farmhouse_wardrobe'].includes(id)) { this.card = id.slice(10); this.said = null; }
    else if (id === 'farmhouse_memory_shelf' && this.game.do('readHomeMemory').ok) this.card = 'memory';
    this.render();
  }
  syncScene() {
    this.world.presentation = this.inside ? this.room : null;
    if (this.inside && this.world.fishingView) this.world.fishingView.angler = null;
    document.body.classList.toggle('explore-inside', this.inside);
    this.walker.indoors = this.inside;
    if (!this.inside) { this.walker.x = this.session.p[0]; this.walker.z = this.session.p[1]; this.world.cam.lookAt(...this.session.p, this.span); }
  }
  frame(dt) {
    if (!this.active || !this.session || this.loading || this.error) return;
    if (this.game.s !== this.state) { this.close(); return; }
    if (this.busy) this.clear();
    const x = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0) + this.stick[0];
    const y = (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) + this.stick[1];
    const yaw = this.inside ? Math.atan2(9, 11) : this.world.cam.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    if (x || y) this.actOnArrival = this.castOnArrival = null, this.enterOnArrival = false;
    const moving = !this.busy && moveExplore(this.state, x * c + y * s, -x * s + y * c, dt);
    if (this.inside) this.room.frame(this.session, moving, dt);
    else {
      const e = this.session, seat = e.seated ? this.seat : (this.seat = null);
      Object.assign(this.walker, seat ? { x: seat.x, z: seat.z, rot: seat.rot, clip: 'Sit' } : { x: e.p[0], z: e.p[1], rot: e.yaw, clip: moving ? 'Walk' : 'Idle' }, { indoors: false, speed: moving ? OUTDOOR_SPEED / (RIGS[this.walker.body]?.walk ?? 2.1) : 1 });
      // the camera glides after you (Zoo Garden's follow: 1 - exp(-9 dt)) instead of snapping each step
      const cam = this.world.cam, k = document.body.classList.contains('reduced-motion') ? 1 : 1 - Math.exp(-9 * dt);
      if (!this.busy && (Math.hypot(cam.x - e.p[0], cam.z - e.p[1]) > .02 || cam.span !== this.span)) cam.lookAt(cam.x + (e.p[0] - cam.x) * k, cam.z + (e.p[1] - cam.z) * k, this.span);
      const view = this.world.fishingView;
      if (view && this.own) {   // near any pond the rod comes out (and goes away a little further off, so it never flickers)
        const bank = nearestPond(this.state, ...e.p), line = this.state.fishing?.line, rod = (this.rod ??= { cast: null, castAt: 0, landed: true });
        const out = !e.seated && bank.d <= (view.angler ? BANK.leave : BANK.reach);
        // Near the water you only carry the rod. The line goes out when you cast, and it is wound in again as soon as you
        // walk on (or come to the bank with an old line still out): strolling round the pond never fishes by itself.
        if (line && (rod.cast ? !out || far(e.p, ...rod.from) > .8 : out)) { this.game.do('pullLine'); rod.cast = null; }
        if (!this.state.fishing?.line) rod.cast = null;
        view.angler = out ? Object.assign(rod, { x: e.p[0], z: e.p[1], yaw: e.yaw, pond: bank.pond }) : null;
        if (out && rod.cast && !moving) e.yaw = Math.atan2(rod.cast[0] - e.p[0], rod.cast[1] - e.p[1]);
      }
      if (this.castOnArrival && !e.route.length && !moving) { const point = this.castOnArrival; this.castOnArrival = null; this.cast(point); this.render(); }
      if (this.actOnArrival && !e.route.length && !moving) {   // arrived beside the thing that was tapped
        const near = this.inReach(this.actOnArrival); this.actOnArrival = null;
        if (near) { this.doNear(near); if (!this.active) return; this.render(); }
      }
      if (this.enterOnArrival && !e.route.length && far(e.p, ...HOME_APPROACH) > .35) this.enterOnArrival = false;   // the walk there was cut short
      if (this.enterOnArrival && far(e.p, ...HOME_APPROACH) <= .35) {   // Go inside was chosen from a few steps away
        this.enterOnArrival = false; const r = this.game.do('enterFarmhouse');
        if (r.ok) { this.target = null; this.syncScene(); } else this.notice = r.reason;
        this.render(); return;
      }
      if ((this.scanClock -= dt) <= 0) { this.scanClock = .2; const was = this.near?.label; this.near = this.scan(); if (was !== this.near?.label) this.lastNearest = undefined; }
    }
    const nearest = this.nearest();
    if ((this.card === 'kitchen' || this.card === 'desk') && (this.cardClock = (this.cardClock ?? 0) + dt) > 1) {   // tick the wait in place: the card's buttons are never replaced under a finger
      this.cardClock = 0;
      for (const el of this.el.querySelectorAll('[data-wait]')) {
        const ms = homeCooldown(this.state, el.dataset.wait, this.game.now);
        if (ms <= 0) { this.render(); break; }
        el.textContent = t('Ready again in {time}', { time: `${Math.floor(ms / 60000)}:${String(Math.ceil(ms / 1000) % 60).padStart(2, '0')}` });
      }
    }
    if (this.exitOnArrival && nearest === 'farmhouse_exit') { this.exitOnArrival = false; this.game.do('leaveFarmhouse'); this.syncScene(); this.render(); return; }
    if (nearest !== this.lastNearest) { this.lastNearest = nearest; this.render(); }
  }
  render() {
    if (!this.active) return;
    // Do not replace a captured direction button when the nearest-object label changes mid-hold.
    const active = document.activeElement?.dataset.explore;
    const loading = this.loading ? t(this.roam ? 'Getting ready to explore…' : 'Opening the farmhouse…') : this.error ? t(this.roam ? 'Could not start exploring. Please try again.' : 'Could not open the farmhouse. Please try again.') : '';
    const nearest = this.nearest(), control = this.control;
    let card = '';
    if (this.card === 'memory') card = `<h2>${esc(t(HOME_MEMORY.title))}</h2><p><b>${esc(t('{person:pip:display}'))}</b> — ${esc(t(HOME_MEMORY.text))}</p><p><b>${esc(t('{person:june:display}'))}</b> — ${esc(t(HOME_MEMORY.reply))}</p><p>${esc(t('Saved in your home memories. Come back to read it anytime.'))}</p>${button('album', 'Open album', 'ghost')}${button('back', 'Back', 'ghost')}`;
    const wait = id => { const ms = homeCooldown(this.state, id, this.game.now); return ms > 0 ? `${Math.floor(ms / 60000)}:${String(Math.ceil(ms / 1000) % 60).padStart(2, '0')}` : ''; };
    const timed = (action, id, text) => wait(id) ? `<p role="status" data-wait="${id}">${esc(t('Ready again in {time}', { time: wait(id) }))}</p>` : button(action, text, 'primary');
    const said = this.said ? `<p role="status"><b>${esc(this.said)}</b></p>` : '';
    if (this.card === 'kitchen') card = `<h2>${esc(t('The kitchen'))}</h2><p>${esc(t('The kettle sings and the recipe book lies open. A pot of tea is best shared.'))}</p>${said}${timed('tea', 'tea', 'Brew tea')}${button('back', 'Back', 'ghost')}`;
    if (this.card === 'desk') card = `<h2>${esc(t('The desk'))}</h2><p>${esc(t('Your planning journal, a pencil and good light.'))}</p>${said}${button('journal', 'Open the journal', 'primary')}${timed('draw', 'draw', 'Draw in the journal')}${button('back', 'Back', 'ghost')}`;
    if (this.card === 'table') {
      const st = this.state, now = this.game.now, ripe = Object.values(st.beds).filter(b => b?.doneAt <= now).length;
      const animals = Object.values(st.animals).flat(), eggs = animals.filter(a => a.doneAt != null && a.doneAt <= now).length, hungry = animals.filter(a => a.doneAt == null).length;
      const goods = Object.values(st.production ?? {}).reduce((n, p) => n + (p.queue ?? []).filter(j => j.doneAt <= now).length, 0);
      const rows = [[ripe, 'Ripe crops to harvest: {count}'], [eggs, 'Eggs and milk to collect: {count}'], [hungry, 'Hungry animals: {count}'], [goods, 'Finished goods to collect: {count}'],
        [fillable(st), 'Orders you can fill now: {count}'], [unread(st), 'Unread letters: {count}']].filter(([n]) => n > 0);
      card = `<h2>${esc(t('The day on the table'))}</h2>${rows.length ? `<ul>${rows.map(([n, text]) => `<li>${esc(t(text, { count: n }))}</li>`).join('')}</ul>` : `<p>${esc(t('Everything is in hand. Enjoy the quiet.'))}</p>`}${button('close', 'Farm view', 'primary')}${button('back', 'Back', 'ghost')}`;
    }
    if (this.card === 'wardrobe') card = `<h2>${esc(t('The wardrobe'))}</h2><p>${esc(t('Pick a shirt for today.'))}</p><div class="explore-swatches">${PLAYER_COLORS.map(c => `<button type="button" class="btn${(this.state.settings.playerColor ?? PLAYER_COLORS[0]) === c ? ' on' : ''}" data-explore="shirt:${c}" style="background:${c}" aria-label="${esc(t('Shirt'))} ${c}"></button>`).join('')}</div>${button('back', 'Back', 'ghost')}`;
    if (this.card === 'memory') {   // the collection log: how much of the valley you have found so far
      const st = this.state, fish = FISH_TABLE.filter(f => st.album?.fish?.[f.id] > 0).length, read = (st.mail ?? []).filter(m => m.read && LETTERS.some(l => l.id === m.id)).length;
      const friends = Object.values(st.people ?? {}).filter(p => (p.hearts ?? 0) >= 3).length, log = [['Fish caught', fish, FISH_TABLE.length], ['Letters read', read, LETTERS.length], ['Friends with three hearts', friends, null], ['Journal drawings', exploreState(st).drawings, null]];
      card += `<h3>${esc(t('Our collection'))}</h3><ul class="explore-log">${log.map(([text, n, of]) => `<li>${esc(t(text))} <b>${n}${of ? ` / ${of}` : ''}</b></li>`).join('')}</ul>`;
    }
    if (this.card === 'sofa') {
      const l = learningStatus(this.state, this.game.now);
      card = `<h2>${esc(t('A quiet moment at home'))}</h2><p>${esc(t('Put your feet up. The farm can wait a moment.'))}</p>`;
      if (l.canRest) card += button('rest', 'Rest for project energy', 'primary');
      else if (l.resting) card += `<p role="status">${esc(t('Your project rest is underway. You can keep exploring.'))}</p>`;
      card += button('stand', 'Stand up', 'ghost');
    }
    const outdoor = !this.inside && this.near, label = outdoor ? t(outdoor.label, outdoor.params) : HOME_OBJECTS[nearest] ? t(HOME_OBJECTS[nearest].label) : null;
    const who = this.walker && !this.own ? ` · ${this.radial.people.nameOf(this.walker)}` : '';
    const compact = this.roam && !this.inside && !loading;
    const side = `${this.error ? button('retry', 'Try again', 'primary') : ''}${button('close', 'Farm view', 'ghost')}${!loading && !card ? button('controls', control === 'tap' ? 'Use the thumb stick' : 'Use tap controls', 'ghost') : ''}`;
    this.joyEl.hidden = !!loading || !!card || control !== 'joystick'; this.joyEl.classList.toggle('raised', !compact); this.joyEl.setAttribute('aria-label', t('Movement controls'));
    if (this.joyEl.hidden && this.joy) this.joyReset();
    const interact = `<button type="button" class="btn primary" data-explore="interact" ${label ? '' : 'disabled'}>${esc(label ?? t('Walk closer to interact'))}</button>`;
    const html = `<div class="explore-heading">${esc(t(this.inside ? 'At home' : 'Explore') + who)}</div>${card ? `<div class="explore-card" data-object="${this.card}" role="dialog" aria-label="${esc(t({ sofa: 'A quiet moment at home', kitchen: 'The kitchen', desk: 'The desk', table: 'The day on the table', wardrobe: 'The wardrobe' }[this.card] ?? HOME_MEMORY.title))}">${card}</div>` : ''}
      <div class="explore-controls${compact ? ' compact' : ''}${control === 'joystick' ? ' joy' : ''}">${card || (compact && !this.notice && performance.now() > (this.hintUntil ?? 0)) ? '' : `<p role="status">${esc(loading || t(this.notice ?? (this.inside ? 'Tap the floor to walk. Tap the furniture to use it.' : this.roam ? 'Walk anywhere. Come close to people and places to do things.' : 'Walk to the door, then choose Go inside.')))}</p>`}
      ${!loading && !card ? `<div class="explore-actions">${interact}${this.inside && nearest !== 'farmhouse_exit' ? button('outside', 'Go outside', 'ghost') : ''}</div>` : ''}
      ${compact ? '' : `<div class="explore-actions">${side}</div>`}
      ${!loading && !card && control !== 'joystick' ? `<small>${esc(t('Arrow keys or WASD to walk · E to interact'))}</small>` : ''}</div>${compact ? `<div class="explore-actions explore-side">${side}</div>` : ''}
      `;
    if (this.html === html || (this.card && this.html?.replace(/data-wait="\w+">[^<]*/g, '') === html.replace(/data-wait="\w+">[^<]*/g, ''))) return;   // only a ticking wait differs
    this.html = html; this.el.innerHTML = html;
    this.el.style.fontSize = `${this.state.settings.textSize ?? 1}em`;
    if (active) this.el.querySelector(`[data-explore="${active}"]`)?.focus({ preventScroll: true });
  }
}
