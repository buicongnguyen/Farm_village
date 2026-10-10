// Renders the chapter-card panels (docs/STORY.md section 4) from the real game through the test hook, into
// public/assets/story/chN-M.webp: 720 × 405, at most 60 KB each. They are not part of the first load; the chapter card
// loads a panel only when it shows. Re-run after the look of the world changes:
//   npm run build:test && node scripts/serve-dist.mjs 5274   (in another terminal)
//   GAME_URL=http://127.0.0.1:5274/ node scripts/story-panels.mjs [ch1-2 ...]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CHAPTERS } from '../src/content/story.mjs';

const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/', OUT = 'public/assets/story', MAX = 60_000, W = 720, H = 405;
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

// Each panel: the hour of day, what to add to a fresh save (runs in the page: s = state), and where the camera looks
// (cell x, z and the span in metres). `after` runs once the scene is drawn (for walkers who need time to arrive).
const cottage = (id, x, z, family) => `s.placed.${id} = { kind: 'cottage', x: ${x}, z: ${z}, rot: 2 }; s.counts.cottage = (s.counts.cottage ?? 0) + 1;
  s.homes.${id} = { level: 1, family: '${family}', arrivesAt: 0, rentFrom: 0, arrived: true };`;
const school = `s.placed.st_school = { kind: 'school', x: 50, z: 106, rot: 2 }; s.counts.school = 1; s.projects.step = 6;`;
// chapter 6: the market square mended, a market day running (flags up) and the baker at his stall
const marketDay = `for (const [id, p] of Object.entries(s.placed)) if (p.kind === 'market') delete s.cond[id];
  s.level = 6; s.firsts.marketDay = 1; s.marketDay = { shift: 0, n: 0, good: 'pumpkin' };`;
