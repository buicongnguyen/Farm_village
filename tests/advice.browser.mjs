// Persistent, optional advice through real controls; deterministic fixtures keep incidental orders and visits out.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'farm-village-advice'); mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
const line = (lang, text, params = {}) => tr(lang, text).replace(/\{(\w+)\}/g, (whole, key) => {
  const value = params[key]; return value == null ? whole : typeof value === 'string' ? tr(lang, value) : String(value);
});
const ORDER = 'advice-order', SURPLUS = 'order-bread-surplus';
let failures = 0;

function fixture() {
  const now = Date.now(), s = newGame(now, 51227, { restore: true });
  s.level = 4; s.xp = xpFor(4); s.stats.harvested = 1;
  s.story.tutorial = 999; s.story.chapter = 5; s.today.seen = true; s.today.claimed = true;
  s.settings.reducedMotion = true; s.settings.daylight = 'always';
  s.projects = { step: 4, delivered: {} }; // five loaves remain reserved for the second cottage
  const bakery = Object.keys(s.placed).find(id => s.placed[id].kind === 'bakery');
  delete s.cond[bakery]; delete s.repairing[bakery];
  s.production[bakery] = { slots: 2, queue: [] };
  s.barn.items = { bread: 8, corn: 4, egg: 4 };
  s.orders.cards = [{ id: ORDER, from: 'mai', need: { corn_bread: 2 }, coins: 140, xp: 4,
    line: NEIGHBOURS.find(n => n.id === 'mai').orders[0], readyAt: now }];
  // tickOrders otherwise adds a fillable extra order before the advice fixture is visible.
  s.orders.pending = Array(4).fill(now + 86_400_000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  s.advice = { read: [], deferred: [], celebrated: {}, retired: [] };
  // One earned, unread find makes the combined badge distinguishable from advice-only counting.
  s.discoveries = { catches: 2, rocks: 0, claimed: { 'pond-tin': now }, retired: [], read: [] };
  s.firsts['discovery:pond-tin'] = now; s.fishing.caught = 2; s.stats.fished = 2; s.album.fish.perch = 2;
  s.coins += 20; s.stats.coinsEarned += 20;
  return s;
}
async function check(name, run) {
  let context;
  try {
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await run(context); console.log('ok   ' + name);
  } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.stack); }
  finally { await context?.close(); }
}
async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    const g = farm.game, now = g.now; clearInterval(g.timer); g.clock = () => now;
    farm.skipIntro(); farm.closeCards(); farm.panels.close();
    document.body.classList.add('reduced-motion');
  });
}
async function open(context, lang) {
  await context.addInitScript(({ lang, save }) => {
    localStorage.setItem('farm-village.language', lang);
    if (sessionStorage.getItem('advice-seeded')) return;
    sessionStorage.setItem('advice-seeded', '1');
    localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
  }, { lang, save: pack(fixture()) });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_); await ready(page); return { page, errors };
}
async function today(page) {
  await page.evaluate(() => { farm.closeCards(); farm.panels.close(); });
  await page.click('[data-act="today"]');
  await page.waitForSelector('.panel[data-kind="today"] .advice-card');
}
const readButton = (page, id) => page.locator(`.panel[data-kind="today"] [data-do="readAdvice"][data-id="${id}"]`);
async function openAdvice(page, id) {
  await readButton(page, id).click();
  await page.waitForSelector(`.sheet[data-kind="advice"] .advice-detail[data-advice-id="${id}"]`);
}
async function badge(page, expected) {
  const value = await page.locator('[data-act="today"] .badge').evaluate(el => ({ text: el.textContent, hidden: el.hidden }));
  expect(value.text === (expected ? String(expected) : '') && (!expected || !value.hidden), 'wrong combined badge: ' + JSON.stringify(value));
}
async function resources(page) {
  return page.evaluate(() => {
    const s = farm.state(); return JSON.stringify({ coins: s.coins, barn: s.barn, production: s.production, placed: s.placed,
      repairing: s.repairing, orders: s.orders, coinsEarned: s.stats.coinsEarned, discoveryClaims: s.discoveries.claimed });
  });
}
async function currentTopics(page) {
  return page.locator('.panel[data-kind="today"] .advice-card[data-advice-id]').evaluateAll(cards => cards
    .filter(card => !card.closest('.advice-deferred')).map(card => card.dataset.adviceId).sort());
}
async function content(page, lang, id, params = {}) {
  const text = await page.locator('.advice-detail').textContent(), topic = ADVICE_TOPICS[id];
  for (const value of [topic.title, topic.line, topic.reason]) expect(text.includes(line(lang, value, params)), 'wrong advice text: ' + id + ' / ' + value);
  expect(await page.locator('.sheet[data-kind="advice"]').evaluate(el => {
    const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
  }), 'advice detail overflows the phone');
}
async function changeFacts(page, change, emit = true) {
  await page.evaluate(({ change, emit }) => {
    const g = farm.game, bakery = Object.keys(g.s.placed).find(id => g.s.placed[id].kind === 'bakery');
    if (change === 'missing-egg') delete g.s.barn.items.egg;
    if (change === 'ingredients') g.s.barn.items.egg = 4;
    if (change === 'broken') g.s.cond[bakery] = { level: 3, ms: 0 };
    if (change === 'working') { delete g.s.cond[bakery]; delete g.s.repairing[bakery]; }
    if (emit) g.emit({ ok: true, events: [] }, 'test');
  }, { change, emit });
}

