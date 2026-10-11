// Run manually against a production build or deployed URL. Only isolated browser storage; no test hook needed.
import { chromium } from 'playwright';
import { newGame, SAVE_VERSION } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const expect = (ok, why) => { if (!ok) throw Error(why); };
function fixture() {
  const now = Date.now(), s = newGame(now, 81917, { restore: true });
  s.level = 9; s.xp = xpFor(9); s.coins = 5000;
  s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.stats.ordersFilled = 1; s.today.seen = true; s.today.claimed = true;
  s.settings.reducedMotion = true; s.settings.daylight = 'always';
  s.barn.items = { carrot_juice: 2 }; s.projects = { step: 999, delivered: {} };
  const cottage = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[cottage] = { family: 'tran', arrived: true, arrivesAt: now - 1000, rentFrom: now, level: 0 };
  s.orders.cards = [{ id: 'production-help', from: 'ada', need: { bread: 3 }, coins: 50, xp: 1, readyAt: now }];
  s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  return s;
}
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0;
for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  try {
    await context.addInitScript(({ lang, save }) => {
      if (sessionStorage.getItem('optional-seeded')) return;
      sessionStorage.setItem('optional-seeded', '1');
      localStorage.setItem('farm-village.language', lang); localStorage.setItem('farm-village:profile', '1');
      localStorage.setItem('farm-village:save:1', save);
    }, { lang, save: pack(fixture()) });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const enter = async () => {
      await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
      await page.waitForSelector('.hud [data-act="orders"]', { timeout: 60000 });
      expect(await page.evaluate(() => !window.farm), 'production exposes a debug hook');
    };
    await page.goto(URL_); await enter();
    await page.click('[data-act="orders"]');
    await page.locator('.panel .needs [data-do="goodHelp"]').click();
    expect((await page.locator('.good-help').innerText()).includes(lang === 'vi' ? VI['Where to get it'] : 'Where to get it'), 'ingredient help absent');
    await page.locator('[data-do="goodHelpSource"]').click();
    await page.locator('.help-return').click();
    await page.locator('[data-do="contracts"]').click();
    await page.locator('[data-do="acceptContract"]').click();
    await page.locator('[data-do="deliverContract"]').click();
    await page.waitForSelector('.contract-memory-detail');
    await page.locator('.panel-head [data-do="close"]').click();
    await page.click('[data-act="today"]');
    await page.locator('[data-do="landVisit"]').first().click();
    await page.locator('[data-do="landBuy"]').click();
    await page.locator('[data-do="inspectLandDiscovery"]').click();
    await page.waitForSelector('.modal');
    await page.locator('.modal [data-close]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'production viewport overflow');
    await page.evaluate(() => window.__fvSave());
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
    expect(saved.version === SAVE_VERSION && saved.coins === 4570 && saved.stored.bench === 1 && saved.contracts.completed['picnic-drinks'] != null && saved.landDiscovery.discoveredAt != null, 'production accounting/save mismatch');
    await page.reload(); await enter();
    await page.click('[data-act="today"]'); await page.locator('[data-do="landVisit"]').first().click();
    expect(await page.locator('[data-do="inspectLandDiscovery"]').count() === 0, 'land reward reappeared after reload');
    await page.locator('[data-do="landMemory"]').click(); await page.locator('.modal [data-close]').click();
    await page.evaluate(() => window.__fvSave());
    const replay = await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
    expect(replay.coins === 4570 && replay.stored.bench === 1, 'replay paid another reward');
    expect(!errors.length, errors.join('\n'));
    console.log(`ok   production optional branches ${lang} ${width}`);
  } catch (error) { failures++; console.log(`FAIL production ${lang} ${width}\n${error.stack}`); }
  finally { await context.close(); }
}
await browser.close(); process.exitCode = failures ? 1 : 0;
