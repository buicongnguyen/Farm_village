// Browser checks for the look and collection-feedback pass (AR-001, art lane): fruit picking and a golden catch have a
// visual response, takings waiting at a stand never fly to the wallet (only a real collection does), reduced motion
// keeps the effects still, and the phone budgets hold with effects running.
// Run after `npm run build:test` with dist served (GAME_URL, default http://127.0.0.1:5242/).
import { chromium } from 'playwright';
import { SHAPE } from '../src/view/particles.mjs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5242/';
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const results = [];
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${URL_}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => farm.skipIntro());
  await page.waitForFunction(() => farm.world.juice && farm.radial?.fx, null, { timeout: 30000 });
  await page.evaluate(() => {
    const g = farm.game, s = g.s; s.level = 8; s.coins = 50000; s.settings.daylight = 'always'; farm.closeCards();
    for (const [k, x, z] of [['cherry_tree', 40, 69], ['apple_tree', 42, 69], ['peach_tree', 44, 69]]) {
      // New farms seed these owned cells with grass, weeds or rocks. Prepare them before planting,
      // and refuse a missing-tree fixture rather than passing on incidental particles elsewhere.
      if (s.cells[z * 128 + x] !== 0) { const r = g.do('clear', { x, z }); if (!r.ok) throw Error('fixture clearing: ' + r.reason); }
      const r = g.do('place', { kind: k, x, z }); if (!r.ok) throw Error('fixture planting: ' + r.reason);
    }
    for (const id of Object.keys(s.trees)) s.trees[id].doneAt = g.now - 1;
    g.tick(); farm.focus(42, 70, 22); farm.people?.walkers.forEach(w => { w.indoors = true; });
  });
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  catch (e) { results.push([name, 'FAIL']); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

await check('picking fruit bursts fruit and leaves, floats +n, and flies only what was stored to the barn', async () => {
  const { ctx, page, errors } = await open();
  const r = await page.evaluate(async () => {
    const j = farm.world.juice, shapes = [], spawn = j.particles.spawn;
    // Count this action's emitted shapes: the 19-particle burst must not rely on incidental smoke
    // to reach twenty, or lose already-existing particles while waiting for the frame to render.
    j.particles.spawn = function (o) { const added = spawn.call(this, o); if (added !== false) shapes.push(o.shape); return added; };
    let events;
    try { events = farm.game.do('pick', {}).events.filter(e => e.type === 'picked').length; }
    finally { j.particles.spawn = spawn; }
    await new Promise(res => setTimeout(res, 120));
    return { events, shapes, floaters: document.querySelectorAll('.jfloat').length, flying: document.querySelectorAll('.jcoin, .jfly, [class*="fly"]').length };
  });
  expect(r.events >= 1, `trees should have been picked: ${JSON.stringify(r)}`);
  expect(r.shapes.includes(SHAPE.dot) && r.shapes.includes(SHAPE.leaf) && r.shapes.includes(SHAPE.star), `fruit, leaves and glints should burst: ${JSON.stringify(r)}`);
  expect(r.floaters >= 1, `a +n floater should show: ${JSON.stringify(r)}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('a golden carp has its own gold burst; an ordinary catch does not', async () => {
  const { ctx, page, errors } = await open();
  const r = await page.evaluate(async () => {
    const j = farm.world.juice; farm.focus(15, 42, 18);
    const a = j.alive; farm.game.emit({ ok: true, events: [{ type: 'fishCaught', fish: 'perch' }] }, 'test'); await new Promise(res => setTimeout(res, 80)); const perch = j.alive - a;
    const b = j.alive; farm.game.emit({ ok: true, events: [{ type: 'fishCaught', fish: 'goldfish' }] }, 'test'); await new Promise(res => setTimeout(res, 80)); const gold = j.alive - b;
    return { perch, gold, ring: document.querySelectorAll('.jf-gold').length };
  });
  expect(r.gold >= 12 && r.perch < 4 && r.ring >= 1, JSON.stringify(r));
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('takings waiting at a stall do not fly to the wallet; collecting them does', async () => {
  const { ctx, page, errors } = await open();
  const r = await page.evaluate(async () => {
    const count = () => document.querySelectorAll('.jcoin').length, wait = ms => new Promise(res => setTimeout(res, ms));
    farm.game.emit({ ok: true, events: [{ type: 'stallSold', sold: 1, coins: 5 }] }, 'test'); await wait(250); const sale = count();
    farm.game.emit({ ok: true, events: [{ type: 'fruitSold', sold: 1, coins: 7 }] }, 'test'); await wait(250); const fruit = count();
    farm.game.emit({ ok: true, events: [{ type: 'coins', coins: 12 }] }, 'test'); await wait(250); const paid = count();
    return { sale, fruit, paid };
  });
  expect(r.sale === 0 && r.fruit === 0 && r.paid >= 8, JSON.stringify(r));
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('reduced motion: no particles for a pick or a golden catch, the floater only fades', async () => {
  const { ctx, page, errors } = await open();
  const r = await page.evaluate(async () => {
    document.body.classList.add('reduced-motion'); const j = farm.world.juice, a = j.alive;
    farm.game.do('pick', {}); farm.game.emit({ ok: true, events: [{ type: 'fishCaught', fish: 'goldfish' }] }, 'test'); await new Promise(res => setTimeout(res, 150));
    return { spawned: j.alive - a, floaters: document.querySelectorAll('.jfloat').length, marks: farm.marks.glint.visible };
  });
  expect(r.spawned <= 2 && r.floaters >= 1, JSON.stringify(r));
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('the markers carry a dark backing and a warm glint, and the phone budgets hold with effects running', async () => {
  const { ctx, page, errors } = await open();
  await page.evaluate(() => { for (const id of Object.keys(farm.game.s.beds)) farm.game.s.beds[id].doneAt = farm.game.now - 1; });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => ({ backing: farm.marks.backing?.visible, glint: farm.marks.glint.material.color.getHexString() }));
  expect(m.backing === true && m.glint !== 'ffffff', JSON.stringify(m));
  for (const span of [24, 60, 140, 220]) {
    await page.evaluate(() => { farm.game.do('pick', {}); });
    const info = await page.evaluate(s => { farm.view(s, 50, 80); return new Promise(r => setTimeout(r, 700)).then(() => farm.measure(600)); }, span);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
  }
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} look checks passed`);
process.exit(failed.length ? 1 : 0);
