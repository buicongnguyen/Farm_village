// "What next?": the one most useful thing to do right now, for the HUD's next-task chip (PLAN-v0.3b).
// Returns { key, at: { x, z }, icon, id? } or null. `key` is a sentence the interface translates.
import { BUILDINGS, footprint } from '../content/buildings.mjs';
import { animalState } from './animals.mjs';
import { treeState } from './trees.mjs';
import { readyCount } from './production.mjs';
import { isBroken, isRepairing, isWorking } from './working.mjs';
import * as barn from './barn.mjs';

const centre = p => { const [w, d] = footprint(p.kind, p.rot); return { x: Math.floor(p.x + w / 2), z: Math.floor(p.z + d / 2) }; };
export function nextTask(s, now) {
  const ids = Object.keys(s.placed), of = f => ids.filter(id => BUILDINGS[s.placed[id].kind] && f(id, s.placed[id], BUILDINGS[s.placed[id].kind]));
  const at = id => centre(s.placed[id]);
  const ripeBed = of((id, p) => p.kind === 'bed' && s.beds[id]?.doneAt <= now)[0];
  if (ripeBed) return { key: 'Harvest the ripe crops', at: at(ripeBed), icon: 'tool:harvest' };
  const ripeTree = of((id, p, d) => d.fruit && treeState(s, id, now)?.state === 'ripe')[0];
  if (ripeTree) return { key: 'Pick the ripe fruit', at: at(ripeTree), icon: 'apple' };
  const eggs = of((id, p, d) => d.animals && (s.animals[id] ?? []).some(a => animalState(a, now) === 'ready'))[0];
  if (eggs) return { key: 'Collect the eggs and milk', at: at(eggs), icon: 'egg' };
  const goods = of((id, p, d) => d.produces && isWorking(s, id) && readyCount(s, id, now) > 0)[0];
  if (goods) return { key: 'Collect the finished goods', at: at(goods), icon: 'bread' };
  const truck = of((id, p, d) => d.market && (s.truck?.coins ?? 0) > 0)[0];
  if (truck) return { key: "Collect the truck's coins", at: at(truck), icon: 'market' };
  if (s.orders.cards.some(c => barn.hasAll(s, c.need))) return { key: 'Deliver an order', at: null, icon: 'ui:orders', panel: 'orders' };
  const broken = of((id, p, d) => isBroken(s, id) && !isRepairing(s, id) && (d.produces || d.animals || d.home || d.market))[0] ?? (isBroken(s, 'house') ? 'house' : null);
  if (broken && broken !== 'house' && s.coins >= 30) return { key: 'Repair a broken building', at: at(broken), icon: 'wrench', id: broken };
  const hungry = of((id, p, d) => d.animals && isWorking(s, id) && (s.animals[id] ?? []).some(a => animalState(a, now) === 'hungry'))[0];
  if (hungry) return { key: 'Feed the hungry animals', at: at(hungry), icon: 'chicken_feed' };
  const empty = of((id, p) => p.kind === 'bed' && !s.beds[id])[0];
  if (empty) return { key: 'Plant the empty beds', at: at(empty), icon: 'wheat' };
  return { key: 'Open the Today board', at: null, icon: 'today', panel: 'today' };
}
