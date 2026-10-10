import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/state.mjs';
import { actions, growthStatus, unreadGrowth, civicBuildReason } from '../src/core/village-growth.mjs';
import { newGrowth, normalizeGrowth } from '../src/core/growth-state.mjs';
import { eligibleCompanyStaff, companyWorkerMultiplier } from '../src/core/company-benefits.mjs';
import { actions as production } from '../src/core/production.mjs';
import { actions as market, tickTruck } from '../src/core/market.mjs';
import { GROWTH, BULK_REQUESTS, COMPANY_BRANDS, HOSPITAL_MEMORY } from '../src/content/village-growth.mjs';
import { RECIPES } from '../src/content/goods.mjs';
import { FAMILIES, allPeople } from '../src/content/people.mjs';
import { TRUCK } from '../src/content/economy.mjs';
import { VI_GROWTH } from '../src/i18n/vi-growth.mjs';
import { VI } from '../src/i18n/vi.mjs';
import { renderVillageGrowth, renderGrowthMemory } from '../src/ui/village-growth-panel.mjs';

const NOW = 1_700_000_000_000;
const context = (s, now = NOW) => ({ s, now, events: [], emit(type, data = {}) { this.events.push({ type, ...data }); }, fail: (reason, params) => ({ ok: false, reason, params }) });
const call = (s, action, payload = {}, now = NOW) => { const c = context(s, now), out = actions[action](c, payload) ?? {}; return { ok: out.ok !== false, ...out, events: c.events }; };
const refused = (s, action, payload = {}, now = NOW) => { const before = structuredClone(s), r = call(s, action, payload, now); assert.equal(r.ok, false); assert.deepEqual(r.events, []); assert.deepEqual(s, before); };
function ready() {
  const s = newGame(NOW, 71, { restore: true }); s.level = 15; s.coins = 30_000; s.story.chapter = 5; s.projects.step = 100;
  s.placed = Object.fromEntries(['company', 'clinic', 'market', 'police', 'juice_press', 'noodle_factory', 'cottage'].map((kind, i) => [kind, { kind, x: i * 6, z: 0, rot: 0 }]));
  s.counts = Object.fromEntries(Object.values(s.placed).map(p => [p.kind, 1])); s.cond = {}; s.repairing = {};
  s.homes = { cottage: { family: 'tran', arrived: true, arrivesAt: NOW } }; s.growth = newGrowth();
  s.production = { juice_press: { slots: 6, queue: [] }, noodle_factory: { slots: 6, queue: [] } };
  s.truck = { level: 1, away: false, backAt: 0, load: [], coins: 0, fleet: [] };
  s.barn.items = { herb: 100, ginseng: 100, wheat: 100, egg: 100, carrot: 100, carrot_juice: 100, orange_juice: 100, noodles: 100, instant_noodles: 100 };
  s.barn.cap = 2000; return s;
}
const hire = (s, role, person, building) => { const r = call(s, 'hireCompanyStaff', { role, person, building }); assert.equal(r.ok, true, r.reason); };
function send(s, now = NOW) { const status = growthStatus(s, now), r = call(s, 'sendCompanyDelivery', { id: status.next.id }, now); assert.equal(r.ok, true, r.reason); return r; }
function back(s, now = NOW + TRUCK.tripMs) { const c = context(s, now); tickTruck(c); return c.events; }
function collect(s) { const c = context(s); const r = market.collectTruck(c); assert.notEqual(r.ok, false); return r; }

test('hospital upgrade validates before payment, preserves the clinic and records a read-once family memory', () => {
  const s = ready(), placed = structuredClone(s.placed), money = s.coins;
  s.level = 9; refused(s, 'upgradeHospital'); s.level = 15;
  s.story.chapter = 4; refused(s, 'upgradeHospital'); s.story.chapter = 5;
  s.cond.clinic = { level: 3 }; refused(s, 'upgradeHospital'); delete s.cond.clinic;
  s.barn.items.ginseng = 1; refused(s, 'upgradeHospital'); s.barn.items.ginseng = 2;
  assert.equal(call(s, 'upgradeHospital').ok, true); assert.equal(s.coins, money - 1800); assert.equal(s.barn.items.herb, 94);
  assert.equal(s.barn.items.ginseng, undefined); assert.deepEqual(s.placed, placed); assert.equal(unreadGrowth(s), 1);
  refused(s, 'upgradeHospital'); call(s, 'readGrowthMemory', { id: 'hospital' }); assert.equal(unreadGrowth(s), 0);
  delete s.growth; assert.equal(normalizeGrowth(s).hospitalAt, NOW); refused(s, 'upgradeHospital');
});

