import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {ROOMS} from '../src/content.js';
import {FURNITURE,requirements,roomObjects} from '../src/objects.js';
import {layoutStatus,workPoint,patientPoint,roomSeats,furnitureBlocked,insidePath,innerDoor,roomDoor} from '../src/layout.js';
import {furnishedRoom,hireAndPlace,deployStaff} from './helpers.mjs';

const DT=.05;
const ok=(result,label='operation')=>{assert.equal(result?.error,undefined,`${label}: ${result?.error}`);return result;};
const roomOf=(g,type)=>g.rooms.find(r=>r.type===type);
const employee=(g,role)=>g.staff.find(s=>s.role===role);
function advance(g,{collision=false}={}){
 const before=collision?[...g.patients,...g.staff].map(entity=>({entity,x:entity.x,y:entity.y})):[];
 g.update(DT);
 assert.equal(g.over,false,'fixture unexpectedly went bankrupt or lost its reputation');
 for(const from of before){const to=from.entity;const distance=Math.hypot(to.x-from.x,to.y-from.y);assert.ok(distance<=(to.role?2.8:2.5)*DT+1e-7,`${to.id} teleported at ${g.clock}`);
  for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,to),false,`${to.name} crossed ${r.type} furniture at ${g.clock}: ${JSON.stringify({from:{x:from.x,y:from.y},to:{x:to.x,y:to.y},state:to.state})}`);
 }
}
function until(g,predicate,seconds=180,check=()=>{},options={}){
 for(let i=0;i<seconds/DT&&!predicate();i++){check();advance(g,options);}
 assert.ok(predicate(),`timed out at ${g.clock}; staff ${g.staff.map(s=>`${s.id}:${s.state}`).join(', ')}; patients ${g.patients.map(p=>`${p.id}:${p.stage}/${p.state}`).join(', ')}`);
}
function clinic({waiting=true,lounge=true,rotated=false}={}){
 const g=new Game({mode:'sandbox',seed:42});
 for(const [type,rect] of [['reception',{x:15,y:12,w:5,h:4}],['gp',{x:2,y:2,w:5,h:4}],['pharmacy',{x:8,y:2,w:5,h:4}]]){
  if(rotated&&type==='gp'){const r=ok(g.addRoom(type,rect)).room;ok(g.addFurniture(r.id,'gp',{x:1,y:.75,rotation:1}));ok(g.finishRoom(r.id));}
  else ok(furnishedRoom(g,type,rect));
 }
 if(waiting)ok(furnishedRoom(g,'waiting',{x:7,y:8,w:6,h:3}));
 if(lounge)ok(furnishedRoom(g,'lounge',{x:17,y:2,w:5,h:4}));
 for(const cast of ['rosa','milo','bea'])ok(hireAndPlace(g,cast));
 ok(g.openClinic());g.arrivalTimer=1e9;g.nextEvent=1e9;
 until(g,()=>g.staff.every(s=>g.staffReady(s)),60,()=>{},{collision:true});
 return g;
}
function emptyEditing(g,r){return r.editing&&!r.renovating&&!r.ready&&r.patientId===null&&!g.patients.some(p=>g.contains(r,p)||p.seatRoom===r.id)&&!g.staff.some(s=>g.contains(r,s)||s.breakRoomId===r.id||s.destination?.roomId===r.id&&s.path.length);}
function deterministicContinuation(a,ticks=500){const b=Game.restore(a.snapshot());assert.equal(b.version,6);assert.deepEqual(b.snapshot(),a.snapshot());for(let i=0;i<ticks;i++){advance(a);advance(b);assert.deepEqual(b.snapshot(),a.snapshot(),`restore diverged at ${a.clock}`);}return b;}

test('new room shells are empty, expose unmet equipment requirements and cannot be finished',()=>{
 for(const type of Object.keys(ROOMS)){
  const g=new Game({mode:'sandbox',seed:1}),r=ok(g.addRoom(type,{x:2,y:2,w:3,h:3})).room;
  assert.deepEqual(r.furniture,[]);assert.equal(r.editing,true);assert.equal(g.roomReady(r),false);
  assert.deepEqual(roomObjects(r).map(o=>o.kind),['door']);
  const status=layoutStatus(r);assert.equal(status.ready,false);assert.equal(status.blocked,null);
  assert.deepEqual(status.missing.map(({kind,need})=>({kind,need})),requirements(type));
  assert.ok(status.missing.every(m=>m.have===0&&m.need>0));
  assert.equal(g.finishRoom(r.id).error,'furnitureMissing');
  assert.equal(g.openClinic().error,'openingRequirements');
 }
});

