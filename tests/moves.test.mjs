// Moves in Explore (core/moves.mjs, docs/plan/98-zoo-garden-moves.md): the swing.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { cellType, landOf } from '../src/core/grid.mjs';
import { installMoves, MOVES, swingCell, swingTarget, knocksLeft } from '../src/core/moves.mjs';
import { N } from '../src/content/world.mjs';

const NOW = 1_800_000_000_000;
installMoves();
const weedsOnFarm = s => { const out = []; for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (cellType(s, x, z) === 'weeds' && landOf(s, x, z) === 'farm') out.push([x, z]); return out; };
const faceCell = ([cx, cz]) => ({ x: cx * 2 + 1, z: (cz - 1) * 2 + 1, yaw: 0 });   // standing a cell north, facing south (+z)

test('a swing lands just ahead of you and knocks a weed loose for free, a few a day, and then waits for tomorrow', () => {
  const s = newGame(NOW, 61, { restore: true }), weeds = weedsOnFarm(s); assert.ok(weeds.length > MOVES.knocks + 1, 'the test farm has too few weeds');
  const at = faceCell(weeds[0]); assert.deepEqual(swingCell(at.x, at.z, 0), [weeds[0][0], weeds[0][1]]);
  const coins = s.coins, r = act(s, 'swing', at, NOW); assert.ok(r.ok && r.knocked); assert.equal(cellType(s, ...weeds[0]), 'grass'); assert.equal(s.coins, coins, 'a swing cost coins');
  assert.ok(r.events.some(e => e.type === 'cellChanged' && e.knocked));
  let n = 1; for (const w of weeds.slice(1)) { if (cellType(s, ...w) !== 'weeds') continue; const q = act(s, 'swing', faceCell(w), NOW); if (q.knocked) n++; else { assert.ok(q.tired); break; } }
  assert.equal(n, MOVES.knocks); assert.equal(knocksLeft(s, NOW), 0);
  const left = weeds.find(w => cellType(s, ...w) === 'weeds'); const saved = pack(s), tired = act(s, 'swing', faceCell(left), NOW);
  assert.ok(tired.ok && tired.tired && !tired.knocked); assert.equal(pack(s), saved, 'a tired swing changed the save');
  assert.ok(act(s, 'swing', faceCell(left), NOW + 86_400_000).knocked, 'a new day did not bring new swings');
});
test('a swing at grass, at water or at nothing in particular changes nothing; bad input is refused', () => {
  const s = newGame(NOW, 62, { restore: true }); tick(s, NOW); act(s, 'swing', { x: 57, z: 118, yaw: 0 }, NOW); const saved = pack(s);   // (a new farm's first action also brings a letter)
  // the brook and the brook road
  for (const [x, z] of [[66, 22], [57, 118]]) { const r = act(s, 'swing', { x, z, yaw: 0 }, NOW); assert.ok(r.ok); assert.ok(!r.knocked); }
  assert.equal(pack(s), saved);
  assert.equal(act(s, 'swing', { x: 'a', z: 1, yaw: 0 }, NOW).ok, false); assert.equal(act(s, 'swing', {}, NOW).ok, false);
  assert.equal(swingTarget(s, 66, 22, 0).type, 'water', 'the brook is not water to a swing');
});

