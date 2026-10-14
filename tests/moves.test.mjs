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