test('equipment, finishing and physical staff arrival gate clinic work in sequence',()=>{
 const g=new Game({mode:'sandbox',seed:42});
 for(const [type,rect,cast] of [['reception',{x:15,y:12,w:5,h:4},'rosa'],['gp',{x:2,y:2,w:5,h:4},'milo'],['pharmacy',{x:8,y:2,w:5,h:4},'bea']]){
  const r=ok(g.addRoom(type,rect)).room,s=ok(hireAndPlace(g,cast)).staff;
  assert.equal(r.staffId,null);assert.equal(s.roomId,null);assert.equal(g.staffReady(s),false);
  ok(g.autoFurnish(r.id));assert.equal(r.staffId,null,'furniture alone must not open the room');
  assert.equal(g.openClinic().error,'openingRequirements');
  ok(g.finishRoom(r.id));assert.equal(r.staffId,null);deployStaff(g,s);assert.equal(r.staffId,s.id);assert.equal(g.staffReady(s),false);
  assert.equal(g.addFurniture(r.id,'plant',{x:3,y:2,rotation:0}).error,'roomEditing');
 }
 ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;const p=g.spawnPatient('jitters');
 until(g,()=>g.staff.every(s=>g.staffReady(s)),60,()=>{for(const r of g.rooms)if(!g.staffReady(g.staff.find(s=>s.id===r.staffId)))assert.equal(r.patientId,null);});
 until(g,()=>g.record(p.id).dischargedAt!==null,180,()=>{},{collision:true});
 assert.equal(g.record(p.id).timeline.filter(e=>e.code==='registered').length,1);
 assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
});

test('placement rejects overlaps, inaccessible ports, duplicate equipment and blocked doors atomically',()=>{
 const g=new Game({mode:'sandbox',seed:42}),r=ok(g.addRoom('gp',{x:2,y:2,w:6,h:5})).room;
 ok(g.addFurniture(r.id,'gp',{x:.25,y:.75,rotation:0}));
 for(const [kind,position,error] of [
  ['plant',{x:.25,y:.75,rotation:0},'furnitureOverlap'],
  ['plant',{x:1.75,y:.75,rotation:0},'furnitureBlocked'],
  ['cabinet',{x:3,y:4.5,rotation:0},'furnitureDoor'],
  ['gp',{x:3,y:1,rotation:0},'furnitureDuplicate'],
  ['sofa',{x:3,y:1,rotation:0},'furnitureRoom'],
  ['plant',{x:.1,y:2,rotation:0},'furnitureInvalid'],
  ['plant',{x:5.75,y:2,rotation:0},'furnitureBounds']
 ]){const before=g.snapshot();assert.equal(g.addFurniture(r.id,kind,position).error,error);assert.deepEqual(g.snapshot(),before,`${error} must not spend cash or change IDs/layout`);}
 assert.equal(layoutStatus(r).ready,true);
});

test('rotated equipment ports follow the furniture and mandatory doorway approaches are retained',()=>{
 const g=new Game({mode:'sandbox',seed:1}),r=ok(g.addRoom('reception',{x:2,y:9,w:6,h:6})).room;
 const f=ok(g.addFurniture(r.id,'counter',{x:2,y:2,rotation:0})).object;
 const original=roomObjects(r).filter(o=>o.furnitureId===f.id).map(o=>o.id),points=[];
 for(let rotation=0;rotation<4;rotation++){
  ok(g.moveFurniture(r.id,f.id,{x:2,y:2,rotation}));
  assert.deepEqual(roomObjects(r).filter(o=>o.furnitureId===f.id).map(o=>o.id),original);
  for(const p of [workPoint(r),patientPoint(r)]){
   assert.notEqual(p,null);const entry=insidePath(r,roomDoor(r),p),exit=insidePath(r,p,roomDoor(r));assert.notEqual(entry,null);assert.notEqual(exit,null);
   assert.deepEqual(entry[0],innerDoor(r));assert.deepEqual(exit.at(-2),innerDoor(r));
  }
  points.push(JSON.stringify([workPoint(r).x,workPoint(r).y,workPoint(r).lookYaw]));
 }
 assert.equal(new Set(points).size,4);
});

