// Optional branches and ingredient navigation through real controls in both languages and screen sizes.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { canPlace, touch } from '../src/core/grid.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { N, START_PARCEL, parcelOrigin, PARCEL } from '../src/content/world.mjs';
import { CONTRACTS } from '../src/content/contracts.mjs';
import { pack } from '../src/kit/save.mjs';
import { loadVietnamese, tIn } from '../src/kit/i18n.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-next'); mkdirSync(shots, { recursive: true });
const expect = (ok, message) => { if (!ok) throw Error(message); };
await loadVietnamese();
const tr = tIn;
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;

function fixture() {
  const now = Date.now(), s = newGame(now, 81817, { restore: true }), o = parcelOrigin(START_PARCEL);
  s.level = 9; s.xp = xpFor(9); s.coins = 5000; s.barn.cap = 300;
  s.barn.items = { wheat: 30, carrot: 24, egg: 8 };
  s.projects = { step: 999, delivered: {} };
  s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.today.seen = true; s.today.claimed = true;
  s.stats.ordersFilled = 1; s.settings.reducedMotion = true; s.settings.daylight = 'always';
  s.cond = {}; s.repairing = {};
  for (let z = o.z; z < o.z + PARCEL; z++) for (let x = o.x; x < o.x + PARCEL; x++) s.cells[z * N + x] = 0;
  for (let x = 30; x < o.x + PARCEL; x++) s.cells[(o.z + 14) * N + x] = 3;
  touch(s);
  for (const kind of ['juice_press', 'noodle_factory']) {
    let spot;
    for (let z = o.z; z < o.z + PARCEL && !spot; z++) for (let x = o.x; x < o.x + PARCEL; x++) {
      if (canPlace(s, kind, x, z, 0).ok) { spot = { kind, x, z, rot: 0 }; break; }
    }
    if (!spot) throw Error('fixture has no factory site');
    const id = `fixture-${kind}`; s.placed[id] = spot; s.counts[kind] = 1;
    s.production[id] = { slots: 3, queue: [] }; touch(s);
  }
  const cottage = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[cottage] = { family: 'tran', arrived: true, arrivesAt: now - 1000, level: 0, rentFrom: now };
  const coop = Object.keys(s.placed).find(id => s.placed[id].kind === 'coop');
  s.animals[coop] = [{ kind: 'hen', doneAt: null }];
  s.orders.cards = [{ id: 'help-order', from: 'lan', need: { instant_noodles: 2 }, coins: 250, xp: 1, line: CONTRACTS[2].line, readyAt: now }];
  s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  return s;
}
async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    const g = farm.game, now = g.now; clearInterval(g.timer); g.clock = () => now;
    farm.skipIntro(); farm.closeCards(); farm.panels.close();
  });
}
async function run(name, lang, width, fn) {
  let context;
  try {
    context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
    await context.addInitScript(({ lang, save }) => {
      localStorage.setItem('farm-village.language', lang);
      if (!sessionStorage.getItem('next-seeded')) {
        sessionStorage.setItem('next-seeded', '1'); localStorage.setItem('farm-village:profile', '1');
        localStorage.setItem('farm-village:save:1', save);
      }
    }, { lang, save: pack(fixture()) });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL_); await ready(page);
    await fn(page);
    expect(!errors.length, errors.join('\n'));
    console.log(`ok   ${name} ${lang} ${width}`);
  } catch (error) { failed++; console.log(`FAIL ${name} ${lang} ${width}\n${error.stack}`); }
  finally { await context?.close(); }
}
const panel = page => page.locator('.panel:not([hidden])');
async function fit(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 2)), 'panel overflows the screen');
}
async function photo(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.panel:not([hidden]) img, .modal img')].map(img => img.decode().catch(() => {})));
  });
  await page.screenshot({ path: join(shots, name) });
}
async function snapshot(page) { return page.evaluate(() => JSON.stringify({ coins: farm.game.s.coins, barn: farm.game.s.barn, production: farm.game.s.production, parcels: farm.game.s.parcels, contracts: farm.game.s.contracts })); }
async function advance(page, ms) { await page.evaluate(ms => { const g = farm.game, at = g.now + ms; g.clock = () => at; g.tick(); farm.closeCards(); }, ms); }
async function cook(page, building, recipe, count) {
  await page.evaluate(building => farm.panels.show('production', `fixture-${building}`), building);
  for (let i = 0; i < count; i++) await panel(page).locator(`[data-do="produce"][data-recipe="${recipe}"]`).click();
  await advance(page, 600000);
  await panel(page).locator('[data-do="collectProducts"]').click();
}

