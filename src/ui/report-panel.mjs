// Today's sums (core/report.mjs, chapter 10): what the farm earned today and from what, what the hired hands did, and
// one piece of advice from Granny Maple. Opened from the evening pill, the Today board or Friends.
import { t, num } from '../kit/i18n.mjs';
import { reportOf } from '../core/report.mjs';
import { handWho } from '../core/helpers.mjs';
import { coinMark, faceHtml, glyph } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';
const SOURCE_NAMES = { orders: 'Orders', sales: 'Barn, trucks and stands', rent: 'Rent', fishing: 'Fishing', festival: 'The festival', cooperative: 'The co-operative', hotel: 'The hotel', train: 'The train', dividend: 'Dividends', other: 'Everything else' };
const ROLE_NAMES = { field: 'Field hand', animals: 'Animal hand', workshop: 'Workshop hand', orchard: 'Orchard hand', driver: 'Truck driver', fisher: 'Fisher' };
/** Granny Maple's advice by id (core/report.mjs adviceOf). */
const ADVICE = {
  barn: 'The barn is nearly full, dear. Send the trucks, or sell what you will not need.',
  beds: 'There are empty beds. A bed with nothing in it earns nothing, dear.',
  trays: 'A workshop is standing idle. Give it something to do.',
  hire: 'You can afford another pair of hands. They pay for themselves by supper.',
  grow: 'You have room for more beds, dear. The land is yours: use it.',
  praise: 'A good day. Nothing to mend, nothing to scold. Sit on the porch a while.',
};
export function renderReport(s, now) {
  const r = reportOf(s), rows = [...r.rows, ...(r.other > 0 ? [['other', r.other]] : [])], top = Math.max(1, ...rows.map(([, n]) => n));
  const bars = rows.map(([k, n]) => `<div class="report-row${k === r.best ? ' best' : ''}"><span>${t(SOURCE_NAMES[k])}</span><i class="progress"><i style="width:${Math.max(4, Math.round(n / top * 100))}%"></i></i><b>${coinMark()} ${num(n)}</b></div>`).join('');
  const hands = r.hands.map(([role, n]) => { const who = handWho(s, role, now); return `<li>${who ? faceHtml(who, 'mini-face') : glyph('person', 'g')} <span>${who ? nameOf(who) : t(ROLE_NAMES[role])}</span><b>${t('{count} tasks', { count: n })}</b></li>`; }).join('');
  const [advice, panel] = r.advice;
  return `<div class="report">
    <p class="report-total">${coinMark()} <b>${num(r.total)}</b> <span>${t('earned today')}</span></p>
    ${bars || `<p class="hint">${t('Nothing sold yet today. The day is young.')}</p>`}
    ${hands ? `<h3>${t('Your hands today')}</h3><ul class="report-hands">${hands}</ul><p class="hint">${t('Wages paid: {coins} coins', { coins: num(r.wages) })}</p>` : ''}
    <p class="ada report-advice">${faceHtml('ada', 'mini-face')}<span><b>${t('{person:ada:display}')}:</b> “${t(ADVICE[advice])}”</span></p>
    ${panel ? `<button class="btn primary wide" data-do="stepPanel" data-panel="${panel}">${t('Show me')}</button>` : ''}
  </div>`;
}
