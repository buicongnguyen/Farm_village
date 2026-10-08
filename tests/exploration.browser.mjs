// Real controls for the optional trail, existing farmhouse entry, saved memories, and premature-favour regression.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VI } from '../src/i18n/vi.mjs';
import { POND_DOCK } from '../src/content/world.mjs';
import { EXPLORATION_SITES } from '../src/content/exploration-sites.mjs';
import { EXPLORATION_STEPS } from '../src/content/exploration.mjs';
import { findSpot } from '../src/core/grid.mjs';
import { unreadAdvice } from '../src/core/advice.mjs';
import { unreadDiscoveries } from '../src/core/discoveries.mjs';
import { unreadExploration } from '../src/core/exploration.mjs';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'farm-village-exploration'); mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
let failures = 0;
async function prepare(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    const g = farm.game, at = g.now; clearInterval(g.timer); g.clock = () => at;
    farm.skipIntro(); farm.closeCards(); farm.panels.close();
    g.s.story.chapter = 5; g.s.settings.reducedMotion = true; document.body.classList.add('reduced-motion');
    g.s.neighbours = Object.fromEntries(['mai','gus'].map(id => [id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
    farm.hud.update();
  });
}
async function noOverflow(page) {
  return page.locator('.exploration-modal .card-modal').evaluate(el => {
    const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
  });
}
async function check(name, viewport, fn) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try { await fn(ctx); console.log('ok   ' + name); }
  catch (e) { failures++; console.log('FAIL ' + name + '\n' + e.stack); }
  finally { await ctx.close(); }
}
try {
for (const lang of ['en','vi']) for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 850 }]) {
  await check(`picnic trail, save and replay ${lang} ${viewport.width}px`, viewport, async ctx => {
    await ctx.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url + '?new&restore'); await prepare(page);
    await page.evaluate(() => farm.panels.show('today'));
    expect(await page.locator('.exploration-entry').count() === 0, 'unfinished first order exposes the trail');
    // Deliver the real tutorial order with the actual button and starter wheat.
    const id = await page.evaluate(() => { farm.panels.show('orders'); return farm.state().orders.cards.find(c => c.story).id; });
    await page.locator(`[data-do="deliver"][data-id="${id}"]`).click();
    await page.evaluate(() => { farm.closeCards(); farm.panels.show('today'); });
    expect(await page.locator('.exploration-entry').count() === 1, 'completed order did not unlock optional trail');
    await page.waitForFunction(() => farm.world.exploration?.loaded && farm.world.batches.items.has('trail_porch_box_closed'));
    expect(!await page.evaluate(() => farm.world.batches.items.has('trail_pond_cache_closed')), 'pond cache shown before the porch clue');
    const base = await page.evaluate(() => ({ coins: farm.state().coins, pots: farm.state().stored.flowerpot ?? 0 }));
    await page.locator('.exploration-entry [data-do="explorationPlace"]').click();
    for (const step of EXPLORATION_STEPS) {
      // Tap the actual prop. It opens a panel and never earns a clue by itself.
      const countBeforeTap = await page.evaluate(() => farm.state().exploration.steps.length);
      const position = await page.evaluate(site => {
        farm.panels.close(); farm.closeCards(); farm.radial.hide();
        farm.focus(site.x - .5, site.z - .5, 24);
        const v = farm.world.cam.camera.position.clone().set(site.x * 2, .35, site.z * 2).project(farm.world.cam.camera);
        return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2 };
      }, EXPLORATION_SITES[step.location]);
      if (step.id !== 'share') await page.screenshot({ path: join(shots, 'world-' + step.id + '-' + lang + '-' + viewport.width + '.png') });
      await page.mouse.click(position.x, position.y);
      expect(await page.locator('.exploration-trail').isVisible(), 'world prop did not open its trail');
      expect(await page.evaluate(() => farm.state().exploration.steps.length) === countBeforeTap, 'world tap granted progress without inspection');
      await page.locator(`[data-do="inspectExploration"][data-step="${step.id}"]`).click();
      await page.waitForSelector('.exploration-modal .exploration-detail');
      if (step.id === 'porch') {
        expect(await page.evaluate(() => farm.world.batches.items.has('trail_porch_box_open') && !farm.world.batches.items.has('trail_porch_box_closed') && farm.world.batches.items.has('trail_pond_cache_closed')), 'porch opening / pond reveal mismatch');
      } else if (step.id === 'pond') {
        expect(await page.evaluate(() => farm.world.batches.items.has('trail_pond_cache_open') && !farm.world.batches.items.has('trail_pond_cache_closed')), 'pond cache did not stay open');
      } else {
        expect(await page.locator('.exploration-detail img[src$="trail_picnic_ribbon.webp"]').count() === 1, 'delivered ribbon icon missing');
      }
      await page.locator('.exploration-detail img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const text = await page.locator('.exploration-detail').innerText();
      expect(text.includes(tr(lang, step.story)), 'missing localized story: ' + step.id);
      for (const line of step.lines) expect(text.includes(tr(lang, line.text)), 'missing dialogue: ' + line.text);
      expect(await noOverflow(page), 'memory overflow');
      if (step.id === 'share') await page.screenshot({ path: join(shots, `picnic-${lang}-${viewport.width}.png`) });
      await page.locator('.exploration-modal [data-close]').click();
    }
    const complete = await page.evaluate(() => ({ coins: farm.state().coins, pots: farm.state().stored.flowerpot ?? 0, trail: farm.state().exploration }));
    expect(complete.coins === base.coins && complete.pots === base.pots + 1, 'wrong trail reward');
    expect(complete.trail.steps.length === 3 && complete.trail.read.length === 3, 'progress/read state missing');
    await page.evaluate(() => { window.__fvSave(); history.replaceState({}, '', location.pathname); });
    await page.reload(); await prepare(page);
    await page.evaluate(() => farm.panels.show('album'));
    await page.locator('.exploration-entry [data-do="explorationPlace"]').click();
    const before = await page.evaluate(() => ({ coins: farm.state().coins, pots: farm.state().stored.flowerpot ?? 0 }));
    await page.locator('[data-do="explorationRead"][data-step="share"]').click();
    expect(await noOverflow(page), 'replayed memory overflow');
    const after = await page.evaluate(() => ({ coins: farm.state().coins, pots: farm.state().stored.flowerpot ?? 0 }));
    expect(JSON.stringify(before) === JSON.stringify(after), 'replay paid again');
    await page.locator('.exploration-modal [data-close]').click();
    await page.locator('[data-do="wishBuild"][data-kind="flowerpot"]').click();
    const spot = findSpot(await page.evaluate(() => farm.state()), 'flowerpot', 38, 60);
    expect(spot, 'no free place for the earned flowerpot');
    const position = await page.evaluate(spot => {
      farm.focusVisible(spot.x, spot.z); farm.build.hover(spot);
      return farm.cellToScreen(spot.x, spot.z, .5, .5);
    }, spot);
    const preview = await page.locator('.place-bar .reason').innerText();
    expect(/\b0\b/.test(preview) && !/\b8\b/.test(preview), 'stored gift previews a paid price: ' + preview);
    await page.mouse.click(position.x, position.y);
    const placed = await page.evaluate(() => ({ coins: farm.state().coins, pots: farm.state().stored.flowerpot ?? 0 }));
    expect(placed.coins === after.coins && placed.pots === after.pots - 1, 'placing the earned gift did not use free stored stock');
    expect(errors.length === 0, errors.join('\n'));
  });
}
await check('optional prop download failure leaves the trail usable', { width: 390, height: 844 }, async ctx => {
  await ctx.route('**/exploration-props.glb', route => route.abort());
  const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '?new&restore'); await prepare(page);
  await page.evaluate(() => { farm.game.s.stats.ordersFilled = 1; farm.game.tick(); farm.closeCards(); farm.panels.show('today'); });
  await page.locator('.exploration-entry [data-do="explorationPlace"]').click();
  for (const step of EXPLORATION_STEPS) {
    if (!await page.locator('[data-do="inspectExploration"][data-step="' + step.id + '"]').isVisible())
      await page.locator('.exploration-trail [data-do="explorationPlace"]').click();
    await page.locator('[data-do="inspectExploration"][data-step="' + step.id + '"]').click();
    await page.locator('.exploration-modal [data-close]').click();
  }
  await page.evaluate(async () => { await farm.world.exploration.ready; });
  expect(await page.evaluate(() => farm.state().exploration.steps.length === 3 && farm.state().stored.flowerpot === 1), 'missing optional art blocked reward');
  expect(errors.length === 0, errors.join(' | '));
});
await check('distant discovery props do not capture normal pond fishing taps', { width: 390, height: 844 }, async ctx => {
  const page = await ctx.newPage(); await page.goto(url + '?new&restore'); await prepare(page);
  await page.evaluate(() => {
    const g = farm.game; g.s.stats.ordersFilled = 1;
    for (const step of ['porch','pond','share']) g.do('inspectExploration', {step});
    farm.closeCards();
  });
  await page.waitForFunction(() => farm.world.exploration?.loaded);
  for (const span of [24,38,40,45,90,140,220]) {
    const target = await page.evaluate(({dock,span}) => {
      farm.panels.close(); farm.radial.hide(); farm.focus(dock.x,dock.z,span);
      return farm.cellToScreen(dock.x,dock.z);
    }, {dock:POND_DOCK,span});
    await page.mouse.click(target.x,target.y);
    expect(await page.locator('[data-do="castLine"]').first().isVisible(), 'distant prop stole pond control at span ' + span);
    expect(await page.locator('.exploration-trail').count() === 0, 'dock tap opened picnic trail');
  }
});
await check('discovery props preserve full-farm budgets at every zoom', { width: 390, height: 844 }, async ctx => {
  const page = await ctx.newPage(); await page.goto(url + '?new&restore'); await prepare(page);
  await page.evaluate(() => {
    const g = farm.game; g.s.stats.ordersFilled = 1;
    for (const step of ['porch','pond','share']) g.do('inspectExploration', {step});
    farm.closeCards(); farm.fillFarm();
  });
  await page.waitForFunction(() => farm.world.exploration?.loaded);
  for (const span of [24,40,90,140,220]) {
    const info = await page.evaluate(async span => { farm.view(span); return farm.measure(500); }, span);
    expect(info.draws <= 120 && info.triangles <= 300000, 'discovery budget ' + span + ': ' + JSON.stringify(info));
  }
});
await check('unread counts, real farmhouse entry and legacy favour arrival', { width: 390, height: 844 }, async ctx => {
  const page = await ctx.newPage(); await page.goto(url + '?new&restore'); await prepare(page);
  await page.evaluate(() => { farm.game.s.stats.ordersFilled = 1; farm.hud.update(); });
  // Trigger without opening its memory: the earned milestone must add exactly one unread contribution.
  await page.evaluate(() => farm.game.do('inspectExploration', { step: 'porch' }));
  const snapshot = await page.evaluate(() => { const b = document.querySelector('[data-act="today"] .badge'); return { s: farm.state(), now: farm.game.now, badge: b.textContent }; });
  const count = unreadAdvice(snapshot.s, snapshot.now) + unreadDiscoveries(snapshot.s) + unreadExploration(snapshot.s);
  expect(unreadExploration(snapshot.s) === 1 && snapshot.badge === String(count), 'earned-only shared badge mismatch');
  await page.evaluate(() => farm.closeCards()); // the fixture's first-order statistic may open the unrelated first-loaf beat
  // The real house radial exposes the optional interaction without replacing repair/upgrade actions.
  await page.evaluate(() => { const r = farm.radial; const m = r.houseMenu(); r.open({ x: 24, z: 62 }, 195, 350, m.buttons, m.info, {}); });
  await page.locator('[data-act="explorePorch"]').click();
  expect(await page.locator('.exploration-trail').isVisible(), 'farmhouse entry failed');
  // A milestone requested behind another story card stays unread until it is visible; double activation queues once.
  await page.evaluate(() => {
    farm.game.emit({ ok: true, events: [{ type: 'heartScene', person: 'ada', at: 3, reward: { decor: 'flowerpot' } }] }, 'test');
    const button = document.querySelector('[data-do="explorationRead"][data-step="porch"]');
    button.click(); button.click();
  });
  expect(await page.evaluate(() => !farm.state().exploration.read.includes('porch')), 'queued memory was marked read while hidden');
  await page.locator('.heart-scene [data-close]').click();
  await page.waitForSelector('.exploration-modal');
  expect(await page.evaluate(() => farm.state().exploration.read.includes('porch')), 'visible memory was not acknowledged');
  await page.locator('.exploration-modal [data-close]').click();
  expect(await page.locator('.exploration-modal').count() === 0, 'double activation queued duplicate memories');

  await page.evaluate(() => {
    const g = farm.game; farm.panels.close();
    g.s.quests = { done: 0, list: [{ id: 'legacy-lan', favour: true, person: 'lan', good: 'wheat', n: 12, coins: 60, xp: 14, hearts: .5 }] };
    g.tick(); farm.panels.show('quests');
  });
  expect(await page.locator('[data-do="claimQuest"][data-id="legacy-lan"]').count() === 0, 'unintroduced Lan leaked into goals');
  expect(await page.locator('[data-do="claimQuest"]').count() === 3, 'deferred favour blocked normal goals');
  await page.evaluate(() => { const g = farm.game; g.s.homes.legacyFamily = { family: 'tran', arrivesAt: g.now, arrived: true, level: 1, rentFrom: g.now }; farm.panels.render(); });
  expect(await page.locator('[data-do="claimQuest"][data-id="legacy-lan"]').count() === 1, 'saved favour missing after arrival');
});
} finally { await browser.close(); }
process.exitCode = failures ? 1 : 0;
