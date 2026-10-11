import './tz.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {game, T0} from './helpers.mjs';
import {tickHands} from '../src/core/helpers.mjs';
import {actions as animals, FEED_MEALS} from '../src/core/animals.mjs';
import {ANIMALS} from '../src/content/goods.mjs';
import {companyKeep} from '../src/core/village-growth.mjs';
import {pack, unpack} from '../src/kit/save.mjs';

function run(s, now=T0) {
  const events=[];
  tickHands({s, now, emit:(type, data)=>events.push({type,...data}), fail:reason=>({ok:false,reason})});
  return events;
}
function setup(role) {
  const s=game();s.level=16;s.coins=50000;s.barn.cap=5000;s.counts.school=1;
  s.hands={[role]:{since:T0}};s.handsAt=T0;
  return s;
}

test('hired feeding pays for ten collections and survives save/reload',()=>{
  let s=setup('animals');
  s.placed.review_coop={kind:'coop',x:40,z:60,rot:0};s.counts.coop=1;
  s.animals={review_coop:[{kind:'hen',doneAt:null}]};s.barn.items={[ANIMALS.hen.eats]:1};
  run(s);
  assert.equal(s.animals.review_coop[0].meals,FEED_MEALS);
  s=unpack(pack(s));
  for(let n=0;n<FEED_MEALS;n++) {
    const now=s.animals.review_coop[0].doneAt;
    assert.ok(Number.isFinite(now),'paid-for collection stopped early');
    animals.collect({s,now,emit:()=>{},fail:reason=>({ok:false,reason})},{home:'review_coop'});
  }
  assert.equal(s.animals.review_coop[0].doneAt,null);
  assert.equal(s.barn.items[ANIMALS.hen.gives],FEED_MEALS);
  assert.equal(s.barn.items[ANIMALS.hen.eats]??0,0);
});

test('restarting a collected tray also respects the company ingredient reserve',()=>{
  const s=setup('workshop');let i=0;
  for(const kind of ['company','juice_press','noodle_factory','market']) {
    s.placed['review_'+kind]={kind,x:60+6*i++,z:40,rot:0};s.counts[kind]=1;
  }
  s.cond={};
  s.production={review_noodle_factory:{slots:1,queue:[{recipe:'instant_noodles',slot:0,startedAt:T0-10000,doneAt:T0-1,durationMs:9999}]}};
  s.lastRecipe={review_noodle_factory:'instant_noodles'};
  s.barn.items={noodles:8,carrot:40};
  assert.equal(companyKeep(s,'noodles'),8);
  run(s);
  assert.ok(s.barn.items.instant_noodles>0,'finished tray should still be collected');
  assert.equal(s.barn.items.noodles,8,'restarting ate reserved noodles');
  assert.equal(s.production.review_noodle_factory.queue.length,0);
  s.barn.items.noodles=10;s.handsAt=T0;
  run(s);
  assert.equal(s.barn.items.noodles,8,'spare ingredients may be used');
  assert.equal(s.production.review_noodle_factory.queue.length,1);
});

test('hired feeding respects repairs and the wages left after collecting',()=>{
  const s=setup('animals');
  for(const id of ['ready','hungry','broken'])s.placed[id]={kind:'coop',x:40,z:60,rot:0};
  s.counts.coop=3;s.cond.broken={level:3};
  s.animals={ready:[{kind:'hen',doneAt:T0-1}],hungry:[{kind:'hen',doneAt:null}],broken:[{kind:'hen',doneAt:null}]};
  s.barn.items={[ANIMALS.hen.eats]:5};s.coins=1;
  run(s);
  assert.equal(s.coins,0);
  assert.equal(s.animals.hungry[0].doneAt,null,'no unpaid feeding after collecting spends the last wage');
  s.animals.ready=[];s.coins=100;s.handsAt=T0;run(s);
  assert.equal(s.animals.hungry[0].meals,FEED_MEALS);
  assert.equal(s.animals.broken[0].doneAt,null,'broken homes cannot be fed by a hand');
});

test('malformed imported output levels cannot poison coins or produce counts',async()=>{
  const {outputTimes}=await import('../src/core/output.mjs');
  const {act}=await import('../src/core/act.mjs');
  for(const bad of ['broken',{},[],true]) {
    const s=setup('workshop');s.placed.review_mill={kind:'feed_mill',x:40,z:60,rot:0};s.counts.feed_mill=1;
    s.outputUp={review_mill:bad};
    const loaded=unpack(pack(s));
    assert.equal(outputTimes(loaded,'review_mill'),1);
    assert.equal(act(loaded,'upgradeOutput',{building:'review_mill'},T0).ok,true);
    assert.ok(Number.isFinite(loaded.coins));
    assert.equal(outputTimes(loaded,'review_mill'),2);
  }
});