// Step 3: into the water (core/swim.mjs)
import { installExplore, startExplore, exploreSession, moveExplore } from '../src/core/explore.mjs';
import { SWIM, depthAt } from '../src/core/swim.mjs';
import { POND_WATER, brookCurve } from '../src/content/world.mjs';
installExplore();
test('the water: the bank holds until you push on, then you wade slower and swim slower still, and tired you are carried back', () => {
  const s = newGame(NOW, 63, { restore: true }); tick(s, NOW);
  const bx = 120, mid = (brookCurve(bx / 2) + 0.5) * 2;   // a stretch of the brook in the east, away from the bridge
  assert.ok(depthAt(bx, mid) > SWIM.shallow, 'the middle of the brook is not deep'); assert.equal(depthAt(bx, mid + 8), 0);
  assert.ok(depthAt(POND_WATER.x, POND_WATER.z) > 0, 'the village pond is not water');
  const shore = [bx, Math.round(mid + 5)]; assert.ok(startExplore(s, shore, { roomId: 'farmhouse_main', interactions: [], entry: { position: [0, 0, 0] } }, new Set()), 'no place to start');
  const e = exploreSession(s); e.p = [...shore];
  let stop = 0; for (let i = 0; i < 40 && !stop; i++) { const a = [...e.p]; moveExplore(s, 0, -1, 0.1); if (Math.hypot(e.p[0] - a[0], e.p[1] - a[1]) < 1e-3) stop = i; }
  assert.ok(stop, 'walked on into the water without stopping at the bank'); assert.ok(!e.inWater, 'in the water without a push');
  assert.ok(depthAt(...e.p) <= SWIM.edge && depthAt(...e.p) > 0, `stopped ${depthAt(...e.p).toFixed(2)} m deep, not at the water's edge`);
  assert.equal(e.wet, 0, 'wet on the bank'); moveExplore(s, 0, -1, 0.1); assert.ok(!e.inWater, 'a moment at the edge is not a push');
  for (let i = 0; i < 30; i++) moveExplore(s, 0, -1, 0.1);   // keep pushing: in you go
  assert.ok(e.inWater && depthAt(...e.p) > 0, 'never got into the water');
  const a = [...e.p]; moveExplore(s, 0, -1, 0.1); const wadeStep = Math.hypot(e.p[0] - a[0], e.p[1] - a[1]);
  assert.ok(wadeStep < 3.6 * 0.1 * 0.75 + 1e-6, 'walked through the water at land speed');
  e.p = [bx, mid];   // out in the middle: tread water there until tired
  for (let i = 0; i < 400 && !e.tired; i++) moveExplore(s, 0, 0, 0.1);
  assert.ok(e.tired, 'never tired in the deep'); assert.ok(e.route.length, 'tired and no way back');
  for (let i = 0; i < 400 && depthAt(...e.p) > 0; i++) moveExplore(s, 0, -1, 0.1);   // pushing deeper does nothing: carried back
  assert.equal(depthAt(...e.p), 0, 'not carried back to the bank'); moveExplore(s, 0, 0, 0.1); assert.ok(!e.tired, 'still tired on dry land');
});

// Step 4: disguise skills (content/skills.mjs, core/moves.mjs useSkill)
import { SKILLS, EFFECTS } from '../src/content/skills.mjs';
import { COSTUMES } from '../src/content/wardrobe.mjs';
import { SKILL, skillsNow } from '../src/core/moves.mjs';
test('every disguise costume has four skills with a known effect, a cooldown and words in three languages; others have none', async () => {
  const packs = await Promise.all(['vi', 'ko', 'ja'].map(async l => Object.assign({}, ...Object.values(await import(`../src/i18n/${l}-fishing.mjs`)), ...Object.values(await import(`../src/i18n/${l}.mjs`)))));
  for (const c of Object.values(COSTUMES)) {
    const list = SKILLS[c.kit] ?? []; if (!c.kit?.startsWith('dz_')) { assert.equal(list.length, 0, `${c.id} is no disguise but has skills`); continue; }
    assert.equal(list.length, 4, `${c.id} does not have four skills`);
    for (const sk of list) { assert.ok(EFFECTS[sk.effect], `${sk.name}: no such effect`); assert.ok(sk.cd >= 3 && sk.cd <= 20); for (const p of packs) { assert.ok(p[sk.name], `missing: ${sk.name}`); assert.ok(p[EFFECTS[sk.effect]], `missing: ${EFFECTS[sk.effect]}`); } }
  }
});
test('a skill needs its disguise, waits out its cooldown (kept in the save), and waters a bed once per growth', () => {
  const s = newGame(NOW, 64, { restore: true }); tick(s, NOW); s.level = 30;
  assert.equal(act(s, 'useSkill', { index: 0, x: 60, z: 60, yaw: 0 }, NOW).ok, false, 'a skill without a disguise');
  assert.ok(act(s, 'setting', { key: 'playerLook', value: 'aodai' }, NOW).ok); assert.equal(skillsNow(s).length, 4);
  const bed = Object.keys(s.placed).find(id => s.placed[id].kind === 'bed'), p = s.placed[bed];
  s.beds[bed] = { crop: 'wheat', doneAt: NOW + 100_000 };
  const at = { index: 0, x: (p.x + 0.5) * 2, z: (p.z + 0.5) * 2 - SKILL.splashAhead, yaw: 0 };   // Lotus petals: a splash four metres ahead, on the bed
  const r = act(s, 'useSkill', at, NOW); assert.ok(r.ok); assert.equal(r.effect, 'splash'); assert.equal(r.helped, 1);
  assert.equal(s.beds[bed].doneAt, NOW + 75_000);
  assert.equal(act(s, 'useSkill', at, NOW + 1000).ok, false, 'used again during its cooldown');
  assert.equal(unpack(pack(s)).moves.cd['dz_aodai:0'], NOW + 6000, 'the cooldown was not saved');
  const again = act(s, 'useSkill', at, NOW + 6000); assert.ok(again.ok); assert.equal(again.helped, 0, 'the same growth was helped twice'); assert.equal(s.beds[bed].doneAt, NOW + 75_000);
  s.beds[bed] = { crop: 'wheat', doneAt: NOW + 212_000 }; assert.equal(act(s, 'useSkill', at, NOW + 12_000).helped, 1, 'a new growth could not be helped');
  assert.equal(act(s, 'useSkill', { index: 9, x: 1, z: 1, yaw: 0 }, NOW).ok, false); assert.equal(act(s, 'useSkill', { index: 1, x: 'x', z: 1, yaw: 0 }, NOW).ok, false);
});

