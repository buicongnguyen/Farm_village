// AI neighbours (DESIGN 9.3): scripted, seeded per day, never rude. They visit and help crops grow, comment on what they
// really see, and offer one trade a day.
import { NEIGHBOURS as LIST } from '../content/people.mjs';
import { NEIGHBOURS as N, MIN } from '../content/economy.mjs';
import { GOODS } from '../content/goods.mjs';
import { dayKey } from './clock.mjs';
import { rng, hash } from './rng.mjs';
import * as barn from './barn.mjs';

const dayStart = now => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** Plan a neighbour's day: visit times between 08:00 and 21:00 and the trade offer. Same day + same save = same plan. */
export function planDay(s, id, now) {
  const key = dayKey(now), r = rng(hash(s.createdAt, id, key)), base = dayStart(now), info = LIST.find(n => n.id === id);
  const visits = Array.from({ length: N.visitsPerDay }, () => base + (8 * 60 + r.int(13 * 60)) * MIN).sort((a, b) => a - b);
  const gives = r.pick(info.gives), wants = r.pick(info.wants);
  const wantN = 3 + r.int(4), giveN = Math.max(1, Math.round((wantN * GOODS[wants].value * 1.2) / GOODS[gives].value));
  return { day: key, visits, visited: 0, trade: gives === wants ? null : { gives: { [gives]: giveN }, wants: { [wants]: wantN }, state: 'open' } };
}
/** What a neighbour says on a visit, chosen from what is really on the land (DESIGN 9.3). */
export function commentFor(s, id) {
  const info = LIST.find(n => n.id === id), c = info.comments;
  const facts = [(s.counts.bed ?? 0) >= 10, (s.counts.path ?? 0) >= 6, Object.keys(s.beds).length >= 6, (s.counts.cottage ?? 0) >= 1];
  const true_ = facts.map((f, i) => f ? i : -1).filter(i => i >= 0);
  return c[true_.length ? true_[hash(s.stats.harvested, id) % true_.length] : 0];
}
export function tickNeighbours(ctx) {
  const { s, now } = ctx;
  for (const { id } of LIST) {
    let n = s.neighbours[id];
    if (!n || n.day !== dayKey(now)) n = s.neighbours[id] = { friendship: n?.friendship ?? 0, ...planDay(s, id, now) };
    while (n.visited < n.visits.length && n.visits[n.visited] <= now) {
      n.visited++;
      // help: the beds that will take longest grow 30 minutes faster (never past now)
      const growing = Object.entries(s.beds).filter(([, b]) => b.doneAt > now).sort((a, b) => b[1].doneAt - a[1].doneAt).slice(0, N.helpBeds);
      for (const [, b] of growing) b.doneAt = Math.max(now, b.doneAt - N.helpMs);
      ctx.emit('neighbourVisit', { id, helped: growing.length, comment: commentFor(s, id) });
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
