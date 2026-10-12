import './tz.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrate } from '../src/core/state.mjs';
import { act, tick } from '../src/core/act.mjs';
import { pack, unpack } from '../src/kit/save.mjs';
import { installSupermarket, supermarketStatus, basketPool, basketRows } from '../src/core/supermarket.mjs';
import { normalizeSupermarket, supermarketHeld, basketPrice, supermarketBuildReason, unreadSupermarket } from '../src/core/supermarket-state.mjs';
import { SUPERMARKET, SHOP_SECTIONS } from '../src/content/supermarket.mjs';
import { stepIndex } from '../src/core/projects.mjs';
import { goodHelp } from '../src/core/good-help.mjs';
import { plantPrice } from '../src/core/farm.mjs';
import { CROPS } from '../src/content/goods.mjs';
import * as barn from '../src/core/barn.mjs';
const NOW = 1800000000000;
installSupermarket();
function fixture() {
 const s = newGame(NOW,42); s.level = 14; s.coins = 50000; s.barn.cap = 2000; s.projects.step = 100;
 for (const [i, kind] of ['supermarket','market','school','bakery','juice_press','bed'].entries()) { s.placed[kind] = {kind,x:68+i*5,z:93,rot:0}; s.counts[kind] = 1; }
 tick(s,NOW); s.orders.cards=[]; return s;
}
const must = (s, action, payload={}, now=NOW) => {const r=act(s,action,payload,now);assert.ok(r.ok,`${action}: ${r.reason}`);return r;};
const refuse=(s, action,payload={},now=NOW)=>{const before=structuredClone(s);assert.equal(act(s,action,payload,now).ok,false,action);assert.deepEqual(s,before,action);};
function ready(s,section='garden',now=NOW){if(s.supermarket?.introducedAt==null)must(s,'introduceSupermarket',{},now);if(!s.supermarket.sections[section])must(s,'restoreShopSection',{section},now);must(s,'prepareShopBasket',{section},now);return s.supermarket.request;}
function custom(s,need,section='garden'){
 s.supermarket={introducedAt:NOW,serial:0,sections:{[section]:{restoredAt:NOW,suppliedAt:null}},request:{id:'shop:0',section,need,payment:basketPrice(need),offeredAt:NOW,accepted:true}};
}
test('supermarket is optional and requires level 14, a working school/market and two distinct factories',()=>{
 const s=fixture(); assert.equal(supermarketBuildReason(s),null);s.level=13;assert.ok(supermarketBuildReason(s));s.level=14;s.cond.school={level:3};assert.ok(supermarketBuildReason(s));delete s.cond.school;delete s.placed.juice_press;assert.ok(supermarketBuildReason(s));
 assert.ok(basketPool(s,'bakery').includes('bread'));assert.ok(!basketPool(s,'bakery').includes('carrot_cake'));assert.deepEqual(basketPool(s,'pond'),['perch','carp','catfish']);assert.deepEqual(basketPool(s,'__proto__'),[]);
});
test('three shelf branches deliver once each, earn exact premiums, and save three replay-safe happy memories',()=>{
 let s=fixture(),now=NOW;const originalXp=s.xp;
 for(const section of Object.keys(SHOP_SECTIONS)){
  const r=ready(s,section,now);assert.equal(Object.values(r.need).reduce((a,b)=>a+b,0),8);assert.equal(r.payment,basketPrice(r.need));
  must(s,'acceptShopBasket',{request:r.id},now);for(const row of basketRows(s))s.barn.items[row.good]=row.n+row.reserved;
  const coins=s.coins;must(s,'deliverShopBasket',{request:r.id},now);assert.equal(s.coins,coins+r.payment);refuse(s,'deliverShopBasket',{request:r.id},now);
  s=unpack(pack(s));assert.equal(s.supermarket.completed,Object.keys(s.supermarket.sections).length);now+=SUPERMARKET.waitMs;
 }
 assert.equal(s.supermarket.completed,3);assert.equal(unreadSupermarket(s),2);must(s,'discoverShopCard',{},now);assert.equal(unreadSupermarket(s),3);refuse(s,'discoverShopCard',{},now);
 for(const id of ['opening','variety','thankyou']){const c=s.coins;must(s,'readShopMemory',{id},now);must(s,'readShopMemory',{id},now);assert.equal(s.coins,c);}
 assert.equal(unreadSupermarket(s),0);assert.equal(s.xp,originalXp);
});
test('offers survive migration, absence and language changes; no entry, timer or replay payouts',()=>{
 const s=fixture(),r=structuredClone(ready(s)),coins=s.coins;for(const lang of ['vi','en','ko','ja']){s.settings.lang=lang;assert.deepEqual(migrate(structuredClone(s)).supermarket.request,r);}
 const later=NOW+86400e3*30;tick(s,later);assert.deepEqual(s.supermarket.request,r);assert.equal(s.coins,coins);assert.deepEqual(unpack(pack(s)).supermarket.request,r);
});
test('accepted reservations protect all barn spending, including bypass-project calls, and release after a shop is removed',()=>{
 const s=fixture();custom(s,{carrot:8});s.barn.items.carrot=8;assert.equal(barn.free(s,'carrot'),0);assert.equal(barn.free(s,'carrot',false),0);assert.equal(barn.take(s,{carrot:1},false),false);
 assert.equal(plantPrice(s,'carrot'),CROPS.carrot.value);const coins=s.coins;must(s,'plant',{id:'bed',crop:'carrot'});assert.equal(s.barn.items.carrot,8);assert.equal(s.coins,coins-CROPS.carrot.value);
 delete s.placed.supermarket;refuse(s,'deliverShopBasket',{request:'shop:0'});must(s,'cancelShopBasket',{request:'shop:0'});assert.equal(barn.free(s,'carrot'),8);assert.equal(s.supermarket.nextAt,NOW+SUPERMARKET.waitMs);
});
test('project delivery cannot consume supermarket bread; supermarket delivery leaves project and order shares intact',()=>{
 const s=fixture();custom(s,{bread:8},'bakery');s.projects={step:stepIndex('cottage2'),delivered:{}};s.barn.items.bread=8;
 refuse(s,'projectDeliver');s.barn.items.bread=13;must(s,'projectDeliver');assert.equal(s.barn.items.bread,8);assert.equal(s.projects.delivered.bread,5);
 s.projects.step=100;s.orders.cards=[{id:'reserved',need:{bread:2}}];refuse(s,'deliverShopBasket',{request:'shop:0'});s.barn.items.bread=10;must(s,'deliverShopBasket',{request:'shop:0'});assert.equal(s.barn.items.bread,2);
});
test('source help counts the basket own reservation once and keeps other requests visible',()=>{
 const s=fixture();custom(s,{carrot:8});s.barn.items.carrot=10;s.orders.cards=[{need:{carrot:4}}];const h=goodHelp(s,'carrot',NOW,{needed:8,shopRequest:'shop:0'});assert.equal(h.free,6);assert.equal(h.missing,2);assert.equal(h.held,4);
 assert.equal(goodHelp(s,'carrot',NOW,{needed:8}).free,2);
});
test('failed shop actions are atomic for stale IDs, missing goods, insufficient coins, malformed sections and clocks',()=>{
 const s=fixture();refuse(s,'restoreShopSection',{section:'garden'});must(s,'introduceSupermarket');s.coins=0;refuse(s,'restoreShopSection',{section:'garden'});s.coins=1000;
 for(const section of ['unknown','__proto__','constructor'])refuse(s,'restoreShopSection',{section});
 const r=ready(s);refuse(s,'prepareShopBasket',{section:'garden'});refuse(s,'acceptShopBasket',{request:'stale'});must(s,'acceptShopBasket',{request:r.id});refuse(s,'acceptShopBasket',{request:r.id});refuse(s,'deliverShopBasket',{request:r.id});
 refuse(s,'cancelShopBasket',{request:r.id},NaN);refuse(s,'discoverShopCard');refuse(s,'readShopMemory',{id:'opening'});
 must(s,'cancelShopBasket',{request:r.id});refuse(s,'prepareShopBasket',{section:'garden'});refuse(s,'prepareShopBasket',{section:'__proto__'},NOW+SUPERMARKET.waitMs);
});
test('malformed saved baskets fail closed instead of reserving or minting goods; zero timestamps remain valid',()=>{
 const s=fixture();custom(s,{carrot:8});for(const change of [{payment:999999},{need:{carrot:-8}},{need:{unknown:8}},{need:{carrot:9}},{section:'__proto__'},{accepted:'yes'},{id:'shop:1'}]){const c=structuredClone(s);Object.assign(c.supermarket.request,change);assert.equal(normalizeSupermarket(c).request,null);assert.deepEqual(supermarketHeld(c),{});}
 const exhausted=structuredClone(s);exhausted.supermarket.serial=999999;exhausted.supermarket.request.id='shop:999999';assert.deepEqual(supermarketHeld(exhausted),{});
 s.supermarket.memories={opening:0};s.supermarket.read='opening';assert.equal(unreadSupermarket(s),1);assert.equal(normalizeSupermarket(s).memories.opening,0);
});
test('cancel cooldown survives backward clocks and used supermarket builds cannot be undone for a refund',()=>{
 const s=fixture(),r=ready(s);must(s,'cancelShopBasket',{request:r.id});tick(s,NOW-86400e3);assert.equal(s.supermarket.nextAt,NOW-86400e3+SUPERMARKET.waitMs);
 s.undo=[{type:'placed',id:'supermarket',kind:'supermarket',price:4200}];refuse(s,'undo',{},NOW-86400e3);
});
import { tickHands } from '../src/core/helpers.mjs';
import { companyKeep } from '../src/core/village-growth.mjs';
import { spareForTrucks } from '../src/core/market.mjs';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { bake, fitFactor } from '../src/view/models.mjs';
import { KIND_MODELS } from '../src/view/kinds.mjs';
test('manual sales, recipes, truck loading and a hired driver cannot spend the accepted shop basket',()=>{
 const s=fixture();custom(s,{wheat:8});s.barn.items={wheat:8};refuse(s,'sellGood',{good:'wheat',n:1});refuse(s,'produce',{building:'bakery',recipe:'bread'});refuse(s,'loadTruck',{good:'wheat',n:1});assert.deepEqual(spareForTrucks(s),[]);
 s.hands={driver:{since:NOW}};s.handsAt=NOW;tickHands({s,now:NOW,emit:()=>{},fail:reason=>({ok:false,reason})});assert.equal(s.barn.items.wheat,8);
});
test('a workshop hand protects supermarket and company noodles together, including after collecting a completed tray',()=>{
 const s=fixture();s.level=16;for(const kind of ['company','noodle_factory']){s.placed[kind]={kind,x:60,z:40,rot:0};s.counts[kind]=1;}
 custom(s,{noodles:8},'bakery');s.barn.items={noodles:16,carrot:40};s.hands={workshop:{since:NOW}};s.handsAt=NOW;
 s.production.noodle_factory={slots:1,queue:[{recipe:'instant_noodles',slot:0,startedAt:NOW-10000,doneAt:NOW-1,durationMs:9999}]};s.lastRecipe={noodle_factory:'instant_noodles'};
 assert.equal(companyKeep(s,'noodles'),8);const run=()=>tickHands({s,now:NOW,emit:()=>{},fail:reason=>({ok:false,reason})});run();assert.equal(s.barn.items.noodles,16);assert.equal(s.production.noodle_factory.queue.length,0);
 s.barn.items.noodles=18;s.handsAt=NOW;run();assert.equal(s.barn.items.noodles,16);assert.equal(s.production.noodle_factory.queue.length,1);
 assert.equal(basketRows(s)[0].have,8);must(s,'deliverShopBasket',{request:'shop:0'});assert.equal(s.barn.items.noodles,8);
});
test('supermarket exterior is packed, faces the public doorway and fits its 4 by 3 cell footprint',async()=>{
 const bytes=readFileSync(new URL('../public/assets/models/supermarket.glb',import.meta.url)),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const g=bake(gltf.scene.children.find(n=>n.name==='supermarket')),factor=fitFactor(g,{width:KIND_MODELS.supermarket.width});g.scale(factor,factor,factor);g.computeBoundingBox();
 assert.ok(g.boundingBox.max.x<=3.901&&g.boundingBox.min.x>=-3.901);assert.ok(g.boundingBox.max.z<=2.901&&g.boundingBox.min.z>=-2.901);assert.ok(g.attributes.position.count/3<12000);g.dispose();
});
