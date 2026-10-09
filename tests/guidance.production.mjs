// Public-build acceptance: normal profile saves and visible controls, with no window.farm dependency.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { repairCost } from '../src/core/condition.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-guidance'); mkdirSync(shots, { recursive: true });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
const fixed = Object.entries(ADVICE_TOPICS).flatMap(([id, topic]) => (topic.contexts ?? []).map(context => `${id}:${context}`));
const panel = page => page.locator('.panel:not([hidden])');
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
const resources = async page => {
  const s = await saved(page);
  return JSON.stringify({ coins: s.coins, barn: s.barn, learning: s.learning, schoolActivity: s.schoolActivity,
    exploration: s.exploration, landDiscovery: s.landDiscovery, discoveries: s.discoveries, stored: s.stored, repairing: s.repairing });
};

function fixture() {
  const now = Date.now(), s = newGame(now, 87126, { restore: true });
  s.level = 4; s.xp = xpFor(4); s.coins = 0; s.barn.items = {}; s.stats.harvested = 1; s.stats.ordersFilled = 1;
  s.story.chapter = 4; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.projects = { step: 999, delivered: {} }; s.today.seen = true; s.today.claimed = true; s.helpAt = now + 86400000;
  s.settings.reducedMotion = true; s.settings.daylight = 'always'; s.settings.textSize = 1.3;
  s.orders.cards = []; s.orders.pending = Array(8).fill(now + 86400000); s.beds = {};
  s.cond = { road_south: { level: 3, ms: 0 } }; s.repairing = {};
  const home = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[home] = { family: 'tran', arrived: true, arrivesAt: now - 1, level: 0, rentFrom: now };
  s.placed.guidanceSchool = { kind: 'school', x: 50, z: 106, rot: 2 }; s.counts.school = 1;
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  s.advice.read = [...fixed.filter(k => !k.startsWith('garden-lesson:')), 'fishing-break:pond'];
  return s;
}
async function enter(page) {
  await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
  // HUD markup precedes game.start(); wait for the public startup UI before interacting.
  await page.locator('.guide').waitFor({ state: 'attached', timeout: 60000 });
  // The startup Today sheet can be open already; its responsive layout deliberately hides the side HUD.
  const daily = page.locator('.panel[data-kind="today"]:not([hidden])');
  if (await daily.count()) await daily.locator('.panel-head [data-do="close"]').click();
  await page.locator('.hud [data-act="today"]').waitFor({ state: 'visible', timeout: 60000 });
  expect(await page.evaluate(() => typeof window.farm === 'undefined'), 'production build exposes the test hook');
}
async function today(page) {
  const close = panel(page).locator('.panel-head [data-do="close"]'); if (await close.count()) await close.click();
  await page.locator('.hud [data-act="today"]').click();
  await panel(page).locator('.advice-list').waitFor();
}
async function open(page, id, lang) {
  await today(page);
  await panel(page).locator(`.advice-list [data-do="readAdvice"][data-id="${id}"]`).click();
  await panel(page).locator('.advice-detail').waitFor();
  expect((await panel(page).innerText()).includes(tr(lang, ADVICE_TOPICS[id].title)), `wrong ${lang} title for ${id}`);
  if (!ADVICE_TOPICS[id].line.includes('{')) expect((await panel(page).innerText()).includes(tr(lang, ADVICE_TOPICS[id].line)), `wrong ${lang} June line for ${id}`);
  expect(await panel(page).evaluate(el => el.scrollWidth <= el.clientWidth + 2), 'guidance text overflows at 130%');
}
async function defer(page, id, lang) {
  await open(page, id, lang); await panel(page).locator('[data-do="deferAdvice"]').click();
}
async function preview(page, id, lang, destination) {
  const before = await resources(page); await open(page, id, lang);
  await panel(page).locator('[data-do="showAdvice"]').click();
  await page.locator(destination).waitFor({ state: 'visible' });
  expect(await resources(page) === before, `${id} preview changed saved resources or progress`);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0;
for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width === 390,
    hasTouch: width === 390, reducedMotion: 'reduce' });
  try {
    const initial = fixture();
    await context.addInitScript(({ save, lang, now }) => {
      if (!sessionStorage.getItem('guidance-public-seeded')) {
        sessionStorage.setItem('guidance-public-seeded', '1'); sessionStorage.setItem('guidance-public-clock', String(now));
        localStorage.setItem('farm-village.language', lang); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
      }
      Date.now = () => Number(sessionStorage.getItem('guidance-public-clock'));
    }, { save: pack(initial), lang, now: initial.createdAt });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.status() >= 400 && !/favicon/.test(response.url())) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(URL_); await enter(page);
    await preview(page, 'garden-lesson', lang, '.panel[data-kind="learning"] [data-do="inspectLearning"]');
    await preview(page, 'school-baskets', lang, '.panel[data-kind="schoolActivity"] [data-do="schoolStart"][data-difficulty="simple"]');
    await preview(page, 'picnic-porch', lang, '.panel[data-kind="exploration"] [data-do="inspectExploration"]');
    await defer(page, 'garden-lesson', lang);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('farm-village:save:1'))?.advice?.deferred?.includes('garden-lesson:garden/lesson'), null, { timeout: 15000 });
    await page.reload(); await enter(page); await today(page);
    await panel(page).locator('.advice-deferred summary').click();
    await panel(page).locator('.advice-deferred [data-id="garden-lesson"]').click();
    await panel(page).locator('[data-do="restoreAdvice"]').click();
    expect((await saved(page)).advice.read.includes('garden-lesson:garden/lesson'), 'restoring a postponed idea made it new again');
    await defer(page, 'garden-lesson', lang); await defer(page, 'school-baskets', lang); await defer(page, 'picnic-porch', lang);
    await open(page, 'street-save', lang);
    const cost = repairCost(initial, 'road_south');
    expect((await panel(page).innerText()).includes(tr(lang, ADVICE_TOPICS['street-save'].line).replace('{cost}', String(cost)).replace('{short}', String(cost))), 'road shortfall or free earning suggestion is wrong');
    await page.screenshot({ path: join(shots, `public-guidance-${lang}-${width}.png`) });
    const before = await resources(page); await panel(page).locator('[data-do="showAdvice"]').click();
    await page.locator('.radial:not([hidden]) [data-act="repair"]').waitFor();
    expect(await page.locator('.radial [data-act="repair"]').isDisabled(), 'zero-coin repair is enabled');
    expect(await resources(page) === before, 'road preview charged money or started the repair');
    const final = await saved(page);
    expect(final.coins === 0 && final.exploration.steps.length === 0 && final.learning.introducedAt === null
      && final.schoolActivity.rounds === 0 && !final.repairing.road_south, 'opening ideas progressed their activities');
    expect(!errors.length, errors.join('\n'));
    console.log(`ok   public guidance previews and saved postponement (${lang}, ${width}px)`);
  } catch (error) { failures++; console.error(`FAIL public guidance (${lang}, ${width}px)\n${error.stack}`); }
  finally { await context.close(); }
}
await browser.close(); process.exitCode = failures ? 1 : 0;
