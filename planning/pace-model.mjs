// Paper model of Farm Village's economy (docs/ECONOMY.md), before any game code exists.
// It plays a steady player who visits a few times a day for a few minutes, and reports when each build step opens.
// The real economy simulation will run on the game's own rules once they exist (ROADMAP M1); this one only checks
// that the starting numbers meet the pace targets.
// Usage: node planning/pace-model.mjs [casual|steady|keen] [days]
const profile = process.argv[2] ?? 'steady';
const DAYS = +(process.argv[3] ?? 60);
const TRACE = process.argv.includes('--trace');
const VISITS = { casual: [[9, 8], [20, 8]], steady: [[8, 12], [12.5, 8], [19, 15]], keen: [[7, 15], [10, 10], [13, 12], [17, 10], [21, 15]] }[profile];

// ── Content (keep in step with ECONOMY.md) ──
const CROPS = { wheat: { min: 2, value: 2, level: 1 }, carrot: { min: 5, value: 4, level: 2 }, corn: { min: 15, value: 7, level: 3 }, pumpkin: { min: 60, value: 18, level: 5 } };
const RECIPES = {
  chicken_feed: { at: 'feed_mill', needs: { wheat: 3 }, out: 3, min: 5, value: 3, level: 2 },
  cow_feed: { at: 'feed_mill', needs: { corn: 2, wheat: 1 }, out: 3, min: 10, value: 8, level: 6 },
  bread: { at: 'bakery', needs: { wheat: 3 }, out: 1, min: 5, value: 12, level: 3 },
  corn_bread: { at: 'bakery', needs: { corn: 2, egg: 2 }, out: 1, min: 30, value: 55, level: 4 },
  carrot_cake: { at: 'bakery', needs: { carrot: 3, egg: 2, milk: 1 }, out: 1, min: 45, value: 110, level: 7 },
};
const ANIMALS = { hen: { eats: 'chicken_feed', gives: 'egg', min: 20, value: 12, max: 6, cost: 40, level: 2 }, cow: { eats: 'cow_feed', gives: 'milk', min: 60, value: 30, max: 4, cost: 150, level: 6 } };
const VALUE = { ...Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, c.value])), ...Object.fromEntries(Object.entries(RECIPES).map(([k, r]) => [k, r.value])), egg: 12, milk: 30 };
const ORDER_PAY = 1.3, ORDER_XP = 0.3;
const xpFor = L => Math.round(10 * (L - 1) ** 2.6);       // total XP needed to reach level L
const bedCost = n => Math.round(10 * 1.15 ** (n - 6));      // the nth bed (beds 1–6 are free)
const MAX_BEDS = 30;
const slotCost = [0, 0, 60, 200, 600, 1500];               // production queue slots 3–6 per building
const barnCost = k => 100 * 2 ** k;                         // kth barn upgrade (+25 each)
const RENT = [3, 6, 10];                                    // coins per hour: basic, cozy, deluxe
const UPGRADE = [0, 400, 1500];                             // cozy, deluxe
const CHARM = 1.2;                                          // typical charm bonus (+20 %)
// Build steps: [name, coins, goods, requirement(state) -> bool, effect(state)]
const cottage = (i, coins, goods, req) => [`Cottage ${i}`, coins, goods, req, s => { s.homes.push(0); }];
const STEPS = [
  ['Clear land and path', 0, {}, () => true, () => {}],
  ['Farm plot (6 beds)', 0, {}, () => true, s => { s.beds = 6; }],
  ['Feed mill and coop', 70, {}, s => s.level >= 2, s => { s.has.feed_mill = 1; s.has.coop = 1; s.animals.hen = 2; }],
  cottage(1, 150, {}, s => s.level >= 3),
  cottage(2, 250, { bread: 5 }, s => s.level >= 4),
  ['School', 700, { bread: 10, corn_bread: 4 }, s => s.level >= 5 && s.homes.length >= 2, s => { s.has.cow_barn = 1; }],
  cottage(3, 900, { bread: 10 }, () => true),
  cottage(4, 1400, { corn_bread: 6 }, () => true),
  ['Clinic', 3000, { carrot_cake: 4, corn_bread: 10 }, s => s.homes.length >= 4 && s.level >= 8, () => {}],
  cottage(5, 2000, { carrot_cake: 3 }, () => true),
  cottage(6, 2800, { carrot_cake: 5 }, () => true),
  ['Market square', 6000, { carrot_cake: 8, bread: 30 }, s => s.homes.length >= 6 && s.orderCoins >= 3000, () => {}],
  cottage(7, 3800, { carrot_cake: 6 }, () => true),
  cottage(8, 5000, { carrot_cake: 8 }, () => true),
  ['Police post', 9000, { carrot_cake: 10 }, s => s.homes.length >= 8, () => {}],
  cottage(9, 6500, { carrot_cake: 10 }, () => true),
  cottage(10, 8000, { carrot_cake: 12 }, () => true),
  ['Company office', 15000, { carrot_cake: 15, corn_bread: 20 }, s => s.homes.length >= 10, () => {}],
  ['Festival stage', 20000, { carrot_cake: 20, milk: 20 }, () => true, () => {}],
];

