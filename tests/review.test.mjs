// Rules holes found by the AAA review (rules lens), each pinned through the real act()/tick() so they stay closed.
import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from '../src/core/state.mjs';
import { tickCondition, repairCost } from '../src/core/condition.mjs';
import { xpFor } from '../src/core/levels.mjs';
import { WEAR } from '../src/content/economy.mjs';
import { act, tick } from '../src/core/act.mjs';
import * as grid from '../src/core/grid.mjs';
import { stepIndex, currentStep } from '../src/core/projects.mjs';
import { cartHere } from '../src/core/cart.mjs';
import { chapterReached, letterDue, useBondsData, villageCharm } from '../src/core/bonds.mjs';
import { inGarden, inCartSpot } from '../src/core/reserved.mjs';
import { KEEP_UNREAD } from '../src/core/upgrade.mjs';
import { BEATS } from '../src/content/story.mjs';
import { LETTERS } from '../src/content/letters.mjs';
import { GIFTS } from '../src/core/today.mjs';
import { GOODS } from '../src/content/goods.mjs';
import { allPeople } from '../src/content/people.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { game, must, setLevel, tutorial, T0, MIN, HOUR } from './helpers.mjs';

const DAY = 24 * HOUR;
const types = r => r.events.map(e => e.type);
/** A village at the school step: level 6, the Trans and the Okafors at home, the school's goods delivered. */
function atSchool() {
  const s = game(); tutorial(s); setLevel(s, 6); s.coins = 20000;
  must(s, 'testAddFamily', {}); must(s, 'testAddFamily', {});
  s.projects.step = stepIndex('school'); s.projects.delivered = { bread: 24, corn_bread: 10 };
  return s;
}

test('build XP is paid once per new building: place + undo and store + place mint nothing', () => {
  const s = game(); tutorial(s); setLevel(s, 3); s.coins = 5000;
  const xp0 = s.xp, coins0 = s.coins;
  for (let i = 0; i < 20; i++) { must(s, 'place', { kind: 'bench', x: 40, z: 66 }); must(s, 'undo', {}); }
  assert.equal(s.xp, xp0, 'place + undo leaves the XP as it was'); assert.equal(s.coins, coins0); assert.equal(s.level, 3);
  const id = must(s, 'place', { kind: 'bench', x: 40, z: 66 }).id, xp1 = s.xp;
  assert.ok(xp1 > xp0, 'the first real bench pays its build XP');
  for (let i = 0; i < 20; i++) { must(s, 'store', { id: Object.keys(s.placed).find(k => s.placed[k].kind === 'bench') }); must(s, 'place', { kind: 'bench', x: 40, z: 66 }); }
  assert.equal(s.xp, xp1, 'store + place pays nothing'); assert.ok(id);
  must(s, 'place', { kind: 'bench', x: 42, z: 66 }); assert.ok(s.xp > xp1, 'a second bench is new and pays');
});

test('a finished project step cannot be undone, and the school is never refunded', () => {
  const s = atSchool(), coins = s.coins;
  const r = must(s, 'place', { kind: 'school', x: 40, z: 92, rot: 2 });
  assert.ok(types(r).includes('projectDone'));
  assert.equal(currentStep(s).id, 'cottages34');
  assert.equal(act(s, 'undo', {}).reason, 'Nothing to undo');
  assert.equal(s.counts.school, 1); assert.ok(s.coins < coins, 'the 4000-coin project price stays paid');
});

test('the weekly cart comes the day after the school opens, not in the same action', () => {
  const s = atSchool(), at = T0 + HOUR;
  const r = must(s, 'place', { kind: 'school', x: 40, z: 92, rot: 2 }, at);
  assert.ok(!types(r).includes('cartArrived'), `events: ${types(r)}`);
  assert.equal(cartHere(s), false);
  tick(s, at + MIN); assert.equal(cartHere(s), false, 'not later that day either');
  const next = tick(s, at + DAY); assert.ok(types(next).includes('cartArrived')); assert.ok(cartHere(s));
});

