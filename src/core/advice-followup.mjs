// Optional suggestions use the same eligibility as their real controls. No selector inspects, pays or saves.
import { ADVICE_TOPICS } from '../content/advice.mjs';
import { CLEAR } from '../content/economy.mjs';
import { N, PARCEL, parcelOrigin } from '../content/world.mjs';
import { explorationStatus } from './exploration.mjs';
import { normalizeDiscoveries } from './discoveries.mjs';
import { landBranchStatus } from './land-discovery.mjs';
import { learningStatus } from './learning.mjs';
import { schoolStatus } from './school-activity.mjs';
import { repairCost } from './condition.mjs';
import { cellType, landOf, occupant } from './grid.mjs';

const topic = (id, context, params, target) => ({ id, context, ...ADVICE_TOPICS[id], params, target });
const unclaimed = (d, id) => !Object.hasOwn(d.claimed, id) && !d.retired.includes(id);

function ownedStone(s) {
  // At most two small owned parcels in this version. Do not scan the whole valley on the HUD update path.
  for (const parcel of s.parcels ?? []) {
    if (!/^[0-3],[0-3]$/.test(parcel)) continue;
    const origin = parcelOrigin(parcel);
    for (let z = origin.z; z < origin.z + PARCEL; z++) for (let x = origin.x; x < origin.x + PARCEL; x++)
      if (s.cells?.[z * N + x] === 2 && cellType(s, x, z) === 'rock' && landOf(s, x, z) === 'farm' && !occupant(s, x, z)) return { x, z };
  }
  return null;
}

export function followupAdvice(s, now) {
  const out = [], trail = explorationStatus(s), garden = learningStatus(s, now), school = schoolStatus(s, now);
  // Chapter/arrival eligibility comes from the lesson itself, including older empty-mode farms.
  if (!garden.learned && garden.eligible) out.push(topic('garden-lesson', 'garden/lesson', {}, { kind: 'learning' }));
  else if (garden.nextStep) {
    const step = garden.nextStep, params = { step: step.name, cost: step.coins, energy: step.energy };
    if (garden.coinsNeeded) out.push(topic('garden-save', `garden/${step.id}`, { ...params, short: garden.coinsNeeded }, { kind: 'learning' }));
    else if (garden.energyNeeded && garden.canRest) out.push(topic('garden-rest', 'garden/rest', params, { kind: 'learning' }));
    else if (garden.canWork) out.push(topic('garden-work', `garden/${step.id}`, params, { kind: 'learning' }));
  }
  // No repeat-round IDs: replay is welcome, but it never creates another unread announcement.
  if (school.available && (!school.completed || school.active))
    out.push(topic('school-baskets', 'school/baskets', {}, { kind: 'school-activity' }));
  if (trail.next) out.push(topic(`picnic-${trail.next.id}`, `picnic/${trail.next.id}`, {}, { kind: 'exploration', step: trail.next.id }));

  // Opening guide gets the first turn. After an actual order, optional nearby work can join the suggestions.
  if (!(s.stats?.ordersFilled >= 1)) return out;
  const land = landBranchStatus(s);
  if (land.canInspect) out.push(topic('clearing-inspect', 'clearing/branch', {}, { kind: 'land', parcel: land.parcel }));
  else if (land.canBuy) out.push(topic('clearing-room', 'clearing/branch', { cost: land.price }, { kind: 'land', parcel: land.parcel }));
  const discoveries = normalizeDiscoveries(s);
  if (!s.fishing?.line && (discoveries.catches === 1 && unclaimed(discoveries, 'pond-tin')
    || discoveries.catches === 9 && unclaimed(discoveries, 'pond-keepsake')))
    out.push(topic('pond-curiosity', 'pond/curiosity', {}, { kind: 'pond' }));
  if (discoveries.rocks === 1 && unclaimed(discoveries, 'stone-keepsake') && s.coins >= CLEAR.rock) {
    const stone = ownedStone(s);
    if (stone) out.push(topic('stone-space', 'stone/owned', { cost: CLEAR.rock }, { kind: 'cell', ...stone }));
  }
  if (s.mode === 'restore' && s.cond?.road_south?.level >= 3 && !s.repairing?.road_south) {
    const cost = repairCost(s, 'road_south'), short = Math.max(0, cost - s.coins);
    out.push(topic(short ? 'street-save' : 'street-repair', 'road/village', { cost, short }, { kind: 'repair', id: 'road_south' }));
  }
  return out;
}
