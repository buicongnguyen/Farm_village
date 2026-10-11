import { t, tParams, num } from '../kit/i18n.mjs';
import { RUINS } from '../content/world.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { placementPrice, civicRebuildPlan } from '../core/build.mjs';
import { coinMark, glyph } from './icon.mjs';
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function renderCivicSite(s, kind) {
  const site = RUINS.find(r => r.kind === kind); if (!site || !BUILDINGS[kind]?.civicSite) return '';
  const def = BUILDINGS[kind], plan = civicRebuildPlan(s, kind), price = plan.price ?? placementPrice(s, kind);
  // Everything it takes, as a checklist, so a grey button is never a riddle: the level, the coins, and anything else in the way.
  const other = !plan.ok && !plan.reason?.startsWith('Reach level') && plan.reason !== 'Not enough coins' ? plan : null;
  const reqs = [[s.level >= def.level, t('Reach level {level}', { level: def.level })], [s.coins >= price, `${coinMark()} ${num(price)}`, t('Not enough coins')], ...(other ? [[false, t(other.reason, tParams(other.params))]] : [])];
  const missing = reqs.find(r => !r[0]);
  return `<p>${t('This project restores the old building in its original place.')}</p>
    ${reqs.map(([ok, text]) => `<div class="req ${ok ? 'ok' : ''}">${glyph(ok ? 'check' : 'lock', 'g')} ${text}</div>`).join('')}
    ${plan.moved ? `<p class="hint">${t('Paths and loose things on the old site are moved out of the way for you.')}</p>` : ''}
    <button class="btn primary wide${missing ? ' blocked' : ''}" data-do="growthBuild" data-kind="${kind}" ${missing ? `data-why="${esc((missing[2] ?? missing[1]).replace(/<[^>]*>/g, '').trim())}"` : ''}>${t('Rebuild')} · ${coinMark()} ${num(price)}</button>
    <button class="btn ghost wide" data-do="villageGrowth">${t('Back to the village board')}</button>`;
}
