// Real controls for the optional civic/company branch. Run serially with the other GPU suites.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { canPlace, doorCell, touch } from '../src/core/grid.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { N, RUINS, START_PARCEL, parcelOrigin, PARCEL } from '../src/content/world.mjs';
import { GROWTH, HOSPITAL_MEMORY, BULK_REQUESTS } from '../src/content/village-growth.mjs';
import { pack } from '../src/kit/save.mjs';
import { loadVietnamese, tIn } from '../src/kit/i18n.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-village-growth'); mkdirSync(shots, { recursive: true });
const expect = (ok, message) => { if (!ok) throw Error(message); };
await loadVietnamese();
const tr = tIn;
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0, checks = 0;

function fixture({ civicBuilt = true } = {}) {
  const now = Date.now(), s = newGame(now, 7347, { restore: true }), o = parcelOrigin(START_PARCEL);
  s.level = 15; s.xp = xpFor(15); s.coins = 30000; s.barn.cap = 2000;
  s.barn.items = { herb: 40, ginseng: 20, wheat: 60, egg: 30, carrot: 60, carrot_juice: 40, noodles: 40, instant_noodles: 40, orange_juice: 40 };
  s.projects = { step: 999, delivered: {} }; s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.today.seen = true; s.today.claimed = true; s.stats.ordersFilled = 1;
  s.settings.reducedMotion = true; s.settings.daylight = 'always'; s.cond = {}; s.repairing = {};
  for (let z = o.z; z < o.z + PARCEL; z++) for (let x = o.x; x < o.x + PARCEL; x++) s.cells[z * N + x] = 0;
  for (let x = 30; x < o.x + PARCEL; x++) s.cells[(o.z + 14) * N + x] = 3;
  touch(s);
  for (const kind of ['juice_press', 'noodle_factory']) {
    let spot;
    for (let z = o.z; z < o.z + PARCEL && !spot; z++) for (let x = o.x; x < o.x + PARCEL; x++) {
      if (canPlace(s, kind, x, z, 0).ok) { spot = { kind, x, z, rot: 0 }; break; }
    }
    expect(spot, `no fixture space for ${kind}`);
    s.placed[`fixture-${kind}`] = spot; s.counts[kind] = 1;
    s.production[`fixture-${kind}`] = { slots: 6, queue: [] }; touch(s);
  }
  for (const kind of ['clinic', 'company', 'police']) {
    const site = RUINS.find(r => r.kind === kind), [dx, dz] = doorCell(kind, site.x, site.z, site.rot);
    // Prepared connected entrance; placement itself is always through the visible ghost confirmation.
    if (kind !== 'clinic') s.cells[dz * N + dx] = 3;
    if (kind === 'clinic' || civicBuilt) {
      s.placed[`fixture-${kind}`] = { kind, x: site.x, z: site.z, rot: site.rot }; s.counts[kind] = 1;
    }
  }
  const cottage = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[cottage] = { family: 'tran', arrived: true, arrivesAt: now - 1000, level: 0, rentFrom: now };
  s.orders.cards = []; s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  s.truck = { level: 1, away: false, backAt: 0, load: [], coins: 0, fleet: [] }; touch(s);
  return s;
}
async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    const g = farm.game, now = g.now; clearInterval(g.timer); g.clock = () => now;
    farm.skipIntro(); farm.closeCards(); farm.panels.close();
  });
}
async function run(name, lang, width, fn, options) {
  checks++; let context;
  try {
    context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
    await context.addInitScript(({ lang, save }) => {
      localStorage.setItem('farm-village.language', lang);
      if (!sessionStorage.getItem('growth-seeded')) {
        sessionStorage.setItem('growth-seeded', '1'); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
      }
    }, { lang, save: pack(fixture(options)) });
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL_); await ready(page); await fn(page);
    expect(!errors.length, errors.join('\n')); console.log(`ok   ${name} ${lang} ${width}`);
  } catch (e) { failed++; console.log(`FAIL ${name} ${lang} ${width}\n${e.stack}`); }
  finally { await context?.close(); }
}
const panel = page => page.locator('.panel:not([hidden])');
async function openBoard(page) {
  await page.evaluate(() => { farm.closeCards(); farm.build.close(); farm.panels.show('projects'); });
  await panel(page).locator('[data-do="villageGrowth"]').click();
  await panel(page).locator('.village-growth').waitFor();
}
async function fit(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 2)), 'growth panel overflows');
}
async function shot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.querySelectorAll('.panel:not([hidden]) img')].filter(img => img.getClientRects().length);
    await Promise.all(images.map(img => img.decode()));
    if (images.some(img => !img.complete || !img.naturalWidth)) throw Error('A visible panel image did not load');
  });
  await page.screenshot({ path: join(shots, name) });
}
async function advance(page, ms = 50001) { await page.evaluate(ms => { const g = farm.game, at = g.now + ms; g.clock = () => at; g.tick(); farm.closeCards(); }, ms); }
async function saveReload(page) { await page.evaluate(() => window.__fvSave()); await page.reload(); await ready(page); }

