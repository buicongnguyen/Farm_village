// The Today board (DESIGN 14): a daily gift on a 7-day rotation (no streak to lose), what happened while away, and the
// streak garden: every game day you visit plants one more flower north of the farmhouse. Days are only ever added, the
// flowers can't be moved, stored or lost, and missing a day just means no flower that day.
import { dayKey } from './clock.mjs';
import * as barn from './barn.mjs';
import { rentWaiting } from './homes.mjs';
import { currentStep, stepReady } from './projects.mjs';
import { gardenCells } from './reserved.mjs';
import { ripeTrees } from './trees.mjs';
import { occupant, touch } from './grid.mjs';
import { hash } from './rng.mjs';
import { BEATS, CHAPTERS } from '../content/story.mjs';

export const GIFTS = [
  { coins: 50 }, { goods: { wheat: 10 } }, { stored: { flowers: 2 } }, { goods: { chicken_feed: 6 } },
  { coins: 100 }, { goods: { carrot: 8 } }, { stored: { bench: 1 } },
];
export function tickToday(ctx) {
  const { s, now } = ctx, key = dayKey(now);
  if (s.today.day && key <= s.today.day) return;   // the same day, or a clock moved back: a day is only ever added (YYYY-MM-DD sorts)
  const first = !s.today.day;
  s.today.day = key; s.today.giftDay = first ? 0 : (s.today.giftDay + 1) % GIFTS.length; s.today.claimed = false; s.today.seen = false;
  s.today.days = (s.today.days ?? 0) + 1;
  ctx.emit('newDay', { day: key, gift: GIFTS[s.today.giftDay], days: s.today.days });
  plantGardenFlower(ctx, key);
}
/** Garden flowers already planted (placed items of kind garden_flower). */
export const gardenFlowers = s => Object.values(s.placed).filter(p => p.kind === 'garden_flower').length;
/** One flower for today in the first free garden cell (the garden holds 48; after that the days still count). */
function plantGardenFlower(ctx, day) {
  const { s } = ctx, cell = gardenCells().find(([x, z]) => !occupant(s, x, z)); if (!cell) return;
  const [x, z] = cell, id = `p${s.nextId++}`, rot = hash(s.createdAt, day) % 4;
  s.placed[id] = { kind: 'garden_flower', x, z, rot, garden: true, day };
  s.counts.garden_flower = (s.counts.garden_flower ?? 0) + 1; touch(s);
  ctx.emit('gardenFlower', { id, x, z, days: s.today.days });
}
/** What is waiting: ready beds, animals and products, and rent. */
export function waiting(s, now) {
  const beds = Object.values(s.beds).filter(b => b.doneAt <= now).length;
  const animals = Object.values(s.animals).flat().filter(a => a.doneAt != null && a.doneAt <= now).length;
  const products = Object.values(s.production).reduce((n, q) => n + q.queue.filter(j => j.doneAt <= now).length, 0);
  return { beds, animals, products, fruit: ripeTrees(s, now).length, rent: rentWaiting(s, now) };
}
export function board(s, now) {
  const step = currentStep(s);
  return { day: s.today.day, gift: GIFTS[s.today.giftDay], claimed: !!s.today.claimed, waiting: waiting(s, now), next: step && { id: step.id, ready: stepReady(s, now) } };
}
export const actions = {
  /** Tutorial progress: { step } moves to that step; { skip: true } ends the tutorial. */
  tutorial(ctx, { step, skip }) {
    if (skip !== true && !(Number.isInteger(step) && step >= 0)) return ctx.fail('Unknown action');
    const st = ctx.s.story; st.tutorial = skip === true ? 99 : Math.max(st.tutorial ?? 0, step); return { tutorial: st.tutorial };
  },
  /** Change a setting: { key, value } (DESIGN 17). */
  setting(ctx, { key, value }) {
    const ok = { daylight: ['real', 'always'], textSize: [1, 1.15, 1.3], reducedMotion: [true, false], quality: ['auto', 'low', 'high'] };
    if (key === 'sound' || key === 'music') { const v = Number(value); if (!(v >= 0 && v <= 1)) return ctx.fail('Unknown setting'); ctx.s.settings[key] = v; return {}; }
    const v = key === 'textSize' ? Number(value) : key === 'reducedMotion' ? value === true || value === 'true' : value;
    if (!ok[key]?.includes(v)) return ctx.fail('Unknown setting');
    ctx.s.settings[key] = v; ctx.emit('settingChanged', { key, value: v }); return {};
  },
  /** A chapter card was shown. */
  chapterSeen(ctx, { id }) {
    if (!CHAPTERS.some(c => c.id === id)) return ctx.fail('Unknown story moment');
    const st = ctx.s.story; st.chapter = Math.max(st.chapter ?? 0, id); return { chapter: st.chapter };
  },
  /** A story beat (content/story.mjs BEATS) was shown: { id }. Each beat plays once; s.story.beats lists the seen ids. */
  beatSeen(ctx, { id }) {
    if (!BEATS.some(b => b.id === id)) return ctx.fail('Unknown story moment');
    const st = ctx.s.story, seen = (st.beats ??= []); if (!seen.includes(id)) seen.push(id);
    return { beats: [...seen] };
  },
  /** The Today board was seen today (it opens by itself only once a day). */
  seeToday(ctx) { ctx.s.today.seen = true; return {}; },
  claimGift(ctx) {
    const { s } = ctx; if (s.today.claimed) return ctx.fail('Come back tomorrow for a new gift');
    const g = GIFTS[s.today.giftDay];
    // the gift waits (it is not lost) while the barn has no room for all of it
    if (Object.values(g.goods ?? {}).reduce((a, b) => a + b, 0) > barn.space(s)) return ctx.fail('The barn is full');
    if (g.coins) s.coins += g.coins;
    for (const [id, n] of Object.entries(g.goods ?? {})) barn.add(s, id, n);
    for (const [kind, n] of Object.entries(g.stored ?? {})) s.stored[kind] = (s.stored[kind] ?? 0) + n;
    s.today.claimed = true; s.today.seen = true;
    ctx.emit('giftClaimed', g);
    return g;
  },
};
