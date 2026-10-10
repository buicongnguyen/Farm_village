// AR-012 consumes the art lane's delivered files through ordinary menu and ingredient controls.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { BEATS } from '../src/content/story.mjs';
import { pack } from '../src/kit/save.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-art-integration'); mkdirSync(shots, { recursive: true });
const expect = (ok, message) => { if (!ok) throw Error(message); };
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0, checks = 0;

function fixture() {
  const now = Date.now(), s = newGame(now, 76893, { restore: true });
  s.level = 10; s.xp = xpFor(10); s.coins = 2000;
  s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(beat => beat.id);
  s.today.seen = true; s.today.claimed = true; s.settings.reducedMotion = true; s.settings.daylight = 'always';
  s.cond = {}; s.repairing = {}; s.animals = {}; s.projects = { step: 999, delivered: {} };
  s.barn.items = { wheat: 3, carrot: 1 };
  s.orders.cards = [
    { id: 'art-short', from: 'ada', need: { wheat: 2, carrot: 4 }, coins: 30, xp: 1 },
    { id: 'art-ready', from: 'ada', need: { wheat: 1 }, coins: 3, xp: 1 },
  ];
  s.orders.pending = Array(8).fill(now + 86400000);
  s.firsts['learning:memory:seed-label'] = now;
  s.mail = [{ id: 'ellis-1', from: 'ellis', at: now, read: false }];
  const beds = Object.keys(s.placed).filter(id => s.placed[id].kind === 'bed').slice(0, 2);
  s.beds = Object.fromEntries(beds.map(id => [id, { crop: 'wheat', doneAt: now - 1000 }]));
  return s;
}
const waitPictures = (page, selector) => page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(img => img.complete && img.naturalWidth > 0), selector);

for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  checks++;
  try {
    await context.addInitScript(({ save, lang }) => {
      localStorage.setItem('farm-village.language', lang);
      localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
    }, { save: pack(fixture()), lang });
    const page = await context.newPage(), errors = [], badAssets = [], smallAssets = new Set();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/assets/icons/')) {
        if (response.status() >= 400) badAssets.push(response.url());
        if (response.url().includes('/icons/sm/')) smallAssets.add(response.url());
      }
    });
    await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(() => { clearInterval(farm.game.timer); farm.skipIntro(); farm.closeCards(); farm.panels.close(); });
    await page.evaluate(() => { const s = farm.state(); if (!(s.mail ?? []).some(m => !m.read)) (s.mail ??= []).unshift({ id: 'ada-1', from: 'ada', at: farm.game.now, read: false }); farm.hud.refreshStatus(); });   // the Letters pill shows only with unread mail
    const hasProject = await page.locator('.hud [data-act="projects"]').count() > 0;   // the Project pill exists while a project step does
    for (const id of ['today', ...(hasProject ? ['projects'] : []), 'mail']) {   // Today is a round button; the project and unread letters are notice pills
      const img = page.locator(`.hud [data-act="${id}"] img`);
      expect((await img.getAttribute('src'))?.endsWith(`/ui-${id}.webp`), `${id} still uses the old menu picture`);
    }
    expect(await page.locator('.hud [data-act="orders"] .badge').evaluate(el => el.classList.contains('ready') && !el.hidden), 'fillable-order badge is not actionable');
    if (hasProject) expect(await page.locator('.hud [data-act="projects"] .badge').evaluate(el => el.classList.contains('ready')), 'project readiness is not green');
    expect(await page.locator('.hud [data-act="today"] .badge').evaluate(el => !el.classList.contains('ready') && !el.hidden), 'today unread badge lost its distinction');
    expect(await page.locator('.hud [data-status="mail"]').evaluate(el => el.classList.contains('hot') && /\d/.test(el.textContent)), 'unread letters are not a lit notice pill with their count');
    const colors = await page.evaluate(() => ['orders', 'today'].map(id => getComputedStyle(document.querySelector(`.hud [data-act="${id}"] .badge`)).backgroundImage));
    expect(colors[0] !== colors[1], 'ready and unread badges have identical colors');

    await page.evaluate(() => farm.panels.show('orders'));
    await page.locator('.order .item-token').first().waitFor();
    await waitPictures(page, '.panel img');
    expect(await page.locator('.order .item-token.ok').count() > 0 && await page.locator('.order .item-token.short').count() > 0, 'have/need tokens lost their state');
    expect(await page.locator('.order .item-token').evaluateAll(tokens => tokens.every(el => el.classList.contains('token') && getComputedStyle(el).borderTopWidth === '3px')), 'old layout styling overrides the supplied token look');
    expect(await page.locator('.order .item-token img').evaluateAll(images => images.every(img => img.src.includes('/icons/sm/') && img.naturalWidth === 64)), 'small order pictures use full-size or missing files');
    expect(await page.locator('.panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'order tokens overflow the sheet');
    await page.screenshot({ path: join(shots, `tokens-${lang}-${width}.png`) });
    await page.locator('.order [data-do="goodHelp"][data-good="carrot"]').last().click();
    await page.locator('.good-help [data-do="goodHelpSource"]').waitFor();
    expect(await page.locator('[data-do="goodHelpSource"]').evaluate(el => el.classList.contains('go') && !el.classList.contains('primary')), 'source navigation is styled as a spending action');
    await page.locator('.panel [data-do="goodHelpBack"]').click();
    await page.locator('.order .item-token').first().waitFor();
    await page.evaluate(() => { farm.panels.close(); farm.build.show(); });
    expect((await page.locator('[data-tool="demolish"] img').getAttribute('src')).endsWith('/tool-demolish.webp'), 'demolition still uses a placeholder glyph');
    await page.evaluate(() => {
      farm.build.close(); farm.closeCards();
      const p = Object.values(farm.state().placed).find(p => p.kind === 'coop');
      farm.radial.tap({ x: p.x, z: p.z }, innerWidth / 2, innerHeight / 2);
    });
    expect((await page.locator('.radial [data-act="buyAnimal"] img').first().getAttribute('src')).endsWith('/hen.webp'), 'animal purchase does not show the animal');
    await page.evaluate(() => {
      farm.radial.hide();
      const p = farm.state().placed[Object.keys(farm.state().beds)[0]];
      farm.radial.tap({ x: p.x, z: p.z }, innerWidth / 2, innerHeight / 2);
    });
    expect((await page.locator('.radial [data-act="harvestAll"] img').getAttribute('src')).endsWith('/ui-harvest_all.webp'), 'harvest-all picture is not connected');
    await waitPictures(page, '.radial img');
    expect(smallAssets.size > 0, 'browser made no small-icon requests');
    expect(!badAssets.length && !errors.length, [...badAssets, ...errors].join('\n'));
    console.log(`ok   delivered menu art, small icons and action meanings (${lang}, ${width})`);
  } catch (error) { failed++; console.log(`FAIL art integration (${lang}, ${width})\n     ${error.stack}`); }
  finally { await context.close(); }
}
await browser.close();
console.log(`${checks - failed}/${checks} art integration checks passed.`);
if (failed) process.exitCode = 1;
