// The real hospital upgrade must fit crowded legal sites in all rotations, including wear and saved reloads.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newGame } from '../src/core/state.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { canPlace, doorCell, touch } from '../src/core/grid.mjs';
import { footprint } from '../src/content/buildings.mjs';
import { BEATS } from '../src/content/story.mjs';
import { NEIGHBOURS } from '../src/content/people.mjs';
import { N, CELL, RUINS } from '../src/content/world.mjs';
import { pack } from '../src/kit/save.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots = join(tmpdir(), 'hollowbrook-art-footprints'); mkdirSync(shots, { recursive: true });
const expect = (ok, why) => { if (!ok) throw Error(why); };
const panel = page => page.locator('.panel:not([hidden])');
const sites = [58, 66, 76, 85].map((x, rot) => ({ x, z: 94, rot }));
const clinicId = 'footprint-clinic';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.GPU === '0'
  ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;

function fixture() {
  const now = Date.now(), s = newGame(now, 6147, { restore: true });
  s.level = 15; s.xp = xpFor(15); s.coins = 8000; s.barn.cap = 100; s.barn.items = { herb: 6, ginseng: 2 };
  s.projects = { step: 999, delivered: {} }; s.story.chapter = 5; s.story.tutorial = 999; s.story.beats = BEATS.map(b => b.id);
  s.today.seen = true; s.today.claimed = true; s.settings.reducedMotion = true; s.settings.daylight = 'always';
  s.placed = {}; s.homes = {}; s.beds = {}; s.counts = {}; s.cond = {}; s.repairing = {}; s.helpAt = now + 86400000;
  s.orders.cards = []; s.orders.pending = Array(8).fill(now + 86400000);
  s.neighbours = Object.fromEntries(NEIGHBOURS.map(n => [n.id, { day: '9999-12-31', visits: [], visited: 0, total: 0, friendship: 0, trade: null }]));
  for (let z = 92; z <= 116; z++) for (let x = 32; x <= 95; x++) s.cells[z * N + x] = 0;
  const clinic = RUINS.find(r => r.kind === 'clinic'); s.placed[clinicId] = { kind: 'clinic', x: clinic.x, z: clinic.z, rot: clinic.rot }; s.counts.clinic = 1;
  for (const site of sites) {
    const { x, z, rot } = site, [w, d] = footprint('clinic', rot), door = doorCell('clinic', x, z, rot), corridor = rot === 1 ? x + w + 1 : x - 2;
    for (let px = Math.min(corridor, door[0]); px <= Math.max(corridor, door[0]); px++) s.cells[door[1] * N + px] = 3;
    for (let pz = 91; pz <= door[1]; pz++) s.cells[pz * N + corridor] = 3;
    touch(s);
    for (const [i, [nx, nz]] of [[x - 1, z], [x + w, z], [x, z - 1], [x, z + d]].entries()) {
      if (s.cells[nz * N + nx] === 3 || !canPlace(s, 'flowers', nx, nz).ok) continue;
      s.placed[`edge-${rot}-${i}`] = { kind: 'flowers', x: nx, z: nz, rot: 0 }; s.counts.flowers = (s.counts.flowers ?? 0) + 1; touch(s);
    }
    const fit = canPlace(s, 'clinic', x, z, rot, { ignore: clinicId }); expect(fit.ok, `invalid hospital fixture ${rot}: ${fit.reason}`);
  }
  return s;
}
async function ready(page) {
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    clearInterval(farm.game.timer); farm.game.clock = () => Date.now();
    farm.skipIntro(); farm.closeCards(); farm.panels.close(); farm.radial.hide();
  });
  await page.waitForFunction(() => farm.world.batches.has('clinic:hospital'));
}
async function bounds(page) {
  return page.evaluate(id => {
    const item = farm.world.batches.items.get(id), geo = item && farm.world.batches.models.get(item.model)?.geo;
    if (!geo) return null;
    const transform = farm.world.cam.camera.matrixWorld.clone().makeRotationY(item.rot ?? 0).setPosition(item.x, item.y ?? 0, item.z);
    const box = geo.boundingBox.clone().applyMatrix4(transform);
    return { model: item.model, min: box.min.toArray(), max: box.max.toArray(), scale: item.scale ?? 1 };
  }, clinicId);
}
function fits(box, site) {
  const [w, d] = footprint('clinic', site.rot), door = doorCell('clinic', site.x, site.z, site.rot);
  expect(box?.model.startsWith('clinic:hospital') && box.scale === 1, 'not using authored hospital model');
  expect(box.min[0] >= site.x * CELL + .095 && box.max[0] <= (site.x + w) * CELL - .095, `hospital overlaps neighbour in x: ${JSON.stringify(box)}`);
  expect(box.min[2] >= site.z * CELL + .095 && box.max[2] <= (site.z + d) * CELL - .095, `hospital overlaps neighbour in z: ${JSON.stringify(box)}`);
  const separated = box.max[0] < door[0] * CELL || box.min[0] > (door[0] + 1) * CELL || box.max[2] < door[1] * CELL || box.min[2] > (door[1] + 1) * CELL;
  expect(separated, 'hospital art covers the required doorway path');
}

