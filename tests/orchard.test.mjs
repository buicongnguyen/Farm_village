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
 setLevel(s,4); let j=journeyOf(s); assert.equal(j.stage.id,'orchard'); assert.equal(j.unlocks.length,3); assert.equal(j.done,0);
 for(const kind of ['cherry_tree','fruit_stand','kennel','school','clinic']) { s.placed[kind]={kind,x:33,z:58,rot:0}; s.counts[kind]=1; } touch(s);
 s.album.fruit.cherry=9; j=journeyOf(s); assert.equal(j.stage.id,'meadow'); assert.ok(j.stage.planned); assert.ok(j.unlocks.every(u=>u.planned));
});
test('v0.3 saves retain their farm and coins, but chapter-five teasers do not suppress the clinic ending',()=>{
 const s=farm(); s.version=4; s.story.chapter=5; delete s.fruitStand; const coins=s.coins,placed=JSON.stringify(s.placed);
 const up=migrate(s); assert.equal(up.version,SAVE_VERSION); assert.equal(up.story.chapter,4); assert.equal(up.coins,coins); assert.equal(JSON.stringify(up.placed),placed);
 assert.deepEqual(up.fruitStand,{items:[],coins:0,nextSaleAt:0}); assert.equal(CHAPTERS[4].when(up),false);
 up.version=5; up.story.chapter=5; assert.equal(migrate(up).story.chapter,5,'a completed chapter must not replay');
});
