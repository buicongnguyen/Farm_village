import './tz.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate, SAVE_VERSION } from '../src/core/state.mjs';
import { act } from '../src/core/act.mjs';
import { newContracts, normalizeContracts, contractStatus, contractMemories, unreadContracts } from '../src/core/contracts.mjs';
import { CONTRACTS, PICNIC_MENU, CONTRACT_REQUIREMENTS } from '../src/content/contracts.mjs';
import { STEPS } from '../src/content/projects.mjs';
import { CROPS, RECIPES, ANIMALS } from '../src/content/goods.mjs';
import { VI_CONTRACTS } from '../src/i18n/vi-contracts.mjs';
import { renderContracts, renderContractMemories, renderContractMemory } from '../src/ui/contracts-panel.mjs';
import { setLanguage } from '../src/kit/i18n.mjs';
import { T0, setLevel, must } from './helpers.mjs';

function farm() {
  const s = newGame(T0, 991);
  setLevel(s, 9); s.coins = 500; s.projects.step = STEPS.length; s.story.chapter = 3; s.story.tutorial = 999;
  s.barn = { cap: 200, upgrades: 0, items: {} };
  s.placed = {
    bed: { kind: 'bed', x: 32, z: 57, rot: 0 },
    mill: { kind: 'feed_mill', x: 33, z: 58, rot: 0 },
    coop: { kind: 'coop', x: 36, z: 58, rot: 0 },
    juice: { kind: 'juice_press', x: 39, z: 58, rot: 0 },
    noodle: { kind: 'noodle_factory', x: 42, z: 58, rot: 0 },
    home: { kind: 'cottage', x: 18, z: 30, rot: 0 },
  };
  s.counts = { bed: 1, feed_mill: 1, coop: 1, juice_press: 1, noodle_factory: 1, cottage: 1 };
  s.animals.coop = [{ kind: 'hen', doneAt: null }, { kind: 'hen', doneAt: null }];
  s.homes.home = { family: 'tran', arrived: true, arrivesAt: T0 - 1, rentFrom: T0, level: 0 };
  return s;
}
function refused(s, action, id, now = T0) {
  const before = structuredClone(s), result = act(s, action, { id }, now);
  assert.equal(result.ok, false, `${action} ${String(id)} must refuse`);
  assert.deepEqual(result.events, []); assert.deepEqual(s, before, 'a refused request must not initialize or change any state');
  return result;
}
const finish = (s, request, now = T0) => {
  Object.assign(s.barn.items, request.need);
  must(s, 'acceptContract', { id: request.id }, now);
  return must(s, 'deliverContract', { id: request.id }, now);
};
const nextBatch = (s, index) => { for (const request of CONTRACTS.slice(0, index)) finish(s, request); };

test('the actual family arrival and chapter introduction gate requests, independently of the optional ribbon trail', () => {
  const s = farm(); assert.equal(s.mode, null); assert.equal(contractStatus(s).canAccept, true);
  assert.equal(contractStatus(s).line, CONTRACTS[0].line); assert.equal(unreadContracts(s), 0);
  s.story.chapter = 2; refused(s, 'acceptContract', CONTRACTS[0].id); s.story.chapter = 3;
  s.homes.home.arrived = false; refused(s, 'acceptContract', CONTRACTS[0].id); s.homes.home.arrived = true;
  s.homes.home.arrivesAt = T0 + 1; refused(s, 'acceptContract', CONTRACTS[0].id);
  s.homes.home.arrivesAt = T0; assert.equal(contractStatus(s, T0).canAccept, true);
  s.exploration = { steps: ['porch', 'pond'], read: [], completedAt: null };
  assert.equal(contractStatus(s).line, CONTRACTS[0].line);
  s.exploration = { steps: ['porch', 'pond', 'share'], read: [], completedAt: T0 };
  assert.equal(contractStatus(s).line, CONTRACTS[0].ribbonLine);
});

