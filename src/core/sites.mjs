// Fixed sites (docs/plan): things the story builds at one given place, outside the farm and the village lots. The
// boat dock on the brook is the first (chapter 7). A site's building is bought and stands at once (buildSite): there is
// no ghost to place and it can never be moved, stored or taken down. The places are content/world.mjs SITES.
import { SITES } from '../content/world.mjs';
import { BUILDINGS } from '../content/buildings.mjs';
import { XP } from '../content/economy.mjs';
import * as grid from './grid.mjs';
import { gainXp } from './levels.mjs';

export const siteOf = kind => SITES.find(x => x.kind === kind) ?? null;
/** The fixed site this cell belongs to (its footprint), or null. */
export const siteAt = (x, z) => SITES.find(st => !st.hidden && grid.cellsOf(st.kind, st.x, st.z, st.rot).some(([cx, cz]) => cx === x && cz === z)) ?? null;
export const siteBuilt = (s, kind) => (s.counts[kind] ?? 0) > 0;
/** What building on a site takes. Pure: { ok, reason?, params?, site, price }. */
export function sitePlan(s, kind) {
  const def = typeof kind === 'string' && Object.hasOwn(BUILDINGS, kind) ? BUILDINGS[kind] : null, site = def?.site ? siteOf(kind) : null;
  if (!site || (site.when && !site.when(s))) return { ok: false, reason: 'Unknown item' };   // some sites are built by the story only
  const price = def.cost ?? 0;
  if (siteBuilt(s, kind)) return { ok: false, reason: 'It is already built', site, price };
  if (s.level < def.level) return { ok: false, reason: 'Reach level {level} first', params: { level: def.level, kind, lock: 'level' }, site, price };
  if (grid.cellsOf(kind, site.x, site.z, site.rot).some(([x, z]) => grid.occupant(s, x, z))) return { ok: false, reason: 'Overlaps something', site, price };
  if (s.coins < price) return { ok: false, reason: 'Not enough coins', site, price };
  return { ok: true, site, price };
}

export const actions = {
  /** Build a fixed-site thing where it belongs: { kind }. */
  buildSite(ctx, { kind } = {}) {
    const { s } = ctx, plan = sitePlan(s, kind); if (!plan.ok) return ctx.fail(plan.reason, plan.params);
    const { site, price } = plan, id = `p${s.nextId++}`;
    s.coins -= price; s.placed[id] = { kind, x: site.x, z: site.z, rot: site.rot };
    s.counts[kind] = (s.counts[kind] ?? 0) + 1; grid.touch(s);
    const built = (s.stats.built ??= {}); if (s.counts[kind] > (built[kind] ?? 0)) { built[kind] = s.counts[kind]; gainXp(ctx, XP.build * 4); }
    ctx.emit('placed', { id, kind, x: site.x, z: site.z, rot: site.rot, site: true });
    return { id, price };
  },
};
