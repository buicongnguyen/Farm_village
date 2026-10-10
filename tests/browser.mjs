// Browser suite. Builds nothing itself: run `npm run build:test`, serve dist (node scripts/serve-dist.mjs 5241),
// then `npm run test:browser`. GAME_URL overrides the address; GPU=0 uses the software renderer; ONLY="text" runs the
// checks whose name contains it.
// Each check is a function; the suite grows with the milestones.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { GOODS } from '../src/content/goods.mjs';
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
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;   // ONLY="chapter 9" runs the checks whose name has that text
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok', Date.now() - t0]); console.log(`ok   ${name}`); }
  catch (e) { results.push([name, 'FAIL', Date.now() - t0, e.message]); console.log(`FAIL ${name}\n     ${e.message}${process.env.STACK ? `\n${(e.stack ?? '').split('\n').filter(l => l.includes('browser.mjs')).join('\n')}` : ''}`); }   // STACK=1 says which line
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
await check('build mode on a keyboard: R turns the ghost, Enter lands it, Esc cancels and then closes (pc)', async () => {
  const { ctx, page } = await open('pc');
  await prep(page);
  await page.evaluate(() => { const g = farm.game; for (let i = 0; i < 6; i++) g.do('place', { kind: 'bed', x: 33 + i, z: 57 }); g.s.level = 3; g.s.xp = 100; farm.build.select('feed_mill'); });
  await tapCell(page, 40, 64);
  const rot = await page.evaluate(() => farm.build.rot); await page.keyboard.press('r');
  expect(await page.evaluate(() => farm.build.rot) === (rot + 1) % 4, 'R did not turn the ghost');
  for (let i = 0; i < 4 && !(await page.evaluate(() => farm.build.check().ok)); i++) await page.keyboard.press('r');
  expect(await page.evaluate(() => farm.build.check().ok), 'no rotation fits');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => farm.state().counts.feed_mill) === 1, 'Enter did not place the feed mill');
  await page.evaluate(() => farm.build.select('feed_mill')); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => farm.build.open && !farm.build.mode), 'Esc did not cancel the placement');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => !farm.build.open), 'a second Esc did not close build mode');
  expect(await page.evaluate(() => farm.state().counts.feed_mill) === 1, 'a key placed a second building');
  await ctx.close();
});
await check('barn: holding a Sell button keeps selling until you let go; a short click still sells one (pc)', async () => {
  const { ctx, page } = await open('pc');
  await prep(page);
  await page.evaluate(() => { farm.game.s.barn.items.wheat = 60; farm.panels.show('barn'); });
  await page.waitForSelector('.good-tile[data-good="wheat"]');
  const wheat = () => page.evaluate(() => farm.state().barn.items.wheat);
  await page.click('.good-tile[data-good="wheat"]'); expect(await wheat() === 59, `a click sold ${60 - await wheat()}`);
  const box = await page.locator('.good-tile[data-good="wheat"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
  const after = await wheat(); expect(after <= 55 && after >= 45, `holding for 1.5 s left ${after} of 59`);
  await page.waitForTimeout(500); expect(await wheat() === after, 'it went on selling after the button was let go');
  await page.click('.good-tile[data-good="wheat"]'); expect(await wheat() === after - 1, 'the next click did not sell one');
  await ctx.close();
});
await check('with a mouse, a click on the world beside an open menu only leaves the menu (pc)', async () => {
  const { ctx, page } = await open('pc');
  await page.evaluate(() => { farm.closeCards(); farm.panels.show('barn'); }); await page.waitForSelector('.sheet.panel:not([hidden])');
  const spot = await page.evaluate(() => { for (let y = 260; y < 640; y += 40) for (let x = 120; x < 760; x += 40) if (document.elementFromPoint(x, y)?.tagName === 'CANVAS') return [x, y]; return null; });
  expect(!!spot, 'no free world beside the menu'); await page.mouse.click(...spot); await page.waitForTimeout(300);
  expect(await page.evaluate(() => !farm.panels.open), `the click outside at ${spot} did not close the menu`);
  expect(await page.evaluate(() => !document.querySelector('.radial:not([hidden]) button') && !farm.panels.open), 'the same click also opened something in the world');
  await ctx.close();
});
await check('build mode: move and store (pc)', async () => {
  const { ctx, page } = await open('pc');
  await prep(page);
  await page.evaluate(() => { farm.game.do('place', { kind: 'flowers', x: 40, z: 58 }); farm.build.tool('move'); });
  await tapCell(page, 40, 58); await tapCell(page, 46, 61);
  const moved = await page.evaluate(() => Object.values(farm.state().placed).find(p => p.kind === 'flowers'));
  expect(moved.x === 46 && moved.z === 61, `flowers at ${moved.x},${moved.z}`);
  await page.evaluate(() => farm.build.tool('store')); await tapCell(page, 46, 61);
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
  // This check targets weeds; Pip and Biscuit can wander across their tap targets and correctly take the tap
  // themselves. Park the cast on the west lane while exercising the tutorial. Separate cast checks cover talking.
  await page.evaluate(() => {
    for (const w of farm.people.walkers.values()) Object.assign(w, {
      x: 57, z: 129, route: [], goal: null, target: null, once: true, onceUntil: farm.people.time + 60,
    });
  });
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
  await page.locator('[data-range="sound"]').waitFor();
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
  await page.waitForFunction(() => document.documentElement.lang === 'vi');
  expect((await page.textContent('.panel-head h2')).includes('Cài đặt'), 'language not switched');
  await page.click('[data-key="lang"][data-value="en"]');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  expect(await page.textContent('.panel-head h2') === 'Settings', 'English settings did not return');
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
  g.s.level = 6; g.s.xp = 3000;
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
  await page.evaluate(() => { farm.game.s.barn.items.bread = 24; farm.game.s.barn.items.corn_bread = 10; document.querySelectorAll('.modal').forEach(m => m.remove()); });
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
    await page.evaluate(show, bakery);
    if (name !== 'build') await page.waitForFunction(() => !!farm.panels.renderer);
    await page.waitForTimeout(200);
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
  // every parcel of the farm can be bought now: the signs move on to the land next to the new parcel
  expect(after.signs >= 3 && !after.outline && await page.evaluate(() => farm.buyable?.().every(p => !farm.state().parcels.includes(p.parcel)) ?? true), `the signs did not move on or the outline stayed: ${JSON.stringify(after)}`);
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
    await page.evaluate(([k, a]) => farm.panels.show(k, a), [kind, arg]);
    await page.waitForFunction(() => !!farm.panels.renderer); await page.waitForTimeout(120);
    const b = await overflow(page, '.sheet.panel'); if (b) bad.push(`${kind}: ${b}`);
    await page.screenshot({ path: `${SHOTS}ui-vi-${kind}.png` });
  }
  await page.evaluate(() => { farm.panels.close(); farm.build.show(); });
  const b = await overflow(page, '.sheet.build'); if (b) bad.push(`build: ${b}`);
  expect(!bad.length, bad.join('\n     '));
  await ctx.close();
});

