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
// `then: [code, ms]` runs after the wait (people are in the world by then) and waits ms more before the picture.
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
// chapter 10: a hired villager at the work. `put` stands someone at a cell; `work` shows them at a job (people-view handWork).
const put = (id, x, z) => `{ const w = farm.people.walkers.get('${id}'); if (w) { farm.people.cancelTrip(w); w.x = (${x}) * 2 + 1; w.z = (${z}) * 2 + 1; w.indoors = false; } }`;
const work = (role, who, kind) => `{ const s = farm.state(), id = Object.keys(s.placed).find(k => s.placed[k].kind === '${kind}'); farm.people.handWork({ role: '${role}', who: '${who}', at: id }); }`;
// chapter 13: the far bank open, the quay paved, a quay house on its first lot
const far = `s.story.chapter = 12; s.story.albright = 'meadow'; s.firsts.bridge = 1;`;
const quayHouse = `s.firsts.quay = 1; s.placed.st_quay = { kind: 'apartment', x: 46, z: 1, rot: 0, lot: 'q1' }; s.counts.apartment = 1; s.flats = { st_quay: { rentFrom: 1 } };`;
// chapter 14: the hotel on the quay's second lot, three guests staying
const hotel = `s.placed.st_hotel = { kind: 'hotel', x: 54, z: 1, rot: 0, lot: 'q2' }; s.counts.hotel = 1;
  s.hotel = { level: 0, rooms: [0, 1, 2, 3].map(n => ({ n, at: farm.game.now, until: farm.game.now + 600000, wish: 'bread', served: n === 1 })).concat([null, null]), nextAt: farm.game.now + 600000, held: 0, n: 4 };`;
// chapter 15: the halt on the quay's last lot, and a train waiting behind it with its middle wagon full
const haltLot = `s.placed.st_halt = { kind: 'halt', x: 94, z: 1, rot: 0, lot: 'q7' }; s.counts.halt = 1;`;
const trainHere = `s.train = { nextAt: farm.game.now + 1500000, n: 1, here: { n: 0, at: farm.game.now - 60000, until: farm.game.now + 420000,
  wagons: [{ good: 'wheat', need: 100, have: 100 }, { good: 'bread', need: 60, have: 60 }, { good: 'egg', need: 60, have: 10 }] } };`;
