// Runtime Vietnamese regressions: nested names, restore text, visitor remarks and repair news.
// Run against a test build: GAME_URL=http://127.0.0.1:5241/ node tests/i18n.browser.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VI } from '../src/i18n/vi.mjs';
import { STEPS } from '../src/content/projects.mjs';
import { FAMILIES, NEIGHBOURS } from '../src/content/people.mjs';
import { ROAD_SEGMENTS } from '../src/content/world.mjs';
import { BUILDINGS } from '../src/content/buildings.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const SHOTS = process.env.SHOTS_DIR ?? join(tmpdir(), 'farm-village-i18n');
mkdirSync(SHOTS, { recursive: true });
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;
const expect = (ok, message) => { if (!ok) throw new Error(message); };
const vi = (key, params = {}) => {
  expect(typeof VI[key] === 'string', `Missing Vietnamese fixture: ${key}`);
  return VI[key].replace(/\{(\w+)\}/g, (m, k) => k in params ? String(params[k]) : m);
};
async function open() {
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errors = [];
  await ctx.addInitScript(() => localStorage.setItem('farm-village.language', 'vi'));
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL_ + '?new&restore');
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => { farm.skipIntro(); farm.game.s.settings.daylight = 'always'; });
  return { ctx, page, errors };
}
async function check(name, test) {
  let fixture;
  try {
    fixture = await open();
    await test(fixture.page);
    expect(!fixture.errors.length, fixture.errors.join(' | '));
    console.log(`ok   ${name}`);
  } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.stack}`); }
  finally { await fixture?.ctx.close(); }
}
/** Vertical lists may scroll; their visible panel and text must fit the phone width. */
async function fits(page, selector) {
  await page.waitForTimeout(350); // let the sheet's opening animation settle
  const bad = await page.evaluate(selector => {
    const el = document.querySelector(selector); if (!el) return `${selector} is missing`;
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) return `${selector} is off screen`;
    if (el.scrollWidth > el.clientWidth + 1) return `${selector} overflows horizontally`;
    for (const child of el.querySelectorAll('p,b,h2,h3,small,button')) {
      const q = child.getBoundingClientRect();
      if (q.width && (q.left < r.left - 1 || q.right > r.right + 1)) return `Text outside panel: ${child.textContent}`;
    }
    return '';
  }, selector);
  expect(!bad, bad);
}

await check('Vietnamese boot, restored project status and nested build locks', async page => {
  expect(await page.getAttribute('html', 'lang') === 'vi', 'Vietnamese boot did not set document language');
  // The duplicate project row is now a single village/roadmap tracker; retain translated goal coverage.
  const index = STEPS.findIndex(s => s.id === 'cottage1');
  await page.evaluate(index => {
    farm.game.s.projects.step = index; farm.game.s.level = 10; farm.hud.update();
  }, index);
  const status = (await page.textContent('.hud .tracker-goal')).trim();
  expect(status.includes(vi('Bring the farm back')), `Roadmap goal was not translated: ${status}`);
  expect(!status.includes('Bring the farm back'), 'English roadmap goal leaked into the HUD');
  await page.click('[data-act="build"]');
  await page.click('.sheet.build [data-cat="projects"]');
  const school = STEPS.find(s => s.id === 'school');
  const lock = (await page.textContent('.sheet.build [data-kind="school"] small')).trim();
  expect(lock === vi('Opens with the project "{name}"', { name: vi(school.name) }), `Untranslated nested project name: ${lock}`);
  expect(!lock.includes(school.name) && !/\{\w+\}/.test(lock), 'Build lock kept an English name or placeholder');
  // The catalogue intentionally scrolls horizontally; inspect the shown project card and the sheet bounds.
  await page.locator('.sheet.build [data-kind="school"]').scrollIntoViewIfNeeded();
  const bounds = await page.locator('.sheet.build [data-kind="school"]').boundingBox();
  expect(bounds.x >= 0 && bounds.x + bounds.width <= 391, 'Project card extends past the phone');
  await page.screenshot({ path: join(SHOTS, 'vi-project-lock.png') });
  await page.click('.sheet.build [data-bar="close"]');
  await page.click('[data-act="projects"]');
  await fits(page, '.sheet.panel');
  await page.screenshot({ path: join(SHOTS, 'vi-restored-project.png') });
});

await check('tapping visiting neighbours expands counts and translates family names', async page => {
  const cases = [
    { id: 'mai', fact: 'hens', params: { count: 7 } },
    { id: 'gus', fact: 'family', params: { family: FAMILIES[0].name } },
  ];
  for (const { id, fact, params } of cases) {
    const neighbour = NEIGHBOURS.find(n => n.id === id), line = neighbour.remarks.find(r => r.fact === fact).text;
    const expected = vi(line, Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? vi(v) : v])));
    await page.evaluate(({ id, line, params }) => {
      farm.closeCards(); farm.panels.close(); farm.radial.hide();
      // Keep the visitor on an empty road while tapping, and prevent an order from taking precedence over the remark.
      farm.game.s.orders.cards = farm.game.s.orders.cards.filter(c => c.from !== id);
      farm.people.visit(id, line, params);
      const w = farm.people.walkers.get(`visit:${id}`);
      if (!w) throw Error('Visitor was not created');
      Object.assign(w, { x: 57, z: 129, route: [], wait: 60, stage: 'coming', indoors: false });
      farm.focus(28, 64, 30);
    }, { id, line, params });
    const point = await page.evaluate(id => {
      const w = farm.people.walkers.get(`visit:${id}`), point = farm.people.screenOf(w, 1.2);
      if (farm.people.pick(point.x, point.y) !== w) throw Error('Visitor fixture is not tappable');
      return point;
    }, id);
    await page.touchscreen.tap(point.x, point.y);
    await page.waitForFunction(id => !!farm.people.walkers.get(`visit:${id}`)?.bubble, id);
    const text = await page.evaluate(id => {
      const bubble = farm.people.walkers.get(`visit:${id}`).bubble;
      bubble.dataset.i18nVisitor = id;
      return [...bubble.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('');
    }, id);
    expect(text === expected, `Visitor remark differs: ${text}; expected ${expected}`);
    expect(!/\{\w+\}/.test(text), 'Visitor remark contains a raw placeholder');
    if (params.family) expect(!text.includes(params.family), 'Visitor said the English family name');
    await fits(page, `.bubble[data-i18n-visitor="${id}"]`);
    await page.screenshot({ path: join(SHOTS, `vi-visitor-${id}.png`) });
    await page.evaluate(id => farm.people.drop(farm.people.walkers.get(`visit:${id}`)), id);
  }
});

await check('Today repair news shows building, road and farmhouse names in Vietnamese', async page => {
  const events = [
    { type: 'repaired', id: 'road_south', kind: 'road' },
    { type: 'repaired', id: 'house', kind: 'house' },
    { type: 'neighbourRepair', id: 'mai', target: 'road_north', kind: 'road' },
    { type: 'neighbourRepair', id: 'gus', target: 'house', kind: 'house' },
    { type: 'repaired', id: 'removed-test-coop', kind: 'coop' },
  ];
  const road = id => vi(ROAD_SEGMENTS.find(r => r.id === id).name);
  const expected = [
    vi('Repaired: {name}', { name: road('road_south') }),
    vi('Repaired: {name}', { name: vi('Farmhouse') }),
    vi('{name} mended the {thing}!', { name: vi(NEIGHBOURS.find(n => n.id === 'mai').name), thing: road('road_north') }),
    vi('{name} mended the {thing}!', { name: vi(NEIGHBOURS.find(n => n.id === 'gus').name), thing: vi('Farmhouse') }),
    vi('Repaired: {name}', { name: vi(BUILDINGS.coop.name) }),
  ];
  await page.evaluate(events => { farm.game.s.news = events; }, events);
  await page.click('[data-act="today"]');
  await page.waitForSelector('.sheet[data-kind="today"] .news');
  const rows = await page.locator('.news li').allTextContents();
  expect(rows.length === expected.length, `Expected five news rows, got ${rows.length}`);
  rows.forEach((text, i) => expect(text.trim() === expected[i], `Repair news ${i}: ${text}; expected ${expected[i]}`));
  expect(!/undefined|\{\w+\}/.test(rows.join(' ')), 'Repair news contains missing names or placeholders');
  await fits(page, '.sheet.panel');
  await page.locator('.news').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, 'vi-repair-news.png') });
});

await browser.close();
console.log(failed ? `${failed} Vietnamese runtime check(s) failed` : 'Vietnamese runtime checks passed', `(screenshots in ${SHOTS})`);
process.exit(failed ? 1 : 0);