test('preview reports actual recipe, working maker and crop-source prerequisites without initializing queues', () => {
  const s = farm(); setLevel(s, 5); delete s.placed.juice; delete s.placed.bed; delete s.contracts;
  const before = structuredClone(s), status = contractStatus(s);
  assert.equal(status.canAccept, false);
  assert.deepEqual(status.blockers.map(b => b.kind), ['level', 'maker', 'beds']);
  assert.equal(status.blockers[0].params.level, 6); assert.equal(status.blockers[1].building, 'juice_press');
  assert.deepEqual(s, before); refused(s, 'acceptContract', CONTRACTS[0].id);
  s.known.carrot_juice = true; s.barn.items.carrot = 8; s.placed.juice = { kind: 'juice_press' };
  assert.equal(contractStatus(s).canAccept, true, 'an early learned recipe and existing ingredients satisfy their actual sources');
  s.cond.juice = { level: 3, ms: 0 }; assert.equal(contractStatus(s).canAccept, false);
  delete s.cond.juice; s.repairing.juice = { doneAt: T0 + 1000 }; assert.equal(contractStatus(s).canAccept, false);
});

test('wheat, carrot seeds, feed, eggs and both live makers produce the full menu through act()', () => {
  const s = farm(); let now = T0;
  const growTo = (crop, amount) => {
    while ((s.barn.items[crop] ?? 0) < amount) {
      must(s, 'plant', { id: 'bed', crop }, now); now += CROPS[crop].growMs;
      must(s, 'harvest', { id: 'bed' }, now);
    }
  };
  const make = recipe => {
    const building = recipe === 'chicken_feed' ? 'mill' : recipe === 'carrot_juice' ? 'juice' : 'noodle';
    must(s, 'produce', { building, recipe }, now); now += RECIPES[recipe].timeMs;
    must(s, 'collectProducts', { building }, now);
  };
  growTo('wheat', 22); growTo('carrot', 18);
  make('chicken_feed'); make('chicken_feed');
  for (let batch = 0; batch < 2; batch++) {
    assert.equal(must(s, 'feed', { home: 'coop' }, now).fed, 2); now += ANIMALS.hen.everyMs;
    assert.equal(must(s, 'collect', { home: 'coop' }, now).collected, 2);
  }
  const before = { coins: s.coins, earned: s.stats.coinsEarned, orders: s.stats.ordersFilled };
  for (const [index, request] of CONTRACTS.entries()) {
    assert.equal(contractStatus(s, now).next.id, request.id);
    const oldBarn = structuredClone(s.barn), oldCoins = s.coins;
    const accepted = must(s, 'acceptContract', { id: request.id }, now);
    assert.ok(accepted.events.some(e => e.type === 'contractAccepted' && e.id === request.id));
    assert.deepEqual(s.barn, oldBarn); assert.equal(s.coins, oldCoins); assert.equal(unreadContracts(s), index);
    if (index === 0) { make('carrot_juice'); make('carrot_juice'); }
    if (index === 1) { make('noodles'); make('noodles'); }
    if (index === 2) { make('noodles'); make('noodles'); make('instant_noodles'); make('instant_noodles'); make('carrot_juice'); make('carrot_juice'); }
    const xp = s.xp, delivered = must(s, 'deliverContract', { id: request.id }, now);
    assert.equal(delivered.coins, request.coins); assert.equal(s.xp, xp, 'delivery must not add XP');
    assert.deepEqual(delivered.events.filter(e => e.type === 'contractDelivered'), [{ type: 'contractDelivered', id: request.id, coins: request.coins, person: 'lan' }]);
    assert.equal(s.news[0].type, 'contractDelivered'); assert.equal(s.firsts[`contract:${request.id}`], now);
    for (const good of Object.keys(request.need)) assert.equal(s.barn.items[good] ?? 0, 0);
    refused(s, 'deliverContract', request.id, now);
  }
  assert.equal(s.coins - before.coins, 520); assert.equal(s.stats.coinsEarned - before.earned, 520);
  assert.equal(s.stats.ordersFilled, before.orders); assert.equal(s.story.chapter, 3);
  assert.deepEqual(s.barn.items, { chicken_feed: 2 });
  assert.equal(contractStatus(s, now).complete, true); assert.equal(contractStatus(s, now).completedCount, 3);
  assert.equal(contractMemories(s).length, 3); assert.equal(unreadContracts(s), 3);
  assert.match(contractMemories(s).at(-1).memory.text, /Beside the pond/);
});

