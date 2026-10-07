// What to do to finish an order (v0.3e): the goods it still needs, worked back through the recipes to what to plant, make,
// collect, pick or catch, in the order to do it. Pure: reads the state, changes nothing.
import { RECIPES, CROPS, FRUITS, FISH_TABLE, ANIMALS } from '../content/goods.mjs';
import * as barn from './barn.mjs';

export const STEP_TEXT = { plant: 'Plant {n} {good}', make: 'Make {n} {good}', collect: 'Collect {n} {good}', pick: 'Pick {n} {good}', fish: 'Catch {n} {good}' };
const FISH = new Set(FISH_TABLE.map(f => f.id));
/** Steps to get these goods: [{ how, good, n, at }] (at: where it is done, for "show the way"). */
export function planFor(s, need) {
  const stock = {}, steps = [];
  const want = (good, n) => {
    if (!(good in stock)) stock[good] = barn.free(s, good);
    const use = Math.min(stock[good], n); stock[good] -= use; const rest = n - use; if (rest <= 0) return;
    const r = RECIPES[good];
    if (r) { const batches = Math.ceil(rest / r.makes); for (const [g, k] of Object.entries(r.needs)) want(g, k * batches); add('make', good, batches * r.makes, r.at); return; }
    if (CROPS[good]) return add('plant', good, rest, 'farm');
    if (FRUITS[good]) return add('pick', good, rest, FRUITS[good].tree);
    if (FISH.has(good)) return add('fish', good, rest, 'pond');
    const animal = Object.values(ANIMALS).find(a => a.gives === good);
    if (animal) return add('collect', good, rest, animal.home);
  };
  const add = (how, good, n, at) => { const old = steps.find(x => x.how === how && x.good === good); if (old) old.n += n; else steps.push({ how, good, n, at }); };
  for (const [good, n] of Object.entries(need)) want(good, n);
  return steps;
}
/** The order closest to done (fewest goods missing), and its plan. */
export function bestOrder(s) {
  let best = null;
  for (const c of s.orders?.cards ?? []) { const steps = planFor(s, c.need), missing = steps.reduce((a, x) => a + x.n, 0); if (!best || missing < best.missing) best = { card: c, steps, missing }; }
  return best;
}