test('wall decorations attach to supported walls and leave the doorway clear',()=>{
 const g=new Game({mode:'sandbox',seed:1}),r=ok(g.addRoom('gp',{x:2,y:9,w:5,h:4})).room;
 for(const [position,error] of [[{x:1,y:1,rotation:0},'furnitureWall'],[{x:.25,y:0,rotation:2},'furnitureWall'],[{x:2,y:0,rotation:0},'furnitureDoor']])assert.equal(g.addFurniture(r.id,'poster',position).error,error);
 ok(g.addFurniture(r.id,'poster',{x:.25,y:0,rotation:0}));
 ok(g.addFurniture(r.id,'clock',{x:0,y:2,rotation:3}));
});

test('moving furniture keeps identity and costs nothing; removal refunds exactly once',()=>{
 const g=new Game({mode:'sandbox',seed:42}),r=ok(g.addRoom('gp',{x:2,y:2,w:6,h:5})).room;
 const before={cash:g.cash,construction:g.construction},f=ok(g.addFurniture(r.id,'gp',{x:.25,y:.75,rotation:0})).object;
 assert.equal(g.cash,before.cash-FURNITURE.gp.cost);assert.equal(g.construction,before.construction+FURNITURE.gp.cost);
 const id=f.id,paid=f.paid,afterPurchase=g.cash;ok(g.moveFurniture(r.id,id,{x:2,y:1,rotation:1}));
 assert.equal(r.furniture[0].id,id);assert.equal(r.furniture[0].paid,paid);assert.equal(g.cash,afterPurchase);
 const valid=g.snapshot();assert.equal(g.moveFurniture(r.id,id,{x:6,y:1,rotation:1}).error,'furnitureBounds');assert.deepEqual(g.snapshot(),valid);
 ok(g.removeFurniture(r.id,id));const refund=Math.round(FURNITURE.gp.cost*.75);assert.equal(g.cash,afterPurchase+refund);assert.equal(g.construction,before.construction+FURNITURE.gp.cost-refund);
 const refunded=g.snapshot();assert.equal(g.removeFurniture(r.id,id).error,'furnitureInvalid');assert.deepEqual(g.snapshot(),refunded);
 assert.equal(g.cash,50000+g.income-g.expenses-g.construction+g.financing);
});

test('actual patient and staff ticks avoid every furniture solid, including seat entry and departure',()=>{
 const g=clinic({rotated:true}),patients=Array.from({length:6},()=>g.spawnPatient('jitters')),seen=new Set();
 g.requestBreak(employee(g,'doctor').id);
 until(g,()=>patients.every(p=>g.record(p.id).dischargedAt!==null),360,()=>{for(const p of g.patients)seen.add(p.state);for(const s of g.staff)seen.add(s.state);},{collision:true});
 assert.equal(g.left,0);assert.equal(g.cured+g.failed,patients.length);
 for(const state of ['seated','seatTravel','called','inside','service','roomExit','travelBreak','break','travelWork'])assert.ok(seen.has(state),`missing exercised state ${state}`);
});

test('renovation finishes a committed service before staff leave and automatically unlocks an empty editor',()=>{
 const g=clinic(),r=roomOf(g,'gp'),p=g.spawnPatient('jitters');
 until(g,()=>p.stage==='diagnosis'&&p.state==='service',120);
 const staff=employee(g,'doctor'),origin={x:staff.x,y:staff.y},callCount=g.callSerial;
 assert.equal(ok(g.beginRoomEdit(r.id)).pending,true);assert.equal(r.renovating,true);assert.equal(r.editing,false);assert.equal(g.roomReady(r),false);
 assert.equal(g.removeFurniture(r.id,r.furniture[0].id).error,'roomEditing');
 g.spawnPatient('jitters');
 until(g,()=>r.patientId!==p.id,60,()=>{assert.equal(r.editing,false);assert.equal(g.staffReady(staff),true);assert.deepEqual({x:staff.x,y:staff.y},origin);},{collision:true});
 assert.ok(g.record(p.id).timeline.some(e=>e.code==='diagnosed'));
 until(g,()=>emptyEditing(g,r),120,()=>{assert.equal(g.calls.filter(c=>c.roomId===r.id&&c.id>callCount).length,0);},{collision:true});
 assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
 ok(g.moveFurniture(r.id,r.furniture[0].id,{x:1,y:.75,rotation:1}));ok(g.finishRoom(r.id));assert.equal(g.roomReady(r),true);
});

