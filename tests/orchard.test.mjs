import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate, SAVE_VERSION } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { treeState } from '../src/core/trees.mjs';
import { biscuitOnDuty, fruitPrice } from '../src/core/orchard.mjs';
import { journeyOf } from '../src/core/journey.mjs';
import { FRUITS } from '../src/content/goods.mjs';
import { FRUIT_STAND } from '../src/content/economy.mjs';
import { CHAPTERS } from '../src/content/story.mjs';
import { stepIndex, stepReady } from '../src/core/projects.mjs';
import { touch } from '../src/core/grid.mjs';
import { T0, must, setLevel } from './helpers.mjs';
function farm(level=6) { const s=newGame(T0,123); setLevel(s,level); s.coins=10000; s.cells.fill(0); s.projects.step=stepIndex('clinic'); s.orders.cards=[]; return s; }
function stand(s) { must(s,'place',{kind:'path',x:30,z:64}); must(s,'place',{kind:'path',x:31,z:64}); return must(s,'place',{kind:'fruit_stand',x:30,z:65,rot:2}).id; }
function families(s,n=4) { for(let i=0;i<n;i++) s.homes['h'+i]={family:['tran','okafor','lindqvist','reyes'][i],arrived:true,arrivesAt:T0,rentFrom:T0,level:0}; }
function refused(s,action,payload) { const before=JSON.stringify(s); assert.equal(act(s,action,payload,T0).ok,false); assert.equal(JSON.stringify(s),before,'refusal changed state'); }
test('cherries unlock at level four, ripen quickly and regrow with album progress',()=>{
 const s=farm(3); refused(s,'place',{kind:'cherry_tree',x:33,z:58}); setLevel(s,4);
 const id=must(s,'place',{kind:'cherry_tree',x:33,z:58}).id;
 refused(s,'pick',{id}); assert.equal(treeState(s,id,T0).state,'growing');
 must(s,'pick',{id},T0+FRUITS.cherry.firstMs); assert.equal(s.barn.items.cherry,3); assert.equal(s.album.fruit.cherry,3);
 assert.equal(s.trees[id].doneAt,T0+FRUITS.cherry.firstMs+FRUITS.cherry.regrowMs);
 must(s,'pick',{id},s.trees[id].doneAt); assert.equal(s.album.fruit.cherry,6);
});
test('fruit stand validates before taking goods: kind, stock, whole stacks and capacity',()=>{
 const s=farm(); s.barn.items.cherry=40; refused(s,'fruitList',{good:'cherry',n:3}); stand(s);
 for(const n of [0,-1,1.5,11,NaN,Infinity,'3']) refused(s,'fruitList',{good:'cherry',n});
 refused(s,'fruitList',{good:'wheat',n:1}); refused(s,'fruitList',{good:'peach',n:1});
 for(let i=0;i<3;i++) must(s,'fruitList',{good:'cherry',n:10});
 refused(s,'fruitList',{good:'cherry',n:1}); assert.equal(s.barn.items.cherry,10);
});
test('fruit visitors pay the premium once, including away time and a backward clock',()=>{
 const s=farm(); stand(s); s.barn.items.cherry=3; must(s,'fruitList',{good:'cherry',n:3});
 tick(s,T0+FRUIT_STAND.everyMs-1); assert.equal(s.fruitStand.coins,0);
 tick(s,T0+FRUIT_STAND.everyMs); assert.equal(s.fruitStand.coins,fruitPrice('cherry'));
 tick(s,T0+1000000); assert.equal(s.fruitStand.coins,3*fruitPrice('cherry')); assert.equal(s.fruitStand.items.length,0);
 const before=s.coins; must(s,'fruitCollect',{},T0+1000000); assert.equal(s.coins,before+3*fruitPrice('cherry'));
 refused(s,'fruitCollect',{}); tick(s,T0); assert.equal(s.fruitStand.coins,0);
});
test('stored stands keep their goods and takings, pause sales, and resume without duplication',()=>{
 const s=farm(); const id=stand(s); s.barn.items.cherry=3; must(s,'fruitList',{good:'cherry',n:3});
 must(s,'store',{id}); tick(s,T0+1000000); assert.equal(s.fruitStand.items[0].n,3);
 must(s,'place',{kind:'fruit_stand',x:30,z:65,rot:2},T0+1000000); tick(s,T0+1000000);
 tick(s,T0+1000000+FRUIT_STAND.everyMs); assert.equal(s.fruitStand.items[0].n,2);
});
test('Biscuit starts work only with a working kennel, and needs no stock or upkeep',()=>{
 const s=farm(4); assert.equal(biscuitOnDuty(s),false); refused(s,'place',{kind:'kennel',x:34,z:60}); setLevel(s,5);
 const id=must(s,'place',{kind:'kennel',x:34,z:60}).id, stock=JSON.stringify(s.barn.items),coins=s.coins;
 assert.equal(biscuitOnDuty(s),true); tick(s,T0+3600000); assert.equal(JSON.stringify(s.barn.items),stock); assert.equal(s.coins,coins);
 must(s,'store',{id},T0+3600000); assert.equal(biscuitOnDuty(s),false);
});
test('clinic needs four arrived households and real donations; completing it ends chapter five',()=>{
 const s=farm(); s.barn.items={bread:12,cherry:9}; families(s,3);
 refused(s,'projectDeliver',{}); refused(s,'place',{kind:'clinic',x:62,z:106,rot:2});
 families(s); s.homes.h3.arrived=false; s.homes.h3.arrivesAt=T0+60000; assert.equal(stepReady(s,T0).ok,false);
 refused(s,'place',{kind:'clinic',x:62,z:106,rot:2}); s.homes.h3.arrived=true; s.homes.h3.arrivesAt=T0;
 refused(s,'projectDeliver',{goods:{bread:1.5}}); refused(s,'projectDeliver',{goods:{bread:Infinity}});
 refused(s,'place',{kind:'clinic',x:62,z:106,rot:2});
 must(s,'projectDeliver',{}); const r=must(s,'place',{kind:'clinic',x:62,z:106,rot:2});
 assert.ok(r.events.some(e=>e.type==='projectDone'&&e.id==='clinic')); assert.equal(CHAPTERS[4].when(s),true);
 assert.equal(s.barn.items.bread??0,0); assert.equal(s.barn.items.cherry??0,0); assert.equal(s.undo.length,0);
});
test('roadmap derives deeds, shows exactly three unlocks and labels future work as planned',()=>{
 const s=farm(1),before=JSON.stringify(s); assert.equal(journeyOf(s).stage.id,'homecoming'); assert.equal(JSON.stringify(s),before);
 setLevel(s,4); assert.equal(journeyOf(s).stage.id,'homecoming','level alone must not skip restoring the farm');
 for(const kind of ['feed_mill','coop']) { s.placed[kind]={kind,x:33,z:58,rot:0}; s.counts[kind]=1; } families(s,1); touch(s);
 let j=journeyOf(s); assert.equal(j.stage.id,'orchard'); assert.equal(j.unlocks.length,3); assert.equal(j.done,0);
 for(const kind of ['cherry_tree','fruit_stand','kennel','school','clinic']) { s.placed[kind]={kind,x:33,z:58,rot:0}; s.counts[kind]=1; } touch(s);
 s.album.fruit.cherry=9; s.house={level:1}; j=journeyOf(s); assert.equal(j.stage.id,'meadow'); assert.ok(!j.stage.planned,'v0.5 is real now'); assert.equal(j.total,4); assert.equal(j.done,0);
 assert.deepEqual(j.unlocks.map(u=>u.kind??'planned'),['goat_barn','dairy','police']);
 // the home-and-dairy stage done: only then does the roadmap show what is still planned (v0.6)
 s.house={level:5}; s.hands={field:{since:T0}}; s.stats.cheeseMade=1; for(const kind of ['goat_barn','dairy']) { s.placed[kind]={kind,x:33,z:58,rot:0}; s.counts[kind]=1; } touch(s);
 j=journeyOf(s); assert.equal(j.stage.id,'wakes'); assert.ok(!j.stage.planned,'chapter 6 is real now'); assert.equal(j.total,2); assert.equal(j.done,0);
 // the valley wakes done: only then does the roadmap show what is still planned
 s.stats.marketDays=1; s.parcels=['0,2','1,2','2,2']; for(const kind of ['police','company']) { s.placed[kind]={kind,x:33,z:58,rot:0}; s.counts[kind]=1; } touch(s);
 j=journeyOf(s); assert.equal(j.stage.id,'streets','the next stage of the story'); assert.ok(j.unlocks.length<=3);
});
test('v0.3 saves retain their farm and coins, but chapter-five teasers do not suppress the clinic ending',()=>{
 const s=farm(); s.version=4; s.story.chapter=5; delete s.fruitStand; const coins=s.coins,placed=JSON.stringify(s.placed);
 const up=migrate(s); assert.equal(up.version,SAVE_VERSION); assert.equal(up.story.chapter,4); assert.equal(up.coins,coins); assert.equal(JSON.stringify(up.placed),placed);
 assert.deepEqual(up.fruitStand,{items:[],coins:0,nextSaleAt:0}); assert.equal(CHAPTERS[4].when(up),false);
 up.version=5; up.story.chapter=5; assert.equal(migrate(up).story.chapter,5,'a completed chapter must not replay');
});

