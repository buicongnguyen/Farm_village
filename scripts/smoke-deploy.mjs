// Verify a production build with a normal progressed save, never test hooks.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simulate } from './sim.mjs';
import { act } from '../src/core/act.mjs';
import { BEATS, CHAPTERS } from '../src/content/story.mjs';
import { pack } from '../src/kit/save.mjs';
const url=process.argv[2];if(!url)throw Error('usage: node scripts/smoke-deploy.mjs URL');
// Use completed days before the review clock, so families and timers are not left in a simulated future.
const startAt=new Date();startAt.setHours(0,0,0,0);startAt.setDate(startAt.getDate()-7);
const s=simulate('steady',7,{restore:true,startAt:startAt.getTime()}).s;
if(s.lastSeen>Date.now())throw Error('review save is in the future');
act(s,'tutorial',{skip:true},s.lastSeen);
for(const chapter of CHAPTERS)if(chapter.when(s)){const r=act(s,'chapterSeen',{id:chapter.id},s.lastSeen);if(!r.ok)throw Error('review chapter '+chapter.id+': '+r.reason);}
if(s.story.chapter!==5)throw Error('review save has not reached the clinic ending');
for(const b of BEATS)if(b.when(s))act(s,'beatSeen',{id:b.id},s.lastSeen);
s.settings.daylight='always';
const shots=join(tmpdir(),'farm-village-v04-live');mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
for(const [device,viewport] of [['phone',{width:390,height:844}],['pc',{width:1280,height:800}]]){
 const ctx=await browser.newContext({viewport,hasTouch:device==='phone',isMobile:device==='phone'});
 await ctx.addInitScript(save=>localStorage.setItem('farm-village:save:1',save),pack(s));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 await page.goto(url);await page.waitForSelector('[data-act="village"]',{timeout:60000});
 await page.waitForTimeout(1500);
 if(await page.evaluate(()=>!!window.farm))throw Error('test hooks published');
 await page.click('[data-act="village"]');await page.waitForSelector('.journey[data-stage="meadow"]',{timeout:10000});
 if(await page.locator('.journey-unlock').count()!==3)throw Error('missing roadmap unlocks');
 await page.waitForTimeout(500);await page.screenshot({path:join(shots,device+'.png')});
 await page.click('[data-do="projects"]');await page.waitForSelector('.sheet[data-kind="projects"]');
 if(!(await page.textContent('.sheet.panel')).includes('Every project'))throw Error('clinic progression missing');
 if(errors.length)throw Error(errors.join(' | '));console.log('ok production '+device+': orchard save, roadmap, clinic, assets; no test hooks or page errors');
 await ctx.close();
}
for(const path of ['src/core/act.mjs','docs/JOURNEY.md','art/blender/build_farm_kit.py','.git/config']){
 const r=await fetch(new URL(path,url)),type=r.headers.get('content-type')??'';
 if(r.ok&&!type.includes('text/html'))throw Error('source served: '+path);
}
await browser.close();
