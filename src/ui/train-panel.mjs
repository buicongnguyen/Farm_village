// The railway halt's panel (core/train.mjs, chapter 15): while a train waits, its three wagons with what each takes,
// "Load" buttons, what it would pay if it left now, and the time until it leaves; between trains, when the next one
// comes. Opened by a tap on the halt, the train pill or Village projects.
import { t, num } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { TRAIN } from '../content/economy.mjs';
import { trainOf, wagonFull, wagonPays } from '../core/train.mjs';
import * as barn from '../core/barn.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, glyph, goodIcon, iconHtml } from './icon.mjs';

function wagon(s, w, i) {
  const full = wagonFull(w), left = w.need - w.have, can = Math.min(left, barn.free(s, w.good));
  const whenFull = Math.round(w.need * GOODS[w.good].value * TRAIN.pay);
  return `<div class="coop-line${full ? ' full' : ''}" data-wagon="${i}">${goodIcon(w.good)}
    <div class="coop-fill"><b>${t(GOODS[w.good].name)}</b><i class="progress"><i style="width:${Math.round(w.have / w.need * 100)}%"></i></i>
      <small>${w.have} / ${w.need} · ${coinMark()}${num(full ? wagonPays(w) : whenFull)} ${full ? '' : t('when full')}</small></div>
    ${full ? `<span class="coop-done">${glyph('check', 'g')}</span>` : `<div class="coop-send"><button class="btn small" data-do="loadWagon" data-wagon="${i}" data-n="${Math.min(10, can)}" ${can ? '' : 'disabled'}>${t('Load')} ${Math.min(10, can) || ''}</button>
      <button class="btn primary small" data-do="loadWagon" data-wagon="${i}" ${can ? '' : 'disabled'}>${t('Load all')}</button></div>`}</div>`;
}
export function renderTrain(s, now) {
  const tr = trainOf(s, now);
  if (!tr.built) return `<p>${t('The halt is built on a lot of the quay.')}</p><button class="btn primary wide" data-do="quay">${iconHtml('quay', '', 'mini')} ${t('The quay')}</button>`;
  const about = `<div class="site-top">${iconHtml('halt', '', 'tile-icon')}<p>${t('The evening train stops here with three wagons. Fill them from your barn before it leaves: a full wagon pays best of all.')}</p></div>`;
  if (!tr.here) return `<div class="train">${about}<p class="feast-gives">${glyph('clock', 'g')} ${t('The next train')} · <b>${shortTime(Math.max(0, (tr.nextAt ?? now) - now))}</b></p>
    <p class="hint">${t('Trains sent with a full wagon: {count}', { count: tr.sent })}</p></div>`;
  return `<div class="train">
    <p class="feast-gives">${glyph('clock', 'g')} ${t('The train leaves in')} <b>${shortTime(Math.max(0, tr.leavesAt - now))}</b></p>
    ${tr.wagons.map((w, i) => wagon(s, w, i)).join('')}
    <p class="feast-gives">${coinMark()} <b>${num(tr.pays.coins)}</b> ${t('if it left now')}${tr.pays.all ? ` · ${t('three full wagons: {coins} more', { coins: num(TRAIN.bonus) })}` : ''}</p>
    <p class="hint">${t('A full wagon pays more than half as much again. Three full wagons add {coins} coins.', { coins: num(TRAIN.bonus) })}</p></div>`;
}
