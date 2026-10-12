// Explicit source navigation must leave an interior; the basket and return route must survive.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {newGame} from '../src/core/state.mjs';
import {act} from '../src/core/act.mjs';
import {findSpot} from '../src/core/grid.mjs';
import {pack} from '../src/kit/save.mjs';
const url=process.env.GAME_URL??'http://127.0.0.1:5241/';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
try{for(const [lang,width,height]of[['vi',390,844],['en',844,390]]){
 const now=Date.now(),s=newGame(now,43,{restore:true});assert.ok(act(s,'testJumpChapter',{chapter:10},now).ok);s.level=14;s.coins=50000;s.cond={};s.repairing={};s.settings.reducedMotion=true;
 const at=findSpot(s,'supermarket',46,96,{rot:2});assert.ok(at);const built=act(s,'place',{kind:'supermarket',...at},now);assert.ok(built.ok);
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await ctx.addInitScript(({save,lang})=>{localStorage.setItem('farm-village:save:1',save);localStorage.setItem('farm-village:profile','1');localStorage.setItem('farm-village.language',lang);},{save:pack(s),lang});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.goto(url);await page.waitForFunction(()=>window.farm?.ready,null,{timeout:60000});
 await page.evaluate(()=>{farm.skipIntro();farm.closeCards();farm.panels.show('supermarket');});
 await page.locator('[data-do="introduceSupermarket"]').click();await page.locator('[data-do="restoreShopSection"][data-section="garden"]').click();await page.locator('[data-do="prepareShopBasket"][data-section="garden"]').click();await page.locator('[data-do="acceptShopBasket"]').click();
 const before=await page.evaluate(()=>JSON.stringify(farm.state().supermarket.request));
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.panel .btn.wide')].filter(b=>b.getClientRects().length).every(b=>b.getBoundingClientRect().height>=44)));
 await page.locator('[data-do="enterInterior"]').click();await page.waitForFunction(()=>farm.world.exploreMode?.session&&!farm.world.exploreMode.loading,null,{timeout:60000});
 await page.evaluate(()=>{const m=farm.world.exploreMode;m.clear();m.session.p=[...m.approach];m.near=m.scan();m.render();});await page.locator('[data-explore="interact"]').click();await page.waitForFunction(()=>farm.world.exploreMode.inside);
 await page.evaluate(id=>farm.panels.show('supermarket',id),built.id);
 await page.locator('.panel [data-do="goodHelp"]').first().click();await page.locator('[data-do="goodHelpSource"]').click();
 assert.equal(await page.evaluate(()=>farm.world.exploreMode.active),false);assert.equal(await page.evaluate(()=>document.body.classList.contains('explore-inside')),false);
 const back=page.locator('.help-return:visible, .panel:not([hidden]) [data-do="goodHelpReturn"]');await back.click();await page.locator('.panel[data-kind="supermarket"]:not([hidden])').waitFor();
 assert.equal(await page.evaluate(()=>JSON.stringify(farm.state().supermarket.request)),before);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Recovery remains useful if the building becomes unusable while its request is open.
 await page.evaluate(id=>{farm.state().cond[id]={level:3,ms:0};farm.panels.render();},built.id);await page.locator('[data-do="cancelShopBasket"]').click();assert.equal(await page.evaluate(()=>farm.state().supermarket.request),null);await page.locator('[data-do="goRepair"]').click();assert.equal(await page.evaluate(()=>farm.panels.open),null);
 assert.deepEqual(errors,[]);console.log(`PASS source navigation ${lang} ${width}x${height}: indoor exit, 44px targets, exact basket return, broken-shop release and repair guidance`);await ctx.close();
}}finally{await browser.close();}
