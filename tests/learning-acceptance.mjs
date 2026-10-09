// Shared UI acceptance for the instrumented build and the public build (which has no game hook).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { RUINS } from '../src/content/world.mjs';
import { REPAIR_LESSON, LEARNING_MEMORIES } from '../src/content/learning.mjs';
import { SCHOOL_MEMORY } from '../src/content/school-activity.mjs';
import { schoolQuestions } from '../src/core/school-state.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-learning'); mkdirSync(shots, { recursive: true });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
const panel = page => page.locator('.panel:not([hidden])');
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
function fixture() {
  const now = Date.now(), s = newGame(now, 73641, { restore: true });
  s.level = 5; s.xp = xpFor(5); s.coins = 1000; s.barn.items = { wheat: 12, carrot: 8 }; s.barn.cap = 200;
  s.projects = { step: 999, delivered: {} }; s.story.chapter = 4; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.cond = {}; s.repairing = {}; s.beds = {}; s.helpAt = now + 86400000;
  s.today.seen = true; s.today.claimed = true; s.stats.ordersFilled = 1;
  s.settings.reducedMotion = true; s.settings.daylight = 'always'; s.settings.textSize = 1.3;
  const home = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[home] = { family: 'tran', arrived: true, arrivesAt: now - 1000, level: 0, rentFrom: now };
  const school = RUINS.find(r => r.kind === 'school');
  s.placed['learning-school'] = { kind: 'school', x: school.x, z: school.z, rot: school.rot }; s.counts.school = 1;
  // A saved request exercises truthful guidance even for a skill which the player has not learned yet.
  s.orders.cards = [{ id: 'berry-help', from: 'ada', need: { strawberry: 2 }, coins: 30, xp: 1, line: 'Thank you!', readyAt: now }];
  s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  return s;
}
async function waitSaved(page, path, value) {
  await page.waitForFunction(({ path, value }) => {
    const s = JSON.parse(localStorage.getItem('farm-village:save:1'));
    return JSON.stringify(path.reduce((v, k) => v?.[k], s)) === JSON.stringify(value);
  }, { path, value }, { timeout: 15000 });
}
async function enter(page, testMode) {
  if (testMode) await page.waitForFunction(() => window.farm?.ready);
  else {
    await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
    // The HUD exists before the models and game.start() finish loading.
    await page.locator('.guide').waitFor({ state: 'attached', timeout: 60000 });
    const daily = page.locator('.panel[data-kind="today"]:not([hidden])');
    if (await daily.isVisible()) await daily.locator('.panel-head [data-do="close"]').click();
    expect(await page.evaluate(() => typeof window.farm === 'undefined'), 'public build exposes test hook');
  }
  await page.locator('.hud [data-act="projects"]').waitFor({ state: 'visible', timeout: 60000 });
}
async function open(page, activity = 'learning') {
  const close = panel(page).locator('.panel-head [data-do="close"]'); if (await close.count()) await close.click();
  await page.locator('.hud [data-act="projects"]').click();
  await panel(page).locator(`[data-do="${activity}"]`).click();
}
async function fit(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 2)), 'panel overflows at 130% text');
}
async function photo(page, label) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.panel:not([hidden]) img')].map(img => img.decode()));
  });
  await page.screenshot({ path: join(shots, label) });
}
export async function runLearningAcceptance(testMode) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  let failures = 0;
  try {
    for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
      try {
        const initial = fixture(), start = initial.createdAt;
        await context.addInitScript(({ lang, save, now }) => {
          if (!sessionStorage.getItem('learning-seeded')) {
            sessionStorage.setItem('learning-seeded', '1'); sessionStorage.setItem('learning-clock', String(now));
            localStorage.setItem('farm-village.language', lang); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
          }
          Date.now = () => Number(sessionStorage.getItem('learning-clock'));
        }, { lang, save: pack(initial), now: start });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
        await page.goto(URL_); await enter(page, testMode);
        await page.locator('.hud [data-act="orders"]').click();
        await panel(page).locator('[data-order-id="berry-help"] .needs [data-do="goodHelp"]').click();
        expect((await panel(page).innerText()).includes(tr(lang, 'Restore the potting bench to learn strawberry planting.')), 'missing strawberry skill blocker');
        await panel(page).locator('[data-do="goodHelpSource"]').click();
        await panel(page).locator('[data-do="inspectLearning"]').waitFor();
        expect((await saved(page)).coins === initial.coins, 'source navigation spent money');
        await panel(page).locator('[data-do="goodHelpReturn"]').click();
        expect(await panel(page).locator('[data-order-id="berry-help"]').isVisible(), 'lost original request');
        await open(page);
        await panel(page).locator('[data-do="inspectLearning"]').click();
        const first = REPAIR_LESSON[0];
        await panel(page).locator(`[data-do="answerRepairLesson"][data-choice="${first.choices.find(c => c.id !== first.answer).id}"]`).click();
        await waitSaved(page, ['learning', 'lessonIndex'], 0);
        for (const q of REPAIR_LESSON) await panel(page).locator(`[data-do="answerRepairLesson"][data-question="${q.id}"][data-choice="${q.answer}"]`).click();
        await waitSaved(page, ['learning', 'learnedAt'], start);
        expect((await saved(page)).xp === initial.xp && (await saved(page)).coins === initial.coins, 'lesson spent farm resources');
        expect((await panel(page).innerText()).includes('80') && (await panel(page).innerText()).includes('50'), 'total project costs missing');
        await fit(page);
        await panel(page).locator('[data-do="workGardenProject"][data-step="uncover"]').click();
        await waitSaved(page, ['learning', 'steps'], ['uncover']);
        expect((await saved(page)).coins === 980 && (await saved(page)).learning.energy === 80, 'first step paid twice or discovery minted extra cash');
        await panel(page).locator('[data-do="learningMemory"][data-id="seed-label"]').click();
        await waitSaved(page, ['learning', 'read'], ['seed-label']);
        expect((await panel(page).innerText()).includes(tr(lang, LEARNING_MEMORIES[0].title)), 'missing seed-label story');
        await photo(page, `${testMode ? 'test' : 'public'}-garden-memory-${lang}-${width}.png`);
        await page.reload(); await enter(page, testMode); await open(page);
        expect(await panel(page).locator('[data-do="workGardenProject"][data-step="brace"]').isVisible(), 'reload lost paid step');
        await panel(page).locator('[data-do="restForProject"]').click();
        await page.evaluate(() => sessionStorage.setItem('learning-clock', String(Date.now() + 30000)));
        await waitSaved(page, ['learning', 'energy'], 100);
        expect((await saved(page)).coins === 980, 'free rest charged coins');
        await panel(page).locator('[data-do="workGardenProject"][data-step="brace"]').click();
        await panel(page).locator('[data-do="workGardenProject"][data-step="trays"]').click();
        await waitSaved(page, ['learning', 'steps'], ['uncover', 'brace', 'trays']);
        expect((await saved(page)).coins === 920 && (await saved(page)).learning.energy === 70, 'project total or rest recovery wrong');
        await panel(page).locator('[data-do="learningMemory"][data-id="garden-ready"]').click();
        await waitSaved(page, ['learning', 'read'], ['seed-label', 'garden-ready']);
        await fit(page);
        await open(page, 'schoolActivity');
        await panel(page).locator('[data-do="schoolStart"][data-difficulty="simple"]').click();
        await waitSaved(page, ['schoolActivity', 'rounds'], 1);
        const questions = schoolQuestions(1, 'simple');
        await panel(page).locator(`[data-do="schoolAnswer"][data-choice="${questions[0].choices.find(n => n !== questions[0].answer)}"]`).click();
        await waitSaved(page, ['schoolActivity', 'active', 'missed', 0], true);
        await page.reload(); await enter(page, testMode); await open(page, 'schoolActivity');
        for (const q of questions) await panel(page).locator(`[data-do="schoolAnswer"][data-question="${q.id}"][data-choice="${q.answer}"]`).click();
        await waitSaved(page, ['schoolActivity', 'completed'], 1);
        await panel(page).locator('[data-do="schoolMemory"]').click();
        await waitSaved(page, ['schoolActivity', 'memoryRead'], true);
        expect((await panel(page).innerText()).includes(tr(lang, SCHOOL_MEMORY.title)), 'missing school story');
        await fit(page); await photo(page, `${testMode ? 'test' : 'public'}-school-${lang}-${width}.png`);
        const before = await saved(page);
        await panel(page).locator('[data-do="schoolActivity"]').click();
        await panel(page).locator('[data-do="schoolStart"][data-difficulty="challenge"]').click();
        for (const q of schoolQuestions(2, 'challenge')) await panel(page).locator(`[data-do="schoolAnswer"][data-question="${q.id}"][data-choice="${q.answer}"]`).click();
        await waitSaved(page, ['schoolActivity', 'completed'], 2);
        const after = await saved(page);
        expect(after.coins === before.coins && after.xp === before.xp && JSON.stringify(after.barn) === JSON.stringify(before.barn) && after.learning.energy === before.learning.energy, 'classroom replay changed farm resources');
        expect(after.schoolActivity.memoryRead && after.schoolActivity.memoryAt === before.schoolActivity.memoryAt, 'repeat round duplicated a memory');
        expect(!errors.length, errors.join('\n'));
        console.log(`ok   garden, free rest, strawberry guidance, school + reload ${testMode ? 'test' : 'production'} ${lang} ${width}`);
      } catch (error) { failures++; console.log(`FAIL learning ${lang} ${width}\n${error.stack}`); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return failures;
}
