import './mobile-game-init.mjs';
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
import { Marks } from './view/marks-view.mjs';
import { PondFish } from './view/pond-fish.mjs';
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
import { autosave, save, pack, unpack, erase, activeProfile, profileId, inspectProfile, selectProfile } from './kit/save.mjs';
import { renderProfiles } from './ui/profiles-panel.mjs';
import { watchDiscoveries } from './ui/discovery-panels.mjs';
import { watchExploration } from './ui/exploration-panels.mjs';
import { ExplorationView } from './view/exploration-view.mjs';
import { LandDiscoveryView } from './view/land-discovery-view.mjs';
import { LearningView } from './view/learning-view.mjs';
import { LEARNING_SITE } from './content/learning-site.mjs';
import { landDiscoverySite } from './core/land-discovery.mjs';
import { EXPLORATION_SITES } from './content/exploration-sites.mjs';
import { t, languageReady, getLanguage, setLanguage, onLanguageChange, LANGUAGES } from './kit/i18n.mjs';
import { sfx, unlockAudio, setVolumes } from './kit/sound.mjs';
import { RUINS, START_PARCEL, parcelOrigin, CELL, POND_DOCK, ROAD_SEGMENTS } from './content/world.mjs';
import { BUILDINGS, footprint } from './content/buildings.mjs';
import { levelOf } from './core/working.mjs';
import { RECIPES } from './content/goods.mjs';
import { pickShop } from './view/shop-picking.mjs';
import { SHOP_SITES } from './content/shops.mjs';
import { doorCell } from './core/grid.mjs';

