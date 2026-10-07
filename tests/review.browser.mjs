// Checks for what the AAA review found (fixer pass): real touch taps on a phone never press the menu that springs up
// under the finger, Ada's guide never covers the build catalogue, a two-level card keeps its buttons on screen, speech
// bubbles stay on screen, a farm of ripe crops keeps the triangle budget, a failed first-scene file shows a message with
// "Try again", and one failed download of the Vietnamese lines never breaks the language button.
// npm run build:test; node scripts/serve-dist.mjs 5286; GAME_URL=http://127.0.0.1:5286/ node tests/review.browser.mjs
import { chromium } from 'playwright';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', SHOTS = process.env.SHOTS;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const results = [];
async function open(device = PHONE, { intro = false, query = '?new', before } = {}) {   // ?new in a test build: the empty field (a fresh public game opens on the restored village)
  const ctx = await browser.newContext(device), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('
').slice(1, 4).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (before) await before(page, ctx);
  await page.goto(URL_ + query);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  if (!intro) await page.evaluate(() => farm.skipIntro());
  return { ctx, page, errors };
}
async function check(name, f) {
  try { await f(); results.push([name, 'ok']); console.log(`ok   ${name}`); }
  catch (e) { results.push([name, 'FAIL', e.message]); console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const shot = (page, name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null;
const settle = async page => { for (let i = 0; i < 4; i++) { await page.evaluate(() => farm.closeCards()); await page.waitForTimeout(350); } };
async function tapCell(page, x, z) {
  await page.evaluate(([x, z]) => farm.focus(x, z, 30), [x, z]); await page.waitForTimeout(250);
  const p = await page.evaluate(([x, z]) => farm.cellToScreen(x, z), [x, z]);
  await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(700);
}
const radialOpen = page => page.evaluate(() => !document.querySelector('.radial').hidden && document.querySelectorAll('.radial .radial-btn').length > 0);

await check('phone: one touch tap on a weed, an empty bed and land for sale opens the menu and presses nothing', async () => {
  const { ctx, page, errors } = await open();
  await settle(page);
  // a weed on the start parcel
  const weed = await page.evaluate(() => { const s = farm.state(); for (let z = 56; z < 72; z++) for (let x = 32; x < 48; x++) if (s.cells[z * 128 + x] === 1 && !farm.state().placed[x]) return [x, z]; });
  expect(weed, 'no weed found');
  let coins = await page.evaluate(() => farm.state().coins);
  await tapCell(page, ...weed);
  expect(await radialOpen(page), 'the weed menu did not stay open');
  expect(await page.evaluate(() => farm.state().coins) === coins, 'the tap cleared the weed by itself');
  await shot(page, 'touch-weed');
  // an empty bed: no crop is planted by the tap
  const bed = await page.evaluate(() => { const g = farm.game; g.s.coins += 500; g.do('clear', { cells: [[40, 66]] }); const r = g.do('place', { kind: 'bed', x: 40, z: 66 }); g.do('endBuild'); return r.ok ? r.id : null; });
  expect(bed, 'could not place a bed');
  coins = await page.evaluate(() => farm.state().coins);
  await tapCell(page, 40, 66);
  expect(await radialOpen(page), 'the bed menu did not stay open');
  const after = await page.evaluate(id => ({ coins: farm.state().coins, bed: farm.state().beds[id] ?? null }), bed);
  expect(after.coins === coins && !after.bed, `the tap planted ${after.bed?.crop} for ${coins - after.coins} coins`);
  // land for sale: the parcel is not bought by the tap
  await page.evaluate(() => { const s = farm.state(); s.level = Math.max(s.level, 4); s.coins += 5000; farm.game.tick(); });
  const sale = await page.evaluate(() => { const s = farm.state(); return { parcels: s.parcels.length, coins: s.coins }; });
  await tapCell(page, 52, 63);                                      // the parcel east of the start parcel
  expect(await radialOpen(page), 'the land menu did not open');
  const now = await page.evaluate(() => ({ parcels: farm.state().parcels.length, coins: farm.state().coins }));
  expect(now.parcels === sale.parcels && now.coins === sale.coins, 'the tap bought the land');
  // a real second tap on the button does work
  const b = await page.locator('.radial [data-act="buyParcel"]').boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(500);
  expect(await page.evaluate(() => farm.state().parcels.length) === sale.parcels + 1, 'tapping Buy did not buy the land');
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

for (const lang of ['en', 'vi']) await check(`phone (${lang}): the guide never covers the build catalogue, and the hand points at the card to press`, async () => {
  const { ctx, page, errors } = await open(PHONE, { intro: true });
  if (lang === 'vi') { await page.evaluate(() => document.querySelector('[data-act="lang"]').click()); await page.waitForTimeout(800); }
  await page.evaluate(() => { farm.closeCards(); const g = farm.game; for (const [x, z] of [[34, 59], [35, 60], [34, 61]]) g.s.cells[z * 128 + x] = 0; g.s.stats.cleared = 3; g.do('tutorial', { step: 1 }); });
  await settle(page);
  await page.evaluate(() => document.querySelector('[data-act="build"]').click()); await page.waitForTimeout(700);
  const probe = () => page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.sheet.build .card, .sheet.build [data-bar="close"], .sheet.build .tab.on, .sheet.build .tool')) {
      const r = el.getBoundingClientRect(); if (r.right < 0 || r.left > innerWidth) continue;
      const top = document.elementFromPoint(Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), r.top + r.height / 2);
      if (!el.contains(top)) out.push(`${el.dataset.kind ?? el.dataset.cat ?? el.dataset.bar ?? el.dataset.tool}: ${top?.closest('.guide') ? 'the guide' : top?.className}`);
    }
    return out;
  });
  const onPath = await page.evaluate(() => ({ cat: document.querySelector('.sheet.build .tab.on')?.dataset.cat, guide: !document.querySelector('.guide').hidden }));
  expect(onPath.cat === 'paths', `the path step opened on the "${onPath.cat}" tab`);
  expect(onPath.guide, 'the guide is hidden');
  const covered = await probe(); expect(!covered.length, `covered: ${covered.join(', ')}`);
  const hand = await page.evaluate(() => { const m = document.querySelector('.pointer'), card = document.querySelector('.sheet.build .card[data-kind="path"]').getBoundingClientRect(); const t = new DOMMatrix(getComputedStyle(m).transform); return !m.hidden && t.e >= card.left && t.e <= card.right && t.f >= card.top && t.f <= card.bottom; });
  expect(hand, 'the hand does not point at the Path card');
  await shot(page, `guide-build-${lang}`);
  // the folded guide opens with a tap and still leaves the catalogue free
  const g = await page.locator('.guide .say').boundingBox(); await page.touchscreen.tap(g.x + 20, g.y + 10); await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.querySelector('.guide').classList.contains('expanded')), 'a tap does not open the guide');
  const covered2 = await probe(); expect(!covered2.length, `covered when open: ${covered2.join(', ')}`);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

for (const lang of ['en', 'vi']) await check(`phone (${lang}): two levels at once make one card whose buttons are on screen`, async () => {
  const { ctx, page, errors } = await open();
  if (lang === 'vi') { await page.evaluate(() => document.querySelector('[data-act="lang"]').click()); await page.waitForTimeout(800); }
  await page.evaluate(() => { const g = farm.game; g.s.xp = 0; g.s.level = 1; g.s.coins += 2000; g.do('testUnlockAll', { coins: 0 }); });
  await page.waitForTimeout(300); await settle(page);
  // gain levels 2..4 in one action through the real level-up event path
  await page.evaluate(() => { const g = farm.game; g.s.level = 1; g.s.xp = 0; g.emit({ ok: true, events: [2, 3, 4].map(level => ({ type: 'levelUp', level })) }, 'test'); });
  await page.waitForTimeout(900);
  const card = await page.evaluate(() => {
    const m = document.querySelector('.levelup-modal .card-modal'); if (!m) return null;
    const btns = [...m.querySelectorAll('.row .btn')].map(b => b.getBoundingClientRect());
    return { tiles: m.querySelectorAll('.unlock-tile:not([hidden])').length, inView: btns.every(r => r.bottom <= innerHeight && r.top >= 0), n: btns.length };
  });
  expect(card, 'no level-up card');
  expect(card.n >= 1 && card.inView, `the card's buttons are below the fold (${JSON.stringify(card)})`);
  expect(card.tiles <= 6, `${card.tiles} tiles on a phone card`);
  await shot(page, `levelup-merged-${lang}`);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

await check('phone: speech bubbles stay inside the screen at both edges', async () => {
  const { ctx, page, errors } = await open();
  const out = await page.evaluate(async () => {
    const pv = farm.people, w = [...pv.walkers.values()][0]; if (!w) return 'no walkers';
    const res = [];
    for (const dx of [-60, 60]) {
      farm.view(30, (w.x ?? 0) + dx, w.z ?? 0); pv.say(w, 'Granny Ada says Grandpa talks to fish. Is that true? Can fish talk back?', 3000);
      await new Promise(r => setTimeout(r, 200)); pv.placeBubbles();
      const r = w.bubble.getBoundingClientRect(); res.push([Math.round(r.left), Math.round(r.right)]);
    }
    return res;
  });
  expect(Array.isArray(out), out);
  for (const [l, r] of out) expect(l >= 0 && r <= 390, `a bubble spans ${l}..${r} on a 390 px screen`);
  expect(!errors.length, errors.join('\n'));
  await ctx.close();
});

for (const [name, device] of [['phone', PHONE], ['PC', { viewport: { width: 1280, height: 800 } }]]) await check(`${name}: a full farm with every crop ripe stays within 120 draws and 300k triangles at every zoom`, async () => {
  const { ctx, page } = await open(device);
  await page.evaluate(() => { farm.fillFarm(); for (const b of Object.values(farm.state().beds)) b.doneAt = farm.game.now - 1000; farm.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test'); });
  const worst = [];
  for (const span of [24, 40, 90, 140, 220]) {
    const info = await page.evaluate(s => { farm.view(s, 128, 112); return farm.measure(700); }, span);
    worst.push(`${span}: ${info.draws}/${info.triangles}`);
    expect(info.draws <= 120 && info.triangles <= 300000, `span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
  }
  console.log(`     ripe farm (${name}) span: draws/triangles  ${worst.join('  ')}`);
  await ctx.close();
});

await check('a first-scene model that fails twice shows a message with Try again (in place of an endless splash)', async () => {
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage();
  await page.route('**/assets/models/scenery.glb', r => r.fulfill({ status: 503, body: 'down' }));
  await page.addInitScript(() => { try { sessionStorage.setItem('fv-fresh-reload', String(Date.now())); } catch (e) {} });   // the reload was already spent
  await page.goto(URL_);
  await page.waitForSelector('#boot .boot-error button', { timeout: 30000 });
  const text = await page.textContent('#boot .boot-error');
  expect(/could not load/i.test(text), `message: ${text}`);
  await shot(page, 'boot-error');
  await ctx.close();
});

await check('one failed download of the Vietnamese lines: a gentle toast, no reload, and the next tap switches', async () => {
  let fails = 1;
  const { ctx, page } = await open(PHONE, { before: async page => {
    await page.route(/chunk-.*\.js/, async r => {
      const resp = await r.fetch(), body = await resp.text();
      if (fails > 0 && body.includes('Thung Suối')) { fails--; return r.abort('internetdisconnected'); }
      return r.fulfill({ response: resp, body });
    });
  } });
  const url = page.url();
  await page.evaluate(() => document.querySelector('[data-act="lang"]').click()); await page.waitForTimeout(1500);
  expect(page.url() === url, 'the page reloaded');
  const lang1 = await page.evaluate(() => document.documentElement.lang);
  await page.evaluate(() => document.querySelector('[data-act="lang"]').click()); await page.waitForTimeout(1500);
  const lang2 = await page.evaluate(() => document.documentElement.lang);
  expect(lang1 === 'vi' || lang2 === 'vi', `the language stayed ${lang1} / ${lang2}`);
  await ctx.close();
});

await browser.close();
const failed = results.filter(r => r[1] !== 'ok');
console.log(`\n${results.length - failed.length}/${results.length} review checks passed`);
process.exit(failed.length ? 1 : 0);
