// Claude's cargo ship, radio, machinery, workshops and the shared source-card controller.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { newGame } from '../src/core/state.mjs';
import { pack } from '../src/kit/save.mjs';
import { PORT } from '../src/core/port.mjs';
import { mkdirSync } from 'node:fs';
import { RECIPES } from '../src/content/goods.mjs';
mkdirSync('test-results/latest', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  for (const [lang, width] of [['en', 1280], ['vi', 390], ['ko', 390], ['ja', 1280]]) {
    const now = Date.now(), s = newGame(now, 94, { restore: true });
    s.level = 20; s.coins = 10000; s.barn.cap = 10000; s.projects.step = 999; s.story.chapter = 20; s.story.tutorial = 999;
    s.settings.daylight = 'always'; s.firsts.quay = now; s.helpAt = s.handsAt = now + 100000000; s.parcels.push('1,2', '1,1');
    for (const [id, kind, x, z] of [['rev-cow', 'cow_barn', 50, 60], ['rev-tractor', 'tractor_shed', 56, 60], ['rev-drone', 'drone_pad', 60, 60], ['rev-ox', 'buffalo_pen', 62, 60], ['rev-hotel', 'hotel', 64, 12]]) {
      s.placed[id] = { kind, x, z, rot: 0 }; s.cond[id] = { level: 0 };
    }
    s.placed['rev-bed'] = { kind: 'bed', x: 50, z: 58, rot: 0 }; s.beds['rev-bed'] = { crop: 'carrot', doneAt: now - 1 };
    s.music = { 'rev-cow': true }; s.outputUp = { 'rev-cow': 2 }; s.animals['rev-cow'] = [{ kind: 'cow', doneAt: now - 1 }];
    s.barn.items.wheat = 10; s.barn.items.carrot = 10;
    s.port = { n: 0, nextAt: now, here: { n: 0, at: now, until: now + PORT.stopMs,
      holds: ['wheat', 'carrot', 'milk', 'bread'].map(good => ({ good, need: 4, have: 0 })) } };
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
    await context.addInitScript(({ save, lang, now }) => {
      Date.now = () => now; localStorage.setItem('farm-village.language', lang);
      if (!sessionStorage.getItem('review-latest')) { sessionStorage.setItem('review-latest', '1'); localStorage.setItem('farm-village:save:1', save); }
    }, { save: pack(s), lang, now });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5241/');
    await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(() => { farm.skipIntro(); farm.closeCards(); clearInterval(farm.game.timer); farm.panels.show('port'); });
    await page.locator('.coop-line').first().waitFor();
    assert.equal(await page.locator('.coop-line').count(), 4);
    if (lang === 'vi') assert.equal(await page.locator('[data-do="loadHold"][data-hold="0"][data-n]').innerText(), 'Xếp 4');
    await page.screenshot({ path: `test-results/latest/ship-${lang}-${width}.png` });
    await page.locator('[data-do="loadHold"][data-hold="0"]:not([data-n])').click();
    await page.waitForFunction(() => farm.state().port.here.holds[0].have === 4);
    assert.equal(await page.evaluate(() => farm.state().barn.items.wheat), 6);
    // Go to the milk source and return to exactly the ship request.
    await page.locator('[data-do="goodHelp"][data-good="milk"]').click();
    await page.locator('.good-help').waitFor();
    assert.match(await page.locator('.good-help').innerText(), /6/);
    await page.locator('[data-do="goodHelpSource"]').click();
    assert.equal(await page.evaluate(() => farm.panels.open), null);
    await page.evaluate(() => farm.radial.hide());
    await page.locator('.help-return').click();
    await page.locator('.coop-line').first().waitFor();
    assert.equal(await page.evaluate(() => farm.panels.open.kind), 'port');
    assert.equal(await page.evaluate(() => farm.state().port.here.holds[0].have), 4);
    await page.evaluate(() => farm.panels.show('workBoard'));
    await page.locator('[data-do="protectFieldCrops"]').click();
    await page.locator('[data-do="workOwner"]').first().waitFor();
    assert.match(await page.locator('.panel').innerText(), /8/);
    await page.screenshot({ path: `test-results/latest/work-${lang}-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    // Each added workshop can actually queue and collect its new recipe.
    const recipes = Object.fromEntries(['mushroom', 'kimchi', 'salad'].map(id => [id, RECIPES[id]]));
    const batches = await page.evaluate(recipes => {
      const s = farm.state(), g = farm.game, out = [];
      for (const [id, r] of Object.entries(recipes)) {
        const building = 'review-' + r.at; s.placed[building] = { kind: r.at, x: 60, z: 64, rot: 0 };
        for (const [good, amount] of Object.entries(r.needs)) s.barn.items[good] = amount + 100;
        const before = s.barn.items[id] ?? 0, made = g.do('produce', { building, recipe: id });
        if (made.ok) for (const q of s.production[building].queue) q.doneAt = g.now;
        const collected = g.do('collectProducts', { building }); out.push(made.ok && collected.ok && s.barn.items[id] > before);
        delete s.placed[building]; delete s.production[building];
      }
      return out;
    }, recipes);
    assert.deepEqual(batches, [true, true, true]);
    await page.evaluate(async () => { farm.panels.close(); farm.closeCards(); await farm.land.later; });
    for (const span of [30, 90, 200]) {
      await page.evaluate(span => farm.focus(65, 30, span), span); await page.waitForTimeout(1800);
      const info = await page.evaluate(() => farm.info());
      assert.ok(info.draws <= 120 && info.triangles <= 300000, JSON.stringify(info));
    }
    if (lang === 'en') {
      await page.waitForFunction(() => farm.radial.people?.walkers.has('you'));
      await page.evaluate(() => { const w = farm.radial.people.walkers.get('you'); farm.focus(w.x / 2, w.z / 2, 20); });
      await page.waitForFunction(() => farm.radial.people.walkers.get('you').subject.actor?.root.visible, null, { timeout: 60000 });
      const before = await page.evaluate(() => farm.radial.people.walkers.get('you').subject.rig);
      let attempts = 0;
      await page.route('**/costumes.glb', route => { attempts++; return route.abort('failed'); });
      await page.evaluate(() => farm.game.do('setting', { key: 'playerLook', value: 'star' }));
      await page.waitForTimeout(1500);
      assert.ok(attempts > 0); assert.equal(await page.evaluate(() => farm.radial.people.walkers.get('you').subject.rig), before, 'failed download removed the current character');
      await page.unroute('**/costumes.glb');
      await page.evaluate(() => farm.game.do('setting', { key: 'playerLook', value: 'star' }));
      await page.waitForFunction(() => farm.radial.people.walkers.get('you').subject.rig.includes('kit:dz_star'), null, { timeout: 60000 });
      await page.evaluate(() => { farm.game.do('setting', { key: 'playerBody', value: 'girl' }); farm.game.do('setting', { key: 'playerSkirt', value: 3 }); farm.game.do('setting', { key: 'playerBody', value: 'woman' }); farm.game.do('setting', { key: 'playerBody', value: 'girl' }); });
      await page.waitForFunction(() => farm.radial.people.walkers.get('you').subject.rig === 'girl+kit:dz_star+skirt:3', null, { timeout: 60000 });
      await page.waitForFunction(() => { const a = farm.radial.people.walkers.get('you').subject.actor; return a?.root.visible && a.rig.name === 'girl+kit:dz_star+skirt:3'; }, null, { timeout: 60000 });
      assert.ok(await page.evaluate(() => { const p = farm.radial.people; return p.cast.subjects.has(p.walkers.get('you').subject); }));
      await page.screenshot({ path: 'test-results/latest/outfit-retry.png' });
    }
    assert.deepEqual(errors, []); console.log(`PASS latest review ${lang} ${width}: ship, source/back, work board, radio, food workshops, draw budget`);
    await context.close();
  }
} finally { await browser.close(); }
