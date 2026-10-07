// AI neighbours (DESIGN 9.3): scripted, seeded per day, never rude. They visit and help crops grow, comment on what they
// really see, and offer one trade a day.
import { NEIGHBOURS as LIST, FAMILIES } from '../content/people.mjs';
import { NEIGHBOURS as N, MIN } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import { dayKey } from './clock.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';
import { animalCount } from './animals.mjs';
import { neighbourHelp } from './cart.mjs';

const dayStart = now => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** Plan a neighbour's day: visit times between 08:00 and 21:00 and the trade offer. Same day + same save = same plan. */
export function planDay(s, id, now) {
  const key = dayKey(now), r = rng(hash(s.createdAt, id, key)), base = dayStart(now), info = LIST.find(n => n.id === id);
  const visits = Array.from({ length: N.visitsPerDay }, () => base + (8 * 60 + r.int(13 * 60)) * MIN).sort((a, b) => a - b);
  const gives = r.pick(info.gives), wants = r.pick(info.wants);
  const wantN = 3 + r.int(4), giveN = Math.max(1, Math.round((wantN * GOODS[wants].value * 1.2) / GOODS[gives].value));
  return { day: key, visits, visited: 0, trade: gives === wants ? null : { gives: { [gives]: giveN }, wants: { [wants]: wantN }, state: 'open' } };
}
/** The newest family that has moved in (surname only, a name that needs no translation), or null. */
export function newestFamily(s) {
  const arrived = Object.values(s.homes).filter(h => h.family && h.arrived).map(h => FAMILIES.find(f => f.id === h.family)).filter(Boolean);
  const f = arrived[arrived.length - 1]; if (!f) return null;
  return f.surname ?? f.name.replace(/^The\s+/, '').replace(/\s+family$/, '');
}
const count = (s, ...kinds) => kinds.reduce((n, k) => n + (s.counts[k] ?? 0), 0);
/**
 * Facts a comment can be about: each gives a number (its {count}) when it is true of the land, else 0.
 * A comment in the content is a string (the first four answer beds, paths, growing and cottage, in that order, as in v0.1)
 * or { text, when: fact } with {count} and {family} placeholders.
 */
export const FACTS = {
  beds: s => count(s, 'bed') >= 10 ? count(s, 'bed') : 0,
  paths: s => count(s, 'path') >= 6 ? count(s, 'path') : 0,
  growing: s => Object.keys(s.beds).length >= 6 ? Object.keys(s.beds).length : 0,
  cottage: s => count(s, 'cottage'),
  hens: s => animalCount(s, 'hen'),
  cows: s => animalCount(s, 'cow'),
  families: s => Object.values(s.homes).filter(h => h.family && h.arrived).length,
  flowers: s => count(s, 'flowers', 'flowerpot') >= 3 ? count(s, 'flowers', 'flowerpot') : 0,
  trees: s => count(s, 'apple_tree', 'peach_tree'),
  decor: s => count(s, 'bench', 'lamp', 'fountain', 'scarecrow', 'hay_bale', 'picket', 'street_lamp', 'tree', 'bush'),
  bakery: s => count(s, 'bakery'),
  school: s => count(s, 'school'),
  garden: s => s.today?.days >= 3 ? s.today.days : 0,
};
const LEGACY = ['beds', 'paths', 'growing', 'cottage'];
/**
 * What a neighbour says on a visit (DESIGN 9.3), from what is really on the land: { text, params: { count, family } }.
 * `visit` is that neighbour's visit number (1, 2, 3 …): a neighbour's `arc` lines (or comments with `visit`) come first, in order.
 */
export function commentFor(s, id, visit = 0) {
  const info = LIST.find(n => n.id === id), list = (info.comments ?? []).map((c, i) => typeof c === 'string' ? { text: c, when: LEGACY[i] ?? null } : c);
  const family = newestFamily(s);
  const arc = info.arc?.[visit - 1] ?? list.find(c => c.visit === visit);
  if (arc) return { text: typeof arc === 'string' ? arc : arc.text, params: { count: 0, family } };
  // a comment counts when its fact is true; one that names {family} also needs a family in the village
  const facts = list.map(c => c.visit || (!family && /\{family\}/.test(c.text)) ? 0 : !c.when ? 1 : FACTS[c.when]?.(s) ?? 0);
  const true_ = facts.map((f, i) => f ? i : -1).filter(i => i >= 0);
  const i = true_.length ? true_[hash(s.stats.harvested, id) % true_.length] : 0;
  return { text: list[i]?.text ?? '', params: { count: facts[i] || 0, family } };
}
export function tickNeighbours(ctx) {
  const { s, now } = ctx;
  for (const { id } of LIST) {
    let n = s.neighbours[id];
    if (!n || n.day !== dayKey(now)) n = s.neighbours[id] = { friendship: n?.friendship ?? 0, total: n?.total ?? 0, ...planDay(s, id, now) };
    while (n.visited < n.visits.length && n.visits[n.visited] <= now) {
      n.visited++; n.total = (n.total ?? 0) + 1;
      // help: the beds that will take longest grow 30 minutes faster (never past now)
      const growing = Object.entries(s.beds).filter(([, b]) => b.doneAt > now).sort((a, b) => b[1].doneAt - a[1].doneAt).slice(0, N.helpBeds);
      for (const [, b] of growing) b.doneAt = Math.max(now, b.doneAt - N.helpMs);
      const said = commentFor(s, id, n.total), crate = neighbourHelp(ctx, id);
      // exactly one neighbourVisit per visit; `comment` is the English template for t(comment, params)
      ctx.emit('neighbourVisit', { id, helped: growing.length, comment: said.text, params: said.params, visit: n.total, crate });
    }
  }
}

export const actions = {
  /** Accept or decline today's trade: { id, accept }. */
  trade(ctx, { id, accept }) {
    const { s } = ctx, n = s.neighbours[id], t = n?.trade;
    if (!t || t.state !== 'open') return ctx.fail('No trade today');
    if (!accept) { t.state = 'declined'; return { declined: true }; }
    if (!barn.hasAll(s, t.wants)) return ctx.fail('Missing goods');
    const incoming = Object.values(t.gives)[0] - Object.values(t.wants)[0];
    if (incoming > barn.space(s)) return ctx.fail('The barn is full');
    barn.take(s, t.wants);
    for (const [g, k] of Object.entries(t.gives)) barn.add(s, g, k);
    t.state = 'done'; n.friendship = Math.min(10, n.friendship + 0.5);
    ctx.emit('traded', { id });
    return { done: true };
  },
};
