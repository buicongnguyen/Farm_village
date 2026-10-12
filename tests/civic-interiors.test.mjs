import './tz.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame} from '../src/core/state.mjs';
import {act,tick} from '../src/core/act.mjs';
import {pack,unpack} from '../src/kit/save.mjs';
import {startExplore,exploreSession,routeExplore,moveExplore,atObject,outdoorClear,installExplore} from '../src/core/explore.mjs';
import {installCivicExplore,facilityDoor,facilityOpen} from '../src/core/civic-explore.mjs';
import {CIVIC_INTERIORS} from '../src/content/civic-interiors.mjs';
import {roomAtLevel} from '../src/content/explore.mjs';
import {roomClear,roomRoute,segmentClear,xz} from '../src/core/explore-navigation.mjs';
import {touch,doorCell} from '../src/core/grid.mjs';
import {VI} from '../src/i18n/vi.mjs';
import {KO} from '../src/i18n/ko.mjs';
import {JA} from '../src/i18n/ja.mjs';
const NOW=1800000000000;
const load=id=>JSON.parse(readFileSync(new URL(`../public/assets/models/interior-${id}.json`,import.meta.url)));
installExplore();installCivicExplore();
function fixture(kind='school',rot=0){
 const s=newGame(NOW,123,{restore:true});s.cond.barn={level:0,ms:0};
 if(kind!=='barn'){s.placed.room={kind:CIVIC_INTERIORS[kind].kind,x:68,z:93,rot};touch(s);}
 const id=kind==='barn'?'barn':'room',door=facilityDoor(s,id);
 tick(s,NOW);assert.ok(outdoorClear(s,door),`door blocked: ${kind} ${rot}`);startExplore(s,door,load(kind));return {s,id,door};
}
function refuse(s,action,payload){const before=pack(s),pose=JSON.stringify(exploreSession(s));assert.equal(act(s,action,payload,NOW).ok,false);assert.equal(pack(s),before);assert.equal(JSON.stringify(exploreSession(s)),pose);}
for(const name of ['cottage',...Object.keys(CIVIC_INTERIORS)]) test(`${name}: all activity routes, walls and furniture are navigable`,()=>{
 for(const level of name==='cottage'?[1,10]:[1]){
  const r=name==='cottage'?roomAtLevel(load(name),level):load(name),points=[xz(r.entry.position),...r.interactions.map(o=>xz(o.stand))];
  for(const from of points)for(const to of points){assert.ok(roomClear(r,from),`${name}: blocked ${from}`);const path=roomRoute(r,from,to);assert.ok(path.length,`${name}: ${from} -> ${to}`);let p=from;for(const q of path){assert.ok(segmentClear(p,q,v=>roomClear(r,v)));p=q;}}
 }
});
test('civic entry requires its own real door, condition and matching room; refusal never changes a save or pose',()=>{
 const {s,id,door}=fixture();exploreSession(s).p=[door[0]+2,door[1]];refuse(s,'enterFacility',{id});
 exploreSession(s).p=door;s.cond[id]={level:3};refuse(s,'enterFacility',{id});s.cond[id].level=0;s.repairing[id]={doneAt:NOW+1000};refuse(s,'enterFacility',{id});delete s.repairing[id];
 refuse(s,'enterFacility',{id:'unknown'});refuse(s,'enterFarmhouse');exploreSession(s).room=load('hospital');refuse(s,'enterFacility',{id});exploreSession(s).room=load('school');
 assert.ok(act(s,'enterFacility',{id},NOW).ok);refuse(s,'enterFacility',{id});refuse(s,'leaveFarmhouse');refuse(s,'sitAtHome');refuse(s,'brewTea');refuse(s,'readHomeMemory');refuse(s,'leaveFacility');
 const target=exploreSession(s).room.interactions.find(o=>o.id==='interior_exit');assert.ok(routeExplore(s,xz(target.stand)));for(let i=0;i<500&&exploreSession(s).route.length;i++)moveExplore(s,0,0,.1);
 assert.ok(atObject(s,'interior_exit'));assert.ok(act(s,'leaveFacility',{},NOW).ok);assert.deepEqual(exploreSession(s).p,door);
});
test('barn and every supported building enter and leave without rewards; rotations and removed buildings are safe',()=>{
 for(const kind of Object.keys(CIVIC_INTERIORS))for(const rot of kind==='barn'?[0]:[0,1,2,3]){
  const {s,id,door}=fixture(kind,rot);if(kind!=='barn')assert.deepEqual(door,doorCell(CIVIC_INTERIORS[kind].kind,68,93,rot).map(v=>v*2+1));
  assert.ok(facilityOpen(s,id));const before=pack(s);assert.ok(act(s,'enterFacility',{id},NOW).ok);assert.equal(pack(s),before);assert.equal(exploreSession(unpack(pack(s))),undefined);
  delete s.placed[id];s.cond[id]={level:3};touch(s);assert.ok(act(s,'leaveFacility',{recover:true},NOW).ok);assert.ok(outdoorClear(s,exploreSession(s).p));
 }
});

test('room descriptions and actions are translated in every edition',()=>{
 for(const room of Object.values(CIVIC_INTERIORS))for(const o of Object.values(room.objects))for(const key of [o.label,o.text].filter(Boolean))for(const catalog of [VI,KO,JA])assert.ok(catalog[key]||['Company request'].includes(key),key);
});
test('all reused furniture exists in packed original kits',()=>{
 const nodes=new Set();for(const id of ['cottage-furniture','facility-props','interior-farmhouse']){const b=readFileSync(new URL(`../public/assets/models/${id}.glb`,import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());assert.ok(j.extensionsUsed.includes('EXT_meshopt_compression'));for(const n of j.nodes)nodes.add(n.name);}
 for(const name of ['cottage',...Object.keys(CIVIC_INTERIORS)])for(const p of load(name).furniture)assert.ok(nodes.has(p.kit),`${name}: ${p.kit}`);
});
