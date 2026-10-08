// Optional civic projects and one authorized company delivery at a time. No background ingredient consumption.
import { GROWTH, COMPANY_BRANDS, BULK_REQUESTS } from '../content/village-growth.mjs';
import { TRUCK } from '../content/economy.mjs';
import { RECIPES } from '../content/goods.mjs';
import { isWorking, workingCount } from './working.mjs';
import { eligibleCompanyStaff, workingFactories, companyReady, enoughFactories, markCompanyUsed } from './company-benefits.mjs';
import { queueBatches } from './production.mjs';
import * as barn from './barn.mjs';

import { normalizeGrowth, stamp, owns, fleet, requestAt, validTag, matchingCargo, saveStamp } from './growth-state.mjs';
export { newGrowth, normalizeGrowth } from './growth-state.mjs';

export function civicBuildReason(s, kind) {
  if (!['police', 'company'].includes(kind)) return null;
  if ((s.story?.chapter ?? 0) < 5) return 'Read the clinic homecoming chapter first';
  if (kind === 'company' && !enoughFactories(s)) return 'Keep two different food factories working first';
  return null;
}

export function growthStatus(s, now = s.lastSeen) {
  const saved = normalizeGrowth(s), trucks = fleet(s);
  const activeIndex = trucks.findIndex(u => validTag(u.companyDelivery) && u.companyDelivery.sequence === saved.sent && saved.sent > saved.settled);
  const active = activeIndex >= 0 ? { ...trucks[activeIndex].companyDelivery, truck: activeIndex, away: !!trucks[activeIndex].away } : null;
  const next = requestAt(active?.sequence ?? saved.sent + 1), police = workingCount(s, 'police') > 0;
  const ready = companyReady(s), idleTruck = trucks.findIndex(u => !u.away && Array.isArray(u.load) && u.load.length === 0 && (!validTag(u.companyDelivery) || u.companyDelivery.sequence <= saved.settled));
  const hospitalReason = saved.hospitalAt !== null ? 'The hospital is already open'
    : s.level < GROWTH.hospital.level ? 'Reach level {level} first'
      : (s.story?.chapter ?? 0) < 5 ? 'Read the clinic homecoming chapter first'
        : !workingCount(s, 'clinic') ? 'Bring the clinic into working order first'
          : s.coins < GROWTH.hospital.coins ? 'Not enough coins'
            : !barn.hasAll(s, GROWTH.hospital.need) ? 'Keep the project goods and gather the hospital supplies' : null;
  const units = Object.values(next.need).reduce((n, v) => n + v, 0);
  const capacity = TRUCK.capacity[Math.min(Math.max(s.truck?.level ?? 1, 1), TRUCK.capacity.length) - 1];
  const reason = !ready ? 'Open the company with two working food factories first'
    : active ? active.away ? 'The company truck is on its way' : 'Collect the company payment at the market first'
      : saved.sent >= Number.MAX_SAFE_INTEGER - 1 ? 'This company record cannot accept another delivery'
        : next.hospital && saved.hospitalAt === null ? 'Upgrade the clinic to a hospital for this request'
          : !workingCount(s, 'market') ? 'Repair the market square first'
            : !isWorking(s, 'road_south') ? 'Repair the village street first'
              : idleTruck < 0 ? 'Keep one empty truck at the market for this request'
                : capacity < units ? 'Upgrade a truck to fit this whole request'
                  : !barn.hasAll(s, next.need) ? 'Keep the project goods and finish this company request' : null;
  return { ...saved, ready, police, active, next, idleTruck, units, capacity, reason, canSend: !reason,
    payment: Math.round(next.coins * (active ? active.police ? 1.05 : 1 : police ? 1.05 : 1)),
    hospitalReason, canUpgradeHospital: !hospitalReason, staffOptions: eligibleCompanyStaff(s, now), factories: workingFactories(s) };
}
export const unreadGrowth = s => { const g = normalizeGrowth(s); return [...(g.hospitalAt !== null ? ['hospital'] : []), ...Object.keys(g.memories)].filter(id => !g.read.includes(id)).length; };

/** Called only by the normal truck return, replacing its ordinary cargo quote for a valid company trip. */
export function growthTruckPayment(ctx, truck) {
  const tag = truck.companyDelivery;
  if (!validTag(tag)) return null;
  const g = normalizeGrowth(ctx.s), request = requestAt(tag.sequence);
  if (tag.sequence !== g.sent || tag.sequence <= g.returned || tag.sequence <= g.settled) return null;
  if (!matchingCargo(truck)) return null;
  const coins = Math.round(request.coins * (tag.police ? 1.05 : 1));
  g.returned = tag.sequence;
  if (!stamp(g.memories[request.id])) { g.memories[request.id] = ctx.now; saveStamp(ctx.s, `memory:${request.id}`, ctx.now); }
  ctx.s.growth = g; saveStamp(ctx.s, 'returned', tag.sequence);
  ctx.emit('companyDelivered', { id: request.id, sequence: tag.sequence, coins, brand: tag.brand });
  return coins;
}
/** Payment collection also closes the one current company request; the next offer appears only afterward. */
export function collectGrowthTruck(s, truck) {
  if (!validTag(truck.companyDelivery)) return;
  const g = normalizeGrowth(s), seq = truck.companyDelivery.sequence;
  if (seq !== g.sent || seq > g.returned) return;
  g.settled = seq; s.growth = g; saveStamp(s, 'settled', seq); delete truck.companyDelivery;
}

