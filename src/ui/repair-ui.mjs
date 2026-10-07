// Names and condition words for the things that can be repaired (PLAN-v0.3): a placed building, the farmhouse, a road stretch.
import { t } from '../kit/i18n.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { ROAD_SEGMENTS } from '../content/world.mjs';
import { kindOf, levelOf, isRepairing } from '../core/condition.mjs';

/** What a repairable id is called, for toasts and menus (null when it is gone). */
export function thingName(s, id) {
  if (id === 'house') return t('Farmhouse');
  const seg = ROAD_SEGMENTS.find(r => r.id === id); if (seg) return t(seg.name);
  if (!s) return null;
  const kind = kindOf(s, id); return kind && BUILDINGS[kind] ? t(BUILDINGS[kind].name) : null;
}
/** One word for its state. */
export function condLabel(s, id) {
  if (isRepairing(s, id)) return t('Being repaired');
  return [t('Fine'), t('Worn'), t('Shabby'), t('Broken')][Math.min(3, levelOf(s, id))];
}
