// Manual acceptance against a production build or live URL. No game/debug hooks: visible UI, normal autosave,
// isolated profile storage and a persisted Date.now clock are the only browser-side controls.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame, SAVE_VERSION } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { canPlace, doorCell, touch } from '../src/core/grid.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { N, RUINS, START_PARCEL, parcelOrigin, PARCEL } from '../src/content/world.mjs';
import { HOSPITAL_MEMORY, BULK_REQUESTS } from '../src/content/village-growth.mjs';
import { TRUCK } from '../src/content/economy.mjs';
import { SHOP_WAIT_MS } from '../src/content/shops.mjs';
import { pack } from '../src/kit/save.mjs';
import { loadVietnamese, tIn } from '../src/kit/i18n.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-growth-production'); mkdirSync(shots, { recursive: true });
const label = new URL(URL_).hostname.replace(/[^a-zA-Z0-9.-]/g, '-');
const expect = (ok, why) => { if (!ok) throw Error(why); };
await loadVietnamese();
const tr = tIn;

function fixture() {
  const now = Date.now(), s = newGame(now, 98747, { restore: true }), o = parcelOrigin(START_PARCEL);
  s.level = 15; s.xp = xpFor(15); s.coins = 30000; s.barn.cap = 2000;
  s.barn.items = { herb: 40, ginseng: 20, wheat: 60, egg: 30, carrot: 60, carrot_juice: 40, noodles: 40, instant_noodles: 40, orange_juice: 40, bread: 6 };
  s.projects = { step: 999, delivered: {} }; s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.today.seen = true; s.today.claimed = true; s.stats.ordersFilled = 1;
  s.settings.reducedMotion = true; s.settings.daylight = 'always'; s.settings.textSize = 1.3;
  s.cond = {}; s.repairing = {}; s.helpAt = now + 86400000;
  for (let z = o.z; z < o.z + PARCEL; z++) for (let x = o.x; x < o.x + PARCEL; x++) s.cells[z * N + x] = 0;
  for (let x = 30; x < o.x + PARCEL; x++) s.cells[(o.z + 14) * N + x] = 3;
  touch(s);
  for (const kind of ['juice_press', 'noodle_factory']) {
    let spot;
    for (let z = o.z; z < o.z + PARCEL && !spot; z++) for (let x = o.x; x < o.x + PARCEL; x++) {
      if (canPlace(s, kind, x, z, 0).ok) { spot = { kind, x, z, rot: 0 }; break; }
    }
    expect(spot, `fixture has no room for ${kind}`);
    s.placed[`acceptance-${kind}`] = spot; s.counts[kind] = 1;
    s.production[`acceptance-${kind}`] = { slots: 6, queue: [] }; touch(s);
  }
  for (const kind of ['clinic', 'company', 'police']) {
    const site = RUINS.find(r => r.kind === kind), [dx, dz] = doorCell(kind, site.x, site.z, site.rot);
    if (kind !== 'clinic') s.cells[dz * N + dx] = 3;
    s.placed[`acceptance-${kind}`] = { kind, x: site.x, z: site.z, rot: site.rot }; s.counts[kind] = 1;
  }
  const home = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[home] = { family: 'tran', arrived: true, arrivesAt: now - 1000, level: 0, rentFrom: now };
  s.orders.cards = []; s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  s.truck = { level: 1, away: false, backAt: 0, load: [], coins: 0, fleet: [] };
  s.shops.snacks = { serial: 0, nextAt: 0, waitMs: 0, offer: { id: 'snacks:0', good: 'bread', n: 3 } };
  touch(s); return s;
}

