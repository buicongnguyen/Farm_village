import { t, tParams, num } from '../kit/i18n.mjs';
import { RUINS } from '../content/world.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { mayBuild } from '../core/projects.mjs';
import { canPlace, doorCell, reachesRoad } from '../core/grid.mjs';
import { placementPrice } from '../core/build.mjs';
import { coinMark } from './icon.mjs';
export function renderCivicSite(s, kind) {
  const site = RUINS.find(r => r.kind === kind); if (!site || !BUILDINGS[kind]?.civicSite) return '';
  const may = mayBuild(s, kind), can = canPlace(s, kind, site.x, site.z, site.rot), door = doorCell(kind, site.x, site.z, site.rot);
  const why = !may.ok ? may : !can.ok ? can : null;
  return `<p>${t('This project restores the old building in its original place.')}</p><p>${t(BUILDINGS[kind].name)} · ${coinMark()} ${num(placementPrice(s, kind))}</p>
    ${why ? `<p class="hint">${t(why.reason, tParams(why.params))}</p>` : ''}
    ${door && !reachesRoad(s, ...door) ? `<p>${t('Connect its front door to the civic road with a path tile first.')}</p><button class="btn ghost wide" data-do="growthPath" data-kind="${kind}">${t('Preview the entrance path')} · ${coinMark()} 1</button>` : ''}
    <button class="btn primary wide" data-do="growthBuild" data-kind="${kind}" ${why ? 'disabled' : ''}>${t('Preview the rebuild')}</button>
    <button class="btn ghost wide" data-do="villageGrowth">${t('Back to the village board')}</button>`;
}
