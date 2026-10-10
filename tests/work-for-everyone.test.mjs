// Chapter 8, work for everyone (docs/plan/ch08-work-for-everyone.md): the company's first delivery closes the chapter,
// seeing its card opens the sluice (workshops a tenth quicker from then on), the office manager, the old mill.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { JUMPS } from '../src/core/testmode.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { VILLAGERS, hasArrived } from '../src/content/people.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { RECIPES } from '../src/content/goods.mjs';
import { SLUICE } from '../src/content/economy.mjs';
import { OLD_MILL, inOldMill, isBrook, isRoad, CELL } from '../src/content/world.mjs';
import { productionDuration } from '../src/core/production.mjs';
import { normalizeGrowth } from '../src/core/growth-state.mjs';
import { workingCount } from '../src/core/working.mjs';
import { stepDone, currentStep } from '../src/core/projects.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import * as grid from '../src/core/grid.mjs';
import { stepCost } from '../src/core/walk.mjs';
import { personName } from '../src/content/character-names.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0, MIN } from './helpers.mjs';

/** A farm at the start of chapter 8 (the tester's jump). */
function farm(seed = 4242) { const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 8 }); return s; }
/** What the tester's jump past chapter 8 arranges: two food factories, the office, one delivery paid. */
const deed = s => JUMPS[9]({ s, now: T0, events: [], emit() {}, fail: (reason, params) => ({ ok: false, reason, params }) });
const ch = CHAPTERS.find(c => c.id === 8);

