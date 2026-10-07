// A sensible player for the economy simulation (scripts/sim.mjs, tests/sim.test.mjs). It plays only through act() and
// tick(), like the interface does, with a fixed v0.1 layout for the start parcel and the village:
//   start parcel x 32–47, z 56–71; a path spine along z = 63 from the road;
//   beds north of the spine; feed mill, coop (fenced), bakery and cow barn (fenced) south of it;
//   cottages along the village road at z = 93, doors onto paths at z = 92; the school beside them;
//   once the school is open: apple and peach trees in the home lot by the road (x 30–31, z 52–59), and the weekly cart.
import { act, tick } from '../src/core/act.mjs';
import * as grid from '../src/core/grid.mjs';
import * as barn from '../src/core/barn.mjs';
import { currentStep, stepReady, mayBuild, deliveredAll, completed } from '../src/core/projects.mjs';
import { cartHere, cratesLeft } from '../src/core/cart.mjs';
import { priceOf } from '../src/core/build.mjs';
import { animalCount, animalPrice } from '../src/core/animals.mjs';
import { queueOf } from '../src/core/production.mjs';
import { CROPS, RECIPES, ANIMALS, GOODS, FRUITS } from '../src/content/goods.mjs';
import { BEDS, SLOTS, RENT, BARN } from '../src/content/economy.mjs';
import { RESTORE } from '../src/content/start.mjs';

const SPINE = 63;
const LAYOUT = {
  feed_mill: { x: 32, z: 64, rot: 2 }, coop: { x: 35, z: 64, rot: 2, pen: [35, 64, 38, 67, 38] },
  bakery: { x: 40, z: 64, rot: 2 }, cow_barn: { x: 44, z: 64, rot: 2, pen: [44, 64, 47, 67, 47] },
  stall: { x: 30, z: 65, rot: 2, path: [31, 64] },
  school: { x: 50, z: 93, rot: 2, path: [52, 92] },
};
// cottages 1–3 stand in the restored village (content/start.mjs); a new one goes past the school's plot
const cottageSpot = (i, restore = false) => { const x = restore && i >= 3 ? 57 + 4 * (i - 3) : 33 + 4 * i; return { x, z: 93, rot: 2, path: [x + 1, 92] }; };
const treeCells = [];
for (let z = 52; z <= 59; z++) for (const x of [31, 30]) treeCells.push([x, z]);
const TREES = { apple_tree: 4, peach_tree: 2 };          // how many of each the bot plants
const bedCells = [];
for (let z = 57; z <= 62; z++) for (let x = 32; x <= 47; x++) bedCells.push([x, z]);
for (let x = 32; x <= 47; x++) bedCells.push([x, 56]);

