// Browser suite. Builds nothing itself: run `npm run build:test`, serve dist (node scripts/serve-dist.mjs 5241),
// then `npm run test:browser`. GAME_URL overrides the address; GPU=0 uses the software renderer.
// Each check is a function; the suite grows with the milestones.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const SHOTS = process.env.SHOTS ?? 'test-results/ui/'; mkdirSync(SHOTS, { recursive: true });
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
  await page.evaluate(() => document.querySelector('[data-act="lang"]').click());
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
  farm.closeCards(); farm.focus(38, 61, 36); farm.build.show();
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
await check('first session: a truly modal chapter card, then the camera flies to the weeds and Ada guides the first steps (phone)', async () => {
  const { ctx, page, errors } = await open('phone', '?new', { intro: true });
  expect(await page.isVisible('.chapter'), 'no chapter card');
  expect(!(await page.isVisible('.guide')), 'the guide should wait until Begin');
  await page.screenshot({ path: `${SHOTS}ui-1-chapter-phone.png` });
  // only Begin answers: a tap outside the card (or on the HUD behind it) changes nothing
  for (const [x, y] of [[20, 20], [370, 820], [195, 30]]) await page.mouse.click(x, y);
  expect(await page.isVisible('.chapter'), 'a tap outside closed the chapter card');
  expect(await page.evaluate(() => (farm.state().story.chapter ?? 0) === 0), 'the chapter was marked seen by a tap outside');
  expect(await page.evaluate(() => document.querySelectorAll('.chapter .panels img').length) >= 1, 'no story panel on the chapter card');
  expect(await page.isVisible('.chapter .ada'), "no line from Ada on the chapter card");
  await page.click('.chapter [data-close]');
  await page.waitForSelector('.guide:not([hidden])', { timeout: 5000 });
  await page.waitForSelector('.pointer:not([hidden])', { state: 'attached', timeout: 3000 });
  const view = await page.evaluate(() => { const r = farm.cellToScreen(34, 59); return { r, modal: !!document.querySelector('.modal') }; });
  expect(!view.modal, 'a card is still open after Begin');
  expect(view.r.x > 0 && view.r.x < 390 && view.r.y > 0 && view.r.y < 844, `the weeds are off screen after Begin: ${JSON.stringify(view.r)}`);
  await page.screenshot({ path: `${SHOTS}ui-2-weeds-phone.png` });
  expect(await page.isVisible('[data-act="build"]') && await page.isVisible('[data-act="barn"]'), 'the build and barn buttons should be there from the start');
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
await check('settings: a slider keeps its place while the clock redraws the panels', async () => {
  const { ctx, page } = await open('phone');
  await page.click('[data-act="settings"]');
  const same = await page.evaluate(async () => { const el = document.querySelector('[data-range="sound"]'); el.focus(); await new Promise(r => setTimeout(r, 2300)); return document.querySelector('[data-range="sound"]') === el; });
  expect(same, 'the sound slider was replaced by a redraw');
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
  farm.closeCards(); farm.focus(35, 58, 30);
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
  // the sweep is over: a level-up card that waited for it comes now
  await page.evaluate(() => { farm.radial.armed = null; }); await page.waitForTimeout(500); await page.evaluate(() => farm.closeCards());
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
  farm.closeCards(); farm.panels.close();
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

// ── ui package: icons, toasts, rewards, expansion, the cart, letters, fit at 390 px ──
const EMOJI = /\p{Extended_Pictographic}/u;
/** Rendered icons and emoji glyphs inside an element (its text). */
const iconCount = (page, sel) => page.evaluate(([sel, src]) => {
  const el = document.querySelector(sel); if (!el) return { missing: true };
  const re = new RegExp(src, 'u'), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let emoji = 0, n;
  while ((n = walker.nextNode())) emoji += [...n.textContent].filter(c => re.test(c)).length;
  return { imgs: el.querySelectorAll('img').length, svgs: el.querySelectorAll('svg').length, emoji };
}, [sel, EMOJI.source]);
const uiSetup = page => page.evaluate(() => {
  const g = farm.game; g.s.coins = 20000;
  for (let z = 56; z <= 71; z++) for (let x = 32; x <= 47; x++) g.do('clear', { x, z });
  for (let x = 30; x <= 47; x++) g.do('place', { kind: 'path', x, z: 63 });
  for (let i = 0; i < 6; i++) g.do('place', { kind: 'bed', x: 33 + i, z: 58 });
  g.s.level = 5; g.s.xp = 400;
  g.do('place', { kind: 'feed_mill', x: 32, z: 64, rot: 2 }); g.do('place', { kind: 'coop', x: 35, z: 64, rot: 2 }); g.do('place', { kind: 'bakery', x: 40, z: 64, rot: 2 });
  Object.assign(g.s.barn.items, { wheat: 14, corn: 6, carrot: 9, egg: 4, bread: 3, chicken_feed: 5 });
  farm.closeCards(); farm.panels.close();
});
await check('icons: the order board, barn, build catalogue and bakery show rendered icons and no emoji (phone)', async () => {
  const { ctx, page, errors } = await open('phone', '?new');
  await uiSetup(page);
  const bakery = await page.evaluate(() => Object.keys(farm.state().placed).find(k => farm.state().placed[k].kind === 'bakery'));
  const panels = [['orders', () => farm.panels.show('orders')], ['barn', () => farm.panels.show('barn')], ['production', id => farm.panels.show('production', id)],
    ['build', () => { farm.panels.close(); farm.build.show(); farm.build.cat = 'charm'; farm.build.render(); }]];
  for (const [name, show] of panels) {
    await page.evaluate(show, bakery); await page.waitForTimeout(200);
    const c = await iconCount(page, name === 'build' ? '.sheet.build' : '.sheet.panel');
    expect(!c.missing && c.imgs >= 3 && c.emoji === 0, `${name}: ${JSON.stringify(c)}`);
  }
  const hud = await iconCount(page, '.hud');
  expect(hud.emoji === 0 && hud.imgs >= 4, `HUD: ${JSON.stringify(hud)}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('toasts: three gated buildings chosen in a row give at most two toasts and no repeats (phone)', async () => {
  const { ctx, page } = await open('phone', '?new');
  await page.evaluate(() => { farm.game.s.level = 6; farm.build.show(); farm.build.cat = 'projects'; farm.build.render(); });
  for (const kind of ['school', 'cow_barn', 'bakery']) { await page.evaluate(k => farm.build.select(k), kind); await page.waitForTimeout(60); }
  await page.evaluate(() => farm.build.select('school'));
  const toasts = await page.evaluate(() => [...document.querySelectorAll('.toast:not(.gone)')].map(t => t.dataset.text));
  expect(toasts.length >= 1 && toasts.length <= 2, `toasts: ${JSON.stringify(toasts)}`);
  expect(new Set(toasts).size === toasts.length, `repeated toasts: ${JSON.stringify(toasts)}`);
  expect(await page.evaluate(() => !!document.querySelector('.toast:not(.gone) .toast-icon')), 'no padlock on the lock toast');
  await ctx.close();
});
await check('rewards: level 2 shows the level-up card with unlock tiles; the coin counter rolls (phone)', async () => {
  const { ctx, page } = await open('phone', '?new');
  await page.evaluate(() => { const g = farm.game; g.s.xp = 9; g.s.coins = 50; g.do('clear', { x: 34, z: 59 }); });
  await page.waitForSelector('.levelup', { timeout: 3000 });
  const tiles = await page.evaluate(() => document.querySelectorAll('.levelup .unlock-tile').length);
  expect(tiles >= 1, `${tiles} unlock tiles`);
  expect((await page.textContent('.levelup h2')).includes('2'), 'the card does not name level 2');
  await page.screenshot({ path: `${SHOTS}ui-levelup-phone.png` });
  await page.click('.levelup .btn.primary');
  expect(!(await page.isVisible('.levelup')), 'Continue did not close the card');
  // the coin counter rolls up to a new total: two readings 150 ms apart differ
  await page.evaluate(() => { const g = farm.game; g.s.coins += 600; g.emit({ ok: true, events: [{ type: 'coins', coins: 600 }] }, 'test'); });
  await page.waitForTimeout(60); const a = await page.textContent('[data-hud="coins"] b');
  await page.screenshot({ path: `${SHOTS}ui-coins-a.png`, clip: { x: 0, y: 0, width: 220, height: 80 } });
  await page.waitForTimeout(150); const b = await page.textContent('[data-hud="coins"] b');
  await page.screenshot({ path: `${SHOTS}ui-coins-b.png`, clip: { x: 0, y: 0, width: 220, height: 80 } });
  expect(a !== b, `the coin counter did not move: ${a} → ${b}`);
  await page.waitForTimeout(1000);
  expect((await page.textContent('[data-hud="coins"] b')).replace(/\D/g, '') === String(await page.evaluate(() => farm.state().coins)), 'the counter did not settle on the total');
  await ctx.close();
});
for (const device of ['phone', 'pc']) await check(`expansion: tap a For-sale parcel, see its price and outline, buy it (${device})`, async () => {
  const { ctx, page, errors } = await open(device, '?new');
  await page.evaluate(() => { const g = farm.game; g.s.level = 4; g.s.coins = 900; g.emit({ ok: true, events: [] }, 'test'); });
  const before = await page.evaluate(() => ({ parcels: farm.state().parcels.length, signs: farm.world.locked?.signs }));
  await tapCell(page, 40, 52);
  await page.waitForSelector('.radial-btn[data-act="buyParcel"]', { timeout: 3000 });
  expect((await page.textContent('.radial-info')).includes('500'), 'no price in the menu');
  expect(await page.evaluate(() => !!farm.world.scene.getObjectByName('parcel-outline')?.visible), 'no outline over the parcel');
  await page.screenshot({ path: `${SHOTS}ui-parcel-${device}.png` });
  await page.click('.radial-btn[data-act="buyParcel"]');
  const after = await page.evaluate(() => ({ parcels: farm.state().parcels.length, coins: farm.state().coins, signs: farm.world.locked?.signs, outline: farm.world.scene.getObjectByName('parcel-outline')?.visible }));
  expect(after.parcels === before.parcels + 1 && after.coins === 400, `not bought: ${JSON.stringify({ before, after })}`);
  expect(after.signs === 0 && !after.outline, `the sign or outline stayed: ${JSON.stringify(after)}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('the weekly cart: tap it, fill six crates and send it (phone)', async () => {
  const { ctx, page, errors } = await open('phone', '?new');
  await uiSetup(page);
  await page.evaluate(() => { const g = farm.game; g.do('testUnlockAll'); g.s.firsts['project:school'] = Date.now() - 3 * 864e5; g.tick();
    g.s.barn.cap = 2000; for (const c of g.s.cart.crates) g.s.barn.items[c.good] = (g.s.barn.items[c.good] ?? 0) + c.n; g.emit({ ok: true, events: [] }, 'test'); farm.closeCards(); });
  await page.waitForFunction(() => farm.world.batches.items.has('cart'), null, { timeout: 8000 }).catch(() => {});
  expect(await page.evaluate(() => farm.world.batches.items.has('cart')), 'the cart is not drawn at the gate');
  await tapCell(page, 26, 55);
  await page.waitForSelector('.sheet.panel[data-kind="cart"]', { timeout: 3000 });
  for (let i = 0; i < 6; i++) await page.click(`[data-do="fillCrate"][data-crate="${i}"]`);
  await page.screenshot({ path: `${SHOTS}ui-cart-phone.png` });
  const coins = await page.evaluate(() => farm.state().coins);
  await page.click('[data-do="sendCart"]');
  const s = await page.evaluate(() => ({ sent: farm.state().cart.sent, coins: farm.state().coins, carts: farm.state().stats.carts }));
  expect(s.sent && s.coins > coins && s.carts === 1, `cart not sent: ${JSON.stringify(s)}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('mail: the mailbox lists letters and one opens as a card (phone)', async () => {
  const { ctx, page, errors } = await open('phone', '?new');
  expect(await page.evaluate(() => (farm.state().mail ?? []).length) >= 1, 'no letter in the mailbox');
  await tapCell(page, 27, 60);
  await page.waitForSelector('.sheet.panel[data-kind="mail"] .letter-row', { timeout: 3000 });
  const id = await page.getAttribute('.letter-row', 'data-id');
  await page.click('.letter-row');
  await page.waitForSelector('.modal .letter .paper', { timeout: 3000 });
  expect(await page.evaluate(id => farm.state().mail.find(m => m.id === id)?.read, id), 'the letter was not marked read');
  await page.screenshot({ path: `${SHOTS}ui-letter-phone.png` });
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
/** Nothing inside the element is wider than it (across), and it sits inside the screen. */
const overflow = (page, sel) => page.evaluate(sel => {
  const el = document.querySelector(sel); if (!el) return `${sel} is missing`;
  const r = el.getBoundingClientRect(), bad = [];
  if (r.left < -0.5 || r.right > innerWidth + 0.5) bad.push(`${sel} sticks out of the screen`);
  for (const e of el.querySelectorAll('*')) {
    if (e.closest('.tabs, .cards')) continue;                 // rows that scroll across on purpose
    const q = e.getBoundingClientRect(); if (!q.width) continue;
    if (q.right > r.right + 1 || q.left < r.left - 1) bad.push(`"${String(e.textContent || e.className).slice(0, 30)}" sticks out`);
    if (e.scrollWidth > e.clientWidth + 1 && !['visible', 'hidden', 'clip'].includes(getComputedStyle(e).overflowX)) bad.push(`${e.tagName}.${e.className} overflows`);
  }
  return [...new Set(bad)].slice(0, 6).join('; ');
}, sel);
await check('Vietnamese: every panel fits a 390 px phone with no text sticking out', async () => {
  const { ctx, page } = await open('phone', '?new');
  await page.evaluate(() => document.querySelector('[data-act="lang"]').click()); await page.waitForFunction(() => document.documentElement.lang === 'vi');
  await uiSetup(page);
  await page.evaluate(() => { const g = farm.game; for (const x of [34, 38]) g.do('place', { kind: 'path', x, z: 92 }); g.do('place', { kind: 'cottage', x: 33, z: 93, rot: 2 }); g.do('testFinishTimers');
    g.do('testUnlockAll'); g.s.firsts['project:school'] = Date.now() - 3 * 864e5; g.tick(); farm.closeCards(); });
  const ids = await page.evaluate(() => ({ bakery: Object.keys(farm.state().placed).find(k => farm.state().placed[k].kind === 'bakery'), home: Object.keys(farm.state().homes)[0] }));
  const bad = [];
  for (const [kind, arg] of [['orders'], ['barn'], ['production', ids.bakery], ['today'], ['projects'], ['cottage', ids.home], ['cart'], ['mail'], ['friends'], ['gift', 'ada'], ['album'], ['settings']]) {
    await page.evaluate(([k, a]) => farm.panels.show(k, a), [kind, arg]); await page.waitForTimeout(120);
    const b = await overflow(page, '.sheet.panel'); if (b) bad.push(`${kind}: ${b}`);
    await page.screenshot({ path: `${SHOTS}ui-vi-${kind}.png` });
  }
  await page.evaluate(() => { farm.panels.close(); farm.build.show(); });
  const b = await overflow(page, '.sheet.build'); if (b) bad.push(`build: ${b}`);
  expect(!bad.length, bad.join('\n     '));
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
