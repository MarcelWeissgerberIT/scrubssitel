import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {furnitureBlocked} from '../src/layout.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const DT=.05;
const ok=result=>{assert.equal(result?.error,undefined);return result;};
const room=(g,type)=>g.rooms.find(r=>r.type===type);
function step(g){g.update(DT);assert.equal(g.over,false);assert.equal(g.event,null);}
function advance(g,seconds){for(let i=0;i<seconds/DT;i++)step(g);}
function until(g,predicate,seconds=90){
 for(let i=0;i<seconds/DT&&!predicate();i++)step(g);
 assert.ok(predicate(),`timeout at ${g.clock}: ${g.patients.map(p=>`${p.id}:${p.stage}/${p.state}`).join(', ')}`);
}
function clinic({draft=false}={}){
 const g=new Game({mode:'sandbox',level:3,seed:42});
 for(const [type,rect] of [['reception',{x:15,y:12,w:5,h:4}],['gp',{x:2,y:2,w:5,h:4}],['pharmacy',{x:8,y:2,w:5,h:4}],['lounge',{x:17,y:2,w:5,h:4}]])ok(furnishedRoom(g,type,rect));
 const waiting=ok(g.addRoom('waiting',{x:7,y:8,w:6,h:3})).room;
 ok(g.autoFurnish(waiting.id));if(!draft)ok(g.finishRoom(waiting.id));
 for(const cast of ['rosa','milo','bea'])ok(hireAndPlace(g,cast));
 until(g,()=>g.staff.every(s=>g.staffReady(s)),30);
 ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;
 for(const s of g.staff)s.nextBreakAt=1e9;
 return g;
}
function assertSeated(g,p){
 const r=g.room(p.seatRoom),seat=r&&g.seats(r)[p.seatIndex];
 assert.equal(p.state,'seated');assert.equal(r?.type,'waiting');assert.equal(g.roomReady(r),true);
 assert.ok(seat);assert.ok(Math.hypot(p.x-seat.x,p.y-seat.y)<.08);assert.equal(p.path.length,0);
}
function restoreAndContinue(g,seconds=2){
 const restored=Game.restore(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());
 for(let i=0;i<seconds/DT;i++){step(g);step(restored);assert.deepEqual(restored.snapshot(),g.snapshot());}
}

test('registered patients use a finished waiting room without an assigned doctor and are called after placement',()=>{
 const g=clinic();ok(g.dismiss(room(g,'gp').staffId));const p=g.spawnPatient('jitters');
 until(g,()=>p.stage==='diagnosis'&&p.state==='seated');assertSeated(g,p);
 assert.equal(p.targetRoom,null);assert.deepEqual(g.waitingList('gp').map(p=>p.id),[p.id]);
 const position={x:p.x,y:p.y,seatRoom:p.seatRoom,seatIndex:p.seatIndex};
 restoreAndContinue(g);assert.deepEqual({x:p.x,y:p.y,seatRoom:p.seatRoom,seatIndex:p.seatIndex},position);
 ok(hireAndPlace(g,'milo'));
 until(g,()=>p.stage==='diagnosis'&&p.state==='service');
 assert.equal(g.calls.filter(c=>c.patientId===p.id&&c.roomType==='gp').length,1);
 assert.equal(p.seatRoom,null);assert.equal(p.seatIndex,null);
 until(g,()=>g.record(p.id).dischargedAt!==null);assert.equal(g.left,0);
});

test('patients waiting for a missing specialty keep seats and resume after its room and employee are added',()=>{
 const g=clinic(),p=g.spawnPatient('daydream');
 until(g,()=>p.stage==='treatment'&&p.state==='seated');assertSeated(g,p);assert.equal(p.targetRoom,null);
 restoreAndContinue(g);
 const therapy=ok(furnishedRoom(g,'therapy',{x:2,y:8,w:4,h:3})).room;
 ok(hireAndPlace(g,'milo'));assert.ok(therapy.staffId);
 until(g,()=>p.stage==='treatment'&&p.state==='service');
 assert.equal(p.targetRoom,therapy.id);assert.equal(p.seatRoom,null);
 assert.equal(g.calls.filter(c=>c.patientId===p.id&&c.roomType==='therapy').length,1);
 until(g,()=>g.record(p.id).dischargedAt!==null);assert.equal(g.left,0);
});

test('finishing a waiting room attracts standing patients during a real doctor break',()=>{
 const g=clinic({draft:true}),p=g.spawnPatient('jitters'),doctor=g.staff.find(s=>s.role==='doctor'),gp=room(g,'gp');
 until(g,()=>p.stage==='diagnosis'&&p.state==='travel');assert.equal(g.requestBreak(doctor.id),true);
 until(g,()=>p.state==='queue');assert.equal(gp.patientId,null);assert.equal(g.staffReady(doctor),false);
 ok(g.finishRoom(room(g,'waiting').id));
 until(g,()=>p.seatRoom===room(g,'waiting').id,1);
 until(g,()=>p.state==='seated',15);assertSeated(g,p);assert.equal(gp.patientId,null);
 until(g,()=>p.stage==='diagnosis'&&p.state==='service');
 assert.equal(g.calls.filter(c=>c.patientId===p.id&&c.roomType==='gp').length,1);
});

