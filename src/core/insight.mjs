// The big picture: a whole farm at a glance, worked out from the save and the content alone (pure, no DOM).
//   productMap(s)   what is made from what, in columns (grown → made → made from made), with what you can already do
//   scores(s, now)  seven sides of the farm as 0–100, each with what it counted
//   bestMakes(s)    the recipes that add the most value a minute at your level
//   growth(s)       what each level brought, from the marks levels.mjs leaves at every level-up (s.insight.levels)
//   praise(s)       what your work has meant to the family and the village, in your own numbers
// It never scolds: a low score is "the next thing to grow", and every page opens with what went well.
// (Today's sums, the evening report of chapter 10, are core/report.mjs: a different thing.)
import { CROPS, FRUITS, ANIMALS, RECIPES, GOODS } from '../content/goods.mjs';
import { BUILDINGS } from '../content/buildings.mjs';

const MIN = 60_000;
const has = (s, kind) => Object.values(s.placed ?? {}).some(p => p.kind === kind);
const valueOf = g => GOODS[g]?.value ?? RECIPES[g]?.value ?? CROPS[g]?.value ?? FRUITS[g]?.value ?? 0;
/** Every good the farm can make and what it is made from: { id: { from: [ids], at: building|null, level } }. */
export function makes() {
  const out = {};
  for (const [id, c] of Object.entries(CROPS)) if (!c.skill) out[id] = { from: [], at: 'bed', level: c.level ?? 1 };
  for (const [id, f] of Object.entries(FRUITS)) if (!f.cross) out[id] = { from: [], at: f.tree, level: f.level ?? 1 };
  for (const [id, r] of Object.entries(RECIPES)) out[id] = { from: Object.keys(r.needs ?? {}), at: r.at, level: r.level ?? 1 };
  for (const a of Object.values(ANIMALS)) if (a.gives) out[a.gives] = { from: a.eats ? [a.eats] : [], at: a.home, level: a.level ?? 1 };
  for (const g of Object.values(out)) g.from = g.from.filter(f => out[f]);
  return out;
}
/** The map of products up to a little past your level: columns of goods (0 = grown, 1 = made, 2+ = made from made things)
 *  and the lines between them. A good is `open` at your level and `ready` when the place that makes it stands. */
