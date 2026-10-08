// Bonds (DESIGN 9.2): hearts on order cards and in the cottage panel, today's wish for a household, gifts, the friends
// list, the mailbox with Ellis's and the villagers' letters, and the story cards for heart scenes, a family's arrival and
// the short story beats, all in the chapter-card layout (modal.mjs). Words come from content/hearts.mjs, letters.mjs
// and story.mjs; the rules from core/bonds.mjs.
import { t, num, getLanguage } from '../kit/i18n.mjs';
import { sfx } from '../kit/sound.mjs';
import { allPeople, FAMILIES } from '../content/people.mjs';
import { ARRIVALS } from '../content/hearts.mjs';
import { GOODS, RECIPES } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { heartsOf, giftable, sceneFor, letterOf, letterPrerequisite, unread, residents, WISH_FALLBACK } from '../core/bonds.mjs';
import { rentWaiting } from '../core/homes.mjs';
import { dayKey } from '../core/clock.mjs';
import * as barn from '../core/barn.mjs';
import { iconHtml, faceHtml, goodIcon, glyph, coinMark } from './icon.mjs';
import { showModal } from './modal.mjs';

export const PEOPLE = Object.fromEntries(allPeople().map(p => [p.id, p]));
export const nameOf = id => t(PEOPLE[id]?.name ?? id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Hearts for a person: a heart, the whole hearts, and a thin bar to the next one. */
export function heartBar(s, id, { label = false } = {}) {
  const h = s.people?.[id]?.hearts ?? 0, whole = Math.floor(h), part = whole >= 10 ? 100 : Math.round((h - whole) * 100);
  return `<span class="hearts" title="${esc(t('{count} hearts', { count: whole }))}">${glyph(whole > 0 ? 'heart' : 'heart-empty', 'hg')}<b>${whole}</b><i class="hbar"><i style="width:${part}%"></i></i>${label ? `<small>${t('{count} hearts', { count: whole })}</small>` : ''}</span>`;
}
const giftedToday = (s, id, now) => s.people?.[id]?.giftDay === dayKey(now);
/** Today's wish of one household, as a line with the decoration's icon and a Build button. */
export function wishLine(s, home) {
  const w = s.wishes?.list?.find(x => x.home === home); if (!w) return '';
  const item = t(BUILDINGS[w.kind]?.name ?? w.kind), text = w.text ? t(w.text) : t(WISH_FALLBACK, { item });
  return `<div class="wish ${w.done ? 'done' : ''}">${faceHtml(w.person)}<div><b>${nameOf(w.person)}</b><p>“${esc(text)}”</p></div>
    ${w.done ? `<span class="done">${glyph('check', 'g')} ${t('Wish granted')}</span>` : `<button class="btn orange" data-do="wishBuild" data-kind="${w.kind}">${iconHtml(w.kind, '', 'mini')} ${t('Build')}</button>`}</div>`;
}
/** A family's members with their hearts and a gift button (the cottage panel). */
export function familyRows(s, fam, now, arrived) {
  return `<div class="family">${fam.people.map(p => `<div class="person">${faceHtml(p.id)}<b>${t(p.name)}</b><small>${t(p.role)}</small>${arrived ? heartBar(s, p.id) : ''}
    ${arrived ? `<button class="btn small" data-do="gift" data-person="${p.id}" ${giftedToday(s, p.id, now) ? 'disabled' : ''}>${glyph('gift', 'g')} ${giftedToday(s, p.id, now) ? t('Given today') : t('Gift')}</button>` : ''}</div>`).join('')}</div>`;
}
/** Everyone who can receive a gift: villagers in the village and the families who have moved in. */
export function renderFriends(s, now) {
  const list = giftable(s, now);
  if (!list.length) return `<p class="empty">${t('Your neighbours will appear here as Hollowbrook fills up.')}</p>`;
  return `<p class="hint">${t('One gift a day each. A gift they love counts four times.')}</p><div class="friends">${list.map(id => {
    const p = PEOPLE[id], given = giftedToday(s, id, now), likes = (p?.likes ?? []).filter(g => GOODS[g]);
    return `<div class="friend">${faceHtml(id)}<div class="who"><b>${nameOf(id)}</b><small>${t(p?.role ?? '')}</small>${heartBar(s, id)}</div>
      <div class="likes">${likes.map(g => goodIcon(g, 'mini')).join('')}</div>
      <button class="btn small" data-do="gift" data-person="${id}" ${given ? 'disabled' : ''}>${glyph('gift', 'g')} ${given ? t('Given today') : t('Gift')}</button></div>`;
  }).join('')}</div>`;
}
/** Choose a good from the barn to give to a person; the ones they love come first, with a heart. */
export function renderGift(s, person, now) {
  const p = PEOPLE[person], likes = new Set(p?.likes ?? []);
  const goods = Object.entries(s.barn.items).filter(([g, n]) => n > 0 && GOODS[g] && barn.free(s, g) > 0).sort((a, b) => (likes.has(b[0]) - likes.has(a[0])) || GOODS[a[0]].value - GOODS[b[0]].value);
  return `<div class="gift-for">${faceHtml(person)}<div><b>${nameOf(person)}</b>${heartBar(s, person)}</div></div>
    ${giftedToday(s, person, now) ? `<p class="hint">${t('One gift a day is plenty')}</p>` : ''}
    <div class="goods-grid">${goods.map(([g, n]) => `<button class="good-tile ${likes.has(g) ? 'liked' : ''}" data-do="giveGood" data-person="${person}" data-good="${g}" ${giftedToday(s, person, now) ? 'disabled' : ''}>${goodIcon(g)}<b>${num(n)}</b><small>${t(GOODS[g].name)}</small>${likes.has(g) ? glyph('heart', 'love') : ''}</button>`).join('') || `<p class="empty">${t('The barn is empty.')}</p>`}</div>`;
}
/** Readable new mail first, so a legacy mailbox leads into a clue chain in the right order. */
export function renderMail(s, now) {
  const rent = rentWaiting(s, now), rank = m => m.read ? 2 : letterPrerequisite(s, m.id) ? 1 : 0;
  const mail = [...s.mail ?? []].sort((a, b) => rank(a) - rank(b));
  const when = at => new Date(at).toLocaleDateString(getLanguage() === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'short' });
  return `${rent ? `<div class="rent-row">${glyph('mail', 'g big')}<div><b>${t('Rent from your cottages')}</b><small>${coinMark()} ${num(rent)}</small></div><button class="btn primary" data-do="collectRent">${t('Collect')}</button></div>` : ''}
    <div class="letters">${mail.map(m => `<button class="letter-row ${m.read ? '' : 'new'}" data-do="readLetter" data-id="${m.id}">${faceHtml(m.from)}<span class="lr-text"><b>${t('From {name}', { name: nameOf(m.from) })}</b><small>${!m.read && letterPrerequisite(s, m.id) ? t('Read the earlier letter first') : when(m.at)}</small></span>${m.read ? '' : `<i class="badge">${t('New')}</i>`}</button>`).join('')
      || `<p class="empty">${t('No letters yet. Ada says the post is slow up here.')}</p>`}</div>`;
}
export const unreadCount = unread;

