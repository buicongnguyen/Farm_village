// Hired work uses the same feed entitlement, reserves and safe upgrade values as direct work.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {newGame} from '../src/core/state.mjs';
import {pack} from '../src/kit/save.mjs';
import {ANIMALS} from '../src/content/goods.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
try {
 for(const lang of ['en','vi']) {
  const now=Date.now(),s=newGame(now,742,{restore:true});
  s.level=16;s.coins=50000;s.barn.cap=5000;s.story.chapter=20;s.story.tutorial=999;s.projects.step=999;
  s.settings.reducedMotion=true;s.counts.school=1;s.cond={};
  let i=0;
  for(const kind of ['company','juice_press','noodle_factory','market','coop','feed_mill']) {
   s.placed['review_'+kind]={kind,x:60+6*(i%4),z:40+8*Math.floor(i++/4),rot:0};s.counts[kind]=1;
  }
  s.animals={review_coop:[{kind:'hen',doneAt:null}]};
  s.production={review_noodle_factory:{slots:1,queue:[{recipe:'instant_noodles',slot:0,startedAt:now-10000,doneAt:now-1,durationMs:9999}]}};
  s.lastRecipe={review_noodle_factory:'instant_noodles'};s.outputUp={review_feed_mill:'broken'};
  s.barn.items={noodles:8,carrot:40,[ANIMALS.hen.eats]:1};
  s.hands={animals:{since:now},workshop:{since:now}};s.handsAt=now+1000000;s.helpAt=now+1000000;
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];
  await ctx.addInitScript(({save,lang,now})=>{
   Date.now=()=>now;localStorage.setItem('farm-village.language',lang);
   if(!sessionStorage.getItem('review-seeded')) {sessionStorage.setItem('review-seeded','1');localStorage.setItem('farm-village:save:1',save);}
  },{save:pack(s),lang,now});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL??'http://127.0.0.1:5241/');
  await page.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});
  const result=await page.evaluate(()=>{
   const g=farm.game;clearInterval(g.timer);farm.skipIntro();farm.closeCards();const s=g.s;
   s.handsAt=Date.now();g.tick();
   const upgrade=g.do('upgradeOutput',{building:'review_feed_mill'});
   localStorage.setItem('farm-village:save:1',JSON.stringify({...s,cells:s.cells.join('')}));
   return {meals:s.animals.review_coop[0].meals,noodles:s.barn.items.noodles,queue:s.production.review_noodle_factory.queue.length,products:s.barn.items.instant_noodles,upgrade:upgrade.ok,coins:s.coins,level:s.outputUp.review_feed_mill};
  });
  assert.equal(result.meals,10);assert.equal(result.noodles,8);assert.equal(result.queue,0);assert.ok(result.products>0);
  assert.ok(result.upgrade&&Number.isFinite(result.coins));assert.equal(result.level,1);
  await page.reload();await page.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>farm.state().animals.review_coop[0].meals),10);
  assert.deepEqual(errors,[]);await ctx.close();console.log(`ok   hired feeding, restart reserves, invalid output recovery and reload (${lang} phone)`);
 }
} finally {await browser.close();}
