import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const url=process.env.GAME_URL??'http://127.0.0.1:5241/';mkdirSync('test-results/interiors',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
const specs=[['clinic','clinic','hospital_reception','clinic'],['police','villageGrowth','police_desk','villageGrowth'],['company','villageGrowth','company_hiring','villageGrowth'],['school','schoolActivity','school_lesson','schoolActivity'],['barn','barn','barn_store','barn'],['bakery','production','bakery_oven','production']];
try{for(const [language,width]of[['en',1280],['vi',390]]){
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:width===390,isMobile:width===390}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.stack));page.on('request',r=>requests.push(r.url()));await page.addInitScript(lang=>localStorage.setItem('farm-village.language',lang),language);
 await page.goto(url+'?new&restore');await page.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});
 await page.evaluate(()=>{farm.skipIntro();farm.closeCards();farm.game.do('testJumpChapter',{chapter:10});farm.closeCards();});
 assert.ok(!requests.some(u=>/facility-props|interior-school|cottage-furniture/.test(u)),'interiors loaded at startup');
 for(const [kind,panel,object,service]of specs){
  const id=await page.evaluate(kind=>kind==='barn'?'barn':Object.keys(farm.state().placed).find(id=>farm.state().placed[id].kind===kind),kind);assert.ok(id,kind);
  await page.evaluate(({panel,id})=>{farm.closeCards();farm.state().cond[id]={level:0,ms:0};delete farm.state().repairing[id];farm.panels.show(panel,id);},{panel,id});
  await page.locator(`[data-do="enterInterior"][data-id="${id}"]`).click();
  await page.waitForFunction(()=>farm.world.exploreMode?.session&&!farm.world.exploreMode.loading,null,{timeout:60000});
  // Fixture starts at the public doorstep; all indoor travel below uses the real controls.
  await page.evaluate(()=>{const m=farm.world.exploreMode;m.clear();m.session.p=[...m.approach];m.near=m.scan();m.render();});
  await page.locator('[data-explore="interact"]').click();await page.waitForFunction(()=>farm.world.exploreMode.inside);
  if(await page.evaluate(()=>farm.world.exploreMode.room.view!=='whole'))await page.locator('[data-explore="homeView"]').click();
  await page.waitForTimeout(400);
  const pin=page.locator(`[data-home-object="${object}"]`);
  if(await pin.isVisible())await pin.click();else{
   const p=await page.evaluate(id=>{const m=farm.world.exploreMode;return m.room.project(m.session.room.interactions.find(o=>o.id===id).focus);},object);
   await page.mouse.click(p.x,p.y);
  }
  await page.waitForFunction(id=>farm.world.exploreMode.nearest()===id,object,{timeout:30000});
  await page.screenshot({path:`test-results/interiors/${kind}-${language}.png`});
  for(const factor of [.6,2]){await page.evaluate(f=>farm.world.exploreMode.zoom(f),factor);await page.waitForTimeout(60);const info=await page.evaluate(()=>farm.info());assert.ok(info.draws<=120&&info.triangles<=300000,JSON.stringify(info));}
  await page.locator('[data-explore="interact"]').click();await page.locator(`.panel[data-kind="${service}"]:not([hidden])`).waitFor();
  if(kind==='clinic'||kind==='bakery')assert.equal(await page.evaluate(()=>farm.panels.open.arg),id,'wrong building service');
  const pos=await page.evaluate(()=>[...farm.world.exploreMode.session.p]);await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);await page.keyboard.up('ArrowRight');assert.deepEqual(await page.evaluate(()=>farm.world.exploreMode.session.p),pos,'service did not pause movement');
  await page.locator('.panel [data-do="close"]').click();
  if(kind==='school'){
   if(await page.evaluate(()=>farm.world.exploreMode.room.view!=='whole'))await page.locator('[data-explore="homeView"]').click();
   const label=page.locator('[data-home-object="school_art"]');await label.waitFor({state:'visible'});await label.click();
   await page.waitForFunction(()=>farm.world.exploreMode.nearest()==='school_art',null,{timeout:30000});await page.locator('[data-explore="interact"]').click();
   const card=page.locator('.explore-card[data-object="school_art"]');await card.waitFor();assert.match(await card.innerText(),language==='vi'?/bò tím/:/purple cow/);await page.locator('[data-explore="back"]').click();
  }
  await page.locator('[data-explore="outside"]').click();await page.waitForFunction(()=>!farm.world.exploreMode.inside,null,{timeout:30000});
  await page.locator('[data-explore="close"]').click();assert.equal(await page.evaluate(()=>farm.people.walkers.get('you').controlled),false);
  console.log(`PASS ${kind} ${language}: real room walk, service, input pause, exit and zoom budgets`);
 }
 assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();}
