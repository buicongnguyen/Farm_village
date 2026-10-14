// PRs #123–#125: report facts, costume retry, room disposal and stable conversations.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const url = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
mkdirSync('test-results/insight', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function enter(page, site) {
  if (site) {
    await page.evaluate(id => farm.panels.show('clinic', id), site);
    await page.locator(`[data-do="enterInterior"][data-id="${site}"]`).click();
  } else {
    await page.evaluate(() => { farm.closeCards(); farm.panels.close(); farm.state().cond.house = { level: 0 }; farm.focus(22, 62, 30); });
    const p = await page.evaluate(() => farm.cellToScreen(22, 62));
    await page.mouse.click(p.x, p.y); await page.locator('.radial [data-act="goInside"]').click();
  }
  await page.waitForFunction(() => farm.world.exploreMode?.session && !farm.world.exploreMode.loading, null, { timeout: 60000 });
  await page.evaluate(() => { const m = farm.world.exploreMode; m.clear(); m.session.p = [...m.approach]; m.near = m.scan(); m.render(); });
  await page.locator('[data-explore="interact"]').click();
  await page.waitForFunction(() => farm.world.exploreMode.inside && farm.world.exploreMode.room && !farm.world.exploreMode.loading, null, { timeout: 60000 });
}
try {
  for (const [language, width] of [['en', 1280], ['vi', 390], ['ko', 390], ['ja', 1280]]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width === 390, hasTouch: width === 390 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(lang => localStorage.setItem('farm-village.language', lang), language);
    await page.goto(url + '?new&restore'); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(() => {
      farm.skipIntro(); farm.closeCards(); clearInterval(farm.game.timer);
      const s = farm.state(); s.level = 12; s.cond = {}; s.animals = {};
      s.story.tutorial = 999;
      const bakery = Object.keys(s.placed).find(id => s.placed[id].kind === 'bakery');
      s.cond[bakery] = { level: 3 }; farm.panels.show('insight');
    });
    await page.locator('.insight-total').waitFor();
    assert.equal(await page.locator('.insight-row').count(), 7);
    assert.ok(!/NaN|Infinity|\{(?:gain|rate|a|b)\}/.test(await page.locator('.panel').innerText()));
    await page.locator('[data-do="insight"][data-arg="map"]').click();
    assert.ok(await page.locator('[data-arg="map:bread"]').evaluate(e => e.classList.contains('open')), 'broken bakery shown ready');
    assert.ok(await page.locator('[data-arg="map:egg"]').evaluate(e => e.classList.contains('open')), 'empty coop shown ready');
    await page.locator('[data-arg="map:bread"]').click();
    assert.ok(await page.locator('[data-arg="map:wheat"]').evaluate(e => e.classList.contains('lit')));
    await page.evaluate(() => { farm.state().cond = {}; farm.panels.render(); });
    assert.ok(await page.locator('[data-arg="map:bread"]').evaluate(e => e.classList.contains('ready')));
    await page.evaluate(() => farm.panels.show('insight', 'map:__proto__'));
    await page.locator('.insight-map').waitFor();
    await page.evaluate(() => {
      farm.state().insight = { levels: [0, 1, 100, 150, 200].map((m, i) => ({ l: i + 2, c: i * 100, m: i * 5, o: i, ms: m * 60000 })) };
      farm.panels.show('insight', 'growth');
    });
    assert.equal(await page.locator('.insight-col').count(), 4);
    assert.match(await page.locator('.insight-next').innerText(), /120/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'report overflowed the phone');
    await page.screenshot({ path: `test-results/insight/${language}-${width}.png` });
    if (language === 'en') {
      await enter(page);
      let attempts = 0;
      await page.route('**/costumes.glb', route => { attempts++; return route.abort('failed'); });
      const failed = await page.evaluate(async () => {
        const r = farm.world.exploreMode.room, before = r.player.rig;
        try { await r.dress({ ...farm.state().settings, playerLook: 'redflag' }); return false; }
        catch { return r.player.rig === before; }
      });
      assert.ok(attempts > 0 && failed, 'failed outfit was cached as a bare body');
      await page.unroute('**/costumes.glb');
      await page.evaluate(async () => {
        const r = farm.world.exploreMode.room; await r.dress({ ...farm.state().settings, playerLook: 'redflag' });
        r.cast.select();
      });
      assert.ok(await page.evaluate(() => farm.world.exploreMode.room.player.rig.includes('kit:dz_vietnam')), 'outfit retry did not recover');
      // Exercise the actual wardrobe control after the retry.
      await page.evaluate(() => { const m = farm.world.exploreMode; m.card = 'wardrobe'; m.wardTab = 'look'; m.render(); });
      await page.locator('[data-explore="look:aodai"]').click();
      await page.waitForFunction(() => farm.world.exploreMode.room.player.rig.includes('kit:dz_aodai'), null, { timeout: 60000 });
      await page.locator('[data-explore="back"]').click();
      await page.evaluate(() => {
        const c = farm.world.exploreMode.room.cast; c.max = 0; c.select(); c.drawCrowds(0);
        window.reviewCast = c; window.reviewDisposals = 0;
        for (const crowd of c.crowds.values()) if (crowd.tints) crowd.mesh.geometry.addEventListener('dispose', () => window.reviewDisposals++);
      });
      assert.ok(await page.evaluate(() => reviewCast.crowds.size > 0));
      await page.locator('[data-explore="close"]').click();
      assert.ok(await page.evaluate(() => reviewDisposals > 0 && !reviewCast.subjects.size && !reviewCast.actors.length && !reviewCast.crowds.size), 'room graphics survived closing');
      const hospital = await page.evaluate(() => {
        farm.game.do('testJumpChapter', { chapter: 10 }); farm.closeCards();
        farm.state().stats.playMs = 10 * 60000; farm.state().stats.harvested = 20;
        const id = Object.keys(farm.state().placed).find(id => farm.state().placed[id].kind === 'clinic'); farm.state().cond[id] = { level: 0 }; return id;
      });
      await enter(page, hospital);
      await page.evaluate(() => {
        const m = farm.world.exploreMode, nurse = m.session.room.people.find(p => p.id === 'nurse');
        m.clear(); m.session.p = [...nurse.stand]; m.render();
      });
      await page.locator('[data-explore="interact"]').click();
      const question = await page.locator('.explore-card p b').innerText();
      assert.match(question, /20/); assert.ok(!question.includes('hours'));
      await page.evaluate(() => { farm.state().stats.harvested = 999; farm.state().stats.playMs = 4 * 3600000; });
      await page.locator('[data-explore="answer:0"]').click();
      assert.equal(await page.locator('.explore-card p').first().innerText(), question, 'the answer was attached to a different question');
      await page.locator('[data-explore="back"]').click(); await page.locator('[data-explore="close"]').click();
    }
    assert.deepEqual(errors, []);
    console.log(`PASS insight ${language} ${width}: sources, charts, layout${language === 'en' ? ', costume retry, room disposal, dialogue' : ''}`);
    await context.close();
  }
} finally { await browser.close(); }
