// Exercise real menu loading with isolated browser stores; no game hook or server mutation is used.
import './tz.mjs';
import { chromium } from 'playwright';
import { newGame } from '../src/core/state.mjs';
import { pack } from '../src/kit/save.mjs';
import { BEATS } from '../src/content/story.mjs';
import { dayKey } from '../src/core/clock.mjs';
import { LANGUAGES, loadLanguage, tIn } from '../src/kit/i18n.mjs';

await Promise.all(LANGUAGES.map(({ id }) => loadLanguage(id)));
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const menuURL = new URL(URL_); menuURL.searchParams.set('menu', '');
const expect = (ok, why) => { if (!ok) throw Error(why); };
const marker = id => tIn(id, 'Choose your farm');
async function timed(promise, message) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(message)), 15000); })]); }
  finally { clearTimeout(timer); }
}
const selected = (page, id) => page.waitForFunction(id => document.documentElement.lang === id && document.querySelector(`.main-menu [data-lang="${id}"]`)?.classList.contains('primary'), id);
const stores = page => page.evaluate(() => JSON.stringify([1, 2, 3].map(id => localStorage.getItem(`farm-village:save:${id}`))));
async function seed(context, language = 'en', quietFarm = false) {
  const state = newGame(Date.now(), 47845, { restore: true });
  if (quietFarm) {
    state.story = { ...state.story, chapter: 999, tutorial: 999, beats: BEATS.map(beat => beat.id) };
    state.today = { ...state.today, day: dayKey(Date.now()), seen: true, claimed: true };
    state.settings.playerName = 'Maple'; state.settings.reducedMotion = true;
  }
  const save = pack(state);
  await context.addInitScript(({ language, save }) => {
    if (language) localStorage.setItem('farm-village.language', language);
    else localStorage.removeItem('farm-village.language');
    localStorage.setItem('farm-village:profile', '1');
    for (const id of [1, 2, 3]) localStorage.setItem(`farm-village:save:${id}`, save);
  }, { language, save });
}