// chapter 16: staging for the three stops upriver. A row of stones from (x, z) southwards, and a clump of bushes for ferns.
const stones = (x, z, n, step, scale) => `for (let i = 0; i < ${n}; i++) farm.world.batches.set('stage:r${Math.round(x * 10)}_' + i, { model: 'rock', x: (${x} + (i % 2) * 0.22) * 2, z: (${z} + i * ${step}) * 2, rot: i * 1.3, scale: ${scale} + (i % 3) * 0.2 });`;
const ferns = (x, z, n) => `for (let i = 0; i < ${n}; i++) farm.world.batches.set('stage:f${Math.round(x * 10)}_' + i, { model: 'bush', x: (${x} + (i % 3) * 0.7) * 2, z: (${z} + Math.floor(i / 3) * 0.6) * 2, rot: i * 2.1, scale: 0.7 + (i % 2) * 0.25 });`;
// chapter 18: the valley company founded and a fair running on the square (stalls, carts, the judging table, visitors)
const fairOn = `s.story.chapter = 17; s.valley = { founded: 1, dividendFrom: 1 }; s.fair = { n: 1, at: farm.game.now - 1000, until: farm.game.now + 170000, ribbons: 1, best: { kitchen: 'gold' }, entry: {}, last: { n: 0, results: {} } };`;
// chapter 19: the award given (the plaque at the bridge, the meadow in full flower or the cannery's orchard)
const award = `s.story.chapter = 19; s.valley = { founded: 1, dividendFrom: 1, green: 1 }; s.firsts.award = 1; s.firsts.greenValley = 1;`;
const cannery = `s.story.albright = 'factory'; s.placed.st_cannery = { kind: 'cannery', x: 55, z: 16, rot: 0 }; s.counts.cannery = 1;`;
// chapter 20: the whole quay built on (a quay house on every lot between the hotel and the halt)
const fullQuay = [3, 4, 5, 6].map(i => `s.placed.st_q${i} = { kind: 'apartment', x: ${46 + 8 * (i - 1)}, z: 1, rot: 0, lot: 'q${i}' }; s.flats.st_q${i} = { rentFrom: 1 };`).join(' ') + ` s.counts.apartment = 5;`;
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
  'ch10-1': { hour: 9.5, scene: cottage('st_c1', 36, 93, 'tran') + `s.hands = { field: { since: 1 } };`, wait: 5000, then: [put('minh', 38, 59) + work('field', 'minh', 'bed'), 5500], look: [36, 59, 15] },
  'ch10-2': { hour: 15, scene: cottage('st_c1', 36, 93, 'tran') + `s.hands = { workshop: { since: 1 } }; for (const [id, p] of Object.entries(s.placed)) if (p.kind === 'bakery') delete s.cond[id];`, wait: 5000,
    then: [`{ const s = farm.state(), b = Object.values(s.placed).find(p => p.kind === 'bakery'); if (b) { ${put('lan', 'b.x + 1', 'b.z + 3')} farm.focus(b.x + 1, b.z + 1, 14); } }` + work('workshop', 'lan', 'bakery'), 5500], look: [36, 62, 14] },
  'ch10-3': { hour: 18.9, scene: `s.story.chapter = 9;`, wait: 7000, look: [25, 62, 15] },
  // chapter 11: the offer is open from chapter 10 (survey stakes on the meadow, the car and the man at the gate); then one picture for each answer
  'ch11-1': { hour: 9.5, scene: `s.story.chapter = 10;`, wait: 7000, look: [58, 17, 24] },
  'ch11-2': { hour: 16.5, scene: `s.story.chapter = 10;`, wait: 7000, then: [put('albright', 30, 65), 1500], look: [31, 66, 9] },
  'ch11-3': { hour: 10.5, scene: `s.story.chapter = 11; s.story.albright = 'factory'; s.placed.st_cannery = { kind: 'cannery', x: 55, z: 16, rot: 0 }; s.counts.cannery = 1;`, wait: 7000, look: [58, 18, 22] },
  'ch11-3m': { hour: 10.5, scene: `s.story.chapter = 11; s.story.albright = 'meadow';`, wait: 7000, look: [63, 18, 22] },
  // chapter 12: the twins on the brook road, the co-operative's board on the square, and the towpath with its gate off
  'ch12-1': { hour: 9.2, scene: `s.story.chapter = 11; s.story.albright = 'meadow';`, after: `farm.people.visit('twins')`, wait: 10000, follow: 'visit:twins', look: [29, 8, 13] },
  'ch12-2': { hour: 16.4, scene: stage + village + `s.story.chapter = 11; s.story.albright = 'meadow';`, wait: 7000, then: [put('ada', 42, 101) + put('june', 44, 101) + put('minh', 43, 102), 1500], look: [43, 100.5, 9] },
  'ch12-3': { hour: 17.3, scene: sluice + `s.story.chapter = 12; s.story.albright = 'meadow'; s.firsts.bridge = 1;`, wait: 7000, look: [37, 7, 20] },
  // chapter 13: the quay paved (signs on its lots), the first quay house with its keeper at the door, and its lamp at night
  'ch13-1': { hour: 10, scene: sluice + far + `s.firsts.quay = 1;`, wait: 8000, look: [58, 7, 32] },
  'ch13-2': { hour: 15.5, scene: sluice + far + quayHouse, wait: 8000, then: [put('tuyet', 50, 6), 1500], look: [49, 5.5, 16] },
  'ch13-3': { hour: 20.6, scene: sluice + far + quayHouse, wait: 9000, look: [49, 4.5, 22] },
  // chapter 14: the hotel on the second lot (with a floor added), guests on the quay, and every window lit
  'ch14-1': { hour: 10.5, scene: sluice + far + quayHouse + hotel, wait: 9000, look: [55, 5.5, 24] },
  'ch14-2': { hour: 8.2, scene: sluice + far + quayHouse + hotel, wait: 9000, look: [57, 6.5, 13] },
  'ch14-3': { hour: 21, scene: sluice + far + quayHouse + hotel + `s.hotel.level = 2;`, wait: 9000, look: [56, 4, 24] },
  // chapter 15: the halt on the last lot, the train behind it with a full wagon, and the train in the evening
  'ch15-1': { hour: 10.5, scene: sluice + far + quayHouse + hotel + haltLot, wait: 9000, look: [97, 4, 22] },
  'ch15-2': { hour: 17.2, scene: sluice + far + quayHouse + hotel + haltLot + trainHere, wait: 9000, look: [96, 3, 22] },
  'ch15-3': { hour: 19.6, scene: sluice + far + quayHouse + hotel + haltLot + trainHere, wait: 9000, look: [92, 3.5, 34] },
  // chapter 16: three places up the brook, west of the road, staged with stones and bushes; Oak and Sunny at each
  'ch16-1': { hour: 11, scene: sluice + `s.story.chapter = 15;`, wait: 7000, then: [stones(14.3, 13.4, 9, 0.42, 1.25) + put('ellis', 15.2, 17.3) + put('pip', 13.2, 17.2), 1800], look: [14.2, 15.6, 11] },
  'ch16-2': { hour: 7.6, scene: sluice + `s.story.chapter = 15;`, wait: 7000, then: [stones(7.2, 12.0, 4, 0.5, 1.6) + ferns(8.2, 11.0, 5) + put('ellis', 10.4, 16.6) + put('pip', 9.0, 16.5), 1800], look: [9.4, 14.6, 10] },
  'ch16-3': { hour: 16.4, scene: sluice + `s.story.chapter = 15;`, wait: 7000, then: [stones(0.7, 11.6, 6, 0.36, 2.4) + ferns(0.9, 10.8, 6) + put('pip', 2.3, 15.4) + put('ellis', 3.6, 15.7), 1800], look: [2.6, 13.4, 9] },
  // chapter 17: the company office with its flag, the households gathered at its door, and the whole valley
  'ch17-1': { hour: 10.5, scene: everyone + `s.story.chapter = 16; s.valley = { founded: 1, dividendFrom: 1 };`, wait: 8000, look: [86, 107, 20] },
  'ch17-2': { hour: 16.2, scene: everyone + `s.story.chapter = 16; s.valley = { founded: 1, dividendFrom: 1 };`, wait: 8000,
    then: [put('bea', 88.2, 106.6) + put('ada', 89.0, 105.6) + put('gus', 89.9, 106.2) + put('june', 88.6, 107.5) + put('minh', 89.7, 107.4) + put('lan', 88.0, 108.3) + put('grace', 90.7, 106.9) + put('pip', 89.2, 108.4), 1800], look: [88, 107, 11] },
  'ch17-3': { hour: 17.6, scene: everyone + stage + `s.story.chapter = 16; s.valley = { founded: 1, dividendFrom: 1 };`, wait: 9000, look: [43, 96.5, 50] },
  // chapter 18: the carts and stalls west of the square, the judging before the stage, and the ribbon board at dusk
  'ch18-1': { hour: 9.6, scene: everyone + stage + fairOn, wait: 24000, then: [`farm.focus(35.2, 101.6, 24);`, 1200], look: [35.2, 101.6, 24] },
  'ch18-2': { hour: 11, scene: everyone + stage + fairOn, wait: 30000, then: [`farm.focus(39.4, 101.8, 24);`, 1200], look: [39.4, 101.8, 24] },
  'ch18-3': { hour: 17.6, scene: everyone + stage + `s.story.chapter = 17; s.valley = { founded: 1, dividendFrom: 1 }; s.fair = { n: 1, at: 1, until: 2, over: 1, ribbons: 1, best: { kitchen: 'gold' }, entry: {} };`, wait: 8000,
    then: [put('june', 38.6, 102.4) + put('pip', 39.5, 102.7) + put('ada', 37.5, 102.5) + `farm.focus(39.6, 100.6, 24);`, 1800], look: [39.6, 100.6, 24] },
  // chapter 19: the plaque by the bridge, Mr Albright before the hotel at dusk, and the valley's answer grown green
  'ch19-1': { hour: 9.4, scene: sluice + dock + `s.story.albright = 'meadow';` + award, wait: 8000, then: [put('ada', 31.6, 16.2) + put('pip', 29.9, 16.4), 1800], look: [30.4, 15.2, 24] },
  'ch19-2': { hour: 18.4, scene: sluice + far + quayHouse + hotel + `s.story.chapter = 18; s.story.beats = [...(s.story.beats ?? []), 'albright-returns'];`, wait: 10000, then: [put('albright', 57.5, 6.4), 1800], look: [56.5, 5, 24] },
  'ch19-3': { hour: 10.5, scene: sluice + cannery + award, wait: 9000, look: [59.5, 17.6, 24] },
  'ch19-3m': { hour: 10.5, scene: sluice + `s.story.albright = 'meadow';` + award, wait: 9000, look: [62, 17.8, 24] },
  // chapter 20: the family on the farmhouse step at dusk, the old village with every window lit, and the far bank
  'ch20-1': { hour: 19.95, scene: everyone + `s.story.chapter = 19;`, wait: 9000, then: [put('ada', 27.3, 63.5) + put('ellis', 28.4, 63.8) + put('pip', 27.9, 64.7) + put('june', 26.5, 64.4) + `farm.focus(26.5, 63.4, 24);`, 1800], look: [26.5, 63.4, 24] },
  'ch20-2': { hour: 20.25, scene: everyone + stage + `s.story.chapter = 19;` + [[51, 'c5'], [56, 'c6'], [61, 'c7']].map(([x, id]) => `s.placed.st_${id} = { kind: 'cottage', x: ${x}, z: 93, rot: 2 }; s.homes.st_${id} = { level: 2 }; s.counts.cottage += 1;`).join(' '), wait: 10000, look: [52, 98.5, 50] },
  'ch20-3': { hour: 20.25, scene: sluice + far + quayHouse + hotel + `s.hotel.level = 2;` + haltLot + trainHere + fullQuay, wait: 10000, look: [60, 6, 50] },
};
const missing = CHAPTERS.flatMap(c => [...c.panels, ...Object.values(c.variants ?? {}).flatMap(v => v.panels ?? [])].map(p => p.img.split('/').pop().replace('.webp', ''))).filter(k => !PANELS[k]);
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
  if (p.then) { await page.evaluate(code => new Function(code)(), p.then[0]); await page.waitForTimeout(p.then[1]); }
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