for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  await run('ingredient sources preserve order and never spend', lang, width, async page => {
    await page.click('[data-act="orders"]');
    const before = await snapshot(page);
    await panel(page).locator('[data-order-id="help-order"] .needs [data-do="goodHelp"]').click();
    expect((await panel(page).innerText()).includes(tr(lang, 'Where to get it')), 'missing ingredient explanation');
    await fit(page); await photo(page, `ingredient-${lang}-${width}.png`);
    await panel(page).locator('[data-do="goodHelp"][data-good="noodles"]').first().click();
    await panel(page).locator('[data-do="goodHelpSource"]').click();
    expect(await page.evaluate(() => farm.panels.open.arg === 'fixture-noodle_factory'), 'source must be the exact maker');
    await panel(page).locator('[data-do="goodHelpReturn"]').click();
    expect(await panel(page).locator('[data-order-id="help-order"]').isVisible(), 'lost original order');
    expect(await snapshot(page) === before, 'help navigation changed goods, money, queues or ownership');
    await panel(page).locator('[data-order-id="help-order"] .needs [data-do="goodHelp"]').click();
    await panel(page).locator('[data-do="goodHelp"][data-good="carrot"]').first().click();
    await panel(page).locator('[data-do="goodHelpSource"]').click();
    expect(await page.locator('.help-return').isVisible(), 'world source needs a return control');
    await page.locator('.help-return').click();
    expect(await snapshot(page) === before, 'bed preview planted or harvested');
    await fit(page);
    await photo(page, `help-${lang}-${width}.png`);
  });
  await run('covered land is usable, reveals once and survives reload', lang, width, async page => {
    await page.click('[data-act="today"]');
    await panel(page).locator('[data-do="landVisit"]').first().click();
    const before = await page.evaluate(() => ({ coins: farm.game.s.coins, bench: farm.game.s.stored.bench ?? 0 }));
    expect((await panel(page).innerText()).includes('500'), 'purchase price missing');
    expect(!await page.evaluate(() => farm.world.landDiscovery.site), 'hidden unowned clue leaked');
    await panel(page).locator('[data-do="landBuy"]').click();
    const purchased = await page.evaluate(() => {
      const s = farm.game.s, site = farm.world.landDiscovery.site;
      return { coins: s.coins, parcels: s.parcels, site, covered: farm.world.batches.items.has('land-clue:cover'), patch: Array.from({ length: 16 }, (_, n) => s.cells[(57 + Math.floor(n / 4)) * 128 + 49 + n % 4]) };
    });
    expect(purchased.coins === before.coins - 500 && purchased.parcels.includes('1,2'), 'wrong purchase charge/ownership');
    expect(purchased.patch.every(v => v === 0) && purchased.site && purchased.covered, 'missing clear ground or local cover');
    await panel(page).locator('[data-do="close"]').click();
    const point = await page.evaluate(() => { const p = farm.world.landDiscovery.site; farm.focus(p.x, p.z, 32); return farm.cellToScreen(p.x, p.z); });
    await page.mouse.click(point.x, point.y);
    await page.waitForSelector('.panel[data-kind="land"]:not([hidden])');
    await panel(page).locator('[data-do="inspectLandDiscovery"]').click();
    await page.waitForSelector('.modal');
    await fit(page);
    await photo(page, `land-${lang}-${width}.png`);
    await page.evaluate(() => { farm.closeCards(); window.__fvSave(); });
    await page.reload(); await ready(page);
    const after = await page.evaluate(() => ({ coins: farm.game.s.coins, bench: farm.game.s.stored.bench, found: farm.game.s.landDiscovery.discoveredAt, cover: farm.world.batches.items.has('land-clue:cover'), repeat: farm.game.do('inspectLandDiscovery', { parcel: '1,2' }).ok }));
    expect(after.coins === purchased.coins && after.bench === before.bench + 1 && after.found !== null && !after.cover && !after.repeat, 'discovery did not survive once-only');
  });
  await run('connected food requests use actual batches and retain memories', lang, width, async page => {
    await page.click('[data-act="orders"]'); await panel(page).locator('[data-do="contracts"]').click();
    await panel(page).locator('.contract-future summary').click();
    await page.evaluate(() => farm.panels.render());
    expect(await panel(page).locator('.contract-future').evaluate(el => el.open), 'future batch preview collapsed on redraw');
    const before = await page.evaluate(() => ({ coins: farm.game.s.coins, orders: farm.game.s.stats.ordersFilled }));
    await panel(page).locator('[data-do="acceptContract"]').click();
    await cook(page, 'juice_press', 'carrot_juice', 2);
    await page.evaluate(() => farm.panels.show('contracts'));
    await panel(page).locator('[data-do="deliverContract"]').click();
    expect((await panel(page).innerText()).includes(tr(lang, CONTRACTS[0].memory.title)), 'missing first earned scene');
    await page.evaluate(() => farm.panels.show('contracts'));
    await panel(page).locator('[data-do="acceptContract"]').click();
    await cook(page, 'noodle_factory', 'noodles', 2);
    await page.evaluate(() => farm.panels.show('contracts'));
    await panel(page).locator('[data-do="deliverContract"]').click();
    await page.evaluate(() => farm.panels.show('contracts'));
    await panel(page).locator('[data-do="acceptContract"]').click();
    await cook(page, 'noodle_factory', 'noodles', 2);
    await cook(page, 'noodle_factory', 'instant_noodles', 2);
    await cook(page, 'juice_press', 'carrot_juice', 2);
    await page.evaluate(() => farm.panels.show('contracts'));
    await panel(page).locator('[data-do="deliverContract"]').click();
    await fit(page); await photo(page, `picnic-${lang}-${width}.png`);
    expect((await panel(page).innerText()).includes(tr(lang, CONTRACTS[2].memory.title)), 'missing picnic payoff');
    const final = await page.evaluate(() => ({ coins: farm.game.s.coins, count: Object.keys(farm.game.s.contracts.completed).length, orders: farm.game.s.stats.ordersFilled }));
    expect(final.coins === before.coins + 520 && final.count === 3 && final.orders === before.orders, 'request accounting changed normal orders or paid incorrectly');
    await page.evaluate(() => window.__fvSave()); await page.reload(); await ready(page);
    await page.evaluate(() => farm.panels.show('album'));
    await panel(page).locator('[data-do="contractMemory"]').last().click();
    const replay = await page.evaluate(() => ({ coins: farm.game.s.coins, ok: farm.game.do('deliverContract', { id: 'picnic-packets' }).ok }));
    expect(replay.coins === final.coins && !replay.ok, 'memory replay/reload paid twice');
  });
}
await run('unrelated sheet suppresses tutorial pointer and incidental speech', 'en', 390, async page => {
  await page.evaluate(() => { farm.game.s.story.tutorial = 0; farm.game.s.stats.harvested = 0; farm.game.do('setting', { key: 'music', value: 0 }); });
  await page.waitForSelector('.guide:not([hidden])');
  await page.evaluate(() => { const pip = farm.people.walkers.get('pip'); if (pip) farm.people.say(pip, 'Visible test bubble'); farm.panels.show('barn'); });
  await page.waitForFunction(() => document.querySelector('.guide').hidden && document.querySelector('.pointer').hidden && document.querySelector('.bubbles').hidden);
  await page.evaluate(() => farm.panels.close());
  await page.waitForSelector('.guide:not([hidden])');
});
for (const lang of ['en', 'vi']) await run('legacy finished goods are reachable before recipe level', lang, 390, async page => {
  await page.evaluate(() => {
    const s = farm.game.s; s.level = 3; s.barn.items.carrot_juice = 2;
    farm.game.do('setting', { key: 'textSize', value: 1.3 }); farm.panels.show('orders');
  });
  await panel(page).locator('[data-do="contracts"]').click();
  await panel(page).locator('[data-do="acceptContract"]').click();
  await panel(page).locator('[data-do="deliverContract"]').click();
  await fit(page);
  expect((await panel(page).innerText()).includes(tr(lang, CONTRACTS[0].memory.title)), 'legacy goods could not reach the first memory');
});
await browser.close();
console.log(`${15 - failed}/15 guidance/land/contracts browser checks passed`);
process.exitCode = failed ? 1 : 0;