export async function runLocaleLoadingAcceptance() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let failures = 0, checks = 0;
  async function run(name, fn, locale = 'en-US') {
    checks++; const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'Asia/Seoul' });
    try {
      const page = await context.newPage(), errors = []; page.setDefaultTimeout(15000);
      page.on('pageerror', e => errors.push(e.message));
      await fn(page, context);
      expect(!errors.length, errors.join('\n'));
      console.log(`ok   locale loading: ${name}`);
    } catch (e) { failures++; console.log(`FAIL locale loading: ${name}\n${e.stack}`); }
    finally { await context.close(); }
  }
  try {
    for (const { id, locale } of LANGUAGES) await run(`browser ${locale} selects complete ${id} menu`, async (page, context) => {
      await seed(context, null); const fetched = new Set();
      await page.route('**/assets/*.js*', async route => {
        const response = await route.fetch(), body = await response.text();
        for (const lang of ['vi', 'ko', 'ja']) if (body.includes(marker(lang))) fetched.add(lang);
        await route.fulfill({ response, body });
      });
      await page.goto(menuURL.href); await selected(page, id);
      expect(await page.locator('.main-menu h2').innerText() === marker(id), 'cold menu fell back to English');
      expect(await page.locator('.main-menu [data-lang]').count() === LANGUAGES.length, 'complete language choices are missing');
      expect(await page.locator('.main-menu-card').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'four menu choices overflow phone');
      expect(JSON.stringify([...fetched].sort()) === JSON.stringify(id === 'en' ? [] : [id]), `unrequested language catalogs loaded: ${[...fetched]}`);
    }, locale);

    for (const outcome of ['resolve', 'reject']) await run(`latest selection survives an older Korean ${outcome}`, async (page, context) => {
      await seed(context); let release, reached;
      const gate = new Promise(resolve => { release = resolve; }), intercepted = new Promise(resolve => { reached = resolve; });
      await page.route('**/assets/*.js*', async route => {
        const response = await route.fetch(), body = await response.text();
        if (body.includes(marker('ko'))) {
          reached(); await gate;
          if (outcome === 'reject') return route.abort('internetdisconnected');
        }
        await route.fulfill({ response, body });
      });
      try {
        await page.goto(menuURL.href); await selected(page, 'en'); const before = await stores(page), url = page.url();
        await page.locator('.main-menu [data-lang="ko"]').click(); await timed(intercepted, 'Korean catalog request was not intercepted');
        expect(await page.locator('html').getAttribute('lang') === 'en', 'pending Korean changed the selected language');
        expect(await page.locator('.main-menu [data-do="profile"]').evaluateAll(buttons => buttons.every(button => button.disabled)), 'profile entry remained active during a pending language download');
        await page.locator('.main-menu [data-lang="ja"]').click(); await selected(page, 'ja');
        release(); await page.waitForTimeout(350);
        expect(await page.locator('html').getAttribute('lang') === 'ja', 'older language completion overrode Japanese');
        expect(await page.locator('.main-menu [data-language-error]').isHidden(), 'stale language error replaced successful selection');
        expect(await page.locator('.main-menu [data-do="profile"]').evaluateAll(buttons => buttons.every(button => !button.disabled)), 'profile buttons stayed locked after latest language loaded');
        expect(await stores(page) === before, 'switch race changed a saved farm'); expect(page.url() === url, 'language race caused a page reload');
      } finally { release(); }
    });

    for (const id of ['vi', 'ko', 'ja']) await run(`${id} failed download stays playable and retries without reload`, async (page, context) => {
      await seed(context); let failuresLeft = 1, attempts = 0;
      await page.route('**/assets/*.js*', async route => {
        const response = await route.fetch(), body = await response.text();
        if (body.includes(marker(id))) { attempts++; if (failuresLeft-- > 0) return route.abort('internetdisconnected'); }
        await route.fulfill({ response, body });
      });
      await page.goto(menuURL.href); await selected(page, 'en'); const before = await stores(page), url = page.url();
      await page.locator(`.main-menu [data-lang="${id}"]`).click();
      await page.locator('.main-menu [data-language-error]:not([hidden])').waitFor();
      expect(await page.locator('html').getAttribute('lang') === 'en', 'failed catalog exposed partial translations');
      expect(await page.locator('.main-menu [data-language-error]').innerText() === tIn('en', 'Could not load this language. Check your connection.'), 'catalog error did not explain retry');
      expect(await page.locator('.main-menu [data-do="profile"]').evaluateAll(buttons => buttons.every(button => !button.disabled)), 'failed language trapped the player at the menu');
      await page.locator(`.main-menu [data-lang="${id}"]`).click(); await selected(page, id);
      expect(attempts >= 2, 'retry did not request a new catalog URL');
      expect(await page.locator('.main-menu [data-language-error]').isHidden(), 'error remained after successful retry');
      expect(await stores(page) === before, 'retry changed a saved farm'); expect(page.url() === url, 'catalog failure reloaded the game');
    });

    await run('choosing fallback English replaces a failed saved Korean preference', async (page, context) => {
      const save = pack(newGame(Date.now(), 48945, { restore: true }));
      await context.addInitScript(save => {
        if (sessionStorage.getItem('fallback-seeded')) return;
        sessionStorage.setItem('fallback-seeded', '1'); localStorage.setItem('farm-village.language', 'ko');
        localStorage.setItem('farm-village:profile', '1');
        for (const id of [1, 2, 3]) localStorage.setItem(`farm-village:save:${id}`, save);
      }, save);
      let attempts = 0;
      await page.route('**/assets/*.js*', async route => {
        const response = await route.fetch(), body = await response.text();
        if (body.includes(marker('ko'))) { attempts++; return route.abort('internetdisconnected'); }
        await route.fulfill({ response, body });
      });
      await page.goto(menuURL.href); await selected(page, 'en'); const before = await stores(page);
      expect(await page.evaluate(() => localStorage.getItem('farm-village.language')) === 'ko', 'fixture did not preserve its failed requested edition');
      await page.locator('.main-menu [data-lang="en"]').click();
      expect(await page.evaluate(() => localStorage.getItem('farm-village.language')) === 'en', 'choosing current fallback English failed to persist');
      await page.reload(); await selected(page, 'en');
      expect(attempts === 1, 'reload retried a language the player explicitly left');
      expect(await stores(page) === before, 'fallback selection changed saved farms');
    });

    for (const id of ['ko', 'ja']) for (const compose of [true, false]) await run(`${id} pending Settings download preserves ${compose ? 'IME draft and committed name' : 'unchanged focused name until blur'}`, async (page, context) => {
      await seed(context, 'en', true); let release, reached;
      const gate = new Promise(resolve => { release = resolve; }), intercepted = new Promise(resolve => { reached = resolve; });
      await page.route('**/assets/*.js*', async route => {
        const response = await route.fetch(), body = await response.text();
        if (body.includes(marker(id))) { reached(); await gate; }
        await route.fulfill({ response, body });
      });
      try {
        await page.goto(menuURL.href); await selected(page, 'en');
        const otherProfiles = await page.evaluate(() => JSON.stringify([2, 3].map(id => localStorage.getItem(`farm-village:save:${id}`))));
        await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
        await page.locator('.guide').waitFor({ state: 'attached', timeout: 60000 });
        const daily = page.locator('.panel[data-kind="today"]:not([hidden])');
        if (await daily.isVisible()) await daily.locator('.panel-head [data-do="close"]').click();
        await page.locator('.hud [data-act="settings"]').click();
        await page.locator(`.panel [data-key="lang"][data-value="${id}"]`).click();
        await timed(intercepted, 'Settings language request was not intercepted');
        const input = await page.locator('.panel input[data-name]').elementHandle();
        const draft = compose ? (id === 'ko' ? '하' : 'ひ') : 'Maple';
        await input.evaluate((el, { compose, draft }) => {
          el.focus();
          if (compose) { el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); el.value = draft; el.dispatchEvent(new InputEvent('input', { bubbles: true, data: draft, isComposing: true })); }
          el.setSelectionRange(1, 1);
        }, { compose, draft });
        release(); await page.waitForFunction(id => document.documentElement.lang === id, id);
        await page.waitForTimeout(1200); // Cross the real background refresh interval while editing.
        expect(await input.evaluate((el, draft) => el.isConnected && el === document.activeElement && el.value === draft && el.selectionStart === 1, draft), 'download completion replaced the active name field, draft or caret');
        expect(await page.locator('.panel-head h2').innerText() === tIn('en', 'Settings'), 'Settings rerendered during an active composition');
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')).settings.playerName) === 'Maple', 'uncommitted IME text was saved');
        const name = compose ? (id === 'ko' ? '하루' : 'ひなた') : 'Maple';
        await input.evaluate((el, { compose, name }) => {
          if (compose) { el.value = name; el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: name })); el.dispatchEvent(new InputEvent('input', { bubbles: true, data: name })); el.dispatchEvent(new Event('change', { bubbles: true })); }
          el.blur();
        }, { compose, name });
        await page.waitForFunction(copy => document.querySelector('.panel-head h2')?.textContent === copy, tIn(id, 'Settings'));
        expect(await page.locator('.panel input[data-name]').inputValue() === name, 'deferred Settings render lost the literal player name');
        expect(await page.locator(`.panel [data-key="lang"][data-value="${id}"]`).getAttribute('aria-pressed') === 'true', 'deferred Settings render kept the old selected language');
        await page.waitForFunction(name => JSON.parse(localStorage.getItem('farm-village:save:1')).settings.playerName === name, name);
        expect(await page.evaluate(() => JSON.stringify([2, 3].map(id => localStorage.getItem(`farm-village:save:${id}`)))) === otherProfiles, 'Settings language/name edit changed another profile');
      } finally { release(); }
    });

    // These messages live in index.html because no translation module is available when the entry file fails.
    for (const [id, copy, button] of [
      ['en', 'The farm could not load. Check your connection.', 'Try again'],
      ['vi', 'Không tải được trò chơi. Hãy kiểm tra kết nối mạng.', 'Thử lại'],
      ['ko', '농장을 불러올 수 없어요. 인터넷 연결을 확인해 주세요.', '다시 시도'],
      ['ja', '農場を読み込めませんでした。通信状況を確認してください。', 'もう一度'],
    ]) await run(`${id} can recover a failed entry before catalogs load`, async (page, context) => {
      await seed(context, id);
      await context.addInitScript(() => sessionStorage.setItem('fv-fresh-reload', String(Date.now())));
      await page.route('**/assets/game.js*', route => route.abort('internetdisconnected'));
      await page.goto(menuURL.href);
      await page.locator('#boot .boot-error button').waitFor();
      expect(await page.locator('html').getAttribute('lang') === id, 'boot recovery language metadata does not match its copy');
      expect(await page.locator('#boot .boot-error p').innerText() === copy, 'boot recovery message used the wrong language');
      expect(await page.locator('#boot .boot-error button').innerText() === button, 'boot retry action used the wrong language');
      const before = await stores(page);
      expect(await page.locator('#boot .boot-error').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1; }), 'boot recovery text overflows phone');
      await page.unroute('**/assets/game.js*');
      await page.locator('#boot .boot-error button').click(); await selected(page, id);
      expect(await stores(page) === before, 'boot recovery changed saved farms');
    });
  } finally { await browser.close(); }
  console.log(`${checks - failures}/${checks} language loading checks passed.`); return failures;
}
