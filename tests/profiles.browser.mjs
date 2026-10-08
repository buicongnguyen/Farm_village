// Profile navigation, isolated progress, and import/reset regressions in both phone languages.
// Authored against the test build. GAME_URL defaults to the logic-lane port; no real saves are read.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { pack } from '../src/kit/save.mjs';
import { VI } from '../src/i18n/vi.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'farm-village-profiles'); mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const tr = (lang, text) => lang === 'vi' ? VI[text] ?? text : text;
const key = n => `farm-village:save:${n}`;
let failures = 0;

function fixture(coins = 321, name = 'First Farm') {
  const s = newGame(Date.now(), 82371, { restore: true });
  s.coins = coins; s.settings.playerName = name; s.settings.daylight = 'always'; s.settings.reducedMotion = true;
  s.barn.items.carrot = 7; s.people.ada = { hearts: 2, scenes: [], giftDay: '' };
  s.story.tutorial = 999; s.story.chapter = 5;
  return s;
}

async function check(name, fn) {
  let ctx;
  try {
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await fn(ctx); console.log('ok   ' + name);
  } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.stack); }
  finally { await ctx?.close(); }
}

async function seededPage(ctx, lang, slots = { 1: pack(fixture()) }, selected = '1') {
  await ctx.addInitScript(({ lang, slots, selected }) => {
    localStorage.setItem('farm-village.language', lang);
    if (sessionStorage.getItem('profiles-test-seeded')) return;
    sessionStorage.setItem('profiles-test-seeded', '1');
    for (const [n, value] of Object.entries(slots)) localStorage.setItem(`farm-village:save:${n}`, value);
    localStorage.setItem('farm-village:profile', selected);
  }, { lang, slots, selected });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_);
  return { page, errors };
}

async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { clearInterval(farm.game.timer); farm.skipIntro(); farm.closeCards(); farm.panels.close(); });
}
async function picker(page) {
  await page.click('[data-act="profiles"]');
  await page.waitForSelector('.panel[data-kind="profiles"] [data-profile-picker]');
}
async function switchTo(page, n) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click(`[data-profile-picker] [data-do="profile"][data-n="${n}"]`),
  ]);
  await ready(page);
}
async function identity(page) {
  return page.evaluate(() => {
    const s = farm.state();
    return { coins: s.coins, player: s.settings.playerName, carrot: s.barn.items.carrot ?? 0, hearts: s.people.ada?.hearts ?? 0,
      orders: s.stats.ordersFilled, wheat: s.barn.items.wheat ?? 0, mode: s.mode };
  });
}
async function phoneFit(page) {
  expect(await page.evaluate(() => {
    const panel = document.querySelector('.panel[data-kind="profiles"]'), hud = document.querySelector('[data-act="profiles"]');
    const p = panel.getBoundingClientRect(), h = hud.getBoundingClientRect();
    return p.left >= -1 && p.right <= innerWidth + 1 && p.bottom <= innerHeight + 1 && panel.scrollWidth <= panel.clientWidth + 1
      && h.width >= 44 && h.height >= 44 && h.left >= 0 && h.right <= innerWidth;
  }), 'profile picker or HUD does not fit a phone');
  expect(await page.locator('.profile-card .btn').evaluateAll(buttons => buttons.every(b => b.getBoundingClientRect().height >= 44)), 'profile actions are smaller than 44 px');
}