// Step 5: fish (core/moves.mjs splashWater)
import { LEAP } from '../src/core/moves.mjs';
test('splashed water makes fish leap; now and then one lands in the barn, at most once in a while in each water', () => {
  const s = newGame(NOW, 65, { restore: true }); tick(s, NOW);
  assert.equal(act(s, 'splashWater', { x: 57, z: 118 }, NOW).ok, false, 'a road splashed like water');
  const brook = [120, (brookCurve(60) + 0.5) * 2];
  let caught = 0, first = null;
  for (let i = 0; i < 40; i++) { const r = act(s, 'splashWater', { x: brook[0], z: brook[1] }, NOW + i * 1000); assert.ok(r.ok && r.leap); if (r.caught) { caught++; first ??= r.caught; } }
  assert.equal(caught, 1, 'more than one fish landed within the wait');
  assert.equal(s.album.fish[first], 1); assert.equal(s.moves.leap.brook > NOW, true);
  let later = 0; for (let i = 0; i < 40; i++) if (act(s, 'splashWater', { x: brook[0], z: brook[1] }, NOW + 2 * LEAP.everyMs + 60_000 + i * 1000).caught) later++;
  assert.equal(later, 1, 'no fish after the wait');
  const pond = act(s, 'splashWater', { x: POND_WATER.x, z: POND_WATER.z }, NOW + 1000); assert.ok(pond.ok, 'the village pond is not water');
});

