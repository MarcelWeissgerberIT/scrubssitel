import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {FURNITURE,roomObjects,findObject,furniturePorts} from '../src/objects.js';
import {layoutStatus,innerDoor,roomDoor,workPoint,insidePath,segmentBlocked,furnitureBlocked,roomSeats} from '../src/layout.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const KINDS=['privacy-screen','glass-partition','treatment-trolley','waste-bin','examination-couch'],DT=.05;
const ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
function editingClinic(){const g=new Game({mode:'sandbox',seed:42}),r=ok(furnishedRoom(g,'gp',{x:2,y:2,w:6,h:5})).room;ok(g.beginRoomEdit(r.id));return {g,r};}
function tick(g){const before=[...g.staff,...g.patients].map(entity=>({entity,x:entity.x,y:entity.y}));g.update(DT);assert.equal(g.over,false);for(const from of before){const to=from.entity;assert.ok(Math.hypot(to.x-from.x,to.y-from.y)<=(to.role?2.8:2.5)*DT+1e-7);for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,to),false,`${to.name} walked through furniture`);}}
function until(g,predicate,seconds=180){for(let i=0;i<seconds/DT&&!predicate();i++)tick(g);assert.ok(predicate(),'patient/staff route did not finish');}

test('both freestanding partition styles create a real reachable detour around their floor footprint',()=>{
 for(const kind of ['privacy-screen','glass-partition']){
  const {g,r}=editingClinic(),door=roomDoor(r),target=workPoint(r);
  assert.equal(segmentBlocked(r,innerDoor(r),target),false);
  ok(g.addFurniture(r.id,kind,{x:1.5,y:2.5,rotation:0}));
  assert.equal(segmentBlocked(r,innerDoor(r),target),true,'the screen must block the original straight path');
  const route=insidePath(r,door,target);assert.notEqual(route,null);assert.ok(route.length>=3,'the route must go around the screen');
  let previous=door;for(const next of route){assert.equal(segmentBlocked(r,previous,next),false);previous=next;}
  assert.deepEqual(previous,{x:target.x,y:target.y});assert.equal(layoutStatus(r).ready,true);ok(g.finishRoom(r.id));
 }
});

test('partitions cannot block a treatment approach, the doorway, or combine into an impassable wall',()=>{
 for(const kind of ['privacy-screen','glass-partition']){
  const {g,r}=editingClinic();
  for(const [point,error] of [[{x:1.75,y:.5,rotation:1},'furnitureBlocked'],[{x:2.5,y:4.5,rotation:0},'furnitureDoor']]){
   const before=g.snapshot();assert.equal(g.addFurniture(r.id,kind,point).error,error);assert.deepEqual(g.snapshot(),before);
  }
  for(const x of [0,1.5,3])ok(g.addFurniture(r.id,kind,{x,y:2.5,rotation:0}));
  const before=g.snapshot();assert.equal(g.addFurniture(r.id,kind,{x:4.5,y:2.5,rotation:0}).error,'furnitureBlocked');assert.deepEqual(g.snapshot(),before);
  assert.notEqual(insidePath(r,roomDoor(r),workPoint(r)),null,'rejected wall completion must retain the old usable route');
 }
});

test('new practical furniture is movable in all four rotations, has click information and survives loading',()=>{
 for(const kind of KINDS){
  const g=new Game({mode:'sandbox',seed:42}),r=ok(g.addRoom(FURNITURE[kind].rooms[0],{x:2,y:9,w:6,h:6})).room;
  const f=ok(g.addFurniture(r.id,kind,{x:2,y:2,rotation:0})).object;
  for(let rotation=0;rotation<4;rotation++){
   ok(g.moveFurniture(r.id,f.id,{x:2,y:2,rotation}));assert.equal(layoutStatus(r).blocked,null,kind+'/'+rotation);
   const object=roomObjects(r).find(o=>o.furnitureId===f.id);assert.equal(findObject(g,object.id).furnitureKind,kind);assert.equal(object.rotation,rotation);
   for(const lang of ['en','de']){assert.ok(FURNITURE[kind].name[lang].length>3);assert.ok(FURNITURE[kind].desc[lang].length>30);}
   for(const port of furniturePorts(r))assert.notEqual(insidePath(r,roomDoor(r),port),null,kind+' has an inaccessible approach');
   assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
  }
 }
});

test('the examination couch and trolley add neither a treatment station nor reservable patient seats',()=>{
 for(const [kind,type] of [['examination-couch','gp'],['examination-couch','therapy'],['examination-couch','surgery'],['treatment-trolley','gp'],['treatment-trolley','pharmacy']]){
  const g=new Game({mode:'sandbox',seed:42}),r=ok(g.addRoom(type,{x:2,y:2,w:5,h:4})).room;ok(g.addFurniture(r.id,kind,{x:1,y:1,rotation:0}));
  assert.equal(g.finishRoom(r.id).error,'furnitureMissing');assert.equal(workPoint(r),null);assert.equal(roomSeats(r).length,0);
  assert.equal(furniturePorts(r).some(p=>p.kind==='patient'||p.kind==='work'||p.kind==='seat'),false);
 }
});

test('patients and staff actually walk around either partition during a complete treatment journey',()=>{
 for(const kind of ['privacy-screen','glass-partition']){
  const {g,r}=editingClinic();ok(g.addFurniture(r.id,kind,{x:1.5,y:2.5,rotation:0}));ok(g.finishRoom(r.id));
  ok(furnishedRoom(g,'reception',{x:15,y:12,w:5,h:4}));ok(furnishedRoom(g,'pharmacy',{x:9,y:2,w:5,h:4}));
  for(const cast of ['rosa','milo','bea'])ok(hireAndPlace(g,cast));until(g,()=>g.staff.every(s=>g.staffReady(s)));
  ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;const p=g.spawnPatient('jitters');until(g,()=>p.state==='service'&&p.targetRoom===r.id);
  const restored=Game.restore(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());
  until(g,()=>g.record(p.id).dischargedAt!==null);assert.equal(g.left,0);assert.equal(g.cured+g.failed,1);
  assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
 }
});