export function productMap(s, ahead = 2) {
  const all = makes(), tier = {}, seen = new Set();
  const depth = id => { if (tier[id] !== undefined) return tier[id]; if (seen.has(id)) return 0; seen.add(id); return (tier[id] = all[id].from.length ? 1 + Math.max(...all[id].from.map(depth)) : 0); };
  const shown = Object.keys(all).filter(id => all[id].level <= (s.level ?? 1) + ahead), keep = new Set(shown), cols = [];
  for (const id of shown) (cols[depth(id)] ??= []).push({ id, level: all[id].level, at: all[id].at, open: all[id].level <= (s.level ?? 1), ready: all[id].at === 'bed' || has(s, all[id].at), have: s.barn?.items?.[id] ?? 0 });
  for (let i = 0; i < cols.length; i++) (cols[i] ??= []).sort((a, b) => a.level - b.level || (a.id < b.id ? -1 : 1));
  return { cols, edges: shown.flatMap(id => all[id].from.filter(f => keep.has(f)).map(f => [f, id])) };
}
/** Everything a good is made from and everything made from it (to light one chain of the map). */
export function chainOf(map, id) {
  const up = new Set([id]), down = new Set([id]);
  for (let grew = true; grew;) { grew = false; for (const [a, b] of map.edges) { if (up.has(b) && !up.has(a)) { up.add(a); grew = true; } if (down.has(a) && !down.has(b)) { down.add(b); grew = true; } } }
  return new Set([...up, ...down]);
}
const pct = (a, b) => b > 0 ? Math.round(100 * Math.min(1, a / b)) : 0;
/** Seven sides of the farm, 0–100: { id, name, score, text, params, tip }. `tip` is the next thing to grow there. */
export function scores(s, now) {
  const placed = Object.entries(s.placed ?? {}), level = s.level ?? 1;
  const beds = placed.filter(([, p]) => p.kind === 'bed').length, sown = Object.values(s.beds ?? {}).filter(Boolean).length;
  const animals = Object.values(s.animals ?? {}).flat(), fed = animals.filter(a => a.doneAt != null).length;
  const makers = placed.filter(([, p]) => BUILDINGS[p.kind]?.produces), busy = makers.filter(([id]) => (s.production?.[id]?.queue ?? []).length > 0).length;
  const open = Object.values(RECIPES).filter(r => (r.level ?? 1) <= level), can = open.filter(r => has(s, r.at)).length;
  const homes = Object.values(s.homes ?? {}), families = homes.filter(h => h.family && (h.arrivesAt ?? 0) <= now).length;
  const ups = Object.values(s.outputUp ?? {}).reduce((n, v) => n + (v || 0), 0), upMax = 4 * (makers.length + Object.keys(s.animals ?? {}).length);
  const trees = placed.filter(([, p]) => BUILDINGS[p.kind]?.fruit).length, wanted = 4 + level * 2;
  return [
    { id: 'fields', name: 'Fields', score: pct(sown, beds), text: '{a} of {b} beds are growing', params: { a: sown, b: beds }, tip: 'Sow the empty beds before you leave the farm: a bed at rest earns nothing.' },
    { id: 'animals', name: 'Animals', score: pct(fed, animals.length), text: animals.length ? '{a} of {b} animals are fed' : 'No animals yet', params: { a: fed, b: animals.length }, tip: animals.length ? 'One sack of feed lasts ten collections. Keep feed in the barn and nobody waits.' : 'A coop of hens is the first steady income on a farm.' },
    { id: 'workshops', name: 'Workshops', score: pct(busy, makers.length), text: makers.length ? '{a} of {b} workshops are at work' : 'No workshops yet', params: { a: busy, b: makers.length }, tip: 'A made thing sells for far more than what goes into it. Keep every workshop’s queue full.' },
    { id: 'range', name: 'Range of goods', score: pct(can, open.length), text: 'You can make {a} of the {b} recipes open at your level', params: { a: can, b: open.length }, tip: 'Build the workshop you are missing: each one opens a new chain on the product map.' },
    { id: 'orchard', name: 'Orchard', score: pct(trees, wanted), text: '{a} fruit trees', params: { a: trees }, tip: 'Fruit trees pay again and again for one planting. A few more would lift every market day.' },
    { id: 'upgrades', name: 'Upgrades', score: pct(ups, upMax), text: '{a} output upgrades of {b}', params: { a: ups, b: upMax }, tip: 'Each output upgrade doubles what a workshop or an animal home gives for the same feed and time.' },
    { id: 'village', name: 'Village', score: pct(families, homes.length), text: '{a} of {b} homes have a family', params: { a: families, b: homes.length }, tip: 'A repaired cottage brings a family, and a family brings rent, orders and friends.' },
  ];
}
/** The recipes open to you that add the most value a minute: [{ id, at, gain, perMin, ready }], best first. */
export function bestMakes(s, n = 3) {
  return Object.entries(RECIPES).filter(([, r]) => (r.level ?? 1) <= (s.level ?? 1) && r.value > 0).map(([id, r]) => {
    const cost = Object.entries(r.needs ?? {}).reduce((sum, [g, k]) => sum + valueOf(g) * k, 0), gain = r.value * (r.makes ?? 1) - cost;
    return { id, at: r.at, gain, perMin: Math.round(gain / Math.max(0.05, r.timeMs / MIN) * 10) / 10, ready: has(s, r.at) };
  }).filter(x => x.gain > 0).sort((a, b) => b.perMin - a.perMin).slice(0, n);
}
/** The crops open to you that earn the most a minute in a bed: [{ id, perMin }]. */
export function bestCrops(s, n = 2) {
  return Object.entries(CROPS).filter(([, c]) => !c.skill && (c.level ?? 1) <= (s.level ?? 1) && c.value > 0)
    .map(([id, c]) => ({ id, perMin: Math.round(c.value / Math.max(0.05, c.growMs / MIN) * 10) / 10 })).sort((a, b) => b.perMin - a.perMin).slice(0, n);
}
/** What each level brought: [{ level, coins, made, orders, minutes }] from the marks left at each level-up. */
export function growth(s) {
  const marks = s.insight?.levels ?? [], out = [];
  for (let i = 1; i < marks.length; i++) { const a = marks[i - 1], b = marks[i]; out.push({ level: b.l, coins: Math.max(0, b.c - a.c), made: Math.max(0, b.m - a.m), orders: Math.max(0, b.o - a.o), minutes: Math.max(1, Math.round((b.ms - a.ms) / MIN)) }); }
  return out.slice(-12);
}
/** The last two levels against the two before: coins an hour going 'up', 'down' or 'steady' (null: too soon to say). */
export function trend(s) {
  const g = growth(s), rate = x => x.coins / x.minutes, late = g.slice(-2), early = g.slice(-4, -2); if (g.length < 3 || !early.length) return null;
  const a = early.reduce((n, x) => n + rate(x), 0) / early.length, b = late.reduce((n, x) => n + rate(x), 0) / late.length;
  return { dir: b > a * 1.15 ? 'up' : b < a * 0.85 ? 'down' : 'steady', perHour: Math.round(b * 60) };
}
/** What your work has meant, in your own numbers: lines for the top of the page (always at least one). */
export function praise(s, now) {
  const st = s.stats ?? {}, families = Object.values(s.homes ?? {}).filter(h => h.family && (h.arrivesAt ?? 0) <= now).length, out = [];
  if (st.ordersFilled > 0) out.push(['You have filled {n} orders. That is {n} suppers on village tables because of you.', { n: st.ordersFilled }]);
  if (families > 0) out.push(['{n} families live in the village again. They came because your farm made it a place to stay.', { n: families }]);
  if (st.harvested > 0) out.push(['{n} harvests have come off your fields, every one of them by your own hand.', { n: st.harvested }]);
  if (st.produced > 0) out.push(['Your workshops have made {n} things. The family has never eaten or sold so well.', { n: st.produced }]);
  if (st.gifts > 0) out.push(['You have given {n} gifts. People here remember who was kind to them.', { n: st.gifts }]);
  if (!out.length) out.push(['You came, and the farm woke up. That alone is the best news this valley has had in years.', {}]);
  return out.slice(0, 3);
}
