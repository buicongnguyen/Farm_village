// World behavior and render budgets complement learning.browser's bilingual sheet/save acceptance.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { act } from '../src/core/act.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { RUINS } from '../src/content/world.mjs';
import { REPAIR_LESSON, GARDEN_STEPS } from '../src/content/learning.mjs';
import { LEARNING_SITE } from '../src/content/learning-site.mjs';
import { pack } from '../src/kit/save.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-learning-world'); mkdirSync(shots, { recursive: true });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const panel = page => page.locator('.panel:not([hidden])');
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0, checks = 0;

function fixture({ fresh = false, finished = false } = {}) {
  const now = Date.now(), s = newGame(now, 88249, { restore: true });
  s.settings.daylight = 'always'; s.settings.reducedMotion = true;
  if (fresh) return s;
  s.level = 5; s.xp = xpFor(5); s.coins = 2000; s.barn.cap = 200; s.barn.items = { wheat: 30, carrot: 10 };
  s.projects = { step: 999, delivered: {} }; s.story.chapter = 4; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.cond = {}; s.repairing = {}; s.beds = {}; s.helpAt = now + 86400000;
  s.today.seen = true; s.today.claimed = true; s.stats.ordersFilled = 1;
  const home = Object.keys(s.placed).find(id => s.placed[id].kind === 'cottage');
  s.homes[home] = { family: 'tran', arrived: true, arrivesAt: now - 1000, level: 0, rentFrom: now };
  const school = RUINS.find(r => r.kind === 'school');
  s.placed['learning-world-school'] = { kind: 'school', x: school.x, z: school.z, rot: school.rot }; s.counts.school = 1;
  s.orders.cards = [{ id: 'learning-world-order', from: 'ada', need: { wheat: 6 }, coins: 16, xp: 1, readyAt: now }];
  s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  if (finished) {
    const must = (action, payload = {}) => { const r = act(s, action, payload, now); if (!r.ok) throw Error(r.reason); };
    must('inspectLearning');
    for (const q of REPAIR_LESSON) must('answerRepairLesson', { question: q.id, choice: q.answer });
    for (const step of GARDEN_STEPS) must('workGardenProject', { step: step.id });
  }
  return s;
}

async function check(name, width, options, fn) {
  checks++; let context;
  try {
    const s = fixture(options);
    context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
    await context.addInitScript(({ save, now }) => {
      localStorage.setItem('farm-village.language', 'en'); localStorage.setItem('farm-village:profile', '1');
      localStorage.setItem('farm-village:save:1', save); sessionStorage.setItem('learning-world-clock', String(now));
      Date.now = () => Number(sessionStorage.getItem('learning-world-clock'));
    }, { save: pack(s), now: s.createdAt });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(URL_); await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
    await page.evaluate(() => {
      clearInterval(farm.game.timer); farm.game.clock = () => Date.now();
      farm.skipIntro(); farm.closeCards(); farm.panels.close(); farm.radial.hide();
    });
    await page.waitForFunction(() => farm.world.learning && farm.world.batches.has('flowerpot'));
    await fn(page, s);
    expect(!errors.length, errors.join('\n')); console.log(`ok   ${name} ${width}`);
  } catch (e) { failures++; console.log(`FAIL ${name} ${width}\n${e.stack}`); }
  finally { await context?.close(); }
}

async function tapCell(page, x, z) {
  await page.evaluate(([x, z]) => {
    farm.panels.close(); farm.radial.hide(); farm.radial.armed = null; farm.radial.tool.hidden = true;
    for (const w of farm.people.walkers.values()) w.indoors = true;
    farm.focus(x, z, 24);
  }, [x, z]);
  // Let camera and modal transitions settle before using the current projected ground point.
  await page.waitForTimeout(120);
  const point = await page.evaluate(([x, z]) => farm.cellToScreen(x, z), [x, z]);
  await page.mouse.click(point.x, point.y);
}
const benchItems = page => page.evaluate(() => Object.fromEntries(['frame', 'cover', 'trays'].map(id =>
  [id, farm.world.batches.items.has(`learning:${id}`)])));
const mapState = page => page.evaluate(() => JSON.stringify({ cells: farm.state().cells, parcels: farm.state().parcels, placed: farm.state().placed }));
async function photo(page, name) { await page.screenshot({ path: join(shots, name) }); }