test('story beats come due in their order: Ada names the Okafors before Lan thanks them, after the Trans arrive', () => {
  const s = game(); tutorial(s); setLevel(s, 4); s.coins = 20000;
  const due = () => BEATS.filter(b => !s.story.beats?.includes(b.id) && b.when(s)).map(b => b.id);
  const seeAll = () => { for (const id of due()) must(s, 'beatSeen', { id }); };
  s.stats.ordersFilled = 1; seeAll();                                       // first-loaf
  s.projects.step = stepIndex('cottage1');
  const home = must(s, 'testAddFamily', {}, T0).id;                        // cottage 1, the Trans at home
  assert.ok(s.homes[home].arrived);
  assert.equal(currentStep(s).id, 'cottage2');
  s.projects.delivered.bread = 5;                                          // bread for the second family delivered
  assert.deepEqual(due(), ['okafors-coming'], 'only Ada\'s line first');
  must(s, 'beatSeen', { id: 'okafors-coming' });
  assert.deepEqual(due(), ['welcome-bread']);
  // before the Trans have arrived nobody talks about the next family
  const t = game(); tutorial(t); setLevel(t, 4); t.projects.step = stepIndex('cottage2'); t.projects.delivered = { bread: 5 };
  assert.deepEqual(BEATS.filter(b => b.chapter === 3 && b.when(t)).map(b => b.id), []);
});

test('letters never name what has not happened yet: the tutorial posts no wheat or fence letters early', () => {
  const s = game(), letters = [];
  const run = r => { for (const e of r.events) if (e.type === 'letter') letters.push(e.id); };
  run(act(s, 'clear', { cells: [[34, 59], [35, 60], [34, 61]] }));
  s.coins += 1000;
  for (let i = 0; i < 9; i++) run(act(s, 'place', { kind: 'path', x: 30 + i, z: 63 }));
  for (let i = 0; i < 6; i++) run(act(s, 'place', { kind: 'bed', x: 32 + i, z: 57 }));
  assert.ok(s.level >= 2, `level ${s.level}`);
  assert.ok(!letters.includes('ada-1'), 'no "you sold your first wheat" before an order');
  assert.ok(!letters.includes('gus-1'), 'no "your fence is crooked" before a fence');
  s.stats.ordersFilled = 1; assert.ok(letterDue(s, LETTERS.find(l => l.id === 'ada-1')));
  // Sam thanks you for pumpkins only once a liked gift has been given
  const sam = LETTERS.find(l => l.id === 'sam-1'); s.people.sam = { hearts: 3, scenes: [] };
  assert.equal(letterDue(s, sam), false); s.stats.liked = { sam: 1 }; assert.equal(letterDue(s, sam), true);
});

test('the daily gift waits while the barn is full, and is never lost', () => {
  const s = game(); const day = GIFTS.findIndex(g => Object.keys(g.goods ?? {}).length); assert.ok(day >= 0);
  s.today.giftDay = day; s.today.claimed = false;
  s.barn.items.wheat = s.barn.cap;
  const before = JSON.stringify(s);
  assert.equal(act(s, 'claimGift', {}).reason, 'The barn is full');
  assert.equal(JSON.stringify(s), before, 'nothing changed'); assert.equal(s.today.claimed, false);
  s.barn.items.wheat = 0; must(s, 'claimGift', {});
});

test('the stall takes only whole stacks of one or more, and a broken stack never sells forever', () => {
  const s = game(); s.counts.stall = 1; s.barn.items.pumpkin = 1;
  for (const n of [-5, 0, NaN, 'x']) assert.equal(act(s, 'stallList', { good: 'pumpkin', n }).reason, 'Missing goods', `n = ${n}`);
  assert.equal(s.barn.items.pumpkin, 1); assert.deepEqual(s.stall.items, []);
  s.stall.items.push({ good: 'pumpkin', n: -3 });                          // an old broken save
  tick(s, T0 + 10 * HOUR); assert.deepEqual(s.stall.items, []); assert.equal(s.stall.coins ?? 0, 0);
});

test('every liked gift is a real good', () => {
  const bad = allPeople().flatMap(p => (p.likes ?? []).map(g => [p.id, g])).filter(([, g]) => !GOODS[g]);
  assert.deepEqual(bad, []);
});

test('refused actions leave no trace (slots, products, undo, parcels)', () => {
  const s = game(); tutorial(s); tick(s, T0);
  const coop = 'nothing';
  for (const [a, p] of [['buySlot', {}], ['buySlot', { building: coop }], ['collectProducts', { building: coop }], ['undo', {}], ['buyParcel', {}], ['buyParcel', { parcel: 3 }]]) {
    const before = JSON.stringify(s);
    let r; assert.doesNotThrow(() => { r = act(s, a, p); }, `${a} threw`);
    assert.equal(r.ok, false, `${a} ${JSON.stringify(p)} was accepted`);
    assert.equal(JSON.stringify(s), before, `${a} ${JSON.stringify(p)} changed the state`);
  }
  // a stale undo entry below a valid one: the valid one is undone
  must(s, 'place', { kind: 'path', x: 30, z: 64 }); must(s, 'place', { kind: 'path', x: 31, z: 64 });
  must(s, 'clear', { cells: [[31, 64]] });                                 // lifts the newest path: its entry is stale
  const r = must(s, 'undo', {}); assert.equal(r.undone, 'path'); assert.equal(grid.cellType(s, 30, 64), 'grass');
});

