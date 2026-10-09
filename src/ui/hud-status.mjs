// Read-only HUD facts. One chip per destination; order counts live on the order-board button.
import { questsOf, ready } from '../core/quests.mjs';
import { rentWaiting } from '../core/homes.mjs';

export function hudStatus(s, now) {
  const goals = questsOf(s, now).list;
  const rows = [{ act: 'quests', icon: 'ui:xp', label: 'Goals', count: goals.length, ready: goals.filter(q => ready(s, q, now)).length }];
  const rent = rentWaiting(s, now);
  if (rent >= 5) rows.push({ act: 'rent', icon: 'ui:coin', label: 'Rent', coins: rent, hot: true });
  // Do not use truckOf here: opening the interface must not create an old save's missing fleet.
  const trucks = s.truck ? [s.truck, ...(s.truck.fleet ?? [])] : [], away = trucks.filter(u => u.away);
  const coins = trucks.reduce((sum, u) => sum + (u.coins ?? 0), 0), label = trucks.length > 1 ? 'Trucks' : 'Truck';
  if (coins) rows.push({ act: 'market', icon: 'truck', label, coins, hot: true });
  else if (away.length) rows.push({ act: 'market', icon: 'truck', label, ms: Math.max(0, Math.min(...away.map(u => u.backAt)) - now), count: away.length });
  const line = s.fishing?.line;
  if (line) rows.push({ act: 'pond', icon: 'pond', label: 'Fishing', ms: Math.max(0, line.doneAt - now), hot: line.doneAt <= now });
  return rows;
}