test('growth reads never initialize old saves; only actual working factories count and civic story gates remain explicit', () => {
  const s = ready(); delete s.growth; const before = structuredClone(s); growthStatus(s); normalizeGrowth(s); assert.deepEqual(s, before);
  assert.equal(civicBuildReason(s, 'company'), null); s.cond.noodle_factory = { level: 3 };
  assert.equal(growthStatus(s).ready, false); assert.match(civicBuildReason(s, 'company'), /two different/);
  s.placed.bakery = { kind: 'bakery' }; s.placed.mill = { kind: 'feed_mill' }; assert.equal(growthStatus(s).ready, false);
  // the civic row opens with the homecoming chapter or, failing that, with a working clinic (so no farm is stuck with ruins)
  s.story.chapter = 4; assert.equal(civicBuildReason(s, 'police'), null);
  for (const id of Object.keys(s.placed)) if (s.placed[id].kind === 'clinic') delete s.placed[id];
  assert.match(civicBuildReason(s, 'police'), /chapter/);
});

test('company hires arrived adults only, no child, duplicate role or away family, with atomic refused actions', () => {
  const s = ready(); assert.deepEqual(eligibleCompanyStaff(s, NOW).map(p => p.id), ['minh', 'lan']);
  refused(s, 'hireCompanyStaff', { role: 'worker', person: 'bo', building: 'juice_press' });
  refused(s, 'hireCompanyStaff', { role: 'manager', person: 'sam' });
  s.homes.cottage.arrived = false; refused(s, 'hireCompanyStaff', { role: 'manager', person: 'lan' }); s.homes.cottage.arrived = true;
  s.homes.cottage.arrivesAt = NOW + 1; refused(s, 'hireCompanyStaff', { role: 'manager', person: 'lan' }); s.homes.cottage.arrivesAt = NOW;
  const coins = s.coins; hire(s, 'worker', 'minh', 'juice_press'); assert.equal(s.coins, coins - GROWTH.hiring.worker);
  refused(s, 'hireCompanyStaff', { role: 'manager', person: 'minh' });
  refused(s, 'hireCompanyStaff', { role: 'worker', person: 'lan', building: 'noodle_factory' });
  hire(s, 'manager', 'lan'); assert.equal(s.coins, coins - 300);
  call(s, 'releaseCompanyStaff', { role: 'worker' }); assert.equal(s.coins, coins - 300); assert.equal(companyWorkerMultiplier(s, 'juice_press', NOW), 1);
});

test('the worker changes only new assigned-factory duration; a manager atomically authorizes real independent trays', () => {
  const s = ready(); hire(s, 'worker', 'minh', 'juice_press');
  assert.equal(companyWorkerMultiplier(s, 'juice_press', NOW), 0.9); assert.equal(companyWorkerMultiplier(s, 'noodle_factory', NOW), 1);
  const c = context(s); production.produce(c, { building: 'juice_press', recipe: 'carrot_juice' });
  assert.equal(s.production.juice_press.queue[0].doneAt, NOW + RECIPES.carrot_juice.timeMs * 0.9);
  refused(s, 'companyBatch', { building: 'juice_press', recipe: 'carrot_juice', count: 3 });
  hire(s, 'manager', 'lan'); const carrots = s.barn.items.carrot;
  s.undo = [{ type: 'place', kind: 'company', id: 'company' }];
  refused(s, 'companyBatch', { building: 'juice_press', recipe: 'carrot_juice', count: 0 });
  assert.equal(s.undo[0].civicUsed, undefined);
  assert.equal(call(s, 'companyBatch', { building: 'juice_press', recipe: 'carrot_juice', count: 3 }).ok, true);
  assert.equal(s.undo[0].civicUsed, true);
  assert.equal(s.barn.items.carrot, carrots - 12); assert.equal(s.production.juice_press.queue.length, 4);
  assert.equal(new Set(s.production.juice_press.queue.map(job => job.slot)).size, 4);
  assert.equal(new Set(s.production.juice_press.queue.map(job => job.doneAt)).size, 1);
  refused(s, 'companyBatch', { building: 'juice_press', recipe: 'carrot_juice', count: 3 });
  refused(s, 'companyBatch', { building: 'juice_press', recipe: 'carrot_juice', count: 0 });
  s.cond.company = { level: 3 }; assert.equal(companyWorkerMultiplier(s, 'juice_press', NOW), 1);
});

