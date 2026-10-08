// Ownership, an optional local reveal and reading its memory are separate facts. Loading never clears land or pays.
import { LAND_BRANCH } from '../content/land.mjs';
import { FARM, N, PARCEL, START_PARCEL, parcelOrigin } from '../content/world.mjs';
import { PARCELS } from '../content/economy.mjs';
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { CELL_TYPES } from './state.mjs';

const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const stamp = value => Number.isSafeInteger(value) && value >= 0;
const valid = parcel => typeof parcel === 'string' && /^(0|[1-9]\d*),(0|[1-9]\d*)$/.test(parcel)
  && parcel.split(',').every(n => Number(n) < FARM.parcels);
const owned = s => [...new Set((Array.isArray(s.parcels) ? s.parcels : []).filter(valid))];
const firstKey = `land:${LAND_BRANCH.discovery.id}`;
const adjacent = (parcels, parcel) => {
  const [x, z] = parcel.split(',').map(Number);
  return parcels.some(p => { const [px, pz] = p.split(',').map(Number); return Math.abs(px - x) + Math.abs(pz - z) === 1; });
};
// Fixed search order is shared by all reads; no sorting or per-state cached positions on the UI/tick path.
const SITE_CELLS = [];
for (let z = 1; z < PARCEL - 1; z++) for (let x = 1; x < PARCEL - 1; x++) SITE_CELLS.push([x, z]);
SITE_CELLS.sort(([ax, az], [bx, bz]) => (ax - 1) ** 2 + (az - 1) ** 2 - (bx - 1) ** 2 - (bz - 1) ** 2);

export const newLandDiscovery = () => ({ parcel: null, boughtAt: null, discoveredAt: null, read: false });

/** Pure, bounded compatibility normalization. A firsts stamp is a second reward ledger for partial imports. */
export function normalizeLandDiscovery(s) {
  const saved = record(s.landDiscovery), parcels = owned(s);
  const discoveredAt = stamp(saved.discoveredAt) ? saved.discoveredAt : stamp(s.firsts?.[firstKey]) ? s.firsts[firstKey] : null;
  const previous = valid(saved.parcel) && saved.parcel !== START_PARCEL ? saved.parcel : null;
  const parcel = previous && parcels.includes(previous) ? previous : parcels.find(p => p !== START_PARCEL) ?? previous ?? LAND_BRANCH.preferredParcel;
  return { parcel, boughtAt: stamp(saved.boughtAt) ? saved.boughtAt : null, discoveredAt,
    read: discoveredAt !== null && saved.read === true };
}

/** Integer cell for the little covered marker. It occupies no building slot and never grants ownership.
 * Prefer the included clearing, then look for empty grass elsewhere. Recompute after building so legacy crops,
 * buildings, paths and fences are not hidden or moved. Without safe empty grass the panel keeps its free inspection. */
export function landDiscoverySite(s) {
  const d = normalizeLandDiscovery(s);
  if (s.mode !== 'restore' || !owned(s).includes(d.parcel)) return null;
  const o = parcelOrigin(d.parcel), busy = new Set(), fences = record(s.fences);
  for (const p of Object.values(record(s.placed))) {
    if (!p || !BUILDINGS[p.kind] || !Number.isInteger(p.x) || !Number.isInteger(p.z)) continue;
    const [w, h] = footprint(p.kind, p.rot ?? 0);
    // Ignore the rest of the valley; at most this parcel's 256 cells can be relevant.
    for (let z = Math.max(o.z, p.z); z < Math.min(o.z + PARCEL, p.z + h); z++)
      for (let x = Math.max(o.x, p.x); x < Math.min(o.x + PARCEL, p.x + w); x++) busy.add(`${x},${z}`);
  }
  for (const [dx, dz] of SITE_CELLS) {
    const x = o.x + dx, z = o.z + dz;
    if (s.cells?.[z * N + x] !== CELL_TYPES.grass || busy.has(`${x},${z}`)) continue;
    if ([`${x},${z},n`, `${x},${z},w`, `${x + 1},${z},w`, `${x},${z + 1},n`].some(k => Object.hasOwn(fences, k))) continue;
    return { parcel: d.parcel, x, z };
  }
  return null;
}

