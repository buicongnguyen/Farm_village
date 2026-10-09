// Follow current facts through real advice controls. Previewing a clue/repair must never do its work for the player.
import { chromium } from 'playwright';
import { newGame, CELL_TYPES } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { N } from '../src/content/world.mjs';
import { VI } from '../src/i18n/vi.mjs';
import { pack } from '../src/kit/save.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const fixed = Object.entries(ADVICE_TOPICS).flatMap(([id, topic]) => (topic.contexts ?? []).map(context => `${id}:${context}`));
const expect = (ok, why) => { if (!ok) throw Error(why); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0;

function fixture() {
  const now = Date.now(), s = newGame(now, 74182, { restore: true });
  s.level = 4; s.xp = xpFor(4); s.coins = 500; s.stats.harvested = 1; s.stats.ordersFilled = 1;
  s.story.chapter = 4; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.projects = { step: 999, delivered: {} }; s.today.seen = true; s.today.claimed = true;
  s.settings.reducedMotion = true; s.settings.daylight = 'always'; s.settings.textSize = 1.3;
  s.orders.cards = []; s.orders.pending = Array(8).fill(now + 86400000);
  s.cond = { road_south: { level: 3, ms: 0 } }; s.repairing = {}; s.beds = {}; s.helpAt = now + 86400000;
  const cottage = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[cottage] = { family: 'tran', arrived: true, arrivesAt: now - 1000, level: 0, rentFrom: now };
  s.placed.guidanceSchool = { kind: 'school', x: 50, z: 106, rot: 2 }; s.counts.school = 1;
  s.cells[60 * N + 35] = CELL_TYPES.rock;
  s.discoveries.catches = 1; s.discoveries.rocks = 1;
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  return s;
}
async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    const now = farm.game.now; clearInterval(farm.game.timer); farm.game.clock = () => now;
    farm.skipIntro(); farm.closeCards(); farm.panels.close(); farm.radial.hide();
  });
}
async function resources(page) {
  return page.evaluate(() => {
    const s = farm.state(); return JSON.stringify({ coins: s.coins, barn: s.barn, parcels: s.parcels, cells: s.cells,
      exploration: s.exploration, landDiscovery: s.landDiscovery, learning: s.learning, schoolActivity: s.schoolActivity,
      discoveries: s.discoveries, stored: s.stored, repairing: s.repairing });
  });
}
async function today(page) {
  await page.evaluate(() => { farm.closeCards(); farm.panels.close(); farm.radial.hide(); });
  await page.locator('.hud [data-act="today"]').click();
  await page.locator('.panel[data-kind="today"] .advice-list').waitFor();
}
async function openIdea(page, id, lang, focus = true) {
  if (focus) await page.evaluate(({ fixed, id }) => {
    farm.game.s.advice.read = fixed.filter(key => !key.startsWith(`${id}:`));
    farm.game.s.advice.deferred = [];
  }, { fixed, id });
  await today(page);
  await page.locator(`.advice-list [data-do="readAdvice"][data-id="${id}"]`).click();
  await page.locator(`.panel[data-kind="advice"] [data-advice-id="${id}"]`).first().waitFor();
  const detail = page.locator('.advice-detail');
  const content = await detail.textContent();
  expect(content.includes(tr(lang, ADVICE_TOPICS[id].title)), `wrong localized title for ${id}`);
  // For lines without parameters this also verifies June's exact, language-specific voice.
  if (!ADVICE_TOPICS[id].line.includes('{')) expect(content.includes(tr(lang, ADVICE_TOPICS[id].line)), `wrong speaker line for ${id}`);
  expect(await page.evaluate(() => [...document.querySelectorAll('.panel:not([hidden])')].every(el => el.scrollWidth <= el.clientWidth + 2)
    && document.documentElement.scrollWidth <= innerWidth), `overflow at 130% text for ${id}`);
}
async function preview(page, id, lang, destination) {
  const before = await resources(page); await openIdea(page, id, lang);
  await page.locator('.advice-detail [data-do="showAdvice"]').click();
  await page.locator(destination).waitFor({ state: 'visible' });
  expect(await resources(page) === before, `reading/following ${id} changed gameplay resources`);
}

