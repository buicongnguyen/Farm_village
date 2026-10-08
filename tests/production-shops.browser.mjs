// Real production/shop controls, save compatibility and physical customer locations in both languages and sizes.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { canPlace, touch } from '../src/core/grid.mjs';
import { stepIndex } from '../src/core/projects.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { N, START_PARCEL, parcelOrigin, PARCEL } from '../src/content/world.mjs';
import { SHOP_SITES, SHOP_WAIT_MS, SHOP_SKIP_MS } from '../src/content/shops.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-production-shops'); mkdirSync(shots, { recursive: true });
const expect = (ok, message) => { if (!ok) throw Error(message); };
const tr = (lang, en) => lang === 'vi' ? VI[en] ?? en : en;
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0, checked = 0;

function fixture(legacy = false) {
  const now = Date.now(), s = newGame(now, 81817, { restore: true }), o = parcelOrigin(START_PARCEL);
  s.level = 9; s.xp = xpFor(9); s.coins = 5000; s.barn.cap = 300;
  s.barn.items = { wheat: 30, carrot: 24, egg: 8, noodles: 6, bread: 7, perch: 4 };
  s.projects = { step: 999, delivered: {} };
  s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.today.seen = true; s.today.claimed = true; s.stats.ordersFilled = 1;
  s.settings.reducedMotion = true; s.settings.daylight = 'always';
  // Leave the cottages broken: the shop test will use a real incomplete cottage2 bread reservation.
  const bakery = Object.keys(s.placed).find(id => s.placed[id].kind === 'bakery');
  delete s.cond[bakery];
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
    s.production[id] = { slots: 2, queue: [] }; touch(s);
  }
  s.orders.cards = [{ id: 'kept-order', from: 'ada', need: { wheat: 6 }, coins: 16, xp: 1, readyAt: now }];
  s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  s.shops = Object.fromEntries([['fish', 'perch', 1], ['snacks', 'bread', 3], ['flowers', 'herb', 2], ['plaza', 'carrot', 4]]
    .map(([id, good, n]) => [id, { serial: 0, nextAt: 0, waitMs: 0, offer: { id: `${id}:0`, good, n } }]));
  if (legacy) {
    s.version = 9;
    s.production['fixture-noodle_factory'].queue = [
      { recipe: 'instant_noodles', doneAt: now + 120000 },
      { recipe: 'noodles', doneAt: now + 180000 },
    ];
  }
  return s;
}

