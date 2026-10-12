import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {newGame} from '../src/core/state.mjs';
import {act} from '../src/core/act.mjs';
import {findSpot,touch} from '../src/core/grid.mjs';
import {pack} from '../src/kit/save.mjs';
import {xpFor} from '../src/core/levels.mjs';
const URL_=process.env.GAME_URL??'http://127.0.0.1:5241/';
mkdirSync('test-results/supermarket',{recursive:true});
function fixture(){
 const now=Date.now(),s=newGame(now,42,{restore:true});assert.ok(act(s,'testJumpChapter',{chapter:10},now).ok);s.level=14;s.xp=xpFor(14);s.coins=50000;s.cond={};s.repairing={};s.orders.cards=[];s.barn.cap=2000;s.settings.reducedMotion=true;
 s.cells=s.cells.map(v=>v===1||v===2?0:v);touch(s);
 for(const kind of ['supermarket','dairy']){
  const at=[0,1,2,3].map(rot=>findSpot(s,kind,kind==='supermarket'?46:40,kind==='supermarket'?96:62,{rot})).find(Boolean);assert.ok(at,`no spot for ${kind}`);const r=act(s,'place',{kind,...at},now);assert.ok(r.ok,r.reason);
 }
 return s;
}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
const sheet=p=>p.locator('.panel:not([hidden])');
try{for(const [lang,width]of[['en',1280],['vi',390]]){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
 await context.addInitScript(({lang,save})=>{localStorage.setItem('farm-village.language',lang);if(!sessionStorage.getItem('shop-seeded')){sessionStorage.setItem('shop-seeded','1');localStorage.setItem('farm-village:profile','1');localStorage.setItem('farm-village:save:1',save);}}, {lang,save:pack(fixture())});
 const p=await context.newPage(),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.stack));p.on('request',r=>requests.push(r.url()));
 await p.goto(URL_);await p.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});await p.evaluate(()=>{farm.skipIntro();farm.closeCards();});
 assert.ok(!requests.some(u=>/interior-supermarket|facility-props|cottage-furniture/.test(u)),'rooms are eager');
 await p.evaluate(()=>farm.panels.show('today'));await sheet(p).locator('[data-do="supermarket"]').click();await sheet(p).locator('[data-do="introduceSupermarket"]').click();
 for(const section of ['garden','bakery','pond']){
  if(section!=='garden')await p.evaluate(()=>{farm.setClockOffset((Number(sessionStorage.getItem('fv-clock-offset'))||0)+1800001);farm.closeCards();farm.state().orders.cards=[];farm.panels.show('supermarket');});
  await sheet(p).locator(`[data-do="restoreShopSection"][data-section="${section}"]`).click();await sheet(p).locator(`[data-do="prepareShopBasket"][data-section="${section}"]`).click();
  const offer=await p.evaluate(()=>structuredClone(farm.state().supermarket.request));await sheet(p).locator('[data-do="acceptShopBasket"]').click();
  await sheet(p).locator('[data-do="goodHelp"]').first().click();await sheet(p).locator('[data-do="goodHelpBack"]').click();assert.equal(await p.evaluate(()=>farm.state().supermarket.request.id),offer.id);
  await p.evaluate(()=>{const s=farm.state();s.orders.cards=[];for(const [g,n]of Object.entries(s.supermarket.request.need))s.barn.items[g]=n;farm.panels.render();});
  const coins=await p.evaluate(()=>farm.state().coins);await sheet(p).locator('[data-do="deliverShopBasket"]').click();assert.equal(await p.evaluate(()=>farm.state().coins),coins+offer.payment);
 }
 await sheet(p).locator('[data-do="discoverShopCard"]').click();assert.equal(await p.evaluate(()=>Object.keys(farm.state().supermarket.memories).length),3);
 for(const id of ['opening','variety','thankyou']){await sheet(p).locator(`[data-do="shopMemory"][data-id="${id}"]`).click();await p.waitForFunction(id=>farm.state().supermarket.read.includes(id),id);await sheet(p).locator('[data-do="supermarket"]').click();}
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.panel').scrollWidth<=document.querySelector('.panel').clientWidth+2),'sheet overflow');
 await p.screenshot({path:`test-results/supermarket/shop-${lang}.png`});
 // Each building enters through its own real door and opens its existing service.
 for(const [kind,object,service]of[['supermarket','supermarket_checkout','supermarket'],['feed_mill','mill_make','production'],['dairy','dairy_make','production']]){
  const id=await p.evaluate(kind=>Object.keys(farm.state().placed).find(id=>farm.state().placed[id].kind===kind),kind);
  await p.evaluate(({kind,id})=>{farm.closeCards();farm.panels.show(kind==='supermarket'?'supermarket':'production',id);},{kind,id});
  await sheet(p).locator(`[data-do="enterInterior"][data-id="${id}"]`).click();await p.waitForFunction(()=>farm.world.exploreMode?.session&&!farm.world.exploreMode.loading,null,{timeout:60000});
  await p.evaluate(()=>{const m=farm.world.exploreMode;m.clear();m.session.p=[...m.approach];m.near=m.scan();m.render();});await p.locator('[data-explore="interact"]').click();await p.waitForFunction(()=>farm.world.exploreMode.inside);
  if(await p.evaluate(()=>farm.world.exploreMode.room.view!=='whole'))await p.locator('[data-explore="homeView"]').click();
  const pin=p.locator(`[data-home-object="${object}"]`);await pin.waitFor({state:'visible'});await pin.click();await p.waitForFunction(id=>farm.world.exploreMode.nearest()===id,object,{timeout:30000});
  await p.screenshot({path:`test-results/supermarket/${kind}-${lang}.png`});
  if(kind==='supermarket')assert.equal(await p.evaluate(()=>farm.world.exploreMode.room.meshes.filter(m=>m.userData.memory&&m.visible).length),3);
  for(const zoom of [.6,2]){await p.evaluate(f=>farm.world.exploreMode.zoom(f),zoom);await p.waitForTimeout(80);const info=await p.evaluate(()=>farm.info());assert.ok(info.draws<=120&&info.triangles<=300000,JSON.stringify(info));}
  await p.locator('[data-explore="interact"]').click();await p.locator(`.panel[data-kind="${service}"]:not([hidden])`).waitFor();assert.equal(await p.evaluate(()=>farm.panels.open.arg),id);
  if(service==='production'){
   await p.evaluate(kind=>{Object.assign(farm.state().barn.items,kind==='dairy'?{milk:4}:{wheat:8});farm.panels.render();},kind);
   const recipe=kind==='dairy'?'butter':'chicken_feed';await sheet(p).locator(`[data-do="produce"][data-recipe="${recipe}"]`).click();assert.ok(await p.evaluate(id=>farm.state().production[id].queue.length>0,id));
  }
  await sheet(p).locator('[data-do="close"]').click();await p.locator('[data-explore="outside"]').click();await p.waitForFunction(()=>!farm.world.exploreMode.inside,null,{timeout:30000});await p.locator('[data-explore="close"]').click();
  console.log(`PASS ${kind} ${lang}: real doorway, room route, service and phone budgets`);
 }
 const before=await p.evaluate(()=>JSON.stringify(farm.state().supermarket));await p.evaluate(()=>farm.panels.onSave?.());await p.reload();await p.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});assert.equal(await p.evaluate(()=>JSON.stringify(farm.state().supermarket)),before);
 assert.deepEqual(errors,[]);console.log(`PASS supermarket ${lang}: 3 branches, source return, exact payments, memories and reload`);await context.close();
}}finally{await browser.close();}
