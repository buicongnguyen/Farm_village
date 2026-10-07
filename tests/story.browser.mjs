// Story suite (docs/STORY.md): every chapter card, Ada's guide card and three order cards fit a 390 px phone in English
// and Vietnamese, with nothing cut off. Screenshots (story-*.png) go to SHOTS_DIR (default: the system temp folder).
// Run after `npm run build:test` and serving dist: GAME_URL=http://127.0.0.1:5274/ node tests/story.browser.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const SHOTS = process.env.SHOTS_DIR ?? join(tmpdir(), 'farm-village-story'); mkdirSync(SHOTS, { recursive: true });
const gpu = process.env.GPU !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader'] });
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
let failed = 0;
async function check(name, f) {
  try { await f(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
async function open(lang) {
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errors = [];
  await ctx.addInitScript(l => { try { localStorage.setItem('farm-village.language', l); } catch {} }, lang);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  return { ctx, page, errors };
}
/** Nothing inside the element is wider than it, and it sits inside the screen (only across, for lists that scroll). */
const fits = (page, sel, { scrolls = false } = {}) => page.evaluate(([sel, scrolls]) => {
  const el = document.querySelector(sel); if (!el) return `${sel} is missing`;
  const r = el.getBoundingClientRect(), bad = [];
  if (r.left < 0 || r.right > innerWidth + 0.5 || (!scrolls && (r.top < 0 || r.bottom > innerHeight + 0.5))) bad.push(`${sel} is off screen: ${JSON.stringify(r)}`);
  for (const e of [el, ...el.querySelectorAll('*')]) if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') bad.push(`${e.tagName}.${e.className} overflows`);
  for (const e of el.querySelectorAll('p, b, h2, small, button')) { const q = e.getBoundingClientRect(); if (q.width && (q.right > r.right + 1 || q.left < r.left - 1)) bad.push(`"${e.textContent.slice(0, 30)}" sticks out`); }
  return bad.join('; ');
}, [sel, scrolls]);
import { CHAPTERS } from '../src/content/story.mjs';
import { VI } from '../src/i18n/vi.mjs';
const tr = (lang, en) => lang === 'vi' ? VI[en] ?? en : en;

for (const lang of ['en', 'vi']) {
  await check(`chapter cards 1–5 fit a phone (${lang})`, async () => {
    const { ctx, page } = await open(lang);
    for (let n = 1; n <= 5; n++) {
      if (n > 1) await page.evaluate(n => { const s = farm.state(); ({ 2: s => { s.projects.step = 3; s.animals.story_hens = [{ kind: 'hen', doneAt: null }, { kind: 'hen', doneAt: null }]; },
        3: s => { s.homes.story_home = { level: 0, family: 'tran', arrivesAt: 0, rentFrom: 0, arrived: true }; }, 4: s => { s.counts.school = 1; }, 5: s => { s.placed.story_clinic = { kind: 'clinic', x: 62, z: 106, rot: 2 }; s.counts.clinic = 1; for (const [i, family] of ['okafor', 'lindqvist', 'reyes'].entries()) s.homes[`story_family${i}`] = { level: 0, family, arrivesAt: 0, rentFrom: 0, arrived: true }; } })[n](s);
        farm.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test'); }, n);
      await page.waitForSelector('.modal .chapter', { timeout: 5000 });
      const head = await page.textContent('.modal .chapter small');
      expect(head.includes(String(n)), `expected chapter ${n}, got "${head}"`);
      // the card as the guide draws it today, then with Ada's line added (the ui package's chapter-card hook): both must fit
      let bad = await fits(page, '.modal .card-modal'); expect(!bad, `chapter ${n}: ${bad}`);
      await page.evaluate(([who, line]) => document.querySelector('.modal .chapter [data-close]').insertAdjacentHTML('beforebegin',
        `<p class="ada" style="font-style:italic"><b>${who}:</b> “${line}”</p>`), [tr(lang, 'Ada'), tr(lang, CHAPTERS[n - 1].ada)]);
      bad = await fits(page, '.modal .card-modal'); expect(!bad, `chapter ${n} with Ada's line: ${bad}`);
      await page.screenshot({ path: join(SHOTS, `story-ch${n}-${lang}.png`) });
      await page.click('.modal [data-close]');
      await page.waitForFunction(n => (farm.state().story.chapter ?? 0) >= n, n, { timeout: 5000 });
    }
    await ctx.close();
  });

  await check(`Ada's guide card and three order cards fit a phone (${lang})`, async () => {
    const { ctx, page, errors } = await open(lang);
    await page.click('.modal [data-close]');
    await page.waitForSelector('.guide:not([hidden])');
    const bad = await fits(page, '.guide'); expect(!bad, `guide: ${bad}`);
    await page.screenshot({ path: join(SHOTS, `story-guide-${lang}.png`) });
    await page.evaluate(() => {
      farm.skipIntro(); const s = farm.state();
      s.orders.cards = [
        { id: 'st1', from: 'ada', need: { wheat: 6, carrot: 2 }, coins: 40, xp: 9, readyAt: 0, line: 'I sold these at the mill gate when I was a girl. Let us see if I still can.' },
        { id: 'st2', from: 'gus', need: { egg: 4 }, coins: 60, xp: 12, readyAt: 0, line: 'Not for me. For a friend. Fine, it is for me.' },
        { id: 'st3', from: 'zara', need: { bread: 2, corn: 3 }, coins: 70, xp: 14, readyAt: 0, line: 'Mum says I can have a treat when I finish chapter nine. I finished it.' },
      ];
      farm.panels.show('orders');
    });
    await page.waitForSelector('.order');
    const sheet = await fits(page, '.order-list', { scrolls: true }); expect(!sheet, `orders: ${sheet}`);
    await page.screenshot({ path: join(SHOTS, `story-orders-${lang}.png`) });
    expect(!errors.length, errors.join('\n'));
    await ctx.close();
  });
}
await browser.close();
console.log(failed ? `${failed} story check(s) failed` : 'story checks passed', `(screenshots in ${SHOTS})`);
process.exit(failed ? 1 : 0);