for (const lang of ['en', 'vi']) {
  await check('three separate farms preserve Profile 1 and reload progress (' + lang + ')', async ctx => {
    const { page, errors } = await seededPage(ctx, lang); await ready(page);
    const original = await identity(page);
    await picker(page);
    expect(await page.locator('.profile-card').count() === 3, 'expected exactly three profiles');
    expect(await page.locator('[data-profile-id="1"] [data-do="profile"]').isDisabled(), 'current farm should be marked Playing');
    expect((await page.textContent('[data-profile-id="1"]')).includes(tr(lang, 'Playing now')), 'current status is not localized');
    expect(await page.locator('[data-profile-id="2"]').getAttribute('data-profile-status') === 'empty', 'second farm was not empty');
    await phoneFit(page);
    await page.screenshot({ path: join(shots, `profiles-${lang}.png`) });
    await switchTo(page, 2);
    expect(await page.evaluate(() => farm.state().coins === 500 && farm.state().mode === 'restore' && Object.keys(farm.state().beds).length === 6), 'new Profile 2 must start restored with 500 coins');
    await page.evaluate(() => {
      const g = farm.game; g.do('setting', { key: 'playerName', value: 'Second' });
      const r = g.do('deliverOrder', { id: g.s.orders.cards[0].id }); if (!r.ok) throw Error(r.reason);
      farm.closeCards();
    });
    const second = await identity(page);
    await picker(page); await switchTo(page, 3);
    expect(await page.evaluate(() => farm.state().coins === 500 && farm.state().mode === 'restore'), 'new Profile 3 must start with 500 coins');
    await page.evaluate(() => farm.game.do('setting', { key: 'playerName', value: 'Third' }));
    const third = await identity(page);
    await picker(page); await switchTo(page, 1);
    expect(JSON.stringify(await identity(page)) === JSON.stringify(original), 'switching changed Profile 1 progress');
    await picker(page); await switchTo(page, 2);
    expect(JSON.stringify(await identity(page)) === JSON.stringify(second), 'Profile 2 progress did not survive switching');
    await page.reload(); await ready(page);
    expect(JSON.stringify(await identity(page)) === JSON.stringify(second), 'Profile 2 progress did not survive reload');
    expect(await page.textContent('[data-act="profiles"] .badge') === '2', 'HUD profile badge is wrong');
    await picker(page); await switchTo(page, 3);
    expect(JSON.stringify(await identity(page)) === JSON.stringify(third), 'Profile 3 progress did not survive switching');
    expect(!errors.length, errors.join(' | '));
  });

  await check('import and reset affect only the active farm and resist stale autosave (' + lang + ')', async ctx => {
    const first = pack(fixture()), { page, errors } = await seededPage(ctx, lang, { 1: first, 2: pack(fixture(642, 'Second')) }, '2');
    await ready(page);
    // Queue a stale debounce deliberately. Pagehide and that timer must not replace the imported farm.
    await page.evaluate(() => { farm.game.do('setting', { key: 'playerName', value: 'Before' }); farm.panels.show('settings'); });
    const imported = pack(fixture(777, 'Imported'));
    page.once('dialog', dialog => dialog.accept());
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.setInputFiles('[data-file]', { name: 'profile-import.json', mimeType: 'application/json', buffer: Buffer.from(imported) }),
    ]);
    await ready(page);
    expect(await page.evaluate(() => farm.state().coins === 777 && farm.state().settings.playerName === 'Imported'), 'old live farm overwrote imported data');
    await page.reload(); await ready(page);
    expect(await page.evaluate(() => farm.state().coins === 777 && farm.state().settings.playerName === 'Imported'), 'import failed to persist');
    expect(await page.evaluate(() => localStorage.getItem('farm-village:save:1')) === first, 'import touched Profile 1');
    await page.evaluate(() => { farm.game.do('setting', { key: 'playerName', value: 'BeforeReset' }); farm.panels.show('settings'); });
    page.once('dialog', dialog => dialog.accept());
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-do="newGame"]')]);
    await ready(page);
    expect(await page.evaluate(() => farm.state().coins === 500 && farm.state().settings.playerName === ''), 'autosave resurrected the reset farm');
    await page.reload(); await ready(page);
    expect(await page.evaluate(() => farm.state().coins === 500 && farm.state().settings.playerName === ''), 'reset did not persist across reload');
    expect(await page.evaluate(() => localStorage.getItem('farm-village:save:1')) === first, 'reset touched Profile 1');
    expect(!errors.length, errors.join(' | '));
  });

  await check('failed save keeps the current farm open (' + lang + ')', async ctx => {
    const { page, errors } = await seededPage(ctx, lang); await ready(page); await picker(page);
    await page.evaluate(() => {
      window.profileNoReload = true;
      farm.game.s.coins += 1; // require a real write even if the preceding debounce already saved the farm
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('farm-village:save:1')) throw new DOMException('Test quota failure', 'QuotaExceededError');
        return setItem.call(this, key, value);
      };
    });
    await page.click('[data-do="profile"][data-n="2"]');
    await page.locator('.toasts').getByText(tr(lang, 'Could not save your farm. Please try again.'), { exact: true }).waitFor();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.profileNoReload === true && farm.panels.profile === 1), 'failed save navigated away');
    expect(await page.evaluate(() => localStorage.getItem('farm-village:profile') === '1' && localStorage.getItem('farm-village:save:2') === null), 'failed save changed the target profile');
    expect(!errors.length, errors.join(' | '));
  });
}

