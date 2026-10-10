// Real classroom controls, persistent puzzles and bilingual memories. Run serially with other GPU suites.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { schoolQuestions } from '../src/core/school-state.mjs';
import { SCHOOL_MEMORY } from '../src/content/school-activity.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { RUINS } from '../src/content/world.mjs';
import { pack } from '../src/kit/save.mjs';
import { loadVietnamese, tIn } from '../src/kit/i18n.mjs';
import { personName } from '../src/content/character-names.mjs';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-school-activity'); mkdirSync(shots, { recursive: true });
const expect = (ok, why) => { if (!ok) throw Error(why); };
await loadVietnamese();
const tr = tIn;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0, checks = 0;

function fixture() {
  const s = newGame(Date.now(), 1657, { restore: true }), site = RUINS.find(r => r.kind === 'school');
  s.placed.classroom = { kind: 'school', x: site.x, z: site.z, rot: site.rot }; s.counts.school = 1;
  s.level = 6; s.projects = { step: 999, delivered: {} }; s.story.chapter = 4; s.story.tutorial = 999;
  s.story.beats = BEATS.map(b => b.id); s.settings.reducedMotion = true; s.settings.daylight = 'always';
  s.today.seen = true; s.today.claimed = true; s.orders.cards = []; s.orders.pending = Array(8).fill(s.createdAt + 86400000);
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
const panel = page => page.locator('.panel:not([hidden])');
async function open(page) {
  await page.evaluate(() => { farm.closeCards(); farm.panels.show('today'); });
  await panel(page).locator('[data-do="schoolActivity"]').click(); await panel(page).locator('.school-activity').waitFor();
}
async function fit(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
    && [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 2)), 'classroom overflows');
}
async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.panel:not([hidden]) img')].filter(img => img.getClientRects().length).map(img => img.decode()));
  });
  await page.screenshot({ path: join(shots, name) });
}
const economy = page => page.evaluate(() => {
  const s = farm.game.s; return JSON.stringify({ coins: s.coins, xp: s.xp, seed: s.seed, barn: s.barn, stats: s.stats, stored: s.stored });
});
async function question(page) {
  const active = await page.evaluate(() => farm.game.s.schoolActivity.active);
  return schoolQuestions(active.round, active.difficulty)[active.step];
}
async function answer(page, correct = true) {
  const q = await question(page), choice = correct ? q.answer : q.choices.find(n => n !== q.answer);
  await panel(page).locator(`[data-do="schoolAnswer"][data-question="${q.id}"][data-choice="${choice}"]`).click();
  if (correct) await page.waitForFunction(id => !document.querySelector(`[data-school-question="${id}"]`), q.id);
  return q;
}
async function language(page, lang) {
  await page.evaluate(() => farm.panels.show('settings'));
  await panel(page).locator(`[data-do="setting"][data-key="lang"][data-value="${lang}"]`).click();
  await page.waitForFunction(lang => document.documentElement.lang === lang, lang);
}
async function saveReload(page) { await page.evaluate(() => window.__fvSave()); await page.reload(); await ready(page); }
async function run(name, lang, width, fn) {
  checks++; let context;
  try {
    context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
    const s = fixture();
    await context.addInitScript(({ lang, save, now }) => {
      if (!sessionStorage.getItem('school-seeded')) {
        sessionStorage.setItem('school-seeded', '1'); sessionStorage.setItem('school-clock', String(now));
        localStorage.setItem('farm-village.language', lang); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
      }
      Date.now = () => Number(sessionStorage.getItem('school-clock'));
    }, { lang, save: pack(s), now: s.createdAt });
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await ready(page); await fn(page);
    expect(!errors.length, errors.join('\n')); console.log(`ok   ${name} ${lang} ${width}`);
  } catch (error) { failed++; console.log(`FAIL ${name} ${lang} ${width}\n${error.stack}`); }
  finally { await context?.close(); }
}

