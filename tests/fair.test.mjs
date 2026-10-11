// Chapter 18, the valley fair (docs/plan/ch18-the-valley-fair.md): a score's parts, the seeded rivals, choosing entries,
// holding the fair (stock, fee, ribbons, prizes), its end, the cooldown, and the chapter.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { CLASSES, MEDALS, classOf, knownOf, partsOf, starsOf, wobbleOf, rivalsOf, optionsOf, fairOf } from '../src/core/fair.mjs';
import { deedsOf, valueOf } from '../src/core/valley.mjs';
import { FAIR } from '../src/content/economy.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { CHAPTERS, BEATS } from '../src/content/story.mjs';
import { resolveNames } from '../src/content/character-names.mjs';
import { stepDone } from '../src/core/projects.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { STAGES } from '../src/content/journey.mjs';
import { reportOf } from '../src/core/report.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { must, T0 } from './helpers.mjs';

const { fee, each, lastsMs, everyMs, prizes, firstGold, rivals: R } = FAIR, ch = CHAPTERS.find(c => c.id === 18);
/** A farm at the start of chapter 18 (the tester's jump): the valley company is founded. The barn holds what `stock` says. */
function farm(stock = { bread: 10, wheat: 10, perch: 10 }, seed = 4242) {
  const s = newGame(T0, seed, { restore: true }); tick(s, T0); must(s, 'testJumpChapter', { chapter: 18 }); tick(s, T0);
  s.coins = 50000; s.barn.cap = 9000; s.barn.items = { ...stock }; s.stats.grown = {}; s.album = { fish: {}, fruit: {} }; delete s.fair; s.stats.fairs = 0;
  return s;
}
const know = (s, good, n) => { (s.stats.grown ??= {})[good] = n; };

