// Pond controls live in the lazy sheet bundle. Keep the active button in place while the timing marker moves.
import { t, num, getLanguage } from '../kit/i18n.mjs';
import { shortTime } from '../core/clock.mjs';
import { reelingOf, reelPosition, REEL_TIMING } from '../core/fishing.mjs';
import * as barn from '../core/barn.mjs';
import { FISH_TABLE } from '../content/goods.mjs';
import { goodIcon, iconHtml, coinMark } from './icon.mjs';
import { renderExplorationEntry } from './exploration-panels.mjs';

const reduced = s => !!s.settings.reducedMotion || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const phase = (line, now) => !line ? 'empty' : line.doneAt > now ? 'waiting' : reelingOf(line) ? 'reeling' : 'ready';
const key = (panels) => { const s = panels.game.s; return JSON.stringify([getLanguage(), reduced(s), !!panels.fishingWalk?.(), phase(s.fishing?.line, panels.game.now), s.fishing, s.barn.items, s.exploration]); };
export function renderPond(s, now, { walking = false, river = false } = {}) {
  const f = s.fishing ?? { line: null, coins: 0, caught: 0 }, state = phase(f.line, now), calm = reduced(s);
  const fish = FISH_TABLE.filter(x => s.barn.items[x.id] > 0), bait = barn.free(s, 'chicken_feed') > 0;
  const steady = `<button class="btn ${calm ? 'primary' : 'ghost'} wide" data-do="reelIn" data-steady="1">${t('Reel gently')}</button>`;
  return `<section data-pond>${renderExplorationEntry(s, { location: 'pond' })}
    <p class="hint">${t('Cast a line and wait for the float to bob. Then reel in your fish.')}${river ? ` <b>${t('The rare fish bite twice as often here.')}</b>` : ''}</p>
    <p class="hint"><b data-fishing-status></b></p>
    ${state === 'empty' ? `<button class="btn primary wide" data-do="castLine" ${walking ? 'disabled' : ''}>${t('Cast a line')}</button><button class="btn ghost wide" data-do="castLine" data-bait="1" ${bait && !walking ? '' : 'disabled'}>${iconHtml('chicken_feed', '', 'mini')} ${t('Cast with bait')} (${t('chicken feed')})</button>` : ''}
    ${state === 'ready' && !calm ? `<p class="hint">${t('A fish is biting! Sit at the water and use the round Reel button: strike on the bite, then hold to reel.')}</p>` : ''}
    ${state === 'reeling' && !calm ? `<p id="reel-help" class="hint">${t('Press Reel now while the marker is inside the green band. There is no rush: it keeps coming back.')}</p>
      <div class="fishing-meter" aria-hidden="true"><i class="fishing-band" style="left:${REEL_TIMING.from * 100}%;width:${(REEL_TIMING.to - REEL_TIMING.from) * 100}%"></i><i class="fishing-marker"></i></div>
      <button class="btn primary wide" data-do="reelIn" aria-describedby="reel-help">${t('Reel now')}</button><p class="hint" role="status" aria-live="polite" data-reel-feedback></p>` : ''}
    ${state === 'ready' || state === 'reeling' ? `${steady}<p class="hint">${t('Reel gently skips the timing and gives the same fish and rewards.')}</p>` : ''}
    ${f.coins ? `<button class="btn primary wide" data-do="collectFees">${t('Collect {coins} coins', { coins: num(f.coins) })}</button>` : ''}
    <div class="goods-grid">${fish.map(x => `<div class="good-tile">${goodIcon(x.id)}<b>${num(s.barn.items[x.id])}</b><small>${t(x.name)} · ${coinMark()} ${x.value}</small></div>`).join('')}</div>
    <p class="hint">${t('Sell fish with the market truck, or keep them for friends.')} (${num(f.caught)} ${t('caught')})</p></section>`;
}
function update(panels) {
  const line = panels.game.s.fishing?.line, now = panels.game.now, status = panels.el.querySelector('[data-fishing-status]');
  const text = !line ? t(panels.fishingWalk?.() ? 'Walking to the fishing spot.' : 'No line in the water') : line.doneAt > now ? `${t('Waiting for a bite')} · ${shortTime(line.doneAt - now)}` : t('A fish is biting!');
  if (status && status.textContent !== text) status.textContent = text;
  const marker = panels.el.querySelector('.fishing-marker'); if (marker) marker.style.left = `${reduced(panels.game.s) ? 50 : reelPosition(line, now) * 100}%`;
}
export function refreshPond(panels) {
  if (!panels.el.querySelector('[data-pond]') || panels.pondKey !== key(panels)) return false;
  if (panels.el.querySelector('.fishing-marker') && !panels.pondFrame) mountPond(panels); else update(panels);
  return true;
}
export function mountPond(panels) {
  panels.pondKey = key(panels); update(panels);
  if (panels.pondFrame) cancelAnimationFrame(panels.pondFrame);
  panels.pondFrame = 0;
  const root = panels.el.querySelector('[data-pond]');
  const frame = () => {
    if (!root?.isConnected || panels.open?.kind !== 'pond') { panels.pondFrame = 0; return; }
    if (!document.hidden) update(panels);
    panels.pondFrame = requestAnimationFrame(frame);
  };
  if (root?.querySelector('.fishing-marker')) panels.pondFrame = requestAnimationFrame(frame);
}
