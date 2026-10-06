// Browser suite. Builds nothing itself: run `npm run build:test`, serve dist (node scripts/serve-dist.mjs 5241),
// then `npm run test:browser`. GAME_URL overrides the address; GPU=0 uses the software renderer.
// Each check is a function; the suite grows with the milestones.
import { chromium } from 'playwright';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  pc: { viewport: { width: 1280, height: 800 } },
};
const results = [];
async function open(device = 'pc', query = '') {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  return { ctx, page, errors };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok', Date.now() - t0]); console.log(`ok   ${name}`); }
  catch (e) { results.push([name, 'FAIL', Date.now() - t0, e.message]); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

// ── Checks ──
for (const device of Object.keys(DEVICES)) await check(`boots on ${device} with no errors`, async () => {
  const { ctx, page, errors } = await open(device);
  expect(await page.locator('canvas').count() === 1, 'no canvas');
  const info = await page.evaluate(() => farm.measure(1000));
  expect(info.draws > 0 && info.triangles > 0, `nothing drawn: ${JSON.stringify(info)}`);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});
await check('stays within the phone budgets at every zoom', async () => {
  const { ctx, page } = await open('phone');
  for (const span of [40, 90, 220]) {
    const info = await page.evaluate(s => { farm.view(s); return farm.measure(800); }, span);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
  }
  await ctx.close();
});
await check('Vietnamese switch changes the HUD', async () => {
  const { ctx, page } = await open('pc');
  await page.click('[data-act="lang"]');
  await page.click('[data-act="build"]');
  const tab = await page.textContent('.sheet .tab');
  expect(tab.includes('Nông trại'), `first tab is "${tab}"`);
  await ctx.close();
});

// ── M2: build mode with real taps ──
// A player drags the map so the spot is in view, then taps it: centre the view on the cell (in the part of the screen the
// sheet does not cover), then click its screen position.
const tapCell = async (page, x, z, fx, fz) => {
  const p = await page.evaluate(([x, z, fx, fz]) => { farm.focusVisible(x, z); return farm.cellToScreen(x, z, fx, fz); }, [x, z, fx ?? 0.5, fz ?? 0.5]);
  await page.waitForTimeout(30); await page.mouse.click(p.x, p.y); await page.waitForTimeout(60);
};
const prep = page => page.evaluate(() => {
  const g = farm.game; g.s.coins = 5000;
  g.do('clear', { cells: [[34, 59], [35, 60], [34, 61]] });
  for (let z = 56; z <= 71; z++) for (let x = 32; x <= 47; x++) g.do('clear', { x, z });
  for (let x = 30; x <= 47; x++) g.do('place', { kind: 'path', x, z: 63 });
  farm.focus(38, 61, 36); farm.build.show();
});
for (const device of ['phone', 'landscape']) await check(`build mode: tap to place beds (${device})`, async () => {
  const { ctx, page, errors } = await open(device);
  await prep(page);
  await page.evaluate(() => farm.build.select('bed'));
  for (let i = 0; i < 6; i++) await tapCell(page, 33 + i, 58);
  const beds = await page.evaluate(() => farm.state().counts.bed);
  expect(beds === 6, `${beds} beds placed`);
  expect(await page.evaluate(() => farm.state().projects.step) >= 2, 'the plot project should be done');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('build mode: ghost, rotate and confirm a feed mill (landscape)', async () => {
  const { ctx, page } = await open('landscape');
  await prep(page);
  await page.evaluate(() => { const g = farm.game; for (let i = 0; i < 6; i++) g.do('place', { kind: 'bed', x: 33 + i, z: 57 }); g.s.level = 3; g.s.xp = 100; farm.build.select('feed_mill'); });
  await tapCell(page, 40, 64);   // facing north, its door opens onto the spine path at row 63
  const before = await page.evaluate(() => farm.build.check().ok);
  for (let i = 0; i < 4 && !(await page.evaluate(() => farm.build.check().ok)); i++) await page.click('[data-bar="rotate"]');
  expect(await page.evaluate(() => farm.build.check().ok), `no rotation fits (first try ok: ${before})`);
  await page.click('[data-bar="ok"]');
  expect(await page.evaluate(() => farm.state().counts.feed_mill) === 1, 'feed mill not placed');
  await ctx.close();
});
await check('build mode: move and store (pc)', async () => {
  const { ctx, page } = await open('pc');
  await prep(page);
  await page.evaluate(() => { farm.game.do('place', { kind: 'flowers', x: 40, z: 58 }); farm.build.tool('move'); });
  await tapCell(page, 40, 58); await tapCell(page, 42, 59);
  const moved = await page.evaluate(() => Object.values(farm.state().placed).find(p => p.kind === 'flowers'));
  expect(moved.x === 42 && moved.z === 59, `flowers at ${moved.x},${moved.z}`);
  await page.evaluate(() => farm.build.tool('store')); await tapCell(page, 42, 59);
  expect(await page.evaluate(() => farm.state().stored.flowers === 1 && !farm.state().counts.flowers), 'flowers not stored');
  await ctx.close();
});
await check('build mode: fences go on the edge nearest the tap', async () => {
  const { ctx, page } = await open('pc');
  await prep(page);
  await page.evaluate(() => { const g = farm.game; for (let i = 0; i < 6; i++) g.do('place', { kind: 'bed', x: 33 + i, z: 57 }); g.s.level = 3; g.s.xp = 100; farm.build.select('fence'); });
  await tapCell(page, 40, 66, 0.5, 0.1);
  const fences = await page.evaluate(() => Object.keys(farm.state().fences));
  expect(fences.includes('40,66,n'), `fences: ${fences}`);
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
