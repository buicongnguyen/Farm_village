import { t, num } from '../kit/i18n.mjs';
import { SHOPS } from '../content/shops.mjs';
import { GOODS } from '../content/goods.mjs';
import { shopStatus } from '../core/shops.mjs';
import { shortTime } from '../core/clock.mjs';
import { iconHtml, goodIcon, coinMark } from './icon.mjs';
import { goodHelpButton } from './good-help-panel.mjs';
export const shopsEntry = s => s.level >= 2 ? `<button class="btn ghost wide" data-do="shops">${iconHtml('stall', '', 'mini')} ${t('Village shops')}</button>` : '';
export function renderShops(s, now, selected) {
  const ids = Object.keys(SHOPS).sort((a, b) => Number(b === selected) - Number(a === selected));
  return `<p class="hint">${t('Each shop buys one small basket at a premium. Requests never expire; nothing is reserved or sold automatically.')}</p>` + ids.map(id => {
    const st = shopStatus(s, id, now), o = st.offer;
    return `<section class="shop-card" data-shop="${id}"><b>${t(st.name)}</b><p class="hint">${t(st.line)}</p>
      ${st.locked ? `<p>${t('Reach level {level} first', { level: st.level })}</p>` : o ? `<div class="shop-offer">${goodIcon(o.good)}<span>${t(GOODS[o.good].name)} · ${num(st.have)}/${o.n}<br>${coinMark()} ${num(st.coins)} <small>${t('Base value: {coins}', { coins: num(st.base) })}</small></span></div>
      ${goodHelpButton(o.good, o.n)}<button class="btn primary wide" data-do="sellToShop" data-shop="${id}" data-offer="${o.id}" ${st.canSell ? '' : 'disabled'}>${t('Sell basket')} · ${coinMark()} ${num(st.coins)}</button>
      <button class="btn ghost wide" data-do="changeShopRequest" data-shop="${id}" data-offer="${o.id}">${t('Ask for another request (free, 5 min)')}</button>` : `<p class="hint">${st.left ? t('Next request in {time}', { time: shortTime(st.left) }) : t('Grow or collect something this shop can buy. Its request will appear here.')}</p>`}
      <button class="link" data-do="shopVisit" data-shop="${id}">${t('Visit this shop')} ›</button></section>`;
  }).join('');
}
