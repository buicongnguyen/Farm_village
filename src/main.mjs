// Boot: load the save, then the world view, the land and life drawn from the rules state, the HUD, build mode, the
// farm panels and the tap menu. Autosave keeps it all.
import './style.css';
import './ui/ui.css';
import './ui/farm.css';
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
import { load, autosave } from './kit/save.mjs';

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
panels = new Panels(app, game, hud);
const radial = new Radial(app, { game, world, panels, hud });
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

if (TEST_MODE) {
  const { installTestHook } = await import('./kit/test-hook.mjs');
  installTestHook({ world, game, land, build, hud, panels, radial });
}
