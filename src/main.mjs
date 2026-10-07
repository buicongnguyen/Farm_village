// Boot: load the save, then the world, the land, life and people drawn from the rules state, the HUD, build mode, the
// panels, the tap menu, the guide, day and night, sound, and autosave.
import './style.css';
import './ui/ui.css';
import './ui/farm.css';
import './ui/village.css';
import './ui/polish.css';
import { Game } from './game.mjs';
import { newGame } from './core/state.mjs';
import { WorldView } from './view/world-view.mjs';
import { LandView } from './view/land-view.mjs';
import { dressWorld } from './view/dress.mjs';
import { Daylight } from './view/daylight.mjs';
import { Ghost } from './view/ghost.mjs';
import { Hud } from './ui/hud.mjs';
import { BuildView } from './ui/build-view.mjs';
import { Panels } from './ui/panels.mjs';
import { Radial } from './ui/radial.mjs';
import { Fx } from './ui/fx.mjs';
import { Guide } from './ui/guide.mjs';
import { initModals } from './ui/modal.mjs';
import { Bonds } from './ui/bonds-panels.mjs';
import { CartView } from './ui/cart-panel.mjs';
import { LevelUp } from './ui/levelup.mjs';
import { load, autosave, save, pack, unpack, erase } from './kit/save.mjs';
import { t, languageReady, loadVietnamese } from './kit/i18n.mjs';
import { sfx, unlockAudio, setVolumes } from './kit/sound.mjs';
import { RUINS, START_PARCEL, parcelOrigin, CELL } from './content/world.mjs';
import { BUILDINGS } from './content/buildings.mjs';
import { levelOf } from './core/working.mjs';
import { RECIPES } from './content/goods.mjs';

