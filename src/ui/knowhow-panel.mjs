// The farm notebook (core/knowhow.mjs): what the farmer has found out, what can be tried now, and what makes them curious.
import { knowhowRows } from '../core/knowhow.mjs';
import { t } from '../kit/i18n.mjs';
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
    ${[...rows].sort((a, b) => order[a.state] - order[b.state]).map(card).join('')}`;
}