// ── State ──
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const s = { t: 0, coins: 0, xp: 0, level: 1, beds: 0, plots: [], barn: { wheat: 6 }, cap: 50, barnUps: 0, has: {}, animals: { hen: 0, cow: 0 }, fed: [],
  queues: { feed_mill: [], bakery: [] }, slots: { feed_mill: 2, bakery: 2, board: 3 }, homes: [], rentAt: 0, step: 0, orders: [], orderCoins: 0, log: [] };
const stock = k => s.barn[k] ?? 0, total = () => Object.values(s.barn).reduce((a, b) => a + b, 0);
const add = (k, n) => { s.barn[k] = stock(k) + n; };
const take = needs => { for (const [k, n] of Object.entries(needs)) if (stock(k) < n) return false; for (const [k, n] of Object.entries(needs)) s.barn[k] -= n; return true; };
const gainXp = n => { s.xp += n; while (s.xp >= xpFor(s.level + 1)) s.level++; };
const unlocked = () => [...Object.keys(CROPS).filter(k => CROPS[k].level <= s.level),
  ...Object.keys(RECIPES).filter(k => RECIPES[k].level <= s.level && s.has[RECIPES[k].at] && (k !== 'cow_feed' || s.has.cow_barn)),
  ...(s.animals.hen ? ['egg'] : []), ...(s.animals.cow ? ['milk'] : [])].filter(k => !k.endsWith('_feed'));