test('seat capacity excludes furnished drafts and rooms being renovated',()=>{
 const g=clinic({draft:true}),waiting=room(g,'waiting'),capacity=g.seats(waiting).length;
 assert.ok(capacity>0);assert.equal(g.seatStats().capacity,0);assert.equal(g.seatStats().draft,capacity);
 ok(g.finishRoom(waiting.id));assert.equal(g.seatStats().capacity,capacity);assert.equal(g.seatStats().draft,0);
 ok(g.dismiss(room(g,'gp').staffId));const p=g.spawnPatient('jitters');
 until(g,()=>p.stage==='diagnosis'&&p.state==='seated');
 const result=ok(g.beginRoomEdit(waiting.id));assert.equal(result.pending,true);
 assert.equal(waiting.renovating,true);assert.equal(g.seatStats().capacity,0);assert.equal(g.seatStats().draft,capacity);
 until(g,()=>waiting.editing);assert.equal(g.seatStats().capacity,0);assert.equal(g.seatStats().reserved,0);
});

test('dismissing an idle doctor does not evict a patient already seated in the waiting room',()=>{
 const g=clinic(),p=g.spawnPatient('jitters'),doctor=g.staff.find(s=>s.role==='doctor');
 until(g,()=>p.stage==='diagnosis'&&p.state==='seatTravel');assert.equal(g.requestBreak(doctor.id),true);
 until(g,()=>p.state==='seated');assertSeated(g,p);
 const seat={room:p.seatRoom,index:p.seatIndex,x:p.x,y:p.y};
 ok(g.dismiss(doctor.id));advance(g,1);
 assertSeated(g,p);assert.deepEqual({room:p.seatRoom,index:p.seatIndex,x:p.x,y:p.y},seat);
 assert.equal(p.targetRoom,null);restoreAndContinue(g);
});

test('the oldest registered patient can be called during their seat or corridor journey without a FIFO jump',()=>{
 for(const draft of [false,true]){
  const g=clinic({draft}),p=g.spawnPatient('jitters'),gp=room(g,'gp');
  until(g,()=>p.stage==='diagnosis'&&p.state===(draft?'travel':'seatTravel'));
  assert.equal(p.registered,true);assert.ok(p.path.length);assert.equal(g.staffReady(g.staff.find(s=>s.id===gp.staffId)),true);
  // A younger, already standing patient must not bypass the person still walking.
  const younger=g.spawnPatient('jitters'),spot=g.standingPoint(gp,younger).spot;
  Object.assign(younger,{registered:true,stage:'diagnosis',queueOrder:++g.queueSerial,state:'queue',targetRoom:gp.id,path:[],x:spot.x,y:spot.y});
  const before={x:p.x,y:p.y,income:g.income,queueOrder:p.queueOrder};
  assert.deepEqual(g.waitingList('gp').map(q=>q.id),[p.id,younger.id]);
  assert.equal(g.callNext(gp),true);assert.equal(gp.patientId,p.id);assert.equal(p.state,'called');assert.equal(younger.state,'queue');
  assert.equal(p.x,before.x);assert.equal(p.y,before.y);assert.equal(p.queueOrder,before.queueOrder);assert.equal(p.path.length,0);assert.equal(p.seatRoom,null);assert.equal(p.seatIndex,null);assert.equal(g.income,before.income);
  const restored=Game.restore(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());
  for(let i=0;i<1000&&p.state!=='service';i++){
   const from={x:p.x,y:p.y};step(g);step(restored);assert.deepEqual(restored.snapshot(),g.snapshot());
   assert.ok(Math.hypot(p.x-from.x,p.y-from.y)<=2.5*DT+1e-7,'the call must not teleport the patient');
   for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,p),false,'the replacement route must avoid every furnishing');
  }
  assert.equal(p.state,'service');assert.equal(g.income,before.income,'walking to the clinician cannot charge treatment');
  assert.equal(g.calls.filter(c=>c.patientId===p.id&&c.roomType==='gp').length,1);
  assert.equal(g.record(p.id).timeline.filter(e=>e.code==='serviceStarted'&&e.roomType==='gp').length,1);
 }
});

test('early calls still require registration, the matching department and an eligible waiting state',()=>{
 const g=clinic(),p=g.spawnPatient('jitters'),gp=room(g,'gp');
 g.routePatient(p);assert.equal(p.registered,false);assert.equal(p.state,'travel');assert.equal(g.callNext(gp),false,'unregistered arrivals cannot bypass reception');
 Object.assign(p,{registered:true,stage:'treatment',queueOrder:++g.queueSerial,targetRoom:room(g,'pharmacy').id});
 assert.equal(g.callNext(gp),false,'a pharmacy patient is not a diagnosis candidate');
 p.stage='diagnosis';p.targetRoom=gp.id;
 for(const state of ['waiting','relocating','inside','service','roomExit','exit']){
  p.state=state;assert.equal(g.callNext(gp),false,`${state} must not be interrupted by an early call`);assert.equal(gp.patientId,null);
 }
});