await check('invalid active selector falls back to Profile 1 and player labels are escaped', async ctx => {
  const { page, errors } = await seededPage(ctx, 'en', { 1: pack(fixture(321)) }, '2.5'); await ready(page);
  expect(await page.evaluate(() => farm.panels.profile === 1 && farm.state().coins === 321), 'fractional profile selector was accepted');
  await page.evaluate(() => { farm.game.s.settings.playerName = '<img src=x onerror=alert(1)>'; });
  await picker(page);
  expect(await page.locator('.profile-player img').count() === 0, 'player name became markup');
  expect((await page.textContent('[data-profile-id="1"] .profile-player')).includes('<img'), 'escaped player name disappeared');
  // Restore a valid name before autosave runs; imported saves reject markup independently.
  await page.evaluate(() => { farm.game.s.settings.playerName = 'First Farm'; });
  expect(!errors.length, errors.join(' | '));
});

await check('corrupt active save opens recovery without replacing it; another farm remains playable', async ctx => {
  const corrupt = '{broken save', { page, errors } = await seededPage(ctx, 'vi', { 1: corrupt, 2: pack(fixture(654, 'Safe Farm')) });
  await page.waitForSelector('[data-profile-picker] [data-profile-id="1"][data-profile-status="corrupt"]', { timeout: 60000 });
  expect(await page.evaluate(() => !window.farm?.ready), 'corrupt profile silently started a fresh farm');
  expect(await page.locator('[data-profile-id="1"] [data-do="resetProfile"]').count() === 1, 'corrupt save has no explicit reset action');
  expect(await page.locator('[data-profile-id="1"][aria-current]').count() === 0, 'unopened corrupt farm is marked Playing');
  await switchTo(page, 2);
  expect(await page.evaluate(() => farm.state().coins === 654 && farm.panels.profile === 2), 'safe saved profile could not be continued');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:save:1')) === corrupt, 'recovery navigation overwrote the corrupt save');
  expect(!errors.length, errors.join(' | '));
});

await check('failed selector write cannot erase another corrupt profile', async ctx => {
  const corrupt = '{broken target', backup = '{broken target backup';
  const { page, errors } = await seededPage(ctx, 'vi', { 1: pack(fixture()), 2: corrupt, '2:backup': backup });
  await ready(page); const original = await identity(page); await picker(page);
  await page.evaluate(() => {
    window.profileResetMustStay = true;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'farm-village:profile') throw new DOMException('Test selector write failure', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  let accepted = false;
  page.once('dialog', async dialog => { accepted = true; await dialog.accept(); });
  await page.click('[data-profile-id="2"] [data-do="resetProfile"]');
  await page.locator('.toasts').getByText(tr('vi', 'Could not switch farms. Your current farm is still open.'), { exact: true }).waitFor();
  expect(accepted, 'reset confirmation was not accepted');
  expect(await page.evaluate(() => window.profileResetMustStay === true && farm.panels.profile === 1), 'failed selector write navigated away');
  expect(JSON.stringify(await identity(page)) === JSON.stringify(original), 'failed target reset changed the active farm');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:profile')) === '1', 'failed selector write changed active profile');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:save:2')) === corrupt, 'target primary was erased before selection succeeded');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:save:2:backup')) === backup, 'target backup was erased before selection succeeded');
  expect(!errors.length, errors.join(' | '));
});

await check('resetting the active farm does not need to rewrite its selector', async ctx => {
  const other = pack(fixture(864, 'Other Farm'));
  const { page, errors } = await seededPage(ctx, 'en', { 1: pack(fixture(321, 'Reset Me')), 2: other });
  await ready(page);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'farm-village:profile') {
        sessionStorage.setItem('blocked-selector-attempted', '1');
        throw new DOMException('Test selector write failure', 'QuotaExceededError');
      }
      return setItem.call(this, key, value);
    };
    farm.game.do('setting', { key: 'playerName', value: 'PendingReset' });
    farm.panels.show('settings');
  });
  page.once('dialog', dialog => dialog.accept());
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('[data-do="newGame"]')]);
  await ready(page);
  expect(await page.evaluate(() => farm.panels.profile === 1 && farm.state().coins === 500 && farm.state().settings.playerName === ''), 'active farm did not reset while selector writes were blocked');
  expect(await page.evaluate(() => sessionStorage.getItem('blocked-selector-attempted') === null), 'reset unnecessarily tried to rewrite its current selector');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:save:2')) === other, 'active reset changed another farm');
  await page.reload(); await ready(page);
  expect(await page.evaluate(() => farm.state().coins === 500 && farm.state().settings.playerName === ''), 'old autosave resurrected the active farm after reset');
  expect(!errors.length, errors.join(' | '));
});