test('actions that change the save emit an event, so the view refreshes and autosave runs', () => {
  const s = game(); s.counts.stall = 1; s.barn.items.wheat = 10;
  assert.ok(types(must(s, 'stallList', { good: 'wheat', n: 3 })).includes('stallListed'));
  const card = s.orders.cards.find(c => !c.story);
  if (card) assert.ok(types(must(s, 'discardOrder', { id: card.id })).includes('orderDiscarded'));
});

test('charm milestones catch up on the first tick after a load', () => {
  useBondsData(null);
  const s = game(); tutorial(s); setLevel(s, 6); s.coins = 20000; const h = s.placed[must(s, 'testAddFamily', {}).id];
  for (let i = 0; i < 6; i++) { const sp = grid.findSpot(s, 'flowers', h.x, h.z - 2, { radius: 6 }); if (sp) must(s, 'place', { kind: 'flowers', ...sp }); }
  assert.ok(villageCharm(s) >= 8);
  s.village.milestones = []; s.village.decor = [];                         // a save from before the milestones
  const loaded = unpack(pack(s));
  const r = tick(loaded, T0 + MIN);
  assert.deepEqual(r.events.filter(e => e.type === 'charmMilestone').map(e => e.at), [8]);
});

for (const name of ['v01-steady-day2', 'v01-keen-day21']) {
  test(`a frozen v0.1 save (${name}) migrates without replaying its opening`, () => {
    const text = readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'), raw = JSON.parse(text);
    assert.equal(raw.version, 1);
    const s = unpack(text), r = tick(s, s.lastSeen + MIN);
    assert.ok(s.mail.filter(m => !m.read).length <= KEEP_UNREAD, `${s.mail.filter(m => !m.read).length} unread letters`);
    assert.equal(r.events.filter(e => e.type === 'letter').length, 0, 'no burst of letters on the first tick');
    const dueBeats = BEATS.filter(b => !s.story.beats.includes(b.id) && b.when(s));
    assert.deepEqual(dueBeats.map(b => b.id), [], 'no beat from the past comes due');
    for (const c of s.orders.cards) {
      const lines = allPeople().find(p => p.id === c.from)?.orders;
      if (lines?.length) assert.ok(lines.includes(c.line), `${c.from}'s card reads "${c.line}"`);
    }
    for (const p of Object.values(s.placed)) if (!p.kind.startsWith('garden')) for (const [x, z] of grid.cellsOf(p.kind, p.x, p.z, p.rot))
      assert.ok(!inGarden(x, z) && !inCartSpot(x, z), `${p.kind} at ${x},${z} sits on a reserved cell`);
    assert.ok(chapterReached(s) >= 1);
    assert.equal(s.level, raw.level, 'the level is kept'); assert.equal(s.coins, raw.coins, 'the coins are kept');
  });
}