for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  await run('hospital and company work stay explicit, adaptive and readable', lang, width, async page => {
    await page.waitForFunction(() => farm.world.batches.has('clinic:hospital') && farm.world.batches.items.get('fixture-clinic')?.model === 'clinic');
    await openBoard(page); const before = await page.evaluate(() => ({ coins: farm.game.s.coins, herb: farm.game.s.barn.items.herb, ginseng: farm.game.s.barn.items.ginseng }));
    await panel(page).locator('[data-do="upgradeHospital"]').click();
    await page.waitForFunction(() => farm.world.batches.items.get('fixture-clinic')?.model === 'clinic:hospital');
    await page.waitForFunction(() => farm.game.s.growth.read.includes('hospital'));
    expect((await panel(page).innerText()).includes(tr(lang, HOSPITAL_MEMORY.title)), 'hospital story missing');
    expect(await page.evaluate(b => farm.game.s.coins === b.coins - 1800 && farm.game.s.barn.items.herb === b.herb - 6 && farm.game.s.barn.items.ginseng === b.ginseng - 2, before), 'hospital cost wrong');
    await panel(page).locator('[data-do="villageGrowth"]').click();
    await panel(page).locator('[data-do="chooseCompanyBrand"][data-brand="sunshine"]').click();
    expect(await page.evaluate(() => farm.game.s.growth.brand === 'sunshine'), 'brand not chosen');
    await panel(page).locator('.growth-staff summary').click();
    expect(await panel(page).locator('[data-do="hireCompanyStaff"][data-person="bo"]').count() === 0, 'child offered employment');
    expect(await panel(page).locator('[data-do="hireCompanyStaff"][data-person="sam"]').count() === 0, 'unarrived adult offered employment');
    await panel(page).locator('[data-do="hireCompanyStaff"][data-role="worker"][data-person="minh"][data-building="fixture-juice_press"]').click();
    await panel(page).locator('[data-do="hireCompanyStaff"][data-role="manager"][data-person="lan"]').click();
    expect(await panel(page).locator('.growth-staff').evaluate(el => el.open), 'staff detail collapsed after actions');
    await panel(page).locator('.growth-batches summary').click();
    const start = await page.evaluate(() => ({ now: farm.game.now, carrot: farm.game.s.barn.items.carrot, coins: farm.game.s.coins }));
    await panel(page).locator('[data-do="companyBatch"][data-building="fixture-juice_press"][data-recipe="carrot_juice"][data-count="3"]').click();
    const jobs = await page.evaluate(() => farm.game.s.production['fixture-juice_press'].queue);
    expect(jobs.length === 3 && new Set(jobs.map(j => j.slot)).size === 3, 'manager did not use independent real trays');
    expect(jobs.every(j => j.startedAt === start.now && j.doneAt === start.now + 40500), 'worker time benefit wrong');
    expect(await page.evaluate(a => farm.game.s.barn.items.carrot === a.carrot - 12 && farm.game.s.coins === a.coins, start), 'batch inputs or money wrong');
    await page.evaluate(() => farm.panels.render());
    expect(await panel(page).locator('.growth-batches').evaluate(el => el.open), 'batch detail collapsed on timer redraw');
    await page.evaluate(() => { farm.game.do('setting', { key: 'textSize', value: 1.3 }); farm.panels.render(); });
    await fit(page); await shot(page, `company-staff-${lang}-${width}.png`);
    await panel(page).locator('.growth-staff summary').click(); await panel(page).locator('.growth-batches summary').click();
    const delivery = panel(page).locator('[data-do="sendCompanyDelivery"]');
    await delivery.scrollIntoViewIfNeeded(); expect(await delivery.isEnabled(), 'valid delivery blocked');
    const money = await page.evaluate(() => farm.game.s.coins); await delivery.click();
    expect(await page.evaluate(() => farm.game.s.truck.away && farm.game.s.truck.companyDelivery.sequence === 1), 'existing truck not used');
    await saveReload(page); await openBoard(page);
    await page.waitForFunction(() => farm.world.batches.items.get('fixture-clinic')?.model === 'clinic:hospital');
    expect(await panel(page).locator('[data-do="sendCompanyDelivery"]').isDisabled(), 'reload allowed duplicate shipment');
    await advance(page); await openBoard(page);
    await panel(page).locator('[data-do="growthMarket"]').click(); await panel(page).locator('[data-do="collectTruck"]').click();
    expect(await page.evaluate(m => farm.game.s.coins === m + 630, money), 'first payment incorrect or repeated');
    for (const [index, coins] of [[1, 977], [2, 1638]]) {
      await openBoard(page); expect(await panel(page).locator(`[data-do="sendCompanyDelivery"][data-id="${BULK_REQUESTS[index].id}"]`).isEnabled(), 'next request missing');
      await panel(page).locator('[data-do="sendCompanyDelivery"]').click(); await advance(page); await openBoard(page);
      const beforePay = await page.evaluate(() => farm.game.s.coins);
      await panel(page).locator('[data-do="growthMarket"]').click(); await panel(page).locator('[data-do="collectTruck"]').click();
      expect(await page.evaluate(([m, pay]) => farm.game.s.coins === m + pay, [beforePay, coins]), 'next company payment wrong');
    }
    await openBoard(page); expect(await panel(page).locator('[data-do="sendCompanyDelivery"][data-id="pantry"]').isEnabled(), 'three-request cycle did not restart');
    const final = await page.evaluate(() => ({ coins: farm.game.s.coins, memories: Object.keys(farm.game.s.growth.memories).length }));
    expect(final.memories === 3, 'did not keep exactly three earned company memories');
    await panel(page).locator('[data-do="growthMemory"][data-id="pantry"]').click();
    await page.waitForFunction(() => farm.game.s.growth.read.includes('pantry')); await fit(page);
    await shot(page, `company-memory-${lang}-${width}.png`); await saveReload(page);
    expect(await page.evaluate(m => farm.game.s.coins === m, final.coins), 'reloading a memory paid twice');
    if (lang === 'en') {
      await page.waitForFunction(() => farm.world.batches.items.get('fixture-clinic')?.model === 'clinic:hospital');
      for (const span of [24, 40, 70, 90, 140, 220]) {
        const info = await page.evaluate(async span => { farm.view(span, 128, 215); return farm.measure(600); }, span);
        expect(info.draws <= 120 && info.triangles <= 300000, `hospital budget ${width}/${span}: ${JSON.stringify(info)}`);
      }
      await page.evaluate(() => farm.view(32, 128, 215));
      await shot(page, `hospital-world-${width}.png`);
      expect(await page.evaluate(() => {
        farm.game.s.cond['fixture-clinic'] = { level: 2, ms: farm.game.now };
        farm.land.apply([{ type: 'worn', id: 'fixture-clinic' }]);
        return farm.world.batches.items.get('fixture-clinic').model === 'clinic:hospital@2';
      }), 'wear reverted the hospital to the old clinic');
    }
  });
  await run('old civic sites preview without spending and rebuild through real placement controls', lang, width, async page => {
    for (const kind of ['police', 'company']) {
      await openBoard(page); const before = await page.evaluate(() => farm.game.s.coins);
      await panel(page).locator(`[data-do="growthSite"][data-kind="${kind}"]`).click();
      await panel(page).locator(`[data-do="growthBuild"][data-kind="${kind}"]`).waitFor();
      expect(await page.evaluate(m => farm.game.s.coins === m, before), 'site preview spent money');
      // a civic building has one place to stand: the panel's button rebuilds it there outright (no ghost to confirm)
      await fit(page); await panel(page).locator(`[data-do="growthBuild"][data-kind="${kind}"]`).click();
      await page.waitForFunction(kind => (farm.game.s.counts[kind] ?? 0) === 1, kind, { timeout: 5000 }).catch(() => {});
      const site = RUINS.find(r => r.kind === kind);
      expect(await page.evaluate(({ kind, site, before, cost }) => {
        const placed = Object.values(farm.game.s.placed).filter(p => p.kind === kind);
        return placed.length === 1 && placed[0].x === site.x && placed[0].z === site.z && placed[0].rot === site.rot && farm.game.s.coins === before - cost;
      }, { kind, site, before, cost: GROWTH[kind].coins }), 'civic placement did not use exact site/price');
    }
    if (lang === 'en' && width === 390) {
      await page.waitForFunction(() => ['police', 'company'].every(kind => {
        const id = Object.keys(farm.game.s.placed).find(id => farm.game.s.placed[id].kind === kind);
        const item = farm.world.batches.items.get(id);
        return item?.model === kind && !!farm.world.batches.models.get(kind)?.geo;
      }), null, { timeout: 30000 });
      const previous = await page.evaluate(() => {
        farm.panels.close(); farm.closeCards(); farm.build.close(); farm.radial.hide();
        const { x, z, span } = farm.world.cam; return { x, z, span };
      });
      try {
        for (const span of [24, 39.9, 40, 70, 89.9, 90, 220]) {
          const measured = await page.evaluate(async span => {
            farm.view(span, 160, 215); // the rebuilt police/company section of the civic row
            await new Promise(resolve => setTimeout(resolve, 600));
            return farm.measure(400);
          }, span);
          expect(measured.draws <= 120 && measured.triangles <= 300000, `civic phone budget at span ${span}: ${JSON.stringify(measured)}`);
          console.log(`     civic phone span ${span}: ${measured.draws} draws, ${measured.triangles} triangles`);
        }
      } finally { await page.evaluate(p => farm.view(p.span, p.x, p.z), previous); }
    }
    await openBoard(page); await fit(page); await shot(page, `civic-sites-${lang}-${width}.png`);
  }, { civicBuilt: false });
}
await browser.close();
console.log(`${checks - failed}/${checks} village-growth browser checks passed`);
process.exitCode = failed ? 1 : 0;
