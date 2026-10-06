// Boot: build the world view, load the scenery, start the loop, then the HUD.
import './style.css';
import { WorldView } from './view/world-view.mjs';
import { t, getLanguage, setLanguage, onLanguageChange } from './kit/i18n.mjs';

const app = document.getElementById('app');
app.innerHTML = '';
const world = new WorldView(app);
world.cam.attach(world.renderer.domElement, { onTap: (x, y) => hud.tap?.(world.cellAt(x, y)) });
world.start();
await world.loadScenery();

const hud = document.createElement('div');
hud.className = 'hud';
const draw = () => {
  hud.innerHTML = `<div class="hud-title">${t('Farm Village')}</div>
    <div class="hud-tools">
      <button class="round" data-act="turn" aria-label="${t('Turn the view')}">⟳</button>
      <button class="round" data-act="lang" aria-label="${t('Language')}">${getLanguage() === 'vi' ? 'EN' : 'VI'}</button>
    </div>`;
};
hud.addEventListener('click', e => {
  const act = e.target.closest('button')?.dataset.act;
  if (act === 'turn') world.cam.turn(1);
  if (act === 'lang') setLanguage(getLanguage() === 'vi' ? 'en' : 'vi');
});
onLanguageChange(draw); draw();
app.appendChild(hud);

if (TEST_MODE) {
  const { installTestHook } = await import('./kit/test-hook.mjs');
  installTestHook({ world });
}
