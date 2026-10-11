// The Harvest Festival's panel (core/festival.mjs, chapter 9): the feast the barn can lay, what the evening gives, and
// one button. Opened by a tap on the festival stage, or from Village projects.
import { t, tParams, num } from '../kit/i18n.mjs';
import { GOODS } from '../content/goods.mjs';
import { FESTIVAL_DAY } from '../content/economy.mjs';
import { festivalOf } from '../core/festival.mjs';
import { shortTime } from '../core/clock.mjs';
import { coinMark, glyph, goodIcon, iconHtml } from './icon.mjs';
export function renderFestival(s, now) {
  const f = festivalOf(s, now);
  if (!f.built) return `<p>${t('The festival is held from the stage on the village square.')}</p><button class="btn primary wide" data-do="site" data-kind="stage">${iconHtml('stage', '', 'mini')} ${t('The festival stage')}</button>`;
  if (f.active) return `<div class="festival-on">${iconHtml('stage', '', 'tile-icon')}<div><b>${t('The festival is on')}</b><p>${glyph('clock', 'g')} ${shortTime(Math.max(0, f.until - now))}</p></div></div>
    <p class="hint">${t('The whole village is on the square. Go and look!')}</p>`;
  const empty = Math.max(0, FESTIVAL_DAY.kinds - f.feast.length);
  const table = f.feast.map(row => `<div class="slot ready">${goodIcon(row.good)}<small>×${row.n}</small></div>`).join('') + '<div class="slot empty"></div>'.repeat(empty);
  const resting = now < f.readyAt;
  return `<p>${t('Lay a feast from your barn: {kinds} different foods, {each} of each. The whole village comes.', { kinds: FESTIVAL_DAY.kinds, each: FESTIVAL_DAY.each })}</p>
    <div class="queue feast">${table}</div>
    <p class="feast-gives">${coinMark()} <b>${num(f.coins)}</b> · ${iconHtml('ui:heart', '', 'mini')} ${t('+{n} heart with everyone', { n: FESTIVAL_DAY.hearts })}</p>
    ${resting ? `<p class="hint">${glyph('clock', 'g')} ${t('The village is resting after the last festival')} · ${shortTime(f.readyAt - now)}</p>` : f.reason ? `<p class="hint">${glyph('lock', 'g')} ${t(f.reason, tParams(f.params))}</p>` : ''}
    <button class="btn primary wide" data-do="holdFestival" ${f.ok ? '' : 'disabled'}>${t('Hold the Harvest Festival')}</button>`;
}