test('renovating an occupied waiting room releases seats and waits for physical departure',()=>{
 const g=clinic();g.requestBreak(employee(g,'doctor').id);for(let i=0;i<5;i++)g.spawnPatient('jitters');
 const r=roomOf(g,'waiting');until(g,()=>g.patients.some(p=>p.seatRoom===r.id&&p.state==='seated'),120);
 assert.equal(ok(g.beginRoomEdit(r.id)).pending,true);assert.equal(r.editing,false);assert.ok(g.patients.every(p=>p.seatRoom!==r.id));
 until(g,()=>emptyEditing(g,r),120,()=>{},{collision:true});
 assert.equal(roomSeats(r).length>0,true,'renovation does not silently delete purchased seats');
});

test('a waiting-room renovation preserves an already called appointment in another room',()=>{
 const g=clinic(),p=g.spawnPatient('jitters'),waiting=roomOf(g,'waiting');
 until(g,()=>p.state==='called'&&p.targetRoom!==waiting.id&&g.contains(waiting,p),150);
 const appointment=p.targetRoom,department=g.room(appointment);assert.equal(department.patientId,p.id);
 ok(g.beginRoomEdit(waiting.id));assert.equal(p.targetRoom,appointment);assert.equal(department.patientId,p.id);
 until(g,()=>g.record(p.id).dischargedAt!==null,180,()=>{},{collision:true});
 assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
 until(g,()=>emptyEditing(g,waiting),90);
});

test('renovating a lounge releases break reservations and waits for employees to walk out',()=>{
 const g=clinic(),s=employee(g,'doctor'),r=roomOf(g,'lounge');g.requestBreak(s.id);until(g,()=>s.state==='break'&&s.breakRoomId===r.id,120);
 assert.equal(ok(g.beginRoomEdit(r.id)).pending,true);assert.equal(r.editing,false);assert.ok(g.staff.every(staff=>staff.breakRoomId!==r.id));
 until(g,()=>emptyEditing(g,r),120,()=>{},{collision:true});assert.ok(g.staff.every(staff=>!g.contains(r,staff)));
});

test('renovation is reloadable immediately after the patient exits, before the employee departs',()=>{
 const g=clinic(),r=roomOf(g,'gp'),p=g.spawnPatient('jitters');
 until(g,()=>p.stage==='diagnosis'&&p.state==='service');ok(g.beginRoomEdit(r.id));
 until(g,()=>r.patientId===null,60);
 assert.equal(r.renovating,true);assert.equal(r.editing,false);
 assert.doesNotThrow(()=>Game.restore(g.snapshot()));
 deterministicContinuation(g,200);
});

test('a lounge can evacuate an employee who has entered but has not yet reached their seat',()=>{
 const g=clinic(),s=employee(g,'doctor'),r=roomOf(g,'lounge');g.requestBreak(s.id);
 until(g,()=>s.state==='travelBreak'&&s.breakRoomId===r.id&&g.contains(r,s),120);
 assert.equal(ok(g.beginRoomEdit(r.id)).pending,true);assert.equal(s.breakRoomId,null);
 until(g,()=>emptyEditing(g,r),120,()=>{},{collision:true});
 assert.doesNotThrow(()=>Game.restore(g.snapshot()));
});

test('schema 6 resumes draft furniture and a pending renovation deterministically',()=>{
 const draft=new Game({mode:'sandbox',seed:42}),r=ok(draft.addRoom('gp',{x:2,y:2,w:5,h:4})).room;
 const f=ok(draft.addFurniture(r.id,'plant',{x:3,y:2,rotation:0})).object;
 assert.equal(layoutStatus(r).ready,false,'the saved draft deliberately lacks required equipment');
 const copy=Game.restore(draft.snapshot());assert.equal(copy.version,6);assert.deepEqual(copy.snapshot(),draft.snapshot());
 for(const g of [draft,copy]){ok(g.moveFurniture(r.id,f.id,{x:4,y:2,rotation:1}));ok(g.addFurniture(r.id,'gp',{x:1,y:.75,rotation:1}));ok(g.finishRoom(r.id));ok(hireAndPlace(g,'milo'));}
 assert.deepEqual(copy.snapshot(),draft.snapshot());
 const active=clinic(),gp=roomOf(active,'gp'),p=active.spawnPatient('jitters');until(active,()=>p.stage==='diagnosis'&&p.state==='service');ok(active.beginRoomEdit(gp.id));
 deterministicContinuation(active,800);
});
