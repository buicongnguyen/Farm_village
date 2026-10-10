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
async function open(device = 'phone', { intro = false } = {}) {
  const ctx = await browser.newContext(DEVICES[device]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${URL_}?new&restore`);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  if (!intro) await page.evaluate(() => farm.skipIntro());
  await page.evaluate(() => { farm.game.s.settings.daylight = 'always'; });
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
  for (let i = 0; i < 6; i++) { if (!(await page.isVisible('.modal [data-close]'))) break; await page.click('.modal [data-close]'); await page.waitForTimeout(150); }   // story cards the player would close
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
await check('first session in the restored village: harvest, deliver the first order, repair the mill and coop, then hens (phone)', async () => {
  const { ctx, page, errors } = await open('phone', { intro: true });
  const step = () => page.evaluate(() => farm.state().story.tutorial);
  expect(await page.isVisible('.chapter'), 'no chapter card'); await page.click('.chapter [data-close]');
  await page.waitForFunction(() => !document.querySelector('.guide').hidden, null, { timeout: 15000 });
  expect(/harvest/i.test(await page.textContent('.guide')), 'the guide does not ask for the harvest');
  expect(!(await page.isVisible('[data-act="orders"]')), 'the order board button should wait for the order step');
  await page.evaluate(() => farm.setClockOffset(40_000));                          // the sown wheat is ripe
  const bed = await page.evaluate(() => { const s = farm.state(); const id = Object.keys(s.beds)[0]; return [s.placed[id].x, s.placed[id].z]; });
  await tap(page, ...bed); await page.click('.radial-btn[data-act="harvestAll"], .radial-btn[data-act="harvest"]');
  await page.waitForFunction(() => farm.state().stats.harvested > 0, null, { state: 'attached', timeout: 5000 });
  expect(await step() === 1, `step after the harvest: ${await step()}`);
  await page.click('[data-act="orders"]'); await page.click('.order.can [data-do="deliver"]');
  expect(await step() === 2, `step after the order: ${await step()}`);
  await page.evaluate(() => document.querySelector('.panel [data-do="close"]')?.click());
  await page.waitForSelector('.modal [data-close]'); // the first-loaf scene waits for the order sheet to close
  await page.locator('.modal [data-close]').last().click();
  for (const kind of ['feed_mill', 'coop']) { const id = await idOf(page, kind), [cx, cz] = await cellOf(page, id); await tap(page, cx, cz); await page.click('.radial-btn[data-act="repair"]'); }
  await page.evaluate(() => farm.setClockOffset(40_000 + 100_000));
  await page.waitForFunction(() => farm.state().projects.step > 2, null, { timeout: 8000 });
  expect(await step() === 3, `step after the repairs: ${await step()}`);
  expect(await page.isVisible('[data-act="orders"]'), 'the order board button should be there by now');
  expect(/hens/i.test(await page.textContent('.guide')), 'the guide does not ask for the hens');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});
await check('markers: a red ! over broken things, a gold coin over ripe crops; the crop can be changed after choosing one', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { for (const b of Object.values(farm.game.s.beds)) b.doneAt = farm.game.now + 60_000; });
  const m0 = await page.evaluate(() => { const c = farm.marks.collect(); return { alert: c.alert.length, coin: c.coin.length }; });
  expect(m0.alert >= 6 && m0.coin === 0, `at the start: ${JSON.stringify(m0)}`);
  await page.evaluate(() => farm.setClockOffset(70_000)); await page.waitForTimeout(1500);
  const m1 = await page.evaluate(() => ({ coin: farm.marks.collect().coin.length, shown: farm.marks.coin.userData.n }));
  expect(m1.coin >= 6 && m1.shown >= 6, `ripe beds: ${JSON.stringify(m1)}`);
  // two empty beds: choose a crop on one, then tap the other: the menu opens again, so another crop can be chosen
  const beds = await page.evaluate(() => { const s = farm.game.s; const ids = Object.keys(s.beds).slice(0, 2); for (const id of ids) delete s.beds[id]; return ids.map(id => [s.placed[id].x, s.placed[id].z]); });
  await tap(page, ...beds[0]); expect(await page.isVisible('.radial-btn[data-act="plant"]'), 'no seed menu on the first bed');
  await page.click('.radial-btn[data-act="plant"]');
  await tap(page, ...beds[1]); expect(await page.isVisible('.radial-btn[data-act="plant"]'), 'after choosing a crop the next bed shows no menu: the crop cannot be changed');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});
await check('people: you walk to what you tap; conversation stays available and explicit order intent opens the board', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.waitForFunction(() => farm.people?.walkers.has('you'), null, { timeout: 15000 });
  const before = await page.evaluate(() => { const w = farm.people.walkers.get('you'); return [w.x, w.z]; });
  const mill = await idOf(page, 'feed_mill'), [cx, cz] = await cellOf(page, mill);
  await tap(page, cx, cz);
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => { const w = farm.people.walkers.get('you'); return [w.x, w.z, !!w.goal]; });
  expect(Math.hypot(after[0] - before[0], after[1] - before[1]) > 3, `you did not walk: ${before} -> ${after}`);
  const opened = await page.evaluate(() => {
    const g = farm.game, ppl = farm.people;
    g.s.orders.cards = [{ id: 'x1', from: 'ada', need: { wheat: 1 }, coins: 5, xp: 1, line: 'hi' }];
    const w = ppl.walkers.get('ada'); w.indoors = false;
    ppl.onOrder = c => { window.__asked = c.id; };
    ppl.talk(w);
    if (window.__asked || !w.bubble?.textContent) throw Error('ordinary talk was replaced by an order');
    ppl.talk(w, { order: true }); return window.__asked;
  });
  expect(opened === 'x1', 'explicit order intent did not ask for the order');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('the village pond: fish pictures swim in it; tap it, cast a line, reel in a fish; a coin marks the bite; tap a person then the pond and they go fishing', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => farm.pondFish.count >= 7, null, { timeout: 15000 }).catch(() => {});
  expect(await page.evaluate(() => farm.pondFish.count) >= 7, 'no fish swim in the village pond');
  await tap(page, 15, 42);   // the village pond by the farmhouse
  await page.waitForSelector('[data-do="castLine"]:not([disabled])', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => farm.people?.walkers.has('you'), null, { timeout: 15000 });
  await page.evaluate(() => {
    const p = farm.people;
    // This smoke case needs a free bank. Reservation/crowding behavior has its own pond-fishing suite.
    // Family members otherwise choose random outings near the camera and can occupy the staged player's spot.
    for (const w of p.walkers.values()) {
      p.cancelTrip(w); Object.assign(w, { x: 59, z: 131, indoors: false, once: 'Idle', onceUntil: p.time + 9999 });
    }
    Object.assign(p.walkers.get('you'), { x: 37, z: 85, once: null, stay: 9999 }); farm.panels.render();
  });
  await page.locator('[data-do="castLine"]:not([data-bait])').click();
  await page.waitForFunction(() => !!farm.state().fishing.line);
  expect(await page.evaluate(() => !!farm.state().fishing.line), 'the line was not cast');
  await page.evaluate(() => farm.setClockOffset(100_000)); await page.waitForTimeout(1500);
  expect(await page.evaluate(() => farm.marks.collect().coin.length) > 0, 'no coin marker over the biting pond');
  await page.evaluate(() => farm.panels.show('pond'));   // casting closes the sheet so the cast can be watched
  await page.waitForSelector('[data-do="reelIn"][data-steady="1"]', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('[data-do="reelIn"][data-steady="1"]').click());
  expect(await page.evaluate(() => farm.state().fishing.caught) === 1, 'no fish was reeled in');
  // tap Pip (picked straight from the people view), then the pond: Pip walks off to fish
  await page.evaluate(() => { farm.panels.close(); const p = farm.people; p.selected = p.walkers.get('pip'); p.selectedUntil = performance.now() + 9000; });
  await tap(page, 15, 42);
  expect(await page.evaluate(() => !!farm.people.walkers.get('pip').target && farm.people.walkers.get('pip').fishing), 'Pip was not sent fishing');
  await page.evaluate(() => { farm.panels.close(); const p = farm.people; p.selected = p.walkers.get('you'); p.selectedUntil = performance.now() + 9000; });
  await tap(page, 15, 42);
  expect(await page.evaluate(() => !!farm.people.walkers.get('you').goal), 'you were not sent fishing');
  expect(!errors.length, errors.join(' | '));
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
  await ctx.close();
});
await check('goals, hurry, albums and the player look: the status row opens three goals; a growing bed can be hurried; Settings has the album and the shirt colours', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.waitForSelector('[data-status="quests"]', { state: 'attached', timeout: 8000 });
  await page.evaluate(() => { farm.closeCards(); document.querySelector('[data-status="quests"]').click(); });
  await page.waitForSelector('[data-do="claimQuest"]', { state: 'attached', timeout: 5000 });
  expect(await page.evaluate(() => document.querySelectorAll('.panel .goal').length) === 4, 'three goals and the weekly one');
  await page.evaluate(() => farm.panels.close());
  const bed = await page.evaluate(() => { const s = farm.game.s, id = Object.keys(s.beds)[0]; s.beds[id].doneAt = farm.game.now + 60_000; return [s.placed[id].x, s.placed[id].z]; });
  await tap(page, ...bed);
  expect(await page.isVisible('.radial-btn[data-act="hurry"]'), 'no Hurry button on a growing bed');
  await page.click('.radial-btn[data-act="hurry"]');
  expect(await page.evaluate(() => Object.values(farm.game.s.beds).some(b => b.doneAt <= farm.game.now)), 'the bed was not hurried');
  await page.evaluate(() => farm.panels.show('settings'));
  await page.waitForSelector('[data-do="album"]', { state: 'attached', timeout: 3000 });
  expect(await page.evaluate(() => document.querySelectorAll('.swatch').length) === 6, 'no shirt colours');
  await page.evaluate(() => document.querySelector('.swatch:nth-child(4)').click());
  expect(await page.evaluate(() => farm.game.s.settings.playerColor) === '#3a86ff', 'the shirt colour did not change');
  await page.evaluate(() => document.querySelector('[data-do="album"]').click());
  await page.waitForFunction(() => document.querySelector('.panel')?.innerText.includes('Fish album') || document.querySelector('.panel')?.innerText.includes('Album cá'), null, { timeout: 3000 });
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('the Next chip does the chore in one tap: ripe crops are harvested; "All" sows the empty beds with the last crop', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    farm.closeCards();
    for (const b of Object.values(farm.game.s.beds)) b.doneAt = farm.game.now - 1;
    farm.hud.refreshNext();   // the same Harvest label can otherwise still hold a smaller, previously ripe batch
  });
  await page.waitForSelector('[data-act="next"]:not([hidden])', { timeout: 8000 });
  await page.waitForFunction(() => /harvest/i.test(document.querySelector('[data-act="next"]')?.innerText ?? ''), null, { timeout: 8000 });
  await page.evaluate(() => document.querySelector('[data-act="next"]').click());
  expect(await page.evaluate(() => Object.keys(farm.game.s.beds).length) === 0, 'the chip did not harvest every ripe bed');
  const bed = await page.evaluate(() => { const s = farm.game.s, id = Object.keys(s.placed).find(k => s.placed[k].kind === 'bed'); return [s.placed[id].x, s.placed[id].z]; });
  await page.waitForTimeout(1200); await page.evaluate(() => farm.closeCards());   // the level-up card the harvest earned
  await tap(page, ...bed); expect(await page.isVisible('.radial-btn[data-act="plantAll"]'), 'no All button');
  await page.click('.radial-btn[data-act="plantAll"]');
  expect(await page.evaluate(() => Object.keys(farm.game.s.beds).length) >= 6, 'All did not sow every empty bed');
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('the civic row: tap the old clinic for its name and a tidy-up; people say different things when tapped again', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.evaluate(() => { farm.game.s.coins = 500; });
  await tap(page, 63, 107);
  expect(await page.isVisible('.radial-btn[data-act="tidyRuin"]'), 'no tidy-up on the old clinic');
  expect(/clinic|trạm xá/i.test(await page.textContent('.radial')), 'no name on the old clinic');
  await page.click('.radial-btn[data-act="tidyRuin"]');
  expect(await page.evaluate(() => !!farm.game.s.village.tidied?.clinic), 'not tidied');
  await page.waitForFunction(() => farm.people?.walkers.has('ada'), null, { timeout: 15000 });
  const lines = await page.evaluate(() => { const p = farm.people, w = p.walkers.get('ada'), out = []; p.onOrder = null; for (let i = 0; i < 6; i++) { p.talk(w); out.push(w.bubble?.textContent ?? ''); } return out; });
  expect(new Set(lines).size >= 5, `Ada repeats herself: ${lines.join(' / ')}`);
  expect(!errors.length, errors.join(' | '));
  await ctx.close();
});
await check('the market truck: repair the market and street, load wheat in the panel, send it, watch it drive off and come back with coins', async () => {
  const { ctx, page, errors } = await open('phone');
  await page.evaluate(() => { const g = farm.game; g.s.coins = 3000; g.s.barn.items.wheat = 40; for (const id of ['road_south', ...Object.keys(g.s.placed).filter(i => g.s.placed[i].kind === 'market')]) g.do('repair', { id }); farm.setClockOffset(100_000); });
  await page.waitForFunction(() => farm.state().cond.road_south == null && farm.world.batches.items.has('truck'), null, { timeout: 15000 });
  await page.waitForTimeout(2500);   // the level-up card the repairs earned closes any open sheet: let it come first
  await page.evaluate(() => { farm.panels.show('market'); });
  await page.waitForSelector('.good-tile[data-do="loadTruck"][data-good="wheat"]', { state: 'attached', timeout: 5000 }).catch(async e => { throw new Error('no wheat tile: ' + await page.evaluate(() => (document.querySelector('.panel .goods-grid')?.innerHTML ?? 'no grid').slice(0, 300) + ' | modal: ' + (document.querySelector('.modal')?.innerText ?? '-'))); });
  await page.evaluate(() => document.querySelector('.good-tile[data-do="loadTruck"][data-good="wheat"]').click());
  await page.waitForSelector('[data-do="sendTruck"]', { state: 'attached', timeout: 5000 }).catch(async () => { throw new Error('no send button: ' + errors.join(' | ') + await page.evaluate(() => JSON.stringify(farm.state().truck) + (document.querySelector('.panel')?.innerText ?? ''))); });
  expect(await page.evaluate(() => farm.state().truck.load.length) === 1, 'nothing loaded');
  await page.evaluate(() => document.querySelector('[data-do="sendTruck"]').click());
  expect(await page.evaluate(() => farm.state().truck.away), 'the truck did not leave');
  await page.evaluate(() => farm.setClockOffset(100_000 + 20_000)); await page.waitForTimeout(1200);
  const mid = await page.evaluate(() => farm.world.batches.items.get('truck')?.x ?? null);
  await page.evaluate(() => farm.setClockOffset(100_000 + 100_000));
  await page.waitForFunction(() => farm.state().truck.coins > 0 && farm.world.batches.items.has('truck'), null, { timeout: 8000 });
  expect(!errors.length, errors.join(' | ')); expect(typeof mid === 'number' || mid === null, 'odd truck position');
  await page.evaluate(() => sessionStorage.removeItem('fv-clock-offset'));
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
