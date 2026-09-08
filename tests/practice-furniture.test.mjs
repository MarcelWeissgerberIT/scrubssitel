import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {FURNITURE,furniturePorts,roomObjects} from '../src/objects.js';
import {layoutStatus,solidRects,insidePath,roomDoor,workPoint,patientPoint,segmentBlocked,furnitureBlocked} from '../src/layout.js';
import {furnishedRoom,hireAndPlace,deployStaff} from './helpers.mjs';

const DT=.05;
const NEW_KINDS=['counter-round','counter-modern','pharmacy-counter','writing-desk','round-table','medicine-rack','gum-machine','newspaper-rack','water-dispenser','coat-rack','sanitizer'];
const AMENITIES=new Set(['gum-machine','newspaper-rack','water-dispenser']);
const ok=(result,label='operation')=>{assert.equal(result?.error,undefined,`${label}: ${result?.error}`);return result;};
const roomOf=(g,type)=>g.rooms.find(r=>r.type===type);
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
function draft(type){const g=new Game({mode:'sandbox',seed:42}),room=ok(g.addRoom(type,{x:2,y:9,w:6,h:6})).room;return {g,room};}
function advance(g,collisions=false){
 const before=collisions?[...g.staff,...g.patients].map(entity=>({entity,x:entity.x,y:entity.y})):[];
 g.update(DT);assert.equal(g.over,false,'fixture must remain open');assert.equal(g.event,null);
 for(const from of before){const to=from.entity;assert.ok(Math.hypot(to.x-from.x,to.y-from.y)<=(to.role?2.8:2.5)*DT+1e-7,'movement must remain continuous');for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,to),false,`${to.name} crossed furniture in ${r.type}`);}
}
function until(g,predicate,seconds=150,collisions=false){for(let i=0;i<seconds/DT&&!predicate();i++)advance(g,collisions);assert.ok(predicate(),`timed out at ${g.clock}: ${g.patients.map(p=>`${p.stage}/${p.state}`).join(', ')}`);}
function clinic({rotation=0,amenities=false}={}){
 const g=new Game({mode:'sandbox',seed:42});
 for(const [type,rect,kind] of [
  ['reception',{x:15,y:12,w:5,h:4},rotation%2?'counter-modern':'counter-round'],
  ['pharmacy',{x:8,y:2,w:5,h:4},'pharmacy-counter']
 ]){const r=ok(g.addRoom(type,rect)).room;ok(g.addFurniture(r.id,kind,{x:1.5,y:1,rotation}));if(amenities&&type==='reception')ok(g.addFurniture(r.id,'water-dispenser',{x:3.75,y:2,rotation:0}));ok(g.finishRoom(r.id));}
 ok(furnishedRoom(g,'gp',{x:2,y:2,w:5,h:4}));
 if(amenities){const r=ok(g.addRoom('waiting',{x:7,y:8,w:6,h:4})).room;ok(g.addFurniture(r.id,'chair',{x:.25,y:.75,rotation:0}));for(const [kind,x,y] of [['gum-machine',3,.75],['gum-machine',4,.75],['newspaper-rack',3,2.25],['water-dispenser',4,2.25]])ok(g.addFurniture(r.id,kind,{x,y,rotation:0}));ok(g.finishRoom(r.id));}
 for(const cast of ['rosa','milo','bea'])ok(hireAndPlace(g,cast));
 ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;for(const s of g.staff)s.nextBreakAt=1e9;
 until(g,()=>g.staff.every(s=>g.staffReady(s)),60,true);return g;
}

test('round and modern reception desks satisfy the lesson but still require finishing and one assigned receptionist',()=>{
 for(const kind of ['counter-round','counter-modern']){
  const {g,room}=draft('reception'),staff=ok(hireAndPlace(g,'rosa')).staff;
  ok(g.addFurniture(room.id,kind,{x:2,y:2,rotation:0}));
  assert.deepEqual(layoutStatus(room).missing,[]);assert.equal(g.roomReady(room),false);assert.equal(room.staffId,null);
  ok(g.finishRoom(room.id));assert.equal(g.roomReady(room),true);assert.equal(room.staffId,null);deployStaff(g,staff);assert.equal(room.staffId,staff.id);
  assert.equal(furniturePorts(room).filter(p=>p.kind==='work').length,1);
  assert.equal(furniturePorts(room).filter(p=>p.kind==='patient').length,1);
  assert.equal(g.staffReady(staff),false,'a purchased desk must not teleport the employee to work');
 }
});

