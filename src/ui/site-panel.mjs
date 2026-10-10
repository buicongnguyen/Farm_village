// A fixed site's panel (core/sites.mjs): what the story builds there, what it takes as a short checklist, and one
// button that builds it. Opened from Village projects, the roadmap, or a tap on the site's sign in the world.
import { t, tParams, num } from '../kit/i18n.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { sitePlan, siteBuilt } from '../core/sites.mjs';
import { coinMark, glyph, iconHtml } from './icon.mjs';
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** What each site is for, in one line. */
const ABOUT = { dock: 'A deck and a pier on the brook. The rare fish bite here twice as often as at a pond.',
  stage: 'A new stage for the village square, where the old one burned. The Harvest Festival is held from it.' };
export function renderSite(s, kind) {
  const def = BUILDINGS[kind]; if (!def?.site) return '';
  if (siteBuilt(s, kind)) return `<p>${t(ABOUT[kind] ?? '')}</p><p class="hint">${t('It is already built')}</p>`;
  const plan = sitePlan(s, kind), price = plan.price ?? def.cost ?? 0;
  const other = !plan.ok && !plan.reason?.startsWith('Reach level') && plan.reason !== 'Not enough coins' ? plan : null;
  const reqs = [[s.level >= def.level, t('Reach level {level}', { level: def.level })], [s.coins >= price, `${coinMark()} ${num(price)}`, t('Not enough coins')], ...(other ? [[false, t(other.reason, tParams(other.params))]] : [])];
  const missing = reqs.find(r => !r[0]);
  return `<div class="site-top">${iconHtml(kind, '', 'tile-icon')}<p>${t(ABOUT[kind] ?? '')}</p></div>
    ${reqs.map(([ok, text]) => `<div class="req ${ok ? 'ok' : ''}">${glyph(ok ? 'check' : 'lock', 'g')} ${text}</div>`).join('')}
    <button class="btn primary wide${missing ? ' blocked' : ''}" data-do="siteBuild" data-kind="${kind}" ${missing ? `data-why="${esc((missing[2] ?? missing[1]).replace(/<[^>]*>/g, '').trim())}"` : ''}>${t('Build')} · ${coinMark()} ${num(price)}</button>`;
}