for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  await run('school retries, pause, language changes, notebook and memory', lang, width, async page => {
    await open(page); const before = await economy(page);
    await panel(page).locator('[data-do="schoolStart"][data-difficulty="simple"]').click();
    const first = await question(page); expect(await panel(page).locator('.school-pictures [role="img"]').count() === first.rows.flat().length, 'wrong picture count');
    await answer(page, false);
    expect((await panel(page).innerText()).includes(tr(lang, 'Let’s have another look. There is plenty of time.')), 'gentle retry hint absent');
    expect((await question(page)).id === first.id, 'wrong answer skipped the puzzle');
    await answer(page); const active = await page.evaluate(() => JSON.stringify(farm.game.s.schoolActivity.active));
    await panel(page).locator('[data-do="schoolBack"]').click(); expect(await page.locator('.panel:visible').count() === 0, 'back did not close the classroom');
    await open(page); expect(await page.evaluate(a => JSON.stringify(farm.game.s.schoolActivity.active) === a, active), 'pause rerolled puzzle');
    const other = lang === 'en' ? 'vi' : 'en'; await language(page, other); await open(page);
    expect(await page.evaluate(a => JSON.stringify(farm.game.s.schoolActivity.active) === a, active), 'language rerolled puzzle');
    await saveReload(page); await open(page);
    expect(await page.evaluate(a => JSON.stringify(farm.game.s.schoolActivity.active) === a, active), 'reload changed puzzle');
    expect((await panel(page).innerText()).includes(tr(other, 'Three little puzzles, as much time as you like.')), 'reloaded language wrong');
    await language(page, lang); await open(page); await answer(page); await answer(page);
    expect(await page.evaluate(() => farm.game.s.schoolActivity.completed === 1 && farm.game.s.schoolActivity.best === 2 && !farm.game.s.schoolActivity.memoryRead), 'first round or unread memory wrong');
    await panel(page).locator('[data-do="schoolMemory"]').click(); await page.waitForFunction(() => farm.game.s.schoolActivity.memoryRead);
    for (const line of SCHOOL_MEMORY.lines) expect((await panel(page).innerText()).includes(tr(lang, line.text)), `missing school line ${line.who}`);
    await fit(page); await screenshot(page, `memory-${lang}-${width}.png`);
    await panel(page).locator('[data-do="schoolActivity"]').click();
    await panel(page).locator('[data-school-detail="notebook"] summary').click(); await page.evaluate(() => farm.panels.render());
    expect(await panel(page).locator('[data-school-detail="notebook"]').evaluate(el => el.open), 'notebook collapsed on redraw');
    await panel(page).locator('[data-do="schoolStart"][data-difficulty="challenge"]').click();
    await page.evaluate(() => { farm.game.do('setting', { key: 'textSize', value: 1.3 }); farm.panels.render(); });
    for (let i = 0; i < 3; i++) { await fit(page); if (i === 2) await screenshot(page, `challenge-${lang}-${width}.png`); await answer(page); }
    expect(await page.evaluate(() => farm.game.s.schoolActivity.completed === 2 && farm.game.s.schoolActivity.best === 3 && farm.game.s.schoolActivity.memoryRead), 'repeat reset memory or notebook');
    expect(await economy(page) === before, 'classroom play changed farm resources or RNG');
    await saveReload(page);
    await page.evaluate(() => farm.panels.show('album')); await panel(page).locator('[data-do="schoolMemory"]').click();
    await panel(page).locator('.school-memory').waitFor(); expect(await economy(page) === before, 'memory reload awarded farm resources');
    await fit(page);
  });
}

await run('school introduction and repair gates keep unfinished games and earned memories safe', 'en', 390, async page => {
  await page.evaluate(() => { farm.game.s.story.chapter = 3; farm.panels.show('today'); });
  expect(await panel(page).locator('[data-do="schoolActivity"]').count() === 0, 'Cora appeared before her introduction');
  await page.evaluate(() => farm.panels.show('schoolActivity'));
  expect((await panel(page).innerText()).includes(`Meet ${personName('cora', 'en', 'short')}`), 'direct school page omitted introduction gate');
  expect(await panel(page).locator('[data-do="schoolStart"]').count() === 0, 'locked school offered start');
  await page.evaluate(() => { farm.game.s.story.chapter = 4; farm.panels.show('schoolActivity'); });
  await panel(page).locator('[data-do="schoolStart"][data-difficulty="simple"]').click();
  for (let i = 0; i < 3; i++) await answer(page);
  await panel(page).locator('[data-do="schoolStart"][data-difficulty="challenge"]').click();
  const active = await page.evaluate(() => JSON.stringify(farm.game.s.schoolActivity.active));
  await page.evaluate(() => { farm.game.s.cond.classroom = { level: 3 }; farm.panels.render(); });
  expect(await panel(page).locator('[data-do="schoolAnswer"]').count() === 0, 'broken school still offered answers');
  await panel(page).locator('[data-do="schoolMemory"]').click(); await page.waitForFunction(() => farm.game.s.schoolActivity.memoryRead);
  await panel(page).locator('[data-do="schoolActivity"]').click();
  expect((await panel(page).innerText()).includes('Restore the school'), 'broken school gate absent');
  await page.evaluate(() => { delete farm.game.s.cond.classroom; farm.panels.render(); });
  expect(await page.evaluate(a => JSON.stringify(farm.game.s.schoolActivity.active) === a, active), 'repair gate reset unfinished game');
  await answer(page); await fit(page);
});

await browser.close(); console.log(`${checks - failed}/${checks} school-activity browser checks passed`); process.exitCode = failed ? 1 : 0;
