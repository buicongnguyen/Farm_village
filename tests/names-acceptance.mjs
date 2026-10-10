// Exercise real named UI and old saved prose on both the instrumented and public builds.
import './tz.mjs';
import { chromium } from 'playwright';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { dayKey } from '../src/core/clock.mjs';
import { BEATS, CHAPTERS } from '../src/content/story.mjs';
import { FAMILIES, NEIGHBOURS } from '../src/content/people.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { ADVICE_TOPICS } from '../src/content/advice.mjs';
import { RUINS } from '../src/content/world.mjs';
import { personName, petName, familyName } from '../src/content/character-names.mjs';
import { LANGUAGES, getLocale, loadLanguage, tIn } from '../src/kit/i18n.mjs';
import { pack } from '../src/kit/save.mjs';

await Promise.all(LANGUAGES.map(({ id }) => loadLanguage(id)));
const LOCALES = LANGUAGES.map(({ id }) => id);
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-localized-names'); mkdirSync(shots, { recursive: true });
const expect = (ok, message) => { if (!ok) throw Error(message); };
const panel = page => page.locator('.panel:not([hidden])');
const OLD_ORDER = 'For my lunchbox. Pip says mine is the best one.';
const OLD_WISH = 'A bush by our house for hide-and-seek! Pip always finds me.';
const PLAYER = 'Ada Mai Pip';
const CUSTOM = 'Ada Mai Pip wrote this note.';

function fixture() {
  const now = Date.now(), s = newGame(now, 72841, { restore: true });
  s.level = 6; s.xp = xpFor(6); s.coins = 1000; s.barn.items = { wheat: 20, carrot: 8 }; s.barn.cap = 200;
  s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.projects = { step: 999, delivered: {} }; s.cond = {}; s.repairing = {}; s.beds = {};
  s.settings.reducedMotion = true; s.settings.daylight = 'always'; s.settings.textSize = 1.3; s.settings.playerName = PLAYER;
  s.today.day = dayKey(now); s.today.seen = true; s.today.claimed = true; s.helpAt = now + 86400000;
  s.quests.list = ['harvest', 'orders', 'fish'].map(t => ({ id: `names-${t}`, t, n: 1000, base: 0, coins: 20, xp: 1 }));
  const homes = Object.keys(s.placed).filter(id => s.placed[id].kind === 'cottage');
  s.placed['names-home'] = { kind: 'cottage', x: 41, z: 93, rot: 2 }; homes.push('names-home'); s.counts.cottage = 4;
  FAMILIES.forEach((family, i) => { s.homes[homes[i]] = { family: family.id, arrived: true, arrivesAt: now - 1000, level: 0, rentFrom: now }; });
  for (const kind of ['school', 'clinic']) { const site = RUINS.find(r => r.kind === kind); s.placed[`names-${kind}`] = { kind, x: site.x, z: site.z, rot: site.rot }; s.counts[kind] = 1; }
  s.orders.cards = [
    { id: 'legacy-names', from: 'bo', need: { wheat: 2 }, coins: 20, xp: 2, line: OLD_ORDER, readyAt: now },
    { id: 'legacy-mechanic', from: 'tomas', need: { corn: 99 }, coins: 30, xp: 3, line: "I fixed Gus's tractor. Time to celebrate.", readyAt: now },
    { id: 'custom-names', from: 'gus', need: { carrot: 99 }, coins: 40, xp: 4, line: CUSTOM, readyAt: now },
  ];
  s.orders.pending = Array(8).fill(now + 86400000);
  s.wishes = { day: dayKey(now), list: FAMILIES.map((family, i) => ({ home: homes[i], person: i ? family.people[0].id : 'bo', kind: 'bush', text: i ? 'A quiet place to sit.' : OLD_WISH, done: i > 0 })) };
  s.mail = LETTERS.map(l => ({ id: l.id, from: l.from, at: now - 1000, read: l.id !== 'ada-2' }));
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  s.learning = { ...s.learning, introducedAt: now, learnedAt: now, lessonIndex: 2, steps: ['uncover'], read: ['seed-label'], energy: 80, energyAt: now };
  s.firsts['learning:memory:seed-label'] = now; s.firsts['learning:read:seed-label'] = now;
  s.schoolActivity = { ...s.schoolActivity, rounds: 1, completed: 1, best: 3, lastScore: 3, memoryAt: now, memoryRead: true };
  s.firsts['school:memory'] = now; s.firsts['school:memoryRead'] = now;
  s.advice.read = ['order-ready:order/legacy-names'];
  return s;
}

