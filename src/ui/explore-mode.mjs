import { t, onLanguageChange } from '../kit/i18n.mjs';
import { modalOpen, onModal } from './modal.mjs';
import { learningStatus } from '../core/learning.mjs';
import { HOME_APPROACH, HOME_OBJECTS, HOME_MEMORY, HOME_THINGS, roomAtLevel } from '../content/explore.mjs';
import { wardrobe, wearOf, bodyOf, BODIES, SKIRTS, skirtOf } from '../content/wardrobe.mjs';
import { wornRig } from '../view/skinned.mjs';
import { GOODS } from '../content/goods.mjs';
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
import { sfx } from '../kit/sound.mjs';
import { BANK, nearestPond, pondAt, castPlan, shorePoint, waterDistance } from '../core/pond-bank.mjs';
import { CIVIC_INTERIORS } from '../content/civic-interiors.mjs';
import { installCivicExplore, facilityKind, facilityDoor, facilityOpen } from '../core/civic-explore.mjs';
import { RIGS } from '../view/skinned.mjs';
import { xz, roomClear, roomRoute } from '../core/explore-navigation.mjs';
import { installMoves, MOVES } from '../core/moves.mjs';
import { CELL as CELL_M } from '../content/world.mjs';
import { ROOM_PEOPLE, withPeople, talkNumbers } from '../content/room-people.mjs';
import { loadHomeRoom, ExploreRoom } from '../view/explore-room.mjs';
import './explore.css';

