// Your family lends a hand (v0.3e): now and then, while the game is open, June brings in a few ripe crops and sows the same
// again, and Pip fetches a few eggs and milk. Small and gentle: the busy work is lighter, the choices stay yours.
import { HELP, WEAR } from '../content/economy.mjs';
import { ANIMALS } from '../content/goods.mjs';
import * as barn from './barn.mjs';
import { actions as farm } from './farm.mjs';
import { gainXp } from './levels.mjs';
import { XP } from '../content/economy.mjs';

export function tickHelpers(ctx) {
  const { s, now } = ctx; if (s.level < HELP.level) return;
  if (!s.helpAt) { s.helpAt = now + HELP.everyMs; return; }
  if (now < s.helpAt) return;
  const late = now - s.helpAt > WEAR.tickCapMs;   // away: they did not work while you were gone
  s.helpAt = now + HELP.everyMs; if (late) return;
  const quiet = { ...ctx, fail: () => ({}), emit: ctx.emit };
  // June: harvest a few ripe beds and sow the same crop again
  const ripe = Object.keys(s.beds).filter(id => s.beds[id].doneAt <= now).slice(0, HELP.beds);
  if (ripe.length) {
    const crops = ripe.map(id => [id, s.beds[id].crop]);
    farm.harvest(quiet, { ids: ripe });
    for (const [id, crop] of crops) if (!s.beds[id]) farm.plant(quiet, { ids: [id], crop });
    ctx.emit('helperDid', { who: 'june', count: ripe.length, what: 'crops' });
  }
  // Pip: fetch a few eggs and milk
  let got = 0, sold = 0;
  for (const id of Object.keys(s.animals)) for (const an of s.animals[id]) {
    if (got >= HELP.products) break;
    if (an.doneAt == null || an.doneAt > now) continue;
    sold += barn.addOrSell(s, ANIMALS[an.kind].gives, 1); an.doneAt = null; got++;
    ctx.emit('collected', { home: id, good: ANIMALS[an.kind].gives });
  }
  if (got) { gainXp(ctx, XP.collect * got); if (sold) ctx.emit('barnSold', { coins: sold }); ctx.emit('helperDid', { who: 'pip', count: got, what: 'eggs' }); }
}
