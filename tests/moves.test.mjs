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
  for (let i = 0; i < 3; i++) moveExplore(s, 0, -1, 0.1);   // a moment's push: still on the bank
  assert.equal(depthAt(...e.p), 0, 'stepped in at once'); assert.ok(!e.inWater);
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
  let later = 0; for (let i = 0; i < 40; i++) if (act(s, 'splashWater', { x: brook[0], z: brook[1] }, NOW + LEAP.everyMs + 60_000 + i * 1000).caught) later++;
  assert.equal(later, 1, 'no fish after the wait');
  const pond = act(s, 'splashWater', { x: POND_WATER.x, z: POND_WATER.z }, NOW + 1000); assert.ok(pond.ok, 'the village pond is not water');
});