const panel = page => page.locator('.panel:not([hidden])');
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
async function waitSaved(page, path, value) {
  await page.waitForFunction(({ path, value }) => {
    const state = JSON.parse(localStorage.getItem('farm-village:save:1'));
    return JSON.stringify(path.reduce((v, key) => v?.[key], state)) === JSON.stringify(value);
  }, { path, value }, { timeout: 20000 });
}
async function enter(page) {
  await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
  await page.locator('.hud [data-act="projects"]').waitFor({ state: 'visible', timeout: 60000 });
  expect(await page.evaluate(() => typeof window.farm === 'undefined'), 'production exposes the test-only farm hook');
}
async function closePanel(page) {
  const close = panel(page).locator('.panel-head [data-do="close"]');
  if (await close.count()) await close.click();
}
async function openBoard(page) {
  await closePanel(page); await page.locator('.hud [data-act="projects"]').click();
  await panel(page).locator('[data-do="villageGrowth"]').click(); await panel(page).locator('.village-growth').waitFor();
}
async function fit(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 2)), '130% text overflows the viewport or panel');
}
async function photo(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visible = [...document.querySelectorAll('.panel:not([hidden]) img')].filter(img => img.getClientRects().length);
    await Promise.all(visible.map(img => img.decode()));
    if (visible.some(img => !img.complete || !img.naturalWidth)) throw Error('A visible panel image did not load');
  });
  await page.screenshot({ path: join(shots, name) });
}
async function advance(page, ms) {
  await page.evaluate(ms => sessionStorage.setItem('growth-acceptance-clock', String(Date.now() + ms)), ms);
  // The production Game interval performs the real tick; its normal debounce writes the result.
}
async function reload(page) { await page.reload(); await enter(page); }

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0;
try {
  for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
    try {
      const initial = fixture(), start = initial.createdAt;
      await context.addInitScript(({ lang, save, now }) => {
        if (!sessionStorage.getItem('growth-acceptance-seeded')) {
          sessionStorage.setItem('growth-acceptance-seeded', '1'); sessionStorage.setItem('growth-acceptance-clock', String(now));
          localStorage.setItem('farm-village.language', lang); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
        }
        Date.now = () => Number(sessionStorage.getItem('growth-acceptance-clock'));
      }, { lang, save: pack(initial), now: start });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', e => { if (e.type() === 'error' && !/favicon/i.test(e.text())) errors.push(e.text()); });
      page.on('response', r => { if (r.status() >= 400 && !/favicon/i.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(URL_); await enter(page); await openBoard(page);

      await panel(page).locator('[data-do="upgradeHospital"]').click();
      await waitSaved(page, ['growth', 'hospitalAt'], start); await waitSaved(page, ['growth', 'read'], ['hospital']);
      expect((await panel(page).innerText()).includes(tr(lang, HOSPITAL_MEMORY.title)), 'localized hospital memory missing');
      let state = await saved(page);
      expect(state.coins === 28200 && state.barn.items.herb === 34 && state.barn.items.ginseng === 18, 'hospital payment/supplies wrong');
      await fit(page); await panel(page).locator('[data-do="villageGrowth"]').click();
      await panel(page).locator('[data-do="chooseCompanyBrand"][data-brand="sunshine"]').click();
      await panel(page).locator('.growth-staff summary').click();
      expect(!await panel(page).locator('[data-do="hireCompanyStaff"][data-person="bo"]').count(), 'child offered a company job');
      expect(!await panel(page).locator('[data-do="hireCompanyStaff"][data-person="sam"]').count(), 'unarrived neighbour offered a company job');
      await panel(page).locator('[data-do="hireCompanyStaff"][data-role="worker"][data-person="minh"][data-building="acceptance-juice_press"]').click();
      await panel(page).locator('[data-do="hireCompanyStaff"][data-role="manager"][data-person="lan"]').click();
      await panel(page).locator('.growth-batches summary').click();
      await panel(page).locator('[data-do="companyBatch"][data-building="acceptance-juice_press"][data-recipe="carrot_juice"][data-count="3"]').click();
      await waitSaved(page, ['production', 'acceptance-juice_press', 'queue', 'length'], 3);
      state = await saved(page); const jobs = state.production['acceptance-juice_press'].queue;
      expect(state.coins === 27900 && state.barn.items.carrot === 48, 'hiring fees or confirmed batch inputs wrong');
      expect(state.growth.brand === 'sunshine' && jobs.every(job => job.startedAt === start && job.doneAt === start + 40500) && new Set(jobs.map(job => job.slot)).size === 3, 'worker/manager did not start three real independent trays');
      expect(await panel(page).locator('.growth-staff').evaluate(el => el.open) && await panel(page).locator('.growth-batches').evaluate(el => el.open), 'details collapsed while normal redraw/autosave ran');
      await fit(page); await photo(page, `${label}-staff-${lang}-${width}.png`);
      await panel(page).locator('.growth-staff summary').click(); await panel(page).locator('.growth-batches summary').click();

      // Three real dispatches use the same owned truck. The first trip is reloaded before returning.
      const payments = [630, 977, 1638];
      for (let index = 0; index < BULK_REQUESTS.length; index++) {
        if (index) await openBoard(page);
        const id = BULK_REQUESTS[index].id, before = await saved(page);
        await panel(page).locator(`[data-do="sendCompanyDelivery"][data-id="${id}"]`).click();
        await waitSaved(page, ['growth', 'sent'], index + 1);
        const departed = await saved(page);
        expect(departed.truck.away && departed.truck.companyDelivery.id === id && departed.truck.companyDelivery.sequence === index + 1 && !departed.truck.fleet.length, 'dispatch invented a truck or lost its sequence');
        expect(departed.coins === before.coins, 'dispatch paid before return');
        for (const [good, n] of Object.entries(BULK_REQUESTS[index].need)) expect((departed.barn.items[good] ?? 0) === (before.barn.items[good] ?? 0) - n, `${good} cargo consumed incorrectly`);
        if (index === 0) {
          await reload(page); await openBoard(page);
          expect(await panel(page).locator('[data-do="sendCompanyDelivery"]').isDisabled(), 'reload allowed duplicate dispatch');
          expect((await saved(page)).growth.sent === 1, 'reload reset the delivery sequence');
        }
        await advance(page, TRUCK.tripMs + 1); await waitSaved(page, ['growth', 'returned'], index + 1);
        const returned = await saved(page);
        expect(returned.truck.coins === payments[index] && returned.coins === before.coins, 'wrong returned quote or automatic wallet payment');
        await panel(page).locator('[data-do="growthMarket"]').click();
        await panel(page).locator('[data-do="collectTruck"]').click(); await waitSaved(page, ['growth', 'settled'], index + 1);
        const collected = await saved(page);
        expect(collected.coins === before.coins + payments[index] && collected.truck.coins === 0 && !collected.truck.companyDelivery, 'collection paid incorrectly or left the old contract attached');
      }
      await openBoard(page);
      expect(await panel(page).locator('[data-do="sendCompanyDelivery"][data-id="pantry"]').isEnabled(), 'the repeatable request loop did not restart');
      await panel(page).locator('[data-do="growthMemory"][data-id="pantry"]').click();
      await waitSaved(page, ['growth', 'read'], ['hospital', 'pantry']);
      expect((await panel(page).innerText()).includes(tr(lang, BULK_REQUESTS[0].memory[0].text)), 'company story does not match the selected language');
      await fit(page); await photo(page, `${label}-memory-${lang}-${width}.png`);
      const completedMoney = (await saved(page)).coins;
      await reload(page); await openBoard(page);
      expect((await saved(page)).coins === completedMoney && Object.keys((await saved(page)).growth.memories).length === 3, 'reload paid again or duplicated memories');
      expect(!await panel(page).locator('[data-do="upgradeHospital"]').count(), 'hospital upgrade became payable again');
      await panel(page).locator('[data-do="growthMemory"][data-id="hospital"]').click(); await fit(page);

      // Existing decorative kiosks expose the new buying UI in the production build too.
      await closePanel(page); await page.locator('.hud [data-act="today"]').click(); await panel(page).locator('[data-do="shops"]').click();
      const snack = panel(page).locator('.shop-card[data-shop="snacks"]');
      expect((await panel(page).innerText()).includes(tr(lang, 'Village shops')), 'localized shops panel missing');
      await snack.locator('[data-do="sellToShop"][data-offer="snacks:0"]').click();
      await waitSaved(page, ['shops', 'snacks', 'serial'], 1);
      const sold = await saved(page), virtualNow = await page.evaluate(() => Date.now());
      expect(sold.coins === completedMoney + 51 && sold.barn.items.bread === 3 && sold.shops.snacks.nextAt === virtualNow + SHOP_WAIT_MS, 'shop payment/stock/wait incorrect');
      expect(!await snack.locator('[data-do="sellToShop"]').count(), 'sold basket stayed actionable');
      await fit(page); await reload(page);
      const final = await saved(page);
      expect(final.version === SAVE_VERSION && final.coins === sold.coins && final.shops.snacks.serial === 1 && final.growth.settled === 3, 'production save changed after final reload');
      expect(await page.evaluate(() => !localStorage.getItem('farm-village:save:2') && !localStorage.getItem('farm-village:save:3')), 'acceptance wrote another profile');
      expect(!errors.length, errors.join('\n'));
      console.log(`ok   production growth, staff, fleet and shops ${lang} ${width}`);
    } catch (error) { failures++; console.log(`FAIL production growth ${lang} ${width}\n${error.stack}`); }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(`${4 - failures}/4 production growth acceptance contexts passed (${URL_})`);
process.exitCode = failures ? 1 : 0;