test('acceptance persists through stored and broken makers; finished goods still allow delivery', () => {
  const s = farm(); must(s, 'acceptContract', { id: CONTRACTS[0].id });
  must(s, 'store', { id: 'juice' });
  let status = contractStatus(s); assert.equal(status.active, true); assert.equal(status.blockers[0].building, 'juice_press');
  assert.equal(status.canDeliver, false); refused(s, 'deliverContract', CONTRACTS[0].id);
  s.placed.juice = { kind: 'juice_press' }; s.cond.juice = { level: 3, ms: 0 };
  assert.equal(contractStatus(s).active, true); assert.equal(contractStatus(s).blockers[0].kind, 'maker');
  s.barn.items.carrot_juice = 2; status = contractStatus(s);
  assert.equal(status.canDeliver, true); assert.deepEqual(status.blockers, []);
  must(s, 'deliverContract', { id: CONTRACTS[0].id }); assert.equal(s.coins, 570);
});

test('existing finished goods can be accepted below their recipe level with no maker or inputs', () => {
  const s = farm(); setLevel(s, 1); s.placed = {}; s.animals = {}; s.barn.items = { carrot_juice: 2 };
  assert.deepEqual(contractStatus(s).blockers, []); assert.equal(contractStatus(s).canAccept, true);
  must(s, 'acceptContract', { id: CONTRACTS[0].id }); must(s, 'deliverContract', { id: CONTRACTS[0].id });
  assert.equal(s.coins, 570); assert.deepEqual(s.barn.items, {});
  assert.equal(contractStatus(s).canAccept, false, 'owning the first batch must not unlock later missing products');
});

test('noodle requests require real hens and a feed route unless existing or already-fed supplies cover the batch', () => {
  const s = farm(); nextBatch(s, 1); delete s.placed.mill; s.barn.items.wheat = 8;
  assert.ok(contractStatus(s).blockers.some(b => b.building === 'feed_mill'));
  s.animals.coop.forEach(a => { a.doneAt = T0 + 1000; });
  assert.equal(contractStatus(s).canAccept, true, 'two already-fed hens can produce the two eggs without a feed mill');
  s.animals.coop = []; assert.ok(contractStatus(s).blockers.some(b => b.kind === 'animal'));
  s.barn.items.egg = 2; assert.equal(contractStatus(s).canAccept, true, 'stored eggs need no living source for this batch');
  delete s.barn.items.egg; s.animals.coop = [{ kind: 'hen', doneAt: null }]; s.barn.items.chicken_feed = 2;
  assert.equal(contractStatus(s).canAccept, true, 'one hen can take two turns; the request has no expiry');
  s.cond.coop = { level: 3, ms: 0 }; assert.ok(contractStatus(s).blockers.some(b => b.kind === 'animal'));
});