function newOrder() {
  const items = unlocked(), kinds = 1 + Math.floor(rnd() * Math.min(3, items.length)), target = 16 + s.level * 14, need = {};
  for (let i = 0; i < kinds; i++) { const k = items[Math.floor(rnd() * items.length)]; need[k] = (need[k] ?? 0) + Math.max(1, Math.round(target / kinds / VALUE[k])); }
  const worth = Object.entries(need).reduce((a, [k, n]) => a + VALUE[k] * n, 0);
  return { need, coins: Math.round(worth * ORDER_PAY), xp: Math.max(1, Math.round(worth * ORDER_XP)), seen: 0, readyAt: s.t };
}
function collect() {
  for (const p of s.plots) if (p.crop && p.at <= s.t) { add(p.crop, 2); gainXp(1); p.crop = null; }
  for (const [b, q] of Object.entries(s.queues)) while (q.length && q[0].at <= s.t) { const j = q.shift(); add(j.item, RECIPES[j.item].out); gainXp(Math.ceil(RECIPES[j.item].value / 4)); }
  s.fed = s.fed.filter(f => { if (f.at <= s.t) { add(ANIMALS[f.kind].gives, 1); gainXp(2); return false; } return true; });
  if (s.homes.length) { const hours = Math.min(8, (s.t - s.rentAt) / 60); s.coins += Math.round(hours * s.homes.reduce((a, lv) => a + RENT[lv], 0) * CHARM); }
  s.rentAt = s.t;
}
function deliver() {
  while (s.orders.length < s.slots.board) s.orders.push(newOrder());
  const held = STEPS[s.step]?.[3](s) ? STEPS[s.step][2] : {};
  const free = o => Object.entries(o.need).every(([k, n]) => stock(k) - (held[k] ?? 0) >= n);
  for (const o of s.orders) if (o.readyAt <= s.t && !o.done && free(o) && take(o.need)) { o.done = true; s.coins += o.coins; s.orderCoins += o.coins; gainXp(o.xp); }
  s.orders = s.orders.filter(o => !o.done).map(o => (o.seen++ > 6 ? newOrder() : o)); // discard orders stuck for a day or two
}
// What the player wants in stock: open orders plus the next build step's goods plus feed and replanting.
function wants() {
  const w = { wheat: 12, carrot: 6, corn: 8, chicken_feed: s.animals.hen, cow_feed: s.animals.cow };
  for (const o of s.orders) for (const [k, n] of Object.entries(o.need)) w[k] = (w[k] ?? 0) + n;
  const step = STEPS[s.step]; if (step) for (const [k, n] of Object.entries(step[2])) w[k] = (w[k] ?? 0) + n;
  // inputs of wanted products
  for (const [k, r] of Object.entries(RECIPES)) { const short = Math.max(0, (w[k] ?? 0) - stock(k)); if (short) for (const [i, n] of Object.entries(r.needs)) w[i] = (w[i] ?? 0) + Math.ceil(short / r.out) * n; }
  return w;
}
function work(gapMin) {
  const w = wants();
  for (const [kind, a] of Object.entries(ANIMALS)) { const busy = s.fed.filter(f => f.kind === kind).length; for (let i = busy; i < s.animals[kind]; i++) if (take({ [a.eats]: 1 })) s.fed.push({ kind, at: s.t + a.min }); }
  for (const [b, q] of Object.entries(s.queues)) {
    if (!s.has[b]) continue;
    while (q.length < s.slots[b]) {
      const options = Object.entries(RECIPES).filter(([k, r]) => r.at === b && r.level <= s.level && (k !== 'cow_feed' || s.has.cow_barn))
        .map(([k, r]) => [k, r, (w[k] ?? 0) - stock(k) - q.filter(j => j.item === k).length * r.out]).filter(x => x[2] > 0).sort((a, b) => b[2] * VALUE[b[0]] - a[2] * VALUE[a[0]]);
      const pick = options.find(([, r]) => Object.entries(r.needs).every(([i, n]) => stock(i) >= n)); if (!pick) break;
      take(pick[1].needs); q.push({ item: pick[0], at: (q.length ? q[q.length - 1].at : s.t) + pick[1].min });
    }
  }
  for (const p of s.plots) if (!p.crop) {
    // Wheat is always free to plant; another crop the player has run out of is bought at its base value (DESIGN 5).
    const crops = Object.entries(CROPS).filter(([k, c]) => c.level <= s.level && (k === 'wheat' || stock(k) > 0 || s.coins >= c.value));
    const short = crops.filter(([k]) => stock(k) < (w[k] ?? 0)).sort((a, b) => ((w[b[0]] ?? 0) - stock(b[0])) - ((w[a[0]] ?? 0) - stock(a[0])))[0];
    const best = crops.filter(([, c]) => c.min <= Math.max(gapMin, 5)).sort((a, b) => b[1].value - a[1].value)[0];
    const pick = short ?? best; if (!pick) continue;
    if (pick[0] !== 'wheat') { if (stock(pick[0]) > 0) s.barn[pick[0]]--; else s.coins -= pick[1].value; }
    p.crop = pick[0]; p.at = s.t + pick[1].min;
  }
  if (total() > s.cap) { // sell the cheapest surplus at the roadside stall (base value)
    const extra = Object.entries(s.barn).filter(([k, n]) => n > (w[k] ?? 0)).sort((a, b) => VALUE[a[0]] - VALUE[b[0]]);
    for (const [k, n] of extra) { const sell = Math.min(n - (w[k] ?? 0), total() - s.cap); if (sell > 0) { s.barn[k] -= sell; s.coins += sell * VALUE[k]; } }
  }
}
function spend() {
  for (let guard = 0; guard < 60; guard++) {
    const step = STEPS[s.step];
    if (step && step[3](s)) { if (s.coins >= step[1] && take(step[2])) { s.coins -= step[1]; step[4](s); s.log.push([s.t, step[0]]); s.step++; while (s.plots.length < s.beds) s.plots.push({}); continue; } else if (s.coins < step[1] + 50) return; }
    // The project card links to what is missing ("Needs bread → build a bakery"), so that comes before saving up.
    if (!s.has.bakery && s.level >= 3 && s.has.feed_mill && s.coins >= 150) { s.coins -= 150; s.has.bakery = 1; continue; }
    // keep a reserve for the next step once it is in reach
    const reserve = step && step[3](s) ? step[1] : 0, free = s.coins - reserve;
    const nextBed = s.beds + 1, bedsWanted = Math.min(MAX_BEDS, 6 + 3 * s.level);
    if (s.beds >= 6 && s.beds < bedsWanted && free >= bedCost(nextBed)) { s.coins -= bedCost(nextBed); s.beds++; s.plots.push({}); continue; }
    if (s.has.coop && s.animals.hen < ANIMALS.hen.max && free >= ANIMALS.hen.cost) { s.coins -= ANIMALS.hen.cost; s.animals.hen++; continue; }
    if (s.has.cow_barn && s.level >= 6 && s.animals.cow < ANIMALS.cow.max && free >= ANIMALS.cow.cost) { s.coins -= ANIMALS.cow.cost; s.animals.cow++; continue; }
    const b = ['bakery', 'feed_mill'].find(b => s.has[b] && s.slots[b] < 6 && free >= slotCost[s.slots[b]]); if (b) { s.coins -= slotCost[s.slots[b]]; s.slots[b]++; continue; }
    if (reserve) return;
    const h = s.homes.findIndex(lv => lv < 2 && free >= UPGRADE[lv + 1]); if (h >= 0) { s.coins -= UPGRADE[s.homes[h] + 1]; s.homes[h]++; continue; }
    if (total() > s.cap * 0.8 && free >= barnCost(s.barnUps)) { s.coins -= barnCost(s.barnUps); s.barnUps++; s.cap += 25; continue; }
    if (s.level >= 4 && s.slots.board < 6 && s.level >= [0, 0, 0, 3, 5, 7][s.slots.board]) { s.slots.board++; continue; }
    return;
  }
}
// ── Run ──
const day = 24 * 60, steps = [];
for (let d = 0; d < DAYS; d++) VISITS.forEach(([h, len], i) => {
  const start = d * day + h * 60, next = VISITS[i + 1] ? d * day + VISITS[i + 1][0] * 60 : (d + 1) * day + VISITS[0][0] * 60;
  for (let m = 0; m <= len; m += 3) { s.t = start + m; collect(); deliver(); spend(); work(m + 3 > len ? next - s.t : 3); }
  if (TRACE && i === VISITS.length - 1) console.log(`  end of day ${d + 1}: level ${s.level}, ${s.coins} coins, ${s.beds} beds, ${s.animals.hen} hens, ${s.animals.cow} cows, homes ${s.homes}, order coins ${s.orderCoins}, next ${STEPS[s.step]?.[0]}`);
});
const fmt = t => `day ${Math.floor(t / day) + 1}`;
console.log(`profile ${profile}: ${VISITS.length} visits a day, ${VISITS.reduce((a, v) => a + v[1], 0)} minutes a day`);
for (const [t, name] of s.log) console.log(`  ${fmt(t).padEnd(7)} ${name}`);
console.log(`after ${DAYS} days: level ${s.level}, ${s.coins} coins, ${s.beds} beds, ${s.animals.hen} hens, ${s.animals.cow} cows, ${s.homes.length} homes, steps ${s.step}/${STEPS.length}`);
