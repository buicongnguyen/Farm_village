// The valley fair (chapter 18, docs/plan/ch18-the-valley-fair.md). Once the valley company is founded the farm can hold
// a fair on the village square: three valleys send their best, and the farm enters one good in each of three classes
// (Field, Kitchen, Pond), each judged by a villager. A score is made of parts the player can see and work on: how fine
// the good is, how well the farm knows it (how much of it was grown, made, picked or caught) and whether the judge has
// a taste for it; and a small wobble, the same for a given fair. Three rivals, named only by their valley, score a
// little higher at every fair. Gold, silver and bronze: a ribbon and a prize each. Then the valleys rest for everyMs.
//   s.fair = { n, at, until, over, ribbons, best: { [class]: medal }, entry: { [class]: good },
//              last: { n, results: { [class]: { good, score, parts, place, medal, rivals: [score per valley] } } } }
//   n: fairs held; at/until: the fair running or last held; over: n when its end was told; ribbons: medals won in all
import { FAIR } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import * as barn from './barn.mjs';
import { giftable, addHearts } from './bonds.mjs';
import { gainXp } from './levels.mjs';
import { rng, hash } from './rng.mjs';

export const CLASSES = Object.keys(FAIR.classes), MEDALS = ['gold', 'silver', 'bronze'];
const goodsOf = cls => Object.keys(GOODS).filter(g => FAIR.classes[cls].kinds.includes(GOODS[g].kind));
const RANGE = Object.fromEntries(CLASSES.map(cls => { const v = goodsOf(cls).map(g => GOODS[g].value); return [cls, [Math.min(...v), Math.max(...v)]]; }));
/** The class a good belongs in, or null (eggs, milk and feed are in none). */
export const classOf = good => CLASSES.find(cls => FAIR.classes[cls].kinds.includes(GOODS[good]?.kind)) ?? null;
/** How much of a good the farm has grown, made, picked or caught: what knowing it is counted from. */
export const knownOf = (s, good) => (s.stats?.grown?.[good] ?? 0) + (s.album?.fruit?.[good] ?? 0) + (s.album?.fish?.[good] ?? 0);
/** A score's parts, whole numbers: { base, know, taste, sum }. Pure; more grown never scores less. */
export function partsOf(s, cls, good) {
  const c = FAIR.classes[cls], [lo, hi] = RANGE[cls], [b0, b1] = FAIR.base;
  const base = Math.round(b0 + (b1 - b0) * (hi > lo ? Math.log(GOODS[good].value / lo) / Math.log(hi / lo) : 1));
  const know = Math.round(FAIR.know * Math.min(1, Math.log1p(Math.max(0, knownOf(s, good))) / Math.log1p(c.knowAt)));
  const taste = c.likes.includes(good) ? FAIR.taste : 0;
  return { base, know, taste, sum: base + know + taste };
}
/** The hint the picker shows for a score's parts: one to five stars, never the number. */
export const starsOf = sum => Math.max(1, Math.min(5, 1 + Math.round((sum - FAIR.base[0]) / (FAIR.base[1] + FAIR.know + FAIR.taste - FAIR.base[0]) * 4)));
/** The judges' mood at fair n in a class: a few points up or down, the same however often it is asked. */
export const wobbleOf = (seed, n, cls) => Math.round((rng(hash(seed, 'fair', n, cls))() * 2 - 1) * FAIR.wobble);
/** The three rival valleys' scores at fair n (0 = the first) in a class, in FAIR.valleys' order: seeded, and rising a
 *  little with every fair. Which valley sends the strongest entry changes with the class and the fair. Pure. */
export function rivalsOf(seed, n, cls) {
  const r = FAIR.rivals, next = rng(hash(seed, 'rivals', n, cls)), turn = n + CLASSES.indexOf(cls);
  return FAIR.valleys.map((_, i) => Math.round(r.from + r.step * Math.min(n, r.steps) + r.spread * ((i + turn) % FAIR.valleys.length) + next() * r.wobble));
}
/** What the barn can enter in a class: [{ good, parts, stars }], the most promising first. */
export function optionsOf(s, cls) {
  return goodsOf(cls).filter(g => barn.free(s, g) >= FAIR.each).map(good => { const parts = partsOf(s, cls, good); return { good, parts, stars: starsOf(parts.sum) }; })
    .sort((a, b) => b.parts.sum - a.parts.sum || GOODS[b.good].value - GOODS[a.good].value || (a.good < b.good ? -1 : 1));
}
export const fairOpen = s => !!s.valley?.founded;
const fresh = () => ({ n: 0, at: null, until: null, ribbons: 0, best: {}, entry: {} });
/** Where the fair stands. Pure: { open, active, until, readyAt, held, fee, classes: [{ id, name, judge, likes, options,
 *  entry }], entries, ok, reason, params, last, ribbons, best, at }. An entry is the one chosen while the barn still has it,
 *  else the most promising one. */