test('paid-for eggs in a broken or repairing coop cover the batch, while residual demand still needs a working source', () => {
  for (const condition of ['broken', 'repairing']) {
    const s = farm(); nextBatch(s, 1); delete s.placed.bed; delete s.placed.mill;
    s.barn.items = { wheat: 8 };
    s.animals.coop = [{ kind: 'hen', doneAt: T0 }, { kind: 'hen', doneAt: T0 + 1000 }];
    if (condition === 'broken') s.cond.coop = { level: 3, ms: 0 };
    else s.repairing.coop = { doneAt: T0 + 5000 };
    const before = structuredClone(s);
    assert.equal(contractStatus(s).canAccept, true); assert.deepEqual(contractStatus(s).blockers, []); assert.deepEqual(s, before);
    must(s, 'acceptContract', { id: CONTRACTS[1].id });
    assert.equal(must(s, 'collect', { home: 'coop' }, T0 + 1000).collected, 2);
    assert.equal(contractStatus(s).blockers.length, 0, 'collected eggs continue to cover the same requirement');
    s.barn.items.egg = 1;
    assert.ok(contractStatus(s).blockers.some(b => b.kind === 'animal'), 'only the missing extra egg needs a working animal home');
    assert.ok(contractStatus(s).blockers.some(b => b.building === 'feed_mill'), 'the extra egg also needs an actual feed source');
  }
});

test('shared inputs are counted once across the final batch instead of promising the same carrots twice', () => {
  const s = farm(); nextBatch(s, 2); delete s.placed.bed;
  s.barn.items = { noodles: 4, carrot: 8 };
  assert.equal(contractStatus(s).canAccept, false); assert.ok(contractStatus(s).blockers.some(b => b.kind === 'beds' && b.good === 'carrot'));
  s.barn.items.carrot = 10; assert.equal(contractStatus(s).canAccept, true);
  const before = structuredClone(s); contractStatus(s); contractMemories(s); unreadContracts(s); assert.deepEqual(s, before);
});

test('already-paid queued finished output covers source needs, but cannot be delivered until collected', () => {
  const s = farm(); setLevel(s, 1); delete s.placed.bed; s.cond.juice = { level: 3, ms: 0 };
  s.production.juice = { slots: 2, queue: [{ recipe: 'carrot_juice', doneAt: T0 + 100 }, { recipe: 'carrot_juice', doneAt: T0 + 200 }] };
  assert.equal(contractStatus(s).canAccept, true); must(s, 'acceptContract', { id: CONTRACTS[0].id });
  assert.equal(contractStatus(s).canDeliver, false); refused(s, 'deliverContract', CONTRACTS[0].id);
  must(s, 'collectProducts', { building: 'juice' }, T0 + 200);
  assert.equal(contractStatus(s).canDeliver, true); must(s, 'deliverContract', { id: CONTRACTS[0].id }, T0 + 200);
  const orphan = farm(); delete orphan.placed.juice; delete orphan.placed.bed;
  orphan.production.juice = { slots: 2, queue: [{ recipe: 'carrot_juice', doneAt: T0 }, { recipe: 'carrot_juice', doneAt: T0 }] };
  assert.equal(contractStatus(orphan).canAccept, false, 'an imported orphan queue must not pretend a placed source exists');
});

test('deliveries preserve village project goods and never advance ordinary order statistics', () => {
  const s = farm(); s.projects.step = STEPS.findIndex(step => step.id === 'cottage2');
  s.barn.items = { bread: 5, carrot_juice: 2 }; const before = { orders: s.stats.ordersFilled, delivered: structuredClone(s.projects.delivered), step: s.projects.step };
  must(s, 'acceptContract', { id: CONTRACTS[0].id }); must(s, 'deliverContract', { id: CONTRACTS[0].id });
  assert.deepEqual(s.barn.items, { bread: 5 }); assert.equal(s.stats.ordersFilled, before.orders);
  assert.equal(s.projects.step, before.step); assert.deepEqual(s.projects.delivered, before.delivered);
});

