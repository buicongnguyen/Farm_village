import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../test-results/mobile-support');
fs.mkdirSync(__dirname, { recursive: true });
const source = fs.readFileSync(new URL('../src/mobile-game-support.mjs', import.meta.url), 'utf8').replace('export function', 'function');
const report=[];
async function run(engine,name){
 let browser;
 try{browser=await engine.launch({headless:true});}catch(error){report.push({browser:name,unavailable:error.message.split('\n')[0]});return;}
 for(const viewport of [{width:320,height:568},{width:844,height:390},{width:1280,height:800}]){
  const page=await browser.newPage({viewport,hasTouch:true,isMobile:viewport.width<1000});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>canvas{width:200px;height:180px}#pad{position:fixed;bottom:0;left:0;width:80px;height:44px}#menu{display:flex;flex-wrap:wrap}</style><div id="menu"><button>Start</button></div><canvas id="game"></canvas><button id="pad">Move</button>');
  await page.addScriptTag({content:source+'\ninstallMobileGameSupport({menus:["#menu"],controls:["#pad"]});'});
  const result=await page.evaluate(async()=>{
   const canvas=document.querySelector('canvas');let taps=0,cancels=0,ups=0,held=false,cases=0;
   canvas.addEventListener('pointerup',()=>{taps++;ups++;});canvas.addEventListener('pointercancel',()=>cancels++);
   const fire=(name,id,x,y,type='touch')=>canvas.dispatchEvent(new PointerEvent(name,{pointerId:id,pointerType:type,clientX:x,clientY:y,bubbles:true,cancelable:true}));
   const check=(condition,label)=>{cases++;if(!condition)throw new Error(label);};
   fire('pointerdown',1,10,10);fire('pointerup',1,10,10);check(taps===1,'normal tap exactly once');
   fire('pointerdown',2,10,10);fire('pointerup',2,80,10);check(taps===1&&cancels===1,'swipe without final move must not tap');
   fire('pointerdown',3,10,10);fire('pointermove',3,80,10);fire('pointermove',3,10,10);fire('pointerup',3,10,10);check(taps===1,'swipe returning to origin stays a swipe');
   fire('pointerdown',4,10,10);fire('pointerdown',5,12,12);fire('pointerup',4,10,10);fire('pointerup',5,12,12);check(taps===1,'pinch ending cannot issue a tap');
   fire('pointerdown',6,10,10);window.dispatchEvent(new Event('blur'));fire('pointerup',6,10,10);check(taps===1,'late release after blur ignored');
   fire('pointerdown',6,10,10);fire('pointerup',6,10,10);check(taps===2,'fresh input after reset works');
   fire('pointerdown',7,10,10);window.dispatchEvent(new Event('pagehide'));fire('pointerup',7,10,10);check(taps===2,'pagehide cancels active input');
   fire('pointerdown',8,10,10);window.dispatchEvent(new Event('resize'));fire('pointerup',8,10,10);check(taps===2,'viewport interruption cancels input');
   fire('pointerdown',9,10,10,'mouse');fire('pointerup',9,100,10,'mouse');check(taps===3,'desktop pointerup unchanged');
   fire('pointerdown',10,10,10);fire('lostpointercapture',10,10,10);fire('pointerup',10,10,10);check(taps===3,'capture loss cancels and ignores late release');
   fire('pointerdown',11,10,10);Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));fire('pointerup',11,10,10);check(taps===3,'hidden document cancels input');Object.defineProperty(document,'hidden',{configurable:true,value:false});
   window.addEventListener('keydown',e=>{if(e.code==='KeyW')held=true;});window.addEventListener('keyup',e=>{if(e.code==='KeyW')held=false;});
   window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true}));window.dispatchEvent(new Event('blur'));check(!held,'held keys reset');
   const button=document.querySelector('[data-mobile-display]');
   Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false});button.click();
   const dialog=document.querySelector('#mobile-display-help');check(dialog.open,'unsupported fullscreen shows help');
   check(dialog.textContent.includes('Safari')&&dialog.textContent.includes('Home Screen'),'iPhone home-screen instructions');
   window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
   check(!dialog.open&&document.activeElement===button,'Escape closes before startup and restores focus');
   let requests=0,resolveRequest;Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:true});
   document.documentElement.requestFullscreen=()=>{requests++;return new Promise(resolve=>resolveRequest=resolve);};
   button.click();button.click();check(requests===1,'duplicate activation serialized');check(!button.disabled&&button.getAttribute('aria-disabled')==='true','pending focus stays enabled');
   Object.defineProperty(document,'fullscreenElement',{configurable:true,value:document.documentElement});resolveRequest();await Promise.resolve();await Promise.resolve();
   document.dispatchEvent(new Event('fullscreenchange'));check(button.getAttribute('aria-pressed')==='true','actual fullscreen state shown');
   document.exitFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});document.dispatchEvent(new Event('fullscreenchange'));};
   button.click();await Promise.resolve();await Promise.resolve();check(button.getAttribute('aria-pressed')==='false','exit state shown');
   document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Denied'));button.click();await Promise.resolve();await Promise.resolve();check(dialog.open,'denied fullscreen handled');dialog.close();
   document.documentElement.lang='vi';await Promise.resolve();check(button.textContent==='Toàn màn hình','Vietnamese display label');
   const box=document.querySelector('#pad').getBoundingClientRect();if(matchMedia('(pointer: coarse)').matches)check(innerHeight-box.bottom>=15&&box.left>=11,'safe control margins');
   document.querySelector('#menu').innerHTML='<button>Resume</button>';await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   check(document.querySelectorAll('[data-mobile-display]').length===1,'rebuilt menu mounts one button');
   return {cases,taps,cancels};
  });
  assert.deepEqual(errors,[]);report.push({browser:name,viewport,...result});await page.close();
 }
 // Story runners intentionally use swipe-on-release; their opt-out must preserve it.
 const page=await browser.newPage();await page.setContent('<canvas></canvas>');
 await page.addScriptTag({content:source+'\ninstallMobileGameSupport({classifyCanvasTaps:false});'});
 assert.equal(await page.evaluate(()=>{let commands=0;const c=document.querySelector('canvas');c.addEventListener('pointerup',()=>commands++);for(const [type,x]of [['pointerdown',0],['pointerup',100]])c.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',clientX:x,bubbles:true}));return commands;}),1);
 await page.close();await browser.close();
}
(async()=>{try{await run(chromium,'Chromium');await run(webkit,'WebKit');fs.writeFileSync(path.join(__dirname,'mobile-browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}catch(e){console.error(e);process.exitCode=1;}})();