test('bulk requests use one actual empty fleet truck, quote the police bonus once, and pay through normal return/collection', () => {
  const s = ready(), money = s.coins; s.truck.load = [{ good: 'wheat', n: 1 }];
  refused(s, 'sendCompanyDelivery', { id: 'pantry' });
  s.truck.fleet.push({ away: false, backAt: 0, load: [], coins: 0 }); const result = send(s);
  assert.equal(result.truck, 1); assert.equal(s.truck.away, false); assert.equal(s.truck.fleet[0].away, true);
  assert.equal(s.coins, money); assert.equal(s.barn.items.carrot_juice, 94); assert.equal(s.barn.items.noodles, 92);
  refused(s, 'sendCompanyDelivery', { id: 'pantry' });
  delete s.placed.police; assert.equal(back(s).find(e => e.type === 'companyDelivered').coins, 630);
  assert.equal(s.truck.fleet[0].coins, 630); assert.equal(s.coins, money); assert.match(growthStatus(s).reason, /Collect/);
  assert.deepEqual(back(s), []); assert.equal(collect(s).coins, 630); assert.equal(s.coins, money + 630);
  assert.equal(s.truck.fleet[0].companyDelivery, undefined); assert.equal(growthStatus(s).next.id, 'care');
});

test('three branded requests repeat safely after collection, with only three earned stories and bounded ledgers', () => {
  const s = ready(); call(s, 'upgradeHospital'); call(s, 'readGrowthMemory', { id: 'hospital' });
  const seen = [];
  for (let i = 0; i < 7; i++) {
    seen.push(growthStatus(s).next.id); const result = send(s, NOW + i * 100_000); assert.equal(result.sequence, i + 1);
    back(s, NOW + i * 100_000 + TRUCK.tripMs); collect(s);
  }
  assert.deepEqual(seen, ['pantry', 'care', 'lunch', 'pantry', 'care', 'lunch', 'pantry']);
  assert.equal(Object.keys(s.growth.memories).length, 3); assert.equal(unreadGrowth(s), 3);
  for (const id of ['pantry', 'care', 'lunch']) call(s, 'readGrowthMemory', { id });
  assert.equal(unreadGrowth(s), 0); const coins = s.coins;
  send(s, NOW + 800_000); back(s, NOW + 900_000); collect(s); assert.equal(unreadGrowth(s), 0); assert.ok(s.coins > coins);
  assert.ok(Object.keys(s.firsts).filter(k => k.startsWith('growth:')).length <= 7);
});

test('hospital request cannot dispatch without the upgrade, existing fleet capacity and supplies are real constraints', () => {
  const s = ready(); send(s); back(s); collect(s); refused(s, 'sendCompanyDelivery', { id: 'care' });
  call(s, 'upgradeHospital'); s.cond.road_south = { level: 3 }; refused(s, 'sendCompanyDelivery', { id: 'care' }); delete s.cond.road_south;
  s.barn.items.herb = 0; refused(s, 'sendCompanyDelivery', { id: 'care' });
  assert.ok(growthStatus(s).units <= TRUCK.capacity[0]);
});

test('save reload and backup ledgers preserve a trip, payment and stories without paying twice or restarting lost cargo', () => {
  let s = ready(); send(s); delete s.growth; s = JSON.parse(JSON.stringify(s));
  assert.equal(growthStatus(s).active.sequence, 1); back(s); assert.equal(s.truck.coins, 630);
  delete s.growth; back(s); assert.equal(s.truck.coins, 630); collect(s); assert.equal(normalizeGrowth(s).settled, 1);
  const paid = s.coins; delete s.growth; assert.equal(growthStatus(s).next.id, 'care'); assert.equal(s.coins, paid);
  const lost = ready(); send(lost); delete lost.truck.companyDelivery; const before = structuredClone(lost);
  assert.equal(growthStatus(lost).next.id, 'care'); assert.deepEqual(lost, before);
  back(lost); assert.equal(lost.truck.coins, Math.round((6 * 26 + 8 * 30) * TRUCK.pay));
});