test('a score has three parts the player can work on: how fine the good is, how well the farm knows it, the judge\'s taste', () => {
  const s = farm();
  assert.deepEqual(CLASSES, ['field', 'kitchen', 'pond']); assert.equal(classOf('pumpkin'), 'field'); assert.equal(classOf('peach'), 'field'); assert.equal(classOf('honey_cake'), 'kitchen');
  assert.equal(classOf('eel'), 'pond'); assert.equal(classOf('egg'), null); assert.equal(classOf('cow_feed'), null); assert.equal(classOf('nothing'), null);
  // the plainest good of a class scores the least for itself, the finest the most, and a dearer good never less
  assert.equal(partsOf(s, 'field', 'wheat').base, FAIR.base[0]); assert.equal(partsOf(s, 'field', 'ginseng').base, FAIR.base[1]); assert.equal(partsOf(s, 'pond', 'pond_giant').base, FAIR.base[1]);
  for (const cls of CLASSES) { const goods = Object.keys(GOODS).filter(g => classOf(g) === cls).sort((a, b) => GOODS[a].value - GOODS[b].value); assert.ok(goods.length >= 5);
    for (let i = 1; i < goods.length; i++) assert.ok(partsOf(s, cls, goods[i]).base >= partsOf(s, cls, goods[i - 1]).base, `${goods[i]} < ${goods[i - 1]}`); }
  // knowing: nothing grown is nothing; more grown never scores less; it has an end
  assert.equal(partsOf(s, 'field', 'corn').know, 0); let last = 0;
  for (const n of [1, 2, 5, 10, 40, 100, 399, 400, 5000]) { know(s, 'corn', n); const k = partsOf(s, 'field', 'corn').know; assert.ok(k >= last && k <= FAIR.know, `${n}: ${k}`); last = k; }
  assert.equal(last, FAIR.know); know(s, 'corn', 400); assert.equal(partsOf(s, 'field', 'corn').know, FAIR.know);
  // fruit picked and fish caught count as knowing too
  s.album.fruit.peach = 30; s.album.fish.eel = 5; assert.equal(knownOf(s, 'peach'), 30); assert.equal(knownOf(s, 'eel'), 5); assert.ok(partsOf(s, 'field', 'peach').know > 0 && partsOf(s, 'pond', 'eel').know > 0);
  // taste: each judge likes two goods of their own class
  for (const cls of CLASSES) { const c = FAIR.classes[cls]; assert.equal(c.likes.length, 2); for (const g of c.likes) { assert.equal(classOf(g), cls); assert.equal(partsOf(s, cls, g).taste, FAIR.taste); } }
  assert.equal(partsOf(s, 'field', 'wheat').taste, 0); const p = partsOf(s, 'field', 'peach'); assert.equal(p.sum, p.base + p.know + p.taste);
  // the hint is one to five stars
  assert.equal(starsOf(FAIR.base[0]), 1); assert.equal(starsOf(FAIR.base[1] + FAIR.know + FAIR.taste), 5); assert.ok(starsOf(60) > starsOf(40));
  // harvesting and making are what the farm's knowing is counted from
  const t = farm(); t.beds = {}; const bed = Object.keys(t.placed).find(id => t.placed[id].kind === 'bed');
  if (bed) { t.beds[bed] = { crop: 'corn', doneAt: T0 - 1 }; must(t, 'harvest', { ids: [bed] }); assert.equal(t.stats.grown.corn, 2); }
});
test('three rival valleys: seeded, a little stronger at every fair, each with its turn at the front', () => {
  assert.equal(FAIR.valleys.length, 3);
  for (const cls of CLASSES) {
    assert.deepEqual(rivalsOf(T0, 0, cls), rivalsOf(T0, 0, cls)); assert.notDeepEqual(rivalsOf(T0, 0, cls), rivalsOf(T0 + 1, 0, cls));
    for (const n of [0, 1, 3, R.steps, R.steps + 5]) { const top = R.from + R.step * Math.min(n, R.steps) + R.spread * 2 + R.wobble;
      for (const x of rivalsOf(T0, n, cls)) assert.ok(x >= R.from + R.step * Math.min(n, R.steps) && x <= top, `${cls} ${n}: ${x}`); }
    assert.ok(Math.max(...rivalsOf(T0, R.steps, cls)) > Math.max(...rivalsOf(T0, 0, cls))); assert.ok(Math.abs(wobbleOf(T0, 0, cls)) <= FAIR.wobble); assert.equal(wobbleOf(T0, 2, cls), wobbleOf(T0, 2, cls));
  }
  // the finest thing a farm can show, known well and liked, can still win the last and hardest fair
  assert.ok(FAIR.base[1] + FAIR.know + FAIR.taste - FAIR.wobble >= R.from + R.step * R.steps + R.spread * 2 + R.wobble);
  const fronts = new Set(); for (let n = 0; n < 3; n++) fronts.add(rivalsOf(T0, n, 'field').map((x, i) => [x, i]).sort((a, b) => b[0] - a[0])[0][1]); assert.ok(fronts.size >= 2, 'the same valley is always in front');
});
test('entries: the most promising of what the barn holds, or the one chosen while it lasts', () => {
  const s = farm({ wheat: 10, pumpkin: 10, peach: 2, bread: 10, honey_cake: 3, perch: 3 }); let f = fairOf(s, T0);
  assert.ok(f.open && f.ok && !f.active, JSON.stringify(f.reason)); assert.equal(f.fee, fee); assert.equal(f.entries, 3);
  assert.deepEqual(f.classes.map(c => [c.id, c.judge]), [['field', 'grace'], ['kitchen', 'lan'], ['pond', 'olaf']]);
  assert.deepEqual(f.classes[0].options.map(o => o.good), ['pumpkin', 'wheat'], 'two peaches are not enough to enter'); assert.equal(f.classes[0].entry, 'pumpkin');
  assert.equal(f.classes[1].entry, 'honey_cake'); assert.equal(f.classes[2].entry, 'perch'); for (const o of optionsOf(s, 'kitchen')) assert.ok(o.stars >= 1 && o.stars <= 5);
  must(s, 'chooseEntry', { cls: 'kitchen', good: 'bread' }); assert.equal(fairOf(s, T0).classes[1].entry, 'bread');
  for (const [args, why] of [[{ cls: 'kitchen', good: 'wheat' }, 'That does not belong in this class'], [{ cls: 'barn', good: 'bread' }, 'That does not belong in this class'], [{ cls: 'field', good: 'peach' }, 'The fair needs {each} of it'], [{}, 'That does not belong in this class']]) {
    const before = JSON.stringify(s), r = act(s, 'chooseEntry', args, T0); assert.equal(r.reason, why); assert.equal(JSON.stringify(s), before);
  }
  s.barn.items.bread = each - 1; assert.equal(fairOf(s, T0).classes[1].entry, 'honey_cake', 'a chosen entry that ran out gives way to the best that is left');
  // nothing to enter in a class leaves it empty; nothing at all cannot open a fair
  s.barn.items = { wheat: 5 }; f = fairOf(s, T0); assert.equal(f.entries, 1); assert.ok(f.ok); assert.equal(f.classes[2].entry, null);
  s.barn.items = { egg: 50, wheat: 2 }; f = fairOf(s, T0); assert.equal(f.ok, false); assert.equal(f.reason, 'The fair needs an entry: {each} of a crop, a food or a fish');
  s.barn.items = { wheat: 5 }; s.coins = fee - 1; assert.equal(fairOf(s, T0).reason, 'Not enough coins');
  const early = farm(); delete early.valley; assert.equal(fairOf(early, T0).reason, 'Found the valley company first'); assert.equal(act(early, 'chooseEntry', { cls: 'kitchen', good: 'bread' }, T0).ok, false);
});
test('holding the fair: each entry leaves the barn once, the judges place it, ribbons and prizes are given', () => {
  const s = farm({ bread: 10, wheat: 10, perch: 10 }); know(s, 'bread', 500);   // bread known well and liked by Honey: gold at a first fair; plain wheat nobody knows: no ribbon
  const coins = s.coins, hearts = s.people?.lan?.hearts ?? 0, r = must(s, 'holdFair', {});
  assert.deepEqual(s.barn.items, { bread: 10 - each, wheat: 10 - each, perch: 10 - each });
  const k = r.results.kitchen, w = r.results.field;
  assert.equal(k.good, 'bread'); assert.equal(k.score, partsOf(s, 'kitchen', 'bread').sum + wobbleOf(T0, 0, 'kitchen')); assert.deepEqual(k.rivals, rivalsOf(T0, 0, 'kitchen'));
  assert.equal(k.place, 1); assert.equal(k.medal, 'gold'); assert.equal(w.place, 4); assert.equal(w.medal, null);
  for (const cls of CLASSES) { const x = r.results[cls]; assert.equal(x.place, 1 + x.rivals.filter(v => v > x.score).length); assert.equal(x.medal, MEDALS[x.place - 1] ?? null); }
  const won = CLASSES.filter(cls => r.results[cls].medal), prize = won.reduce((sum, cls) => sum + prizes[r.results[cls].medal] + (r.results[cls].medal === 'gold' ? firstGold : 0), 0);
  assert.equal(r.coins, prize); assert.equal(s.coins, coins - fee + prize); assert.equal(s.fair.ribbons, won.length); assert.equal(r.ribbons, won.length);
  assert.equal(s.fair.best.kitchen, 'gold'); assert.equal(s.fair.best.field, undefined); assert.equal(s.fair.n, 1); assert.equal(s.fair.until, T0 + lastsMs); assert.deepEqual(s.fair.last, { n: 0, results: r.results });
  assert.ok(r.events.some(e => e.type === 'fairHeld' && e.firsts.includes('kitchen') && e.ribbons === won.length)); assert.ok(r.events.some(e => e.type === 'coins' && e.source === 'fair' && e.coins === prize));
  assert.equal(s.people.lan.hearts, Math.min(10, hearts + FAIR.hearts), 'the judge who gave a ribbon grows fonder'); assert.equal(reportOf(s).rows.find(([key]) => key === 'fair')?.[1], prize);
  // while it runs, and while the valleys rest, there is no second fair; nothing is taken for the asking
  for (const [at, why] of [[T0 + 1000, 'The fair is on'], [T0 + lastsMs + 1000, 'The three valleys are resting after the last fair'], [T0 + everyMs - 1, 'The three valleys are resting after the last fair']]) {
    const before = JSON.stringify(s), again = act(s, 'holdFair', {}, at); assert.equal(again.reason, why); assert.equal(JSON.stringify(s), before);
  }
  assert.ok(fairOf(s, T0 + 1000).active); assert.equal(fairOf(s, T0 + lastsMs).active, false); assert.equal(fairOf(s, T0 + 1000).readyAt, T0 + everyMs);
  // the same farm, saved and loaded, is judged the same; and so is its twin
  const twin = farm({ bread: 10, wheat: 10, perch: 10 }); know(twin, 'bread', 500); assert.deepEqual(must(unpack(pack(twin)), 'holdFair', {}).results, r.results);
  const back = unpack(pack(s)); assert.deepEqual(back.fair, s.fair);
  // a second gold in the same class pays its prize, not the first-gold purse again; rivals have grown
  tick(s, T0 + everyMs); const c2 = s.coins, r2 = must(s, 'holdFair', {}, T0 + everyMs);
  assert.deepEqual(r2.results.kitchen.rivals, rivalsOf(T0, 1, 'kitchen')); assert.equal(s.fair.n, 2); assert.equal(s.fair.last.n, 1);
  const prize2 = CLASSES.reduce((sum, cls) => { const m = r2.results[cls].medal; return sum + (m ? prizes[m] + (m === 'gold' && cls !== 'kitchen' ? firstGold : 0) : 0); }, 0);
  assert.equal(s.coins, c2 - fee + prize2); assert.equal(s.fair.best.kitchen, 'gold'); assert.ok(!r2.events.find(e => e.type === 'fairHeld').firsts.includes('kitchen'));
});
test('a better medal replaces a worse one, never the other way', () => {
  const s = farm({ bread: 20 }); know(s, 'bread', 500); must(s, 'holdFair', {}); assert.equal(s.fair.best.kitchen, 'gold');
  s.barn.items = { noodles: 20 }; tick(s, T0 + everyMs); const r = must(s, 'holdFair', {}, T0 + everyMs);   // noodles nobody knows: a lesser place
  assert.notEqual(r.results.kitchen.medal, 'gold'); assert.equal(s.fair.best.kitchen, 'gold');
});
test('the fair\'s end is told once and counted: a deed for the valley\'s name, and chapter 18 with a ribbon', () => {
  const s = farm({ bread: 10 }); know(s, 'bread', 500);
  assert.ok(BEATS.find(b => b.id === 'fair-talk').when(s)); assert.equal(ch.when(s), false); assert.equal(stepDone(s, 'valley_fair'), false);
  const deeds = deedsOf(s), value = valueOf(s); must(s, 'holdFair', {});
  assert.equal(tick(s, T0 + lastsMs - 1).events.some(e => e.type === 'fairEnded'), false); assert.equal(ch.when(s), false, 'the chapter waits for the fair to end'); assert.ok(BEATS.find(b => b.id === 'first-ribbon').when(s));
  const end = tick(s, T0 + lastsMs).events.filter(e => e.type === 'fairEnded'); assert.equal(end.length, 1); assert.equal(end[0].ribbons, 1);
  assert.equal(s.stats.fairs, 1); assert.equal(deedsOf(s), deeds + 1); assert.ok(ch.when(s)); assert.ok(stepDone(s, 'valley_fair'));
  assert.equal(tick(s, T0 + lastsMs + 5000).events.some(e => e.type === 'fairEnded'), false); assert.equal(s.stats.fairs, 1);
  assert.ok(STAGES.find(st => st.id === 'valley').milestones.some(m => m.test === 'fairRibbon')); const j = journeyOf(s); if (j.stage.id === 'valley') assert.ok(j.milestones.find(m => m.test === 'fairRibbon').done);
  assert.ok(valueOf(s) !== value);
  // a fair without a ribbon is a fair, but not the chapter
  const t = farm({ wheat: 10 }); must(t, 'holdFair', {}); tick(t, T0 + lastsMs); assert.equal(t.stats.fairs, 1); assert.equal(t.fair.ribbons, 0); assert.equal(ch.when(t), false);
});
test('chapter 18 closes after a fair with a ribbon; the tester can jump past it', () => {
  assert.ok(ch && ch.panels.length === 3 && ch.ada); const en = resolveNames(ch.text, 'en'); assert.ok(en.length <= 340, `${en.length} letters`); assert.match(en, /Honey judges the bread with her eyes closed/); assert.match(en, /Skipper measures every fish twice/);
  for (const id of ['fair-talk', 'first-ribbon']) assert.equal(BEATS.find(b => b.id === id).chapter, 18);
  const t = newGame(T0, 3, { restore: true }); tick(t, T0); const r = must(t, 'testJumpChapter', { chapter: 19 });
  assert.deepEqual(r.missing, []); assert.equal(t.story.chapter, 18); assert.ok(ch.when(t)); assert.ok(fairOf(t, T0).readyAt <= T0, 'the valleys have rested: the tester can hold a fair at once');
  const u = farm({ bread: 10 }); must(u, 'testFinishChapter', {}); assert.ok(ch.when(u));
});