/** The selected preview may be any still-offered second parcel; after purchase the branch follows the owned one. */
export function landBranchStatus(s, previewParcel) {
  const d = normalizeLandDiscovery(s), parcels = owned(s), ownsBranch = parcels.includes(d.parcel);
  const parcel = !ownsBranch && valid(previewParcel) && previewParcel !== START_PARCEL ? previewParcel : d.parcel;
  const isOwned = parcels.includes(parcel), enabled = s.mode === 'restore';
  const price = PARCELS.cost(parcels.length + 1), level = PARCELS.level;
  const reason = !enabled ? 'This clearing belongs to the restored village'
    : isOwned ? null : parcels.length >= PARCELS.maxV01 ? 'More land opens in a later version'
    : !adjacent(parcels, parcel) ? 'Buy land next to your farm'
    : s.level < level ? 'Reach level {level} first' : s.coins < price ? 'Not enough coins' : null;
  const found = d.discoveredAt !== null;
  return { id: LAND_BRANCH.id, parcel, ...parcelOrigin(parcel), enabled, owned: isOwned,
    stage: isOwned ? found ? 'found' : 'covered' : 'unowned', found, read: d.read, boughtAt: d.boughtAt,
    discoveredAt: d.discoveredAt, price, level, size: PARCEL,
    canBuy: enabled && !isOwned && !reason, canInspect: enabled && isOwned && !found,
    reason, params: reason === 'Reach level {level} first' ? { level } : null,
    site: enabled && isOwned ? landDiscoverySite(s) : null };
}

export const unreadLandDiscovery = s => { const d = normalizeLandDiscovery(s); return d.discoveredAt !== null && !d.read ? 1 : 0; };

/** Called only inside a successfully validated second-parcel purchase, after its normal overgrowth. No new charge. */
export function afterParcelBought(ctx, parcel) {
  const { s } = ctx;
  if (s.mode !== 'restore' || s.parcels.length !== 2 || !valid(parcel) || !s.parcels.includes(parcel)) return;
  const d = normalizeLandDiscovery(s), o = parcelOrigin(parcel), patch = LAND_BRANCH.patch;
  s.landDiscovery = { ...d, parcel, boughtAt: stamp(ctx.now) ? ctx.now : 0 };
  for (let z = o.z + patch.z; z < o.z + patch.z + patch.depth; z++)
    for (let x = o.x + patch.x; x < o.x + patch.x + patch.width; x++) s.cells[z * N + x] = CELL_TYPES.grass;
}

export const actions = {
  inspectLandDiscovery(ctx, { parcel }) {
    const d = normalizeLandDiscovery(ctx.s);
    if (ctx.s.mode !== 'restore') return ctx.fail('This clearing belongs to the restored village');
    if (!valid(parcel) || parcel !== d.parcel || !owned(ctx.s).includes(parcel)) return ctx.fail('Buy this plot before inspecting its marker');
    if (d.discoveredAt !== null) return ctx.fail('This planting memory is already yours');
    const stored = record(ctx.s.stored), decor = LAND_BRANCH.reward.decor, count = stored[decor] ?? 0;
    if (!stamp(ctx.now) || !Number.isSafeInteger(count) || count < 0 || count >= Number.MAX_SAFE_INTEGER)
      return ctx.fail('Cannot keep this planting memory yet');
    // The persistent marker and decoration credit are inseparable; neither reading nor the visual reveal pays.
    ctx.s.landDiscovery = { ...d, discoveredAt: ctx.now, read: false };
    ctx.s.firsts = { ...record(ctx.s.firsts), [firstKey]: ctx.now };
    ctx.s.stored = { ...stored, [decor]: count + LAND_BRANCH.reward.count };
    ctx.emit('landDiscovered', { id: LAND_BRANCH.id, parcel, decor });
    return { parcel, decor };
  },
  readLandDiscovery(ctx) {
    const d = normalizeLandDiscovery(ctx.s);
    if (d.discoveredAt === null) return ctx.fail('No planting memory has been found yet');
    if (!d.read) ctx.s.landDiscovery = { ...d, read: true };
    return { read: true };
  },
};