async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    const g = farm.game; clearInterval(g.timer); g.clock = () => Date.now();
    farm.skipIntro(); farm.closeCards(); farm.panels.close();
  });
}
async function run(name, lang, width, fn, legacy = false) {
  let context; checked++;
  try {
    context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
    const s = fixture(legacy);
    await context.addInitScript(({ lang, save, now }) => {
      localStorage.setItem('farm-village.language', lang);
      if (!sessionStorage.getItem('production-shops-seeded')) {
        sessionStorage.setItem('production-shops-seeded', '1');
        sessionStorage.setItem('production-shops-clock', String(now));
        localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
      }
      // Persist the same virtual clock across reloads, including the boot tick before the debug hook exists.
      Date.now = () => Number(sessionStorage.getItem('production-shops-clock'));
    }, { lang, save: pack(s), now: s.createdAt });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(URL_); await ready(page); await fn(page, s.createdAt);
    expect(!errors.length, errors.join('\n'));
    console.log(`ok   ${name} ${lang} ${width}`);
  } catch (error) { failed++; console.log(`FAIL ${name} ${lang} ${width}\n${error.stack}`); }
  finally { await context?.close(); }
}
const panel = page => page.locator('.panel:not([hidden])');
const factory = 'fixture-noodle_factory';
const shopCard = (page, id) => panel(page).locator(`.shop-card[data-shop="${id}"]`);
async function fit(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 2)), 'panel overflows screen');
}
async function photo(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.panel:not([hidden]) img')].map(img => img.decode().catch(() => {})));
  });
  await page.screenshot({ path: join(shots, name) });
}
async function advance(page, ms) {
  await page.evaluate(ms => {
    sessionStorage.setItem('production-shops-clock', String(Date.now() + ms));
    farm.game.tick(); farm.closeCards();
  }, ms);
}
async function saveReload(page) {
  await page.evaluate(() => window.__fvSave()); await page.reload(); await ready(page);
}
async function economy(page) {
  return page.evaluate(() => JSON.stringify({ coins: farm.game.s.coins, barn: farm.game.s.barn,
    production: farm.game.s.production, shops: farm.game.s.shops, projects: farm.game.s.projects }));
}
async function jobs(page) {
  return page.evaluate(id => farm.game.s.production[id], factory);
}
async function produce(page, recipe) {
  await panel(page).locator(`[data-do="produce"][data-recipe="${recipe}"]`).click();
}
async function tapShop(page, site, width) {
  await page.waitForFunction(id => {
    const item = farm.world.batches.items.get(id);
    return !!(item && farm.world.batches.models.get(item.model)?.geo.boundingBox);
  }, site.id);
  const box = await page.evaluate(site => {
    farm.panels.close(); farm.closeCards(); farm.radial.hide();
    farm.focus(site.x - .5, site.z - .5, 30);
    const world = farm.world, camera = world.cam.camera, rect = world.renderer.domElement.getBoundingClientRect();
    camera.updateMatrixWorld();
    const item = world.batches.items.get(site.id), bounds = world.batches.models.get(item.model).geo.boundingBox;
    const matrix = camera.matrixWorld.clone(); world.batches.compose(item, 'static', matrix);
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const point = bounds.min.clone().set(x, y, z).applyMatrix4(matrix).project(camera);
      const px = rect.left + (point.x + 1) * rect.width / 2, py = rect.top + (1 - point.y) * rect.height / 2;
      left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
    }
    return { x: (left + right) / 2, y: (top + bottom) / 2, left, right, top, bottom };
  }, site);
  expect(box.x > 0 && box.x < width && box.y > 0 && box.y < 844, 'shop model is outside viewport: ' + JSON.stringify(box));
  const before = await economy(page);
  if (width < 500) await page.touchscreen.tap(box.x, box.y); else await page.mouse.click(box.x, box.y);
  await page.waitForSelector('.panel[data-kind="shops"]:not([hidden])');
  expect(await panel(page).locator('.shop-card').first().getAttribute('data-shop') === site.shop, `physical tap selected wrong shop: ${site.id}`);
  expect(await economy(page) === before, 'world shop tap spent money or goods');
}