for (const lang of ['en', 'vi']) for (const width of [390, 1280]) {
  const label = `${lang} ${width}px`;
  let context;
  try {
    context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1,
      isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'reduce' });
    await context.addInitScript(({ lang, save }) => {
      localStorage.setItem('farm-village.language', lang);
      if (sessionStorage.getItem('guidance-seeded')) return;
      sessionStorage.setItem('guidance-seeded', '1');
      localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
    }, { lang, save: pack(fixture()) });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL_); await ready(page);
    await preview(page, 'picnic-porch', lang, '.panel[data-kind="exploration"] [data-do="inspectExploration"][data-step="porch"]');
    await preview(page, 'garden-lesson', lang, '.panel[data-kind="learning"] [data-do="inspectLearning"]');
    await preview(page, 'school-baskets', lang, '.panel[data-kind="schoolActivity"] [data-do="schoolStart"][data-difficulty="simple"]');
    await preview(page, 'clearing-room', lang, '.panel[data-kind="land"] [data-do="landBuy"]');
    await preview(page, 'pond-curiosity', lang, '.panel[data-kind="pond"]');
    // An actor/animal under the temporary screen position must not steal a camera-directed cell preview.
    await page.evaluate(() => {
      const { people, life } = farm.radial;
      window.guidancePickRestore = { pick: people.pick, talk: people.talk, animalAt: life.animalAt };
      window.guidancePickCounts = { person: 0, animal: 0, talk: 0 };
      people.pick = () => { window.guidancePickCounts.person++; return { id: 'june', pet: false, visitor: false }; };
      people.talk = () => { window.guidancePickCounts.talk++; };
      life.animalAt = () => { window.guidancePickCounts.animal++; return { home: 'guidanceSchool' }; };
    });
    await preview(page, 'stone-space', lang, '.radial:not([hidden]) [data-act="clear"]');
    expect(await page.evaluate(() => Object.values(window.guidancePickCounts).every(count => count === 0)), 'cell preview picked/talked to an unrelated actor');
    await page.evaluate(() => {
      Object.assign(farm.radial.people, { pick: window.guidancePickRestore.pick, talk: window.guidancePickRestore.talk });
      farm.radial.life.animalAt = window.guidancePickRestore.animalAt;
      delete window.guidancePickRestore; delete window.guidancePickCounts;
    });

    // A find completed while its old advice is open must not clear another rock or reopen a stale tool.
    await openIdea(page, 'stone-space', lang);
    await page.evaluate(() => { farm.game.s.discoveries.rocks = 2; farm.game.s.discoveries.claimed['stone-keepsake'] = farm.game.now; });
    const staleBefore = await resources(page); await page.locator('[data-do="showAdvice"]').click();
    await page.locator('.panel[data-kind="today"] .advice-list').waitFor();
    expect(await resources(page) === staleBefore, 'stale stone suggestion spent coins or granted a find');
    expect(await page.locator('.radial:not([hidden]) [data-act="clear"]').count() === 0, 'stale rock target reopened the clear tool');

    await page.evaluate(() => { farm.game.s.coins = 0; });
    await preview(page, 'street-save', lang, '.radial:not([hidden]) [data-act="repair"]');
    expect(await page.locator('.radial [data-act="repair"]').isDisabled(), 'unaffordable street repair was enabled');
    await page.evaluate(() => { farm.game.s.coins = 500; });
    await preview(page, 'street-repair', lang, '.radial:not([hidden]) [data-act="repair"]');
    expect(!await page.locator('.radial [data-act="repair"]').isDisabled(), 'affordable street repair was disabled');
    const oldCoins = await page.evaluate(() => farm.state().coins);
    await page.locator('.radial [data-act="repair"]').click();
    expect(await page.evaluate(oldCoins => !!farm.state().repairing.road_south && farm.state().coins < oldCoins, oldCoins), 'explicit repair did not start');

    // Defer with the real control, preserve it across a reload, and restore without making it unread again.
    await openIdea(page, 'garden-lesson', lang); const beforeDefer = await resources(page);
    await page.locator('[data-do="deferAdvice"]').click();
    expect(await resources(page) === beforeDefer, 'postponing advice changed resources');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('farm-village:save:1'))?.advice?.deferred?.includes('garden-lesson:garden/lesson'));
    await page.reload(); await ready(page); await today(page);
    expect(await page.locator('.advice-deferred [data-id="garden-lesson"]').count() === 1, 'postponed lesson lost after reload');
    await page.locator('.advice-deferred summary').click();
    await page.locator('.advice-deferred [data-id="garden-lesson"]').click();
    await page.locator('[data-do="restoreAdvice"]').click();
    expect(await page.evaluate(() => farm.state().advice.read.includes('garden-lesson:garden/lesson')
      && !farm.state().advice.deferred.includes('garden-lesson:garden/lesson')), 'restored lesson became unread or remained postponed');

    // One selected unread suggestion supplies June's speech, rather than a second branch-specific dialogue system.
    await page.waitForFunction(() => farm.people.walkers.has('june'), null, { timeout: 30000 });
    await page.evaluate(fixed => {
      farm.closeCards(); farm.panels.close(); farm.radial.hide();
      farm.game.s.advice.read = fixed.filter(key => !key.startsWith('garden-lesson:'));
      farm.game.s.advice.read.push('fishing-break:pond'); farm.game.s.advice.deferred = [];
      const june = farm.people.walkers.get('june'); june.indoors = false;
      farm.people.juneTip();
    }, fixed);
    expect(await page.evaluate(() => farm.people.juneTopic === 'garden-lesson'), 'June did not select the current unpaid lesson');
    expect((await page.locator('body').textContent()).includes(tr(lang, ADVICE_TOPICS['garden-lesson'].line)), 'June did not speak the localized lesson line');
    expect(!errors.length, errors.join('\n')); console.log(`ok   guidance follows real targets, stays optional and remembers choices (${label})`);
  } catch (error) { failures++; console.error(`FAIL guidance followup (${label})\n${error.stack}`); }
  finally { await context?.close(); }
}
await browser.close();
process.exitCode = failures ? 1 : 0;