test('a dispensing counter replaces the pharmacy machine; decorative medicine storage does not',()=>{
 const {g,room}=draft('pharmacy');
 const shelf=ok(g.addFurniture(room.id,'medicine-rack',{x:2,y:2,rotation:0})).object;
 assert.equal(g.finishRoom(room.id).error,'furnitureMissing');assert.equal(workPoint(room),null);assert.equal(patientPoint(room),null);
 ok(g.removeFurniture(room.id,shelf.id));ok(g.addFurniture(room.id,'pharmacy-counter',{x:2,y:2,rotation:0}));
 ok(g.finishRoom(room.id));assert.equal(g.roomReady(room),true);
 assert.equal(room.furniture.some(f=>f.kind==='pharmacy'),false);
 assert.ok(workPoint(room)&&patientPoint(room));assert.ok(!near(workPoint(room),patientPoint(room)));
 assert.ok(roomObjects(room).some(o=>o.kind==='counter'&&o.design==='dispensary'));
});

test('mixing primary alternatives rejects a second workplace without charging cash or changing the save',()=>{
 for(const [type,kinds] of [['reception',['counter','counter-round','counter-modern']],['pharmacy',['pharmacy','pharmacy-counter']]])for(const first of kinds)for(const second of kinds){
  const {g,room}=draft(type);ok(g.addFurniture(room.id,first,{x:.75,y:1,rotation:0}));const before=g.snapshot();
  assert.equal(g.addFurniture(room.id,second,{x:3.5,y:3,rotation:0}).error,'furnitureDuplicate',`${first} plus ${second}`);
  assert.deepEqual(g.snapshot(),before,'rejected duplicates must be atomic');
  const forged=structuredClone(before);forged.rooms[0].furniture.push({id:'forged-second-workplace',kind:second,x:3.5,y:3,rotation:0,paid:FURNITURE[second].cost});
  assert.throws(()=>Game.restore(forged),/Invalid furniture/,'import must not create a hidden second clinician position');
 }
});

test('new furniture blocks its physical footprint and keeps every approach reachable in four rotations',()=>{
 for(const kind of NEW_KINDS){
  const {g,room}=draft(FURNITURE[kind].rooms[0]),f=ok(g.addFurniture(room.id,kind,{x:2,y:2,rotation:0})).object;
  for(let rotation=0;rotation<4;rotation++){
   ok(g.moveFurniture(room.id,f.id,{x:2,y:2,rotation}));assert.equal(layoutStatus(room).blocked,null,`${kind}/${rotation}`);
   for(const solid of solidRects(room)){
    const from={x:solid.x-.75,y:solid.y+solid.h/2-.5},to={x:solid.x+solid.w+.25,y:from.y};
    assert.equal(furnitureBlocked(room,from,to,{allowInteraction:false}),true,`${kind}/${rotation} must stop a person walking through it`);
   }
   for(const port of furniturePorts(room))for(const [from,to] of [[roomDoor(room),port],[port,roomDoor(room)]]){
    const path=insidePath(room,from,to);assert.notEqual(path,null,`${kind}/${rotation}/${port.kind} is inaccessible`);
    let previous=from;for(const next of path){assert.equal(segmentBlocked(room,previous,next),false,`${kind}/${rotation} route crosses furniture`);previous=next;}
    assert.ok(near(previous,to),`${kind}/${rotation} route fails to reach its destination`);
   }
  }
 }
});

