// The big picture (core/insight.mjs): three pages in one panel. Where the farm stands (what went well, seven score bars,
// the strongest side and the next one to grow, what pays best to make now), the product map (what is made from what; tap
// a good to light its whole chain) and growth (what each level brought). Always kind: it opens with what went well.
import { productMap, chainOf, scores, bestMakes, bestCrops, growth, trend, praise, makes } from '../core/insight.mjs';
import { GOODS, RECIPES, CROPS, FRUITS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { t, num } from '../kit/i18n.mjs';
import { goodIcon, iconHtml, coinMark } from './icon.mjs';

const nameOf = id => t((GOODS[id] ?? RECIPES[id] ?? CROPS[id] ?? FRUITS[id])?.name ?? id);
const placeOf = at => at === 'bed' ? t('Garden bed') : t(BUILDINGS[at]?.name ?? at);
const valueOf = id => (GOODS[id] ?? RECIPES[id] ?? CROPS[id] ?? FRUITS[id])?.value ?? 0;
const tabs = on => `<div class="tabs insight-tabs">${[['', 'Where we stand'], ['map', 'Product map'], ['growth', 'Growth']].map(([id, name]) =>
  `<button class="tab${on === id ? ' on' : ''}" data-do="insight" data-arg="${id}">${t(name)}</button>`).join('')}</div>`;

function overview(s, now) {
  const list = scores(s, now), ranked = [...list].sort((a, b) => b.score - a.score), best = ranked[0], next = ranked.at(-1), total = Math.round(list.reduce((n, x) => n + x.score, 0) / list.length);
  const bars = list.map(x => `<div class="insight-row" data-score="${x.id}"><b>${t(x.name)}</b><div class="insight-bar ${x.score >= 70 ? 'high' : x.score >= 40 ? 'mid' : 'low'}"><i style="width:${Math.max(4, x.score)}%"></i><span>${x.score}</span></div><small>${t(x.text, x.params)}</small></div>`).join('');
  const make = bestMakes(s, 3, now).map(m => `<li>${goodIcon(m.id, 'mini')} <b>${nameOf(m.id)}</b> <span>${t('+{gain} coins a batch, {rate} a minute', { gain: num(m.gain), rate: num(m.perMin) })}</span>${m.ready ? '' : `<small>${t(m.reason, { place: placeOf(m.at) })}</small>`}</li>`).join('');
  const crops = bestCrops(s).map(c => `${goodIcon(c.id, 'mini')} ${nameOf(c.id)}`).join(' · ');
  return `<section class="insight-praise">${iconHtml('ui:heart', '', 'mini')}<div><b>${t('What you have done')}</b>${praise(s, now).map(([text, p]) => `<p>${t(text, Object.fromEntries(Object.entries(p).map(([k, v]) => [k, num(v)])))}</p>`).join('')}</div></section>
    <h3>${t('Where the farm stands')} <span class="insight-total">${total}/100</span></h3>${bars}
    <section class="insight-next"><p><b>${t('Your strongest side')}:</b> ${t(best.name)}. ${t('Well done. That side of the farm runs like a clock.')}</p>
      ${next.score < 100 ? `<p><b>${t('The next thing to grow')}:</b> ${t(next.name)}. ${t(next.tip)}</p>` : `<p>${t('Every side of the farm is full. There is nothing here to put right, only more to dream up.')}</p>`}</section>
    ${make ? `<h3>${t('What pays best to make now')}</h3><p class="hint">${t('Estimates use base prices and your upgrades. Allow time for ingredients; sale bonuses and wages can change the result.')}</p><ul class="insight-makes">${make}</ul>` : ''}
    ${crops ? `<p class="hint">${t('Best crops for a bed at your level')}: ${crops}</p>` : ''}
    <p class="insight-cheer">${t('Whatever the bars say, the valley is better for every day you spend in it.')}</p>`;
}
function map(s, focus) {
  const m = productMap(s), W = 76, H = 70, rows = Math.max(1, ...m.cols.map(c => c.length)), at = {}, lit = focus && Object.hasOwn(makes(), focus) ? chainOf(m, focus) : null;
  m.cols.forEach((col, c) => col.forEach((g, r) => { at[g.id] = [c * W, r * H]; }));
  const lines = m.edges.map(([a, b]) => { const [x1, y1] = at[a], [x2, y2] = at[b], on = lit?.has(a) && lit?.has(b); return `<path class="${on ? 'on' : lit ? 'off' : ''}" d="M${x1 + 58} ${y1 + 26} C${x1 + 76} ${y1 + 26} ${x2 - 14} ${y2 + 26} ${x2 + 4} ${y2 + 26}"/>`; }).join('');
  const nodes = m.cols.flat().map(g => `<button class="insight-node${g.open ? g.ready ? ' ready' : ' open' : ' later'}${lit ? lit.has(g.id) ? ' lit' : ' dim' : ''}${focus === g.id ? ' focus' : ''}" style="left:${at[g.id][0]}px;top:${at[g.id][1]}px" data-do="insight" data-arg="map:${g.id}" title="${nameOf(g.id)}">${goodIcon(g.id, 'mini')}<small>${g.open ? nameOf(g.id) : g.level > (s.level ?? 1) ? t('Level {level}', { level: g.level }) : t('Needs a technique')}</small></button>`).join('');
  const info = focus && Object.hasOwn(makes(), focus) ? (() => {
    const g = makes()[focus], from = g.from.map(nameOf).join(' + ');
    return `<p class="insight-info">${goodIcon(focus, 'mini')} <b>${nameOf(focus)}:</b> ${from ? t('made at the {place} from {from}', { place: placeOf(g.at), from }) : t('grown at the {place}', { place: placeOf(g.at) })} · ${coinMark()} ${num(valueOf(focus))}${g.level > s.level ? ` · ${t('Level {level}', { level: g.level })}` : ''}</p>`;
  })() : `<p class="hint">${t('Left to right: what you grow, what you make from it, and what you make from that. Tap a good to light its whole chain.')}</p>`;
  return `${info}<div class="insight-map-wrap"><div class="insight-map" style="width:${m.cols.length * W}px;height:${rows * H}px"><svg width="${m.cols.length * W}" height="${rows * H}" aria-hidden="true">${lines}</svg>${nodes}</div></div>
    <p class="insight-legend"><i class="ready"></i>${t('You can make it')} <i class="open"></i>${t('Needs a source or repair')} <i class="later"></i>${t('Needs a level or technique')}</p>`;
}
function growthPage(s) {
  const g = growth(s), tr = trend(s);
  if (!g.length) return `<p class="hint">${t('Your growth chart begins at your next level. Every level from then on leaves a mark here.')}</p><p class="insight-cheer">${t('You have already come this far. That part does not need a chart.')}</p>`;
  const top = Math.max(1, ...g.map(x => x.coins));
  const bars = g.map(x => `<div class="insight-col" title="${t('Level {level}', { level: x.level })}"><span>${num(x.coins)}</span><i style="height:${Math.max(4, Math.round(100 * x.coins / top))}%"></i><b>${x.level}</b></div>`).join('');
  const say = !tr ? t('A few more levels and the chart will show which way the farm is heading.')
    : tr.dir === 'up' ? t('Your earnings are climbing: about {n} coins an hour over the last levels. Whatever you changed, keep doing it.', { n: num(tr.perHour) })
      : tr.dir === 'down' ? t('The last levels came slower: about {n} coins an hour. That is what a bigger farm feels like. The product map shows where more value hides.', { n: num(tr.perHour) })
        : t('A steady farm: about {n} coins an hour, level after level. Steady is how villages are built.', { n: num(tr.perHour) });
  const rows = g.slice(-6).reverse().map(x => `<tr><td>${x.level}</td><td>${num(x.coins)}</td><td>${num(x.made)}</td><td>${num(x.orders)}</td><td>${num(x.minutes)}</td></tr>`).join('');
  return `<h3>${t('Coins earned during each level')}</h3><div class="insight-chart">${bars}</div><p class="insight-next">${say}</p>
    <table class="insight-table"><tr><th>${t('Level')}</th><th>${t('Coins')}</th><th>${t('Things made')}</th><th>${t('Orders')}</th><th>${t('Minutes')}</th></tr>${rows}</table>`;
}
/** arg: '' (where we stand), 'map', 'map:<good>' or 'growth'. */
export function renderInsight(s, now, arg = '') {
  const [page, focus] = String(arg ?? '').split(':');
  return tabs(page === 'map' || page === 'growth' ? page : '') + (page === 'map' ? map(s, focus) : page === 'growth' ? growthPage(s) : overview(s, now));
}
