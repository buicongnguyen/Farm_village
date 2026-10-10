import { t, tParams, num } from '../kit/i18n.mjs';
import { RUINS } from '../content/world.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { mayBuild } from '../core/projects.mjs';
import { canPlace } from '../core/grid.mjs';
import { placementPrice } from '../core/build.mjs';
import { coinMark } from './icon.mjs';
export function renderCivicSite(s, kind) {
  const site = RUINS.find(r => r.kind === kind); if (!site || !BUILDINGS[kind]?.civicSite) return '';
  const may = mayBuild(s, kind), can = canPlace(s, kind, site.x, site.z, site.rot);
  const lacksPath = !can.ok && can.reason === 'Needs a path from the door to the road';   // the rebuild lays that tile itself
  const why = !may.ok ? may : !can.ok && !lacksPath ? can : null;
  return `<p>${t('This project restores the old building in its original place.')}</p><p>${t(BUILDINGS[kind].name)} · ${coinMark()} ${num(placementPrice(s, kind))}</p>
    ${why ? `<p class="hint">${t(why.reason, tParams(why.params))}</p>` : ''}
    <button class="btn primary wide" data-do="growthBuild" data-kind="${kind}" ${why ? 'disabled' : ''}>${t('Preview the rebuild')}</button>
    <button class="btn ghost wide" data-do="villageGrowth">${t('Back to the village board')}</button>`;
}
