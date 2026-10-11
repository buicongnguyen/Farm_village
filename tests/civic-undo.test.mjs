import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { doorCell } from '../src/core/grid.mjs';
import { RUINS } from '../src/content/world.mjs';
import { RECIPES } from '../src/content/goods.mjs';
import { FAMILIES } from '../src/content/people.mjs';
import { STEPS } from '../src/content/projects.mjs';

const NOW = 1_700_000_000_000;
function farm() {
  const s = newGame(NOW, 71); s.level = 15; s.xp = xpFor(15) + 100;
  s.coins = 30_000; s.story.chapter = 5; s.projects.step = 100;
  for (const [id, kind, x, z] of [['juice', 'juice_press', 32, 58], ['noodle', 'noodle_factory', 40, 58],
    ['market', 'market', 32, 94], ['home', 'cottage', 50, 58]]) {
    s.placed[id] = { kind, x, z, rot: 0 }; s.counts[kind] = 1;
  }
  s.homes.home = { family: 'tran', arrived: true, arrivesAt: NOW };
  s.barn.items = { carrot: 20, carrot_juice: 6, noodles: 8 }; return s;
}
function use(s, action, payload = {}) {
  const out = act(s, action, payload, NOW); assert.equal(out.ok, true, out.reason); return out;
}
function place(s, kind) {
  const site = RUINS.find(r => r.kind === kind), [x, z] = doorCell(kind, site.x, site.z, site.rot);
  use(s, 'place', { kind: 'path', x, z });
  return use(s, 'place', { kind, x: site.x, z: site.z, rot: site.rot });
}
function refuseUndo(s) {
  const before = structuredClone(s), result = act(s, 'undo', {}, NOW);
  assert.equal(result.ok, false); assert.equal(result.reason, 'It is in use now: move it instead');
  assert.deepEqual(result.events, []); assert.deepEqual(s, before);
}

test('an unused new civic building can be undone for its actual cost, including after older deliveries', () => {
  for (const kind of ['police', 'company']) {
    const s = farm(); s.growth.sent = 3; s.growth.returned = 3; s.growth.settled = 3;
    const p = place(s, kind), money = s.coins;
    assert.equal(s.undo.at(-1).growthSent, 3);
    assert.equal(use(s, 'undo').refund, p.price); assert.equal(s.coins, money + p.price);
    assert.equal(s.placed[p.id], undefined); assert.equal(s.counts[kind], 0);
  }
});

test('a police dispatch bonus cannot survive a full-refund undo', () => {
  const s = farm(); place(s, 'company'); const p = place(s, 'police');
  use(s, 'sendCompanyDelivery', { id: 'pantry' });
  assert.equal(s.truck.companyDelivery.police, true); refuseUndo(s);
  assert.equal(s.placed[p.id].kind, 'police');
});

test('an office cannot be fully refunded while staff are assigned or after a dispatch', () => {
  for (const role of ['worker', 'manager']) {
    const s = farm(); place(s, 'company');
    use(s, 'hireCompanyStaff', { role, person: 'minh', building: 'juice' }); refuseUndo(s);
  }
  const s = farm(); place(s, 'company'); use(s, 'sendCompanyDelivery', { id: 'pantry' }); refuseUndo(s);
});

test('worker and manager benefits remain marked after releasing staff and save reload', () => {
  for (const role of ['worker', 'manager']) {
    const s = farm(); place(s, 'company');
    use(s, 'hireCompanyStaff', { role, person: 'minh', building: 'juice' });
    const result = use(s, role === 'worker' ? 'produce' : 'companyBatch', { building: 'juice', recipe: 'carrot_juice', count: 2 });
    assert.equal(result.doneAt - NOW, RECIPES.carrot_juice.timeMs * (role === 'worker' ? 0.9 : 1));
    assert.equal(s.undo.at(-1).civicUsed, true);
    use(s, 'releaseCompanyStaff', { role }); refuseUndo(JSON.parse(JSON.stringify(s)));
  }
});

test('refused company work does not mark an unused office; releasing unused staff permits undo', () => {
  const s = farm(); const p = place(s, 'company');
  use(s, 'hireCompanyStaff', { role: 'manager', person: 'minh' });
  s.barn.items.carrot = 0; const before = structuredClone(s);
  assert.equal(act(s, 'companyBatch', { building: 'juice', recipe: 'carrot_juice', count: 2 }, NOW).ok, false);
  assert.deepEqual(s, before); assert.equal(s.undo.at(-1).civicUsed, undefined);
  use(s, 'releaseCompanyStaff', { role: 'manager' }); assert.equal(use(s, 'undo').refund, p.price);
});

test('old civic undo records without a valid snapshot conservatively honor prior dispatch ledgers', () => {
  for (const snapshot of [undefined, -1, 'bad']) {
    const s = farm(); place(s, 'company'); s.undo.at(-1).growthSent = snapshot;
    s.firsts['growth:sent'] = 1; refuseUndo(s);
  }
});

test('an upgraded clinic cannot be fully refunded on imported progress that already completed its main project', () => {
  const s = farm(); s.projects.step = STEPS.length; s.story.chapter = 4;
  for (const st of STEPS) s.firsts[`project:${st.id}`] = NOW;   // the steps after the clinic are kept by these stamps (core/projects.mjs TAIL)
  delete s.placed.home; s.homes = {};
  for (const [i, family] of FAMILIES.slice(0, 4).entries()) {
    const id = `family${i}`; s.placed[id] = { kind: 'cottage', x: 33 + i * 4, z: 93, rot: 2 };
    s.homes[id] = { family: family.id, arrived: true, arrivesAt: NOW };
  }
  s.counts.cottage = 4; s.barn.items = { herb: 6, ginseng: 2 };
  const site = RUINS.find(r => r.kind === 'clinic');
  const build = () => use(s, 'place', { kind: 'clinic', x: site.x, z: site.z, rot: site.rot });
  // An unused clinic on the same imported project state still permits the ordinary build undo.
  const unused = build(); assert.equal(use(s, 'undo').refund, unused.price);
  const clinic = build(); use(s, 'chapterSeen', { id: 5 }); use(s, 'upgradeHospital');
  assert.equal(s.growth.hospitalAt, NOW); refuseUndo(s); assert.equal(s.placed[clinic.id].kind, 'clinic');
  // The durable upgrade stamp protects the building even if an optional save record was lost.
  const restored = JSON.parse(JSON.stringify(s)); delete restored.growth; refuseUndo(restored);
});
