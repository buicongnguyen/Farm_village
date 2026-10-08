// Collection feedback follows real accounting; exercise phone UI in both languages.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { pick as fishFor } from '../src/core/fishing.mjs';
import { FRUITS, GOODS } from '../src/content/goods.mjs';
import { STALL, FRUIT_STAND } from '../src/content/economy.mjs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;
async function observe(page) {
  await page.evaluate(() => {
    const g = farm.game; clearInterval(g.timer); g.timer = 0;
    window.__collectNow = Math.max(g.now, g.s.lastSeen); g.clock = () => window.__collectNow;
    window.__collections = [];
    g.on((r, action) => window.__collections.push({ action, ...structuredClone(r) }));
    window.__collectDo = (action, args) => { const r = g.do(action, args); if (!r.ok) throw Error(action + ': ' + r.reason); return r; };
    farm.skipIntro(); farm.closeCards(); g.s.settings.daylight = 'always';
  });
}
async function check(lang, name, run) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  try {
    await ctx.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
    await page.goto(URL_ + '?new&restore');
    await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.waitForFunction(() => farm.world.batches.has('cherry_tree'), null, { timeout: 30000 });
    await observe(page);
    await page.evaluate(() => { __collectDo('testUnlockAll', { coins: 30000 }); farm.game.s.barn.items = {}; farm.closeCards(); });
    await run(page);
    assert.deepEqual(errors, []);
    console.log('ok   ' + name + ' (' + lang + ' phone)');
  } catch (e) { failed++; console.log('FAIL ' + name + ' (' + lang + ' phone)\n     ' + e.stack); }
  finally { await ctx.close(); }
}
async function tapTree(page, x, z) {
  const p = await page.evaluate(([x, z]) => {
    farm.closeCards(); farm.panels.close(); farm.build.close();
    farm.people.walkers.forEach(w => { w.indoors = true; });
    farm.focusVisible(x, z); return farm.cellToScreen(x, z);
  }, [x, z]);
  await page.mouse.click(p.x, p.y); await page.click('.radial-btn[data-act="pick"]');
  await page.evaluate(() => farm.closeCards());
}
async function panel(page, kind) {
  await page.evaluate(kind => { farm.closeCards(); farm.panels.show(kind); }, kind);
  await page.waitForSelector('.sheet[data-kind="' + kind + '"]');
  assert(await page.evaluate(() => {
    const el = document.querySelector('.sheet.panel'), r = el.getBoundingClientRect();
    return r.left >= -.5 && r.right <= innerWidth + .5 && el.scrollWidth <= el.clientWidth + 1;
  }), kind + ' panel overflows phone');
}
const events = (page, type) => page.evaluate(type => __collections.flatMap(r => r.events ?? []).filter(e => e.type === type), type);
async function reload(page) {
  await page.evaluate(() => window.__fvSave()); await page.goto(URL_);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 }); await observe(page);
}
function seedFor(fish) {
  for (let n = 0; n < 1000; n++) if (fishFor('catch:' + n, false) === fish) return 'catch:' + n;
  throw Error('No fixture seed for ' + fish);
}
for (const lang of ['en', 'vi']) {
  await check(lang, 'cherry-only goals, real Pick, batch overflow and one-time claim', async page => {
    const fixture = await page.evaluate(() => {
      const g = farm.game, id = __collectDo('place', { kind: 'cherry_tree', x: 40, z: 60 }).id;
      if (Object.values(g.s.placed).some(p => ['apple_tree', 'peach_tree'].includes(p.kind))) throw Error('fixture is not cherry-only');
      let q;
      // Use the real generator; the fixed seed search avoids relying on today's minute hash.
      for (let seed = 1; seed <= 128 && !q; seed++) {
        g.s.seed = seed; g.s.quests = { list: [], done: 0 }; g.tick(); q = g.s.quests.list.find(q => q.t === 'fruit');
      }
      if (!q) throw Error('cherry-only farm never received a fruit goal');
      if (g.s.quests.list.some(q => q.person === 'sam')) throw Error('cherries unlocked an apple favour');
      __collectDo('testFinishTimers'); farm.closeCards(); return { id, q };
    });
    await tapTree(page, 40, 60);
    const [first] = await events(page, 'picked');
    assert.deepEqual(first, { type: 'picked', id: fixture.id, good: 'cherry', count: 3, stored: 3, sold: 0, coins: 0 });
    await page.evaluate(({ id, q }) => {
      while (farm.game.s.stats.picked < q.n) { __collectDo('testFinishTimers'); __collectDo('pick', { id }); }
      farm.closeCards();
    }, fixture);
    await panel(page, 'quests');
    const claim = page.locator('[data-do="claimQuest"][data-id="' + fixture.q.id + '"]');
    const goal = claim.locator('..');
    assert((await goal.textContent()).includes(lang === 'vi' ? 'Hái ' + fixture.q.n + ' quả' : 'Pick ' + fixture.q.n + ' fruit'));
    assert(await claim.isEnabled());
    const coins = await page.evaluate(() => farm.state().coins); await claim.click();
    assert.equal(await page.evaluate(() => farm.state().coins), coins + fixture.q.coins);
    assert.equal((await events(page, 'questDone')).length, 1);
    await reload(page);
    assert(await page.evaluate(id => !farm.game.do('claimQuest', { id }).ok, fixture.q.id));
    assert.equal(await page.evaluate(() => farm.state().coins), coins + fixture.q.coins);
    const result = await page.evaluate(id => {
      const g = farm.game, apple = __collectDo('place', { kind: 'apple_tree', x: 42, z: 60 }).id;
      g.s.barn.items = {}; g.s.barn.cap = 4; __collectDo('testFinishTimers');
      const before = g.s.coins, r = __collectDo('pick', { ids: [id, id, apple, 'missing', apple] });
      const refused = g.do('pick', { ids: [id, apple] }); farm.closeCards();
      return { before, after: g.s.coins, stock: g.s.barn.items, events: r.events, refused };
    }, fixture.id);
    const picked = result.events.filter(e => e.type === 'picked');
    assert.deepEqual(picked.map(({ good, count, stored, sold, coins }) => ({ good, count, stored, sold, coins })), [
      { good: 'cherry', count: 3, stored: 3, sold: 0, coins: 0 },
      { good: 'apple', count: 3, stored: 1, sold: 2, coins: 2 * GOODS.apple.value },
    ]);
    assert.deepEqual(result.stock, { cherry: 3, apple: 1 });
    assert.equal(result.after - result.before, 2 * GOODS.apple.value);
    assert.deepEqual(result.events.filter(e => e.type === 'barnSold'), [{ type: 'barnSold', coins: 2 * GOODS.apple.value }]);
    assert.equal(result.refused.ok, false); assert.deepEqual(result.refused.events, []);
    await page.waitForTimeout(600); assert.equal(await page.evaluate(() => farm.state().coins), result.after, 'feedback paid coins again');
  });
  await check(lang, 'fish rarity and first-catch metadata survive a save; fees pay once', async page => {
    const seed = seedFor('goldfish');
    const before = await page.evaluate(seed => {
      const g = farm.game; g.s.barn.items = { wheat: g.s.barn.cap };
      g.s.fishing.line = { seed, bait: false, doneAt: g.now }; return g.s.coins;
    }, seed);
    await panel(page, 'pond'); await page.click('[data-do="reelIn"]');
    assert.deepEqual(await events(page, 'fishCaught'), [{ type: 'fishCaught', fish: 'goldfish', first: true, rare: true, stored: 0, sold: 1, coins: GOODS.goldfish.value }]);
    assert.deepEqual(await events(page, 'barnSold'), [{ type: 'barnSold', coins: GOODS.goldfish.value }]);
    await page.waitForTimeout(600); assert.equal(await page.evaluate(() => farm.state().coins), before + GOODS.goldfish.value);
    await reload(page);
    await page.evaluate(seed => {
      const g = farm.game; g.s.barn.items = {}; g.s.fishing.line = { seed, bait: false, doneAt: g.now };
    }, seed);
    await panel(page, 'pond'); await page.click('[data-do="reelIn"]');
    assert.deepEqual(await events(page, 'fishCaught'), [{ type: 'fishCaught', fish: 'goldfish', first: false, rare: true, stored: 1, sold: 0, coins: 0 }]);
    // The second stored fish earns no sale income; its separate one-time discovery pays twenty coins.
    assert.deepEqual(await events(page, 'discovery'), [{ type: 'discovery', id: 'pond-tin', coins: 20, person: 'pip' }]);
    assert.deepEqual(await events(page, 'barnSold'), []);
    assert.equal(await page.evaluate(() => farm.state().coins), before + GOODS.goldfish.value + 20);
    assert.equal(await page.evaluate(() => farm.state().barn.items.goldfish), 1);
    await page.evaluate(() => { farm.game.s.fishing.coins = 9; farm.game.emit({ ok: true, events: [] }, 'test'); });
    await page.click('[data-do="collectFees"]');
    assert.deepEqual(await events(page, 'coins'), [{ type: 'coins', coins: 20, source: 'discovery', id: 'pond-tin' }, { type: 'coins', coins: 9, source: 'pond' }]);
    assert.equal(await page.evaluate(() => farm.state().coins), before + GOODS.goldfish.value + 20 + 9);
    assert(await page.evaluate(() => {
      const g = farm.game, before = JSON.stringify(g.s), r = g.do('collectFees');
      return !r.ok && !r.events.length && JSON.stringify(g.s) === before;
    }));
  });
  await check(lang, 'stall and fruit-stand sales stay in the till until UI collection, including reload', async page => {
    const ids = await page.evaluate(() => {
      const ok = __collectDo;
      for (const x of [30, 31, 44, 45]) ok('place', { kind: 'path', x, z: 64 });
      const fruit = ok('place', { kind: 'fruit_stand', x: 30, z: 65, rot: 2 }).id;
      const stall = ok('place', { kind: 'stall', x: 44, z: 65, rot: 2 }).id;
      farm.game.s.barn.items = { wheat: 3, cherry: 3 }; farm.closeCards(); return { fruit, stall };
    });
    await panel(page, 'stall'); await page.click('[data-do="stallList"][data-good="wheat"]');
    await panel(page, 'fruit_stand'); await page.click('[data-do="fruitList"][data-good="cherry"]');
    const before = await page.evaluate(ms => {
      const g = farm.game, before = g.s.coins; g.tick(); window.__collectNow += ms;
      sessionStorage.setItem('fv-clock-offset', String(window.__collectNow - Date.now())); g.tick(); farm.closeCards(); return before;
    }, 3 * STALL.sellEveryMs[1]);
    assert.deepEqual(await events(page, 'stallSold'), [{ type: 'stallSold', sold: 3, coins: 3 * GOODS.wheat.value }]);
    const fruitCoins = 3 * Math.round(FRUITS.cherry.value * FRUIT_STAND.bonus);
    assert.deepEqual(await events(page, 'fruitSold'), [{ type: 'fruitSold', sold: 3, coins: fruitCoins }]);
    assert.deepEqual(await events(page, 'coins'), []);
    assert.equal(await page.evaluate(() => farm.state().coins), before);
    await reload(page);
    assert.equal(await page.evaluate(() => farm.state().coins), before);
    await panel(page, 'stall'); await page.click('[data-do="stallCollect"]');
    await panel(page, 'fruit_stand'); await page.click('[data-do="fruitCollect"]');
    assert.deepEqual(await events(page, 'coins'), [
      { type: 'coins', coins: 3 * GOODS.wheat.value, source: 'stall', id: ids.stall },
      { type: 'coins', coins: fruitCoins, source: 'fruit_stand', id: ids.fruit },
    ]);
    await page.waitForTimeout(600);
    const after = before + 3 * GOODS.wheat.value + fruitCoins;
    assert.equal(await page.evaluate(() => farm.state().coins), after);
    await reload(page);
    assert(await page.evaluate(() => {
      const g = farm.game, before = JSON.stringify(g.s), a = g.do('stallCollect'), b = g.do('fruitCollect');
      return !a.ok && !b.ok && !a.events.length && !b.events.length && JSON.stringify(g.s) === before;
    }));
    assert.equal(await page.evaluate(() => farm.state().coins), after);
  });
}
await browser.close(); process.exit(failed ? 1 : 0);
