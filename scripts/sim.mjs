// The economy simulation on the real rules (ECONOMY.md): plays a player profile through act()/tick() with a fake clock
// and reports when each build step opens.
//   node scripts/sim.mjs [casual|steady|keen] [days] [--trace]
import { newGame } from '../src/core/state.mjs';
import { tick } from '../src/core/act.mjs';
import { Bot } from './bot.mjs';

export const PROFILES = {
  casual: [[9, 8], [20, 8]],
  steady: [[8, 12], [12.5, 8], [19, 15]],
  keen: [[7, 15], [10, 10], [13, 12], [17, 10], [21, 15]],
};
const DAY = 86_400_000, MIN = 60_000;
export const START = new Date(2026, 9, 7, 0, 0, 0).getTime();
/**
 * Run a profile for some days. Returns { steps: { id: day }, levels: { level: hours since the first visit }, daily: [...], s }.
 * cart / trees: false keeps the bot away from the weekly cart and fruit trees (to measure what they change).
 */
export function simulate(profile = 'steady', days = 21, { seed = 4242, trace = false, cart = true, trees = true, restore = false } = {}) {
  const visits = PROFILES[profile], s = newGame(START + visits[0][0] * 3_600_000, seed, { restore }), bot = new Bot(s, { cart, trees }), daily = [];
  tick(s, s.createdAt);
  for (let d = 0; d < days; d++) {
    visits.forEach(([h, len], i) => {
      const start = START + d * DAY + h * 3_600_000, next = visits[i + 1] ? START + d * DAY + visits[i + 1][0] * 3_600_000 : START + (d + 1) * DAY + visits[0][0] * 3_600_000;
      for (let m = 0; m <= len; m += 2) { const now = start + m * MIN; bot.play(now, m + 2 > len ? next - now : 2 * MIN); }
    });
    const snap = { day: d + 1, level: s.level, coins: s.coins, beds: s.counts.bed ?? 0, step: s.projects.step, cottages: s.counts.cottage ?? 0, orders: s.stats.ordersFilled, orderCoins: s.stats.orderCoins };
    daily.push(snap);
    if (trace) console.log(`  end of day ${snap.day}: level ${snap.level}, ${snap.coins} coins, ${snap.beds} beds, ${snap.cottages} cottages, ${snap.orders} orders (${snap.orderCoins} coins)`);
  }
  const steps = Object.fromEntries(bot.log.map(({ now, step }) => [step, Math.floor((now - START) / DAY) + 1]));
  const levels = Object.fromEntries(Object.entries(bot.levels).map(([l, now]) => [l, +((now - s.createdAt) / 3_600_000).toFixed(2)]));
  return { steps, levels, daily, s };
}
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('sim.mjs')) {
  const profile = process.argv[2] ?? 'steady', days = +(process.argv[3] ?? 14);
  const t0 = performance.now(), { steps, daily, levels, s } = simulate(profile, days, { trace: process.argv.includes('--trace'), restore: process.argv.includes('--restore') });
  console.log(`profile ${profile}, ${days} days (${((performance.now() - t0) / 1000).toFixed(1)} s):`);
  for (const [id, day] of Object.entries(steps)) console.log(`  day ${String(day).padEnd(3)} ${id}`);
  const last = daily[daily.length - 1];
  console.log(`end: level ${last.level}, ${last.coins} coins, ${last.beds} beds, ${last.cottages} cottages, ${last.orders} orders filled`);
  console.log(`hours to each level: ${Object.entries(levels).map(([l, h]) => `${l}: ${h}`).join(', ')}`);
  console.log(`carts sent: ${s.stats.carts ?? 0}, fruit picked: ${s.stats.picked ?? 0}, heart scenes: ${Object.values(s.people).reduce((n, p) => n + (p.scenes?.length ?? 0), 0)}`);
}
