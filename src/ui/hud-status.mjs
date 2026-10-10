// Read-only HUD facts. One chip per destination; order counts live on the order-board button.
import { questsOf, ready } from '../core/quests.mjs';
import { rentWaiting } from '../core/homes.mjs';
import { unread } from '../core/bonds.mjs';
import { marketDayOf } from '../core/market-day.mjs';
import { festivalOf } from '../core/festival.mjs';

/** project: show the Projects pill (the HUD always does; it replaced a round button); canWork: a step can be worked now (the pill is lit). */
export function hudStatus(s, now, { project = false, canWork = false } = {}) {
  const goals = questsOf(s, now).list;
  const rows = [{ act: 'quests', icon: 'ui:xp', label: 'Goals', count: goals.length, ready: goals.filter(q => ready(s, q, now)).length }];
  if (project) rows.push({ act: 'projects', icon: 'ui:projects', label: 'Project', text: canWork ? 'ready' : '', hot: canWork });
  const mail = unread(s); if (mail) rows.push({ act: 'mail', icon: 'ui:mail', label: 'Letters', count: mail, hot: true });
  const rent = rentWaiting(s, now);
  if (rent >= 5) rows.push({ act: 'rent', icon: 'ui:coin', label: 'Rent', coins: rent, hot: true });
  // Do not use truckOf here: opening the interface must not create an old save's missing fleet.
  const trucks = s.truck ? [s.truck, ...(s.truck.fleet ?? [])] : [], away = trucks.filter(u => u.away);
  const coins = trucks.reduce((sum, u) => sum + (u.coins ?? 0), 0), label = trucks.length > 1 ? 'Trucks' : 'Truck';
  if (coins) rows.push({ act: 'market', icon: 'truck', label, coins, hot: true });
  else if (away.length) rows.push({ act: 'market', icon: 'truck', label, ms: Math.max(0, Math.min(...away.map(u => u.backAt)) - now), count: away.length });
  // a market day runs: the good of the day and the time left (a tap opens the barn, where it sells for double)
  const day = marketDayOf(s, now);
  if (day.active) rows.push({ act: 'marketday', icon: day.good, label: 'Market day', ms: Math.max(0, day.endsAt - now), lit: true });
  const fest = festivalOf(s, now);   // the Harvest Festival's evening: the time left (a tap opens its panel)
  if (fest.active) rows.push({ act: 'festival', icon: 'stage', label: 'Festival', ms: Math.max(0, fest.until - now), lit: true });
  // the evening report (chapter 10): offered once a day from six o'clock, when hands are hired and the day earned something
  if (!s.today?.reportSeen && Object.keys(s.hands ?? {}).length && new Date(now).getHours() >= 18 && (s.stats.coinsEarned ?? 0) > (s.today?.earnedBase ?? Infinity))
    rows.push({ act: 'report', icon: 'person:ada', label: 'Evening sums', text: 'ready', hot: true });
  const line = s.fishing?.line;
  if (line) rows.push({ act: 'pond', icon: 'pond', label: 'Fishing', ms: Math.max(0, line.doneAt - now), hot: line.doneAt <= now });
  return rows;
}