// Code the first frame does not need loads as its own chunks, fetched now, in parallel with the models: the living
// cast (crops, herds, people, critters: life-view, people-view, critters and the skinned rigs) and game feel (juice).
const living = Promise.all([import('./view/life-view.mjs'), import('./view/people-view.mjs'), import('./view/critters.mjs'), import('./view/juice.mjs')]);
await languageReady;   // load the selected edition before drawing its first text
document.title = t('Farm Village');
onLanguageChange(() => { document.title = t('Farm Village'); });
const params = new URLSearchParams(location.search);
const app = document.getElementById('app');
// the title splash (index.html #boot) stays up until the first card is ready, then fades into it
const splash = document.getElementById('boot');
app.innerHTML = ''; if (splash) { splash.setAttribute('aria-hidden', 'true'); document.body.insertBefore(splash, app); }
initModals(app);
// The main menu (user request): choose the language and the farm profile before the game starts. Profiles are only
// chosen here; reload the page to come back to this menu. Test builds skip it unless ?menu is given.
if (!TEST_MODE || params.has('menu')) await mainMenu();
async function mainMenu() {
  splash?.remove();
  const menu = document.createElement('section'); menu.className = 'main-menu'; menu.setAttribute('role', 'dialog');
  let languageRequest = 0, loadingLanguage = false;
  app.appendChild(menu);
  const draw = (error = '') => {
    menu.setAttribute('aria-label', t('Main menu'));
    menu.innerHTML = `<div class="main-menu-card"><div class="logo" role="img" aria-label="${t('Farm Village')}"><b>Farm</b> <b>Village</b></div>
      <div class="menu-lang" role="group" aria-label="${t('Language')}">
        ${LANGUAGES.map(lang => `<button class="btn ${getLanguage() === lang.id ? 'primary' : 'ghost'}" data-lang="${lang.id}" lang="${lang.id}" aria-pressed="${getLanguage() === lang.id}">${lang.label}</button>`).join('')}</div>
      <p class="hint" role="status" data-language-error${error ? '' : ' hidden'}></p>
      <h2>${t('Choose your farm')}</h2>${renderProfiles(null, activeProfile())}</div>`;
    menu.querySelector('[data-language-error]').textContent = error;
    menu.querySelector('.menu-lang').setAttribute('aria-busy', String(loadingLanguage));
    if (loadingLanguage) for (const button of menu.querySelectorAll('[data-do]')) button.disabled = true;
  };
  draw();
  await new Promise(done => menu.addEventListener('click', async e => {
    const lang = e.target.closest('[data-lang]');
    if (lang) {
      const request = ++languageRequest; loadingLanguage = true; draw();
      let error = '';
      try { await setLanguage(lang.dataset.lang); }
      catch { error = t('Could not load this language. Check your connection.'); }
      if (request === languageRequest) { loadingLanguage = false; draw(error); }
      return;
    }
    const button = e.target.closest('[data-do]'), target = profileId(button?.dataset.n);
    if (!button || button.disabled || !target) return;
    if (button.dataset.do === 'resetProfile') {
      if (!confirm(t('Start a new farm in Farm {n}? Only this farm will be erased.', { n: target }))) return;
      if (!erase(target)) return;
    } else if (button.dataset.do !== 'profile') return;
    if (activeProfile() !== target && !selectProfile(target)) return;
    menu.remove(); done();
  }));
}
const profile = activeProfile(), savedProfile = inspectProfile(profile);
// A damaged save is kept for recovery; never silently replace it with a fresh farm and autosave over it.
if (!(TEST_MODE && params.has('new')) && savedProfile.error) await recoverProfile();
// test builds can run the clock ahead (kept for the tab, so a reload sees the same time)
const clockOffset = TEST_MODE ? +(sessionStorage.getItem('fv-clock-offset') ?? 0) : 0;
// ?new starts a fresh farm (test builds only: in the public game a stray link must never replace a saved farm)
// a test build's ?new starts on an empty field (the browser suites build their own farm); add &restore for the restored village
const clock = () => Date.now() + clockOffset, emptyStart = TEST_MODE && params.has('new') && !params.has('restore');
const game = new Game(TEST_MODE && params.has('new') ? (emptyStart ? newGame(clock()) : null) : savedProfile.state, clock);
const world = new WorldView(app);
const land = new LandView(world, game);
const marks = new Marks(world, game, land);
const pondFish = new PondFish(world, game);
const ghost = new Ghost(world);
let build = null, panels = null, radial = null;
let saveSession = null, changingProfile = false;
// the camera eases to places the interface points at (the guide, "show the way", notifications)
const flyTo = (x, z, span) => (world.cam.flyTo ? world.cam.flyTo(x, z, span) : world.cam.lookAt(x, z, span));
const hud = new Hud(app, game, {
  onBuild: () => { panels.close(); radial.hide(); build.toggle(); },
  onTurn: () => world.cam.turn(1),
  onNext: n => { flyTo((n.at.x + 0.5) * CELL, (n.at.z + 0.5) * CELL, Math.min(world.cam.span, 44)); },
  onPanel: kind => { if (build.open) build.close(); radial.hide(); panels.toggle(kind); },
});
build = new BuildView(app, { game, world, ghost, hud });
panels = new Panels(app, game, hud, {
  // the projects panel's "Build" opens build mode with the ghost on the ruin it replaces
  onBuild: kind => {
    const r = RUINS.find(x => x.kind === kind);
    if (!r) { build.start(kind); return; }
    flyTo((r.x + 2) * CELL, (r.z + 2) * CELL, Math.min(world.cam.span, 60));
    const [w,d] = footprint(kind, r.rot), x = r.x + Math.floor((w-1)/2), z = r.z + Math.floor((d-1)/2);
    build.start(kind, { x, z, point: { x: (x+.5)*CELL, z: (z+.5)*CELL } });
    build.rot = r.rot; build.refreshGhost();
  },
  // "show the way": go to where a missing good is made, or open the catalogue on that building
  onShowWay: at => {
    if (at === 'learning') { panels.onLearningVisit?.(); return; }
    if (at === 'pond') { flyTo((POND_DOCK.x - 2) * CELL, POND_DOCK.z * CELL); panels.show('pond'); return; }
    if (at === 'farm') { const o = parcelOrigin(START_PARCEL); flyTo((o.x + 6) * CELL, (o.z + 4) * CELL); hud.toast(t('Plant it in your beds'), 'info', { icon: 'bed' }); return; }
    const ids = Object.keys(game.s.placed).filter(k => game.s.placed[k].kind === at), id = ids.find(k => levelOf(game.s, k) >= 3) ?? ids[0];   // the run-down one first
    if (id) { const p = game.s.placed[id]; flyTo((p.x + 1) * CELL, (p.z + 1) * CELL); if (BUILDINGS[at].produces && levelOf(game.s, id) < 3) panels.show('production', id); }
    else { build.cat = BUILDINGS[at].cat; build.start(at); }
  },
  onExplorePlace: place => {
    if (!['porch', 'pond'].includes(place)) return;
    if (build.open) build.close(); radial.hide();
    world.exploration?.ensureLoaded();
    const spot = EXPLORATION_SITES[place];
    flyTo(spot.x * CELL, spot.z * CELL, Math.min(world.cam.span, 38));
    panels.show('exploration', place);
  },
  onSave: handleSave,
  onLandVisit: parcel => {
    if (build.open) build.close(); radial.hide();
    const site = landDiscoverySite(game.s), origin = parcelOrigin(parcel ?? '1,2');
    const target = site?.parcel === parcel ? site : { x: origin.x + 4, z: origin.z + 4 };
    flyTo((target.x + 0.5) * CELL, (target.z + 0.5) * CELL, Math.min(world.cam.span, 38));
    panels.show('land', parcel);
  },
  onGoodHelpReturn: () => { if (build.open) build.close(); radial.hide(); },
  onGoodHelpSource: target => {
    if (build.open) build.close();
    radial.hide(); radial.armed = null; radial.tool.hidden = true;
    if (target.kind === 'learning') { panels.onLearningVisit?.(); return; }
    if (target.kind === 'pond') { panels.onShowWay('pond'); return; }
    if (target.kind === 'catalogue') {
      const def = BUILDINGS[target.buildingKind]; if (!def) return;
      build.show(); build.cat = def.cat; build.render(); return;
    }
    const p = target.id && game.s.placed[target.id];
    if (!p) { if (target.kind === 'farm') panels.onShowWay('farm'); return; }
    const [w, d] = footprint(p.kind, p.rot), cell = { x: p.x, z: p.z };
    flyTo((p.x + w / 2) * CELL, (p.z + d / 2) * CELL, Math.min(world.cam.span, 38));
    if (target.panel === 'production') { panels.show('production', target.id); return; }
    if (target.repair) {
      const { buttons, info } = radial.repairMenu(target.id, BUILDINGS[p.kind]);
      radial.open(cell, innerWidth / 2, innerHeight * 0.45, buttons, info, { id: target.id });
    } else radial.tap(cell, innerWidth / 2, innerHeight * 0.45, { open: true, preview: true });
  },
  // Advice points to the exact placed building and previews its repair without paying for it.
  onAdviceTarget: ({ kind, id, x, z }) => {
    if (build.open) build.close(); radial.hide(); radial.armed = null; radial.tool.hidden = true;
    if (kind === 'cell') {
      flyTo((x + .5) * CELL, (z + .5) * CELL, Math.min(world.cam.span, 38));
      radial.tap({ x, z }, innerWidth / 2, innerHeight * .45, { open: true, preview: true }); return;
    }
    if (kind === 'repair') {
      const road = ROAD_SEGMENTS.find(r => r.id === id); if (!road) return;
      const cell = { x: Math.floor((road.x0 + road.x1) / 2), z: road.z0 };
      flyTo((cell.x + .5) * CELL, (cell.z + .5) * CELL, Math.min(world.cam.span, 38));
      const { buttons, info } = radial.repairMenu(id);
      radial.open(cell, innerWidth / 2, innerHeight * .45, buttons, info, { id }); return;
    }
    const p = game.s.placed[id]; if (!p) return;
    const [w, d] = footprint(p.kind, p.rot), cell = { x: p.x, z: p.z };
    flyTo((p.x + w / 2) * CELL, (p.z + d / 2) * CELL);
    if (levelOf(game.s, id) > 0 || game.s.repairing?.[id]) {
      const { buttons, info } = radial.repairMenu(id, BUILDINGS[p.kind]);
      radial.open(cell, innerWidth / 2, innerHeight / 2, buttons, info, { id });
    }
  },
  // a wish's Build button: the catalogue on that decoration
  onBuildKind: kind => { if (!BUILDINGS[kind]) return; build.cat = BUILDINGS[kind].cat; build.start(kind); },
  onPhoto: () => import('./ui/photo.mjs').then(m => m.startPhoto({ world, root: app })),
  onTest: TEST_MODE ? what => testAction(what) : null,
});
panels.profile = profile;
hud.profile = profile; hud.update();
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
panels.onLearningVisit = () => {
  if (build.open) build.close(); radial.hide(); radial.armed = null; radial.tool.hidden = true;
  flyTo(LEARNING_SITE.worldX, LEARNING_SITE.worldZ, Math.min(world.cam.span, 38));
  panels.show('learning');
};
panels.onShopVisit = shop => {
  const site = SHOP_SITES.find(s => s.shop === shop); if (!site) return;
  if (build.open) build.close(); radial.hide(); radial.armed = null; radial.tool.hidden = true;
  flyTo(site.x * CELL, site.z * CELL, Math.min(world.cam.span, 38));
  panels.show('shops', shop);
};
panels.onGrowthSite = kind => {
  const site = RUINS.find(r => r.kind === kind); if (!site || !BUILDINGS[kind]?.civicSite) return;
  if (build.open) build.close(); radial.hide();
  flyTo((site.x + 2) * CELL, (site.z + 1.5) * CELL, Math.min(world.cam.span, 38));
  const id = Object.keys(game.s.placed).find(id => game.s.placed[id].kind === kind);
  if (id && (levelOf(game.s, id) > 0 || game.s.repairing?.[id])) {
    panels.close(); const { buttons, info } = radial.repairMenu(id, BUILDINGS[kind]);
    radial.open({ x: site.x, z: site.z }, innerWidth / 2, innerHeight * .45, buttons, info, { id });
  } else panels.show(id ? 'villageGrowth' : 'civicSite', id ? undefined : kind);
};
panels.onGrowthPath = kind => {
  const site = RUINS.find(r => r.kind === kind); if (!site || !BUILDINGS[kind]?.civicSite) return;
  const [x, z] = doorCell(kind, site.x, site.z, site.rot); panels.close(); radial.hide();
  flyTo((x + .5) * CELL, (z + .5) * CELL, Math.min(world.cam.span, 38));
  build.start('path', { x, z, point: { x: (x + .5) * CELL, z: (z + .5) * CELL } });
};
world.cam.attach(canvas, {
  onTap: (x, y) => {
    const cell = world.cellAt(x, y);
    if (build.open) build.tap(cell);
    else {
      panels.close();
      const place = world.exploration?.pick(x, y);
      const shop = !place && pickShop(world, x, y);
      if (place) { radial.hide(); panels.show('exploration', place); }
      else if (shop) { radial.hide(); radial.armed = null; radial.tool.hidden = true; panels.show('shops', shop); }
      else if (world.landDiscovery?.pick(cell)) { radial.hide(); panels.show('land', world.landDiscovery.site.parcel); }
      else if (world.learning?.pick(cell)) { radial.hide(); radial.armed = null; radial.tool.hidden = true; panels.show('learning'); }
      else radial.tap(cell, x, y);
    }
  },
});
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons && build.open) build.hover(world.cellAt(e.clientX, e.clientY)); });
addEventListener('pointerdown', unlockAudio, { capture: true });

