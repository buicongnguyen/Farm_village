// Moves in Explore (core/moves.mjs, docs/plan/98-zoo-garden-moves.md): the swing.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack } from '../src/kit/save.mjs';
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
