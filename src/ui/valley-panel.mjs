// The Valley panel (core/valley.mjs). Two pages: "Beauty" (chapter 11): how beautiful the valley is, part by part, what
// that pays and what would raise it most; and "Value" (chapter 17): the valley company, what the valley is worth and of
// what, its goodwill, the dividend, and who holds a share. Opened from the Roadmap, Village projects, the valley's
// value in the top bar or a tap on the brook meadow.
import { t, num, short } from '../kit/i18n.mjs';
import { BEAUTY } from '../content/economy.mjs';
import { beautyOf, beautyTip, albrightOffer, RANK_NAMES, assetsOf, deedsOf, goodwillOf, valueOf, titleOf, companyPlan, dividendOf, shareholders } from '../core/valley.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, faceHtml, glyph, iconHtml } from './icon.mjs';

const PARTS = { trees: ['Trees and orchards', 'round_tree'], flowers: ['Flowers and gardens', 'flowers'], water: ['Ponds and the brook', 'pond'],
  meadow: ['The brook meadow and its bees', 'beehive'], care: ['Things in need of mending', 'tool:demolish'], industry: ['Smoke and noise', 'cannery'] };
const TIPS = {
  care: 'Mend what is worn. A broken thing spoils the view.',
  green: 'Make the cannery a green one: trees round its walls and a filter on the chimney.',
  trees: 'Plant trees. Every tree and every fruit tree counts.',
  flowers: 'Set out flowers and pretty things. Each one counts.',
  water: 'Dig a pond, build the boat dock, open up the brook.',
};
function beautyPage(s) {
  const b = beautyOf(s), tip = beautyTip(s), next = BEAUTY.ranks[b.rank + 1], offer = albrightOffer(s);
  const hasCannery = Object.values(s.placed).some(p => p.kind === 'cannery');
  const rows = Object.entries(PARTS).filter(([k]) => b.parts[k] !== 0 || ['trees', 'flowers', 'water'].includes(k)).map(([k, [name, icon]]) => {
    const n = Math.round(b.parts[k]);
    return `<li class="${n < 0 ? 'minus' : ''}">${iconHtml(icon, '', 'mini')}<span>${t(name)}</span><b>${n > 0 ? '+' : ''}${num(n)}</b></li>`;
  }).join('');
  return `<div class="valley" data-rank="${b.rank}">
    <div class="valley-rank"><div class="valley-leaves">${RANK_NAMES.map((_, i) => `<i class="${i <= b.rank ? 'on' : ''}"></i>`).join('')}</div>
      <h3>${t(RANK_NAMES[b.rank])}</h3><p>${t('Beauty {score}', { score: num(b.score) })}${next != null ? ` · ${t('{name} at {score}', { name: t(RANK_NAMES[b.rank + 1]), score: num(next) })}` : ''}</p>
      ${next != null ? `<progress value="${b.score - BEAUTY.ranks[b.rank]}" max="${next - BEAUTY.ranks[b.rank]}"></progress>` : ''}</div>
    <p class="valley-pays">${coinMark()} ${t('Every order pays {percent}% more in a valley this beautiful', { percent: Math.round(b.rank * BEAUTY.order * 100) })}</p>
    <ul class="valley-parts">${rows}</ul>
    ${tip ? `<p class="hint">${glyph('sprout', 'g')} ${t(TIPS[tip])}</p>` : `<p class="hint">${glyph('check', 'g')} ${t('Nothing to mend, nothing to add. Sit by the brook a while.')}</p>`}
    ${offer.open ? `<button class="btn primary wide" data-do="offer">${iconHtml('person:albright', '', 'mini')} ${t('Hear the offer for the meadow')}</button>` : ''}
    ${hasCannery && !s.valley?.green ? `<button class="btn primary wide" data-do="greenCannery" ${s.coins < BEAUTY.greenCost ? 'disabled' : ''}>${iconHtml('round_tree', '', 'mini')} ${t('Make the cannery green')} · ${coinMark()}${num(BEAUTY.greenCost)}</button>` : ''}
    ${hasCannery && s.valley?.green ? `<p class="hint">${glyph('check', 'g')} ${t('The cannery is a green one: no smoke, and trees round its walls.')}</p>` : ''}
  </div>`;
}
const NEEDS = { chapter: 'Walk to where the brook begins', cooperative: 'Found the co-operative', office: 'Reopen the company office', quay: 'Build a house on the quay' };
const ASSETS = { coins: ['Coins in hand', 'ui:coin'], barn: ['Goods in the barn', 'ui:barn'], buildings: ['Everything built', 'bakery'], land: ['Land', 'sale_sign'], works: ['Works and upgrades', 'quay'],
  herd: ['The herd', 'hen'], beauty: ['The beauty of the valley', 'round_tree'] };
