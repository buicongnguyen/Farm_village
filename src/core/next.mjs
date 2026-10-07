// "What next?": the one most useful thing to do right now, for the HUD's next-task chip (PLAN-v0.3b).
// Returns { key, at: { x, z }, icon, id? } or null. `key` is a sentence the interface translates.
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { animalState } from './animals.mjs';
import { treeState } from './trees.mjs';
import { readyCount } from './production.mjs';
import { isBroken, isRepairing, isWorking } from './working.mjs';
import * as barn from './barn.mjs';
import { questsOf, ready as questReady } from './quests.mjs';
import { rentWaiting } from './homes.mjs';
import { MAILBOX } from '../content/world.mjs';

const centre = p => { const [w, d] = footprint(p.kind, p.rot); return { x: Math.floor(p.x + w / 2), z: Math.floor(p.z + d / 2) }; };
export function nextTask(s, now) {
  const ids = Object.keys(s.placed), of = f => ids.filter(id => BUILDINGS[s.placed[id].kind] && f(id, s.placed[id], BUILDINGS[s.placed[id].kind]));
  const at = id => centre(s.placed[id]);
  const ripeBed = of((id, p) => p.kind === 'bed' && s.beds[id]?.doneAt <= now)[0];
  if (ripeBed) return { key: 'Harvest the ripe crops', at: at(ripeBed), icon: 'tool:harvest', do: ['harvest', { ids: of((id, p) => p.kind === 'bed' && s.beds[id]?.doneAt <= now) }] };
  const ripeTree = of((id, p, d) => d.fruit && treeState(s, id, now)?.state === 'ripe')[0];
  if (ripeTree) return { key: 'Pick the ripe fruit', at: at(ripeTree), icon: 'apple', do: ['pick', {}] };
  const eggs = of((id, p, d) => d.animals && (s.animals[id] ?? []).some(a => animalState(a, now) === 'ready'))[0];
  if (eggs) return { key: 'Collect the eggs and milk', at: at(eggs), icon: 'egg', do: ['collect', {}] };
  const goods = of((id, p, d) => d.produces && isWorking(s, id) && readyCount(s, id, now) > 0)[0];
  if (goods) return { key: 'Collect the finished goods', at: at(goods), icon: 'bread', do: ['collectProducts', { building: goods }] };
  if (rentWaiting(s, now) >= 10) return { key: 'Collect the rent from the mailbox', at: { x: MAILBOX.x, z: MAILBOX.z }, icon: 'ui:coin', do: ['collectRent', {}] };
  if (questsOf(s).list.some(q => questReady(s, q))) return { key: 'Claim a finished goal', at: null, icon: 'ui:xp', panel: 'quests' };
  const pond = of((id, p, d) => d.pond && s.fishing?.line && s.fishing.line.doneAt <= now)[0];
  if (pond) return { key: 'Reel in the fish', at: at(pond), icon: 'perch', do: ['reelIn', {}] };
  const truck = of((id, p, d) => d.market && (s.truck?.coins ?? 0) > 0)[0];
  if (truck) return { key: "Collect the truck's coins", at: at(truck), icon: 'market', do: ['collectTruck', {}] };
  if (s.orders.cards.some(c => barn.hasAll(s, c.need))) return { key: 'Deliver an order', at: null, icon: 'ui:orders', panel: 'orders' };
  const broken = of((id, p, d) => isBroken(s, id) && !isRepairing(s, id) && (d.produces || d.animals || d.home || d.market))[0] ?? (isBroken(s, 'house') ? 'house' : null);
  if (broken && broken !== 'house' && s.coins >= 30) return { key: 'Repair a broken building', at: at(broken), icon: 'wrench', id: broken };
  const hungry = of((id, p, d) => d.animals && isWorking(s, id) && (s.animals[id] ?? []).some(a => animalState(a, now) === 'hungry'))[0];
  if (hungry) return { key: 'Feed the hungry animals', at: at(hungry), icon: 'chicken_feed' };
  const empty = of((id, p) => p.kind === 'bed' && !s.beds[id])[0];
  if (empty) return { key: 'Plant the empty beds', at: at(empty), icon: 'wheat' };
  return { key: Object.keys(s.beds).length || Object.keys(s.production).length ? 'All busy: enjoy the view' : 'Open the Today board', at: null, icon: 'today', panel: 'today', calm: true };
}
