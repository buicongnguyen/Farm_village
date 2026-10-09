// Run the same public controls on test and production builds; fixtures are ordinary saved profiles.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';
import { loadVietnamese, tIn } from '../src/kit/i18n.mjs';
import { personName } from '../src/content/character-names.mjs';
await loadVietnamese();

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-compact-hud'); mkdirSync(shots, { recursive: true });
const expect = (ok, message) => { if (!ok) throw Error(message); };
function fixture() {
  const now = Date.now(), s = newGame(now, 59303, { restore: true });
  s.level = 6; s.xp = xpFor(6); s.coins = 1000; s.barn.items = { wheat: 20, carrot: 5 }; s.barn.cap = 200;
  s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.projects = { step: 999, delivered: {} }; s.cond = {}; s.repairing = {}; s.beds = {};
  s.settings.reducedMotion = true; s.settings.daylight = 'always'; s.settings.textSize = 1.3;
  s.today.seen = true; s.today.claimed = true; s.helpAt = now + 86400000;
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  const home = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[home] = { family: 'tran', arrived: true, arrivesAt: now - 7200000, level: 0, rentFrom: now - 3600000 };
  // Fill all goal slots so boot does not generate a date-dependent, already-fillable favour.
  s.quests.list = [{ id: 'hud-goal', t: 'harvest', n: 2, base: 0, coins: 20, xp: 1 },
    { id: 'hud-orders', t: 'orders', n: 1000, base: 0, coins: 20, xp: 1 },
    { id: 'hud-fish', t: 'fish', n: 1000, base: 0, coins: 20, xp: 1 }]; s.stats.harvested = 2;
  s.orders.cards = [{ id: 'hud-order', from: 'ada', need: { wheat: 2 }, coins: 10, xp: 1 }]; s.orders.pending = Array(8).fill(now + 86400000);
  s.fishing = { line: { doneAt: now + 120000, seed: 123, bait: false }, coins: 0, caught: 0, feeAt: now + 86400000 };
  s.truck = { level: 1, coins: 0, away: true, backAt: now + 180000, load: [{ good: 'wheat', n: 2 }], fleet: [] };
  s.mail = [{ id: 'ellis-1', from: 'ellis', at: now, read: false }];
  return s;
}
async function bounds(page) {
  const bad = await page.evaluate(() => {
    const visible = el => el.checkVisibility() && !!el.getBoundingClientRect().width;
    const controls = [...document.querySelectorAll('.hud button')].filter(visible);
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      if (r.width < 43.9 || r.height < 43.9) return `small target: ${el.dataset.act ?? el.dataset.status} ${r.width}x${r.height}`;
      if (r.x < -1 || r.y < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return `offscreen: ${el.dataset.act ?? el.dataset.status}`;
    }
    for (const el of document.querySelectorAll('.hud-label, .tracker-goal, .status-copy')) {
      if (!visible(el)) continue; const r = el.getBoundingClientRect();
      if (r.x < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || el.scrollWidth > el.clientWidth + 1) return `cut label: ${el.textContent} (${r.x}, ${r.y}, ${r.width}x${r.height}, scroll ${el.scrollWidth}/${el.clientWidth})`;
    }
    for (let a = 0; a < controls.length; a++) for (let b = a + 1; b < controls.length; b++) {
      const r = controls[a].getBoundingClientRect(), q = controls[b].getBoundingClientRect();
      if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1) return `overlapping controls: ${controls[a].dataset.act ?? controls[a].dataset.status}, ${controls[b].dataset.act ?? controls[b].dataset.status}; top ${r.top}/${q.top}; sheet ${document.querySelector('.panel').getBoundingClientRect().height}/${getComputedStyle(document.body).getPropertyValue('--sheet-h')}`;
    }
    const captions = [...document.querySelectorAll('.hud .hud-label')].filter(visible);
    for (let a = 0; a < captions.length; a++) for (let b = a + 1; b < captions.length; b++) {
      const r = captions[a].getBoundingClientRect(), q = captions[b].getBoundingClientRect();
      if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1) return `overlapping labels: ${captions[a].textContent}, ${captions[b].textContent}`;
    }
    for (const toast of [...document.querySelectorAll('.hud .toast:not(.gone)')].filter(visible)) {
      const r = toast.getBoundingClientRect();
      if (r.x < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || toast.scrollWidth > toast.clientWidth + 1) return `cut toast: ${toast.textContent}`;
      for (const el of [...controls, ...captions]) {
        const q = el.getBoundingClientRect();
        if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1) return `toast covers ${el.dataset.act ?? el.dataset.status ?? el.textContent}`;
      }
    }
    return document.documentElement.scrollWidth > innerWidth + 1 ? 'document overflow' : '';
  });
  expect(!bad, bad);
}
export async function runCompactHud(testMode) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  let failed = 0, checks = 0;
  try {
    for (const lang of ['en', 'vi']) for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 844 }, { width: 844, height: 390 }, { width: 900, height: 510 }]) {
      checks++; const context = await browser.newContext({ viewport, isMobile: viewport.width < 900, hasTouch: viewport.width < 900, reducedMotion: 'reduce' });
      try {
        const s = fixture();
        await context.addInitScript(({ save, lang, now }) => { localStorage.setItem('farm-village:save:1', save); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village.language', lang); Date.now = () => now; }, { save: pack(s), lang, now: s.createdAt });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`${r.status()} ${r.url()}`); });
        await page.goto(URL_);
        if (testMode) {
          await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
          await page.evaluate(() => { farm.skipIntro(); farm.closeCards(); farm.panels.close(); });
        } else {
          await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
          // HUD DOM is created before scenery loads and game.start() opens the daily board.
          // Wait for the public guide initialization, then dismiss that real board as a player does.
          await page.locator('.guide').waitFor({ state: 'attached', timeout: 60000 });
          const daily = page.locator('.panel[data-kind="today"]:not([hidden])');
          if (await daily.isVisible()) await daily.locator('.panel-head [data-do="close"]').click();
          expect(await page.evaluate(() => !window.farm), 'production exposes debug hook');
        }
        await page.locator('.hud [data-status="market"]').waitFor({ timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        if (testMode) await page.evaluate(lines => {
          farm.hud.el.querySelector('.toasts').replaceChildren();
          lines.forEach(line => farm.hud.toast(line, 'info', { icon: 'ui:mail' }));
        }, ['cora', 'marisol'].map(id => tIn(lang, 'A letter from {name} is in the mailbox', { name: personName(id, lang) })));
        await bounds(page);
        expect(await page.locator('.hud .next-copy').evaluate(el => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) * 3 + 1), 'Next hint wraps into more than three lines');
        expect(await page.locator('.hud .hud-tracker').count() === 1, 'missing unified roadmap tracker');
        expect(await page.locator('.hud [data-status="roadmap"], .hud [data-status="projects"], .hud [data-status="orders"]').count() === 0, 'duplicate status rows remain');
        expect(await page.locator('.hud .status-row').count() === 4, 'lost a compact activity route');
        const goalBadge = await page.locator('.hud [data-status="quests"] .badge.ready').innerText();
        expect(goalBadge === '1', `goal readiness is not on its button: ${goalBadge}`);
        for (const id of ['today', 'projects', 'mail', 'barn', 'orders', 'build', 'friends']) expect((await page.locator(`.hud [data-act="${id}"] .hud-label`).innerText()).length > 0, `${id} has no visible label`);
        const today = await page.locator('.hud [data-act="today"] .hud-label').innerText();
        expect(today === (lang === 'vi' ? VI.Today : 'Today'), 'button label does not follow language');
        const statusImg = page.locator('.hud [data-status="market"] img');
        expect((await statusImg.getAttribute('src')).includes('/icons/sm/'), 'status chip does not use small art');
        await page.locator('.hud [data-status="pond"]').focus();
        await page.waitForTimeout(1200);
        const focused = await page.locator('.hud [data-status="pond"]').evaluate(el => ({ kept: el === document.activeElement,
          active: document.activeElement?.outerHTML?.slice(0, 160), visible: el.checkVisibility(), modal: !!document.querySelector('.modal'), panel: document.querySelector('.panel:not([hidden])')?.dataset.kind }));
        expect(focused.kept, `timer refresh removed keyboard focus: ${JSON.stringify(focused)}`);
        await page.screenshot({ path: join(shots, `${testMode ? 'test' : 'production'}-${lang}-${viewport.width}.png`) });
        for (const [selector, kind, content] of [['[data-act="village"]', 'roadmap', '.journey'], ['[data-status="quests"]', 'quests', '.goal'], ['[data-status="market"]', 'market', '.truck-row'], ['[data-status="pond"]', 'pond', '.goods-grid']]) {
          await page.locator(`.hud ${selector}`).click();
          await page.locator(`.panel[data-kind="${kind}"] ${content}`).first().waitFor({ state: 'attached' });
          expect(await page.locator(`.panel[data-kind="${kind}"]`).isVisible(), `lost ${kind} route`);
          await page.screenshot({ path: join(shots, `${testMode ? 'test' : 'production'}-${lang}-${viewport.width}-${kind}.png`) });
          await bounds(page);
          expect(await page.locator('.hud .hud-tools').evaluate(el => {
            const a = el.getBoundingClientRect(), b = document.querySelector('.panel').getBoundingClientRect();
            return Math.min(a.right, b.right) <= Math.max(a.left, b.left) + 1 || Math.min(a.bottom, b.bottom) <= Math.max(a.top, b.top) + 1;
          }), 'toolbar covers the open sheet');
          await page.locator('.panel .panel-head [data-do="close"]').click();
        }
        expect(!errors.length, errors.join('\n'));
        console.log(`ok   compact HUD: labels, targets, ready counts and routes (${lang}, ${viewport.width}x${viewport.height}, 130%)`);
      } catch (error) { failed++; console.log(`FAIL compact HUD (${lang}, ${viewport.width})\n     ${error.stack}`); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(`${checks - failed}/${checks} compact HUD checks passed.`); return failed;
}