export class Bot {
  /** options: { cart, trees } turn the bot's use of the weekly cart and fruit trees off (pace comparisons). */
  constructor(s, { cart = true, trees = true } = {}) { this.s = s; this.log = []; this.levels = {}; this.leaving = 0; this.opts = { cart, trees }; }
  do(action, payload, now) { const r = act(this.s, action, payload, now); if (r.ok) for (const e of r.events) this.onEvent(e, now); return r; }
  onEvent(e, now) { if (e.type === 'projectDone') this.log.push({ now, step: e.id }); if (e.type === 'levelUp') this.levels[e.level] ??= now; }
  tick(now) { for (const e of tick(this.s, now).events) this.onEvent(e, now); }
  /** One look at the game: everything a player does in a minute or two. gapMs is how long until the next look. */
  play(now, gapMs) {
    const s = this.s; this.now = now;
    this.tick(now);
    this.collect(now);
    this.orders(now);
    if (this.opts.cart) this.cart(now);
    this.unstick(now);
    this.project(now);
    this.spend(now);
    this.produce(now);
    this.do('feed', {}, now);
    this.plant(now, gapMs);
    this.trades(now);
    this.stall(now);
    return s;
  }
  collect(now) {
    const s = this.s;
    // products and produce first (worth more), then orders make room, then the crops that fit
    for (const a of ['collectProducts', 'collect', 'collectRent', 'stallCollect', 'pick']) this.do(a, {}, now);
    if (!s.today.claimed) this.do('claimGift', {}, now);
    this.orders(now);
    const ready = Object.keys(s.beds).filter(id => s.beds[id].doneAt <= now);
    if (ready.length) { const r = this.do('harvest', { ids: ready }, now); if (!r.ok || Object.keys(s.beds).some(id => s.beds[id].doneAt <= now)) this.barnFull = true; }
  }
  orders(now) { for (const c of [...this.s.orders.cards]) if (barn.hasAll(this.s, c.need)) this.do('deliverOrder', { id: c.id }, now); }
  /**
   * A full barn with no order that can be filled is a dead end (the v0.1 bot sat in one for days): like a player, put the
   * biggest pile on the stall, or discard the order that is furthest from done. (After the school only, so the v0.1 pace
   * targets up to the school are measured exactly as before.)
   */
  unstick(now) {
    const s = this.s; if (!completed(s, 'school') || barn.space(s) >= 4 || s.orders.cards.some(c => barn.hasAll(s, c.need))) return;
    const pile = Object.entries(s.barn.items).sort((a, b) => b[1] - a[1])[0];
    if (pile && s.counts.stall > 0 && this.do('stallList', { good: pile[0], n: Math.min(10, pile[1]) }, now).ok) return;
    const missing = c => Object.entries(c.need).reduce((a, [g, n]) => a + Math.max(0, n - barn.free(s, g)) * GOODS[g].value, 0);
    const worst = s.orders.cards.filter(c => !c.story).sort((a, b) => missing(b) - missing(a))[0];
    if (worst) this.do('discardOrder', { id: worst.id }, now);
  }
  /** The weekly cart: fill a crate when its goods are not wanted by an open order, send it when every crate is full. */
  cart(now) {
    const s = this.s; if (!cartHere(s)) return;
    const forOrders = {}; for (const c of s.orders.cards) for (const [g, n] of Object.entries(c.need)) forOrders[g] = (forOrders[g] ?? 0) + n;
    // orders come first, except for the last two crates (a cart that waits forever helps nobody)
    s.cart.crates.forEach((c, i) => { if (!c.filled && barn.free(s, c.good) >= c.n + (cratesLeft(s) <= 2 ? 0 : forOrders[c.good] ?? 0)) this.do('fillCrate', { crate: i }, now); });
    if (!cratesLeft(s)) this.do('sendCart', {}, now);
  }
  /** Pave from (x, z) back to the road along the cheapest straight route used by this layout. */
  pave(cells, now) { for (const [x, z] of cells) if (grid.cellType(this.s, x, z) !== 'path' && grid.cellType(this.s, x, z) !== 'road') { this.clearCells([[x, z]], now); this.do('place', { kind: 'path', x, z }, now); } }
  clearCells(cells, now) { const dirty = cells.filter(([x, z]) => ['weeds', 'rock'].includes(grid.cellType(this.s, x, z))); if (dirty.length) this.do('clear', { cells: dirty }, now); }
  rect(x0, z0, x1, z1) { const out = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) out.push([x, z]); return out; }
  spineTo(x1) { return Array.from({ length: x1 - 29 }, (_, i) => [30 + i, SPINE]); }
  placeBuilding(kind, spot, now) {
    const s = this.s, need = priceOf(s, kind) + 20; if (s.coins < need) return false;
    const [w, d] = kind === 'cottage' ? [3, 3] : kind === 'school' ? [5, 4] : kind === 'stall' ? [2, 1] : kind === 'feed_mill' || kind === 'coop' ? [2, 2] : [3, 2];
    this.clearCells(this.rect(spot.x, spot.z, spot.x + (spot.rot % 2 ? d : w) - 1, spot.z + (spot.rot % 2 ? w : d) - 1), now);
    if (spot.path) this.pave([spot.path], now); else this.pave(this.spineTo(Math.min(47, spot.x + w)), now);
    const r = this.do('place', { kind, x: spot.x, z: spot.z, rot: spot.rot }, now);
    if (r.ok && spot.pen) this.fence(spot.pen, now);
    return r.ok;
  }
  fence([x0, z0, x1, z1, gateX], now) {
    for (let x = x0; x <= x1; x++) { this.do('placeEdge', { kind: x === gateX ? 'gate' : 'fence', x, z: z0, side: 'n' }, now); this.do('placeEdge', { kind: 'fence', x, z: z1 + 1, side: 'n' }, now); }
    for (let z = z0; z <= z1; z++) { this.do('placeEdge', { kind: 'fence', x: x0, z, side: 'w' }, now); this.do('placeEdge', { kind: 'fence', x: x1 + 1, z, side: 'w' }, now); }
  }
  project(now) {
    const s = this.s, step = currentStep(s); if (!step) return;
    if (s.mode === 'restore') this.repairs(now);
    if (step.id === 'clear') { this.clearCells([[34, 59], [35, 60], [34, 61]], now); this.pave(this.spineTo(32), now); return; }
    if (step.id === 'plot') { for (let i = 0; i < 6; i++) this.do('place', { kind: 'bed', x: 32 + i, z: 57 }, now); return; }
    if (step.deliver && stepReady(s, now).ok && !deliveredAll(s, step)) this.do('projectDeliver', {}, now);
    for (const kind of step.builds) {
      if (kind === 'path' || kind === 'bed' || kind === 'fence' || kind === 'gate' || !mayBuild(s, kind).ok) continue;
      this.placeBuilding(kind, kind === 'cottage' ? cottageSpot(s.counts.cottage ?? 0, s.mode === 'restore') : LAYOUT[kind], now);
    }
  }
  /** The restored village: repair what the build order allows, in order, and mend the gaps in the coop's fence. */
  repairs(now) {
    const s = this.s, ids = kind => Object.keys(s.placed).filter(id => s.placed[id].kind === kind);
    for (const kind of ['feed_mill', 'coop', 'bakery', 'cottage']) for (const id of ids(kind)) this.do('repair', { id }, now);
    for (const key of RESTORE.fenceRect.missing) { const [x, z, side] = key.split(','); this.do('placeEdge', { kind: 'fence', x: +x, z: +z, side }, now); }
    for (const id of Object.keys(s.cond)) if (s.cond[id].level >= 1 && s.cond[id].level < 3 && s.coins > 400) this.do('repair', { id }, now);   // wear: one tap, a few coins
  }
  /** Coins kept for the next project once it is in reach (a sensible player saves for it). */
  reserve(now) {
    const s = this.s, step = currentStep(s); if (!step || !stepReady(s, now).ok) return 0;
    const kind = step.builds.find(k => !['path', 'bed', 'fence', 'gate'].includes(k)); return kind ? priceOf(s, kind) + 40 : 0;
  }
  spend(now) {
    const s = this.s;
    for (let guard = 0; guard < 80; guard++) {
      const free = s.coins - this.reserve(now);
      if (mayBuild(s, 'bakery').ok && s.coins >= priceOf(s, 'bakery') + 20) { this.placeBuilding('bakery', LAYOUT.bakery, now); continue; }   // "show the way"
      if (mayBuild(s, 'cow_barn').ok && s.level >= 6 && free >= 30) { this.placeBuilding('cow_barn', LAYOUT.cow_barn, now); continue; }
      const coop = Object.keys(s.placed).find(id => s.placed[id].kind === 'coop'), cows = Object.keys(s.placed).find(id => s.placed[id].kind === 'cow_barn');
      // finish a fence that ran out of coins last time (the coop shows "The fence has a gap")
      for (const [home, kind] of [[coop, 'coop'], [cows, 'cow_barn']]) if (home && !grid.penOf(s, home).closed && s.coins >= 20) this.fence(LAYOUT[kind].pen, now);
      if (coop && (s.animals[coop]?.length ?? 0) < ANIMALS.hen.perHome && free >= animalPrice(s, 'hen') && this.do('buyAnimal', { home: coop }, now).ok) continue;
      if (cows && s.level >= 6 && (s.animals[cows]?.length ?? 0) < ANIMALS.cow.perHome && free >= animalPrice(s, 'cow') && this.do('buyAnimal', { home: cows }, now).ok) continue;
      const beds = s.counts.bed ?? 0;
      if (beds >= 6 && beds < BEDS.allowance(s.level) && free >= priceOf(s, 'bed')) {
        const cell = bedCells.find(([x, z]) => !grid.occupant(s, x, z) && grid.cellType(s, x, z) !== 'path');
        if (cell) { this.clearCells([cell], now); if (this.do('place', { kind: 'bed', x: cell[0], z: cell[1] }, now).ok) continue; }
      }
      if (mayBuild(s, 'stall').ok && s.level >= 4 && free >= priceOf(s, 'stall') + 50 && this.placeBuilding('stall', LAYOUT.stall, now)) continue;
      const building = ['bakery', 'feed_mill'].map(k => Object.keys(s.placed).find(id => s.placed[id].kind === k)).find(id => id && queueOf(s, id).slots < SLOTS.max && free >= SLOTS.cost[queueOf(s, id).slots]);
      if (building && this.do('buySlot', { building }, now).ok) continue;
      if ((this.barnFull || barn.used(s) > s.barn.cap * 0.8) && s.coins >= BARN.upgradeCost(s.barn.upgrades) + 20 && this.do('upgradeBarn', {}, now).ok) { this.barnFull = false; continue; }
      if (this.reserve(now)) return;   // saving for the project: no cottage upgrades or decorations
      const home = Object.keys(s.homes).find(id => s.homes[id].family && s.homes[id].level < 2 && free >= RENT.upgradeCost[s.homes[id].level + 1]);
      if (home && this.do('upgradeHome', { id: home }, now).ok) continue;
      // fruit trees once the school is open (a player saving for the school buys none)
      const tree = this.opts.trees && completed(s, 'school') && Object.keys(TREES).find(k => (s.counts[k] ?? 0) < TREES[k] && mayBuild(s, k).ok && s.level >= FRUITS[k.replace('_tree', '')].level && free >= priceOf(s, k) + 100);
      const cell = tree && treeCells.find(([x, z]) => grid.canPlace(s, tree, x, z).ok);
      if (cell && this.do('place', { kind: tree, x: cell[0], z: cell[1] }, now).ok) continue;
      return;
    }
  }
  /** What the player wants in stock: open orders, the project's goods, feed for the animals and seed stock. */
  wants() {
    const s = this.s, w = { wheat: 12, carrot: 6, corn: 8, chicken_feed: animalCount(s, 'hen'), cow_feed: animalCount(s, 'cow') };
    for (const c of s.orders.cards) for (const [g, n] of Object.entries(c.need)) w[g] = (w[g] ?? 0) + n;
    const step = currentStep(s); if (step?.deliver) for (const [g, n] of Object.entries(step.deliver)) w[g] = (w[g] ?? 0) + n - (s.projects.delivered[g] ?? 0);
    if (cartHere(s)) for (const c of s.cart.crates) if (!c.filled) w[c.good] = (w[c.good] ?? 0) + c.n;
    for (const [k, r] of Object.entries(RECIPES)) { const short = Math.max(0, (w[k] ?? 0) - barn.stock(s, k)); if (short) for (const [i, n] of Object.entries(r.needs)) w[i] = (w[i] ?? 0) + Math.ceil(short / r.makes) * n; }
    return w;
  }
  produce(now) {
    const s = this.s, w = this.wants();
    for (const id of Object.keys(s.production).concat(Object.keys(s.placed).filter(id => ['feed_mill', 'bakery'].includes(s.placed[id].kind)))) {
      const kind = s.placed[id]?.kind; if (!kind) continue;
      for (let guard = 0; guard < 6; guard++) {
        const q = queueOf(s, id); if (q.queue.length >= q.slots) break;
        const queued = r => q.queue.filter(j => j.recipe === r).length * RECIPES[r].makes;
        const options = Object.entries(RECIPES).filter(([r, def]) => def.at === kind && def.level <= s.level && (r !== 'cow_feed' || animalCount(s, 'cow')))
          .map(([r, def]) => [r, def, (w[r] ?? 0) - barn.stock(s, r) - queued(r)]).filter(o => o[2] > 0)
          .sort((a, b) => b[2] * GOODS[b[0]].value - a[2] * GOODS[a[0]].value);
        const pick = options.find(([, def]) => barn.hasAll(s, def.needs)); if (!pick) break;
        if (!this.do('produce', { building: id, recipe: pick[0] }, now).ok) break;
      }
    }
  }
  plant(now, gapMs) {
    const s = this.s, w = this.wants();
    const empty = Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed' && !s.beds[id]);
    for (const id of empty) {
      const crops = Object.entries(CROPS).filter(([c, def]) => def.level <= s.level && (def.free || barn.stock(s, c) > 0 || s.coins >= def.value + 20));
      const short = crops.filter(([c]) => barn.stock(s, c) < (w[c] ?? 0)).sort((a, b) => ((w[b[0]] ?? 0) - barn.stock(s, b[0])) - ((w[a[0]] ?? 0) - barn.stock(s, a[0])))[0];
      const best = crops.filter(([, def]) => def.growMs <= Math.max(gapMs, 5 * 60_000)).sort((a, b) => b[1].value - a[1].value)[0];
      const pick = short ?? best; if (!pick) continue;
      if (!this.do('plant', { id, crop: pick[0] }, now).ok) break;
    }
  }
  trades(now) {
    for (const [id, n] of Object.entries(this.s.neighbours)) if (n.trade?.state === 'open') { const r = this.do('trade', { id, accept: true }, now); if (!r.ok) this.do('trade', { id, accept: false }, now); }
  }
  stall(now) {
    const s = this.s; if (!(s.counts.stall > 0) || barn.used(s) < s.barn.cap * 0.85) return;
    const w = this.wants();
    const extra = Object.entries(s.barn.items).filter(([g, n]) => n > (w[g] ?? 0) + 2).sort((a, b) => GOODS[a[0]].value - GOODS[b[0]].value)[0];
    if (extra) this.do('stallList', { good: extra[0], n: Math.min(10, extra[1] - (w[extra[0]] ?? 0)) }, now);
  }
}
