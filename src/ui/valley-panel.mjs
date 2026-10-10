// The Valley panel (core/valley.mjs, chapter 11): how beautiful the valley is, part by part, what that pays, and what
// would raise it most. Opened from the Roadmap, from Friends, or by a tap on the brook meadow.
import { t, num } from '../kit/i18n.mjs';
import { BEAUTY } from '../content/economy.mjs';
import { beautyOf, beautyTip, albrightOffer, RANK_NAMES } from '../core/valley.mjs';
import { coinMark, glyph, iconHtml } from './icon.mjs';

const PARTS = { trees: ['Trees and orchards', 'round_tree'], flowers: ['Flowers and gardens', 'flowers'], water: ['Ponds and the brook', 'pond'],
  meadow: ['The brook meadow and its bees', 'beehive'], care: ['Things in need of mending', 'tool:demolish'], industry: ['Smoke and noise', 'cannery'] };
const TIPS = {
  care: 'Mend what is worn. A broken thing spoils the view.',
  green: 'Make the cannery a green one: trees round its walls and a filter on the chimney.',
  trees: 'Plant trees. Every tree and every fruit tree counts.',
  flowers: 'Set out flowers and pretty things. Each one counts.',
  water: 'Dig a pond, build the boat dock, open up the brook.',
};
export function renderValley(s) {
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