async function close(page) {
  const card = page.locator('.modal [data-close]'); if (await card.count()) await card.click();
  const button = panel(page).locator('.panel-head [data-do="close"]'); if (await button.count()) await button.click();
}
async function open(page, kind, content) {
  await close(page); await page.locator(`.hud [data-act="${kind}"]`).click();
  await panel(page).locator(content).first().waitFor({ state: 'attached' });
}
async function enter(page, testMode) {
  if (testMode) await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  else {
    await page.locator('.main-menu [data-lang]').first().waitFor();
    const language = await page.locator('html').getAttribute('lang');
    expect(JSON.stringify(await page.locator('.main-menu [data-lang]').evaluateAll(buttons => buttons.map(button => button.dataset.lang))) === JSON.stringify(LOCALES), 'public menu language choices differ from complete editions');
    const choices = await page.locator('.main-menu [data-lang]').evaluateAll(buttons => buttons.map(button => [button.dataset.lang, button.lang, button.textContent, button.getAttribute('aria-pressed')]));
    expect(JSON.stringify(choices) === JSON.stringify(LANGUAGES.map(({ id, label }) => [id, id, label, String(id === language)])), 'public menu native labels or language accessibility state is wrong');
    expect((await page.locator('.main-menu').innerText()).includes(tIn(language, 'Choose your farm')), 'public menu did not translate');
    expect(await page.locator('.main-menu-card').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'language choices or profiles overflow public menu');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
    const date = new Intl.DateTimeFormat(getLocale(language), { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(saved.lastSeen));
    expect((await page.locator('.main-menu [data-profile-id="1"]').innerText()).includes(date), 'profile date ignores selected edition');
    await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
    await page.locator('.guide').waitFor({ state: 'attached', timeout: 60000 });
    expect(await page.evaluate(() => !window.farm), 'public build exposes a debug hook');
  }
  const daily = page.locator('.panel[data-kind="today"]:not([hidden])');
  if (await daily.isVisible()) await daily.locator('.panel-head [data-do="close"]').click();
}
async function fit(page, label) {
  const issue = await page.evaluate(() => {
    const el = document.querySelector('.modal .card-modal') ?? document.querySelector('.panel:not([hidden])');
    if (!el) return 'missing visible sheet';
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) return `sheet outside viewport: ${JSON.stringify(r.toJSON())}`;
    if (el.scrollWidth > el.clientWidth + 1) return 'horizontal sheet overflow';
    const text = el.textContent;
    if (/\{(?:person|pet|family):/.test(text) || /undefined/.test(text)) return 'unresolved identity';
    return '';
  });
  if (issue) await page.screenshot({ path: join(shots, `failure-${label.replaceAll(' ', '-')}-${await page.locator('html').getAttribute('lang')}.png`) });
  expect(!issue, `${label}: ${issue}`);
}
async function snapshot(page) {
  return page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('farm-village:save:1'));
    return JSON.stringify(Object.fromEntries(['coins', 'xp', 'level', 'barn', 'orders', 'wishes', 'story', 'firsts', 'discoveries', 'exploration', 'landDiscovery', 'learning', 'schoolActivity', 'mail', 'people', 'homes', 'contracts', 'growth', 'advice'].map(k => [k, s[k]])));
  });
}
async function changeLanguage(page, language) {
  await open(page, 'settings', '.settings');
  expect(await panel(page).locator('[data-name]').inputValue() === PLAYER, 'player input was translated');
  expect(await panel(page).locator('[data-key="lang"]').count() === LANGUAGES.length, 'language choices are missing or duplicated');
  await panel(page).locator(`[data-key="lang"][data-value="${language}"]`).click();
  await page.waitForFunction(lang => document.documentElement.lang === lang, language);
  const choices = await panel(page).locator('[data-key="lang"]').evaluateAll(buttons => buttons.map(button => [button.dataset.value, button.lang, button.textContent, button.getAttribute('aria-pressed')]));
  expect(JSON.stringify(choices) === JSON.stringify(LANGUAGES.map(({ id, label }) => [id, id, label, String(id === language)])), 'Settings native language labels or pressed state is wrong');
  expect(await panel(page).locator('.panel-head h2').innerText() === tIn(language, 'Settings'), 'Settings heading did not translate');
  expect(await page.locator('.hud [data-hud="coins"] b').innerText() === new Intl.NumberFormat(getLocale(language)).format(1000), 'coin separators ignore selected edition');
}
async function textSizes(page) {
  for (const value of ['1', '1.15', '1.3']) {
    await panel(page).locator(`[data-key="textSize"][data-value="${value}"]`).click();
    await page.waitForFunction(value => document.body.dataset.text === value, value);
    await fit(page, `Settings text ${value}`);
  }
}
async function renderedCjk(page, language, prefix) {
  if (!['ko', 'ja'].includes(language)) return;
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.friend .who > b' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts.some(font => font.glyphCount > 0 && !/LastResort|Nunito|Times New Roman/i.test(font.familyName)), `${language}: no rendered CJK font for the visible name`);
    appendFileSync(join(shots, 'rendered-fonts.jsonl'), JSON.stringify({ prefix, language, fonts }) + '\n');
  } finally { await cdp.detach(); }
}
async function namedSurfaces(page, language, prefix) {
  await open(page, 'orders', '[data-order-id="legacy-names"]');
  const old = panel(page).locator('[data-order-id="legacy-names"]');
  expect(await old.locator('.who-name > b').innerText() === personName('bo', language), 'legacy sender alias missing');
  expect((await old.locator('.line').innerText()).includes(personName('pip', language, 'short')), 'legacy order did not resolve its child reference');
  expect((await panel(page).locator('[data-order-id="legacy-mechanic"] .line').innerText()).includes(personName('gus', language, 'short')), 'legacy mechanic order did not resolve its neighbour');
  expect(await panel(page).locator('[data-order-id="custom-names"] .line').innerText() === CUSTOM, 'unknown saved text underwent global name replacement');
  await fit(page, 'orders'); await page.screenshot({ path: join(shots, `${prefix}-orders-${language}.png`) });
  await panel(page).locator('[data-order-id="legacy-mechanic"] .needs [data-do="goodHelp"]').click();
  await panel(page).locator('.good-help').waitFor();
  expect((await panel(page).innerText()).includes(tIn(language, 'Where to get it')), 'missing-ingredient help did not translate');
  expect(await panel(page).locator('[data-do="goodHelpSource"]').innerText() === tIn(language, 'Show the source'), 'source action did not translate');
  await fit(page, 'ingredient help');
  await panel(page).locator('[data-do="goodHelpBack"]').click();
  await panel(page).locator('[data-order-id="legacy-mechanic"]').waitFor();

  await open(page, 'today', '.wish');
  expect(await panel(page).locator('.wish b').first().innerText() === personName('bo', language), 'legacy wish speaker missing');
  expect((await panel(page).locator('.wish p').first().innerText()).includes(personName('pip', language, 'short')), 'legacy wish did not resolve its child reference');
  await panel(page).locator('[data-do="readAdvice"][data-id="order-ready"]').click();
  await panel(page).locator('.advice-detail').waitFor();
  expect(await panel(page).locator('.scene-line b').innerText() === personName('june', language), 'current advice has stale partner name');
  expect((await panel(page).locator('.scene-line p').innerText()).includes(tIn(language, ADVICE_TOPICS['order-ready'].line)), 'current advice lost its state-aware wording');
  await fit(page, 'advice');

  await open(page, 'friends', '.friends');
  for (const id of ['ada', 'cora', ...FAMILIES.flatMap(f => f.people.map(p => p.id))]) {
    const row = panel(page).locator('.friend').filter({ has: page.locator(`[data-person="${id}"]`) });
    expect(await row.locator('.who > b').innerText() === personName(id, language), `friend alias ${id}`);
  }
  await renderedCjk(page, language, prefix);
  await fit(page, 'friends'); await page.screenshot({ path: join(shots, `${prefix}-friends-${language}.png`) });

  await open(page, 'mail', '.letters');
  for (const id of ['ellis-1', 'mai-1']) {
    const at = await page.evaluate(id => JSON.parse(localStorage.getItem('farm-village:save:1')).mail.find(letter => letter.id === id).at, id);
    const date = new Intl.DateTimeFormat(getLocale(language), { day: 'numeric', month: 'short' }).format(new Date(at));
    expect(await panel(page).locator(`[data-do="readLetter"][data-id="${id}"] .lr-text small`).innerText() === date, 'letter date ignores selected edition');
    await panel(page).locator(`[data-do="readLetter"][data-id="${id}"]`).click();
    const letter = LETTERS.find(l => l.id === id);
    await page.locator('.modal .letter').waitFor();
    expect((await page.locator('.modal .letter h2').innerText()).includes(personName(letter.from, language)), 'letter sender did not localize');
    const paper = await page.locator('.modal .letter .paper').innerText();
    expect(paper === tIn(language, letter.text), 'letter reference/signature differs from authored locale');
    if (id === 'mai-1') for (const pet of ['hen_cloud', 'hen_drizzle']) expect(paper.includes(petName(pet, language, 'short')), `hen alias ${pet}`);
    await fit(page, 'letter'); await page.screenshot({ path: join(shots, `${prefix}-${id}-${language}.png`) });
    await page.locator('.modal [data-close]').click();
  }

  await open(page, 'settings', '.settings'); await panel(page).locator('[data-do="album"]').click();
  await panel(page).locator('.album').waitFor();
  const families = await panel(page).locator('.portrait-tile b').allTextContents();
  for (const family of FAMILIES) expect(families.includes(familyName(family.id, language)), `album family ${family.id}`);
  await panel(page).locator('[data-do="learningMemory"][data-id="seed-label"]').click();
  await panel(page).locator('.learning-memory').waitFor();
  const speakers = await panel(page).locator('.scene-line b').allTextContents();
  expect(JSON.stringify(speakers) === JSON.stringify(['pip', 'ada', 'minh'].map(id => personName(id, language))), 'learning memory speaker aliases');
  expect((await panel(page).innerText()).includes(personName('ellis', language, 'short')), 'learning memory still names old grandfather');
  await fit(page, 'memory'); await page.screenshot({ path: join(shots, `${prefix}-memory-${language}.png`) });

  await open(page, 'settings', '.settings'); await panel(page).locator('[data-do="album"]').click();
  await panel(page).locator('[data-do="schoolMemory"]').click(); await panel(page).locator('.school-memory').waitFor();
  const classroom = await panel(page).locator('.scene-line b').allTextContents();
  expect(JSON.stringify(classroom) === JSON.stringify(['cora', 'pip', 'june'].map(id => personName(id, language))), 'school memory speaker aliases');
  await fit(page, 'school memory');

  await open(page, 'village', '.journey');
  expect((await panel(page).innerText()).includes(petName('dog', language, 'short')), 'kennel roadmap still uses old pet label');
  await fit(page, 'roadmap');

  await open(page, 'settings', '.settings'); await panel(page).locator('[data-do="photo"]').click();
  await page.locator('.photo .stamp small').waitFor();
  const photographedAt = await page.evaluate(() => new Date().getTime());
  const stamp = new Intl.DateTimeFormat(getLocale(language), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(photographedAt));
  expect(await page.locator('.photo .stamp small').innerText() === stamp, 'photo stamp ignores selected edition');
  expect(await page.locator('.photo .stamp').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1; }), 'localized photo date overflows');
  await page.locator('.photo [data-p="close"]').click();
}