test('removing and reopening a fruit stand settles prior sales and never pays for absence',()=>{
 for(const action of ['store','demolish']) {
  const s=farm(),id=stand(s); s.barn.items.cherry=3; must(s,'fruitList',{good:'cherry',n:3});
  must(s,action,{id},T0+45000); assert.equal(s.fruitStand.coins,fruitPrice('cherry'),action+' lost pre-removal takings');
  assert.equal(s.fruitStand.items[0].n,2); assert.equal(s.fruitStand.nextSaleAt,0);
  must(s,'place',{kind:'fruit_stand',x:30,z:65,rot:2},T0+120000);
  tick(s,T0+120000); assert.equal(s.fruitStand.coins,fruitPrice('cherry'),action+' sold while absent');
  tick(s,T0+120000+FRUIT_STAND.everyMs); assert.equal(s.fruitStand.items[0].n,1);
  assert.equal(s.stats.fruitSold,2);
 }
});
test('fruit stand migration keeps legitimate stock and takings while rejecting corrupt stacks',()=>{
 const s=farm(); stand(s); s.fruitStand={items:[{good:'cherry',n:2},{good:'apple',n:3}],coins:19,nextSaleAt:T0+FRUIT_STAND.everyMs};
 const valid=JSON.stringify(s.fruitStand); migrate(s); assert.equal(JSON.stringify(s.fruitStand),valid);
 for(const bad of [null,{}, {coins:19}, {items:null,coins:19,nextSaleAt:NaN}]) {
  s.fruitStand=bad; migrate(s); assert.deepEqual(s.fruitStand,{items:[],coins:bad?.coins??0,nextSaleAt:0});
 }
 s.fruitStand={items:[{good:'cherry',n:0},{good:'cherry',n:-1},{good:'cherry',n:1.5},{good:'cherry',n:11},{good:'cherry',n:Infinity},{good:'wheat',n:1},{good:'__proto__',n:1},null,{good:'cherry',n:2}],coins:19,nextSaleAt:T0+FRUIT_STAND.everyMs};
 migrate(s); tick(s,T0+365*86400000); assert.equal(s.fruitStand.coins,19+2*fruitPrice('cherry'));
 assert.equal(s.stats.fruitSold,2); assert.deepEqual(s.fruitStand.items,[]);
 for(const coins of [-1,1.5,Infinity,NaN,'19']) { s.fruitStand={items:[],coins}; migrate(s); assert.equal(s.fruitStand.coins,0); }
});
test('fruit stand ticks defend against malformed live state, and refused actions leave it intact',()=>{
 const s=farm(); stand(s); s.fruitStand={items:[{good:'cherry',n:0}],coins:0,nextSaleAt:T0};
 tick(s,T0+365*86400000); assert.equal(s.fruitStand.coins,0); assert.equal(s.stats.fruitSold,0); assert.deepEqual(s.fruitStand.items,[]);
 s.fruitStand=null; refused(s,'fruitCollect',{}); refused(s,'fruitList',{good:'wheat'});
 tick(s,T0); assert.deepEqual(s.fruitStand,{items:[],coins:0,nextSaleAt:0});
});
test('existing kennel wear is removed from orchard saves without clearing broken or active repairs',()=>{
 const s=farm(),id=must(s,'place',{kind:'kennel',x:34,z:60}).id;
 for(const level of [1,2]) { s.cond[id]={level,ms:10800000}; migrate(s); assert.equal(s.cond[id],undefined); }
 s.cond[id]={level:3,ms:0}; migrate(s); assert.equal(s.cond[id].level,3);
 s.cond[id]={level:1,ms:10800000}; s.repairing[id]={doneAt:T0+30000}; migrate(s); assert.equal(s.cond[id].level,1); assert.ok(s.repairing[id]);
});

test('undo refuses a stocked or used fruit stand before settling sales or changing state',()=>{
 const s=farm(); stand(s); s.barn.items.cherry=2; must(s,'fruitList',{good:'cherry',n:2});
 let before=JSON.stringify(s); assert.equal(act(s,'undo',{},T0+45000).ok,false); assert.equal(JSON.stringify(s),before);
 tick(s,T0+60000); must(s,'fruitCollect',{},T0+60000); before=JSON.stringify(s);
 assert.equal(act(s,'undo',{},T0+60000).ok,false); assert.equal(JSON.stringify(s),before);
});
