// Boot: the game, the world view, the land drawn from the rules state, the HUD and build mode.
import './style.css';
import './ui/ui.css';
import { Game } from './game.mjs';
import { WorldView } from './view/world-view.mjs';
import { LandView } from './view/land-view.mjs';
import { Ghost } from './view/ghost.mjs';
import { Hud } from './ui/hud.mjs';
import { BuildView } from './ui/build-view.mjs';

const app = document.getElementById('app');
app.innerHTML = '';
const game = new Game();
const world = new WorldView(app);
const land = new LandView(world, game);
const ghost = new Ghost(world);
let build = null;
const hud = new Hud(app, game, { onBuild: () => build.toggle(), onTurn: () => world.cam.turn(1) });
build = new BuildView(app, { game, world, ghost, hud });

const canvas = world.renderer.domElement;
world.cam.attach(canvas, { onTap: (x, y) => { const cell = world.cellAt(x, y); if (build.open) build.tap(cell); } });
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons && build.open) build.hover(world.cellAt(e.clientX, e.clientY)); });
game.on(r => land.apply(r.events ?? []));
world.start();
await world.loadScenery();
await land.load();
game.start();

if (TEST_MODE) {
  const { installTestHook } = await import('./kit/test-hook.mjs');
  installTestHook({ world, game, land, build, hud });
}
