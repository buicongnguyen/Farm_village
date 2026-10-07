// Boot: load the save, then the world, the land, life and people drawn from the rules state, the HUD, build mode, the
// panels, the tap menu, the guide, day and night, sound, and autosave.
import './style.css';
import './ui/ui.css';
import './ui/farm.css';
import './ui/village.css';
import './ui/polish.css';
import { Game } from './game.mjs';
import { WorldView } from './view/world-view.mjs';
import { LandView } from './view/land-view.mjs';
import { LifeView } from './view/life-view.mjs';
import { PeopleView } from './view/people-view.mjs';
import { Daylight } from './view/daylight.mjs';
import { Ghost } from './view/ghost.mjs';
import { Hud } from './ui/hud.mjs';
import { BuildView } from './ui/build-view.mjs';
import { Panels } from './ui/panels.mjs';
import { Radial } from './ui/radial.mjs';
import { Fx } from './ui/fx.mjs';
import { Guide } from './ui/guide.mjs';
import { initModals } from './ui/modal.mjs';
import { showWelcome } from './ui/village-panels.mjs';
import { load, autosave, save, pack, unpack, erase } from './kit/save.mjs';
import { t } from './kit/i18n.mjs';
import { sfx, unlockAudio, setVolumes } from './kit/sound.mjs';
import { RUINS, START_PARCEL, parcelOrigin, CELL } from './content/world.mjs';
import { BUILDINGS } from './content/buildings.mjs';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app');
app.innerHTML = '';
initModals(app);
const PROFILE_KEY = 'farm-village:profile';
const profile = (() => { try { return Math.min(3, Math.max(1, +(localStorage.getItem(PROFILE_KEY) ?? 1))); } catch { return 1; } })();
// test builds can run the clock ahead (kept for the tab, so a reload sees the same time)
const clockOffset = TEST_MODE ? +(sessionStorage.getItem('fv-clock-offset') ?? 0) : 0;
const game = new Game(params.has('new') ? null : load(profile), () => Date.now() + clockOffset);
const world = new WorldView(app);
const land = new LandView(world, game);
const ghost = new Ghost(world);
let build = null, panels = null, radial = null;
const hud = new Hud(app, game, {
  onBuild: () => { panels.close(); radial.hide(); build.toggle(); },
  onTurn: () => world.cam.turn(1),
  onPanel: kind => { if (build.open) build.close(); radial.hide(); panels.toggle(kind); },
});
build = new BuildView(app, { game, world, ghost, hud });
panels = new Panels(app, game, hud, {
  // the projects panel's "Build" opens build mode with the ghost on the ruin it replaces
  onBuild: kind => { const r = RUINS.find(x => x.kind === kind); if (r) world.cam.lookAt((r.x + 2) * CELL, (r.z + 2) * CELL, Math.min(world.cam.span, 60)); build.start(kind, r && { x: r.x + 2, z: r.z + 1, point: { x: (r.x + 2.5) * CELL, z: (r.z + 1.5) * CELL } }); },
  // "show the way": go to where a missing good is made, or open the catalogue on that building
  onShowWay: at => {
    if (at === 'farm') { const o = parcelOrigin(START_PARCEL); world.cam.lookAt((o.x + 6) * CELL, (o.z + 4) * CELL); hud.toast(t('Plant it in your beds'), 'info'); return; }
    const id = Object.keys(game.s.placed).find(k => game.s.placed[k].kind === at);
    if (id) { const p = game.s.placed[id]; world.cam.lookAt((p.x + 1) * CELL, (p.z + 1) * CELL); if (BUILDINGS[at].produces) panels.show('production', id); }
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
});
panels.profile = profile;
const people = new PeopleView(world, game, app);
radial = new Radial(app, { game, world, panels, hud, people });
new Fx(app, { game, world });

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
const SOUNDS = { harvested: 'pop', collected: 'pop', produced: 'pop', orderFilled: 'coin', rent: 'coin', coins: 'coin', placed: 'place', levelUp: 'level', projectDone: 'cheer', familyArrived: 'cheer', giftClaimed: 'coin' };
game.on(r => {
  land.apply(r.events ?? []);
  if (!r.ok && r.reason) sfx('error');
  const played = new Set(); for (const e of r.events ?? []) { const name = SOUNDS[e.type]; if (name && !played.has(name)) { played.add(name); sfx(name); } }
  for (const e of r.events ?? []) { if (e.type === 'familyArrived') showWelcome(app, e.family); if (e.type === 'settingChanged' || e.type === 'loaded') applySettings(); }
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
await land.load();
new LifeView(world, game);
new Daylight(world, game);
game.start();
applySettings();
autosave(game, profile);
new Guide(app, { game, world, hud });
// the Today board opens by itself once a day, for players who have started farming (a first visit gets the tutorial)
if (!game.s.today.seen) { if (game.s.stats.harvested > 0) panels.show('today'); game.do('seeToday'); }

if (TEST_MODE) {
  const { installTestHook } = await import('./kit/test-hook.mjs');
  installTestHook({ world, game, land, build, hud, panels, radial, people });
}
