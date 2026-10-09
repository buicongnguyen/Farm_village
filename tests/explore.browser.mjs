import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const url = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
mkdirSync('test-results/explore', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function point(page, position) {
  return page.evaluate(position => {
    const m = farm.world.exploreMode, v = m.room.camera.position.clone().set(...position).project(m.room.camera);
    return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2 };
  }, position);
}
async function visit(page, id) {
  const position = await page.evaluate(id => farm.world.exploreMode.session.room.interactions.find(o => o.id === id).focus, id);
  const p = await point(page, position);
  if (page.viewportSize().width === 390) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await page.waitForFunction(id => farm.world.exploreMode.nearest() === id, id, { timeout: 20000 });
  await page.locator('[data-explore="interact"]').click();
}
try {
  for (const [language, width] of [['en', 1280], ['vi', 390], ['ko', 390], ['ja', 1280]]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width === 390, isMobile: width === 390 });
    const errors = [], requests = [];
    const page = await context.newPage(); page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); }); page.on('request', r => requests.push(r.url()));
    await page.addInitScript(language => localStorage.setItem('farm-village.language', language), language);
    await page.goto(url + '?new&restore'); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(() => { farm.skipIntro(); farm.closeCards(); farm.game.s.cond.house = { level: 0, ms: 0 }; farm.game.do('setting', { key: 'textSize', value: 1.3 }); farm.focus(22, 62, 30); });
    if (language === 'vi') await page.evaluate(() => farm.game.do('setting', { key: 'playerBody', value: 'woman' }));
    assert.ok(!requests.some(u => u.includes('interior-farmhouse')), 'interior downloaded before choosing Explore');
    const house = await page.evaluate(() => farm.cellToScreen(22,62));
    if (width === 390) await page.touchscreen.tap(house.x, house.y); else await page.mouse.click(house.x, house.y);
    await page.locator('.radial [data-act="goInside"]').click();
    await page.waitForFunction(() => farm.world.exploreMode?.session && !farm.world.exploreMode.loading, null, { timeout: 60000 });
    await page.waitForFunction(() => farm.world.exploreMode.nearest() === 'door', null, { timeout: 20000 });
    assert.equal(await page.evaluate(() => farm.world.exploreMode.inside), false);
    await page.locator('[data-explore="interact"]').click();
    await page.waitForFunction(() => farm.world.exploreMode.inside);
    await page.screenshot({ path: `test-results/explore/${language}-${width}-room.png` });
    const initial = await page.evaluate(() => [...farm.world.exploreMode.session.p]);
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
    assert.notDeepEqual(await page.evaluate(() => farm.world.exploreMode.session.p), initial, 'arrows did not move the player');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const stopped = await page.evaluate(() => [...farm.world.exploreMode.session.p]); await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(() => farm.world.exploreMode.session.p), stopped, 'movement stuck after blur');
    // Focused editors and IME composition never become character controls.
    await page.evaluate(() => { const input = document.createElement('input'); input.id = 'explore-ime'; document.body.append(input); input.focus(); });
    await page.keyboard.type('wasd');
    assert.deepEqual(await page.evaluate(() => farm.world.exploreMode.session.p), stopped);
    await page.evaluate(() => document.querySelector('#explore-ime').remove());
    await visit(page, 'farmhouse_sofa');
    assert.ok(await page.locator('[data-explore="stand"]').isVisible());
    await page.waitForFunction(() => farm.world.exploreMode.room.player.clip === 'Sit');
    await page.screenshot({ path: `test-results/explore/${language}-${width}-sofa.png` });
    await page.locator('[data-explore="stand"]').click();
    await visit(page, 'farmhouse_memory_shelf');
    const memory = await page.evaluate(() => structuredClone(farm.state().explore.memories));
    assert.ok(memory.home_garden_drawing?.discoveredAt);
    await page.screenshot({ path: `test-results/explore/${language}-${width}-memory.png` });
    await page.locator('[data-explore="back"]').click();
    await page.locator('[data-explore="interact"]').click();
    assert.deepEqual(await page.evaluate(() => farm.state().explore.memories), memory, 'replay changed the earned memory');
    await page.locator('[data-explore="back"]').click();
    // Screen directions and release work on the optional touch controls too.
    await page.locator('[data-explore="controls"]').click();
    const down = page.locator('[data-move="down"]'), b = await down.boundingBox();
    if (width === 390) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
      await page.waitForTimeout(200); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up(); }
    assert.deepEqual(await page.evaluate(() => farm.world.exploreMode.stick), [0,0]);
    await page.locator('[data-explore="outside"]').click();
    await page.waitForFunction(() => !farm.world.exploreMode.inside, null, { timeout: 20000 });
    assert.equal(await page.evaluate(() => farm.world.exploreMode.inside), false);
    await page.locator('[data-explore="interact"]').click();
    await page.waitForTimeout(150);
    const budgets = await page.evaluate(() => farm.info()); assert.ok(budgets.draws <= 120 && budgets.triangles <= 300000, JSON.stringify(budgets));
    await page.locator('[data-explore="close"]').click();
    assert.equal(await page.evaluate(() => farm.people.walkers.get('you').controlled), false);
    assert.ok(await page.locator('.hud-tools').isVisible());
    await page.evaluate(() => { localStorage.setItem('farm-village:save:1', JSON.stringify({ ...farm.state(), cells: farm.state().cells.join('') })); });
    await page.goto(url); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    assert.deepEqual(await page.evaluate(() => farm.state().explore.memories), memory);
    assert.equal(await page.evaluate(() => !!farm.world.presentation), false, 'reload retained an indoor scene');
    assert.deepEqual(errors, []);
    console.log(`PASS Explore ${language} ${width}: entry, keyboard, sofa, memory replay, touch controls, exit, save; ${budgets.draws} draws / ${budgets.triangles} triangles`);
    await context.close();
  }
  // Failed downloads, cancelling an in-flight load, re-entry and a profile replacement are safe.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '?new&restore'); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.skipIntro(); farm.closeCards(); farm.game.s.cond.house = { level: 0, ms: 0 }; });
  let release; let hold = new Promise(resolve => { release = resolve; });
  await page.route('**/interior-farmhouse.json', async route => { await hold; await route.continue(); });
  await page.evaluate(() => farm.radial.choose({ act: 'goInside' }));
  await page.locator('[data-explore="close"]').waitFor(); await page.locator('[data-explore="close"]').click();
  release(); await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => farm.world.exploreMode.active), false);
  assert.equal(await page.evaluate(() => !!farm.world.presentation), false);
  await page.unroute('**/interior-farmhouse.json');
  await page.route('**/interior-farmhouse.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.evaluate(() => farm.radial.choose({ act: 'goInside' }));
  await page.locator('[data-explore="retry"]').waitFor({ timeout: 60000 });
  await page.unroute('**/interior-farmhouse.json'); await page.locator('[data-explore="retry"]').click();
  await page.waitForFunction(() => farm.world.exploreMode.nearest() === 'door', null, { timeout: 60000 });
  await page.locator('[data-explore="interact"]').click(); await page.waitForFunction(() => farm.world.exploreMode.inside);
  await page.evaluate(() => { const next = structuredClone(farm.state()); delete next.explore; farm.game.replace(next); });
  assert.equal(await page.evaluate(() => farm.world.exploreMode.active), false);
  assert.equal(await page.evaluate(() => !!farm.world.presentation), false);
  assert.equal(await page.evaluate(() => farm.state().explore), undefined);
  assert.ok(await page.locator('.hud-tools').isVisible());
  assert.deepEqual(errors, []);
  console.log('PASS Explore download retry, cancellation, re-entry, profile replacement'); await context.close();
} finally { await browser.close(); }