// chapter 7: the police post rebuilt on its old site (the constable stands at its door), and the boat dock on the brook
const police = `s.placed.st_police = { kind: 'police', x: 73, z: 106, rot: 2 }; s.counts.police = 1; s.cells[105 * 128 + 75] = 3;`;
const dock = `s.placed.st_dock = { kind: 'dock', x: 32, z: 13, rot: 0 }; s.counts.dock = 1;`;
// chapter 8: the company office on its old site, and the sluice open (the brook runs full, the mill wheel turns)
const office = `s.placed.st_office = { kind: 'company', x: 83, z: 106, rot: 2 }; s.counts.company = 1; s.cells[105 * 128 + 85] = 3;`;
const sluice = `s.firsts.sluice = 1;`;
// chapter 9: the festival stage on the square, and the Harvest Festival's evening (lanterns, everyone gathered)
const stage = `s.placed.st_stage = { kind: 'stage', x: 39, z: 98, rot: 0 }; s.counts.stage = 1;`;
const festival = stage + `s.festival = { at: farm.game.now - 1000, until: farm.game.now + 170000, n: 1 };`;
const village = cottage('st_c1', 36, 93, 'tran') + cottage('st_c2', 41, 93, 'okafor') + cottage('st_c3', 66, 93, 'reyes') + cottage('st_c4', 46, 93, 'lindqvist');
// everyone who has come to the village by chapter 9: the teacher, the doctor, the baker, the constable, the manager
const everyone = village + school + police + office + marketDay + `s.placed.st_clinic = { kind: 'clinic', x: 62, z: 106, rot: 2 }; s.counts.clinic = 1;`;
const PANELS = {
  'ch1-1': { hour: 6.4, look: [29, 16, 44] },
  'ch1-2': { hour: 9, look: [31, 61, 40] },
  'ch1-3': { hour: 10, look: [25, 62, 18] },
  'ch2-1': { hour: 9.5, scene: `s.placed.st_coop = { kind: 'coop', x: 33, z: 58, rot: 0 }; s.counts.coop = 1;
    s.animals.st_coop = [{ kind: 'hen', doneAt: null }, { kind: 'hen', doneAt: null }];`, look: [31, 60, 22] },
  'ch2-2': { hour: 7.2, look: [23, 62, 20] },
  'ch2-3': { hour: 16, after: `farm.people.visit('gus')`, wait: 9000, follow: 'visit:gus', look: [24, 90, 22] },
  'ch3-1': { hour: 17, scene: cottage('st_c1', 36, 93, 'tran'), look: [34, 92, 30] },
  'ch3-2': { hour: 11, scene: cottage('st_c1', 36, 93, 'tran'), look: [37, 94, 16] },
  'ch3-3': { hour: 22.5, scene: cottage('st_c1', 36, 93, 'tran'), look: [37, 94, 22] },
  'ch4-1': { hour: 9, scene: school, look: [52, 106, 26] },
  'ch4-2': { hour: 8.5, scene: school + cottage('st_c1', 36, 93, 'tran'), look: [52, 105, 16] },
  'ch4-3': { hour: 15, scene: school + cottage('st_c1', 36, 93, 'tran') + cottage('st_c2', 41, 93, 'okafor'), look: [45, 100, 50] },
  'ch5-1': { hour: 18.6, scene: school, look: [63, 107, 20] },
  'ch5-2': { hour: 12, scene: school + cottage('st_c3', 66, 93, 'reyes'), look: [67, 94, 16] },
  'ch5-3': { hour: 19.3, scene: school + cottage('st_c1', 36, 93, 'tran') + cottage('st_c2', 41, 93, 'okafor'), look: [58, 104, 56] },
  'ch6-1': { hour: 17.4, scene: marketDay + cottage('st_c3', 66, 93, 'reyes') + cottage('st_c4', 70, 93, 'lindqvist'), look: [73, 95, 38] },
  'ch6-2': { hour: 9, scene: marketDay, wait: 6000, follow: 'hugo', look: [77, 93, 9] },
  'ch6-3': { hour: 18.7, look: [30, 13, 30] },
  'ch7-1': { hour: 18.5, scene: school + police + `s.placed.st_lamp = { kind: 'street_lamp', x: 78, z: 105, rot: 0 }; s.counts.street_lamp = 1;`, wait: 6000, look: [75, 106, 17] },
  'ch7-2': { hour: 10.5, scene: dock, wait: 6000, look: [33, 12, 20] },
  'ch7-3': { hour: 18.2, scene: dock, wait: 6000, look: [34, 10, 12] },
  'ch8-1': { hour: 10, scene: school + police + office + cottage('st_c3', 66, 93, 'reyes'), wait: 6000, look: [82, 104, 30] },
  'ch8-2': { hour: 11.5, scene: sluice + dock, wait: 7000, look: [38, 10, 26] },
  'ch8-3': { hour: 16.6, scene: sluice, wait: 7000, look: [41, 8, 13] },
  'ch9-1': { hour: 11, scene: stage + village, wait: 7000, look: [41, 100, 20] },
  'ch9-2': { hour: 11, scene: festival + everyone, wait: 30000, look: [41, 100, 27] },
  'ch9-3': { hour: 11, scene: festival + everyone, wait: 40000, look: [41, 101, 16] },
};
const missing = CHAPTERS.flatMap(c => c.panels.map(p => p.img.split('/').pop().replace('.webp', ''))).filter(k => !PANELS[k]);
if (missing.length) throw new Error(`no scene for ${missing.join(', ')}`);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [name, p] of Object.entries(PANELS)) {
  if (only.length && !only.includes(name)) continue;
  const d = new Date(); d.setHours(Math.floor(p.hour), Math.round((p.hour % 1) * 60), 0, 0);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 }), page = await ctx.newPage();
  await ctx.addInitScript(ms => { sessionStorage.setItem('fv-clock-offset', String(ms)); localStorage.setItem('farm-village.language', 'en'); }, d.getTime() - Date.now());
  await page.goto(URL_);
  await page.waitForFunction(() => window.farm?.ready, null, { timeout: 60000 });
  await page.addStyleTag({ content: '.hud, .guide, .pointer, .modal, .sheet, .bubbles, .toasts, .place-bar, .radial { display: none !important; }' });
  await page.evaluate(([scene, after]) => {
    farm.skipIntro(); const s = farm.state(); s.settings.daylight = 'real';
    if (scene) new Function('s', scene)(s);
    farm.game.emit({ ok: true, events: [{ type: 'loaded' }] }, 'test');
    if (after) new Function(after)();
  }, [p.scene ?? '', p.after ?? '']);
  const [x, z, span] = p.look;
  await page.evaluate(([x, z, span]) => farm.focus(x, z, span), [x, z, span]);
  await page.waitForTimeout(p.wait ?? 4000);   // models load, walkers settle, daylight refreshes (every 3 s)
  if (p.follow) await page.evaluate(([id, span]) => { const w = farm.people.walkers.get(id); if (w) farm.world.cam.lookAt(w.x, w.z, span); }, [p.follow, span]);
  await page.waitForTimeout(600);
  const png = (await page.screenshot()).toString('base64');
  // encode to WebP in the browser, lowering the quality until the panel fits the budget
  const webp = await page.evaluate(async ([png, W, H, MAX]) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
    for (let q = 0.86; q >= 0.3; q -= 0.06) { const url = c.toDataURL('image/webp', q), b = url.slice(url.indexOf(',') + 1); if (b.length * 0.75 <= MAX) return b; }
    return null;
  }, [png, W, H, MAX]);
  if (!webp) throw new Error(`${name}: cannot fit ${MAX} bytes`);
  const buf = Buffer.from(webp, 'base64'); writeFileSync(`${OUT}/${name}.webp`, buf);
  console.log(`${name}.webp  ${(buf.length / 1024).toFixed(1)} KB`);
  await ctx.close();
}
await browser.close();