function reviewFarm() { const s = newGame(T0, 123); s.cells.fill(0); setLevel(s, 4); s.coins = 10000; return s; }
function expectRefusalUnchanged(s, action, payload, now = T0) {
  const before = JSON.stringify(s); const r = act(s, action, payload, now);
  assert.equal(r.ok, false, `${action} was accepted`); assert.equal(JSON.stringify(s), before, `${action} changed state on refusal`);
  return r;
}
test('undo validates before discarding stale entries, including occupied paths and planted beds', () => {
  for (const kind of ['bed', 'path']) {
    const s = reviewFarm();
    if (kind === 'bed') { const id = must(s, 'place', {kind:'bed',x:40,z:60}).id; must(s,'plant',{id,crop:'wheat'}); }
    else { must(s, 'place', {kind:'path',x:40,z:60}); }
    const bench = must(s, 'place', {kind:'bench',x:42,z:60}).id; must(s, 'store', {id:bench});
    if (kind === 'path') { const moving = must(s,'place',{kind:'bench',x:43,z:60}).id; must(s,'move',{id:moving,x:44,z:60}); must(s,'store',{id:moving}); s.placed.block = {kind:'bench',x:40,z:60,rot:0}; grid.touch(s); }
    expectRefusalUnchanged(s,'undo',{});
  }
});
test('a level gained from a build cannot be kept together with its full undo refund', () => {
  const s=reviewFarm(); s.xp=xpFor(5)-1; const coins=s.coins;
  must(s,'place',{kind:'bench',x:40,z:60}); assert.equal(s.level,5);
  assert.equal(expectRefusalUnchanged(s,'undo',{}).reason,'Earn a little more XP before undoing this build');
  assert.ok(s.coins<coins); s.xp+=5; must(s,'undo',{}); assert.equal(s.coins,coins);
  assert.equal(s.xp,xpFor(5)+4,'only earned XP remains');
});
test('a harvested tree and a used fruit stand cannot be refunded with undo', () => {
  const s=reviewFarm(); const tree=must(s,'place',{kind:'cherry_tree',x:40,z:60}).id;
  must(s,'pick',{id:tree},T0+25000); expectRefusalUnchanged(s,'undo',{},T0+25000);
  must(s,'place',{kind:'path',x:30,z:64}); must(s,'place',{kind:'path',x:31,z:64});
  must(s,'place',{kind:'fruit_stand',x:30,z:65,rot:2}); must(s,'fruitList',{good:'cherry',n:3});
  expectRefusalUnchanged(s,'undo',{}); tick(s,T0+120000); must(s,'fruitCollect',{},T0+120000); expectRefusalUnchanged(s,'undo',{},T0+120000);
});
test('parcel addresses must be canonical: malformed purchases never charge or wipe land', () => {
  const s=reviewFarm();
  for (const parcel of ['00,1','0,01','0,1,extra','0.5,1',' 0,1','0,1 ','-0,1']) expectRefusalUnchanged(s,'buyParcel',{parcel});
  must(s,'buyParcel',{parcel:'0,1'}); assert.ok(s.parcels.includes('0,1')); expectRefusalUnchanged(s,'buyParcel',{parcel:'00,1'});
});
test('inherited object keys are refused as action, building and placement ids', () => {
  const s=reviewFarm();
  for (const key of ['constructor','__proto__','toString','hasOwnProperty']) {
    expectRefusalUnchanged(s,key,{}); expectRefusalUnchanged(s,'place',{kind:key,x:40,z:60}); expectRefusalUnchanged(s,'placeEdge',{kind:key,x:40,z:60,side:'n'});
    for (const action of ['move','store','demolish']) expectRefusalUnchanged(s,action,{id:key,x:40,z:60});
  }
});
test("Biscuit never acquires upkeep during a restored farm's active play", () => {
  const s=reviewFarm(); setLevel(s,5); s.mode='restore'; const id=must(s,'place',{kind:'kennel',x:40,z:60}).id;
  s.wearAt=T0; const coins=s.coins, stock=JSON.stringify(s.barn.items), events=[];
  for (let now=T0+WEAR.tickCapMs; now<=T0+WEAR.ms[1]+WEAR.tickCapMs; now+=WEAR.tickCapMs) tickCondition({s,now,emit:(type,data)=>events.push({type,...data})});
  assert.equal(s.cond[id],undefined); assert.equal(repairCost(s,id),0); assert.equal(s.coins,coins); assert.equal(JSON.stringify(s.barn.items),stock); assert.ok(!events.some(e=>e.id===id&&e.type==='worn'));
});

test('cosmetic fruit stand repairs keep sales due on their original clock', () => {
  const s=reviewFarm(); must(s,'place',{kind:'path',x:30,z:64}); must(s,'place',{kind:'path',x:31,z:64});
  const id=must(s,'place',{kind:'fruit_stand',x:30,z:65,rot:2}).id; s.barn.items.cherry=3; must(s,'fruitList',{good:'cherry',n:3});
  const due=s.fruitStand.nextSaleAt; s.cond[id]={level:1,ms:WEAR.ms[0]}; must(s,'repair',{id},T0+20000);
  assert.equal(s.fruitStand.nextSaleAt,due); tick(s,due); assert.equal(s.fruitStand.coins,9); assert.equal(s.fruitStand.items[0].n,2);
});

test('stored and rebuilt cherry trees wait for regrowth instead of repeating the first harvest discount', () => {
  for (const action of ['store','demolish']) {
    const s=reviewFarm(); const id=must(s,'place',{kind:'cherry_tree',x:40,z:60}).id;
    must(s,'pick',{id},T0+25000); must(s,action,{id},T0+25000);
    const next=must(s,'place',{kind:'cherry_tree',x:40,z:60},T0+25000).id;
    assert.equal(s.trees[next].doneAt,T0+25000+40000); assert.equal(s.trees[next].first,false);
    expectRefusalUnchanged(s,'pick',{id:next},T0+50000); must(s,'pick',{id:next},T0+65000); assert.equal(s.album.fruit.cherry,6);
    expectRefusalUnchanged(s,'undo',{},T0+65000);
  }
  const s=reviewFarm(); const original=must(s,'place',{kind:'cherry_tree',x:40,z:60}).id; must(s,'store',{id:original});
  must(s,'place',{kind:'cherry_tree',x:40,z:60}); must(s,'undo',{}); assert.equal(s.stored.cherry_tree,1,'an unused tree taken from storage can still be undone');
});
