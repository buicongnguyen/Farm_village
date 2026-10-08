// Browser checks for the truck fleet (core/market.mjs, the market panel, land-view's trucks): buy a second and a third
// truck in the market panel, fill them with spare goods in one tap, send them all, watch them drive off and come back,
// collect all the takings at once; the panel fits a phone in English and Vietnamese, and the budgets hold.
// Run after `npm run build:test` with dist served (GAME_URL, default http://127.0.0.1:5241/). SHOTS=<dir> keeps screenshots.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  pc: { viewport: { width: 1280, height: 800 } },
};
const results = [];
async function open(device = 'phone', lang = 'en') {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  if (lang === 'vi') await ctx.addInitScript(() => localStorage.setItem('farm-village.language', 'vi'));
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${URL_}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => farm.skipIntro());
  // a grown farm: the market square and the village street mended, level 8, money and a full barn
  await page.evaluate(() => {
    const g = farm.game, s = g.s; s.settings.daylight = 'always'; s.coins = 20000; s.level = 8; s.barn.cap = 600;
    s.barn.items = { ...s.barn.items, wheat: 120, corn: 40, bread: 24, egg: 12 };
    for (const id of ['road_south', ...Object.keys(s.placed).filter(i => s.placed[i].kind === 'market')]) g.do('repair', { id });
    farm.setClockOffset(100_000);
  });
  await page.waitForFunction(() => farm.state().cond.road_south == null && farm.world.batches.items.has('truck'), null, { timeout: 15000 });
  await page.waitForTimeout(2500);   // the level-up card the repairs earned closes any open sheet: let it come first
  await page.evaluate(() => { farm.closeCards?.(); farm.people?.walkers.forEach(w => { w.indoors = true; }); });
  return { ctx, page, errors };
}
async function check(name, f) {
  const t0 = Date.now();
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  catch (e) { results.push([name, 'FAIL']); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const click = (page, sel) => page.evaluate(sel => { const b = document.querySelector(sel); if (!b) throw new Error(`no ${sel}`); if (b.disabled) throw new Error(`${sel} is disabled`); b.click(); }, sel);
const showMarket = page => page.evaluate(() => { farm.panels.show('market'); });
const focusMarket = page => page.evaluate(() => {
  const s = farm.state(), id = Object.keys(s.placed).find(k => s.placed[k].kind === 'market'), p = s.placed[id];
  farm.focus(p.x + 9, 91, 30);
});
/** The panel fits the phone: no sideways scrolling, no truck row cut off. */
const fits = page => page.evaluate(() => {
  const el = document.querySelector('.panel'), rows = [...document.querySelectorAll('.truck-row')];
  return { wide: el.scrollWidth - el.clientWidth, rows: rows.length, cut: rows.filter(r => r.scrollWidth > r.clientWidth + 1).length };
});
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };

await check('buy two more trucks, fill them with spare goods, send all three, watch them drive and come back, collect once', async () => {
  const { ctx, page, errors } = await open('phone');
  await showMarket(page);
  await page.waitForSelector('[data-do="buyTruck"]', { state: 'attached', timeout: 5000 });
  expect(await page.locator('.truck-row').count() === 1, 'one truck at the start');
  const coins0 = await page.evaluate(() => farm.state().coins);
  await click(page, '[data-do="buyTruck"]'); await page.waitForTimeout(300);
  await showMarket(page); await click(page, '[data-do="buyTruck"]'); await page.waitForTimeout(300);
  await showMarket(page);
  const after = await page.evaluate(() => ({ trucks: 1 + farm.state().truck.fleet.length, coins: farm.state().coins, buy: !!document.querySelector('[data-do="buyTruck"]') }));
  expect(after.trucks === 3 && after.coins === coins0 - 800 - 2500 && !after.buy, `bought: ${JSON.stringify(after)}`);
  expect(await page.locator('.truck-row').count() === 3, 'three truck rows');
  // the parked trucks: three batch items in a row by the market, in their own colours once the decor kit is in
  await page.waitForFunction(() => ['truck', 'truck1', 'truck2'].every(k => farm.world.batches.items.has(k)) && farm.world.batches.items.get('truck2').model === 'truck_sun', null, { timeout: 15000 });
  const parked = await page.evaluate(() => ['truck', 'truck1', 'truck2'].map(k => { const i = farm.world.batches.items.get(k); return { x: i.x, model: i.model }; }));
  expect(parked[0].x < parked[1].x && parked[1].x < parked[2].x && new Set(parked.map(p => p.model)).size === 3, `parked: ${JSON.stringify(parked)}`);
  await page.evaluate(() => farm.panels.close?.()); await focusMarket(page); await page.waitForTimeout(900); await shot(page, 'fleet-parked-phone');
  await showMarket(page); await click(page, '[data-do="fillTruck"]'); await page.waitForTimeout(300); await showMarket(page);
  const filled = await page.evaluate(() => [farm.state().truck, ...farm.state().truck.fleet].map(u => u.load.reduce((n, i) => n + i.n, 0)));
  expect(filled.every(n => n > 0), `every truck got goods: ${filled}`);
  const f = await fits(page); expect(f.wide <= 1 && f.cut === 0 && f.rows === 3, `panel fits: ${JSON.stringify(f)}`);
  await shot(page, 'fleet-panel-phone');
  const sendText = await page.evaluate(() => document.querySelector('[data-do="sendTruck"]')?.textContent.trim());
  expect(/3/.test(sendText ?? ''), `the send button counts the trucks: ${sendText}`);
  await click(page, '[data-do="sendTruck"]');
  expect(await page.evaluate(() => [farm.state().truck, ...farm.state().truck.fleet].every(u => u.away)), 'all three left');
  await page.evaluate(() => farm.setClockOffset(100_000 + 5_000)); await page.waitForTimeout(1200);
  const driving = await page.evaluate(() => ['truck', 'truck1', 'truck2'].map(k => farm.world.batches.items.get(k)?.x ?? null));
  expect(driving.every(x => x != null) && driving[0] < driving[1] && driving[1] < driving[2], `they drive off in a line: ${driving}`);
  const status = await page.evaluate(() => document.querySelector('[data-status="market"]')?.textContent ?? '');
  expect(/3/.test(status), `the status row counts the trucks on the road: ${status}`);
  await page.evaluate(() => farm.setClockOffset(100_000 + 25_000)); await page.waitForTimeout(800);
  expect(await page.evaluate(() => ['truck', 'truck1', 'truck2'].every(k => !farm.world.batches.items.has(k))), 'out in town');
  await page.evaluate(() => farm.setClockOffset(100_000 + 120_000));
  await page.waitForFunction(() => [farm.state().truck, ...farm.state().truck.fleet].every(u => !u.away && u.coins > 0), null, { timeout: 8000 });
  await page.waitForFunction(() => ['truck', 'truck1', 'truck2'].every(k => farm.world.batches.items.has(k)), null, { timeout: 5000 });
  const before = await page.evaluate(() => farm.state().coins);
  await showMarket(page); await click(page, '[data-do="collectTruck"]');
  const got = await page.evaluate(b => ({ gained: farm.state().coins - b, left: [farm.state().truck, ...farm.state().truck.fleet].reduce((n, u) => n + u.coins, 0) }), before);
  expect(got.gained > 0 && got.left === 0, `collected all at once: ${JSON.stringify(got)}`);
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});

await check('the market panel with three trucks fits a phone in Vietnamese', async () => {
  const { ctx, page, errors } = await open('phone', 'vi');
  await page.evaluate(() => { const g = farm.game; g.do('buyTruck'); g.do('buyTruck'); g.do('fillTruck'); });
  await showMarket(page); await page.waitForSelector('.truck-row', { state: 'attached', timeout: 5000 });
  const text = await page.evaluate(() => document.querySelector('.panel').innerText);
  expect(/Xe tải 1/.test(text) && /Xe tải 3/.test(text) && /Cho 3 xe tải đi/.test(text), `Vietnamese panel: ${text.slice(0, 300)}`);
  expect(!/Truck|Send|Fill/.test(text), `English left in the Vietnamese panel: ${text.slice(0, 300)}`);
  const f = await fits(page); expect(f.wide <= 1 && f.cut === 0, `panel fits: ${JSON.stringify(f)}`);
  await shot(page, 'fleet-panel-phone-vi');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});

await check('a full barn: the next chip loads the trucks, then sends them', async () => {
  const { ctx, page, errors } = await open('phone');
  // nothing that outranks the trucks in the Next chip: no ripe beds, no finished goals waiting to be claimed
  await page.evaluate(() => {
    const s = farm.state(); farm.game.do('buyTruck'); s.barn.cap = 140;
    for (const b of Object.values(s.beds)) b.doneAt = farm.game.now + 3_600_000;
    for (const q of s.quests?.list ?? []) farm.game.do('claimQuest', { id: q.id });
  });
  const chip = re => page.waitForFunction(re => new RegExp(re).test(document.querySelector('[data-act="next"]')?.textContent ?? ''), re, { timeout: 8000 })
    .catch(async () => { throw new Error(`the chip says "${await page.evaluate(() => document.querySelector('[data-act="next"]')?.textContent)}"`); });
  await chip('load the trucks');
  await click(page, '[data-act="next"]');
  await chip('Send the loaded trucks');
  await click(page, '[data-act="next"]');
  expect(await page.evaluate(() => [farm.state().truck, ...farm.state().truck.fleet].every(u => u.away)), 'both trucks left');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});

await check('three trucks at the market hold the phone budgets at every zoom; PC view', async () => {
  for (const device of ['phone', 'pc']) {
    const { ctx, page, errors } = await open(device);
    await page.evaluate(() => { farm.game.do('buyTruck'); farm.game.do('buyTruck'); });
    await page.waitForFunction(() => farm.world.batches.items.get('truck2')?.model === 'truck_sun', null, { timeout: 15000 });
    const s = await page.evaluate(() => { const s = farm.state(), id = Object.keys(s.placed).find(k => s.placed[k].kind === 'market'); return [s.placed[id].x + 9, 91]; });
    for (const span of [24, 60, 140, 220]) {
      const info = await page.evaluate(([span, x, z]) => { farm.view(span, x, z); return new Promise(r => setTimeout(r, 800)).then(() => farm.measure(500)); }, [span, ...s]);
      expect(info.draws <= 120 && info.triangles <= 300000, `${device} span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
    }
    if (device === 'pc') { await focusMarket(page); await page.waitForTimeout(900); await shot(page, 'fleet-parked-pc'); }
    expect(!errors.length, errors.join(' | '));
    await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
    await ctx.close();
  }
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} fleet checks passed`);
process.exit(failed.length ? 1 : 0);
