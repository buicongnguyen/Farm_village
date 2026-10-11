// The co-operative's panel (core/cooperative.mjs, chapter 12). Before it is founded: who has called and the founding
// gift. After: the shared order, line by line, with the neighbour's share in a second colour and "Send" buttons, the
// reward, and the wait for the next. Opened from the board on the village square, Village projects or the Today board.
import { t, num } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { foundingPlan, cooperativeOf, lineLeft, members } from '../core/cooperative.mjs';
import * as barn from '../core/barn.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, faceHtml, glyph, goodIcon, iconHtml } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';

const faces = ids => `<div class="coop-members">${ids.map(id => `<span>${faceHtml(id, 'mini-face')}<small>${nameOf(id)}</small></span>`).join('')}</div>`;
function founding(s) {
  const plan = foundingPlan(s);
  if (!plan.open) return `<p>${t('Nobody has thought of it yet')}</p>`;
  const callers = plan.callers.map(c => `<li class="${c.called ? 'done' : ''}">${faceHtml(c.id, 'mini-face')}<span>${nameOf(c.id)}</span><b>${c.called ? glyph('check', 'g') : t('has not called yet')}</b></li>`).join('');
  const gift = plan.gift.map(g => `<div class="slot ${g.have >= g.need ? 'ready' : ''}">${goodIcon(g.good)}<small>${g.have}/${g.need}</small></div>`).join('');
  return `<p>${t('Five farms on one river, each sending a half-empty cart to the city. Together you could fill them.')}</p>
    ${faces(members(s))}
    <h3>${t('Your new neighbours')}</h3><ul class="coop-callers">${callers}</ul>
    <h3>${t('The founding gift, from your barn')}</h3><div class="queue feast">${gift}</div>
    ${plan.ok ? '' : `<p class="hint">${glyph('lock', 'g')} ${t(plan.reason)}</p>`}
    <button class="btn primary wide" data-do="foundCooperative" ${plan.ok ? '' : 'disabled'}>${iconHtml('cooperative_board', '', 'mini')} ${t('Found the co-operative')}</button>`;
}
function line(s, l) {
  const left = lineLeft(l), have = barn.free(s, l.good), share = Math.round(l.pledged / l.need * 100), sent = Math.round(l.sent / l.need * 100), can = Math.min(left, have);
  return `<div class="coop-line${left ? '' : ' full'}" data-good="${l.good}">${goodIcon(l.good)}
    <div class="coop-fill"><b>${t(GOODS[l.good].name)}</b><i class="progress"><i class="theirs" style="width:${share}%"></i><i style="width:${sent}%"></i></i>
      <small>${l.by ? t('{name} brings {count}', { name: nameOf(l.by), count: l.pledged }) : ''} · ${left ? t('{count} more from you', { count: left }) : t('Full')}</small></div>
    ${left ? `<div class="coop-send"><button class="btn small" data-do="fillCooperative" data-good="${l.good}" data-n="${Math.min(10, can)}" ${can ? '' : 'disabled'}>${t('Send')} ${Math.min(10, can) || ''}</button>
      <button class="btn primary small" data-do="fillCooperative" data-good="${l.good}" ${can ? '' : 'disabled'}>${t('Send all')}</button></div>` : `<span class="coop-done">${glyph('check', 'g')}</span>`}</div>`;
}
export function renderCooperative(s, now) {
  const c = cooperativeOf(s);
  if (!c.founded) return `<div class="coop">${founding(s)}</div>`;
  if (!c.order) return `<div class="coop">${faces(members(s))}<p>${t('The carts are on the road to the city. The next order will be posted soon.')}</p>
    <p class="hint">${glyph('clock', 'g')} ${shortTime(Math.max(0, (c.nextAt ?? now) - now))}</p><p class="hint">${t('Shared orders filled: {count}', { count: c.filled })}</p></div>`;
  return `<div class="coop">
    <p>${t('The city asks for more than one farm can send. Your neighbours bring a third; send the rest, a little at a time.')}</p>
    ${c.order.lines.map(l => line(s, l)).join('')}
    <p class="feast-gives">${coinMark()} <b>${num(c.order.coins)}</b> · ${iconHtml('ui:xp', '', 'mini')} ${num(c.order.xp)}</p>
    <p class="hint">${t('Shared orders filled: {count}', { count: c.filled })}</p></div>`;
}
