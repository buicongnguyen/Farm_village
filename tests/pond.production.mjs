// Public-build acceptance. Uses real taps/keyboard camera controls, rendered assets and normal autosaves;
// no farm hook, injected movement commands, altered animation clock, or internal renderer access.
// Desktop VI: public camera projection reliably picks the character here. Narrow-viewport production selection
// depends on the current visible actor position; automated phone arrival/rendering is covered by walk.browser.mjs.
import { chromium } from 'playwright';
import * as THREE from 'three';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { tick } from '../src/core/act.mjs';
import { pick as fishFor } from '../src/core/fishing.mjs';
import { pack } from '../src/kit/save.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const expect = (ok, why) => { if (!ok) throw Error(why); };
function fixture() {
  const now = Date.now(), s = newGame(now, 4242, { restore: true });
  tick(s, now); // include the ordinary first-day garden flower before comparing trip accounting
  s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.settings.daylight = 'always'; s.settings.reducedMotion = false; s.settings.playerName = 'Pond Walker';
  s.today.seen = true; s.today.claimed = true;
  s.orders.cards = []; s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  return s;
}
// The published camera is orthographic. Track only the public key presses performed by this test.
function camera(width, height) {
  const state = { x: 72, z: 128, span: 70 }, pitch = .95, yaw = Math.PI / 4;
  const dimensions = () => { const w = width / height >= 1 ? state.span : state.span * width / height; return [w, w * height / width]; };
  return {
    state,
    apply(key) {
      if (key === '+') { state.span /= 1.25; return; }
      const [dx, dy] = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[key];
      const mpp = dimensions()[0] / width;
      state.x -= (dx * Math.cos(yaw) + dy * Math.sin(yaw) / Math.sin(pitch)) * mpp;
      state.z -= (-dx * Math.sin(yaw) + dy * Math.cos(yaw) / Math.sin(pitch)) * mpp;
    },
    project(x, z, y = 0) {
      const [w, h] = dimensions(), c = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 1, 1000);
      c.position.set(state.x + Math.sin(yaw) * Math.cos(pitch) * 300, Math.sin(pitch) * 300, state.z + Math.cos(yaw) * Math.cos(pitch) * 300);
      c.lookAt(state.x, 0, state.z); c.updateMatrixWorld();
      const p = new THREE.Vector3(x, y, z).project(c); return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2 };
    },
  };
}
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: process.env.GPU === '0' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failures = 0;
try {
  for (const [lang, width] of [['vi', 1280]]) {
    const height = 844, context = await browser.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'no-preference' });
    try {
      const initial = fixture();
      await context.addInitScript(({ lang, save }) => {
        if (sessionStorage.getItem('pond-acceptance-seeded')) return;
        sessionStorage.setItem('pond-acceptance-seeded', '1'); localStorage.setItem('farm-village.language', lang);
        localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
      }, { lang, save: pack(initial) });
      const page = await context.newPage(), errors = [], cam = camera(width, height);
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
      page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
      const enter = async () => {
        await page.locator('.main-menu [data-do="profile"][data-n="1"]').click();
        await page.locator('.hud [data-act="orders"]').waitFor({ state: 'visible', timeout: 60000 });
        expect(await page.evaluate(() => !window.farm), 'production exposes the game debug hook');
      };
      const key = async value => { await page.keyboard.press(value); cam.apply(value); };
      const pan = async (x, z) => {
        // Choose the key which most reduces distance to the desired camera centre.
        for (let i = 0; i < 100; i++) {
          const before = Math.hypot(cam.state.x - x, cam.state.z - z);
          let best = null, distance = before;
          for (const candidate of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
            const trial = camera(width, height); Object.assign(trial.state, cam.state); trial.apply(candidate);
            const d = Math.hypot(trial.state.x - x, trial.state.z - z); if (d < distance - .01) { best = candidate; distance = d; }
          }
          if (!best) break; await key(best);
        }
      };
      const click = async point => width < 500 ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
      await page.goto(URL_); await enter();
      await page.waitForFunction(() => performance.getEntriesByType('resource').some(r => /rigged\/villager-man\.glb/.test(r.name) && r.responseEnd > 0), null, { timeout: 60000 });
      await page.waitForTimeout(2000); // allow the downloaded rig to finish its idle-time bake
      for (const close of await page.locator('.modal [data-close]').all()) if (await close.isVisible()) await close.click();
      await pan(53, 125); await key('+'); await key('+'); await key('+');
      let selected = false;
      // The player may be taking their initial short stroll home; retry the five public home spots after it ends.
      for (let attempt = 0; attempt < 4 && !selected; attempt++) {
        for (const [dx, dz] of [[4, 0], [4, 3], [3, -4], [1, 5], [4, -3]]) {
          await pan((22 + dx + .5) * 2, (62 + dz + .5) * 2);
          const point = cam.project((22 + dx + .5) * 2, (62 + dz + .5) * 2, 1.15);
          // A missed actor tap may open a radial menu; never mistake its purchase button for a character.
          if (!await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.tagName === 'CANVAS', point)) continue;
          await click(point);
          selected = await page.locator('.toast').filter({ hasText: 'Pond Walker' }).count() > 0;
          if (selected) break;
          const close = page.locator('.panel:not([hidden]) .panel-head [data-do="close"]'); if (await close.count()) await close.click();
        }
        if (!selected) await page.waitForTimeout(1500);
      }
      if (!selected && shots) await page.screenshot({ path: join(shots, `pond-production-selection-${lang}-${width}.png`) });
      expect(selected, 'could not select the rendered player by tapping their home position');
      await pan(32, 84); await click(cam.project(31, 85));
      await page.locator('.panel[data-kind="pond"]:not([hidden])').waitFor({ state: 'visible' });
      expect(await page.locator('.panel[data-kind="pond"]:not([hidden])').count(), 'fishing controls were hidden after sending the player');
      expect(await page.evaluate(() => !JSON.parse(localStorage.getItem('farm-village:save:1')).fishing.line), 'cast before walking to the dock');
      await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('farm-village:save:1'))?.fishing.line, null, { timeout: 120000 });
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
      expect(saved.coins === initial.coins && JSON.stringify(saved.parcels) === JSON.stringify(initial.parcels), `reaching the public pond cost coins or bought land: ${JSON.stringify({ coins: saved.coins, expected: initial.coins, parcels: saved.parcels, beforeParcels: initial.parcels, stats: saved.stats, repairing: saved.repairing })}`);
      expect(saved.cells === initial.cells.join('') && JSON.stringify(saved.placed) === JSON.stringify(initial.placed), `the trip built paths or changed structures: ${JSON.stringify({ cellsChanged: saved.cells !== initial.cells.join(''), extra: Object.keys(saved.placed).filter(id => !initial.placed[id]), changed: Object.keys(initial.placed).filter(id => JSON.stringify(saved.placed[id]) !== JSON.stringify(initial.placed[id])) })}`);
      if (shots) await page.screenshot({ path: join(shots, `pond-production-${lang}-${width}.png`) });
      await page.reload(); await enter();
      expect(await page.evaluate(() => !!JSON.parse(localStorage.getItem('farm-village:save:1'))?.fishing.line), 'the auto-cast line did not survive reload');
      await page.locator('.hud [data-status="pond"]').click();
      const pondPanel = page.locator('.panel[data-kind="pond"]:not([hidden])');
      await pondPanel.locator('[data-do="reelIn"][data-start="1"]').waitFor({ state: 'visible', timeout: 45000 });
      await pondPanel.locator('[data-do="reelIn"][data-start="1"]').click();
      await pondPanel.locator('.fishing-meter').waitFor({ state: 'visible' });
      expect(await pondPanel.locator('[data-do="reelIn"]:not([data-start]):not([data-steady])').isVisible(), 'starting the challenge did not reveal its timing control');
      if (shots) await page.screenshot({ path: join(shots, `pond-production-timing-${lang}-${width}.png`) });
      const expectedFish = fishFor(saved.fishing.line.seed, saved.fishing.line.bait);
      await pondPanel.locator('[data-do="reelIn"][data-steady="1"]').click();
      await page.waitForFunction(caught => {
        const s = JSON.parse(localStorage.getItem('farm-village:save:1'));
        return !s?.fishing.line && s?.fishing.caught === caught + 1;
      }, saved.fishing.caught, { timeout: 15000 });
      const caught = await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
      expect((caught.barn.items[expectedFish] ?? 0) === (saved.barn.items[expectedFish] ?? 0) + 1 && caught.stats.fished === (saved.stats.fished ?? 0) + 1, 'the public controls did not catch exactly the original seeded fish');
      expect(!await pondPanel.locator('[data-do="reelIn"]').count(), 'completed line still exposes a collection button');
      await page.reload(); await enter();
      const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('farm-village:save:1')));
      expect(!persisted.fishing.line && persisted.fishing.caught === caught.fishing.caught && JSON.stringify(persisted.barn.items) === JSON.stringify(caught.barn.items) && persisted.coins === caught.coins, 'reloading repeated the catch or its reward');
      expect(!errors.length, errors.join('\n'));
      console.log(`ok   production: tap player, walk/cast, reload, timing control, gentle catch and single reward ${lang} ${width}`);
    } catch (error) { failures++; console.log(`FAIL production pond ${lang} ${width}\n${error.stack}`); }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
process.exitCode = failures ? 1 : 0;