// The review of steps 1-5 (2026-10-15)
import { dayKey } from '../src/core/clock.mjs';
import { waterCell } from '../src/core/swim.mjs';
import { dryPlace } from '../src/core/explore.mjs';
test("a knock keeps the skills' waits and the fish wait; the knocks come back with the farm's day", () => {
  const s = newGame(NOW, 67, { restore: true }); tick(s, NOW); s.level = 30;
  assert.ok(act(s, 'setting', { key: 'playerLook', value: 'aodai' }, NOW).ok);
  const brook = [120, (brookCurve(60) + 0.5) * 2];
  assert.ok(act(s, 'useSkill', { index: 0, x: 10, z: 10, yaw: 0 }, NOW).ok); act(s, 'splashWater', { x: brook[0], z: brook[1] }, NOW);
  const before = JSON.stringify({ cd: s.moves.cd, leap: s.moves.leap });
  const [cx, cz] = weedsOnFarm(s)[0]; assert.ok(act(s, 'swing', faceCell([cx, cz]), NOW + 100).knocked, 'no weed knocked');
  assert.equal(JSON.stringify({ cd: s.moves.cd, leap: s.moves.leap }), before, 'a knock forgot the waits');
  assert.equal(act(s, 'useSkill', { index: 0, x: 10, z: 10, yaw: 0 }, NOW + 200).reason, 'Not ready yet', 'a knock reset a skill');
  // the farm's day starts at 04:00 local: one knock is still counted a minute before, and gone a minute after
  let t = NOW; while (dayKey(t) === dayKey(NOW)) t += 60_000;
  assert.equal(knocksLeft(s, t - 120_000), MOVES.knocks - 1); assert.equal(knocksLeft(s, t + 60_000), MOVES.knocks);
  assert.equal(knocksLeft(s, NOW - 3 * 86_400_000), MOVES.knocks - 1, 'a clock set back gave the knocks again');
});
test('waits saved with a clock that ran fast are never longer than the wait itself', () => {
  const s = newGame(NOW, 68, { restore: true }); tick(s, NOW); s.level = 30;
  assert.ok(act(s, 'setting', { key: 'playerLook', value: 'aodai' }, NOW).ok);
  const brook = [120, (brookCurve(60) + 0.5) * 2], ahead = NOW + 3 * 86_400_000;
  assert.ok(act(s, 'useSkill', { index: 0, x: 10, z: 10, yaw: 0 }, ahead).ok); act(s, 'splashWater', { x: brook[0], z: brook[1] }, ahead);
  const cd = SKILLS.dz_aodai[0].cd * 1000; tick(s, NOW);   // the clock put right
  assert.ok(skillsNow(s, NOW)[0].readyAt <= NOW + cd, 'the button shows a wait of days');
  assert.ok(act(s, 'useSkill', { index: 0, x: 10, z: 10, yaw: 0 }, NOW + cd + 1).ok, 'the skill stayed locked after the clock was put right');
  let caught = 0; for (let i = 0; i < 5; i++) if (act(s, 'splashWater', { x: brook[0], z: brook[1] }, NOW + 2 * LEAP.everyMs + 1000 + i * 1000).caught) caught++;
  assert.equal(caught, 1, 'no fish for days after the clock was put right');
});
test('a tired swimmer always ends on the bank: every deep spot of the brook and the pond, even when the way back is wiped', () => {
  const s = newGame(NOW, 69, { restore: true }); tick(s, NOW);
  const room = { roomId: 'farmhouse_main', interactions: [], entry: { position: [0, 0, 0] } }, starts = [];
  for (let x = POND_WATER.x - POND_WATER.rx; x <= POND_WATER.x + POND_WATER.rx; x += 1.5) for (let z = POND_WATER.z - POND_WATER.rz; z <= POND_WATER.z + POND_WATER.rz; z += 1.5) if (depthAt(x, z) >= SWIM.shallow) starts.push([x, z]);
  const pond = starts.length; assert.ok(pond > 3, 'the pond has no deep water');
  for (let x = 1; x < 2 * 96; x += 3.3) { const z = (brookCurve(x / 2) + 0.5) * 2; if (depthAt(x, z) >= SWIM.shallow) starts.push([x, z]); }
  assert.ok(starts.length - pond > 20, 'the brook has no deep water');
  const stranded = [];
  for (const [i, p] of starts.entries()) {
    assert.ok(startExplore(s, [57, 118], room, new Set())); const e = exploreSession(s);
    Object.assign(e, { p: [...p], inWater: true, breath: 0.05, route: [], tired: false });
    let n = 0; for (; n < 260 && (e.tired || !n); n++) { if (n % 9 === 4 && i % 2) e.route = []; moveExplore(s, 0, i % 3 ? -1 : 0, 0.1); }   // (pushing the stick does nothing while tired)
    if (e.tired || !(depthAt(...e.p) <= SWIM.edge) || waterCell(...e.p.map(v => Math.floor(v / 2)))) stranded.push([p.map(v => +v.toFixed(1)), e.p.map(v => +v.toFixed(2)), n]);
    assert.ok(dryPlace(s).every(Number.isFinite));
  }
  assert.deepEqual(stranded, [], 'left in the water');
// Step 6: shape at the mirror (content/wardrobe.mjs HEIGHTS, the ears and hoods)
import { HATS, HEIGHTS, heightOf } from '../src/content/wardrobe.mjs';
import { readFileSync } from 'node:fs';
test('the mirror sets a height (looks only), and the ears and hoods are hats with a model and a picture', () => {
  const s = newGame(NOW, 66, { restore: true });
  assert.equal(heightOf(s), 1, 'a new farmer is not of usual height');
  for (const [i, h] of HEIGHTS.entries()) { assert.ok(act(s, 'setting', { key: 'playerHeight', value: i }, NOW).ok); assert.equal(heightOf(s), h.k); }
  for (const bad of [5, -1, 2.5, 'x', '__proto__']) assert.equal(act(s, 'setting', { key: 'playerHeight', value: bad }, NOW).ok, false, `height ${bad} taken`);
  assert.ok(act(s, 'setting', { key: 'playerHeight', value: '1' }, NOW).ok, 'the mirror sends the index as text'); assert.equal(heightOf(s), HEIGHTS[1].k);
  assert.equal(heightOf(unpack(pack(s))), HEIGHTS[1].k, 'the height is not saved');
  const glb = readFileSync(new URL('../public/assets/models/rigged/wear.glb', import.meta.url));
  const nodes = new Set(JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()).nodes.map(n => n.name));
  const zoo = Object.keys(HATS).filter(id => /^(ears|hood)_/.test(id));
  assert.equal(zoo.length, 14);
  for (const id of Object.keys(HATS)) assert.ok(nodes.has(id), `no model for ${id} in wear.glb`);
  for (const id of zoo) assert.ok(HATS[id].level >= 1 && HATS[id].level <= 24);
});
