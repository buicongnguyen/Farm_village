// Boot: load the save, then the world view, the land and life drawn from the rules state, the HUD, build mode, the
// farm panels and the tap menu. Autosave keeps it all.
import './style.css';
import './ui/ui.css';
import './ui/farm.css';
import './ui/village.css';
import { Game } from './game.mjs';
import { WorldView } from './view/world-view.mjs';
import { LandView } from './view/land-view.mjs';
import { LifeView } from './view/life-view.mjs';
import { Ghost } from './view/ghost.mjs';
import { Hud } from './ui/hud.mjs';
import { BuildView } from './ui/build-view.mjs';
import { Panels } from './ui/panels.mjs';
import { Radial } from './ui/radial.mjs';
import { Fx } from './ui/fx.mjs';
import { PeopleView } from './view/people-view.mjs';
import { showWelcome } from './ui/village-panels.mjs';
import { RUINS, START_PARCEL, parcelOrigin, CELL } from './content/world.mjs';
import { BUILDINGS } from './content/buildings.mjs';
import { load, autosave } from './kit/save.mjs';
import { t } from './kit/i18n.mjs';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app');
app.innerHTML = '';
// test builds can run the clock ahead (kept for the tab, so a reload sees the same time)
const clockOffset = TEST_MODE ? +(sessionStorage.getItem('fv-clock-offset') ?? 0) : 0;
const game = new Game(params.has('new') ? null : load(), () => Date.now() + clockOffset);
const world = new WorldView(app);
const land = new LandView(world, game);
const ghost = new Ghost(world);
let build = null, panels = null;
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
});
const people = new PeopleView(world, game, app);
const radial = new Radial(app, { game, world, panels, hud, people });
game.on(r => { for (const e of r.events ?? []) if (e.type === 'familyArrived') showWelcome(app, e.family); });
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
game.on(r => land.apply(r.events ?? []));
world.start();
await world.loadScenery();
await land.load();
new LifeView(world, game);
game.start();
autosave(game);
// the Today board opens by itself once a day, for players who have started farming (a first visit gets the tutorial)
if (!game.s.today.seen) { if (game.s.stats.harvested > 0) panels.show('today'); game.do('seeToday'); }

if (TEST_MODE) {
  const { installTestHook } = await import('./kit/test-hook.mjs');
  installTestHook({ world, game, land, build, hud, panels, radial, people });
}
