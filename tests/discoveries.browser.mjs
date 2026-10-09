// Earned finds through real controls, saved memories, and legacy import in both phone languages.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DISCOVERIES } from '../src/content/discoveries.mjs';
import { unreadAdvice } from '../src/core/advice.mjs';
import { unreadDiscoveries } from '../src/core/discoveries.mjs';
import { loadVietnamese, tIn } from '../src/kit/i18n.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'farm-village-discoveries'); mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const expect = (ok, why) => { if (!ok) throw Error(why); };
await loadVietnamese();
const tr = tIn;
let failures = 0;
async function check(name, fn) {
  let ctx;
  try {
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await fn(ctx); console.log('ok   ' + name);
  } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.stack); }
  finally { await ctx?.close(); }
}
async function prepare(page, fresh = false) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(fresh => {
    const g = farm.game, now = g.now; clearInterval(g.timer); g.clock = () => now;
    farm.skipIntro(); farm.closeCards(); farm.panels.close();
    g.s.settings.reducedMotion = true; document.body.classList.add('reduced-motion');
    // The discovery controls are the subject; keep incidental visits and unrelated story cards out of their way.
    g.s.story.chapter = 5; g.s.today.claimed = true;
    for (const id of Object.keys(g.s.neighbours)) g.s.neighbours[id] = { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null };
    if (fresh) g.s.barn.items = { wheat: g.s.barn.cap }; // fish overflow is normal income, tracked separately below
    window.__discoveryEvents = [];
    g.on(r => window.__discoveryEvents.push(...(r.events ?? [])));
    farm.hud.update();
  }, fresh);
}
async function open(ctx, lang) {
  await ctx.addInitScript(lang => localStorage.setItem('farm-village.language', lang), lang);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_ + '?new&restore'); await prepare(page, true);
  return { page, errors };
}
async function catchOne(page) {
  await page.evaluate(() => { farm.closeCards(); farm.panels.show('pond'); });
  await page.click('.panel [data-do="castLine"]:not([data-bait])');
  await page.evaluate(() => {
    const g = farm.game, at = g.s.fishing.line?.doneAt;
    if (!at) throw Error('Cast button did not start a line');
    g.clock = () => at; g.tick(); farm.panels.render();
  });
  await page.click('.panel [data-do="reelIn"]');
}
async function badge(page, count) {
  // Capture facts and DOM together: June may acknowledge an idea between separate browser calls.
  // Finds keep their exact expected count; the shared badge also includes whichever current advice remains unread.
  const state = await page.evaluate(() => {
    const badge = document.querySelector('[data-act="today"] .badge');
    return { text: badge.textContent, hidden: badge.hidden, farm: farm.state(), now: farm.game.now };
  });
  expect(unreadDiscoveries(state.farm) === count, 'wrong number of unread discoveries');
  const expected = count + unreadAdvice(state.farm, state.now);
  expect(state.text === (expected ? String(expected) : ''), 'wrong combined unread count: ' + JSON.stringify({ text: state.text, expected, discoveries: count }));
  expect(state.hidden === !expected, 'Today badge visibility does not match unread messages');
}
async function showMemories(page, kind) {
  await page.evaluate(kind => { farm.closeCards(); farm.panels.show(kind); }, kind);
  // Sheets load on first use. Wait for the real body before asserting either present or absent memories.
  await page.locator(`.panel[data-kind="${kind}"] div.${kind}`).waitFor({ state: 'visible' });
  return page.locator('.' + kind + ' .discovery-memory');
}
async function readMemory(page, lang, id, kind) {
  await showMemories(page, kind);
  const def = DISCOVERIES.find(d => d.id === id), coins = await page.evaluate(() => farm.state().coins);
  const row = page.locator(`.${kind} .discovery-memory[data-do="discovery"][data-id="${id}"]`);
  expect((await row.textContent()).includes(tr(lang, def.title)), 'memory title missing: ' + id);
  await row.click();
  await page.waitForSelector('.discovery-modal .discovery-detail');
  const text = await page.textContent('.discovery-modal .discovery-detail');
  for (const line of [def.title, def.text, def.line, 'Already added to your coins']) expect(text.includes(tr(lang, line)), 'missing discovery text: ' + line);
  expect(await page.evaluate(() => farm.state().coins) === coins, 'opening a memory paid again');
  expect(await page.evaluate(id => farm.state().discoveries.read.includes(id), id), 'opening did not acknowledge the memory');
  expect(await page.locator('.discovery-modal .card-modal').evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
  }), 'discovery card does not fit the phone');
  if (id === 'pond-tin' && kind === 'today') await page.screenshot({ path: join(shots, `discovery-${lang}.png`) });
  await page.click('.discovery-modal [data-close]');
}

