// v0.4: genuine UI interactions plus deterministic scenery and budget checks.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const URL_ = process.env.GAME_URL ?? 'http://127.0.0.1:5241/';
const shots=join(tmpdir(),'farm-village-v04'); mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:process.env.GPU==='0'?['--enable-unsafe-swiftshader']:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
let failed=0;
const expect=(c,m)=>{if(!c)throw Error(m);};
async function check(name,f){try{await f();console.log('ok   '+name);}catch(e){failed++;console.log('FAIL '+name+'\n     '+e.stack);}}
async function open(lang='en',pc=false){
 const ctx=await browser.newContext(pc?{viewport:{width:1280,height:800}}:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await ctx.addInitScript(lang=>localStorage.setItem('farm-village.language',lang),lang);
 const page=await ctx.newPage(),errors=[]; page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/favicon/.test(m.text()))errors.push(m.text());});
 await page.goto(URL_+'?new&restore'); await page.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});
 await page.evaluate(()=>{farm.skipIntro();farm.game.s.settings.daylight='always';});
 await page.waitForFunction(()=>farm.world.batches.has('clinic')&&farm.world.batches.has('cherry_tree'),null,{timeout:30000});
 return {ctx,page,errors};
}
async function prepare(page){return page.evaluate(()=>{
 const g=farm.game,ok=(a,p)=>{const r=g.do(a,p);if(!r.ok)throw Error(a+': '+r.reason);return r;};
 ok('testUnlockAll',{coins:30000});g.s.story.chapter=4;
 const cherry=ok('place',{kind:'cherry_tree',x:40,z:60}).id;
 ok('place',{kind:'path',x:30,z:64});ok('place',{kind:'path',x:31,z:64});
 const stand=ok('place',{kind:'fruit_stand',x:30,z:65,rot:2}).id;
 const kennel=ok('place',{kind:'kennel',x:42,z:60}).id;
 farm.closeCards();return {cherry,stand,kennel};
});}
async function tap(page,x,z){
 await page.evaluate(()=>{farm.closeCards();farm.panels.close();farm.build.close();});
 const p=await page.evaluate(([x,z])=>{farm.people.walkers.forEach(w=>{w.indoors=true;});farm.focusVisible(x,z);return farm.cellToScreen(x,z);},[x,z]);
 await page.mouse.click(p.x,p.y);
}
async function fits(page,sel){return page.evaluate(sel=>{
 const el=document.querySelector(sel),r=el.getBoundingClientRect();if(r.left<-.5||r.right>innerWidth+.5)return false;
 return [...el.querySelectorAll('p,b,h2,h3,small,button')].every(e=>{const q=e.getBoundingClientRect();return !q.width||q.left>=r.left-1&&q.right<=r.right+1;})&&el.scrollWidth<=el.clientWidth+1;
},sel);}
for(const lang of ['en','vi']) await check('roadmap: goal and exactly three unlocks fit a phone ('+lang+')',async()=>{
 const {ctx,page,errors}=await open(lang);
 await page.click('[data-act="village"]');await page.waitForSelector('.sheet[data-kind="roadmap"]');
 expect(await page.locator('.journey-unlock').count()===3,'not three unlocks');expect(await fits(page,'.sheet.panel'),'roadmap overflow');
 await page.evaluate(()=>{farm.game.do('testUnlockAll');farm.closeCards();});
 expect(await page.getAttribute('.journey','data-stage')==='orchard','orchard goal missing');
 await page.waitForTimeout(450);await page.screenshot({path:join(shots,'roadmap-'+lang+'.png')});expect(!errors.length,errors.join(' | '));await ctx.close();
});
await check('cherry tree: tap Pick, fruit enters the barn, then the bare tree regrows',async()=>{
 const {ctx,page,errors}=await open();const ids=await prepare(page);
 await page.evaluate(()=>{farm.game.do('testFinishTimers');farm.closeCards();});await tap(page,40,60);
 await page.click('.radial-btn[data-act="pick"]');await page.evaluate(()=>farm.closeCards());
 expect(await page.evaluate(()=>farm.state().album.fruit.cherry===3),'cherries not picked');
 expect(await page.evaluate(id=>farm.state().trees[id].doneAt>farm.game.now,ids.cherry),'no regrowth timer');
 await page.waitForFunction(id=>/bare/.test(farm.world.batches.items.get(id)?.model),ids.cherry,{timeout:5000});
 expect(!errors.length,errors.join(' | '));await ctx.close();
});
await check('fruit stand: stock it through the panel, sell while away, collect once and persist',async()=>{
 const {ctx,page,errors}=await open();await prepare(page);
 await page.evaluate(()=>{farm.game.s.barn.items.cherry=6;farm.game.emit({ok:true,events:[]},'test');});
 await tap(page,30,65);await page.waitForSelector('.sheet[data-kind="fruit_stand"]');await page.click('[data-do="fruitList"][data-good="cherry"]');
 expect(await page.evaluate(()=>farm.state().fruitStand.items[0].n===6),'fruit not listed');
 await page.evaluate(()=>{farm.setClockOffset(200000);farm.closeCards();});
 await page.click('[data-do="fruitCollect"]');expect(await page.evaluate(()=>farm.state().stats.fruitSold===6&&farm.state().fruitStand.coins===0),'takings not collected');
 await page.evaluate(()=>window.__fvSave());await page.goto(URL_);await page.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});
 expect(await page.evaluate(()=>farm.state().stats.fruitSold===6&&farm.state().counts.fruit_stand===1),'stand did not persist');
 expect(!errors.length,errors.join(' | '));await ctx.close();
});
await check('Biscuit runs to a grounded crow, sends it off and returns to his kennel',async()=>{
 const {ctx,page,errors}=await open();await prepare(page);
 await page.waitForFunction(()=>farm.people.walkers.has('dog'));
 await page.evaluate(()=>{
 const c=farm.world.critters;c.crowArrives();const crow=c.crows[0];if(!crow)throw Error('no crow');
 crow.state='ground';crow.sub.x=71;crow.sub.z=119;crow.sub.y=0;crow.until=c.time+90;crow.next=c.time+30;
 const dog=farm.people.walkers.get('dog');dog.x=83;dog.z=121;dog.route=[];dog.dogTarget=null;farm.focus(38,60,28);
 });
 await page.waitForFunction(()=>farm.people.walkers.get('dog').duty==='chase',null,{timeout:3000});
 await page.waitForFunction(()=>farm.world.critters.crows.some(c=>c.state==='out'),null,{timeout:15000});
 await page.waitForFunction(()=>farm.people.walkers.get('dog').duty==='watch',null,{timeout:18000});
 expect(!errors.length,errors.join(' | '));await page.waitForTimeout(450);await page.screenshot({path:join(shots,'biscuit-phone.png')});await ctx.close();
});
await check('clinic: four families and donations enable the civic-row build, chapter five and Hazel',async()=>{
 const {ctx,page,errors}=await open();await prepare(page);
 await page.evaluate(()=>{
 const g=farm.game;for(let i=0;i<4;i++){const r=g.do('testAddFamily');if(!r.ok)throw Error(r.reason);}
 g.s.story.chapter=4;g.s.story.beats=['first-loaf','okafors-coming','welcome-bread','biscuit-home','first-cherries'];
 g.s.projects.delivered={};g.s.barn.items.bread=12;g.s.barn.items.cherry=9;farm.closeCards();farm.panels.show('projects');
 });
 await page.click('[data-do="projectDeliver"]');await page.click('[data-do="buildProject"][data-kind="clinic"]');
 const ghost=await page.evaluate(()=>({a:farm.build.check().a,ok:farm.build.check().ok,rot:farm.build.rot}));
 expect(ghost.ok&&ghost.a.x===62&&ghost.a.z===106&&ghost.rot===2,'wrong clinic ghost: '+JSON.stringify(ghost));
 await page.click('[data-bar="ok"]');await page.waitForSelector('.modal .chapter');
 expect((await page.textContent('.modal .chapter small')).includes('5'),'not chapter five');
 await page.waitForTimeout(450);await page.screenshot({path:join(shots,'clinic-chapter-phone.png')});await page.click('.modal .chapter [data-close]');await page.evaluate(()=>farm.closeCards());
 await page.waitForFunction(()=>farm.people.walkers.has('hazel'));
 await tap(page,63,107);await page.waitForSelector('.sheet[data-kind="clinic"]');expect(await fits(page,'.sheet.panel'),'clinic panel overflow');
 expect(!errors.length,errors.join(' | '));await ctx.close();
});
await check('v0.3 save migration reopens chapter five for the real clinic ending',async()=>{
 const {ctx,page,errors}=await open();
 await page.evaluate(()=>{farm.game.s.version=4;farm.game.s.story.chapter=5;window.__fvSave();});
 await page.goto(URL_);await page.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});
 expect(await page.evaluate(()=>farm.state().version===5&&farm.state().story.chapter===4&&farm.state().fruitStand.items.length===0),'teaser migration failed');
 expect(!errors.length,errors.join(' | '));await ctx.close();
});
for(const pc of [false,true]) await check('orchard art stays within phone budgets at every zoom ('+(pc?'PC':'phone')+')',async()=>{
 const {ctx,page,errors}=await open('en',pc);const ids=await prepare(page);
 await page.evaluate(id=>{farm.game.do('store',{id});const g=farm.game;for(let i=0;i<4;i++)g.do('testAddFamily');const clinic=g.do('place',{kind:'clinic',x:62,z:106,rot:2});if(!clinic.ok)throw Error(clinic.reason);farm.fillFarm();for(let i=0;i<12;i++){const r=g.do('place',{kind:'cherry_tree',x:30+i%2,z:52+Math.floor(i/2)});if(!r.ok)throw Error(r.reason);}for(const b of Object.values(g.s.beds))b.doneAt=g.now;farm.closeCards();},ids.cherry);
 for(const span of [24,28,39.9,40,55,70,89.9,90,110,160,260]){
  await page.evaluate(span=>farm.view(span,90,125),span);await page.waitForTimeout(700);const m=await page.evaluate(()=>farm.measure(300));
  expect(m.draws<=120&&m.triangles<=300000,'span '+span+': '+JSON.stringify(m));console.log('     span '+span+': '+m.draws+' draws, '+m.triangles+' triangles');
 }
 expect(!errors.length,errors.join(' | '));await page.waitForTimeout(450);await page.screenshot({path:join(shots,'orchard-budget-'+(pc?'pc':'phone')+'.png')});await ctx.close();
});
await browser.close();process.exit(failed?1:0);