// A language change dismisses the old presentation; a queued visitor uses the locale at delivery.
// Only setup uses the test hook. Switching languages goes through the same Settings controls as public play.
async function transientLocales(page, language) {
  const other = LOCALES[(LOCALES.indexOf(language) + 1) % LOCALES.length];
  await open(page, 'settings', '.settings');
  const setup = await page.evaluate(line => {
    const walker = farm.people.walkers.get('ada');
    farm.people.say(walker, line, 10000);
    const toast = farm.hud.toast(line, 'info');
    window.nameTransient = { bubble: walker.bubble, toast };
    return !!walker.bubble?.isConnected && toast.isConnected;
  }, tIn(language, '{person:ada:display}'));
  expect(setup, 'existing transient fixture did not attach');
  await panel(page).locator('[data-key="lang"][data-value="' + other + '"]').click();
  await page.waitForFunction(lang => document.documentElement.lang === lang, other);
  expect(await page.evaluate(() => !window.nameTransient.bubble.isConnected && !window.nameTransient.toast.isConnected), 'old-language speech or toast survived a language switch');

  const visitor = NEIGHBOURS.find(p => p.id === 'mai');
  await page.evaluate(({ line, language }) => {
    farm.hud.event({ type: 'neighbourVisit', id: 'mai', comment: line, params: {} });
    document.querySelector('[data-key="lang"][data-value="' + language + '"]').click();
  }, { line: visitor.line, language });
  await page.waitForFunction(lang => document.documentElement.lang === lang, language);
  const expected = personName('mai', language) + ': ' + tIn(language, visitor.line);
  await page.waitForFunction(text => [...document.querySelectorAll('.toast .msg')].some(el => el.textContent === text), expected);
  expect(!(await page.locator('.toast .msg').allTextContents()).some(text => text.startsWith(personName('mai', other) + ':')), 'delayed visitor kept the name from the previous language');
}