test('unknown, duplicate, premature and invalid-clock actions refuse without mutating any save fields', () => {
  const s = farm(); delete s.contracts;
  for (const id of [undefined, null, {}, 'constructor', '__proto__', 'missing', CONTRACTS[1].id, CONTRACTS[2].id]) {
    refused(s, 'acceptContract', id); refused(s, 'deliverContract', id); refused(s, 'readContract', id);
  }
  for (const now of [-1, NaN, Infinity, '123']) refused(s, 'acceptContract', CONTRACTS[0].id, now);
  refused(s, 'deliverContract', CONTRACTS[0].id); refused(s, 'readContract', CONTRACTS[0].id);
  must(s, 'acceptContract', { id: CONTRACTS[0].id }); refused(s, 'acceptContract', CONTRACTS[0].id);
  s.barn.items.carrot_juice = 1; refused(s, 'deliverContract', CONTRACTS[0].id);
  s.barn.items.carrot_juice = 2;
  for (const now of [-1, NaN, Infinity, '123']) refused(s, 'deliverContract', CONTRACTS[0].id, now);
});

test('migration gives no retroactive pay or memories, while read state and rewards survive reloads per profile', () => {
  const a = farm(), b = farm(), c = farm(); delete a.contracts; a.version = 8; a.barn.items.carrot_juice = 20;
  const coins = a.coins, xp = a.xp, items = structuredClone(a.barn.items);
  const loaded = migrate(structuredClone(a)); assert.equal(loaded.version, SAVE_VERSION);
  assert.deepEqual(loaded.contracts, newContracts()); assert.equal(loaded.coins, coins); assert.equal(loaded.xp, xp); assert.deepEqual(loaded.barn.items, items);
  finish(loaded, CONTRACTS[0]); nextBatch(b, 2);
  let restored = migrate(JSON.parse(JSON.stringify(loaded)));
  assert.equal(unreadContracts(restored), 1); assert.equal(unreadContracts(b), 2); assert.equal(unreadContracts(c), 0);
  const balance = restored.coins; must(restored, 'readContract', { id: CONTRACTS[0].id });
  restored = migrate(JSON.parse(JSON.stringify(restored))); assert.equal(unreadContracts(restored), 0);
  const snapshot = structuredClone(restored); const replay = must(restored, 'readContract', { id: CONTRACTS[0].id });
  assert.deepEqual(replay.events, []); assert.deepEqual(restored, snapshot); assert.equal(restored.coins, balance);
  refused(restored, 'deliverContract', CONTRACTS[0].id); refused(restored, 'readContract', CONTRACTS[1].id);
});

test('partial completion records and the firsts journal prevent repeat payments without inventing earlier memories', () => {
  const s = farm(); delete s.contracts; s.firsts[`contract:${CONTRACTS[1].id}`] = 0;
  const before = structuredClone(s), saved = normalizeContracts(s);
  assert.deepEqual(saved, { active: null, completed: { 'picnic-noodles': 0 }, retired: ['picnic-drinks'], read: [] });
  assert.deepEqual(s, before); assert.equal(contractStatus(s).next.id, CONTRACTS[2].id); assert.equal(unreadContracts(s), 1);
  refused(s, 'acceptContract', CONTRACTS[0].id); refused(s, 'deliverContract', CONTRACTS[1].id);
  s.contracts = { completed: { 'picnic-noodles': 'damaged' }, read: [CONTRACTS[1].id], active: { id: CONTRACTS[0].id, at: T0 } };
  assert.equal(normalizeContracts(s).completed['picnic-noodles'], 0, 'a damaged primary record must not hide a valid replay guard');
  assert.equal(normalizeContracts(s).active, null); assert.equal(unreadContracts(s), 0);
  s.firsts[`contract:${CONTRACTS[2].id}`] = T0;
  assert.equal(contractStatus(s).complete, true); assert.equal(contractMemories(s).length, 2);
  assert.deepEqual(normalizeContracts({ contracts: normalizeContracts(s) }), normalizeContracts(s));
});

