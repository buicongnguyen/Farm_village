// The cargo ship's panel (core/port.mjs): while a ship is at the quay, its four holds with what each takes, "Load"
// buttons, what it would pay if it sailed now, and the time until it sails; between ships, when the next one calls.
// Opened by the ship pill or the toast when a ship arrives.
import { t, num } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { PORT, portOf, holdFull, holdPays } from '../core/port.mjs';
import * as barn from '../core/barn.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, glyph, goodIcon, iconHtml } from './icon.mjs';

function hold(s, h, i) {
  const full = holdFull(h), left = h.need - h.have, can = Math.min(left, barn.free(s, h.good)), whenFull = Math.round(h.need * GOODS[h.good].value * PORT.pay);
  return `<div class="coop-line${full ? ' full' : ''}" data-hold="${i}">${goodIcon(h.good)}
    <div class="coop-fill"><b>${t(GOODS[h.good].name)}</b><i class="progress"><i style="width:${Math.round(h.have / h.need * 100)}%"></i></i>
      <small>${h.have} / ${h.need} · ${coinMark()}${num(full ? holdPays(h) : whenFull)} ${full ? '' : t('when full')}</small></div>
    ${full ? `<span class="coop-done">${glyph('check', 'g')}</span>` : `<div class="coop-send"><button class="btn small" data-do="loadHold" data-hold="${i}" data-n="${Math.min(10, can)}" ${can ? '' : 'disabled'}>${t('Load')} ${Math.min(10, can) || ''}</button>
      <button class="btn primary small" data-do="loadHold" data-hold="${i}" ${can ? '' : 'disabled'}>${t('Load all')}</button></div>`}</div>`;
}
export function renderPort(s, now) {
  const p = portOf(s, now);
  const about = `<div class="site-top">${iconHtml('dock', '', 'tile-icon')}<p>${t('A cargo ship calls at the quay with four holds. It takes made goods in bulk and pays twice their price: the best sale in the valley.')}</p></div>`;
  if (!p.open) return `${about}<p class="hint">${t('Ships begin to call once the quay is paved and the farm is level {level}.', { level: PORT.level })}</p>`;
  if (!p.here) return `<div class="train">${about}<p class="feast-gives">${glyph('clock', 'g')} ${t('The next ship')} · <b>${shortTime(Math.max(0, (p.nextAt ?? now) - now))}</b></p>
    <p class="hint">${t('Ships sent with a full hold: {count}', { count: p.sent })}</p></div>`;
  return `<div class="train">
    <p class="feast-gives">${glyph('clock', 'g')} ${t('The ship sails in')} <b>${shortTime(Math.max(0, p.leavesAt - now))}</b></p>
    ${p.holds.map((h, i) => hold(s, h, i)).join('')}
    <p class="feast-gives">${coinMark()} <b>${num(p.pays.coins)}</b> ${t('if it sailed now')}${p.pays.all ? '' : ` · ${t('four full holds: {coins} more', { coins: num(PORT.bonus) })}`}</p></div>`;
}
