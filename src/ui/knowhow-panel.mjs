// The farm notebook (core/knowhow.mjs): what the farmer has found out, what can be tried now, and what makes them curious.
import { knowhowRows } from '../core/knowhow.mjs';
import { luckyFinds, rushStatus } from '../core/surprises.mjs';
import { SURPRISES } from '../content/surprises.mjs';
import { shortTime } from '../core/clock.mjs';
import { t, num } from '../kit/i18n.mjs';
import { iconHtml } from './icon.mjs';

const card = ({ trick, state }) => {
  const head = `<div class="know-head">${iconHtml(trick.icon, '', 'mini')}<b>${t(trick.name)}</b>${state === 'known' ? '<span class="badge ready">✓</span>' : ''}</div>`;
  if (state === 'known') return `<section class="know-card known" data-trick="${trick.id}">${head}<p>${t(trick.found)}</p><p class="know-effect">${t(trick.effect)}</p><p class="hint">${t(trick.fact)}</p></section>`;
  if (state === 'later') return `<section class="know-card later" data-trick="${trick.id}"><div class="know-head">${iconHtml(trick.icon, '', 'mini')}<b>${t('Something to find out later')}</b></div><p class="hint">${t('Reach level {level} first', { level: trick.level })}</p></section>`;
  return `<section class="know-card ${state}" data-trick="${trick.id}">${head}<p>${t(trick.hint)}</p>
    ${state === 'ready' ? `<button class="btn primary wide" data-do="tryTrick" data-id="${trick.id}">${t('Try it')}: ${t(trick.how)}</button>` : `<p class="know-need">${t('To try it')}: ${t(trick.need)}</p>`}</section>`;
};
export function renderKnowhow(s) {
  const rows = knowhowRows(s), known = rows.filter(r => r.state === 'known').length, order = { ready: 0, waiting: 1, known: 2, later: 3 };
  return `<p class="hint">${t('Things you find out by trying them. Each one changes how the farm works, for good.')} <b>${known}/${rows.length}</b></p>
    ${[...rows].sort((a, b) => order[a.state] - order[b.state]).map(card).join('')}${renderLucky(s)}`;
}
/** Lucky finds: the surprises that came to the farm (core/surprises.mjs), as silhouettes until they have. */
export function renderLucky(s) {
  const finds = luckyFinds(s), n = finds.filter(f => f.at != null).length;
  return `<h3 class="lucky-title">${t('Lucky finds')} <b>${n}/${finds.length}</b></h3><p class="hint">${t('These come by themselves, sooner or later. Nothing is lost by waiting.')}</p>
    <div class="lucky-grid">${finds.map(f => f.at != null
      ? `<div class="lucky found" data-find="${f.id}">${iconHtml(f.icon, '', 'icon')}<b>${t(f.name)}</b><small>${t(f.text)}</small></div>`
      : `<div class="lucky" data-find="${f.id}">${iconHtml(f.icon, '', 'icon')}<b>???</b><small>${t(f.hint)}</small></div>`).join('')}</div>`;
}
/** The gold rush: how long it lasts, what it does, and the pan. */
export function renderGoldRush(s, now) {
  const r = rushStatus(s, now), R = SURPRISES.rush;
  if (!r.active) return `<p>${t('The brook runs clear again. The gold rush is over')}</p><p class="hint">${t('It comes back now and then. Nobody knows when.')}</p>`;
  return `<p><b>${t('The brook is carrying gold, and the whole county has come to see.')}</b></p>
    <p>${t('While it lasts every cottage pays double rent. The rush ends in {time}.', { time: shortTime(r.leftMs) })}</p>
    <button class="btn primary wide" data-do="panGold" ${r.canPan ? '' : 'disabled'}>${iconHtml('ui:coin', '', 'mini')} ${t('Pan for gold')} · ${r.pansLeft}/${R.pans}</button>
    <p class="hint">${r.pansLeft < 1 ? t('The gravel here is panned out') : r.waitMs > 0 ? t('Let the water clear first') : t('Each pan brings up {a} to {b} coins.', { a: num(R.coins[0]), b: num(R.coins[1]) })}</p>`;
}
