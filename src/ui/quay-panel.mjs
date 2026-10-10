// The quay's panel (core/riverside.mjs, Act IV). Before it is paved: what paving takes. After: its seven lots in a
// row (free, or what stands there), and for the lot that is picked either what can be built on it or what the building
// there is doing (a quay house: its families and the rent waiting). Opened from Village projects, a tap on the quay,
// a lot's sign or a riverside building.
import { t, tParams, num } from '../kit/i18n.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { LOTS } from '../content/world.mjs';
import { RIVERSIDE } from '../content/economy.mjs';
import { quayOf, quayPlan, lotPlan, onLot, riversideKinds, quayRent, returnedFamilies } from '../core/riverside.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, faceHtml, glyph, iconHtml } from './icon.mjs';
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** What each riverside building is, in one line. */
const ABOUT = { apartment: 'A tea shop below and four flats above, for families who want to come home. It pays rent into your mailbox.',
  halt: 'A platform and a little station. The evening train stops behind it with three wagons to fill.',
  hotel: 'Rooms with a view of the brook. Guests come by themselves, sooner and more generous the prettier the valley is.' };

function checklist(reqs, button) {
  const missing = reqs.find(r => !r[0]);
  return `${reqs.map(([ok, text]) => `<div class="req ${ok ? 'ok' : ''}">${glyph(ok ? 'check' : 'lock', 'g')} ${text}</div>`).join('')}${button(missing)}`;
}
const why = missing => missing ? `data-why="${esc((missing[2] ?? missing[1]).replace(/<[^>]*>/g, '').trim())}"` : '';
function paving(s) {
  const q = quayOf(s), plan = quayPlan(s), { level, cost } = RIVERSIDE.quay;
  const reqs = [[q.open, t('Open the old towpath'), t('The towpath gate is still shut')], [s.level >= level, t('Reach level {level}', { level })], [s.coins >= cost, `${coinMark()} ${num(cost)}`, t('Not enough coins')]];
  return `<div class="site-top">${iconHtml('quay', '', 'tile-icon')}<p>${t('Under the grass of the far bank lies the old quay. Paved again, it has room for seven buildings, each with its door on the water.')}</p></div>
    ${checklist(reqs, missing => `<button class="btn primary wide${missing ? ' blocked' : ''}" data-do="paveQuay" ${why(missing)}>${t('Pave the quay')} · ${coinMark()} ${num(plan.price)}</button>`)}`;
}
function house(s, id, now) {
  const f = s.flats?.[id], { rent, rentMs, cap } = RIVERSIDE.house;
  const waited = Math.max(0, now - (f?.rentFrom ?? now)), due = Math.min(cap, Math.floor(waited / rentMs)) * rent, full = waited >= cap * rentMs;
  return `<div class="site-top">${iconHtml('apartment', '', 'tile-icon')}<p>${t(ABOUT.apartment)}</p></div>
    <p class="quay-keeper">${faceHtml('tuyet', 'mini-face')}<span>${t('Four families live here again. {count} have come back to the valley.', { count: returnedFamilies(s) })}</span></p>
    <p class="feast-gives">${coinMark()} <b>${num(due)}</b> · ${full ? t('The rent box is full') : `${glyph('clock', 'g')} ${shortTime(rentMs - waited % rentMs)}`}</p>
    <button class="btn primary wide" data-do="collectRent" ${quayRent(s, now) > 0 ? '' : 'disabled'}>${t('Collect the rent')}</button>`;
}
function building(s, lot, kind) {
  const def = BUILDINGS[kind], plan = lotPlan(s, lot, kind);
  const other = !plan.ok && !plan.reason?.startsWith('Reach level') && plan.reason !== 'Not enough coins' ? plan : null;
  const reqs = [[s.level >= def.level, t('Reach level {level}', { level: def.level })], [s.coins >= def.cost, `${coinMark()} ${num(def.cost)}`, t('Not enough coins')], ...(other ? [[false, t(other.reason, tParams(other.params))]] : [])];
  return `<div class="quay-kind"><div class="site-top">${iconHtml(kind, '', 'tile-icon')}<div><b>${t(def.name)}</b><p>${t(ABOUT[kind] ?? '')}</p></div></div>
    ${checklist(reqs, missing => `<button class="btn primary wide${missing ? ' blocked' : ''}" data-do="buildOnLot" data-lot="${lot}" data-kind="${kind}" ${why(missing)}>${t('Build')} · ${coinMark()} ${num(def.cost)}</button>`)}</div>`;
}
/** lot: the lot to show (a free one is picked when none is given). */
export function renderQuay(s, now, lot = null) {
  if (!quayOf(s).paved) return `<div class="quay">${paving(s)}</div>`;
  const picked = LOTS.find(l => l.id === lot) ?? LOTS.find(l => !onLot(s, l.id)) ?? LOTS[0], on = onLot(s, picked.id);
  const row = LOTS.map((l, i) => { const id = onLot(s, l.id); return `<button class="quay-lot${l.id === picked.id ? ' on' : ''}${id ? ' taken' : ''}" data-do="quay" data-lot="${l.id}" aria-label="${t('Lot {n}', { n: i + 1 })}">${id ? iconHtml(s.placed[id].kind, '', 'mini') : `<b>${i + 1}</b>`}</button>`; }).join('');
  const body = on ? (BUILDINGS[s.placed[on].kind].flats ? house(s, on, now) : `<div class="site-top">${iconHtml(s.placed[on].kind, '', 'tile-icon')}<div><b>${t(BUILDINGS[s.placed[on].kind].name)}</b><p>${t(ABOUT[s.placed[on].kind] ?? '')}</p></div></div>${s.placed[on].kind === 'hotel' ? `<button class="btn primary wide" data-do="hotel">${t('The hotel')}</button>` : s.placed[on].kind === 'halt' ? `<button class="btn primary wide" data-do="train">${t('The railway halt')}</button>` : ''}`)
    : `<h3>${t('Lot {n}: free', { n: LOTS.indexOf(picked) + 1 })}</h3>${riversideKinds().map(kind => building(s, picked.id, kind)).join('')}`;
  return `<div class="quay"><div class="quay-lots">${row}</div>${body}</div>`;
}