test('chapter 8 closes when the company office works and its first delivery is paid', () => {
  const s = farm(); assert.ok(ch && ch.panels.length === 3 && ch.ada); assert.equal(ch.when(s), false);
  deed(s); assert.ok(workingCount(s, 'company') > 0); assert.equal(normalizeGrowth(s).settled, 1); assert.equal(ch.when(s), true);
  assert.ok(stepDone(s, 'company') || currentStep(s)); tick(s, T0 + MIN); assert.ok(stepDone(s, 'first_contract') && stepDone(s, 'company'));
  // the office alone is not enough, nor a broken office
  const half = farm(7); deed(half); half.growth = { ...normalizeGrowth(half), sent: 0, returned: 0, settled: 0 }; assert.equal(ch.when(half), false);
  const id = Object.keys(s.placed).find(k => s.placed[k].kind === 'company'); s.cond[id] = { level: 3, ms: 0 }; assert.equal(ch.when(s), false);
});
test('seeing the card opens the sluice, once: new batches take a tenth less time, running ones keep theirs', () => {
  const s = farm(); deed(s); s.coins = 9999; s.barn.cap = 999; Object.assign(s.barn.items, { apple: 30, carrot: 30 });
  const press = Object.keys(s.placed).find(k => s.placed[k].kind === 'juice_press'); assert.ok(press);
  const full = productionDuration(s, press, 'apple_juice', T0); assert.equal(full, RECIPES.apple_juice.timeMs);
  must(s, 'produce', { building: press, recipe: 'apple_juice' }); const before = s.production[press].queue[0].doneAt;
  assert.equal(s.firsts.sluice, undefined);
  const r = must(s, 'chapterSeen', { id: 8 }, T0 + 1000);
  assert.equal(s.firsts.sluice, T0 + 1000); assert.deepEqual(r.events.filter(e => e.type === 'sluiceOpened').length, 1);
  assert.equal(s.production[press].queue[0].doneAt, before, 'a running batch keeps its time');
  assert.equal(productionDuration(s, press, 'apple_juice', T0 + 1000), Math.round(RECIPES.apple_juice.timeMs * SLUICE.work));
  must(s, 'produce', { building: press, recipe: 'carrot_juice' }, T0 + 1000);
  const job = s.production[press].queue.find(j => j.recipe === 'carrot_juice'); assert.equal(job.doneAt - T0 - 1000, Math.round(RECIPES.carrot_juice.timeMs * SLUICE.work));
  // seen again (or any later card): no second opening
  const again = must(s, 'chapterSeen', { id: 8 }, T0 + 5000); assert.equal(s.firsts.sluice, T0 + 1000); assert.ok(!again.events.some(e => e.type === 'sluiceOpened'));
  const back = unpack(pack(s)); assert.equal(back.firsts.sluice, T0 + 1000);
  // what is made with the wheel turning is counted, for the scene
  const beat = BEATS.find(b => b.id === 'wheel-turns'); assert.equal(beat.when(s), false);
  must(s, 'collectProducts', { building: press }, T0 + 20 * MIN); assert.ok(s.stats.sluiceMade >= 1); assert.equal(beat.when(s), true);
  // before the chapter nothing is quicker and nothing is counted
  const early = farm(9); deed(early); assert.equal(productionDuration(early, Object.keys(early.placed).find(k => early.placed[k].kind === 'juice_press'), 'apple_juice', T0), RECIPES.apple_juice.timeMs);
});
test('the tester\'s jump past chapter 8 leaves the sluice open, as seeing the card does', () => {
  const s = newGame(T0, 11, { restore: true }); tick(s, T0); const r = must(s, 'testJumpChapter', { chapter: 9 });
  assert.deepEqual(r.missing, []); assert.equal(s.story.chapter, 8); assert.ok(s.firsts.sluice); assert.ok(ch.when(s));
});
test('the office manager comes with the company office; the scenes follow their deeds', () => {
  const bea = VILLAGERS.find(v => v.id === 'bea'), s = farm(); assert.ok(bea?.noOrders && bea.noGifts && bea.idle.length >= 3);
  assert.equal(hasArrived(s, bea), false); deed(s); assert.equal(hasArrived(s, bea), true);
  assert.deepEqual(['en', 'vi', 'ko', 'ja'].map(l => personName('bea', l, 'display')), ['Penny', 'Cô Xu', '꼼꼼', 'きっちり']);
  const beat = id => BEATS.find(b => b.id === id);
  for (const id of ['bea-arrives', 'water-rights', 'wheel-turns']) assert.equal(beat(id).chapter, 8);
  assert.ok(beat('bea-arrives').when(s)); assert.ok(!beat('water-rights').when(s));
  must(s, 'chapterSeen', { id: 8 }); assert.ok(beat('water-rights').when(s));
  const oak = LETTERS.find(l => l.id === 'ellis-9'); assert.ok(oak && oak.from === 'ellis' && oak.when.type === 'chapter' && oak.when.value === 8 && oak.after.includes('ellis-8'));
  assert.ok(!/home again|I am home/.test(oak.text), 'Oak is still upriver until chapter 9');
});
test('the roadmap stage has all four deeds of chapters 7 and 8', () => {
  const s = farm(); s.house = { level: 5 }; s.hands = { field: { since: T0 } }; s.stats.cheeseMade = 1; s.album.fruit.cherry = 9;
  for (const kind of ['goat_barn', 'dairy', 'fruit_stand', 'kennel']) { s.placed[`x_${kind}`] = { kind, x: 2, z: 2, rot: 0 }; s.counts[kind] = 1; }
  let j = journeyOf(s); assert.equal(j.stage.id, 'streets'); assert.equal(j.total, 4); assert.equal(j.done, 2, 'chapter 7 is behind this farm');
  deed(s); j = journeyOf(s); assert.notEqual(j.stage.id, 'streets', 'all four done: the roadmap moves on');
});
test('the old mill stands on nobody\'s land on the north bank, clear of water, road and scenery', async () => {
  const s = farm(), b = OLD_MILL.box;
  for (let z = b.z0; z <= b.z1; z++) for (let x = b.x0; x <= b.x1; x++) {
    assert.ok(inOldMill(x, z)); assert.ok(!isBrook(x, z) && !isRoad(x, z), `${x},${z} is water or road`);
    assert.equal(grid.landOf(s, x, z), null); assert.equal(stepCost(s, x, z), 0, 'nobody walks through the mill');
  }
  assert.ok(!inOldMill(b.x0 - 1, b.z0)); assert.ok(isBrook(Math.floor(OLD_MILL.x / CELL), b.z1 + 1), 'the wheel side is on the water');
  assert.ok(OLD_MILL.x / CELL > b.x0 && OLD_MILL.x / CELL < b.x1 + 1 && OLD_MILL.z / CELL > b.z0 && OLD_MILL.z / CELL < b.z1 + 1);
  const { planWilds } = await import('../src/view/dress.mjs'), wilds = planWilds();
  for (const kind of ['trees', 'bushes', 'rocks']) for (const o of wilds[kind]) assert.ok(!inOldMill(Math.floor(o.x / CELL), Math.floor(o.z / CELL)), `a ${kind.slice(0, -1)} stands in the mill`);
});