try {
  for (const width of [390, 1280]) {
    await check('fresh farms keep the optional bench and its hint hidden', width, { fresh: true }, async page => {
      const before = await mapState(page), parts = await benchItems(page);
      expect(!parts.frame && !parts.cover && !parts.trays, 'bench objects appeared before the teacher introduction');
      expect(!await page.evaluate(() => farm.world.learning.visible), 'new farm exposes the optional project target');
      await page.locator('.hud [data-act="projects"]').click();
      expect(await panel(page).locator('[data-do="learning"]').count() === 0, 'new farm has an early lesson hint');
      await tapCell(page, LEARNING_SITE.x, LEARNING_SITE.z);
      expect(!await page.evaluate(() => farm.panels.open?.kind === 'learning'), 'hidden site intercepted a new-farm tap');
      expect(await mapState(page) === before, 'looking at the hidden site changed farm terrain or land ownership');
    });

    await check('physical bench stages, strawberry unlock and ordinary play at zero energy', width, {}, async (page, initial) => {
      const ids = await page.evaluate(() => ({ beds: Object.keys(farm.state().placed).filter(id => farm.state().placed[id].kind === 'bed'),
        bakery: Object.keys(farm.state().placed).find(id => farm.state().placed[id].kind === 'bakery') }));
      expect(ids.beds.length >= 2 && ids.bakery, 'fixture lacks everyday activities');
      const wheatBed = ids.beds[0], berryBed = ids.beds[1];
      const bedPosition = await page.evaluate(id => farm.state().placed[id], berryBed);
      await tapCell(page, bedPosition.x, bedPosition.z);
      await page.locator('.radial:not([hidden]) [data-act="plant"][data-crop="wheat"]').waitFor();
      expect(await page.locator('.radial [data-act="plant"][data-crop="strawberry"]').count() === 0, 'strawberries offered before learning');
      const mapBefore = await mapState(page);
      let parts = await benchItems(page); expect(parts.frame && parts.cover && !parts.trays, `wrong covered stage: ${JSON.stringify(parts)}`);
      await tapCell(page, LEARNING_SITE.x, LEARNING_SITE.z);
      await panel(page).locator('[data-do="inspectLearning"]').click();
      for (const q of REPAIR_LESSON) await panel(page).locator(`[data-do="answerRepairLesson"][data-question="${q.id}"][data-choice="${q.answer}"]`).click();
      await panel(page).locator('[data-do="workGardenProject"][data-step="uncover"]').click();
      parts = await benchItems(page); expect(parts.frame && !parts.cover && !parts.trays, `wrong uncovered stage: ${JSON.stringify(parts)}`);
      await page.evaluate(() => farm.panels.close()); await photo(page, `bench-uncovered-${width}.png`);
      await tapCell(page, LEARNING_SITE.x, LEARNING_SITE.z);
      await panel(page).locator('[data-do="workGardenProject"][data-step="brace"]').click();
      await panel(page).locator('[data-do="workGardenProject"][data-step="trays"]').click();
      parts = await benchItems(page); expect(parts.frame && !parts.cover && parts.trays, `wrong complete stage: ${JSON.stringify(parts)}`);
      expect(await mapState(page) === mapBefore, 'bench phases bought land, changed terrain or occupied player building cells');
      expect(await page.evaluate(() => farm.state().coins) === initial.coins - 80, 'project total or hidden discovery payment changed');
      const refused = await page.evaluate(({ x, z }) => {
        const before = JSON.stringify(farm.state()), result = farm.game.do('place', { kind: 'bed', x, z });
        return { ok: result.ok, unchanged: JSON.stringify(farm.state()) === before };
      }, LEARNING_SITE);
      expect(!refused.ok && refused.unchanged, 'the reserved farmhouse lot became a free building plot');
      await page.evaluate(() => farm.panels.close()); await photo(page, `bench-complete-${width}.png`);

      // Zero is deliberate test data. All ordinary actions below use their actual UI and rule handlers.
      await page.evaluate(() => {
        const s = farm.state(); s.learning.energy = 0; s.learning.energyAt = farm.game.now;
        s.firsts['learning:energy'] = 0; s.firsts['learning:energyAt'] = farm.game.now;
      });
      const wheatPosition = await page.evaluate(id => farm.state().placed[id], wheatBed);
      await tapCell(page, wheatPosition.x, wheatPosition.z);
      await page.locator('.radial:not([hidden]) [data-act="plant"][data-crop="wheat"]').click();
      expect(await page.evaluate(id => farm.state().beds[id]?.crop === 'wheat', wheatBed), 'zero energy blocked wheat planting');
      await page.evaluate(id => { farm.radial.armed = null; farm.panels.show('production', id); }, ids.bakery);
      await panel(page).locator('[data-do="produce"][data-recipe="bread"]').click();
      expect(await page.evaluate(id => farm.state().production[id]?.queue.some(j => j.recipe === 'bread'), ids.bakery), 'zero energy blocked baking');
      await page.evaluate(() => farm.panels.show('pond'));
      await panel(page).locator('[data-do="castLine"]:not([data-bait])').click();
      expect(await page.evaluate(() => !!farm.state().fishing.line), 'zero energy blocked casting a line');
      await page.evaluate(() => farm.panels.show('projects'));
      await panel(page).locator('[data-do="schoolActivity"]').click();
      await panel(page).locator('[data-do="schoolStart"][data-difficulty="simple"]').click();
      await panel(page).locator('[data-school-question]').waitFor();
      expect(await page.evaluate(() => farm.state().learning.energy) === 0, 'an everyday action used or granted project energy');

      await tapCell(page, bedPosition.x, bedPosition.z);
      await page.locator('.radial:not([hidden]) [data-act="plant"][data-crop="strawberry"]').click();
      expect(await page.evaluate(id => farm.state().beds[id]?.crop === 'strawberry', berryBed), 'finished bench did not unlock the radial crop choice');
      expect(await page.evaluate(id => farm.state().beds[id].doneAt - farm.game.now, berryBed) === 120000, 'strawberry duration changed');
      await page.evaluate(() => {
        sessionStorage.setItem('learning-world-clock', String(Date.now() + 120000)); farm.game.tick(); farm.closeCards();
      });
      const energyBeforeHarvest = await page.evaluate(() => farm.state().learning.energy);
      await tapCell(page, bedPosition.x, bedPosition.z);
      await page.locator('.radial:not([hidden]) [data-act="harvest"]').click();
      expect(await page.evaluate(() => farm.state().barn.items.strawberry) === 2, 'strawberry harvest did not give two fruit');
      expect(await page.evaluate(() => farm.state().learning.energy) === energyBeforeHarvest, 'harvesting spent project energy');
    });

    await check('mixed mature farms with strawberries and the repaired bench meet every zoom budget', width, { finished: true }, async page => {
      const size = await page.evaluate(() => {
        const n = farm.fillFarm(), s = farm.state(), now = farm.game.now;
        // Replace one whole field in five, retaining ordinary density and the existing paths between fields.
        let strawberries = 0;
        for (const [id, bed] of Object.entries(s.beds)) {
          const p = s.placed[id], field = Math.floor((p.x - 32) / 5) * 31 + Math.floor((p.z - 24) / 5) * 17;
          if (field % 5 === 4) { bed.crop = 'strawberry'; bed.doneAt = now + 120000 * (1 - (field % 7) / 6); strawberries++; }
        }
        farm.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test'); farm.closeCards(); farm.panels.close(); farm.radial.hide();
        return { n, strawberries };
      });
      expect(size.n > 2000 && size.strawberries > 300, `mixed crop fixture too small: ${JSON.stringify(size)}`);
      expect((await benchItems(page)).trays, 'filled-farm sync lost the completed bench');
      for (const [name, x, z] of [['bench', LEARNING_SITE.worldX, LEARNING_SITE.worldZ], ['farm', 128, 112]]) {
        for (const span of [24, 40, 90, 140, 220]) {
          const info = await page.evaluate(async ([span, x, z]) => {
            farm.view(span, x, z); await new Promise(resolve => setTimeout(resolve, 900)); return farm.measure(500);
          }, [span, x, z]);
          console.log(`     ${width} ${name} span ${span}: ${info.draws} draws, ${info.triangles} triangles`);
          expect(info.draws > 0 && info.draws <= 120 && info.triangles > 0 && info.triangles <= 300000,
            `${width} ${name} span ${span}: ${JSON.stringify(info)}`);
        }
      }
      await photo(page, `mixed-farm-${width}.png`);
    });
  }
} finally { await browser.close(); }
console.log(`${checks - failures}/${checks} learning world checks passed; screenshots: ${shots}`);
process.exitCode = failures ? 1 : 0;