for (const lang of ['en', 'vi']) {
  await check('contextual advice is optional, persists read/defer history, and shares the unread badge (' + lang + ')', async context => {
    const { page, errors } = await open(context, lang); await today(page);
    expect(JSON.stringify(await currentTopics(page)) === JSON.stringify(['fishing-break', SURPLUS].sort()), 'fixture did not choose bread surplus and optional fishing');
    await badge(page, 3); // two new ideas plus one unread earned discovery
    const before = await resources(page);
    await openAdvice(page, SURPLUS); await content(page, lang, SURPLUS, { good: 'Corn bread' }); await badge(page, 2);
    expect(await resources(page) === before, 'reading advice spent, produced, delivered, repaired or rewarded');
    await page.screenshot({ path: join(shots, `advice-${lang}.png`) });
    await page.click('.advice-detail [data-do="showAdvice"]');
    await page.waitForSelector('.panel[data-kind="production"]');
    expect(await resources(page) === before, 'Show me must preview the maker without starting a batch or spending');
    await today(page); await openAdvice(page, SURPLUS);
    await page.click('.advice-detail [data-do="deferAdvice"]');
    await page.waitForSelector('.panel[data-kind="today"]');
    expect(!(await currentTopics(page)).includes(SURPLUS), 'Maybe later left the idea in the current list');
    await badge(page, 2);
    const history = await page.evaluate(() => {
      if (!window.__fvSave()) throw Error('save failed'); return structuredClone(farm.state().advice);
    });
    expect(history.read.includes(`${SURPLUS}:order/${ORDER}/corn_bread`) && history.deferred.includes(`${SURPLUS}:order/${ORDER}/corn_bread`), 'acknowledgement and deferral were not saved by stable context');
    await page.reload(); await ready(page); await today(page); await badge(page, 2);
    expect(!(await currentTopics(page)).includes(SURPLUS), 'reload replayed a deferred idea');
    expect(JSON.stringify(await page.evaluate(() => farm.state().advice)) === JSON.stringify(history), 'reload changed advice history');
    await page.locator('.advice-deferred summary').click();
    expect(await page.locator(`.advice-deferred [data-do="readAdvice"][data-id="${SURPLUS}"]`).isVisible(), 'postponed idea cannot be found again');
    await openAdvice(page, SURPLUS); await content(page, lang, SURPLUS, { good: 'Corn bread' });
    await page.click('.advice-detail [data-do="restoreAdvice"]');
    await page.waitForSelector('.panel[data-kind="today"]');
    expect((await currentTopics(page)).includes(SURPLUS), 'restored idea did not return'); await badge(page, 2);
    const restored = await page.evaluate(() => structuredClone(farm.state().advice));
    const other = lang === 'en' ? 'vi' : 'en';
    // The HUD hides Settings while a sheet is open; leave Today through its real close control.
    await page.click('.panel[data-kind="today"] [data-do="close"]');
    await page.click('[data-act="settings"]'); await page.click(`.settings [data-do="setting"][data-key="lang"][data-value="${other}"]`);
    await page.waitForFunction(lang => document.documentElement.lang === lang, other);
    await today(page); expect((await currentTopics(page)).includes(SURPLUS), 'locale changed topic eligibility'); await badge(page, 2);
    await openAdvice(page, SURPLUS); await content(page, other, SURPLUS, { good: 'Corn bread' });
    expect(JSON.stringify(await page.evaluate(() => farm.state().advice)) === JSON.stringify(restored), 'locale change or rereading reset saved advice history');
    expect(await resources(page) === before, 'defer, restore, locale switch or reload changed resources');
    expect(!errors.length, errors.join(' | '));
  });

  await check('advice replaces stale surplus claims with actual blockers and keeps celebrations optional (' + lang + ')', async context => {
    const { page, errors } = await open(context, lang); await today(page);
    await changeFacts(page, 'missing-egg'); await today(page);
    expect((await currentTopics(page)).includes('order-ingredient') && !(await currentTopics(page)).includes(SURPLUS), 'missing ingredient still presented as an available bread-surplus opportunity');
    await openAdvice(page, 'order-ingredient'); await content(page, lang, 'order-ingredient', { good: 'Corn bread', ingredient: 'Egg' });
    await changeFacts(page, 'ingredients'); await changeFacts(page, 'broken'); await today(page);
    expect((await currentTopics(page)).includes('maker-broken') && !(await currentTopics(page)).includes(SURPLUS), 'broken maker was hidden behind a generic available-batch tip');
    await openAdvice(page, 'maker-broken'); await content(page, lang, 'maker-broken', { good: 'Corn bread', building: 'Bakery' });
    const broken = await resources(page);
    await page.click('.advice-detail [data-do="showAdvice"]');
    expect(await resources(page) === broken, 'repair preview started or paid for repairs');
    await changeFacts(page, 'working'); await today(page); await openAdvice(page, SURPLUS);
    // The world may change while a card is open: following an obsolete card must not create work or spend money.
    await changeFacts(page, 'missing-egg', false); const stale = await resources(page);
    await page.click('.advice-detail [data-do="showAdvice"]');
    expect(await resources(page) === stale, 'following stale advice changed resources');
    await today(page); expect((await currentTopics(page)).includes('order-ingredient'), 'stale advice did not re-evaluate actual ingredients');
    await changeFacts(page, 'ingredients');
    // A real collection earns the first-bread memory; opening that memory is a separate optional action.
    await page.evaluate(() => {
      const g = farm.game, bakery = Object.keys(g.s.placed).find(id => g.s.placed[id].kind === 'bakery');
      g.s.production[bakery].queue = [{ recipe: 'bread', doneAt: g.now - 1 }];
      farm.panels.show('production', bakery);
    });
    const coins = await page.evaluate(() => farm.state().coins);
    await page.click('.panel[data-kind="production"] [data-do="collectProducts"]');
    expect(await page.evaluate(() => !!farm.state().advice.celebrated['first-bread']), 'first actual bread collection did not earn its memory');
    expect(await page.locator('.advice-detail').count() === 0, 'celebration interrupted play with a mandatory advice card');
    expect(await page.evaluate(() => farm.state().coins) === coins, 'first-bread advice paid an extra reward');
    await today(page); await openAdvice(page, 'first-bread'); await content(page, lang, 'first-bread');
    expect(await page.evaluate(() => farm.state().coins) === coins, 'reading a celebration paid again');
    expect(!errors.length, errors.join(' | '));
  });
}
await browser.close();
console.log(failures ? `${failures} advice browser checks failed` : 'advice browser checks passed');
process.exitCode = failures ? 1 : 0;