// ── Story cards ──
const lines = list => list.map(l => `<div class="speak">${faceHtml(l.who)}<div><b>${nameOf(l.who)}</b><p>${esc(t(l.text))}</p></div></div>`).join('');
const rewardTile = r => {
  if (!r) return '';
  const parts = [];
  if (r.coins) parts.push(`${coinMark()} <b>${num(r.coins)}</b>`);
  if (r.decor) parts.push(`${iconHtml(r.decor, '', 'mini')} <b>${t(BUILDINGS[r.decor]?.name ?? r.decor)}</b>`);
  if (r.recipe) parts.push(`${goodIcon(r.recipe, 'mini')} <b>${t('Recipe: {name}', { name: t(RECIPES[r.recipe]?.name ?? r.recipe) })}</b>`);
  for (const [g, n] of Object.entries(r.goods ?? {})) parts.push(`${goodIcon(g, 'mini')} <b>×${n}</b>`);
  return parts.length ? `<div class="reward-tile">${glyph('gift', 'g')}<span>${parts.join(' ')}</span></div>` : '';
};
/** A heart scene (3, 6 or 9 hearts): the three lines from the story and what it gave. */
export function showHeartScene(e) {
  const scene = sceneFor(e.person, e.at);
  const said = (Number.isInteger(e.variant) ? scene?.variants?.[e.variant]?.lines : null)
    ?? scene?.lines ?? [{ who: e.person, text: PEOPLE[e.person]?.line ?? '' }];
  showModal(`<div class="story-card heart-scene"><div class="story-head">${faceHtml(e.person, 'portrait')}<div><small>${t('Heart scene')}</small><h2>${nameOf(e.person)}</h2>
    <span class="heart-row">${Array.from({ length: 10 }, (_, i) => glyph(i < e.at ? 'heart' : 'heart-empty', 'hg')).join('')}</span></div></div>
    ${lines(said)}${rewardTile(e.reward)}<button class="btn primary" data-close>${t('Continue')}</button></div>`, { modal: true, onOpen: () => sfx('page') });
}
/** A family moves in: their portrait and their first three lines (content/hearts.mjs ARRIVALS). */
export function showArrival(familyId) {
  const fam = FAMILIES.find(f => f.id === familyId); if (!fam) return;
  const said = ARRIVALS[familyId] ?? fam.people.map(p => ({ who: p.id, text: p.line }));
  showModal(`<div class="story-card arrival"><div class="portrait-wide">${iconHtml(`family:${familyId}`, '', 'family-art')}</div><small>${t('A new family')}</small>
    <h2>${t('{family} moved in!', { family: t(fam.name) })}</h2>${lines(said)}
    <button class="btn primary" data-close>${t('Welcome!')}</button></div>`, { modal: true, onOpen: () => sfx('page') });
}
/** A short story moment between chapters (content/story.mjs BEATS). */
export function showBeat(beat, onClose) {
  showModal(`<div class="story-card beat"><small>${t('Meanwhile in {village}', { village: t('Hollowbrook') })}</small>${lines(beat.lines)}
    <button class="btn primary" data-close>${t('Continue')}</button></div>`, { modal: true, onClose, onOpen: () => sfx('page') });
}
/** Open a letter (marks it read through the rules, which may give its gift). */
export function showLetter(game, id) {
  const l = letterOf(id), m = (game.s.mail ?? []).find(x => x.id === id); if (!l || !m) return;
  const r = game.do('readLetter', { id });
  if (!r.ok) return;
  sfx('page');
  showModal(`<div class="story-card letter"><div class="story-head">${faceHtml(m.from, 'portrait')}<div><small>${t('A letter')}</small><h2>${t('From {name}', { name: nameOf(m.from) })}</h2></div></div>
    <div class="paper"><p>${esc(t(l.text))}</p></div>${r.ok ? rewardTile(r.reward) : ''}<button class="btn primary" data-close>${t('Close')}</button></div>`);
}

/** Listens for bond events: heart scenes and arrivals as cards, letters, gifts and granted wishes as short messages. */
export class Bonds {
  constructor({ game, hud }) {
    Object.assign(this, { game, hud });
    game.on(r => {
      for (const e of r.events ?? []) {
        if (e.type === 'heartScene') showHeartScene(e);
        else if (e.type === 'familyArrived') showArrival(e.family);
        else if (e.type === 'letter') hud.toast(t('A letter from {name} is in the mailbox', { name: nameOf(e.from) }), 'info', { icon: 'mail' });
        else if (e.type === 'gifted') hud.toast(e.liked ? t('{name} loves it!', { name: nameOf(e.person) }) : t('{name} says thank you', { name: nameOf(e.person) }), 'good', { icon: 'heart' });
        else if (e.type === 'wishGranted') hud.toast(t('Wish granted: {name} is delighted', { name: nameOf(e.person) }), 'good', { icon: 'charm' });
      }
    });
  }
}
export { residents };