export const actions = {
  upgradeHospital(ctx) {
    const status = growthStatus(ctx.s, ctx.now);
    if (!stamp(ctx.now)) return ctx.fail('This civic project cannot be completed yet');
    if (!status.canUpgradeHospital) return ctx.fail(status.hospitalReason, { level: GROWTH.hospital.level });
    barn.take(ctx.s, GROWTH.hospital.need); ctx.s.coins -= GROWTH.hospital.coins;
    ctx.s.growth = { ...normalizeGrowth(ctx.s), hospitalAt: ctx.now }; saveStamp(ctx.s, 'hospital', ctx.now);
    ctx.emit('hospitalUpgraded'); return { hospital: true };
  },
  chooseCompanyBrand(ctx, { brand }) {
    if (!companyReady(ctx.s)) return ctx.fail('Open the company with two working food factories first');
    if (!owns(COMPANY_BRANDS, brand)) return ctx.fail('Choose a company label from the board');
    ctx.s.growth = { ...normalizeGrowth(ctx.s), brand }; return { brand };
  },
  hireCompanyStaff(ctx, { role, person, building }) {
    const g = normalizeGrowth(ctx.s);
    if (!companyReady(ctx.s)) return ctx.fail('Open the company with two working food factories first');
    if (!['worker', 'manager'].includes(role) || !eligibleCompanyStaff(ctx.s, ctx.now).some(p => p.id === person)) return ctx.fail('Choose an adult who has moved into the village');
    if (Object.values(g.staff).some(member => member?.person === person)) return ctx.fail('That neighbour already has a company role');
    if (g.staff[role]) return ctx.fail('Release this role before inviting another neighbour');
    if (role === 'worker' && !workingFactories(ctx.s).some(p => p.id === building)) return ctx.fail('Choose a working food factory for this worker');
    const cost = GROWTH.hiring[role]; if (ctx.s.coins < cost) return ctx.fail('Not enough coins');
    ctx.s.coins -= cost; g.staff[role] = { person, ...(role === 'worker' ? { building } : {}) }; ctx.s.growth = g;
    ctx.emit('companyHired', { person, role }); return { person, role, cost };
  },
  releaseCompanyStaff(ctx, { role }) {
    const g = normalizeGrowth(ctx.s); if (!['worker', 'manager'].includes(role) || !g.staff[role]) return ctx.fail('This company role is empty');
    g.staff[role] = null; ctx.s.growth = g; return { role };
  },
  companyBatch(ctx, { building, recipe, count: n }) {
    const g = normalizeGrowth(ctx.s);
    if (!companyReady(ctx.s)) return ctx.fail('Open the company with two working food factories first');
    if (!g.staff.manager || !eligibleCompanyStaff(ctx.s, ctx.now).some(p => p.id === g.staff.manager.person)) return ctx.fail('Invite a manager before confirming a batch plan');
    if (!workingFactories(ctx.s).some(p => p.id === building) || !RECIPES[recipe] || RECIPES[recipe].at !== ctx.s.placed[building].kind) return ctx.fail('Choose a working food factory for this batch plan');
    const result = queueBatches(ctx, { building, recipe, count: n });
    if (result?.ok !== false) markCompanyUsed(ctx.s);
    return result;
  },
  sendCompanyDelivery(ctx, { id }) {
    const status = growthStatus(ctx.s, ctx.now);
    if (!stamp(ctx.now) || id !== status.next.id) return ctx.fail('This company request is not available');
    if (!status.canSend) return ctx.fail(status.reason);
    const g = normalizeGrowth(ctx.s), request = status.next, u = fleet(ctx.s)[status.idleTruck], sequence = g.sent + 1;
    barn.take(ctx.s, request.need);
    u.load = Object.entries(request.need).map(([good, n]) => ({ good, n }));
    u.companyDelivery = { id, sequence, at: ctx.now, brand: g.brand, police: status.police };
    u.away = true; u.backAt = ctx.now + TRUCK.tripMs;
    g.sent = sequence; ctx.s.growth = g; saveStamp(ctx.s, 'sent', sequence);
    ctx.emit('truckSent', { units: status.units, truck: status.idleTruck });
    ctx.emit('companySent', { id, sequence, truck: status.idleTruck }); return { sequence, truck: status.idleTruck, backAt: u.backAt };
  },
  readGrowthMemory(ctx, { id }) {
    const g = normalizeGrowth(ctx.s);
    if (!(id === 'hospital' && g.hospitalAt !== null) && !stamp(g.memories[id])) return ctx.fail('This village memory has not happened yet');
    if (!g.read.includes(id)) { g.read.push(id); ctx.s.growth = g; }
    return { id };
  },
};