// Sounds for what happens (one of each kind per action, so a sweep is not a din)
const SOUNDS = { harvested: 'pop', collected: 'pop', produced: 'pop', orderFilled: 'coin', rent: 'coin', coins: 'coin', placed: 'place', levelUp: 'level', projectDone: 'cheer', familyArrived: 'cheer', giftClaimed: 'coin', repaired: 'place', questDone: 'cheer', weeklyDone: 'cheer', festival: 'cheer', hurried: 'pop', familyTip: 'coin', barnSold: 'coin', fishCaught: 'pop', lineCast: 'click', truckBack: 'coin', truckSent: 'click', truckBought: 'cheer', repairStarted: 'click', demolished: 'place', houseUpgraded: 'level', neighbourRepair: 'cheer' };
game.on(r => {
  land.apply(r.events ?? []);
  if (!r.ok && r.reason) sfx('error');
  const played = new Set(); for (const e of r.events ?? []) {
    const name = e.type === 'discovery' || e.type === 'fishCaught' && e.first && e.rare ? 'cheer' : e.type === 'picked' ? 'pop' : SOUNDS[e.type];
    if (name && !played.has(name)) { played.add(name); sfx(name); }
  }
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
hud.onShowWay = at => panels.onShowWay?.(at);   // the Next chip's "go there"
radial.life = life; radial.people = people; hud.people = people; people.onOrder = () => { if (build.open) build.close(); radial.hide(); panels.show('orders'); };
new Juice(world, game, app);
new CartView(world, game);
new Critters(world, game);
new Daylight(world, game);
watchDiscoveries(game, hud);
watchExploration(game, hud);
world.exploration = new ExplorationView(world, game);
world.landDiscovery = new LandDiscoveryView(world, game);
world.learning = new LearningView(world, game, land.later);
game.start();
applySettings();
saveSession = autosave(game, profile);
if (!saveSession()) hud.toast(t('Could not save your farm. Please try again.'), 'warn');
new Guide(app, { game, world, hud, blocked: () => !!panels.open });
if (splash) { splash.classList.add('gone'); setTimeout(() => splash.remove(), 700); }
// Other language catalogs stay unloaded until the player selects them.
// the Today board opens by itself once a day, for players who have started farming (a first visit gets the tutorial)
if (!game.s.today.seen) { if (game.s.stats.harvested > 0) panels.show('today'); game.do('seeToday'); }

if (TEST_MODE) {
  const { installTestHook } = await import('./kit/test-hook.mjs');
  installTestHook({ world, game, land, marks, pondFish, build, hud, panels, radial, people, juice: world.juice });
}
/** All transitions leave the old farm's timers and pagehide writer behind before reloading another save. */
async function handleSave(what, arg) {
  if (changingProfile) return;
  if (what === 'export') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([pack(game.s)], { type: 'application/json' }));
    a.download = `farm-village-${profile}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); return;
  }
  if (!['import', 'newGame', 'resetProfile', 'profile', 'reload'].includes(what)) return;
  changingProfile = true;
  let navigating = false;
  const fail = () => hud.toast(t('Could not save your farm. Please try again.'), 'warn');
  try {
    if (what === 'reload') {
      // A failed optional module can remain cached. Reopen only after preserving this profile's latest actions.
      if (!saveSession?.()) { fail(); return; }
      if (activeProfile() !== profile && !selectProfile(profile)) {
        hud.toast(t('Could not switch farms. Your current farm is still open.'), 'warn'); return;
      }
    } else if (what === 'import') {
      if (!arg) return;
      let incoming;
      try { incoming = unpack(await arg.text()); }
      catch { hud.toast(t('That file is not a Farm Village save'), 'warn'); return; }
      if (!confirm(t('Replace the farm in Farm {n} with this save?', { n: profile }))) return;
      if (!saveSession?.()) { fail(); return; }
      saveSession.pause();
      if (activeProfile() !== profile && !selectProfile(profile)) {
        saveSession.resume(); hud.toast(t('Could not switch farms. Your current farm is still open.'), 'warn'); return;
      }
      if (!save(incoming, profile)) { saveSession.resume(); fail(); return; }
    } else {
      const target = what === 'newGame' ? profile : profileId(arg);
      if (!target || what === 'profile' && target === profile) return;
      if (what === 'profile') {
        const destination = inspectProfile(target);
        if (destination.error) { hud.toast(t('This farm could not be opened. Choose another farm or import a backup.'), 'warn'); return; }
      } else if (!confirm(t('Start a new farm in Farm {n}? Only this farm will be erased.', { n: target }))) return;
      if (!saveSession?.()) { fail(); return; }
      saveSession.pause();
      // Selecting another slot must succeed before a destructive reset touches it.
      if (activeProfile() !== target && !selectProfile(target)) {
        saveSession.resume(); hud.toast(t('Could not switch farms. Your current farm is still open.'), 'warn'); return;
      }
      if (what !== 'profile' && !erase(target)) {
        if (target !== profile) selectProfile(profile);
        saveSession.resume(); fail(); return;
      }
    }
    saveSession.dispose(); clearInterval(game.timer);
    navigating = true;
    location.replace(location.pathname);   // discard test-only ?new and stale navigation parameters
  } finally { if (!navigating) changingProfile = false; }
}

/** Recover or choose another slot before creating a game, so a broken save cannot be overwritten at boot. */
function recoverProfile() {
  splash?.remove();
  const picker = document.createElement('section'); picker.className = 'sheet panel';
  picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', t('Farm profiles'));
  picker.innerHTML = `<h2>${t('Farm profiles')}</h2><p class="hint" data-profile-error>${t('This farm could not be opened. Choose another farm or import a backup.')}</p>${renderProfiles(null, profile)}<label class="btn wide">${t('Import save')}<input type="file" accept=".json,application/json" data-recovery-file hidden></label><button class="btn wide" data-retry>${t('Try again')}</button>`;
  app.appendChild(picker);
  let recovering = false;
  picker.addEventListener('change', async e => {
    const input = e.target; if (!input.matches('[data-recovery-file]') || !input.files[0] || recovering) return;
    recovering = true;
    let navigating = false;
    try {
      let incoming;
      try { incoming = unpack(await input.files[0].text()); }
      catch { picker.querySelector('[data-profile-error]').textContent = t('That file is not a Farm Village save'); return; }
      if (!confirm(t('Replace the farm in Farm {n} with this save?', { n: profile }))) return;
      if (activeProfile() !== profile && !selectProfile(profile)) { picker.querySelector('[data-profile-error]').textContent = t('Could not switch farms. Your current farm is still open.'); return; }
      if (!save(incoming, profile)) { picker.querySelector('[data-profile-error]').textContent = t('Could not save your farm. Please try again.'); return; }
      navigating = true;
      location.replace(location.pathname);
    } finally { if (!navigating) recovering = false; input.value = ''; }
  });
  picker.addEventListener('click', e => {
    if (recovering) return;
    if (e.target.closest('[data-retry]')) { location.replace(location.pathname); return; }
    const button = e.target.closest('[data-do]'), target = profileId(button?.dataset.n);
    if (!button || button.disabled || !target) return;
    if (button.dataset.do === 'resetProfile') {
      if (!confirm(t('Start a new farm in Farm {n}? Only this farm will be erased.', { n: target }))) return;
    } else if (button.dataset.do !== 'profile' || inspectProfile(target).error) return;
    if (activeProfile() !== target && !selectProfile(target)) { picker.querySelector('[data-profile-error]').textContent = t('Could not switch farms. Your current farm is still open.'); return; }
    if (button.dataset.do === 'resetProfile' && !erase(target)) {
      if (target !== profile) selectProfile(profile);
      picker.querySelector('[data-profile-error]').textContent = t('Could not save your farm. Please try again.'); return;
    }
    recovering = true; location.replace(location.pathname);
  });
  return new Promise(() => {});   // choosing a slot navigates; there is no unsafe fallback into a fresh game
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