async function composedName(page, language) {
  await open(page, 'settings', '.settings');
  await panel(page).locator('[data-name]').focus();
  const kept = await page.evaluate(async () => {
    const input = document.querySelector('.settings [data-name]');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    input.value = '하'; input.setSelectionRange(1, 1);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '하', inputType: 'insertCompositionText', isComposing: true }));
    const before = farm.game.s.settings.playerName;
    farm.game.emit({ ok: true, events: [{ type: 'tick' }] }, 'test-background');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const preserved = document.querySelector('.settings [data-name]') === input && input.isConnected && document.activeElement === input && input.value === '하' && input.selectionStart === 1;
    const unchanged = farm.game.s.settings.playerName === before;
    input.value = '하루ひなた';
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: input.value }));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: input.value, inputType: 'insertText' }));
    input.dispatchEvent(new Event('change', { bubbles: true })); input.blur();
    return { preserved, unchanged, committed: farm.game.s.settings.playerName };
  });
  expect(kept.preserved, 'background farm event replaced a focused CJK composition or its caret');
  expect(kept.unchanged, 'unfinished CJK composition was saved prematurely');
  expect(kept.committed === '하루ひなた', 'finished CJK name was not accepted literally');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('farm-village:save:1')).settings.playerName === '하루ひなた');
  await panel(page).locator(`[data-key="lang"][data-value="${language === 'ko' ? 'ja' : 'ko'}"]`).click();
  expect(await panel(page).locator('[data-name]').inputValue() === '하루ひなた', 'language switch translated a player-entered CJK name');
  await panel(page).locator(`[data-key="lang"][data-value="${language}"]`).click();
  await panel(page).locator('[data-name]').fill(PLAYER); await panel(page).locator('[data-name]').blur();
  await page.waitForFunction(name => JSON.parse(localStorage.getItem('farm-village:save:1')).settings.playerName === name, PLAYER);
}