test('each new furniture item survives save, rotation and one refund with identical identity and accounting',()=>{
 for(const kind of NEW_KINDS){
  const {g,room}=draft(FURNITURE[kind].rooms[0]),f=ok(g.addFurniture(room.id,kind,{x:2,y:2,rotation:3})).object;
  const saved=g.snapshot(),restored=Game.restore(saved);assert.deepEqual(restored.snapshot(),saved,kind);
  for(const clinic of [g,restored]){
   const cash=clinic.cash;ok(clinic.moveFurniture(room.id,f.id,{x:1.5,y:2.25,rotation:2}));
   assert.equal(clinic.room(room.id).furniture[0].id,f.id);assert.equal(clinic.cash,cash);
   ok(clinic.removeFurniture(room.id,f.id));assert.equal(clinic.cash,cash+Math.round(f.paid*.75));
   const after=clinic.snapshot();assert.equal(clinic.removeFurniture(room.id,f.id).error,'furnitureInvalid');assert.deepEqual(clinic.snapshot(),after);
  }
  assert.deepEqual(restored.snapshot(),g.snapshot(),kind+' continuation changed after loading');
 }
});

test('patients register, are diagnosed and receive pharmacy treatment at rotated alternative counters after a save',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const g=clinic({rotation}),pharmacy=roomOf(g,'pharmacy'),p=g.spawnPatient('jitters');
  until(g,()=>p.stage==='treatment'&&p.state==='service',150,true);
  assert.equal(p.targetRoom,pharmacy.id);assert.ok(near(p,patientPoint(pharmacy)));
  assert.ok(near(g.staff.find(s=>s.id===pharmacy.staffId),workPoint(pharmacy)));
  assert.equal(pharmacy.furniture.some(f=>f.kind==='pharmacy'),false);
  const restored=Game.restore(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());
  for(let i=0;i<2000&&g.record(p.id).dischargedAt===null;i++){advance(g,true);advance(restored,true);assert.deepEqual(restored.snapshot(),g.snapshot());}
  const record=g.record(p.id);assert.notEqual(record.dischargedAt,null);assert.equal(g.left,0);assert.equal(g.cured+g.failed,1);
  for(const code of ['registered','diagnosed'])assert.equal(record.timeline.filter(e=>e.code===code).length,1);
  assert.equal(record.timeline.filter(e=>e.code==='serviceStarted'&&e.roomType==='pharmacy').length,1);
  assert.equal(record.bill,record.diagnosisCharge+record.treatmentCharge);
 }
});

function patienceLoss(snapshot,id,keepWaiting,keepElsewhere=false){
 const data=structuredClone(snapshot);for(const r of data.rooms)r.furniture=r.furniture.filter(f=>!AMENITIES.has(f.kind)||(r.type==='waiting'?keepWaiting(f):keepElsewhere));
 const g=Game.restore(data),p=g.patients.find(p=>p.id===id),before=p.patience;advance(g);return before-p.patience;
}
function ratioNear(actual,expected){assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);}

test('seated waiting patients receive 5% per amenity type, with no duplicate stacking and a 15% combined reduction',()=>{
 const g=clinic({amenities:true});for(let i=0;i<5;i++)g.spawnPatient('jitters');
 until(g,()=>g.patients.some(p=>p.state==='seated')&&roomOf(g,'gp').patientId!==null);
 const p=g.patients.find(p=>p.state==='seated'),saved=g.snapshot();
 const baseline=patienceLoss(saved,p.id,()=>false);assert.ok(baseline>0);
 const firstGum=roomOf(g,'waiting').furniture.find(f=>f.kind==='gum-machine').id;
 ratioNear(patienceLoss(saved,p.id,f=>f.id===firstGum)/baseline,.95);
 ratioNear(patienceLoss(saved,p.id,f=>f.kind==='gum-machine')/baseline,.95);
 ratioNear(patienceLoss(saved,p.id,()=>true)/baseline,.85);
 ratioNear(patienceLoss(saved,p.id,()=>false,true)/baseline,1);
});

test('amenities do not reduce patience loss while walking to a reserved seat or standing in a queue',()=>{
 const g=clinic({amenities:true});for(let i=0;i<5;i++)g.spawnPatient('jitters');
 for(const state of ['seatTravel','queue']){
  until(g,()=>g.patients.some(p=>p.state===state));const p=g.patients.find(p=>p.state===state),saved=g.snapshot();
  const baseline=patienceLoss(saved,p.id,()=>false),furnished=patienceLoss(saved,p.id,()=>true,true);
  assert.ok(baseline>0,state+' scenario must exercise patience loss');ratioNear(furnished/baseline,1);
 }
});