function founding(s) {
  const plan = companyPlan(s);
  return `<div class="site-top">${iconHtml('company', '', 'tile-icon')}<p>${t('The co-operative, the office and the quay could be one company that belongs to everyone who works in it. Every household gets a share, and the valley gets one number: what it is worth.')}</p></div>
    ${plan.needs.map(n => `<div class="req ${n.ok ? 'ok' : ''}">${glyph(n.ok ? 'check' : 'lock', 'g')} ${n.id === 'coins' ? `${coinMark()} ${num(plan.price)}` : t(NEEDS[n.id])}</div>`).join('')}
    <button class="btn primary wide" data-do="foundValley" ${plan.ok ? '' : 'disabled'}>${t('Found the valley company')} · ${coinMark()} ${num(plan.price)}</button>`;
}
function valuePage(s, now) {
  if (!s.valley?.founded) return `<div class="valley">${founding(s)}</div>`;
  const a = assetsOf(s), value = valueOf(s), { title, next } = titleOf(value), d = dividendOf(s, now), who = shareholders(s, now), top = Math.max(1, ...Object.keys(ASSETS).map(k => a[k]));
  const bars = Object.entries(ASSETS).filter(([k]) => a[k] > 0).map(([k, [name, icon]]) => `<div class="report-row">${iconHtml(icon, '', 'mini')}<span>${t(name)}</span><i class="progress"><i style="width:${Math.max(4, Math.round(a[k] / top * 100))}%"></i></i><b>${short(a[k])}</b></div>`).join('');
  const times = goodwillOf(s);
  return `<div class="valley value">
    <div class="valley-rank"><h3 class="value-big" title="${num(value)}">${coinMark()} ${short(value)}</h3>
      <p>${title ? `<b>${t(title.name)}</b>` : t('What the valley is worth')}${next ? ` · ${t('{name} at {score}', { name: t(next.name), score: short(next.at) })}` : ''}</p>
      ${next ? `<progress value="${Math.max(0, value - (title?.at ?? 0))}" max="${next.at - (title?.at ?? 0)}"></progress>` : ''}</div>
    ${bars}
    <p class="valley-pays">${t('Goodwill ×{times}: {count} deeds done together', { times: num(times, times < 100 ? 1 : 0), count: deedsOf(s) })}</p>
    <p class="hint">${t('Every market day sold on, shared order, loaded train, festival and handful of hotel guests makes the name of the valley worth more.')}</p>
    <h3>${t('The dividend')}</h3>
    <p class="feast-gives">${coinMark()} <b>${num(d.waiting)}</b> ${d.nextAt ? `· ${glyph('clock', 'g')} ${shortTime(Math.max(0, d.nextAt - now))}` : `· ${t('Collect it: no more can wait')}`}</p>
    <button class="btn primary wide" data-do="collectDividend" ${d.waiting > 0 ? '' : 'disabled'}>${t('Collect the dividend')}</button>
    <h3>${t('A share each')}</h3>
    <div class="coop-members shares">${who.people.map(id => `<span>${faceHtml(id, 'mini-face')}</span>`).join('')}</div>
    ${who.returned ? `<p class="hint">${t('And {count} families who came home to the quay.', { count: who.returned })}</p>` : ''}
  </div>`;
}
/** page: 'value' for the company's page, else the beauty page. The second page shows once chapter 16 is behind. */
export function renderValley(s, now, page = null) {
  const company = (s.story?.chapter ?? 0) >= 16 || !!s.valley?.founded, on = company && page === 'value' ? 'value' : 'beauty';
  const tabs = company ? `<div class="tabs valley-tabs"><button class="tab${on === 'beauty' ? ' on' : ''}" data-do="valley">${t('Beauty')}</button><button class="tab${on === 'value' ? ' on' : ''}" data-do="valleyValue">${t('Value')}</button></div>` : '';
  return tabs + (on === 'value' ? valuePage(s, now) : beautyPage(s));
}
