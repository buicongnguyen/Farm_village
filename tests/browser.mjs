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
async function open(device = 'pc', query = '', { intro = false } = {}) {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  if (!intro) await page.evaluate(() => farm.skipIntro());
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

await check('loading: the farm is on screen within 3.5 s on a simulated 4G phone (TECH-PLAN 6)', async () => {
  const ctx = await browser.newContext(DEVICES.phone), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: 9e6 / 8, uploadThroughput: 4e6 / 8 });
  const t0 = Date.now(); await page.goto(URL_ + '?new'); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  const ms = Date.now() - t0; console.log(`     first scene after ${ms} ms on 9 Mbit/s with 70 ms latency`);
  expect(ms < 3500, `${ms} ms`);
  await ctx.close();
});
// ── M5: the first session ──
await check('first session: the chapter card, then Ada guides the first steps (phone)', async () => {
  const { ctx, page, errors } = await open('phone', '?new', { intro: true });
  expect(await page.isVisible('.chapter'), 'no chapter card');
  expect(!(await page.isVisible('[data-act="build"]')), 'the build button should wait for the tutorial');
  await page.click('.chapter [data-close]');
  expect(await page.isVisible('.guide'), 'no guide card');
  // clear the three tutorial weeds through the tap menu
  for (const [x, z] of [[34, 59], [35, 60], [34, 61]]) { await tapCell(page, x, z); await page.click('.radial-btn[data-act="clear"]'); }
  const step = await page.evaluate(() => farm.state().story.tutorial);
  expect(step === 1, `tutorial step ${step}`);
  expect(await page.isVisible('[data-act="build"]'), 'the build button should appear for the path step');
  await page.click('[data-g="next"]');
  expect(await page.evaluate(() => farm.state().story.tutorial) === 2, 'I know how did not skip a step');
  await page.click('[data-g="skip"]');
  expect(!(await page.isVisible('.guide')), 'the guide should be gone');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('settings: text size, language and day and night from the settings panel', async () => {
  const { ctx, page } = await open('pc', '?new');
  await page.click('[data-act="settings"]');
  await page.click('[data-key="textSize"][data-value="1.3"]');
  expect(await page.evaluate(() => document.body.dataset.text) === '1.3', 'text size not applied');
  await page.click('[data-key="daylight"][data-value="always"]');
  expect(await page.evaluate(() => farm.state().settings.daylight) === 'always', 'daylight not saved');
  await page.click('[data-key="lang"][data-value="vi"]');
  expect((await page.textContent('.panel-head h2')).includes('Cài đặt'), 'language not switched');
  await page.click('[data-key="lang"][data-value="en"]');
  await ctx.close();
});

// ── M3: the farm loop on screen ──
const setupFarm = page => page.evaluate(() => {
  const g = farm.game; g.s.coins = 5000;
  g.do('clear', { cells: [[34, 59], [35, 60], [34, 61]] });
  for (let z = 56; z <= 71; z++) for (let x = 32; x <= 47; x++) g.do('clear', { x, z });
  for (let x = 30; x <= 47; x++) g.do('place', { kind: 'path', x, z: 63 });
  for (let i = 0; i < 6; i++) g.do('place', { kind: 'bed', x: 33 + i, z: 58 });
  farm.focus(35, 58, 30);
});
for (const device of ['phone', 'pc']) await check(`farm loop: plant by tap and sweep, harvest, deliver Ada's order (${device})`, async () => {
  const { ctx, page, errors } = await open(device, '?new');
  await setupFarm(page);
  await tapCell(page, 33, 58);
  await page.click('.radial-btn[data-crop="wheat"]');
  // sweep across the other five beds
  const pts = await page.evaluate(() => [34, 35, 36, 37, 38].map(x => farm.cellToScreen(x, 58)));
  await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
  for (const p of pts) await page.mouse.move(p.x, p.y, { steps: 4 });
  await page.mouse.up();
  const planted = await page.evaluate(() => Object.keys(farm.state().beds).length);
  expect(planted === 6, `${planted} beds planted`);
  await page.evaluate(() => farm.setClockOffset(40_000));
  await tapCell(page, 35, 58);
  await page.click('.radial-btn[data-act="harvestAll"]');
  const wheat = await page.evaluate(() => farm.state().barn.items.wheat);
  expect(wheat === 18, `wheat in the barn: ${wheat}`);
  await page.click('[data-act="orders"]');
  const coins = await page.evaluate(() => farm.state().coins);
  await page.click('.order.can [data-do="deliver"]');
  expect(await page.evaluate(() => farm.state().coins) > coins, 'no coins for the order');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});
await check('saves: the farm is still there after a reload, and time away counts', async () => {
  const { ctx, page } = await open('pc', '?new');
  await setupFarm(page);
  await page.evaluate(() => { const g = farm.game; g.s.story.firstWheat = false; g.do('plant', { ids: Object.keys(g.s.placed), crop: 'wheat' }); });
  await page.waitForTimeout(1400);                                   // autosave runs a second after the last change
  await page.evaluate(() => farm.setClockOffset(8 * 3600e3));        // eight hours later
  await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  const s = await page.evaluate(() => ({ beds: farm.state().counts.bed, ready: Object.values(farm.state().beds).filter(b => b.doneAt <= farm.game.now).length }));
  expect(s.beds === 6, `beds after reload: ${s.beds}`); expect(s.ready === 6, `ready after 8 hours: ${s.ready}`);
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});
await check('budget: a fully planted large farm stays within the phone budgets at every zoom', async () => {
  const { ctx, page } = await open('phone', '?new');
  const n = await page.evaluate(() => farm.fillFarm());
  expect(n > 2500, `${n} crops`);
  for (const span of [40, 90, 220]) {
    const info = await page.evaluate(s => { farm.view(s, 128, 112); return new Promise(r => setTimeout(r, 1200)).then(() => farm.measure(800)); }, span);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
    console.log(`     span ${span}: ${info.draws} draws, ${Math.round(info.triangles / 1000)}k triangles, ${info.fps} fps`);
  }
  await ctx.close();
});

// ── M4: the village ──
const villageSetup = page => page.evaluate(() => {
  const g = farm.game; g.s.coins = 20000;
  g.do('clear', { cells: [[34, 59], [35, 60], [34, 61]] });
  for (let z = 56; z <= 71; z++) for (let x = 32; x <= 47; x++) g.do('clear', { x, z });
  for (let x = 30; x <= 47; x++) g.do('place', { kind: 'path', x, z: 63 });
  for (let i = 0; i < 6; i++) g.do('place', { kind: 'bed', x: 33 + i, z: 58 });
  g.s.level = 5; g.s.xp = 400;
  g.do('place', { kind: 'feed_mill', x: 32, z: 64, rot: 2 }); g.do('place', { kind: 'coop', x: 35, z: 64, rot: 2 });
  for (const x of [34, 38]) g.do('place', { kind: 'path', x, z: 92 });
  g.do('place', { kind: 'cottage', x: 33, z: 93, rot: 2 }); g.s.barn.items.bread = 5; g.do('projectDeliver');
  g.do('place', { kind: 'cottage', x: 37, z: 93, rot: 2 });
  farm.setClockOffset(3 * 60_000);
  document.querySelectorAll('.modal').forEach(m => m.remove()); farm.panels.close();
});
await check('village: families walk, the projects panel builds the school on its ruin (phone)', async () => {
  const { ctx, page, errors } = await open('phone', '?new');
  await villageSetup(page);
  await page.waitForTimeout(1500);
  const walkers = await page.evaluate(() => farm.people ? [...farm.people.walkers.keys()] : []);
  expect(walkers.includes('minh') && walkers.includes('zara'), `walkers: ${walkers}`);
  await page.evaluate(() => { farm.game.s.barn.items.bread = 10; farm.game.s.barn.items.corn_bread = 4; document.querySelectorAll('.modal').forEach(m => m.remove()); });
  await page.click('[data-act="projects"]');
  await page.click('[data-do="projectDeliver"]');
  await page.click('[data-do="buildProject"]');
  await page.evaluate(() => farm.game.do('place', { kind: 'path', x: 52, z: 105 }));   // a path from the ruin's door ...
  await page.evaluate(() => { for (let z = 92; z <= 104; z++) farm.game.do('place', { kind: 'path', x: 52, z }); farm.build.refreshGhost(); });   // ... to the road
  for (let i = 0; i < 4 && !(await page.evaluate(() => farm.build.check().ok)); i++) await page.click('[data-bar="rotate"]');
  await page.click('[data-bar="ok"]');
  expect(await page.evaluate(() => farm.state().counts.school) === 1, `school not built: ${await page.evaluate(() => JSON.stringify(farm.build.check()))}`);
  expect(await page.evaluate(() => !farm.world.batches.items.has('ruin:school')), 'the ruin is still there');
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => farm.people.walkers.has('cora')), 'Cora did not arrive with the school');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});
await check('village: a neighbour walks in and talks; Today gift; cottage rent', async () => {
  const { ctx, page } = await open('pc', '?new');
  await villageSetup(page);
  await page.evaluate(() => farm.game.emit({ ok: true, events: [{ type: 'neighbourVisit', id: 'mai', helped: 0, comment: 'Your fields are so tidy!' }] }, 'test'));
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => farm.people.walkers.has('visit:mai')), 'Mai is not walking in');
  await page.click('[data-act="today"]');
  const coins = await page.evaluate(() => farm.state().coins);
  await page.click('[data-do="claimGift"]');
  expect(await page.evaluate(() => farm.state().coins) !== coins || await page.evaluate(() => farm.state().today.claimed), 'gift not claimed');
  await page.evaluate(() => farm.setClockOffset(3 * 3600e3));
  const cottage = await page.evaluate(() => Object.keys(farm.state().homes)[0]);
  await page.evaluate(id => farm.panels.show('cottage', id), cottage);
  const before = await page.evaluate(() => farm.state().coins);
  await page.click('[data-do="collectRent"]');
  expect(await page.evaluate(() => farm.state().coins) > before, 'no rent collected');
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
