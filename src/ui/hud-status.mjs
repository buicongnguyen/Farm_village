// Read-only HUD facts. One chip per destination; order counts live on the order-board button.
import { questsOf, ready } from '../core/quests.mjs';
import { rentWaiting } from '../core/homes.mjs';
import { unread } from '../core/bonds.mjs';
import { marketDayOf } from '../core/market-day.mjs';
import { festivalOf } from '../core/festival.mjs';
import { albrightOffer, dividendOf } from '../core/valley.mjs';
import { VALLEY } from '../content/economy.mjs';
import { breakfastReady } from '../core/hotel.mjs';
import { trainOf } from '../core/train.mjs';

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
  // Mr Albright waits for his answer (chapter 11): a tap opens his offer
  if (albrightOffer(s).open) rows.push({ act: 'offer', icon: 'person:albright', label: 'An offer', text: 'waiting', hot: true });
  // the valley company's dividend (chapter 17): shown once half of what can wait is waiting
  const dividend = dividendOf(s, now); if (dividend.payments * 2 >= VALLEY.cap && dividend.waiting > 0) rows.push({ act: 'dividend', icon: 'company', label: 'Dividend', coins: dividend.waiting, hot: true });
  // the evening train is at the halt (chapter 15): the time until it leaves (a tap opens its wagons)
  const train = trainOf(s, now); if (train.here) rows.push({ act: 'train', icon: 'halt', label: 'Train', ms: Math.max(0, train.leavesAt - now), lit: true });
  // a hotel guest's breakfast wish is in the barn (chapter 14): a tap opens the hotel
  const breakfast = breakfastReady(s); if (breakfast) rows.push({ act: 'hotel', icon: breakfast.wish, label: 'Breakfast', text: 'ready', hot: true });
  const line = s.fishing?.line;
  if (line) rows.push({ act: 'pond', icon: 'pond', label: 'Fishing', ms: Math.max(0, line.doneAt - now), hot: line.doneAt <= now });
  return rows;
}