await check('tester tools: ?tester shows the tag; coins, levels and a chapter jump work from Settings, and the farm reopens at that chapter (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  expect(await page.locator('.tester-tag').count() === 1, 'no tester tag');
  await page.evaluate(() => farm.panels.show('settings')); await page.waitForSelector('.test-jump');
  const before = await page.evaluate(() => ({ coins: farm.state().coins, level: farm.state().level }));
  await page.click('[data-test="coins"]');
  expect(await page.evaluate(() => farm.state().coins) === before.coins + 10000, 'the coins button gave nothing');
  await Promise.all([page.waitForEvent('load'), page.click('[data-test="jump:6"]')]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  const s = await page.evaluate(() => { const st = farm.state(); return { chapter: st.story.chapter, school: st.counts.school ?? 0, clinic: st.counts.clinic ?? 0, families: Object.values(st.homes).filter(h => h.arrived).length, level: st.level, step: st.projects.step }; });
  expect(s.chapter === 5 && s.school >= 1 && s.clinic >= 1 && s.families === 4 && s.level >= 6, `after the jump: ${JSON.stringify(s)}`);
  expect(await page.locator('.tester-tag').count() === 1, 'the tools did not stay for the tab');
  await page.evaluate(() => { farm.closeCards(); farm.panels.show('settings'); }); await page.waitForSelector('.test-jump');
  expect(await page.locator('[data-test="jump:6"]').isDisabled(), 'chapter 6 can still be jumped to');
  await page.click('[data-test="levels"]');
  expect(await page.evaluate(() => farm.state().level) === s.level + 5, 'the levels button gave nothing');
  await page.screenshot({ path: `${SHOTS}tester-settings.png` });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await check('chapter 6: a market day starts by itself, the good of the day sells for double, and three fields close the chapter (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  // the tester's jump saves the farm and opens it again at the start of chapter 6
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:6'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.waitForSelector('[data-status="marketday"]', { timeout: 15000 });
  await page.waitForFunction(() => farm.people?.walkers?.has('hugo') && [...farm.world.batches.items.keys()].some(k => String(k).startsWith('market-flags-')), null, { timeout: 30000 });
  const day = await page.evaluate(() => { const s = farm.state(); return { good: s.marketDay.good, flags: [...farm.world.batches.items.keys()].filter(k => String(k).startsWith('market-flags-')).length, chapter: s.story.chapter, step: s.projects.step }; });
  expect(day.good && GOODS[day.good] && day.flags === 6 && day.chapter === 5, `market day: ${JSON.stringify(day)}`);
  await page.evaluate(() => farm.focus(77, 94, 26)); await page.waitForTimeout(900); await page.screenshot({ path: `${SHOTS}market-day-square.png` });
  // the pill opens the barn; the good of the day wears its badge and pays double
  await page.evaluate(g => { farm.closeCards(); const s = farm.state(); s.barn.cap = 500; s.barn.items[g] = 12; s.barn.items.wheat = 8; }, day.good);
  await page.click('[data-status="marketday"]'); await page.waitForSelector('.good-tile.day .day-badge');
  expect(await page.locator('.market-day.on').count() === 1 && await page.locator('.good-tile.day').count() === 1, 'the barn does not show the market day');
  await page.screenshot({ path: `${SHOTS}market-day-barn.png` });
  const coins = await page.evaluate(() => farm.state().coins);
  await page.click('.good-tile.day');
  const after = await page.evaluate(() => ({ coins: farm.state().coins, days: farm.state().stats.marketDays }));
  expect(after.coins === coins + 2 * GOODS[day.good].value && after.days === 1, `one ${day.good}: ${coins} -> ${after.coins}, days ${after.days}`);
  await page.click('[data-do="sellGood"][data-good="wheat"]');
  expect(await page.evaluate(() => farm.state().coins) === after.coins + GOODS.wheat.value, 'another good was paid double');
  // two more fields: the chapter card
  await page.evaluate(() => { farm.panels.close(); const g = farm.game; g.s.coins += 20000; for (const parcel of ['1,2', '0,1']) g.do('buyParcel', { parcel }); });
  await page.waitForSelector('.chapter-modal', { timeout: 15000 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('Market day') && card.includes('Barley') && card.includes('Bramble'), `the card: ${card.slice(0, 160)}`);
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-6-card.png` });
  await page.click('.chapter-modal [data-close]');
  await page.waitForFunction(() => farm.state().story.chapter === 6);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await check('chapter 7: the dock is built from its site panel, the brook by it can be fished, and the police post closes the chapter (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:7'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 20000; g.do('testAddLevels', { levels: 6 }); farm.closeCards(); });
  // a sign waits on the site; its panel builds the dock where it belongs
  await page.waitForFunction(() => farm.world.batches.items.has('sitesign:dock'), null, { timeout: 30000 });
  await page.evaluate(() => { farm.closeCards(); farm.panels.onSite('dock'); }); await page.waitForSelector('[data-do="siteBuild"]');
  expect(!(await page.locator('[data-do="siteBuild"]').getAttribute('data-why')), 'the Build button is blocked at level 12 with coins');
  await page.waitForTimeout(500); await page.screenshot({ path: `${SHOTS}dock-site-panel.png` });
  await page.click('[data-do="siteBuild"]');
  await page.waitForFunction(() => (farm.state().counts.dock ?? 0) === 1 && !farm.world.batches.items.has('sitesign:dock'));
  const id = await page.evaluate(() => Object.keys(farm.state().placed).find(k => farm.state().placed[k].kind === 'dock'));
  await page.waitForFunction(id => farm.world.batches.items.has(id), id, { timeout: 30000 });   // the model is in the late kit
  // the brook by the dock is fishing water: fish swim there, the pond panel is the dock's, a cast is a river line
  expect(await page.evaluate(id => farm.pondFish.ponds().some(p => p.id === id), id), 'no fish in the brook by the dock');
  await page.evaluate(id => { farm.closeCards(); farm.panels.show('pond', id); }, id); await page.waitForSelector('[data-pond]');
  expect((await page.textContent('.panel:not([hidden]) .panel-head, .panel:not([hidden]) h2')).includes('Boat dock'), 'the pond panel is not the dock\'s');
  expect((await page.textContent('[data-pond]')).includes('twice as often'), 'the panel does not say what the brook is good for');
  await page.evaluate(id => { farm.panels.close(); farm.game.do('castLine', { pond: id, foot: true }); }, id);
  expect(await page.evaluate(() => farm.state().fishing.line?.river === true), 'not a river line');
  await page.evaluate(() => { farm.game.do('pullLine'); farm.focus(33, 12, 18); }); await page.waitForTimeout(1200); await page.screenshot({ path: `${SHOTS}dock-on-the-brook.png` });
  // the police post: the chapter card, then the constable is in the village
  await page.evaluate(() => farm.game.do('rebuildCivic', { kind: 'police' }));
  await page.waitForSelector('.chapter-modal', { timeout: 15000 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('Safe streets') && card.includes('Constable Sage') && card.includes('Skipper'), `the card: ${card.slice(0, 160)}`);
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-7-card.png` });
  await page.click('.chapter-modal [data-close]');
  await page.waitForFunction(() => farm.state().story.chapter === 7 && farm.people?.walkers?.has('pearl'), null, { timeout: 30000 });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await check('chapter 8: the first company delivery closes the chapter, the sluice opens, the mill wheel turns and the manager is on the board (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:8'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  // the old mill stands by the brook from the start, its wheel still
  await page.waitForFunction(() => !!farm.world.oldMill?.wheel, null, { timeout: 40000 });
  const before = await page.evaluate(() => ({ target: farm.world.oldMill.target, full: farm.world.brook.uniforms.uFull.value, sluice: farm.state().firsts.sluice ?? null }));
  expect(before.target === 0 && before.full === 0 && before.sluice === null, `before the chapter: ${JSON.stringify(before)}`);
  await page.evaluate(() => { farm.closeCards(); farm.focus(41, 8, 16); }); await page.waitForTimeout(900); await page.screenshot({ path: `${SHOTS}old-mill-still.png` });
  // the tester's "Finish this chapter" does the deed; the card appears as in play
  await page.evaluate(() => farm.panels.onTest('finish'));
  await page.waitForSelector('.chapter-modal', { timeout: 20000 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('Work for everyone') && card.includes('Rusty') && card.includes('wheel'), `the card: ${card.slice(0, 160)}`);
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-8-card.png` });
  await page.click('.chapter-modal [data-close]');
  await page.waitForFunction(() => farm.state().story.chapter === 8 && !!farm.state().firsts.sluice && farm.world.oldMill.target > 0 && farm.world.brook.uniforms.uFull.value === 1, null, { timeout: 15000 });
  await page.waitForFunction(() => farm.world.oldMill.speed > 0.3, null, { timeout: 15000 });   // it creaks up to speed
  await page.evaluate(() => { farm.closeCards(); farm.focus(41, 8, 16); }); await page.waitForTimeout(900); await page.screenshot({ path: `${SHOTS}old-mill-turning.png` });
  // the manager speaks on the village board, and is in the village
  await page.evaluate(() => { farm.closeCards(); farm.panels.show('villageGrowth'); }); await page.waitForSelector('.board-voice', { timeout: 20000 });
  expect((await page.textContent('.board-voice')).includes('Penny'), 'the manager is not on the board');
  await page.waitForFunction(() => farm.people?.walkers?.has('bea'), null, { timeout: 30000 });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await check('chapter 9: the stage is rebuilt on the square, the Harvest Festival gathers the village under lanterns, and Oak comes home (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await page.evaluate(() => farm.setClockOffset(new Date().setHours(11, 0, 0, 0) - Date.now()));   // by day, so the evening is the festival's doing
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:9'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 50000; g.s.barn.cap = 5000; Object.assign(g.s.barn.items, { bread: 6, corn_bread: 5, apple_juice: 4, apple: 9, egg: 9, carrot: 9, wheat: 20 }); });
  // what is left of the old stage stands on the square; its panel builds the new one
  await page.waitForFunction(() => farm.world.batches.items.get('sitesign:stage')?.model === 'stage_burned', null, { timeout: 40000 });
  await page.evaluate(() => farm.focus(41, 100, 22)); await page.waitForTimeout(900); await page.screenshot({ path: `${SHOTS}stage-burned.png` });
  await page.evaluate(() => farm.panels.onSite('stage')); await page.waitForSelector('[data-do="siteBuild"]'); await page.click('[data-do="siteBuild"]');
  await page.waitForFunction(() => (farm.state().counts.stage ?? 0) === 1 && !farm.world.batches.items.has('sitesign:stage'));
  // the festival panel: the feast from the barn, then the evening
  await page.evaluate(() => { farm.closeCards(); farm.panels.show('festival'); }); await page.waitForSelector('[data-do="holdFestival"]');
  expect(await page.locator('.feast .slot.ready').count() === 6 && !(await page.locator('[data-do="holdFestival"]').isDisabled()), 'the feast is not laid');
  await page.waitForTimeout(400); await page.screenshot({ path: `${SHOTS}festival-panel.png` });
  const hearts = await page.evaluate(() => farm.state().people.lan?.hearts ?? 0);
  await page.click('[data-do="holdFestival"]');
  await page.waitForSelector('[data-status="festival"]', { timeout: 10000 });
  const on = await page.evaluate(() => ({ night: farm.world.daylight.nightness, glows: farm.world.daylight.glowCount.bulbs, lan: farm.state().people.lan?.hearts ?? 0, n: farm.state().stats.harvestFestivals ?? 0 }));
  expect(on.night > 0.2 && on.glows >= 20 && on.lan === hearts + 1 && on.n === 0, `the evening: ${JSON.stringify(on)}`);
  // people walk to the square and face the stage
  await page.waitForFunction(() => [...farm.people.walkers.values()].filter(w => w.party && !w.route.length && w.z > 198 && w.z < 210 && w.x > 74 && w.x < 90).length >= 4, null, { timeout: 60000 });
  await page.evaluate(() => { farm.closeCards(); farm.panels.close(); farm.focus(41, 101, 20); }); await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}festival-evening.png` });
  // the evening ends (the tester's Finish every timer), the chapter card, Bramble's scene, and Oak is home
  await page.evaluate(() => { farm.game.do('testFinishTimers'); farm.game.tick(); });
  await page.waitForSelector('.chapter-modal', { timeout: 20000 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('The village sings again') && card.includes('Bramble') && card.includes('lantern'), `the card: ${card.slice(0, 160)}`);
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-9-card.png` });
  await page.click('.chapter-modal [data-close]');
  await page.waitForFunction(() => farm.state().story.chapter === 9 && farm.world.daylight.nightness < 0.05, null, { timeout: 15000 });   // day again
  await page.waitForFunction(() => farm.people.walkers.has('ellis'), null, { timeout: 30000 });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await check('chapter 10: hired villagers are named and seen at work, the evening sums add up, and three hands close the chapter (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await page.evaluate(() => farm.setClockOffset(new Date().setHours(10, 0, 0, 0) - Date.now()));
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:10'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 30000; g.s.barn.cap = 5000; g.s.story.firstWheat = false; });
  // hire three hands in Friends: each shows the villager who took the job
  await page.evaluate(() => farm.panels.show('friends')); await page.waitForSelector('[data-do="hireHand"][data-role="field"]');
  for (const role of ['field', 'animals', 'workshop']) { await page.click(`[data-do="hireHand"][data-role="${role}"]`); await page.waitForSelector(`[data-do="releaseHand"][data-role="${role}"]`); }
  const names = await page.locator('.hand.on b').allTextContents();
  expect(names.length === 3 && names[0].includes('Chip') && names[1].includes('Clover') && names[2].includes('Honey'), `the hands: ${names.join(' | ')}`);
  expect(await page.locator('.hand.on .hand-face').count() === 3, 'the hired hands have no faces');
  await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}hands-named.png` });
  // a round of work: the field hand harvests, and Chip walks to the bed
  await page.waitForFunction(() => farm.people?.walkers?.has('minh'), null, { timeout: 40000 });
  const tasks = await page.evaluate(async () => {
    const g = farm.game, s = g.s; farm.panels.close(); farm.closeCards();
    g.do('plant', { ids: Object.keys(s.placed).filter(k => s.placed[k].kind === 'bed' && !s.beds[k]), crop: 'wheat' }); g.do('testFinishTimers'); g.tick();
    const off = +(sessionStorage.getItem('fv-clock-offset') ?? 0); farm.setClockOffset(off + 61000); g.do('testFinishTimers'); g.tick();
    return s.stats.handTasks ?? 0;
  });
  expect(tasks > 0, 'the hands did nothing');
  await page.waitForFunction(() => { const w = farm.people.walkers.get('minh'); return w && (w.route.length > 0 || w.todo?.act === 'sweep' || w.clipFor === 'Sweep'); }, null, { timeout: 15000 });
  // the evening: the pill offers the day's sums; the report shows the total, the hands and Maple's advice
  await page.evaluate(() => { const g = farm.game; g.s.barn.items.wheat = 20; g.do('sellGood', { good: 'wheat', n: 10 }); farm.setClockOffset(new Date().setHours(18, 30, 0, 0) - Date.now()); });
  await page.waitForSelector('[data-status="report"]', { timeout: 15000 });
  await page.waitForTimeout(600); await page.evaluate(() => farm.closeCards());   // the scene for three hands may be on screen
  await page.click('[data-status="report"]');
  await page.waitForSelector('.report-total');
  const report = await page.evaluate(() => ({ total: document.querySelector('.report-total b').textContent, hands: document.querySelectorAll('.report-hands li').length, advice: !!document.querySelector('.report-advice'), seen: farm.state().today.reportSeen }));
  expect(report.total !== '0' && report.hands >= 1 && report.advice, `the report: ${JSON.stringify(report)}`);
  await page.waitForFunction(() => farm.state().today.reportSeen === true); await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}evening-report.png` });
  expect(await page.locator('[data-status="report"]').count() === 0, 'the pill stays after the report was read');
  // thirty tasks: the chapter card
  await page.evaluate(() => { farm.panels.close(); farm.panels.onTest('finish'); });
  await page.waitForSelector('.chapter-modal', { timeout: 20000 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('Hands to help') && card.includes('Chip') && card.includes('Granny Maple'), `the card: ${card.slice(0, 160)}`);
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-10-card.png` });
  await page.click('.chapter-modal [data-close]'); await page.waitForFunction(() => farm.state().story.chapter === 10);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