try {
for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  await run('parallel trays collect independently and keep purchased capacity after reload', lang, width, async (page, start) => {
    await page.evaluate(id => farm.panels.show('production', id), factory);
    expect((await panel(page).innerText()).includes(tr(lang, 'Each tray starts its own batch immediately. Finished goods wait here until collected.')), 'missing localized tray explanation');
    await produce(page, 'instant_noodles'); await produce(page, 'noodles');
    const first = (await jobs(page)).queue;
    expect(first.length === 2 && first.every(job => job.startedAt === start), 'second tray waited behind first batch');
    expect(first.find(job => job.recipe === 'instant_noodles').doneAt === start + 120000 && first.find(job => job.recipe === 'noodles').doneAt === start + 60000, 'wrong independent batch deadlines');
    expect(await panel(page).locator('.slot[data-tray]').count() === 2, 'wrong visible tray count');
    await advance(page, 60000);
    await panel(page).locator('.slot.ready').first().waitFor({ state: 'visible' });
    expect(await panel(page).locator('.slot.ready').count() === 1, 'short batch is not independently ready');
    await panel(page).locator('[data-do="collectProducts"]').click();
    expect((await jobs(page)).queue.length === 1 && (await jobs(page)).queue[0].recipe === 'instant_noodles', 'collecting short batch removed busy batch');
    expect(await page.evaluate(() => farm.game.s.barn.items.noodles) === 6, 'short batch yield was not collected exactly once');
    const coins = await page.evaluate(() => farm.game.s.coins);
    await panel(page).locator('[data-do="buySlot"]').click();
    expect((await jobs(page)).slots === 3 && await page.evaluate(() => farm.game.s.coins) === coins - 60, 'third tray charge/capacity mismatch');
    await produce(page, 'noodles'); await produce(page, 'noodles');
    const saved = JSON.stringify(await jobs(page)), before = await economy(page);
    await fit(page); await photo(page, `parallel-${lang}-${width}.png`);
    await saveReload(page);
    expect(JSON.stringify(await jobs(page)) === saved && await economy(page) === before, 'reload changed jobs, bought trays or economy');
    await page.evaluate(id => farm.panels.show('production', id), factory);
    await advance(page, 60000);
    await panel(page).locator('.slot.ready').nth(2).waitFor({ state: 'visible' });
    expect(await panel(page).locator('.slot.ready').count() === 3, 'three independently running batches did not finish together');
    await panel(page).locator('[data-do="collectProducts"]').click();
    expect(!(await jobs(page)).queue.length && await page.evaluate(() => farm.game.s.barn.items.noodles === 10 && farm.game.s.barn.items.instant_noodles === 1), 'wrong final batch output');
    expect(await panel(page).locator('[data-do="collectProducts"]').count() === 0, 'collection stayed available after all outputs were taken');
    await fit(page);
  });

  await run('old serial batches retain their schedule beside a new parallel tray', lang, width, async (page, start) => {
    await page.evaluate(id => farm.panels.show('production', id), factory);
    const old = (await jobs(page)).queue;
    expect(await page.evaluate(() => farm.game.s.version) === 10, 'old save was not migrated');
    expect(old[0].doneAt === start + 120000 && old[1].doneAt === start + 180000 && old[1].startedAt === start + 120000, 'migration changed legacy serial timing');
    expect((await panel(page).innerText()).includes(tr(lang, 'Earlier saved batches keep their original schedule. New batches start immediately.')), 'legacy schedule explanation missing');
    expect((await panel(page).locator('[data-tray="1"]').innerText()).includes(tr(lang, 'Starts in {time}').replace('{time}', '2m 00s')), 'future legacy tray does not show when it starts');
    await panel(page).locator('[data-do="buySlot"]').click(); await produce(page, 'noodles');
    const added = (await jobs(page)).queue.find(job => job.slot === 2);
    expect(added.startedAt === start && added.doneAt === start + 60000, 'new work waited behind saved serial reservations');
    await advance(page, 60000); await panel(page).locator('[data-do="collectProducts"]').click();
    expect(JSON.stringify((await jobs(page)).queue) === JSON.stringify(old), 'collecting new tray rewrote old batches');
    const before = await economy(page); await saveReload(page);
    expect(await economy(page) === before, 'legacy queue changed across a second reload');
    await page.evaluate(id => farm.panels.show('production', id), factory);
    await advance(page, 60000); await panel(page).locator('[data-do="collectProducts"]').click();
    expect((await jobs(page)).queue.length === 1 && (await jobs(page)).queue[0].doneAt === start + 180000, 'old short batch completed before its saved reservation');
    await advance(page, 60000); await panel(page).locator('[data-do="collectProducts"]').click();
    expect(!(await jobs(page)).queue.length, 'last legacy batch could not be collected');
    await fit(page);
  }, true);

  await run('shops guide, preserve held bread, pay once and open from real world models', lang, width, async page => {
    await page.evaluate(step => { farm.game.s.projects = { step, delivered: {} }; }, stepIndex('cottage2'));
    await page.click('[data-act="today"]');
    await panel(page).locator('[data-do="shops"]').click();
    expect((await panel(page).innerText()).includes(tr(lang, 'Village shops')), 'Today did not open localized shops');
    expect((await shopCard(page, 'snacks').innerText()).includes('2/3'), 'preview includes bread held for the cottage');
    expect(await shopCard(page, 'snacks').locator('[data-do="sellToShop"]').isDisabled(), 'shop can sell reserved bread');
    const beforeHelp = await economy(page);
    await shopCard(page, 'snacks').locator('[data-do="goodHelp"]').click();
    expect((await panel(page).innerText()).includes(tr(lang, 'Where to get it')), 'missing localized ingredient guidance');
    await panel(page).locator('[data-do="goodHelpSource"]').click();
    expect(await page.evaluate(() => farm.panels.open.kind === 'production' && farm.game.s.placed[farm.panels.open.arg].kind === 'bakery'), 'bread source did not open the actual bakery');
    await panel(page).locator('[data-do="goodHelpReturn"]').click();
    expect(await shopCard(page, 'snacks').isVisible(), 'ingredient guidance lost original shop');
    expect(await economy(page) === beforeHelp, 'ingredient preview made, spent or sold goods');
    // Supply just one missing loaf: three may be sold; five remain reserved for the village project.
    await page.evaluate(() => { farm.game.s.barn.items.bread++; farm.panels.render(); });
    const quote = shopCard(page, 'snacks').locator('[data-do="sellToShop"]');
    expect((await quote.innerText()).includes('51'), 'shop quote is not 3 × ceil(12 × 1.35)');
    const beforeSale = await page.evaluate(() => ({ coins: farm.game.s.coins, offer: farm.game.s.shops.snacks.offer.id, now: farm.game.now }));
    await quote.click();
    const afterSale = await page.evaluate(() => ({ coins: farm.game.s.coins, bread: farm.game.s.barn.items.bread, nextAt: farm.game.s.shops.snacks.nextAt }));
    expect(afterSale.coins === beforeSale.coins + 51 && afterSale.bread === 5 && afterSale.nextAt === beforeSale.now + SHOP_WAIT_MS, 'sale did not preserve held bread or exact payment/cooldown');
    expect(!await shopCard(page, 'snacks').locator('[data-do="sellToShop"]').count(), 'sold request remained actionable');
    const beforeSwap = await page.evaluate(() => ({ coins: farm.game.s.coins, stock: JSON.stringify(farm.game.s.barn.items), now: farm.game.now }));
    await shopCard(page, 'plaza').locator('[data-do="changeShopRequest"]').click();
    expect(await page.evaluate(({ coins, stock, now, wait }) => farm.game.s.coins === coins && JSON.stringify(farm.game.s.barn.items) === stock && farm.game.s.shops.plaza.nextAt === now + wait, { ...beforeSwap, wait: SHOP_SKIP_MS }), 'free replacement charged goods/money or used wrong wait');
    const saved = await economy(page); await saveReload(page);
    expect(await economy(page) === saved, 'shop reload paid or reset pending requests');
    const replay = await page.evaluate(offer => farm.game.do('sellToShop', { shop: 'snacks', offer }).ok, beforeSale.offer);
    expect(!replay && await economy(page) === saved, 'old shop click paid twice after reload');
    await page.click('[data-act="today"]'); await panel(page).locator('[data-do="shops"]').click();
    expect((await shopCard(page, 'snacks').innerText()).includes('15m 00s'), 'sale cooldown is not visible after reload');
    expect((await shopCard(page, 'plaza').innerText()).includes('5m 00s'), 'replacement cooldown is not visible after reload');
    await advance(page, SHOP_SKIP_MS);
    await shopCard(page, 'plaza').locator('[data-do="changeShopRequest"]').waitFor({ state: 'visible' });
    expect(await shopCard(page, 'plaza').locator('[data-do="changeShopRequest"]').count() === 1, 'free replacement did not make a new request after five minutes');
    expect(!await shopCard(page, 'snacks').locator('[data-do="sellToShop"]').count(), 'sale request refilled before its fifteen-minute wait');
    await fit(page); await photo(page, `shops-${lang}-${width}.png`);
    for (const id of ['lake-shop1', 'plaza-stall1']) await tapShop(page, SHOP_SITES.find(site => site.id === id), width);
    await fit(page);
  });
}
} finally { await browser.close(); }
console.log(`${checked - failed}/${checked} production/shop browser checks passed`);
process.exitCode = failed ? 1 : 0;
