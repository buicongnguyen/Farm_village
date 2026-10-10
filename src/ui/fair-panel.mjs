// The valley fair's panel (core/fair.mjs, chapter 18). Before a fair: the three classes, each with its judge, what the
// judge has a soft spot for and what the barn can enter (a tap chooses; stars hint at the score, never the number), the
// prizes, the fee and one button. While it runs: the judging, one class after another, each with the judge's verdict,
// the four entries in order and the ribbon. Afterwards the last fair's results stay below the next one's entries.
// Opened from the ribbon board on the village square, Village projects, the Roadmap or its pill in the top bar.
import { t, tParams, num } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { FAIR } from '../content/economy.mjs';
import { fairOf } from '../core/fair.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, faceHtml, glyph, goodIcon, iconHtml } from './icon.mjs';
import { nameOf } from './bonds-panels.mjs';

const CLASS = { field: ['Field', 'a crop or a fruit'], kitchen: ['Kitchen', 'something made'], pond: ['Pond', 'a fish'] };
const MEDAL = { gold: 'Gold ribbon', silver: 'Silver ribbon', bronze: 'Bronze ribbon' };
/** How long each class's judging takes on the panel before its result shows (the fair itself runs on in the world). */
export const JUDGING_MS = 1600;
// What each judge says of the farm's entry, by its ribbon (none: fourth place). Not t() literals: every line is in the
// language packs by hand.
export const VERDICTS = {
  grace: { gold: 'I have looked at a great many of these today. This is the one I would take home.', silver: 'Lovely and sound. One more row of sun and it would have had the gold.',
    bronze: 'A good honest entry. Grow a field more of it and bring it back.', none: 'Nothing wrong with it at all. The other valleys have simply been at it longer.' },
  lan: { gold: 'I closed my eyes and I was seven years old in my grandmother’s kitchen. Gold.', silver: 'Very good. A little more practice and nobody will come near it.',
    bronze: 'It tastes of a busy week. Make it a hundred times more and I will know it blind.', none: 'It is good food. Today somebody else’s was better, and that is all.' },
  olaf: { gold: 'Measured twice, and once more for the pleasure of it. The finest fish on the table.', silver: 'A handsome fish. Beaten by a thumb’s width, and I checked the thumb.',
    bronze: 'A fair fish, fairly caught. The brook has bigger, if you ask it nicely.', none: 'Every fish is a good fish. This one met three better ones.' },
};
const stars = n => `<span class="stars" aria-label="${t('{n} of 5 stars', { n })}">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
function classCard(c, best) {
  const [name, what] = CLASS[c.id];
  const options = c.options.slice(0, 8).map(o => `<button class="slot${o.good === c.entry ? ' on' : ''}" data-do="chooseEntry" data-cls="${c.id}" data-good="${o.good}" aria-pressed="${o.good === c.entry}" title="${t(GOODS[o.good].name)}">${goodIcon(o.good)}${stars(o.stars)}</button>`).join('');
  return `<section class="fair-class" data-cls="${c.id}">
    <div class="fair-head">${faceHtml(c.judge, 'mini-face')}<div><b>${t(name)}</b><small>${t('{name} judges', { name: nameOf(c.judge) })} · ${t('a soft spot for')} ${c.likes.map(g => goodIcon(g)).join('')}</small></div>${best ? iconHtml(`ribbon_${best}`, '', 'fair-ribbon') : ''}</div>
    ${options ? `<div class="fair-options">${options}</div>` : `<p class="hint">${glyph('lock', 'g')} ${t('Nothing to enter yet: it takes {each} of {what}', { each: FAIR.each, what: t(what) })}</p>`}
  </section>`;
}
function result(c, r, shown) {
  const head = `${faceHtml(c.judge, 'mini-face')}<div><b>${t(CLASS[c.id][0])} · ${t(GOODS[r.good].name)}</b>`;
  if (!shown) return `<section class="fair-result judging" data-cls="${c.id}"><div class="fair-head">${head}<small>${t('{name} is judging…', { name: nameOf(c.judge) })}</small></div>${goodIcon(r.good)}</div></section>`;
  const rows = [{ name: t('Hollowbrook'), score: r.score, ours: true }, ...FAIR.valleys.map((v, k) => ({ name: t(v), score: r.rivals[k] }))].sort((a, b) => b.score - a.score || (a.ours ? -1 : b.ours ? 1 : 0));
  const top = Math.max(1, ...rows.map(x => x.score));
  return `<section class="fair-result ${r.medal ?? 'none'}" data-cls="${c.id}" data-place="${r.place}">
    <div class="fair-head">${head}<small>${r.medal ? t(MEDAL[r.medal]) : t('No ribbon this time')}</small></div>${r.medal ? iconHtml(`ribbon_${r.medal}`, '', 'fair-ribbon') : goodIcon(r.good)}</div>
    <p class="verdict"><b>${nameOf(c.judge)}:</b> “${t(VERDICTS[c.judge][r.medal ?? 'none'])}”</p>
    <ol class="fair-places">${rows.map(x => `<li class="${x.ours ? 'ours' : ''}"><span>${x.name}</span><i class="progress"><i style="width:${Math.round(x.score / top * 100)}%"></i></i></li>`).join('')}</ol>
  </section>`;
}
export function renderFair(s, now) {
  const f = fairOf(s, now);
  if (!f.open) return `<div class="fair"><p>${t('Three valleys used to bring their best to this square. It takes a company of the whole valley to hold a fair again.')}</p>
    <button class="btn primary wide" data-do="valleyValue">${iconHtml('company', '', 'mini')} ${t('The valley company')}</button></div>`;
  const judged = f.last ? f.classes.filter(c => f.last.results[c.id]) : [];
  const results = live => judged.map((c, i) => result(c, f.last.results[c.id], !live || now - f.at >= (i + 1) * JUDGING_MS)).join('');
  if (f.active) return `<div class="fair on"><div class="festival-on">${iconHtml('ribbon_board', '', 'tile-icon')}<div><b>${t('The fair is on')}</b><p>${glyph('clock', 'g')} ${shortTime(Math.max(0, f.until - now))}</p></div></div>
    ${results(true)}<p class="hint">${t('Three valleys are on the square. Go and look!')}</p></div>`;
  const resting = now < f.readyAt;
  return `<div class="fair">
    <p>${t('Enter your best in three classes. The more of a thing you have grown, made or caught, the better you know it; and every judge has a soft spot.')}</p>
    ${f.classes.map(c => classCard(c, f.best[c.id])).join('')}
    <p class="feast-gives fair-prizes">${iconHtml('ribbon_gold', '', 'mini')} ${coinMark()} <b>${num(FAIR.prizes.gold)}</b> ${iconHtml('ribbon_silver', '', 'mini')} <b>${num(FAIR.prizes.silver)}</b> ${iconHtml('ribbon_bronze', '', 'mini')} <b>${num(FAIR.prizes.bronze)}</b></p>
    ${resting ? `<p class="hint">${glyph('clock', 'g')} ${t('The three valleys are resting after the last fair')} · ${shortTime(f.readyAt - now)}</p>` : f.reason ? `<p class="hint">${glyph('lock', 'g')} ${t(f.reason, tParams(f.params))}</p>` : ''}
    <button class="btn primary wide" data-do="holdFair" ${f.ok ? '' : 'disabled'}>${t('Open the fair')} · ${coinMark()} ${num(f.fee)}</button>
    ${f.held ? `<h3>${t('The last fair')}</h3>${results(false)}<p class="hint">${iconHtml('ribbon_gold', '', 'mini')} ${t('Ribbons won: {count}', { count: f.ribbons })}</p>` : ''}
  </div>`;
}