test('delivery repairs an invalid backup stamp and losing the primary record cannot repay that batch', () => {
  for (const malformed of ['damaged', -1, NaN, Infinity, null, {}]) {
    const s = farm(), request = CONTRACTS[0]; s.firsts[`contract:${request.id}`] = malformed;
    finish(s, request, T0 + 7);
    assert.equal(s.firsts[`contract:${request.id}`], T0 + 7);
    const balance = s.coins; delete s.contracts.completed[request.id];
    const restored = migrate(JSON.parse(JSON.stringify(s)));
    assert.equal(restored.contracts.completed[request.id], T0 + 7);
    assert.equal(contractStatus(restored).next.id, CONTRACTS[1].id);
    assert.equal(contractMemories(restored).length, 1);
    refused(restored, 'acceptContract', request.id); refused(restored, 'deliverContract', request.id);
    assert.equal(restored.coins, balance);
  }
});

test('malformed optional state is normalized purely and bounded to the three authored requests', () => {
  for (const saved of [null, [], false, 'picnic-drinks', { completed: { unknown: T0 }, active: { id: 'unknown', at: T0 }, retired: ['unknown'], read: ['picnic-drinks'] }]) {
    const s = farm(); s.contracts = saved; const before = structuredClone(s);
    assert.deepEqual(normalizeContracts(s), newContracts()); assert.deepEqual(s, before);
  }
  const s = farm(); s.contracts = { completed: { 'picnic-drinks': -1, 'picnic-noodles': Infinity }, active: { id: 'picnic-drinks', at: NaN }, retired: [], read: [] };
  assert.deepEqual(normalizeContracts(s), newContracts());
});

test('both languages render the same actions and earned scenes without changing state or acknowledging a memory', async () => {
  const s = farm(); finish(s, CONTRACTS[0]); const before = structuredClone(s);
  for (const language of ['en', 'vi']) {
    await setLanguage(language);
    const list = renderContracts(s, T0), memories = renderContractMemories(s), scene = renderContractMemory(s, CONTRACTS[0].id);
    assert.match(list, /data-contract-id="picnic-noodles"/); assert.match(list, /data-do="acceptContract"/);
    assert.match(list, /data-do="goodHelp" data-good="noodles"/); assert.match(memories, /data-do="contractMemory" data-id="picnic-drinks"/);
    assert.match(scene, /contract-memory-detail/); assert.equal((scene.match(/class="scene-line"/g) ?? []).length, 3);
    assert.match(scene, /data-do="contracts"/); assert.doesNotMatch(scene, /data-do="deliverContract"/);
    assert.equal(unreadContracts(s), 1); assert.deepEqual(s, before);
  }
  await setLanguage('en'); s.story.chapter = 2;
  assert.match(renderContracts(s, T0), /data-contract-locked="true"/);
  assert.doesNotMatch(renderContracts(s, T0), /data-person="lan"|data-do="acceptContract"/);
});

test('every request, prerequisite and short scene has Vietnamese with matching dynamic placeholders', () => {
  const strings = [PICNIC_MENU.title, PICNIC_MENU.text, PICNIC_MENU.introduction, ...Object.values(CONTRACT_REQUIREMENTS)];
  for (const request of CONTRACTS) {
    strings.push(request.title, request.line, request.method, request.memory.title, request.memory.text, ...request.memory.lines.map(line => line.text));
    if (request.ribbonLine) strings.push(request.ribbonLine);
    assert.equal(request.memory.lines.length, 3); assert.ok(request.memory.lines.every(line => ['lan', 'pip', 'june'].includes(line.who)));
    for (const good of Object.keys(request.need)) assert.ok(RECIPES[good]);
    assert.ok(Number.isSafeInteger(request.coins) && request.coins > 0);
  }
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const text of strings) { assert.ok(VI_CONTRACTS[text], text); assert.deepEqual(placeholders(VI_CONTRACTS[text]), placeholders(text)); }
  assert.equal(new Set(CONTRACTS.map(request => request.id)).size, 3);
  assert.equal(CONTRACTS.reduce((sum, request) => sum + request.coins, 0), 520);
});