export function fairOf(s, now) {
  const f = s.fair, open = fairOpen(s), active = !!f && Number.isFinite(f.until) && now >= f.at && now < f.until;
  const readyAt = f && Number.isFinite(f.at) ? f.at + FAIR.everyMs : 0;
  const classes = CLASSES.map(id => { const options = optionsOf(s, id), chosen = options.find(o => o.good === f?.entry?.[id]) ?? options[0] ?? null; return { id, ...FAIR.classes[id], options, entry: chosen?.good ?? null }; });
  const entries = classes.filter(c => c.entry).length;
  const why = !open ? ['Found the valley company first'] : active ? ['The fair is on'] : now < readyAt ? ['The three valleys are resting after the last fair']
    : !entries ? ['The fair needs an entry: {each} of a crop, a food or a fish', { each: FAIR.each }] : s.coins < FAIR.fee ? ['Not enough coins'] : null;
  return { open, active, at: f?.at ?? 0, until: active ? f.until : 0, readyAt, held: f?.n ?? 0, fee: FAIR.fee, classes, entries, ok: !why, reason: why?.[0] ?? null, params: why?.[1] ?? null,
    last: f?.last ?? null, ribbons: f?.ribbons ?? 0, best: f?.best ?? {} };
}
/** Called by tick(): the fair's end is told once, and counted (chapter 18 closes after a fair with a ribbon is over). */
export function tickFair(ctx) {
  const { s, now } = ctx, f = s.fair; if (!f || !f.n || f.over === f.n || !(now >= f.until)) return;
  f.over = f.n; s.stats.fairs = (s.stats.fairs ?? 0) + 1;
  ctx.emit('fairEnded', { n: f.n, ribbons: Object.values(f.last?.results ?? {}).filter(r => r.medal).length });
}
export const actions = {
  /** Choose what to enter in a class: { cls, good }. It stays chosen while the barn has enough of it. */
  chooseEntry(ctx, { cls, good } = {}) {
    const { s } = ctx; if (!fairOpen(s)) return ctx.fail('Found the valley company first');
    if (!FAIR.classes[cls] || classOf(good) !== cls) return ctx.fail('That does not belong in this class');
    if (barn.free(s, good) < FAIR.each) return ctx.fail('The fair needs {each} of it', { each: FAIR.each });
    ((s.fair ??= fresh()).entry ??= {})[cls] = good;
    return { cls, good };
  },
  /** Open the fair: the entries leave the barn, the judges go round, the ribbons and the prizes are given. */
  holdFair(ctx) {
    const { s, now } = ctx, st = fairOf(s, now); if (!st.ok) return ctx.fail(st.reason, st.params);
    const f = (s.fair ??= fresh()), n = f.n, results = {}, firsts = []; let coins = 0, won = 0;
    f.best ??= {};
    for (const c of st.classes) {
      if (!c.entry) continue;
      const parts = partsOf(s, c.id, c.entry), score = parts.sum + wobbleOf(s.createdAt, n, c.id), rivals = rivalsOf(s.createdAt, n, c.id);
      const place = 1 + rivals.filter(r => r > score).length, medal = MEDALS[place - 1] ?? null;   // a tie goes to the home valley
      barn.take(s, { [c.entry]: FAIR.each });
      results[c.id] = { good: c.entry, score, parts, place, medal, rivals };
      if (!medal) continue;
      won++; coins += FAIR.prizes[medal];
      if (medal === 'gold' && f.best[c.id] !== 'gold') { firsts.push(c.id); coins += FAIR.firstGold; }
      if (!f.best[c.id] || MEDALS.indexOf(medal) < MEDALS.indexOf(f.best[c.id])) f.best[c.id] = medal;
      if (giftable(s, now).includes(c.judge)) addHearts(ctx, c.judge, FAIR.hearts, 'fair');
    }
    s.coins += coins - FAIR.fee; s.stats.coinsEarned += coins; gainXp(ctx, FAIR.xp);
    Object.assign(f, { n: n + 1, at: now, until: now + FAIR.lastsMs, ribbons: (f.ribbons ?? 0) + won, last: { n, results } });
    ctx.emit('fairHeld', { n: f.n, until: f.until, results, coins, ribbons: won, firsts });
    if (coins) ctx.emit('coins', { coins, source: 'fair' });
    return { results, coins, ribbons: won, until: f.until };
  },
};