try {
  for (const width of [390, 1280]) {
    let context;
    try {
      const s = fixture();
      context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
      await context.addInitScript(({ save, now }) => {
        if (!sessionStorage.getItem('art-footprint-seeded')) {
          sessionStorage.setItem('art-footprint-seeded', '1'); sessionStorage.setItem('art-footprint-clock', String(now));
          localStorage.setItem('farm-village.language', 'en'); localStorage.setItem('farm-village:profile', '1'); localStorage.setItem('farm-village:save:1', save);
        }
        Date.now = () => Number(sessionStorage.getItem('art-footprint-clock'));
      }, { save: pack(s), now: s.createdAt });
      const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(URL_); await ready(page);
      await page.evaluate(() => farm.panels.show('projects')); await panel(page).locator('[data-do="villageGrowth"]').click();
      await panel(page).locator('[data-do="upgradeHospital"]').click();
      await page.waitForFunction(id => farm.world.batches.items.get(id)?.model === 'clinic:hospital', clinicId);
      expect(await page.evaluate(() => farm.state().coins) === s.coins - 1800, 'visual upgrade changed the payment');
      await page.evaluate(() => { farm.closeCards(); farm.panels.close(); });
      for (const site of sites) {
        const result = await page.evaluate(({ id, site }) => farm.game.do('move', { id, ...site }), { id: clinicId, site });
        expect(result.ok, `real move failed for rotation ${site.rot}: ${result.reason}`);
        fits(await bounds(page), site);
        const [w, d] = footprint('clinic', site.rot);
        await page.evaluate(({ x, z }) => farm.view(27, x, z), { x: (site.x + w / 2) * CELL, z: (site.z + d / 2) * CELL });
        await page.waitForTimeout(350); await page.screenshot({ path: join(shots, `hospital-rotation-${site.rot}-${width}.png`) });
      }
      await page.evaluate(id => { farm.state().cond[id] = { level: 2, ms: 0 }; farm.land.apply([{ type: 'worn', id }]); }, clinicId);
      expect((await bounds(page)).model === 'clinic:hospital@2', 'wear selected a different-size clinic'); fits(await bounds(page), sites[3]);
      await page.evaluate(() => window.__fvSave()); await page.reload(); await ready(page); fits(await bounds(page), sites[3]);
      expect(await page.evaluate(() => farm.state().coins) === s.coins - 1800, 'moving, wear or reload repeated hospital payment');
      if (width === 390) {
        await page.evaluate(() => { farm.fillFarm(); farm.closeCards(); farm.panels.close(); farm.radial.hide(); });
        for (const span of [24, 39.9, 40, 70, 89.9, 90, 140, 220]) {
          const measured = await page.evaluate(async span => { farm.view(span, 172, 192); return farm.measure(700); }, span);
          console.log(`     crowded hospital span ${span}: ${measured.draws} draws, ${measured.triangles} triangles`);
          expect(measured.draws <= 120 && measured.triangles <= 300000, `hospital phone budget ${span}: ${JSON.stringify(measured)}`);
        }
      }
      expect(!errors.length, errors.join('\n')); console.log(`ok   crowded hospital bounds, four rotations, doorway, wear and reload ${width}`);
    } catch (error) { failed++; console.log(`FAIL hospital art footprint ${width}\n${error.stack}`); }
    finally { await context?.close(); }
  }
} finally { await browser.close(); }
console.log(`${2 - failed}/2 art footprint browser checks passed`); process.exitCode = failed ? 1 : 0;