const instances = new WeakMap();
const HOME_LABELS = { farmhouse_sofa: 'Sofa', farmhouse_memory_shelf: 'Memory shelf', farmhouse_kitchen: 'Tea', farmhouse_desk: 'Journal', farmhouse_table: 'Plan the day', farmhouse_wardrobe: 'Wardrobe', farmhouse_exit: 'Go outside',
  ...Object.fromEntries(Object.values(HOME_THINGS).map(th => [`farmhouse_${th.id}`, th.label])) };
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
    installExplore(); installCivicExplore(); installMoves(); this.world.exploreMode = this;
    // the swing pad (Zoo Garden's attack pad): its own element, like the stick, answering on pointerdown so a second
    // finger works while the first is on the stick (phones drop the click of a second finger)
    const pad = this.padEl = document.createElement('button'); pad.type = 'button'; pad.className = 'explore-swing'; pad.hidden = true;
    pad.innerHTML = '<span aria-hidden="true">🌾</span>'; radial.el.parentElement.appendChild(pad);
    pad.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.swing(); });
    pad.addEventListener('click', e => { if (e.detail === 0) this.swing(); });   // the keyboard's Enter on a focused pad
    this.el = document.createElement('section'); this.el.className = 'explore-ui'; this.el.hidden = true; this.el.setAttribute('aria-label', t('Explore'));
    radial.el.parentElement.appendChild(this.el);
    this.pinsEl = document.createElement('div'); this.pinsEl.className = 'home-pins'; this.pinsEl.hidden = true;
    this.pins = new Map();
    radial.el.parentElement.appendChild(this.pinsEl);
    this.sayEl = document.createElement('div'); this.sayEl.className = 'home-say'; this.sayEl.hidden = true; radial.el.parentElement.appendChild(this.sayEl);
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
  get inside() { return !!this.session && this.session.location !== 'outdoors'; }
  get objects() { return this.kind ? { ...CIVIC_INTERIORS[this.kind].objects, ...Object.fromEntries((ROOM_PEOPLE[this.kind] ?? []).map(w => [`person_${w.id}`, { label: 'Say hello', pin: w.role, person: w }])), interior_exit: { label: 'Go outside' } } : HOME_OBJECTS; }
  get approach() { return this.site ? facilityDoor(this.state, this.site) ?? this.entryDoor : HOME_APPROACH; }
  enterRoom() { return this.site ? this.game.do('enterFacility', { id: this.site }) : this.game.do('enterFarmhouse'); }
  leaveRoom(recover = false) { return this.game.do(this.site ? 'leaveFacility' : 'leaveFarmhouse', { recover }); }
  makePins() {
    this.pinsEl.replaceChildren(); this.pins.clear();
    for (const [id, object] of Object.entries(this.objects)) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.homeObject = id;
      b.addEventListener('click', () => { if (!this.inside || this.busy) return; this.clear(); this.target = id; this.notice = null;
        if (!routeExplore(this.state, xz(this.session.room.interactions.find(o => o.id === id).stand))) this.notice = 'The way is blocked. Try another spot.';
        this.render(); });
      this.pinsEl.append(b); this.pins.set(id, { button: b, label: this.kind ? object.pin ?? object.label : HOME_LABELS[id] });
    }
  }
  /** Tap or thumb stick: the saved choice (touch screens are given the stick on their first visit, in open()). */
  get control() { return exploreState(this.state).controls; }
  get busy() { return modalOpen() || !!this.panels.open || document.hidden || !!this.card; }
  async open({ roam = false, who = 'you', site = null } = {}) {
    if (this.active) { if (site && site !== this.site) this.close(); else return; }
    if (site && !facilityOpen(this.game.s, site)) { this.hud.toast(t('Repair this building before going inside'), 'info'); return; }
    if (!site && !roam && !homeOpen(this.game.s)) { this.hud.toast(t('Repair the farmhouse before going inside'), 'info'); return; }
    Object.assign(this, { roam, who, site, kind: site ? facilityKind(this.game.s, site) : null, entryDoor: site ? facilityDoor(this.game.s, site) : HOME_APPROACH, near: null, seat: null, rod: null, enterOnArrival: false, actOnArrival: null, castOnArrival: null, scanClock: 0, joy: false });
    this.state = this.game.s; this.makePins(); this.active = true; this.loading = true; this.error = false; this.target = null; this.card = null; this.notice = null;
    const generation = ++this.generation;
    this.panels.close(); this.radial.hide(); this.radial.armed = null; this.radial.tool.hidden = true;
    this.world.cam.stop(); this.savedCamera = { x: this.world.cam.x, z: this.world.cam.z, span: this.world.cam.span };
    document.body.classList.add('explore-active'); this.el.hidden = false; this.render();
    try {
      const body = wornRig(bodyOf(this.state).rig, wearOf(this.state));
      const assets = await loadHomeRoom(body, this.kind);
      if (!this.active || generation !== this.generation || this.game.s !== this.state) return;
      const people = this.radial.people; if (!people) throw Error('people loading'); people.sync();
      this.walker = people.walkers.get(who) ?? people.walkers.get('you'); if (!this.walker) throw Error('player loading');
      if (roam && this.walker.indoors) { this.close(); this.hud.toast(t('It is night and everyone is asleep. Explore in the morning.'), 'info'); return; }
      this.own = !!this.walker.player;   // only your own character goes inside and fishes for you
      const comfort = this.state.house?.level ?? 1; if (!this.kind) assets.data = roomAtLevel(assets.data, comfort); else assets.data = withPeople(assets.data, this.kind, roomClear, roomRoute);   // someone is in   // the room as this house level has made it
      this.room = new ExploreRoom(assets, this.state.settings, comfort);
      if (!startExplore(this.state, [this.walker.x, this.walker.z], assets.data, people.penCells())) throw Error('no safe approach');
      people.cancelTrip(this.walker); this.walker.controlled = true; this.walker.indoors = false;
      const first = !exploreState(this.state).introduced, touch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && innerWidth < 900);
      this.loading = false; this.game.do('introduceExplore'); this.target = roam ? null : 'door';
      if (first && touch) this.game.do('exploreControls', { controls: 'joystick' });   // phones start with the thumb stick
      if (!roam && !routeExplore(this.state, this.approach)) this.notice = 'The way is blocked. Try another spot.';
      this.near = this.scan();
      if (roam) { this.hintUntil = performance.now() + 5000; setTimeout(() => this.active && this.render(), 5100); }   // the welcome line steps aside
      this.span = ZOOM.start; this.world.cam.lookAt(...this.session.p, this.span); this.render();
    } catch {
      if (this.active && generation === this.generation) { this.loading = false; this.error = true; this.render(); }
    }
  }
  /** Wheel, pinch and +/- zoom the active scene without changing the other camera. */
  zoom(factor) {
    if (!this.session || !Number.isFinite(factor)) return;
    if (this.inside) { this.room.zoom(factor); this.render(); return; }
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
    if (this.own) add('door', far(p, ...this.approach), 3, 'Go inside');
    if (this.own && this.site) add('home', far(p, ...HOME_APPROACH), 3, 'Go inside: {place}', { place: t('Farmhouse') }, HOME_APPROACH);
    if (this.own && !s.fishing?.line) { const bank = nearestPond(s, ...p); add('pond', Math.max(0, bank.d), BANK.reach + .01, 'Cast a line'); }   // anywhere round any pond
    for (const w of people.walkers.values()) if (w !== this.walker && !w.indoors && !w.player) add(`person:${w.id}`, far(p, w.x, w.z), 2.6, w.pet ? 'Pet {name}' : 'Talk to {name}', { name: people.nameOf(w) }, [w.x, w.z]);
    add('board', far(p, centre(ORDER_BOARD.x), centre(ORDER_BOARD.z)), 2.8, 'Read the order board', null, [centre(ORDER_BOARD.x), centre(ORDER_BOARD.z)]);
    add('mail', far(p, centre(MAILBOX.x), centre(MAILBOX.z)), 2.4, 'Open the mailbox', null, [centre(MAILBOX.x), centre(MAILBOX.z)]);
    if (this.own && this.site !== 'barn' && facilityOpen(s, 'barn')) { const door = facilityDoor(s, 'barn'); add('facility:barn', far(p, ...door), 3, 'Go inside: {place}', { place: t('Barn') }, door); }
    for (const [id, item] of Object.entries(s.placed)) {
      const def = BUILDINGS[item.kind]; if (!def) continue;
      if (this.own && id !== this.site && facilityOpen(s, id)) { const door = facilityDoor(s, id); add(`facility:${id}`, far(p, ...door), 3, 'Go inside: {place}', { place: t(def.name) }, door); }
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
    if (!line) { const r = this.game.do('castLine', { pond: bank.pond.id, foot: true }); if (!r.ok) { this.notice = r.reason; return true; } sfx('pop'); }
    // no chosen spot: cast again where you cast last, as long as that is this pond
    if (tap) this.lastTap = { pond: bank.pond.id, at: tap }; else if (this.lastTap?.pond === bank.pond.id) tap = this.lastTap.at;
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
      if (far(e.p, ...this.approach) <= .35) { const r = this.enterRoom(); if (r.ok) { this.target = null; this.syncScene(); } else this.notice = r.reason; }
      else if (routeExplore(this.state, this.approach)) { this.target = 'door'; this.enterOnArrival = true; }
      else this.notice = 'The way is blocked. Try another spot.';
    } else if (kind === 'facility' || kind === 'home') { this.close(); this.open({ site: kind === 'home' ? null : id }); }
    else if (kind === 'pond') this.cast(null);   // straight out from where you stand
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
    if (this.inside && this.game.s === this.state && !this.leaveRoom(true).ok) return;
    if (this.walker && this.session && this.game.s === this.state) { this.walker.x = this.session.p[0]; this.walker.z = this.session.p[1]; }
    this.clear(); this.active = false; ++this.generation;
    if (this.walker) { this.walker.controlled = false; this.walker.indoors = false; this.radial.people.cancelTrip(this.walker); this.walker.stay = 30; }
    this.joyEl.hidden = true; this.padEl.hidden = true; this.pinsEl.hidden = true; this.sayEl.hidden = true; if (this.world.fishingView) this.world.fishingView.angler = null; this.rod = null; endExplore(this.state); this.world.presentation = null; this.room?.dispose(); this.room = null; this.walker = null;
    document.body.classList.remove('explore-active', 'explore-inside'); this.el.hidden = true; this.el.replaceChildren(); this.html = null;
    if (this.savedCamera) this.world.cam.lookAt(this.savedCamera.x, this.savedCamera.z, this.savedCamera.span);
  }
  key(e, down) {
    if (!this.active || editing(e)) return;
    const k = e.key.toLowerCase();
    if (!KEYS.has(k) && !['e', 'f', 'enter', 'escape', 'q', '+', '=', '-', ' '].includes(k)) return;
    // A focused button keeps its keyboard activation. Typing/IME always belongs to its field.
    if (k === 'enter' && e.target?.closest?.('button')) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (!down) { this.keys.delete(k); return; }
    if (this.busy) { this.clear(); if (k === 'escape' && this.card) { this.card = null; this.render(); } return; }
    if (KEYS.has(k)) { this.keys.add(k); this.target = null; this.actOnArrival = null; this.exitOnArrival = this.enterOnArrival = false; this.notice = null; }
    else if (k === '+' || k === '=' || k === '-') this.zoom(k === '-' ? 1.12 : 1 / 1.12);
    else if (!e.repeat && (k === 'e' || k === 'f' || k === 'enter')) this.choose('interact');
    else if (k === ' ') this.swing();   // Space: a swing (held, it swings again as soon as it can)
    else if (!e.repeat && k === 'escape') this.close();
  }
  /** Can you swing now? Walking freely outdoors, on foot, not fishing, no card or panel up. */
  get canSwing() { return !!this.session && !this.inside && !this.busy && !this.loading && !this.error && this.own && !this.state.fishing?.line && !(this.rod?.cast); }
  /** A swing (Zoo Garden's normal attack, made peaceful): the Hammer clip, crows near you fly off, a weed or a stone just
   *  ahead is knocked loose (core/moves.mjs, a few a day), water ahead splashes. */
  swing() {
    if (!this.canSwing) return; const now = performance.now(); if (now < (this.swingAt ?? 0)) return; this.swingAt = now + MOVES.swingMs;
    const e = this.session, [x, z] = e.p, yaw = e.yaw ?? 0;
    if (this.walker?.subject) this.walker.subject.once = { clip: 'Hammer' };
    const r = this.game.do('swing', { x, z, yaw }), [cx, cz] = r.cell ?? [Math.floor(x / CELL_M), Math.floor(z / CELL_M)];
    this.world.critters?.scare(cx, cz, 3);
    const juice = this.world.juice, fx = x + Math.sin(yaw) * MOVES.reach, fz = z + Math.cos(yaw) * MOVES.reach;
    if (r.hit === 'water') this.splash(fx, fz); else if (!r.knocked) juice?.dust(fx, fz, 0.6);
    if (r.tired) this.hud.toast(t('That is enough weeding for today. The rest can wait for tomorrow.'), 'info');
  }
  /** Water thrown up where a swing (or a skill) lands: a ring on the water and a burst of drops. */
  splash(x, z) {
    const juice = this.world.juice; if (!juice?.ground) return;
    juice.ground.spawn({ x, y: 0.1, z, life: 0.7, size: 1.2, size1: 3.4, shape: 2, flat: true, color: '#e6fbff', alpha: 0.8 });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; juice.particles?.spawn({ x, y: 0.3, z, vx: Math.cos(a) * 1.6, vy: 3 + (i % 3), vz: Math.sin(a) * 1.6, gravity: 9, life: 0.7, size: 0.35, size1: 0.2, shape: 0, color: '#bff3ff', alpha: 0.9 }); }
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
      const door = this.site ? far([hit.x * 2 + 1, hit.z * 2 + 1], ...this.approach) < 5 : Math.hypot(hit.x * 2 + 1 - 47, hit.z * 2 + 1 - 125) < 6, point = [hit.x * 2 + 1, hit.z * 2 + 1];
      this.target = door ? 'door' : null; this.actOnArrival = null; this.castOnArrival = null;
      const water = this.own && hit.point ? pondAt(this.state, hit.point.x, hit.point.z) : null;
      if (water) { this.tapWater(water, [hit.point.x, hit.point.z]); this.render(); return; }
      if (door && this.own) { this.doNear({ id: 'door' }); this.render(); return; }   // a tap on the farmhouse: walk to the door and go in
      const thing = door ? null : this.scan(point, .75);
      if (thing?.at && thing.id !== 'pond') { if (!this.walkTo(thing)) this.notice = 'The way is blocked. Try another spot.'; }
      else if (!routeExplore(this.state, door ? this.approach : point)) this.notice = 'The way is blocked. Try another spot.';
    }
    this.render();
  }
  nearest() {
    if (!this.session) return null;
    if (!this.inside) return this.near?.id ?? null;
    return Object.keys(this.objects).find(id => atObject(this.state, id)) ?? null;
  }
  choose(action) {
    if (action === 'close') { this.close(); return; }
    if (action === 'retry') { const again = { roam: this.roam, who: this.who, site: this.site }; this.close(); this.open(again); return; }
    if (action === 'back') { this.card = null; this.clear(); this.render(); return; }
    if (action === 'album') { this.card = null; this.clear(); this.panels.show('album'); this.render(); return; }
    if (this.loading || this.error || modalOpen() || this.panels.open) return;
    if (action === 'homeView' && this.inside) { this.room.toggleView(); this.render(); return; }
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
    if (action.startsWith('shirt:') || action.startsWith('hat:') || action.startsWith('look:')) {   // the wardrobe: your own shirt and hat, or a whole costume
      const [kind, value] = action.split(/:(.*)/), set = (key, v) => this.game.do('setting', { key, value: v });
      const r = kind === 'look' ? set('playerLook', value) : kind === 'hat' ? (set('playerLook', ''), set('playerHat', value)) : (set('playerLook', ''), set('playerColor', value));
      this.said = r.ok ? null : t(r.reason);
      this.room?.dress(this.state.settings).catch(() => {});   // the room's own actor wears it at once
      this.render(); return;
    }
    if (action.startsWith('answer:') && this.talk) { this.talk.answer = +action.slice(7) ? 1 : 0; this.render(); return; }
    if (action === 'another' && this.talk) { this.talk = { n: this.talk.n + 1, answer: null }; this.render(); return; }
    if (action.startsWith('skirt:')) {   // the mirror: no skirt, or one of three lengths (a costume stays on)
      const r = this.game.do('setting', { key: 'playerSkirt', value: +action.slice(6) }); this.said = r.ok ? null : t(r.reason);
      this.room?.dress(this.state.settings).catch(() => {}); this.render(); return;
    }
    if (action.startsWith('body:')) {   // the mirror: a man, a woman, a boy or a girl
      const r = this.game.do('setting', { key: 'playerBody', value: action.slice(5) }); this.said = r.ok ? null : t(r.reason);
      this.room?.dress(this.state.settings).catch(() => {}); this.render(); return;
    }
    if (action.startsWith('tab:')) { this.wardTab = action.slice(4); this.render(); return; }
    if (action.startsWith('use:') || action.startsWith('more:')) {
      const id = action.split(':')[1], r = this.game.do('useAtHome', { id, extra: action.startsWith('more:') });
      if (!r.ok) this.said = t(r.reason);
      else {
        const guest = r.guest ? this.radial.people?.nameOf({ id: r.guest }) ?? r.guest : null;
        this.said = [t(r.line), r.finished ? (guest ? t('The scarf is finished! You give it to {name}. A heart grows.', { name: guest }) : t('The scarf is finished! It goes in the gift drawer.')) : '', r.xp ? t('+{xp} XP', { xp: r.xp }) : ''].filter(Boolean).join(' ');
      }
      this.render(); return;
    }
    if (action === 'stand') { this.session.seated = false; this.card = null; this.render(); return; }
    if (action === 'outside') {
      this.card = null; this.clear(); this.target = this.session.room.exit.id;
      this.exitOnArrival = true;
      if (!routeExplore(this.state, xz(this.session.room.exit.stand))) { this.leaveRoom(true); this.exitOnArrival = false; this.syncScene(); }
      this.render(); return;
    }
    if (action !== 'interact' || this.card) return;
    const id = this.nearest(); this.clear(true); this.notice = null;
    if (!this.inside) { if (this.near) this.doNear(this.near); if (this.active) this.render(); return; }
    if (id === this.session.room.exit.id) { this.leaveRoom(); this.target = null; this.syncScene(); }
    else if (this.kind && this.objects[id]?.person) { this.card = id; this.talk = { n: (this.talkTurn = (this.talkTurn ?? 0) + 1), answer: null }; }
    else if (this.kind && this.objects[id]) { const o = this.objects[id]; if (o.panel) this.panels.show(o.panel, o.siteArg ? this.site : undefined); else this.card = id; }
    else if (id === 'farmhouse_sofa' && this.game.do('sitAtHome').ok) this.card = 'sofa';
    else if (['farmhouse_kitchen', 'farmhouse_desk', 'farmhouse_table', 'farmhouse_wardrobe'].includes(id)) { this.card = id.slice(10); this.said = null; if (id === 'farmhouse_wardrobe' && this.wardTab === 'body') this.wardTab = 'shirt'; }
    else if (id === 'farmhouse_memory_shelf' && this.game.do('readHomeMemory').ok) this.card = 'memory';
    else if (HOME_OBJECTS[id]?.thing) { const th = HOME_THINGS[HOME_OBJECTS[id].thing]; this.said = null; if (th.id === 'mirror') this.wardTab = 'body'; if (th.panel) this.panels.show(th.panel); else this.card = th.card ?? th.id; }
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
    const yaw = this.inside ? this.room.movementYaw : this.world.cam.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    if (x || y) this.actOnArrival = this.castOnArrival = null, this.enterOnArrival = false;
    const moving = !this.busy && moveExplore(this.state, x * c + y * s, -x * s + y * c, dt);
    if (this.inside) { this.room.frame(this.session, moving, dt, this.state); this.positionPins(); this.positionSay(); }
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
      if (this.enterOnArrival && !e.route.length && far(e.p, ...this.approach) > .35) this.enterOnArrival = false;   // the walk there was cut short
      if (this.enterOnArrival && far(e.p, ...this.approach) <= .35) {   // Go inside was chosen from a few steps away
        this.enterOnArrival = false; const r = this.enterRoom();
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
    if (this.exitOnArrival && nearest === this.session.room.exit.id) { this.exitOnArrival = false; this.leaveRoom(); this.syncScene(); this.render(); return; }
    if (nearest !== this.lastNearest) { this.lastNearest = nearest; this.render(); }
  }
  /** How much of the screen's foot the controls take (labels keep above it): the pill and its hint on a wide window, the
   *  stick and the buttons on a narrow one. */
  pinFloor() { return innerWidth >= 900 ? 110 : 205; }
  /** What the family says at home, over their heads (one small bubble each, only while they say it). */
  positionSay() {
    const family = this.room?.family ?? []; this.sayEl.hidden = !this.inside || this.busy || !family.length;
    if (this.sayEl.hidden) return;
    while (this.sayEl.children.length < family.length) this.sayEl.append(document.createElement('p'));
    family.forEach((f, i) => {
      const el = this.sayEl.children[i]; el.hidden = !f.say; if (!f.say) return;
      const text = t(f.say); if (el.textContent !== text) el.textContent = text;
      const p = this.room.project([f.subject.x, f.height + 0.45, f.subject.z]);
      el.style.left = `${Math.min(Math.max(p.x, 96), innerWidth - 96)}px`; el.style.top = `${Math.max(p.y, 120)}px`;
    });
  }
  positionPins() {
    this.pinsEl.hidden = !this.inside || this.busy;
    if (this.pinsEl.hidden) return;
    const shown = [], toolbarBottom = this.el.querySelector('.explore-side')?.getBoundingClientRect().bottom ?? 122;
    for (const o of this.session.room.interactions) {
      const pin = this.pins.get(o.id)?.button; if (!pin) continue;
      // on a phone the whole house is a hand wide: only the six main things are named there (the rest when you follow your character)
      if (HOME_OBJECTS[o.id]?.thing && !this.kind && innerWidth < 600 && this.room.view === 'whole') { pin.hidden = true; continue; }
      // Hidden labels have no measured width. Reveal for layout before deciding which ones fit.
      pin.hidden = false;
      const p = this.room.project(o.focus), width = pin.offsetWidth, height = pin.offsetHeight;
      // a label that would lie on another moves up or down by its own height (the nearest free place of five); only one
      // that fits nowhere on the screen is left out. Two things close together (the barn's stores and its tool bench,
      // the school's art corner and its library) used to show one label, and the other could not be found.
      const hits = b => shown.some(o => b.x < o.x + o.w + 4 && b.x + b.w + 4 > o.x && b.y < o.y + o.h + 4 && b.y + b.h + 4 > o.y);
      const fits = b => b.x >= 8 && b.x + b.w <= innerWidth - 8 && b.y >= toolbarBottom + 8 && b.y + b.h <= innerHeight - this.pinFloor();
      let box = null;   // (a label at the window's edge slides in sideways)
      for (const step of [0, -1, 1, -2, 2]) { const b = { x: Math.min(Math.max(p.x - width / 2, 8), Math.max(8, innerWidth - 8 - width)), y: p.y - height / 2 + step * (height + 6), w: width, h: height }; if (fits(b) && !hits(b)) { box = b; break; } }
      pin.hidden = !p.visible || !box;
      if (!pin.hidden) { pin.style.left = `${box.x + width / 2}px`; pin.style.top = `${box.y + height / 2}px`; shown.push(box); }
    }
  }
  render() {
    if (!this.active) return;
    for (const { button: b, label } of this.pins.values()) { const text = t(label); if (b.textContent !== text) b.textContent = text; }
    this.pinsEl.hidden = !this.inside || this.busy;
    // Do not replace a captured direction button when the nearest-object label changes mid-hold.
    const active = document.activeElement?.dataset.explore;
    const loading = this.loading ? t(this.kind || this.roam ? 'Getting ready to explore…' : 'Opening the farmhouse…') : this.error ? t(this.kind || this.roam ? 'Could not start exploring. Please try again.' : 'Could not open the farmhouse. Please try again.') : '';
    const nearest = this.nearest(), control = this.control;
    let card = '';
    const person = this.kind ? this.session?.room.people?.find(w => `person_${w.id}` === this.card) ?? null : null;   // (with where they stand: the card keeps off them)
    if (this.room) this.room.talking = person?.id ?? null;
    if (person && this.talk) {   // hello, one question about your own farm, two ways to answer, and what they make of it
      const st = this.state, nums = talkNumbers(st, FISH_TABLE.filter(f => st.album?.fish?.[f.id] > 0).length), 
        fair = person.asks.filter(a => [...a.q.matchAll(/\{(\w+)\}/g)].every(m => nums[m[1]] > 0)), asks = fair.length ? fair : person.asks,   // never “0 harvests”
        ask = asks[this.talk.n % asks.length], said = this.talk.answer;
      card = `<h2>${esc(t(person.role))}</h2>` + (said === null
        ? `<p>${esc(t(person.hello[this.talk.n % person.hello.length]))}</p><p><b>${esc(t(ask.q, nums))}</b></p>${ask.a.map(([text], i) => button(`answer:${i}`, text, 'primary')).join('')}${button('back', 'Back', 'ghost')}`
        : `<p>${esc(t(ask.q, nums))}</p><p class="explore-you">${esc(t(ask.a[said][0]))}</p><p><b>${esc(t(ask.a[said][1]))}</b></p>${button('another', 'Another question', 'primary')}${button('back', 'Back', 'ghost')}`);
    }
    if (this.kind && this.objects[this.card]?.text) card = `<h2>${esc(t(this.objects[this.card].label))}</h2><p>${esc(t(this.objects[this.card].text))}</p>${button('back', 'Back', 'ghost')}`;
    if (this.card === 'memory') card = `<h2>${esc(t(HOME_MEMORY.title))}</h2><p><b>${esc(t('{person:pip:display}'))}</b> — ${esc(t(HOME_MEMORY.text))}</p><p><b>${esc(t('{person:june:display}'))}</b> — ${esc(t(HOME_MEMORY.reply))}</p><p>${esc(t('Saved in your home memories. Come back to read it anytime.'))}</p>${button('album', 'Open album', 'ghost')}${button('back', 'Back', 'ghost')}`;
    const wait = id => { const ms = homeCooldown(this.state, id, this.game.now); const sec = Math.ceil(ms / 1000); return ms > 0 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : ''; };
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
    if (this.card === 'wardrobe') {   // three short rows, one at a time, so your character stays in view while you try things on
      const st = this.state.settings, w = wardrobe(this.state), tab = ['body', 'shirt', 'hat', 'look'].includes(this.wardTab) ? this.wardTab : 'shirt';
      const tabs = [['body', 'You'], ['shirt', 'Shirt'], ['hat', 'Hats'], ['look', 'Costumes']].map(([id, name]) => `<button type="button" class="tab${tab === id ? ' on' : ''}" data-explore="tab:${id}">${esc(t(name))}</button>`).join('');
      const piece = (action, o, on, hat) => `<button type="button" class="wear${on ? ' on' : ''}${o.open ? '' : ' locked'}" data-explore="${action}:${o.id}" ${o.open ? '' : 'disabled'} title="${esc(t(o.name))}"><img src="./assets/icons/wear/${hat}.webp" alt="" loading="lazy" width="48" height="48"><span>${esc(o.open ? t(o.name) : t('Level {level}', { level: o.level }))}</span></button>`;
      const none = (action, on) => `<button type="button" class="wear none${on ? ' on' : ''}" data-explore="${action}:"><i></i><span>${esc(t('None'))}</span></button>`;
      const row = tab === 'body' ? `<div class="explore-bodies">${Object.values(BODIES).map(b => `<button type="button" class="btn${bodyOf(this.state).id === b.id ? ' primary' : ' ghost'}" data-explore="body:${b.id}">${esc(t(b.name))}</button>`).join('')}</div><div class="explore-bodies">${SKIRTS.map((name, i) => `<button type="button" class="btn${skirtOf(this.state) === i ? ' primary' : ' ghost'}" data-explore="skirt:${i}">${esc(t(name))}</button>`).join('')}</div>`
        : tab === 'shirt' ? `<div class="explore-swatches">${PLAYER_COLORS.map(c => `<button type="button" class="btn${!st.playerLook && (st.playerColor ?? PLAYER_COLORS[0]) === c ? ' on' : ''}" data-explore="shirt:${c}" style="background:${c}" aria-label="${esc(t('Shirt'))} ${c}"></button>`).join('')}</div>`
        : tab === 'hat' ? `<div class="explore-wear">${none('hat', !st.playerLook && !st.playerHat)}${w.hats.map(h => piece('hat', h, !st.playerLook && st.playerHat === h.id, h.id)).join('')}</div>`
          : `<div class="explore-wear">${none('look', !st.playerLook)}${w.costumes.map(c => piece('look', c, st.playerLook === c.id, c.kit ?? c.hat)).join('')}</div>`;
      card = `<h2>${esc(t('The wardrobe'))}</h2><div class="tabs">${tabs}</div>${row}${said}<p class="explore-note">${esc(t('A new hat or costume arrives with every farm level.'))}</p>${button('back', 'Back', 'ghost')}`;
    }
    const thing = this.kind ? null : HOME_THINGS[this.card];
    if (thing) {
      const e = exploreState(this.state), count = thing.count ? `<p class="explore-note">${esc(t({ paintings: 'Paintings so far: {count}', rows: 'Rows knitted: {count}' }[thing.count], { count: e.made[thing.count] }))}</p>` : '';
      const stock = thing.shows ? thing.shows.map(g => [g, this.state.barn?.items?.[g] ?? 0]).filter(([, n]) => n > 0) : null;
      const inside = stock ? `<p>${esc(stock.length ? stock.map(([g, n]) => `${t(GOODS[g]?.name ?? g)} ${n}`).join(' · ') : t('Nearly empty. Time to visit the hens.'))}</p>` : '';
      const use = !thing.verb || stock ? '' : thing.cooldownMs ? timed(`use:${thing.id}`, thing.id, thing.verb) : button(`use:${thing.id}`, thing.verb, 'primary');
      card = `<h2>${esc(t(thing.name))}</h2><p>${esc(t(thing.intro))}</p>${inside}${said}${use}${thing.extra ? button(`more:${thing.id}`, thing.extra.verb, 'ghost') : ''}${count}${button('back', 'Back', 'ghost')}`;
    }
    if (this.card === 'memory') {   // the collection log: how much of the valley you have found so far
      const st = this.state, fish = FISH_TABLE.filter(f => st.album?.fish?.[f.id] > 0).length, read = (st.mail ?? []).filter(m => m.read && LETTERS.some(l => l.id === m.id)).length;
      const friends = Object.values(st.people ?? {}).filter(p => (p.hearts ?? 0) >= 3).length, log = [['Fish caught', fish, FISH_TABLE.length], ['Letters read', read, LETTERS.length], ['Friends with three hearts', friends, null], ['Journal drawings', exploreState(st).drawings, null], ['Paintings', exploreState(st).made.paintings, null], ['Rows knitted', exploreState(st).made.rows, null]];
      card += `<h3>${esc(t('Our collection'))}</h3><ul class="explore-log">${log.map(([text, n, of]) => `<li>${esc(t(text))} <b>${n}${of ? ` / ${of}` : ''}</b></li>`).join('')}</ul>`;
    }
    if (this.card === 'sofa') {
      const l = learningStatus(this.state, this.game.now);
      card = `<h2>${esc(t('A quiet moment at home'))}</h2><p>${esc(t('Put your feet up. The farm can wait a moment.'))}</p>`;
      if (l.canRest) card += button('rest', 'Rest for project energy', 'primary');
      else if (l.resting) card += `<p role="status">${esc(t('Your project rest is underway. You can keep exploring.'))}</p>`;
      card += button('stand', 'Stand up', 'ghost');
    }
    const outdoor = !this.inside && this.near, label = outdoor ? t(outdoor.label, outdoor.params) : this.objects[nearest] ? t(this.objects[nearest].label) : null;
    const who = this.walker && !this.own ? ` · ${this.radial.people.nameOf(this.walker)}` : '';
    const compact = (this.roam || this.inside) && !loading;
    const side = `${this.error ? button('retry', 'Try again', 'primary') : ''}${button('close', 'Farm view', 'ghost')}${this.inside && !card ? button('homeView', this.room.view === 'whole' ? 'Follow my character' : this.kind ? 'View the whole building' : 'View the whole house', 'ghost') : ''}${!loading && !card ? button('controls', control === 'tap' ? 'Use the thumb stick' : 'Use tap controls', 'ghost') : ''}`;
    this.padEl.hidden = !!loading || !!card || !this.canSwing; this.padEl.setAttribute('aria-label', t('Swing (Space)')); this.padEl.title = t('Swing (Space)');
    this.joyEl.hidden = !!loading || !!card || control !== 'joystick'; this.joyEl.classList.toggle('raised', !compact); this.joyEl.setAttribute('aria-label', t('Movement controls'));
    if (this.joyEl.hidden && this.joy) this.joyReset();
    const interact = `<button type="button" class="btn primary" data-explore="interact" ${label ? '' : 'disabled'}>${esc(label ?? t('Walk closer to interact'))}</button>`;
    const html = `<div class="explore-heading">${esc(t(this.inside ? this.kind ? CIVIC_INTERIORS[this.kind].name : 'At home' : 'Explore') + who)}</div>${card ? `<div class="explore-card${thing ? ' low' : person ? (this.room.project([person.position?.[0] ?? 0, 1, person.position?.[1] ?? 0]).y < innerHeight * .5 ? ' low' : ' high') : ''}" data-object="${this.card}" role="dialog" aria-label="${esc(t({ sofa: 'A quiet moment at home', kitchen: 'The kitchen', desk: 'The desk', table: 'The day on the table', wardrobe: 'The wardrobe' }[this.card] ?? thing?.name ?? person?.role ?? this.objects[this.card]?.label ?? HOME_MEMORY.title))}">${card}</div>` : ''}
      <div class="explore-controls${compact ? ' compact' : ''}${control === 'joystick' ? ' joy' : ''}">${card || (compact && !this.notice && performance.now() > (this.hintUntil ?? 0)) ? '' : `<p role="status">${esc(loading || t(this.notice ?? (this.inside ? 'Tap the floor to walk. Tap the furniture to use it.' : this.roam ? 'Walk anywhere. Come close to people and places to do things.' : 'Walk to the door, then choose Go inside.')))}</p>`}
      ${!loading && !card ? `<div class="explore-actions">${interact}${this.inside && nearest !== this.session?.room.exit.id ? button('outside', 'Go outside', 'ghost') : ''}</div>` : ''}
      ${compact ? '' : `<div class="explore-actions">${side}</div>`}
      ${!loading && !card && control !== 'joystick' ? `<small>${esc(t(this.inside ? 'Arrow keys or WASD to walk · E to interact' : 'Arrow keys or WASD to walk · E to interact · Space to swing'))}</small>` : ''}</div>${compact ? `<div class="explore-actions explore-side">${side}</div>` : ''}
      `;
    if (this.html === html || (this.card && this.html?.replace(/data-wait="\w+">[^<]*/g, '') === html.replace(/data-wait="\w+">[^<]*/g, ''))) return;   // only a ticking wait differs
    this.html = html; this.el.innerHTML = html;
    this.el.style.fontSize = `${this.state.settings.textSize ?? 1}em`;
    if (active) this.el.querySelector(`[data-explore="${active}"]`)?.focus({ preventScroll: true });
  }
}
