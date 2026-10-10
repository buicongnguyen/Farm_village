// The hotel's panel (core/hotel.mjs, chapter 14): its rooms as a row of doors (free, or a guest with the time left and
// the breakfast they wish for), "Serve" where the barn has it, the coins waiting at the desk, what the valley's beauty
// adds, and the next floor. Opened by a tap on the hotel, the breakfast pill or Village projects.
import { t, num } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { HOTEL } from '../content/economy.mjs';
import { hotelOf, remarkOf, tipOf } from '../core/hotel.mjs';
import { RANK_NAMES } from '../core/valley.mjs';
import * as barn from '../core/barn.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, glyph, goodIcon, iconHtml } from './icon.mjs';

function room(s, g, i, now) {
  if (!g) return `<div class="room free"><b>${i + 1}</b><small>${t('Free')}</small></div>`;
  const can = barn.free(s, g.wish) > 0;
  return `<div class="room${g.served ? ' served' : ''}"><b>${i + 1}</b>${goodIcon(g.wish, 'mini')}<small>${glyph('clock', 'g')} ${shortTime(Math.max(0, g.until - now))}</small>
    ${g.served ? `<span class="room-done">${glyph('check', 'g')}</span>` : `<button class="btn small${can ? ' primary' : ''}" data-do="serveGuest" data-room="${i}" ${can ? '' : 'disabled'} aria-label="${t('Serve {good}', { good: t(GOODS[g.wish].name) })}">${t('Serve')}</button>`}</div>`;
}
export function renderHotel(s, now) {
  const h = hotelOf(s, now);
  if (!h.built) return `<p>${t('The hotel is built on a lot of the quay.')}</p><button class="btn primary wide" data-do="quay">${iconHtml('quay', '', 'mini')} ${t('The quay')}</button>`;
  const first = h.rooms.find(Boolean), full = h.held >= h.cap;
  return `<div class="hotel">
    <p>${t('Guests come by themselves while a room is free. Serve the breakfast a guest wishes for and they tip double.')}</p>
    <div class="rooms">${h.rooms.map((g, i) => room(s, g, i, now)).join('')}</div>
    ${first ? `<p class="hotel-says">“${t(remarkOf(s, first.n))}”</p>` : `<p class="hint">${glyph('clock', 'g')} ${t('The next guest is on the way')} · ${shortTime(Math.max(0, h.nextAt - now))}</p>`}
    <p class="feast-gives">${coinMark()} <b>${num(h.held)}</b> / ${num(h.cap)} ${full ? `· ${t('The desk is full')}` : ''}</p>
    <button class="btn primary wide" data-do="collectHotel" ${h.held > 0 ? '' : 'disabled'}>${t('Collect at the desk')}</button>
    <p class="hint">${iconHtml('round_tree', '', 'mini')} ${t('Valley beauty: {name}. A guest every {time}; a room pays {coins} with its tip.', { name: t(RANK_NAMES[h.rank]), time: shortTime(h.every), coins: num(HOTEL.room + tipOf(s)) })}
      <button class="btn ghost small" data-do="valley">${t('The valley')}</button></p>
    ${h.upgrade ? `<button class="btn wide" data-do="upgradeHotel" ${s.coins >= h.upgrade.cost ? '' : 'disabled'}>${t('Add a floor: {rooms} rooms', { rooms: h.upgrade.rooms })} · ${coinMark()}${num(h.upgrade.cost)}</button>` : ''}
  </div>`;
}