// Code the first frame does not need loads as its own chunks, fetched now, in parallel with the models: the living
// cast (crops, herds, people, critters: life-view, people-view, critters and the skinned rigs) and game feel (juice).
const living = Promise.all([import('./view/life-view.mjs'), import('./view/people-view.mjs'), import('./view/critters.mjs'), import('./view/juice.mjs')]);
await languageReady;   // the Vietnamese lines load first when the player reads Vietnamese
const params = new URLSearchParams(location.search);
const app = document.getElementById('app');
// the title splash (index.html #boot) stays up until the first card is ready, then fades into it
const splash = document.getElementById('boot');
app.innerHTML = ''; if (splash) { splash.setAttribute('aria-hidden', 'true'); document.body.insertBefore(splash, app); }
initModals(app);
const PROFILE_KEY = 'farm-village:profile';
const profile = (() => { try { return Math.min(3, Math.max(1, +(localStorage.getItem(PROFILE_KEY) ?? 1))); } catch { return 1; } })();
// test builds can run the clock ahead (kept for the tab, so a reload sees the same time)
const clockOffset = TEST_MODE ? +(sessionStorage.getItem('fv-clock-offset') ?? 0) : 0;
// ?new starts a fresh farm (test builds only: in the public game a stray link must never replace a saved farm)
// a test build's ?new starts on an empty field (the browser suites build their own farm); add &restore for the restored village
const clock = () => Date.now() + clockOffset, emptyStart = TEST_MODE && params.has('new') && !params.has('restore');
const game = new Game(TEST_MODE && params.has('new') ? (emptyStart ? newGame(clock()) : null) : load(profile), clock);
const world = new WorldView(app);
const land = new LandView(world, game);
const ghost = new Ghost(world);
let build = null, panels = null, radial = null;
// the camera eases to places the interface points at (the guide, "show the way", notifications)
const flyTo = (x, z, span) => (world.cam.flyTo ? world.cam.flyTo(x, z, span) : world.cam.lookAt(x, z, span));
const hud = new Hud(app, game, {
  onBuild: () => { panels.close(); radial.hide(); build.toggle(); },
  onTurn: () => world.cam.turn(1),
  onPanel: kind => { if (build.open) build.close(); radial.hide(); panels.toggle(kind); },
});
build = new BuildView(app, { game, world, ghost, hud });
panels = new Panels(app, game, hud, {
  // the projects panel's "Build" opens build mode with the ghost on the ruin it replaces
  onBuild: kind => { const r = RUINS.find(x => x.kind === kind); if (r) flyTo((r.x + 2) * CELL, (r.z + 2) * CELL, Math.min(world.cam.span, 60)); build.start(kind, r && { x: r.x + 2, z: r.z + 1, point: { x: (r.x + 2.5) * CELL, z: (r.z + 1.5) * CELL } }); },
  // "show the way": go to where a missing good is made, or open the catalogue on that building
  onShowWay: at => {
    if (at === 'farm') { const o = parcelOrigin(START_PARCEL); flyTo((o.x + 6) * CELL, (o.z + 4) * CELL); hud.toast(t('Plant it in your beds'), 'info', { icon: 'bed' }); return; }
    const ids = Object.keys(game.s.placed).filter(k => game.s.placed[k].kind === at), id = ids.find(k => levelOf(game.s, k) >= 3) ?? ids[0];   // the run-down one first
    if (id) { const p = game.s.placed[id]; flyTo((p.x + 1) * CELL, (p.z + 1) * CELL); if (BUILDINGS[at].produces && levelOf(game.s, id) < 3) panels.show('production', id); }
    else { build.cat = BUILDINGS[at].cat; build.start(at); }
  },
  onSave: (what, arg) => {
    if (what === 'export') {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([pack(game.s)], { type: 'application/json' }));
      a.download = `farm-village-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (what === 'import' && arg) arg.text().then(text => { try { const s = unpack(text); save(s, profile); location.reload(); } catch { hud.toast(t('That file is not a Farm Village save'), 'warn'); } });
    else if (what === 'newGame') { if (confirm(t('Start a new farm in this save? The current farm will be lost.'))) { erase(profile); location.replace(location.pathname); } }
    else if (what === 'profile') { try { save(game.s, profile); localStorage.setItem(PROFILE_KEY, String(arg)); } catch {} location.reload(); }
  },
  // a wish's Build button: the catalogue on that decoration
  onBuildKind: kind => { if (!BUILDINGS[kind]) return; build.cat = BUILDINGS[kind].cat; build.start(kind); },
  onPhoto: () => import('./ui/photo.mjs').then(m => m.startPhoto({ world, root: app })),
  onTest: TEST_MODE ? what => testAction(what) : null,
});
panels.profile = profile;
radial = new Radial(app, { game, world, panels, hud });   // people and life are handed over once their chunk is in
radial.fx = new Fx(app, { game, world });
new Bonds({ game, hud });
// the level-up card's "Show me": the catalogue on a new building, the building that makes a new recipe, an empty bed
new LevelUp({ game, busy: () => build.open || radial.isArmed(), onShow: ({ type, id }) => {
  if (type === 'building' && BUILDINGS[id]) { panels.close(); build.cat = BUILDINGS[id].cat; if (!build.open) build.show(); else build.render(); }
  else if (type === 'recipe') { const at = RECIPES[id]?.at, pid = Object.keys(game.s.placed).find(k => game.s.placed[k].kind === at); if (pid) { const p = game.s.placed[pid]; flyTo((p.x + 1) * CELL, (p.z + 1) * CELL); panels.show('production', pid); } }
  else if (type === 'crop') { const o = parcelOrigin(START_PARCEL); flyTo((o.x + 6) * CELL, (o.z + 4) * CELL); hud.toast(t('Tap an empty bed to plant it'), 'info', { icon: id }); }
} });

const canvas = world.renderer.domElement;
world.cam.attach(canvas, {
  onTap: (x, y) => {
    const cell = world.cellAt(x, y);
    if (build.open) build.tap(cell);
    else { panels.close(); radial.tap(cell, x, y); }
  },
});
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons && build.open) build.hover(world.cellAt(e.clientX, e.clientY)); });
addEventListener('pointerdown', unlockAudio, { capture: true });

// Sounds for what happens (one of each kind per action, so a sweep is not a din)
const SOUNDS = { harvested: 'pop', collected: 'pop', produced: 'pop', orderFilled: 'coin', rent: 'coin', coins: 'coin', placed: 'place', levelUp: 'level', projectDone: 'cheer', familyArrived: 'cheer', giftClaimed: 'coin', repaired: 'place', repairStarted: 'click', demolished: 'place', houseUpgraded: 'level', neighbourRepair: 'cheer' };
game.on(r => {
  land.apply(r.events ?? []);
  if (!r.ok && r.reason) sfx('error');
  const played = new Set(); for (const e of r.events ?? []) { const name = SOUNDS[e.type]; if (name && !played.has(name)) { played.add(name); sfx(name); } }
  for (const e of r.events ?? []) if (e.type === 'settingChanged' || e.type === 'loaded') applySettings();
  if (r.events?.some(e => e.type === 'settingChanged')) panels.render();
});
// Settings that change the page: volumes, text size, motion, graphics quality
function applySettings() {
  const st = game.s.settings;
  setVolumes({ sound: st.sound, music: st.music });
  document.body.dataset.text = String(st.textSize);
  document.body.classList.toggle('reduced-motion', !!st.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);
  world.setQuality(st.quality);
}

world.start();
await world.loadScenery();
await dressWorld(world, game);
await land.load();
const [{ LifeView }, { PeopleView }, { Critters }, { Juice }] = await living;
const life = new LifeView(world, game);
const people = new PeopleView(world, game, app);
radial.life = life; radial.people = people; hud.people = people;
new Juice(world, game, app);
new CartView(world, game);
new Critters(world, game);
new Daylight(world, game);
game.start();
applySettings();
autosave(game, profile);
new Guide(app, { game, world, hud });
if (splash) { splash.classList.add('gone'); setTimeout(() => splash.remove(), 700); }
// the Vietnamese lines come down once the farm is running, so a language switch is instant
(globalThis.requestIdleCallback ?? setTimeout)(() => loadVietnamese().catch(() => {}), { timeout: 4000 });
// the Today board opens by itself once a day, for players who have started farming (a first visit gets the tutorial)
if (!game.s.today.seen) { if (game.s.stats.harvested > 0) panels.show('today'); game.do('seeToday'); }

if (TEST_MODE) {
  const { installTestHook } = await import('./kit/test-hook.mjs');
  installTestHook({ world, game, land, build, hud, panels, radial, people, juice: world.juice });
}
/** The Settings panel's Test section (test builds only). */
function testAction(what) {
  const g = game;
  if (what === 'unlock') g.do('testUnlockAll');
  if (what === 'coins') { g.s.coins += 10000; g.emit({ ok: true, events: [{ type: 'coins', coins: 10000 }] }, 'test'); }
  if (what === 'timers') g.do('testFinishTimers');
  if (what === 'family') g.do('testAddFamily');
  if (what === 'step') g.do('tutorial', { step: (g.s.story.tutorial ?? 0) + 1 });
  if (what === 'hour' || what === 'day') {
    const off = +(sessionStorage.getItem('fv-clock-offset') ?? 0) + (what === 'hour' ? 3600e3 : 86400e3);
    sessionStorage.setItem('fv-clock-offset', String(off)); g.clock = () => Date.now() + off; g.tick(); hud.toast(t('The clock moved forward'), 'info', { icon: 'clock' });
  }
}
