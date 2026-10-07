// Browser checks for v0.3 "Restore Hollowbrook": the village as it stands, repairs with real taps, roads, the farmhouse, demolish.
// Run after `npm run build:test` with dist served (GAME_URL, default http://127.0.0.1:5241/).
import { chromium } from 'playwright';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  pc: { viewport: { width: 1280, height: 800 } },
};
const results = [];
async function open(device = 'phone') {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${URL_}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.skipIntro(); farm.game.s.settings.daylight = 'always'; });
  await page.waitForFunction(() => farm.world.batches.has('feed_mill'), null, { timeout: 30000 });
  return { ctx, page, errors };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  catch (e) { results.push([name, 'FAIL']); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
/** Bring a cell into the part of the screen no menu covers, then click it. */
const tap = async (page, x, z) => {
  // walkers wander over the spot and a tap on a person talks to them: send them indoors so the tap reaches the thing
  const p = await page.evaluate(([x, z]) => { farm.people?.walkers.forEach(w => { w.indoors = true; }); farm.focusVisible(x, z); return farm.cellToScreen(x, z); }, [x, z]);
  await page.waitForTimeout(40); await page.mouse.click(p.x, p.y); await page.waitForTimeout(120);
};
const idOf = (page, kind, n = 0) => page.evaluate(([kind, n]) => Object.keys(farm.state().placed).filter(id => farm.state().placed[id].kind === kind)[n], [kind, n]);
const cellOf = (page, id) => page.evaluate(id => { const p = farm.state().placed[id]; return [p.x + 1, p.z + 1]; }, id);

await check('the village is there at the start: broken buildings look run down, the beds are sown, 500 coins', async () => {
  const { ctx, page, errors } = await open('phone');
  // the cottages come from the town kit, which loads after the first scene
  await page.waitForFunction(() => [...farm.world.batches.items.values()].filter(it => /@3$/.test(it.model)).length >= 6, null, { timeout: 30000 }).catch(() => {});
  const s = await page.evaluate(() => { const s = farm.state(); const b = farm.world.batches; return { coins: s.coins, beds: Object.keys(s.beds).length, mill: s.placed[Object.keys(s.placed).find(i => s.placed[i].kind === 'feed_mill')].kind,
    dusty: [...b.items.values()].filter(it => /@3$/.test(it.model)).length, mode: s.mode }; });
  expect(s.mode === 'restore' && s.coins === 500 && s.beds === 6, JSON.stringify(s));
  expect(s.dusty >= 5, `${s.dusty} broken things drawn in their run-down look (3 cottages, mill, coop, bakery expected)`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('tap a broken feed mill: its menu offers Repair; the repair takes a short wait, then it works', async () => {
  const { ctx, page, errors } = await open('phone');
  const mill = await idOf(page, 'feed_mill'), [cx, cz] = await cellOf(page, mill);
  await tap(page, cx, cz);
  expect(await page.isVisible('.radial-btn[data-act="repair"]'), 'no Repair button on the broken mill');
  const coins = await page.evaluate(() => farm.state().coins);
  await page.click('.radial-btn[data-act="repair"]');
  expect(await page.evaluate(() => farm.state().coins) < coins, 'the repair cost nothing');
  expect(await page.evaluate(id => !!farm.state().repairing[id], mill), 'no repair under way');
  expect(await page.evaluate(id => farm.world.batches.items.has(`scaffold:${id}`), mill) || !(await page.evaluate(() => farm.world.batches.has('scaffold'))), 'no scaffolding while it is repaired');
  await tap(page, cx, cz);                                    // while repairing: a status, no repair button
  expect(!(await page.isVisible('.radial-btn[data-act="repair"]')), 'a repair under way offers no second repair');
  await page.evaluate(() => farm.setClockOffset(100_000));
  await page.waitForFunction(id => !farm.state().repairing[id] && !(farm.state().cond[id]?.level), mill, { timeout: 8000 });
  expect(await page.evaluate(id => !/@/.test(farm.world.batches.items.get(id)?.model ?? ''), mill), 'the repaired mill still looks run down');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});
await check('a damaged road and the worn farmhouse can be repaired from their menus; the farmhouse can be upgraded', async () => {
  const { ctx, page } = await open('phone');
  // a neighbour's visit may already have mended the worn farmhouse (that is the feature): make it worn again
  await page.evaluate(() => { farm.game.s.coins = 3000; farm.game.s.level = 5; farm.game.s.cond.house = { level: 1, ms: 3 * 3600e3 }; farm.game.s.neighbours = {}; });
  const seg = await page.evaluate(() => [31, 90]);       // the village street (road_south), a damaged stretch
  await tap(page, ...seg);
  expect(await page.isVisible('.radial-btn[data-act="repair"]'), 'no Repair on the damaged road');
  await page.click('.radial-btn[data-act="repair"]');
  expect(await page.evaluate(() => !!farm.state().repairing.road_south), 'the road repair did not start');
  await tap(page, 22, 62);                               // the farmhouse
  expect(await page.isVisible('.radial-btn[data-act="repair"]'), 'no Repair on the worn farmhouse');
  await page.click('.radial-btn[data-act="repair"]');
  expect(await page.evaluate(() => !farm.state().cond.house), 'a worn house is mended at once');
  await tap(page, 22, 62);
  expect(await page.isVisible('.radial-btn[data-act="upgradeHouse"]'), 'no upgrade on the farmhouse');
  const cap = await page.evaluate(() => farm.state().barn.cap); await page.click('.radial-btn[data-act="upgradeHouse"]');
  expect(await page.evaluate(() => farm.state().barn.cap) > cap, 'the barn did not grow');
  await ctx.close();
});
await check('build mode: the Demolish tool takes a cottage down for part of its price and leaves a half-price rebuild', async () => {
  const { ctx, page } = await open('pc');
  const cot = await idOf(page, 'cottage'), [cx, cz] = await cellOf(page, cot);
  await page.evaluate(() => { farm.game.s.coins = 3000; farm.build.show(); farm.build.tool('demolish'); });
  const coins = await page.evaluate(() => farm.state().coins);
  await tap(page, cx, cz);
  expect(await page.evaluate(id => !farm.state().placed[id], cot), 'the cottage is still there');
  expect(await page.evaluate(() => farm.state().coins) > coins, 'no refund'); expect(await page.evaluate(() => farm.state().rebuild.cottage) === 1, 'no rebuild credit');
  await ctx.close();
});
await check('the restored village holds the phone budgets at every zoom', async () => {
  const { ctx, page } = await open('phone');
  await page.waitForTimeout(3000);
  for (const span of [24, 60, 140, 220]) {
    const info = await page.evaluate(s => { farm.view(s, 50, 80); return new Promise(r => setTimeout(r, 900)).then(() => farm.measure(700)); }, span);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
  }
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} restore checks passed`);
process.exit(failed.length ? 1 : 0);
