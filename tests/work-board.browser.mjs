import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { newGame } from '../src/core/state.mjs';
import { pack } from '../src/kit/save.mjs';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
mkdirSync('shots/work-board', { recursive: true });
try {
  for (const lang of ['en', 'vi', 'ko', 'ja']) for (const width of [390, 1280]) {
    const now = Date.now(), s = newGame(now, 417, { restore: true });
    s.level = 8; s.coins = 10000; s.barn.cap = 1000; s.story.chapter = 20; s.story.tutorial = 999; s.projects.step = 999;
    s.counts.school = 1; s.hands = { field: { since: now } }; s.handsAt = now + 1000000; s.helpAt = now + 1000000;
    s.fieldWork = { enabled: true, job: null, last: null }; s.beds = {};
    for (let i = 0; i < 5; i++) {
      const id = 'wb' + i; s.placed[id] = { kind: 'bed', x: 33 + i, z: 57, rot: 0 };
      s.cells[57 * 128 + 33 + i] = 4; s.beds[id] = { crop: 'carrot', doneAt: now - 1 };
    }
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
    await context.addInitScript(({ save, lang, now }) => {
      Date.now = () => now; localStorage.setItem('farm-village.language', lang);
      if (!sessionStorage.getItem('work-seeded')) {
        sessionStorage.setItem('work-seeded', '1'); localStorage.setItem('farm-village:save:1', save);
      }
    }, { save: pack(s), lang, now });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5241/');
    await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(async () => {
      clearInterval(farm.game.timer); farm.skipIntro(); farm.closeCards(); farm.panels.close();
      await farm.land.later; farm.view(38, 55, 134);
    });
    await page.waitForTimeout(600);
    assert.ok(await page.evaluate(() => farm.world.batches.items.has('work_board')));
    const pos = await page.evaluate(() => farm.cellToScreen(27, 68));
    await page.mouse.click(pos.x, pos.y);
    await page.waitForSelector('.panel[data-kind="workBoard"]:not([hidden])', { timeout: 10000 }).catch(async e => { console.log(JSON.stringify(await page.evaluate(() => ({ panel: farm.panels.open, radial: farm.radial.last, body: document.body.innerText.slice(-1200) })))); await page.screenshot({path:'shots/work-board/tap-failure.png'}); throw e; });
    await page.locator('[data-do="workOwner"][data-value="field"]').click();
    for (const id of ['wb0', 'wb1', 'wb2']) await page.locator('[data-do="workBed"][data-id="' + id + '"]').click();
    assert.equal(await page.locator('[data-do="workBed"][aria-pressed="true"]').count(), 3);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: 'shots/work-board/' + lang + '-' + width + '.png' });
    await page.locator('[data-do="startFieldWork"]').click();
    await page.waitForSelector('[data-do="cancelFieldWork"]');
    const first = await page.evaluate(() => {
      const g = farm.game, s = g.s, now = Date.now();
      const coins = s.coins; g.do('harvest', { id: 'wb0' });
      g.clock = () => now + 44000; s.handsAt = now + 44000; g.tick(); farm.closeCards();
      return { remaining: Object.keys(s.beds), done: s.fieldWork.job.done, coins, spent: s.fieldWork.job.spent };
    });
    assert.equal(first.done, 0); assert.equal(first.spent, 0); assert.ok(first.remaining.includes('wb1'));
    const after = await page.evaluate(() => {
      const g = farm.game, s = g.s, now = Date.now();
      g.clock = () => now + 45000; s.handsAt = now + 45000; g.tick(); farm.closeCards();
      localStorage.setItem('farm-village:save:1', JSON.stringify({ ...s, cells: s.cells.join('') }));
      return { last: s.fieldWork.last, remaining: Object.keys(s.beds) };
    });
    assert.deepEqual(after.last, { done: 2, skipped: 1, spent: 2 });
    assert.deepEqual(after.remaining.sort(), ['wb3', 'wb4']);
    await page.reload(); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    assert.deepEqual(await page.evaluate(() => farm.state().fieldWork.last), after.last);
    // Cancel through the actual controls: untouched targets are recorded as left for the player.
    await page.evaluate(() => { clearInterval(farm.game.timer); farm.closeCards(); farm.panels.show('workBoard'); });
    await page.locator('[data-do="workOwner"][data-value="field"]').click();
    for (const id of ['wb3', 'wb4']) await page.locator('[data-do="workBed"][data-id="' + id + '"]').click();
    await page.locator('[data-do="startFieldWork"]').click();
    await page.locator('[data-do="cancelFieldWork"]').click();
    assert.deepEqual(await page.evaluate(() => farm.state().fieldWork.last), { done: 0, skipped: 2, spent: 0 });
    // A player without a field hire can adopt manual protection without paying or assigning any crops.
    await page.evaluate(() => { delete farm.game.s.hands.field; farm.game.s.fieldWork.enabled = false; farm.panels.render(); });
    await page.locator('[data-do="protectFieldCrops"]').click();
    assert.deepEqual(await page.evaluate(() => ({ enabled: farm.game.s.fieldWork.enabled, beds: Object.keys(farm.game.s.beds).sort() })), { enabled: true, beds: ['wb3', 'wb4'] });
    const budget = await page.evaluate(async () => {
      clearInterval(farm.game.timer); farm.skipIntro(); farm.closeCards(); await farm.land.later;
      let draws = 0, tris = 0;
      for (const span of [26, 70, 150]) {
        farm.view(span); await new Promise(resolve => setTimeout(resolve, 250));
        const x = farm.info(); if (!Number.isFinite(x.draws) || !Number.isFinite(x.triangles)) throw new Error('Missing render counters'); draws = Math.max(draws, x.draws); tris = Math.max(tris, x.triangles);
      }
      return { draws, tris };
    });
    assert.ok(budget.draws <= 120 && budget.tris <= 300000, JSON.stringify(budget));
    assert.deepEqual(errors, []);
    await context.close(); console.log('ok work board, real tap, selection, pause, manual priority, wages, save, cancellation, protection and budget: ' + lang + ' ' + width);
  }
} finally { await browser.close(); }