for (const lang of ['en', 'vi']) {
  await check('four finds pay exactly 110 extra coins and their optional memories survive reading and reload (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    expect(await page.evaluate(() => farm.state().coins) === 500, 'restored start changed');
    for (let n = 1; n <= 12; n++) {
      await catchOne(page);
      const finds = await page.evaluate(() => window.__discoveryEvents.filter(e => e.type === 'discovery').map(e => e.id));
      expect(JSON.stringify(finds) === JSON.stringify(n < 2 ? [] : n < 10 ? ['pond-tin'] : ['pond-tin', 'pond-keepsake']), 'wrong catch milestones at catch ' + n);
      expect(await page.locator('.discovery-modal').count() === 0, 'a find interrupted play with a mandatory card');
    }
    await badge(page, 2);
    const noReplay = await page.evaluate(() => {
      const g = farm.game, before = JSON.stringify(g.s), r = g.do('reelIn');
      return !r.ok && !r.events.length && before === JSON.stringify(g.s);
    });
    expect(noReplay, 'a refused catch changed the farm or paid again');

    // Put two actual rocks on free owned cells, then clear them with the build tool and real canvas clicks.
    await page.evaluate(() => {
      farm.closeCards(); farm.panels.close();
      for (const x of [40, 41]) farm.game.s.cells[68 * 128 + x] = 2;
      farm.game.emit({ ok: true, events: [{ type: 'cellChanged', x: 40, z: 68 }, { type: 'cellChanged', x: 41, z: 68 }] }, 'test');
      farm.build.show();
    });
    await page.click('.build [data-tool="clear"]');
    for (const [i, x] of [40, 41].entries()) {
      const point = await page.evaluate(async x => {
        farm.focusVisible(x, 68); await new Promise(requestAnimationFrame);
        return farm.cellToScreen(x, 68);
      }, x);
      await page.mouse.click(point.x, point.y);
      await page.waitForFunction(x => farm.state().cells[68 * 128 + x] === 0, x);
      expect(await page.evaluate(() => !!farm.state().discoveries.claimed['stone-keepsake']) === (i === 1), 'rock milestone fired on the wrong clear');
    }
    await page.click('.build [data-bar="close"]');
    await badge(page, 3);

    // Open the road's real action menu. Character movement is unrelated to this repair fixture.
    await page.evaluate(() => {
      farm.closeCards(); farm.panels.close(); farm.focusVisible(31, 90);
      farm.people.walkers.forEach(w => { w.indoors = true; });
      const p = farm.cellToScreen(31, 90); farm.radial.tap({ x: 31, z: 90 }, p.x, p.y);
    });
    await page.click('.radial-btn[data-act="repair"]');
    expect(await page.evaluate(() => !farm.state().discoveries.claimed['street-thanks']), 'street find paid when repair merely started');
    await page.evaluate(() => {
      const g = farm.game, at = g.s.repairing.road_south?.doneAt;
      if (!at) throw Error('Repair button did not start Village Street');
      g.clock = () => at; g.tick(); farm.closeCards();
    });
    await page.waitForFunction(() => !!farm.state().discoveries.claimed['street-thanks']);
    await badge(page, 4);
    const result = await page.evaluate(() => {
      const all = window.__discoveryEvents, finds = all.filter(e => e.type === 'discovery');
      return { finds, coins: farm.state().coins, ordinary: all.filter(e => e.type === 'barnSold').reduce((n, e) => n + e.coins, 0),
        payouts: all.filter(e => e.type === 'coins' && e.source === 'discovery').reduce((n, e) => n + e.coins, 0) };
    });
    expect(result.finds.length === 4 && new Set(result.finds.map(e => e.id)).size === 4, 'finds repeated or disappeared');
    expect(result.finds.reduce((n, e) => n + e.coins, 0) === 110 && result.payouts === 110, 'introductory finds exceeded or missed their budget');
    expect(result.ordinary > 0 && result.coins === 500 - 20 - 40 + result.ordinary + 110, 'discovery accounting changed clearing, road costs, or normal fish earnings');

    expect(await (await showMemories(page, 'today')).count() === 4, 'Today omitted an earned memory');
    await readMemory(page, lang, 'pond-tin', 'today'); await badge(page, 3);
    const saved = await page.evaluate(() => {
      if (!window.__fvSave()) throw Error('save failed');
      return { coins: farm.state().coins, discoveries: farm.state().discoveries };
    });
    await page.goto(URL_); await prepare(page);
    const loaded = await page.evaluate(() => ({ coins: farm.state().coins, discoveries: farm.state().discoveries }));
    expect(loaded.coins === saved.coins && JSON.stringify(loaded.discoveries) === JSON.stringify(saved.discoveries), 'reload changed payment or acknowledged memories');
    await badge(page, 3);
    expect(await (await showMemories(page, 'album')).count() === 4, 'album omitted saved finds');
    await readMemory(page, lang, 'pond-tin', 'album'); await badge(page, 3);
    for (const [i, id] of ['pond-keepsake', 'stone-keepsake', 'street-thanks'].entries()) {
      await readMemory(page, lang, id, 'album'); await badge(page, 2 - i);
    }
    const final = await page.evaluate(() => ({ coins: farm.state().coins, events: window.__discoveryEvents.filter(e => e.type === 'discovery' || e.type === 'coins' && e.source === 'discovery') }));
    expect(final.coins === saved.coins && !final.events.length, 'reading or reloading replayed discovery money');
    expect(!errors.length, errors.join(' | '));
  });

  await check('imported legacy milestones retire without payouts, fake album entries or unread notifications (' + lang + ')', async ctx => {
    const { page, errors } = await open(ctx, lang);
    const legacy = await page.evaluate(() => {
      const s = structuredClone(farm.state());
      s.version = 5; delete s.discoveries; delete s.cond.road_south; delete s.repairing.road_south;
      s.fishing.caught = 12; s.stats.fished = 12; s.stats.cleared = 900; s.album.fish = { perch: 12 };
      s.cells = s.cells.join(''); return JSON.stringify(s);
    });
    await page.evaluate(() => farm.panels.show('settings'));
    page.once('dialog', dialog => dialog.accept());
    const navigated = page.waitForURL(url => !url.search, { timeout: 60000 });
    await page.locator('.settings [data-file]').setInputFiles({ name: 'legacy-farm.json', mimeType: 'application/json', buffer: Buffer.from(legacy) });
    await navigated; await prepare(page);
    const state = await page.evaluate(() => ({ coins: farm.state().coins, discoveries: farm.state().discoveries }));
    expect(state.coins === 500, 'legacy import paid retrospective coins');
    expect(state.discoveries.catches === 10 && state.discoveries.rocks === 0, 'legacy counters used guessed rock history');
    expect(Object.keys(state.discoveries.claimed).length === 0, 'retirement invented earned records');
    expect(['pond-tin', 'pond-keepsake', 'street-thanks'].every(id => state.discoveries.retired.includes(id)), 'passed milestones were not retired');
    await badge(page, 0);
    for (const kind of ['today', 'album']) expect(await (await showMemories(page, kind)).count() === 0, 'legacy ' + kind + ' invented a discovery');
    const refused = await page.evaluate(() => {
      const g = farm.game, before = JSON.stringify(g.s), r = g.do('readDiscovery', { id: 'pond-tin' });
      return !r.ok && before === JSON.stringify(g.s) && !r.events.length;
    });
    expect(refused, 'unearned legacy memory was readable or changed the save');
    await catchOne(page);
    const after = await page.evaluate(() => ({ coins: farm.state().coins, finds: window.__discoveryEvents.filter(e => e.type === 'discovery'),
      ordinary: window.__discoveryEvents.filter(e => e.type === 'barnSold').reduce((n, e) => n + e.coins, 0) }));
    expect(!after.finds.length && after.coins === 500 + after.ordinary, 'catch after migration repaid a retired milestone');
    await badge(page, 0);
    expect(!errors.length, errors.join(' | '));
  });
}
await browser.close();
console.log(failures ? `${failures} discovery browser checks failed` : 'discovery browser checks passed');
process.exitCode = failures ? 1 : 0;