test('malformed optional records are bounded, old saves and separate profiles get no retroactive cash or stock', () => {
  const s = ready(); s.growth = { hospitalAt: 'bad', sent: NaN, returned: Infinity, settled: -4, staff: { worker: { person: 'bo', building: 'juice_press' } }, memories: { pantry: 'bad' }, read: ['unknown'] };
  s.firsts['growth:hospital'] = 'damaged'; const before = structuredClone(s), n = normalizeGrowth(s);
  assert.equal(n.sent, 0); assert.equal(n.hospitalAt, null); assert.equal(n.staff.worker, null); assert.deepEqual(s, before);
  call(s, 'upgradeHospital'); assert.equal(s.firsts['growth:hospital'], NOW); delete s.growth; refused(s, 'upgradeHospital');
  assert.equal(growthStatus(ready()).hospitalAt, null); refused(s, 'readGrowthMemory', { id: '__proto__' });
});

test('partial imports retire lost cargo or lost returned coins instead of trapping the company or inventing payment', () => {
  for (const afterReturn of [false, true]) {
    const s = ready(); send(s); if (afterReturn) back(s);
    s.truck.load = []; s.truck.coins = 0;
    const money = s.coins, before = structuredClone(s), status = growthStatus(s);
    assert.equal(status.active, null); assert.equal(status.next.id, 'care'); assert.deepEqual(s, before);
    back(s); assert.equal(s.truck.coins, 0); assert.equal(s.coins, money);
    assert.equal(Object.hasOwn(normalizeGrowth(s).memories, 'pantry'), afterReturn);
  }
});

test('earned company memories remain accessible when the company or a factory stops working', () => {
  const s = ready(); send(s); back(s); collect(s);
  for (const id of ['company', 'juice_press']) {
    s.cond[id] = { level: 3 }; assert.equal(growthStatus(s).ready, false);
    assert.match(renderVillageGrowth(s, NOW), /data-do="growthMemory" data-id="pantry"/);
    assert.match(renderGrowthMemory(s, 'pantry'), /Our noodles have a label now/);
    assert.equal(unreadGrowth(s), 1); delete s.cond[id];
  }
});

test('new civic stories use introduced adults and child voices, with full Vietnamese text and matching placeholders', () => {
  const lines = [...HOSPITAL_MEMORY.lines, ...BULK_REQUESTS.flatMap(r => r.memory)], ids = new Set(allPeople().map(p => p.id));
  for (const line of lines) { assert.ok(ids.has(line.who)); assert.ok(VI_GROWTH[line.text]); assert.doesNotMatch(VI_GROWTH[line.text], /\btôi\b/u); }
  for (const line of lines.filter(l => l.who === 'pip')) assert.doesNotMatch(VI_GROWTH[line.text], /\b(cháu|tớ)\b/u);
  const strings = [HOSPITAL_MEMORY.title, ...Object.values(COMPANY_BRANDS), ...BULK_REQUESTS.flatMap(r => [r.title, r.text])];
  for (const str of strings) assert.ok(VI_GROWTH[str], str);
  for (const file of ['src/core/village-growth.mjs', 'src/ui/village-growth-panel.mjs']) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const match of source.matchAll(/(?:ctx\.fail|\bt)\('([^']+)'/g)) assert.ok(VI_GROWTH[match[1]] ?? VI[match[1]], match[1]);
    // Status reasons and ternary labels reach t() through variables; the generic t-literal scanner cannot see them.
    for (const match of source.matchAll(/'([A-Z][^'\r\n]* [^'\r\n]*)'/g)) assert.ok(VI_GROWTH[match[1]] ?? VI[match[1]], match[1]);
  }
  for (const [en, vi] of Object.entries(VI_GROWTH)) assert.deepEqual([...en.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...vi.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort());
  for (const kind of ['police', 'company']) { const early = { ...ready(), story: { chapter: 4 } }; early.placed = Object.fromEntries(Object.entries(early.placed).filter(([, p]) => p.kind !== 'clinic')); assert.ok(VI_GROWTH[civicBuildReason(early, kind)]); }
  assert.ok(FAMILIES.flatMap(f => f.people).filter(p => p.kid).every(p => !eligibleCompanyStaff(ready(), NOW).some(a => a.id === p.id)));
});