export async function runNamesAcceptance(testMode) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  let failures = 0, checks = 0;
  try {
    for (const language of LOCALES) for (const width of [390, 1280]) {
      checks++; const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce', timezoneId: 'Asia/Seoul' });
      try {
        const s = fixture(), other = pack(newGame(s.createdAt, 92881, { restore: true })), prefix = `${testMode ? 'test' : 'production'}-${language}-${width}`;
        await context.addInitScript(({ value, other, language, now }) => {
          if (!sessionStorage.getItem('names-seeded')) {
            sessionStorage.setItem('names-seeded', '1'); localStorage.setItem('farm-village:profile', '1');
            localStorage.setItem('farm-village:save:1', value); localStorage.setItem('farm-village:save:2', other); localStorage.setItem('farm-village:save:3', other);
            localStorage.setItem('farm-village.language', language);
          }
          Date.now = () => now;
        }, { value: pack(s), other, language, now: s.createdAt });
        const page = await context.newPage(), errors = []; page.setDefaultTimeout(8000);
        page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`${r.status()} ${r.url()}`); });
        await page.goto(URL_); await enter(page, testMode);
        await open(page, 'settings', '.settings');
        await panel(page).locator('[data-name]').fill(PLAYER); await panel(page).locator('[data-name]').blur();
        const before = await snapshot(page);
        for (const lang of [language, ...LOCALES.filter(id => id !== language), language]) {
          await changeLanguage(page, lang); expect(await snapshot(page) === before, 'language switch changed saved progress or rewards');
          // Every edition has its own phone/desktop context. Walk full screens before and after the round trip;
          // intermediate selections still check actual translated Settings, formatting and immutable progress.
          if (lang === language) { await textSizes(page); await namedSurfaces(page, lang, prefix); }
          expect(await snapshot(page) === before, 'viewing localized identities changed saved progress or rewards');
        }
        const old = await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
        expect(old.orders.cards[0].line === OLD_ORDER && old.wishes.list[0].text === OLD_WISH, 'renaming rewrote old saved prose');
        expect(old.settings.playerName === PLAYER, 'player name changed');
        for (const slot of ['2', '3']) expect(await page.evaluate(slot => localStorage.getItem(`farm-village:save:${slot}`), slot) === other, `rename touched farm ${slot}`);
        if (testMode && ['ko', 'ja'].includes(language)) await composedName(page, language);
        if (testMode) { await transientLocales(page, language); expect(await snapshot(page) === before, 'transient relocalization changed saved progress'); }
        await page.reload(); await enter(page, testMode); await open(page, 'orders', '[data-order-id="legacy-names"]');
        expect((await panel(page).locator('[data-order-id="legacy-names"] .line').innerText()).includes(personName('pip', language, 'short')), 'localized legacy line lost after reload');
        expect(await snapshot(page) === before, 'reload changed progress after naming');
        expect(!errors.length, errors.join('\n'));
        console.log(`ok   names, legacy prose and locale-safe progress (${language}, ${width}, 130%)`);
      } catch (e) { failures++; console.log(`FAIL names (${language}, ${width})\n     ${e.stack}`); }
      finally { await context.close(); }
    }
    for (const language of LOCALES) {
      checks++; const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', timezoneId: 'Asia/Seoul' });
      try {
        const s = newGame(Date.now(), 93811, { restore: true }); s.settings.textSize = 1.3; s.settings.reducedMotion = true;
        await context.addInitScript(({ save, language }) => { localStorage.setItem('farm-village:save:1', save); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village.language', language); }, { save: pack(s), language });
        const page = await context.newPage(); await page.goto(URL_);
        if (!testMode) await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
        await page.locator('.modal .chapter').waitFor({ timeout: 60000 });
        const text = await page.locator('.modal .chapter').innerText();
        expect(text.includes(personName('ada', language, 'short')) && text.includes(personName('ellis', language, 'short')), 'opening story lost localized grandparents');
        expect(text.includes(tIn(language, CHAPTERS[0].ada)), 'opening guide line did not localize');
        await fit(page, 'opening chapter'); await page.screenshot({ path: join(shots, `${testMode ? 'test' : 'production'}-opening-${language}.png`) });
        console.log(`ok   localized opening chapter (${language}, 390, 130%)`);
      } catch (e) { failures++; console.log(`FAIL names opening (${language})\n     ${e.stack}`); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(`${checks - failures}/${checks} localized-name checks passed.`); return failures;
}