// Chapter 11 (docs/plan/ch11-the-man-from-the-city.md): the one choice, played once each way.
for (const [kind, choice] of [['pc', 'meadow'], ['phone', 'factory']]) await check(`chapter 11: Mr Albright's offer, the ${choice} answer, what it opens and the card that reads by it (${kind})`, async () => {
  const { ctx, page, errors } = await open(kind, '?new&restore&tester');
  await page.evaluate(() => farm.setClockOffset(new Date().setHours(10, 0, 0, 0) - Date.now()));
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:11'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  // he is at the gate with his car, his stakes stand on the meadow, and a pill says an offer is waiting
  await page.waitForFunction(() => farm.people?.walkers?.has('albright') && farm.world.batches.items.has('meadow:stakes') && farm.world.batches.items.has('meadow:car'), null, { timeout: 40000 });
  await page.waitForTimeout(600); await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 30000; g.s.barn.cap = 5000; });
  await page.waitForSelector('[data-status="offer"]');
  // the Valley panel: the beauty and its parts, and a way to the offer
  await page.evaluate(() => farm.panels.show('valley')); await page.waitForSelector('.valley [data-do="offer"]');
  const before = await page.evaluate(() => ({ rank: document.querySelector('.valley-rank h3').textContent, rows: document.querySelectorAll('.valley-parts li').length, leaves: document.querySelectorAll('.valley-leaves i.on').length }));
  expect(before.rows >= 3 && before.leaves >= 1 && before.rank.length > 2, `the valley panel: ${JSON.stringify(before)}`);
  await page.click('.valley [data-do="offer"]'); await page.waitForSelector('.offer-modal .offer-choice');
  expect(await page.locator('.offer-choice').count() === 2 && await page.locator('.offer-choice li').count() === 6, 'two answers, three lines each');
  await page.waitForTimeout(500); await page.screenshot({ path: `${SHOTS}offer-${kind}.png` });
  const fits = await page.evaluate(() => { const r = document.querySelector('.offer-modal .card-modal').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0; });
  expect(fits, 'the offer card runs off the screen');
  // "Let me think" answers nothing
  await page.click('.offer-think'); await page.waitForFunction(() => !document.querySelector('.offer-modal'));
  expect(await page.evaluate(() => farm.state().story.albright == null), 'thinking gave an answer');
  // from the pill: pick, go back, pick again, and say yes
  await page.click('[data-status="offer"]'); await page.waitForSelector('.offer-choice');
  await page.click(`[data-pick="${choice}"]`); await page.waitForSelector(`[data-answer="${choice}"]`);
  expect((await page.textContent('.offer.sure')).includes('This cannot be changed'), 'no warning before the answer');
  await page.click('[data-back]'); await page.waitForSelector('.offer-choice'); await page.click(`[data-pick="${choice}"]`);
  await page.click(`[data-answer="${choice}"]`);
  await page.waitForFunction(c => farm.state().story.albright === c, choice);
  // the chapter card reads by the answer
  await page.waitForSelector('.chapter-modal', { timeout: 20000 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('The man from the city') && card.includes(choice === 'meadow' ? 'stays a meadow' : 'brick by brick') && card.includes('Granny Maple'), `the card: ${card.slice(0, 200)}`);
  await page.waitForFunction(() => { const img = document.querySelector('.chapter-modal figure.on img'); return img && img.complete && img.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-11-${choice}.png` });
  await page.click('.chapter-modal [data-close]'); await page.waitForFunction(() => farm.state().story.chapter === 11);
  await page.waitForTimeout(800); await page.evaluate(() => farm.closeCards());
  // he has gone, with his car and his stakes; the meadow shows the answer
  await page.waitForFunction(() => !farm.people.walkers.has('albright') && !farm.world.batches.items.has('meadow:car') && !farm.world.batches.items.has('meadow:stakes'), null, { timeout: 15000 });
  expect(await page.locator('[data-status="offer"]').count() === 0, 'the pill stays after the answer');
  if (choice === 'meadow') {
    await page.waitForFunction(() => [...farm.world.batches.items.keys()].filter(k => k.startsWith('meadow:f')).length >= 60 && farm.world.batches.items.has('meadow:hive2'), null, { timeout: 15000 });
    // beehives are open: one on the farm makes honey
    const honey = await page.evaluate(() => {
      const g = farm.game, s = g.s; let id = null;
      for (let z = 30; z <= 85 && !id; z++) for (let x = 34; x <= 93 && !id; x++) { const r = g.do('place', { kind: 'beehive', x, z }); if (r.ok) id = r.id; }
      if (!id) return 'no room for a hive';
      const made = g.do('produce', { building: id, recipe: 'honey' }); g.do('testFinishTimers'); g.tick(); g.do('collectProducts', { building: id });
      return made.ok ? s.barn.items.honey ?? 0 : made.reason;
    });
    expect(honey === 1, `honey: ${honey}`);
  } else {
    const id = await page.evaluate(() => Object.keys(farm.state().placed).find(k => farm.state().placed[k].kind === 'cannery'));
    expect(!!id && await page.evaluate(k => farm.world.batches.items.get(k)?.model === 'cannery', id), 'the cannery does not stand on the meadow');
    await page.evaluate(k => farm.panels.show('production', k), id); await page.waitForSelector('.sheet.panel [data-do="produce"]');
    expect((await page.textContent('.sheet.panel')).includes('Canned corn'), 'the cannery lists no tins');
    // make it a green one from the Valley panel: the penalty goes, young trees stand round it
    await page.evaluate(() => farm.panels.show('valley')); await page.waitForSelector('[data-do="greenCannery"]');
    const was = await page.evaluate(() => farm.state().coins);
    await page.click('[data-do="greenCannery"]'); await page.waitForFunction(() => farm.state().valley?.green === true);
    expect(await page.evaluate(() => farm.state().coins) === was - 6000, 'making it green cost something else');
    await page.waitForFunction(() => farm.world.batches.items.has('meadow:tree0') && !document.querySelector('[data-do="greenCannery"]'), null, { timeout: 8000 });
  }
  await page.evaluate(() => { farm.panels.close(); farm.closeCards(); farm.focus(61, 19, 30); });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}meadow-${choice}.png` });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

// Chapter 12 (docs/plan/ch12-one-river-many-farms.md): the newcomers call, the co-operative is founded at its board,
// a shared order is filled, and the card takes the gate off the towpath.
await check('chapter 12: two growers call, the co-operative is founded and fills an order, and the towpath opens (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await page.evaluate(() => farm.setClockOffset(new Date().setHours(10, 0, 0, 0) - Date.now()));
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:12'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  // the board stands on the square and the towpath's gate is shut; nobody can stand on the far bank
  await page.waitForFunction(() => farm.world.batches.items.get('story:board')?.model === 'cooperative_board' && farm.world.batches.items.get('story:gate')?.model === 'towpath_gate', null, { timeout: 40000 });
  const far = await page.evaluate(() => farm.people.canStand(50 * 2 + 1, 8 * 2 + 1));
  expect(far === false, 'the far bank is open before the chapter');
  // the two growers call (a tester does not wait for them): the twins come as two
  await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 30000; g.s.barn.cap = 5000; g.tick(); g.do('testFinishTimers'); g.tick(); });
  await page.waitForFunction(() => ['priya', 'twins'].every(id => (farm.state().neighbours[id]?.total ?? 0) >= 1), null, { timeout: 15000 });
  await page.waitForFunction(() => farm.people.walkers.has('visit:priya') && farm.people.walkers.has('visit:twins') && farm.people.walkers.has('visit:twins:2'), null, { timeout: 15000 });
  await page.waitForSelector('.modal', { timeout: 15000 });   // the idea
  expect((await page.textContent('.modal')).includes('Juniper'), 'the idea scene does not show');
  await page.evaluate(() => farm.closeCards());
  // the panel before founding: who has called, and the gift
  await page.evaluate(() => farm.panels.show('cooperative')); await page.waitForSelector('.coop [data-do="foundCooperative"]');
  expect(await page.locator('.coop-callers li.done').count() === 2 && await page.locator('.coop-members span').count() === 4, 'callers and members');
  expect(await page.locator('[data-do="foundCooperative"]').isDisabled(), 'founding without the gift');
  await page.evaluate(() => { const s = farm.state(); Object.assign(s.barn.items, { bread: 12, cheese: 6, apple_juice: 6 }); farm.game.tick(); });
  await page.waitForFunction(() => !document.querySelector('[data-do="foundCooperative"]')?.disabled);
  await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}cooperative-founding.png` });
  await page.click('[data-do="foundCooperative"]');
  await page.waitForSelector('.coop-line'); await page.evaluate(() => farm.closeCards());
  expect(await page.locator('.coop-line').count() === 3, 'the order has three lines');
  expect(await page.evaluate(() => { const s = farm.state(); return (s.barn.items.bread ?? 0) === 0 && (s.barn.items.cheese ?? 0) === 0; }), 'the gift was not taken');
  // send a little, then all: the neighbours' third is drawn, the line fills
  const first = await page.evaluate(() => { const s = farm.state(); for (const l of s.cooperative.order.lines) s.barn.items[l.good] = (s.barn.items[l.good] ?? 0) + (l.need - l.pledged); farm.game.tick(); return s.cooperative.order.lines[0]; });
  await page.waitForFunction(g => !document.querySelector(`.coop-line[data-good="${g}"] [data-n]`)?.disabled, first.good);
  await page.waitForTimeout(400); await page.evaluate(() => farm.closeCards()); await page.screenshot({ path: `${SHOTS}cooperative-order.png` });
  expect(await page.locator('.coop-line .theirs').count() === 3, 'the neighbours share is not drawn');
  await page.click(`.coop-line[data-good="${first.good}"] [data-n]`);
  await page.waitForFunction(g => farm.state().cooperative.order.lines.find(l => l.good === g).sent > 0, first.good);
  for (let i = 0; i < 3; i++) {
    const good = await page.evaluate(() => { const o = farm.state().cooperative.order; return o?.lines.find(l => l.need - l.pledged - l.sent > 0)?.good ?? null; });
    if (!good) break;
    await page.click(`.coop-line[data-good="${good}"] .btn.primary`);
    await page.waitForFunction(g => { const o = farm.state().cooperative.order; return !o || o.lines.find(l => l.good === g).need - o.lines.find(l => l.good === g).pledged - o.lines.find(l => l.good === g).sent === 0; }, good);
  }
  await page.waitForFunction(() => farm.state().cooperative.filled === 1);
  // the chapter card, and what closing it does
  await page.evaluate(() => farm.panels.close());
  await page.waitForFunction(() => [...document.querySelectorAll('.modal')].some(m => m.classList.contains('chapter-modal')) || (farm.closeCards(), false), null, { timeout: 30000, polling: 500 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('One river, many farms') && card.includes('Bramble first') && card.includes('Granny Maple'), `the card: ${card.slice(0, 200)}`);
  await page.waitForFunction(() => { const img = document.querySelector('.chapter-modal figure.on img'); return img && img.complete && img.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-12-card.png` });
  await page.click('.chapter-modal [data-close]'); await page.waitForFunction(() => farm.state().story.chapter === 12 && farm.state().firsts.bridge > 0);
  await page.waitForFunction(() => farm.world.batches.items.get('story:gate')?.model === 'towpath_gate_open', null, { timeout: 8000 });
  expect(await page.evaluate(() => farm.people.canStand(50 * 2 + 1, 8 * 2 + 1)), 'the far bank cannot be walked after the chapter');
  await page.waitForTimeout(800); await page.evaluate(() => { farm.closeCards(); farm.focus(36, 8, 22); });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}towpath-open.png` });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

// Chapter 13 (docs/plan/ch13-the-far-bank.md, act4-far-bank.md): the quay is paved, a quay house goes up on a lot,
// its keeper arrives, the card shows, and the rent comes into the mailbox.
await check('chapter 13: the quay is paved, a quay house is built on a lot, the keeper arrives and the rent comes in (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await page.evaluate(() => farm.setClockOffset(new Date().setHours(10, 0, 0, 0) - Date.now()));
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:13'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.waitForFunction(() => farm.world.batches.items.get('story:gate')?.model === 'towpath_gate_open' && !!farm.world.wildDecor, null, { timeout: 40000 });
  await page.waitForTimeout(600); await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 40000; g.s.barn.cap = 5000; });
  const inZone = () => [...farm.world.batches.items].filter(([id, it]) => id.startsWith('wild') && it.x >= 44 * 2 && it.x < 100 * 2 && it.z >= 1 * 2 && it.z < 8 * 2).length;
  const wildBefore = await page.evaluate(inZone);
  expect(await page.evaluate(() => farm.people.canStand(60 * 2 + 1, 6 * 2 + 1)) === false, 'the quay can be walked before it is paved');
  // the quay's panel: what paving takes, then pave it
  await page.evaluate(() => farm.panels.show('quay')); await page.waitForSelector('.quay [data-do="paveQuay"]');
  expect(await page.locator('.quay .req.ok').count() === 3, 'the paving checklist is not all met');
  await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}quay-paving.png` });
  await page.click('.quay [data-do="paveQuay"]'); await page.waitForFunction(() => farm.state().firsts.quay > 0);
  await page.waitForFunction(() => ['quay:sign0', 'quay:sign6', 'quay:lamp0', 'quay:b0'].every(id => farm.world.batches.items.has(id)), null, { timeout: 20000 });
  const wildAfter = await page.evaluate(inZone);
  expect(wildAfter === 0, `wild trees still stand on the riverside: ${wildAfter} (there were ${wildBefore})`);
  expect(await page.evaluate(() => farm.people.canStand(60 * 2 + 1, 6 * 2 + 1)), 'the paved quay cannot be walked');
  await page.waitForTimeout(1200); await page.evaluate(() => farm.closeCards()); await page.screenshot({ path: `${SHOTS}quay-paved.png` });
  // seven lots; pick the second and build a quay house on it
  await page.evaluate(() => farm.panels.show('quay')); await page.waitForSelector('.quay-lots .quay-lot');
  expect(await page.locator('.quay-lot').count() === 7 && await page.locator('.quay-lot.taken').count() === 0, 'seven free lots');
  await page.click('.quay-lot[data-lot="q2"]'); await page.waitForSelector('.quay-lot.on[data-lot="q2"]');
  await page.waitForTimeout(500); await page.evaluate(() => farm.closeCards()); await page.screenshot({ path: `${SHOTS}quay-lot.png` });
  await page.click('[data-do="buildOnLot"][data-lot="q2"][data-kind="apartment"]');
  await page.waitForFunction(() => Object.values(farm.state().placed).some(p => p.kind === 'apartment' && p.lot === 'q2'));
  const id = await page.evaluate(() => Object.keys(farm.state().placed).find(k => farm.state().placed[k].kind === 'apartment'));
  await page.waitForFunction(k => farm.world.batches.items.get(k)?.model === 'apartment' && !farm.world.batches.items.has('quay:sign1') && farm.world.batches.items.has('quay:sign0'), id, { timeout: 15000 });
  expect(await page.evaluate(() => farm.state().stats.returned) === 4, 'four families did not come back');
  await page.waitForFunction(() => farm.people.walkers.has('tuyet'), null, { timeout: 15000 });
  // the chapter card
  await page.waitForFunction(() => [...document.querySelectorAll('.modal')].some(m => m.classList.contains('chapter-modal')) || (farm.closeCards(), false), null, { timeout: 30000, polling: 500 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('The far bank') && card.includes('Nana Snow') && card.includes('Granny Maple'), `the card: ${card.slice(0, 200)}`);
  await page.waitForFunction(() => { const img = document.querySelector('.chapter-modal figure.on img'); return img && img.complete && img.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-13-card.png` });
  await page.click('.chapter-modal [data-close]'); await page.waitForFunction(() => farm.state().story.chapter === 13);
  // rent: half an hour later the quay house has paid three times; its panel collects it
  await page.waitForTimeout(600); await page.evaluate(() => { farm.closeCards(); farm.setClockOffset(+(sessionStorage.getItem('fv-clock-offset') ?? 0) + 31 * 60000); farm.game.tick(); });
  await page.evaluate(() => farm.panels.show('quay', 'q2')); await page.waitForSelector('.quay [data-do="collectRent"]:not([disabled])');
  expect((await page.textContent('.quay')).includes('660'), `three payments are not waiting: ${(await page.textContent('.quay')).slice(0, 160)}`);
  const coins = await page.evaluate(() => farm.state().coins);
  await page.click('.quay [data-do="collectRent"]'); await page.waitForFunction(c => farm.state().coins >= c + 660, coins);
  await page.evaluate(() => { farm.panels.close(); farm.closeCards(); farm.focus(54, 6, 30); });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}quay-house.png` });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

// Chapter 14 (docs/plan/ch14-rooms-with-a-view.md): the hotel is built on a lot, guests arrive, one is served
// breakfast, the desk is collected, a floor is added, and the tenth guest closes the chapter.
await check('chapter 14: the hotel is built on the quay, guests come, breakfast is served, the desk pays and the card shows (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await page.evaluate(() => farm.setClockOffset(new Date().setHours(10, 0, 0, 0) - Date.now()));
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:14'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.waitForFunction(() => farm.world.batches.items.has('quay:sign1') && !farm.world.batches.items.has('quay:sign0'), null, { timeout: 40000 });   // the quay house stands on the first lot
  await page.waitForTimeout(600); await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 60000; g.s.barn.cap = 5000; });
  // the quay's panel offers both riverside buildings on a free lot: build the hotel on the third
  await page.evaluate(() => farm.panels.show('quay', 'q3')); await page.waitForSelector('[data-do="buildOnLot"][data-kind="hotel"]');
  expect(await page.locator('.quay-kind').count() === 2, 'the free lot does not offer the quay house and the hotel');
  await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}quay-hotel-lot.png` });
  await page.click('[data-do="buildOnLot"][data-lot="q3"][data-kind="hotel"]');
  await page.waitForFunction(() => Object.values(farm.state().placed).some(p => p.kind === 'hotel' && p.lot === 'q3'));
  const id = await page.evaluate(() => Object.keys(farm.state().placed).find(k => farm.state().placed[k].kind === 'hotel'));
  await page.waitForFunction(k => farm.world.batches.items.get(k)?.model === 'hotel', id, { timeout: 15000 });
  // the first guests: a tester does not wait for them
  await page.evaluate(() => { const g = farm.game; g.tick(); g.do('testFinishTimers'); g.tick(); });
  await page.waitForFunction(() => (farm.state().hotel?.rooms ?? []).some(Boolean));
  await page.waitForFunction(() => farm.people.walkers.has('guest0'), null, { timeout: 15000 });
  await page.waitForTimeout(600); await page.evaluate(() => farm.closeCards());
  // breakfast: the pill shows when the wish is in the barn; the panel serves it
  const wish = await page.evaluate(() => { const s = farm.state(), g = s.hotel.rooms.find(Boolean); s.barn.items[g.wish] = (s.barn.items[g.wish] ?? 0) + 2; farm.game.tick(); return g.wish; });
  await page.waitForSelector('[data-status="hotel"]', { timeout: 15000 });
  await page.click('[data-status="hotel"]'); await page.waitForSelector('.hotel .rooms .room');
  expect(await page.locator('.room').count() === 6 && await page.locator('.room.free').count() === 5, 'six rooms, one taken');
  expect((await page.textContent('.hotel-says')).length > 12, 'the guest says nothing');
  await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}hotel-panel.png` });
  await page.click('.room [data-do="serveGuest"]'); await page.waitForSelector('.room.served');
  expect(await page.evaluate(w => farm.state().barn.items[w], wish) === 1, 'one breakfast was not taken from the barn');
  expect(await page.locator('[data-status="hotel"]').count() === 0, 'the breakfast pill stays after serving');
  // the guest leaves and pays double tip at the desk; collect it
  const held = await page.evaluate(() => { const g = farm.game; g.do('testFinishTimers'); g.tick(); return g.s.hotel.held; });
  expect(held >= 120 + 2 * 40, `the desk holds ${held}`);
  await page.waitForSelector('.hotel [data-do="collectHotel"]:not([disabled])');
  const coins = await page.evaluate(() => farm.state().coins);
  await page.click('.hotel [data-do="collectHotel"]'); await page.waitForFunction(c => farm.state().coins > c, coins);
  // a floor more: nine rooms, and the taller model
  await page.click('.hotel [data-do="upgradeHotel"]'); await page.waitForFunction(() => farm.state().hotel.level === 1);
  await page.waitForFunction(k => farm.world.batches.items.get(k)?.model === 'hotel_t1', id, { timeout: 15000 });
  expect(await page.locator('.room').count() === 9, 'nine rooms after the upgrade');
  // ten guests close the chapter
  await page.evaluate(() => farm.panels.close());
  for (let i = 0; i < 30 && await page.evaluate(() => (farm.state().stats.guests ?? 0) < 10); i++) await page.evaluate(() => { const g = farm.game; farm.closeCards(); g.do('testFinishTimers'); g.tick(); });   // (close the scenes first: the chapter card must stay)
  await page.waitForFunction(() => [...document.querySelectorAll('.modal')].some(m => m.classList.contains('chapter-modal')) || (farm.closeCards(), false), null, { timeout: 30000, polling: 500 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('Rooms with a view') && card.includes('Nana Snow') && card.includes('Granny Maple'), `the card: ${card.slice(0, 200)}`);
  await page.waitForFunction(() => { const img = document.querySelector('.chapter-modal figure.on img'); return img && img.complete && img.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-14-card.png` });
  await page.click('.chapter-modal [data-close]'); await page.waitForFunction(() => farm.state().story.chapter === 14);
  await page.waitForTimeout(600); await page.evaluate(() => { farm.closeCards(); farm.panels.close(); farm.focus(64, 6, 30); });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}hotel.png` });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

// Chapter 15 (docs/plan/ch15-the-evening-train.md): the halt is built on a lot, the train rolls in, a wagon is
// filled, the train leaves and pays, and the card shows.
await check('chapter 15: the halt is built, the train comes, a wagon is filled and paid when it leaves, and the card shows (pc)', async () => {
  const { ctx, page, errors } = await open('pc', '?new&restore&tester');
  await page.evaluate(() => farm.setClockOffset(new Date().setHours(17, 30, 0, 0) - Date.now()));
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => farm.panels.onTest('jump:15'))]);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  // the old rails lie along the north edge behind the lots
  await page.waitForFunction(() => farm.world.batches.items.get('quay:t30')?.model === 'track_old' && !!farm.world.train, null, { timeout: 40000 });
  await page.waitForTimeout(600); await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.s.coins = 60000; g.s.barn.cap = 9000; });
  expect(await page.evaluate(() => farm.world.train.phase) === 'away', 'a train before there is a halt');
  // build the halt on the last lot: the rails are relaid
  await page.evaluate(() => farm.panels.show('quay', 'q7')); await page.waitForSelector('[data-do="buildOnLot"][data-kind="halt"]');
  await page.click('[data-do="buildOnLot"][data-lot="q7"][data-kind="halt"]');
  await page.waitForFunction(() => Object.values(farm.state().placed).some(p => p.kind === 'halt' && p.lot === 'q7'));
  await page.waitForFunction(() => farm.world.batches.items.get('quay:t30')?.model === 'track', null, { timeout: 15000 });
  // the train: a tester brings it at once; it rolls in from the east and stops behind the halt
  await page.waitForTimeout(500); await page.evaluate(() => { farm.closeCards(); const g = farm.game; g.tick(); g.do('testFinishTimers'); g.tick(); });
  await page.waitForFunction(() => !!farm.state().train?.here);
  await page.waitForFunction(() => farm.world.train.group?.visible && ['in', 'stop'].includes(farm.world.train.phase), null, { timeout: 15000 });
  await page.waitForSelector('[data-status="train"]', { timeout: 15000 });
  await page.waitForFunction(() => farm.world.train.phase === 'stop', null, { timeout: 20000 });
  const stop = await page.evaluate(() => ({ x: farm.world.train.group.position.x, want: (Object.values(farm.state().placed).find(p => p.kind === 'halt').x + 3) * 2 }));
  expect(Math.abs(stop.x - stop.want) < 0.5, `the train stopped at ${stop.x}, not ${stop.want}`);
  await page.evaluate(() => { farm.closeCards(); farm.focus(97, 3, 28); }); await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}train-at-halt.png` });
  // the halt's panel: three wagons; load one a little, then fill it
  await page.click('[data-status="train"]'); await page.waitForSelector('.train .coop-line');
  expect(await page.locator('.train .coop-line').count() === 3, 'the train has three wagons');
  const w = await page.evaluate(() => { const s = farm.state(), w = s.train.here.wagons[1]; s.barn.items[w.good] = (s.barn.items[w.good] ?? 0) + w.need; farm.game.tick(); return w; });
  await page.waitForFunction(() => !document.querySelector('.coop-line[data-wagon="1"] [data-n]')?.disabled);
  await page.click('.coop-line[data-wagon="1"] [data-n]'); await page.waitForFunction(() => farm.state().train.here.wagons[1].have > 0);
  if (await page.evaluate(() => { const w = farm.state().train.here.wagons[1]; return w.have < w.need; })) await page.click('.coop-line[data-wagon="1"] .btn.primary');   // (a small wagon is full after the first ten)
  await page.waitForSelector('.coop-line[data-wagon="1"].full');
  expect(await page.evaluate(() => farm.world.train.wagons[1].full.visible && !farm.world.train.wagons[1].empty.visible), 'the full wagon does not show its load');
  await page.waitForTimeout(400); await page.evaluate(() => farm.closeCards()); await page.screenshot({ path: `${SHOTS}train-panel.png` });
  // it leaves: the wagon is paid, the train pulls out to the west, the pill goes
  const coins = await page.evaluate(() => farm.state().coins);
  await page.evaluate(() => { farm.panels.close(); const g = farm.game; g.do('testFinishTimers'); g.tick(); });
  await page.waitForFunction(c => farm.state().coins > c && !farm.state().train.here, coins);
  expect(await page.evaluate(() => farm.state().stats.trains) === 1, 'the train was not counted');
  await page.waitForFunction(() => ['out', 'away'].includes(farm.world.train.phase), null, { timeout: 8000 });
  expect(await page.locator('[data-status="train"]').count() === 0, 'the train pill stays after it left');
  // the chapter card
  await page.waitForFunction(() => [...document.querySelectorAll('.modal')].some(m => m.classList.contains('chapter-modal')) || (farm.closeCards(), false), null, { timeout: 30000, polling: 500 });
  const card = await page.textContent('.chapter-modal');
  expect(card.includes('The evening train') && card.includes('Dash') && card.includes('Granny Maple'), `the card: ${card.slice(0, 200)}`);
  await page.waitForFunction(() => { const img = document.querySelector('.chapter-modal figure.on img'); return img && img.complete && img.naturalWidth > 0; }, null, { timeout: 15000 });
  await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}chapter-15-card.png` });
  await page.click('.chapter-modal [data-close]'); await page.waitForFunction(() => farm.state().story.chapter === 15);
  await page.waitForFunction(() => farm.world.train.phase === 'away' && !farm.world.train.group.visible, null, { timeout: 20000 });
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