await check('boot recovery imports into the original corrupt slot without touching healthy farms', async ctx => {
  const first = pack(fixture(345, 'First Safe')), third = pack(fixture(678, 'Third Safe'));
  const { page, errors } = await seededPage(ctx, 'vi', { 1: first, 2: '{broken active', 3: third }, '2');
  await page.waitForSelector('[data-recovery-file]', { state: 'attached', timeout: 60000 });
  expect(await page.evaluate(() => !window.farm?.ready), 'recovery import started an unsafe fresh farm first');
  const imported = pack(fixture(789, 'Recovered'));
  let accepted = false;
  page.once('dialog', async dialog => { accepted = true; await dialog.accept(); });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.setInputFiles('[data-recovery-file]', { name: 'recovered-farm.json', mimeType: 'application/json', buffer: Buffer.from(imported) }),
  ]);
  await ready(page);
  expect(accepted, 'recovery import confirmation was not accepted');
  expect(await page.evaluate(() => farm.panels.profile === 2 && farm.state().coins === 789 && farm.state().settings.playerName === 'Recovered'), 'recovery import did not restore the originally selected slot');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:profile')) === '2', 'recovery import changed the selected slot');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:save:1')) === first, 'recovery import changed Profile 1');
  expect(await page.evaluate(() => localStorage.getItem('farm-village:save:3')) === third, 'recovery import changed Profile 3');
  await page.reload(); await ready(page);
  expect(await page.evaluate(() => farm.panels.profile === 2 && farm.state().coins === 789 && farm.state().settings.playerName === 'Recovered'), 'recovered farm did not survive reload');
  expect(!errors.length, errors.join(' | '));
});

for (const operation of ['reset', 'import']) {
  await check('another tab changing the selected farm cannot redirect ' + operation, async ctx => {
    const other = pack(fixture(876, 'Other Farm'));
    const { page, errors } = await seededPage(ctx, 'en', { 1: pack(fixture()), 2: other });
    await ready(page);
    // The shared selector changes independently of this tab's live, slot-bound farm.
    await page.evaluate(() => { localStorage.setItem('farm-village:profile', '2'); farm.panels.show('settings'); });
    page.once('dialog', dialog => dialog.accept());
    const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    if (operation === 'reset') await page.click('[data-do="newGame"]');
    else await page.setInputFiles('.settings [data-file]', { name: 'replacement.json', mimeType: 'application/json', buffer: Buffer.from(pack(fixture(765, 'Imported Here'))) });
    await navigation; await ready(page);
    expect(await page.evaluate(() => farm.panels.profile) === 1, operation + ' opened another tab\'s farm');
    expect(await page.evaluate(() => farm.state().coins) === (operation === 'reset' ? 500 : 765), operation + ' did not load its own result');
    expect(await page.evaluate(() => localStorage.getItem('farm-village:save:2')) === other, operation + ' changed the other farm');
    expect(!errors.length, errors.join(' | '));
  });
}

await check('structurally incomplete import preserves the playing farm', async ctx => {
  const { page, errors } = await seededPage(ctx, 'en'); await ready(page);
  const original = await identity(page);
  await page.evaluate(() => farm.panels.show('settings'));
  await page.setInputFiles('.settings [data-file]', { name: 'incomplete.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 6, cells: [], placed: {} })) });
  await page.locator('.toasts').getByText(tr('en', 'That file is not a Farm Village save'), { exact: true }).waitFor();
  expect(JSON.stringify(await identity(page)) === JSON.stringify(original), 'invalid import changed the playing farm');
  await page.reload(); await ready(page);
  expect(JSON.stringify(await identity(page)) === JSON.stringify(original), 'invalid import replaced the saved farm');
  expect(!errors.length, errors.join(' | '));
});

await browser.close();
console.log(`${failures ? 'FAILED' : 'Passed'} profile browser checks; screenshots: ${shots}`);
process.exit(failures ? 1 : 0);
