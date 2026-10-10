// Your family lends a hand (v0.3e): now and then, while the game is open, June brings in a few ripe crops and sows the same
// again, and Pip fetches a few eggs and milk. Small and gentle: the busy work is lighter, the choices stay yours.
import { HELP, HANDS, WEAR } from '../content/economy.mjs';
import { actions as production, collectableJobs } from './production.mjs';
import { actions as trees, ripeTrees } from './trees.mjs';
import { actions as market, trucksOf, truckCoins } from './market.mjs';
import { pick as pickFish } from './fishing.mjs';
import { ANIMALS, RECIPES } from '../content/goods.mjs';
import { isWorking } from './working.mjs';
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

/** Hired hands: open once the school stands. s.hands = { field?, animals?, workshop? }. */
export const handsOpen = s => (s.counts?.school ?? 0) > 0;
export const handHired = (s, role) => !!s.hands?.[role];
export const handActions = {
  hireHand(ctx, { role }) {
    const { s } = ctx, def = Object.hasOwn(HANDS.roles, role) ? HANDS.roles[role] : null; if (!def) return ctx.fail('Nobody is hired for this');
    if (!handsOpen(s)) return ctx.fail('Build the school first');
    if (handHired(s, role)) return ctx.fail('Already hired');
    if (s.coins < def.fee) return ctx.fail('Not enough coins');
    s.coins -= def.fee; (s.hands ??= {})[role] = { since: ctx.now }; ctx.emit('handHired', { role }); return { role };
  },
  releaseHand(ctx, { role }) {
    if (!handHired(ctx.s, role)) return ctx.fail('Nobody is hired for this');
    delete ctx.s.hands[role]; return { role };
  },
};
/** Every HANDS.everyMs, while the game is open, each hand does half (rounded up) of what waits; a coin a task, as far as the coins go. */
export function tickHands(ctx) {
  const { s, now } = ctx; if (!s.hands || !handsOpen(s)) return;
  if (!s.handsAt) { s.handsAt = now + HANDS.everyMs; return; }
  if (now < s.handsAt) return;
  const late = now - s.handsAt > WEAR.tickCapMs; s.handsAt = now + HANDS.everyMs; if (late) return;
  const quiet = { ...ctx, byHand: true, fail: () => ({ ok: false }) }, half = n => Math.min(Math.ceil(n / 2), Math.floor(s.coins / HANDS.wage));
  const paid = (role, count) => { if (count > 0) { s.coins -= count * HANDS.wage; ctx.emit('handDid', { role, count }); } };
  if (s.hands.field) {
    const all = Object.keys(s.beds).filter(id => s.beds[id].doneAt <= now), ripe = all.slice(0, half(all.length)), crops = ripe.map(id => [id, s.beds[id].crop]);
    if (ripe.length) { farm.harvest(quiet, { ids: ripe }); for (const [id, crop] of crops) if (!s.beds[id]) farm.plant(quiet, { ids: [id], crop }); paid('field', ripe.length); }
  }
  if (s.hands.animals) {
    const list = Object.entries(s.animals).flatMap(([home, as]) => as.map(an => ({ home, an }))), ready = list.filter(x => x.an.doneAt != null && x.an.doneAt <= now), hungry = list.filter(x => x.an.doneAt == null);
    let done = 0, sold = 0;
    for (const { home, an } of ready.slice(0, half(ready.length))) { sold += barn.addOrSell(s, ANIMALS[an.kind].gives, 1); an.doneAt = null; done++; ctx.emit('collected', { home, good: ANIMALS[an.kind].gives }); }
    if (done) gainXp(ctx, XP.collect * done);
    if (sold) ctx.emit('barnSold', { coins: sold });
    for (const { an } of hungry.slice(0, Math.max(0, half(hungry.length)))) { const a = ANIMALS[an.kind]; if (barn.take(s, { [a.eats]: 1 }, false)) { an.doneAt = now + a.everyMs; done++; } }
    paid('animals', Math.min(done, Math.floor(s.coins / HANDS.wage)));
  }
  if (s.hands.workshop) {
    const jobs = Object.keys(s.production ?? {}).flatMap(id => collectableJobs(s, id, now).map(job => ({ id, recipe: job.recipe })));
    let left = half(jobs.length), done = 0;
    for (const id of new Set(jobs.map(j => j.id))) {
      if (left <= 0) break;
      const mine = jobs.filter(j => j.id === id).slice(0, left), r = production.collectProducts(quiet, { building: id, limit: mine.length });
      if (r?.ok === false) continue;
      for (const j of mine.slice(0, r.collected)) production.produce(quiet, { building: id, recipe: j.recipe });
      left -= r.collected; done += r.collected;
    }
    // and it keeps every workshop going: half of each building's free trays (rounded up) start what that building made
    // last, as far as the ingredients and the wages go, so a chain of goods runs on without a tap
    for (const [id, recipe] of Object.entries(s.lastRecipe ?? {})) {
      const p = s.placed[id], r = RECIPES[recipe]; if (!p || !r || r.at !== p.kind || !isWorking(s, id)) continue;
      const q = s.production?.[id]; if (!q) continue;
      let start = Math.min(Math.ceil((q.slots - q.queue.length) / 2), Math.floor(s.coins / HANDS.wage) - done);
      while (start-- > 0 && barn.hasAll(s, r.needs) && production.produce(quiet, { building: id, recipe })?.ok !== false) done++;
    }
    paid('workshop', done);
  }
  if (s.hands.orchard) {   // picks half of the ripe fruit trees
    const ripe = ripeTrees(s, now), ids = ripe.slice(0, half(ripe.length));
    if (ids.length && trees.pick(quiet, { ids })?.ok !== false) paid('orchard', ids.length);
  }
  if (s.hands.driver) {   // brings in the takings, loads the trucks that stand idle with spare goods and sends them off
    let done = 0;
    if (truckCoins(s) > 0 && market.collectTruck(quiet)?.ok !== false) done++;
    const idle = trucksOf(s).filter(u => !u.away).length;
    if (idle && s.coins >= HANDS.wage) { if (market.fillTruck(quiet)?.ok !== false) done++; if (trucksOf(s).some(u => !u.away && u.load.length) && market.sendTruck(quiet)?.ok !== false) done++; }
    paid('driver', Math.min(done, Math.floor(s.coins / HANDS.wage)));
  }
  if (s.hands.fisher && s.coins >= HANDS.wage) {   // lands one fish a round, straight into the barn
    const fish = pickFish(`${now}:hand`, false), sold = barn.addOrSell(s, fish, 1);
    (s.album ??= { fish: {}, fruit: {} }).fish[fish] = (s.album.fish[fish] ?? 0) + 1; if (sold) ctx.emit('barnSold', { coins: sold });
    paid('fisher', 1);
  }
}
