// Crop beds: plant (uses one crop from the barn, wheat is free), grow on real time, harvest two (DESIGN 5).
import { CROPS, TUTORIAL_FIRST_GROW_MS } from '../content/goods.mjs';
import { XP, WATERED } from '../content/economy.mjs';
import { wateredBed } from './grid.mjs';
import * as barn from './barn.mjs';
import { gainXp } from './levels.mjs';
import { cropOpen } from './learning-state.mjs';
export { cropOpen } from './learning-state.mjs';

export const bedState = (s, id, now) => {
  const b = s.beds[id]; if (!b) return { state: 'empty' };
  return b.doneAt <= now ? { state: 'ready', crop: b.crop } : { state: 'growing', crop: b.crop, leftMs: b.doneAt - now, progress: 1 - (b.doneAt - now) / CROPS[b.crop].growMs };
};
/** The price to plant a crop the player has none of (DESIGN 5 "never stuck"); 0 when it comes from the barn or is free. */
export const plantPrice = (s, crop) => CROPS[crop].free || barn.stock(s, crop) > 0 ? 0 : CROPS[crop].value;

export const actions = {
  /** Plant one bed, or many: { ids: [...] | id, crop }. */
  plant(ctx, { id, ids = [id], crop }) {
    if (!Array.isArray(ids)) ids = [];
    const { s, now } = ctx, c = CROPS[crop];
    if (!c) return ctx.fail('Unknown crop');
    if (s.level < c.level) return ctx.fail('Reach level {level} first', { level: c.level, crop, lock: 'level' });
    if (!cropOpen(s, crop)) return ctx.fail('Restore the potting bench to grow strawberries');
    let planted = 0;
    for (const bid of ids) {
      if (s.placed[bid]?.kind !== 'bed' || s.beds[bid]) continue;
      if (!c.free) {
        if (barn.stock(s, crop) > 0) barn.take(s, { [crop]: 1 }, false);
        else if (s.coins >= c.value) s.coins -= c.value;
        else { if (!planted) return ctx.fail('Not enough coins'); break; }
      }
      const first = crop === 'wheat' && s.story.firstWheat, bed = s.placed[bid], watered = !first && wateredBed(s, bed.x, bed.z);   // a pond nearby waters it (chapter 7)
      s.beds[bid] = { crop, doneAt: now + (first ? TUTORIAL_FIRST_GROW_MS : watered ? Math.round(c.growMs * WATERED.grow) : c.growMs), ...(watered ? { watered: true } : {}) };
      if (watered) s.stats.watered = (s.stats.watered ?? 0) + 1;
      planted++;
    }
    if (!planted) return ctx.fail('Nothing to plant here');
    ctx.emit('planted', { crop, count: planted });
    return { planted };
  },
  /** Harvest ready beds: { ids: [...] | id }. Stops when the barn is full. */
  harvest(ctx, { id, ids = [id] }) {
    if (!Array.isArray(ids)) ids = [];
    const { s, now } = ctx; let done = 0, sold = 0;
    for (const bid of ids) {
      const b = s.beds[bid]; if (!b || b.doneAt > now) continue;
      sold += barn.addOrSell(s, b.crop, 2); delete s.beds[bid]; done++;
      ctx.emit('harvested', { id: bid, crop: b.crop, count: 2 });
    }
    if (!done) return ctx.fail('Nothing is ready yet');
    s.stats.harvested += done * 2; gainXp(ctx, XP.harvest * done * 2);
    s.story.firstWheat = false;   // the tutorial's quick wheat lasts until the first harvest, however it was planted
    if (sold) ctx.emit('barnSold', { coins: sold });
    return { harvested: done };
  },
};
