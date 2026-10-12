// Loaded with panel-renderers; no shop actions or dialogue on the first frame.
import { t, num } from '../kit/i18n.mjs';
import { SUPERMARKET, SHOP_SECTIONS } from '../content/supermarket.mjs';
import { SHOP_MEMORIES } from '../content/supermarket-story.mjs';
import { supermarketStatus, installSupermarket } from '../core/supermarket.mjs';
import { normalizeSupermarket, unreadSupermarket } from '../core/supermarket-state.mjs';
import { GOODS } from '../content/goods.mjs';
import { allPeople } from '../content/people.mjs';
import { shortTime } from '../core/clock.mjs';
import { goodIcon, iconHtml, coinMark, faceHtml } from './icon.mjs';
import { goodHelpButton } from './good-help-panel.mjs';
installSupermarket();
const people = Object.fromEntries(allPeople().map(p => [p.id, p.name]));
const say = line => `<div class="shop-dialogue">${faceHtml(line.who, 'shop-portrait')}<div><b>${t(people[line.who])}</b><p>${t(line.text)}</p></div></div>`;
const button = (action, text, data = '', disabled = false, style = 'primary') => `<button class="btn ${style} wide" data-do="${action}" ${data} ${disabled ? 'disabled' : ''}>${text}</button>`;
export function supermarketEntry(s) {
  const count = unreadSupermarket(s), st = normalizeSupermarket(s);
  return s.level >= 12 || st.request || st.introducedAt !== null ? button('supermarket', `${iconHtml('supermarket', '', 'mini')} ${t('Village supermarket')}${count ? ` <span class="badge shop-count">${count}</span>` : ''}`, '', false, 'ghost') : '';
}
export function renderSupermarket(s, now) {
  const st = supermarketStatus(s, now), r = st.request;
  let body = say(st.hint);
  const existing = Object.keys(s.placed).find(id => s.placed[id].kind === 'supermarket');
  if (!st.open && existing) body += `<p>${t('Build or repair the village supermarket first')}</p>` + button('goRepair', t('Show me'), 'data-kind="supermarket"', false, 'go');
  else if (!st.open) body += `<p>${t(st.reason ?? 'Build or repair the village supermarket first')}</p>` + button('shopBuild', `${t('Village supermarket')} · ${coinMark()} ${num(SUPERMARKET.cost)}`, '', !!st.reason, 'go');
  else if (st.introducedAt === null) body += `<p>${t('An optional village shop. Restore a shelf, choose a basket, and share your harvest at a 25% premium. No deadlines or energy costs.')}</p>` + button('introduceSupermarket', t('Plan our village shop'));
  else {
    body += `<p class="hint">${t('Accepting a basket reserves its goods. Other requests keep their share too. Release the basket whenever you like; the next one waits 30 minutes.')}</p>`;
    body += Object.entries(SHOP_SECTIONS).map(([id, section]) => `<section class="shop-card" data-section="${id}"><div><b>${t(section.name)}</b>${st.sections[id]?.suppliedAt != null ? `<span class="badge ready">✓</span>` : ''}</div>${st.sections[id] ? (!r && !st.left ? button('prepareShopBasket', t('Choose a basket'), `data-section="${id}"`, !st.sectionsAvailable.includes(id)) : '') : button('restoreShopSection', `${t('Restore this shelf')} · ${coinMark()} ${num(SUPERMARKET.sectionCost)}`, `data-section="${id}"`, s.coins < SUPERMARKET.sectionCost || !st.sectionsAvailable.includes(id))}${!st.sectionsAvailable.includes(id) ? `<p class="hint">${t('Set up a source for this shelf first')}</p>` : ''}</section>`).join('');
  }
  if (r) {
    body += `<section class="shop-card" data-shop-request="${r.id}"><h3>${t(SHOP_SECTIONS[r.section].name)}</h3><p>${r.accepted ? t('This basket is reserved for the neighbours.') : t('Preview this basket. Nothing is reserved until you accept.')}</p>`;
    body += st.rows.map(row => `<div class="set-row req ${row.have >= row.n ? 'ok' : 'short'}"><span class="token ${row.have >= row.n ? 'ok' : 'short'}">${goodIcon(row.good, 'mini')}</span><span>${t(GOODS[row.good].name)} · ${num(row.have)}/${row.n}</span></div>${row.reserved ? `<p class="hint">${t('{n} kept for other requests', { n: num(row.reserved) })}</p>` : ''}${goodHelpButton(row.good, row.n).replace('data-do="goodHelp"', `data-do="goodHelp" data-shop-request="${r.id}"`)}`).join('');
    body += `<p>${t('Basket payment')} · ${coinMark()} ${num(r.payment)}</p>`;
    body += r.accepted ? button('deliverShopBasket', `${t('Deliver basket')} · ${coinMark()} ${num(r.payment)}`, `data-request="${r.id}"`, !st.canDeliver) : button('acceptShopBasket', t('Accept and reserve goods'), `data-request="${r.id}"`, !st.open);
    body += button('cancelShopBasket', t('Release basket (next in 30 min)'), `data-request="${r.id}"`, false, 'ghost') + '</section>';
  } else if (st.left) body += `<p class="hint">${t('Next request in {time}', { time: shortTime(st.left) })}</p>`;
  if (st.open && st.supplied === 3 && st.memories.thankyou == null) body += button('discoverShopCard', t('Look behind the shelf'));
  body += Object.entries(SHOP_MEMORIES).filter(([id]) => st.memories[id] != null).map(([id, memory]) => button('shopMemory', `${t(memory.name)}${st.read.includes(id) ? '' : ' •'}`, `data-id="${id}"`, false, 'ghost')).join('');
  return body;
}
export function renderShopMemory(s, id) {
  const st = normalizeSupermarket(s), memory = Object.hasOwn(SHOP_MEMORIES, id) && st.memories[id] != null ? SHOP_MEMORIES[id] : null;
  return memory ? `<h3>${t(memory.name)}</h3>${say(memory)}${button('supermarket', t('Village supermarket'), '', false, 'go')}` : `<p>${t('That shop memory is not in the album yet')}</p>`;
}
