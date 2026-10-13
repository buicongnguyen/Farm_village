// Source cards and stored orchard improvements, through the built game in English/Vietnamese.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { newGame } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { canPlace } from '../src/core/grid.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { pack } from '../src/kit/save.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
    const now = Date.now(), s = newGame(now, 417, { restore: true });
    s.level = 20; s.xp = xpFor(20); s.coins = 100000; s.cond = {}; s.story.tutorial = 999; s.story.chapter = 20;
    s.projects.step = 999; s.handsAt = now + 1000000; s.helpAt = now + 1000000; s.settings.reducedMotion = true;
    s.knowhow = { known: { thin: now }, saplings: {} }; act(s, 'endBuild', {}, now);
    let tree;
    for (let z = 0; z < 128 && !tree; z++) for (let x = 0; x < 128 && !tree; x++) if (canPlace(s, 'apple_tree', x, z, 0).ok) tree = act(s, 'place', { kind: 'apple_tree', x, z }, now).id;
    assert.ok(tree); Object.assign(s.trees[tree], { cross: true, graft: true, picked: 8, graftAt: 6, doneAt: now });
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
    await context.addInitScript(({ save, lang, now }) => {
      Date.now = () => now; localStorage.setItem('farm-village.language', lang);
      if (!sessionStorage.getItem('review-seeded')) { sessionStorage.setItem('review-seeded', '1'); localStorage.setItem('farm-village:save:1', save); }
    }, { save: pack(s), lang, now });
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:5241/');
    await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(() => { clearInterval(farm.game.timer); farm.skipIntro(); farm.closeCards(); farm.panels.close(); });
    // A rare egg opens its discovery information; it never sends the player fishing.
    await page.evaluate(() => farm.panels.show('goodHelp', { good: 'rainbow_egg', needed: 1 }));
    await page.locator('[data-do="goodHelpSource"]').click();
    await page.locator('.panel[data-kind="knowhow"]:not([hidden])').waitFor();
    assert.ok(await page.locator('.lucky-grid').isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    // Remove the only crossed tree through the game action, then use the real Go control to find the technique.
    const spot = await page.evaluate(tree => { const spot = { ...farm.game.s.placed[tree] }; const r = farm.game.do('store', { id: tree }); if (!r.ok) throw Error(r.reason); return spot; }, tree);
    await page.evaluate(() => farm.panels.show('goodHelp', { good: 'mango_apple', needed: 1 }));
    await page.locator('[data-do="goodHelpSource"]').click();
    await page.locator('.panel[data-kind="knowhow"]:not([hidden])').waitFor();
    await page.evaluate(() => { const s = farm.game.s; localStorage.setItem('farm-village:save:1', JSON.stringify({ ...s, cells: s.cells.join('') })); });
    await page.reload(); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    const restored = await page.evaluate(spot => {
      clearInterval(farm.game.timer); farm.skipIntro(); farm.closeCards(); farm.panels.close();
      const r = farm.game.do('place', spot); if (!r.ok) throw Error(r.reason);
      return { id: r.id, ...farm.game.s.trees[r.id] };
    }, spot);
    assert.equal(restored.cross, true); assert.equal(restored.graft, true); assert.equal(restored.picked, 8); assert.equal(restored.graftAt, 6);
    // Go now opens that actual tree without picking it or spending money.
    const before = await page.evaluate(() => farm.game.s.coins);
    await page.evaluate(() => farm.panels.show('goodHelp', { good: 'mango_apple', needed: 1 }));
    await page.locator('[data-do="goodHelpSource"]').click();
    assert.equal(await page.evaluate(() => farm.radial.target?.id), restored.id);
    assert.equal(await page.evaluate(() => farm.game.s.coins), before);
    assert.deepEqual(errors, []); await context.close(); console.log(`ok updated goods, source navigation and stored improvements: ${lang} ${width}`);
  }
} finally { await browser.close(); }
