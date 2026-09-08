import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {innerDoor,workPoint,solidRects,furnitureBlocked} from '../src/layout.js';

const DT=.05,ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
const roomOf=(g,type)=>g.rooms.find(r=>r.type===type),doctor=g=>g.staff.find(s=>s.role==='doctor');
const xy=s=>({x:s.x,y:s.y});
function room(g,type,rect){const r=ok(g.addRoom(type,rect)).room;ok(g.autoFurnish(r.id));ok(g.finishRoom(r.id));return r;}
function tick(g){const before=[...g.staff,...g.patients].map(entity=>({entity,...xy(entity)}));g.update(DT);assert.equal(g.over,false);assert.equal(g.event,null);for(const from of before){const to=from.entity;assert.ok(Math.hypot(to.x-from.x,to.y-from.y)<=(to.role?2.8:2.5)*DT+1e-7,'only explicit placement may teleport');for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,to),false,`${to.name} crossed furniture`);}}
function until(g,predicate,seconds=180){for(let i=0;i<seconds/DT&&!predicate();i++)tick(g);assert.ok(predicate(),`timeout at ${g.clock}: ${g.staff.map(s=>`${s.name}:${s.state}/${s.roomId}`).join(', ')}`);}
function clinic(){
 const g=new Game({mode:'sandbox',seed:42});
 for(const [type,rect,cast] of [['reception',{x:15,y:12,w:5,h:4},'rosa'],['gp',{x:2,y:2,w:5,h:4},'milo'],['pharmacy',{x:8,y:2,w:5,h:4},'bea']]){
  const r=room(g,type,rect),s=ok(g.hire(cast)).staff;ok(g.placeStaff(s.id,r.id));
 }
 room(g,'lounge',{x:17,y:2,w:5,h:4});ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;
 until(g,()=>g.staff.every(s=>g.staffReady(s)));return g;
}
function extraDoctorRoom(g){return room(g,'gp',{x:2,y:9,w:5,h:4});}

test('new employees of all five professions wait at distinct entrance spots until explicitly placed',()=>{
 const g=clinic(),newStaff=['rosa','milo','bea','nia','otto'].map(id=>ok(g.hire(id)).staff);
 assert.equal(new Set(newStaff.map(s=>JSON.stringify(xy(s)))).size,5);
 for(const s of newStaff){assert.equal(s.awaitingPlacement,true);assert.equal(s.manualPlacement,true);assert.equal(s.roomId,null);assert.equal(s.state,'idle');assert.ok(Math.hypot(s.x-12,s.y-16)<=2.5);assert.equal(g.requestBreak(s.id),false);}
 const original=newStaff.map(s=>structuredClone(s));extraDoctorRoom(g);
 for(let i=0;i<4000;i++)tick(g);
 assert.deepEqual(newStaff,original,'waiting staff must not auto-assign, patrol, tire or start a scheduled break');
 assert.equal(g.rooms.filter(r=>r.type==='gp').at(-1).staffId,null);
 assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('invalid, unfinished, wrong-role, occupied and obstructed drops leave the entire simulation unchanged',()=>{
 const g=clinic(),s=ok(g.hire('milo')).staff,target=extraDoctorRoom(g),draft=ok(g.addRoom('gp',{x:8,y:9,w:5,h:4})).room;
 const solid=solidRects(target)[0],blocked={x:solid.x+solid.w/2-.5,y:solid.y+solid.h/2-.5};
 const cases=[[-1,target.id,undefined,'staffNotFound'],[s.id,null,{x:12,y:16},'staffRoomRequired'],[s.id,draft.id,undefined,'staffRoomNotReady'],[s.id,roomOf(g,'pharmacy').id,undefined,'staffWrongRoom'],[s.id,roomOf(g,'gp').id,undefined,'staffRoomOccupied'],[s.id,target.id,blocked,'staffDropBlocked'],[s.id,target.id,{x:NaN,y:1},'staffDropBlocked'],[s.id,target.id,{x:12,y:16},'staffDropBlocked']];
 for(const [id,roomId,point,error] of cases){const before=g.snapshot();assert.equal(g.staffPlacement(id,roomId,point),error);assert.equal(g.placeStaff(id,roomId,point).error,error);assert.deepEqual(g.snapshot(),before,error+' was not atomic');}
 assert.equal(g.canPickUpStaff(-1),'staffNotFound');assert.equal(g.canPickUpStaff(s.id),null);
});

test('a valid hand drop relocates onto the selected floor, then walks to the real workplace before working',()=>{
 const g=clinic(),s=doctor(g),previous=roomOf(g,'gp'),target=extraDoctorRoom(g),drop=innerDoor(target),cash=g.cash;
 assert.equal(g.staffPlacement(s.id,target.id,drop),null);ok(g.placeStaff(s.id,target.id,drop));
 assert.deepEqual(xy(s),drop);assert.equal(previous.staffId,null);assert.equal(target.staffId,s.id);assert.equal(s.roomId,target.id);assert.equal(s.manualPlacement,true);assert.equal(s.awaitingPlacement,false);
 assert.equal(s.state,'travelWork');assert.equal(g.staffReady(s),false);assert.equal(g.callNext(target),false);assert.equal(g.cash,cash);
 assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 until(g,()=>g.staffReady(s));assert.deepEqual(xy(s),{x:workPoint(target).x,y:workPoint(target).y});
 g.assignStaff();assert.equal(previous.staffId,null,'manual reassignment must not fill the old room again');
});

test('the optional placement point defaults near the inner doorway, including reception seating',()=>{
 const g=clinic(),s=g.staff.find(s=>s.role==='receptionist'),r=roomOf(g,'reception');
 ok(g.placeStaff(s.id,r.id));assert.deepEqual(xy(s),innerDoor(r));assert.equal(g.staffReady(s),false);assert.equal(s.path.length>0,true);
 until(g,()=>g.staffReady(s));assert.equal(s.state,'work');assert.equal(s.roomId,r.id);
});

test('picking up staff cannot interrupt a called patient, room entry, treatment or committed exit',()=>{
 const g=clinic(),s=doctor(g),r=roomOf(g,'gp'),other=extraDoctorRoom(g),p=g.spawnPatient('jitters');
 for(const state of ['called','inside','service','roomExit']){
  until(g,()=>p.targetRoom===r.id&&p.state===state);const before=g.snapshot();
  assert.equal(g.canPickUpStaff(s.id),'staffBusy');assert.equal(g.staffPlacement(s.id,other.id),'staffBusy');assert.equal(g.placeStaff(s.id,other.id).error,'staffBusy');assert.deepEqual(g.snapshot(),before);
 }
 until(g,()=>r.patientId===null);assert.equal(g.canPickUpStaff(s.id),null);assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
});

test('manually selected room assignments survive a lounge break and deterministic save continuation',()=>{
 const g=clinic(),s=doctor(g),old=roomOf(g,'gp'),home=extraDoctorRoom(g);ok(g.placeStaff(s.id,home.id));until(g,()=>g.staffReady(s));
 assert.equal(g.requestBreak(s.id),true);until(g,()=>s.state==='break');assert.equal(s.roomId,home.id);assert.equal(home.staffId,s.id);
 const restored=Game.restore(g.snapshot());for(let i=0;i<1000&&!g.staffReady(s);i++){tick(g);tick(restored);assert.deepEqual(restored.snapshot(),g.snapshot());assert.equal(s.roomId,home.id);}
 assert.equal(g.staffReady(s),true);assert.equal(old.staffId,null);assert.equal(home.staffId,s.id);
});

test('a janitor starts patrol only after a legal corridor or room drop, without claiming clinical staffing',()=>{
 const g=clinic(),s=ok(g.hire('otto')).staff,assignments=g.rooms.map(r=>[r.id,r.staffId]);
 for(let i=0;i<20;i++)tick(g);assert.equal(s.state,'idle');assert.equal(s.path.length,0);
 ok(g.placeStaff(s.id,null,{x:12,y:15}));assert.deepEqual(xy(s),{x:12,y:15});assert.equal(s.awaitingPlacement,false);assert.equal(s.state,'cleaning');assert.equal(s.roomId,null);assert.ok(s.path.length>0);
 tick(g);assert.notDeepEqual(xy(s),{x:12,y:15});
 const lounge=roomOf(g,'lounge');ok(g.placeStaff(s.id,lounge.id));assert.deepEqual(xy(s),innerDoor(lounge));assert.equal(s.roomId,null);assert.equal(s.state,'cleaning');
 assert.deepEqual(g.rooms.map(r=>[r.id,r.staffId]),assignments);
 for(let i=0;i<300;i++)tick(g);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('selling a workplace during a break returns manual staff to waiting rather than filling another room',()=>{
 const g=clinic(),s=doctor(g),home=roomOf(g,'gp'),other=extraDoctorRoom(g);g.requestBreak(s.id);until(g,()=>s.state==='break');
 ok(g.sell(home.id));assert.equal(s.roomId,null);assert.equal(other.staffId,null);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 until(g,()=>s.awaitingPlacement);assert.equal(s.state,'idle');assert.equal(s.path.length,0);assert.equal(other.staffId,null);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 ok(g.placeStaff(s.id,other.id));until(g,()=>g.staffReady(s));assert.equal(other.staffId,s.id);
});

test('building over a returning employee’s entrance target reroutes the waiting journey and remains loadable',()=>{
 const g=clinic(),s=doctor(g),home=roomOf(g,'gp');extraDoctorRoom(g);g.requestBreak(s.id);until(g,()=>s.state==='break');ok(g.sell(home.id));
 until(g,()=>s.breakElapsed>=11.9);g.spawnPatient('jitters');
 until(g,()=>s.state==='travelWork'&&s.destination?.arrival==='idle');
 assert.deepEqual({x:s.destination.x,y:s.destination.y},{x:11,y:16});
 const built=ok(g.addRoom('waiting',{x:9,y:14,w:3,h:3})).room;
 assert.equal(s.state,'travelWork');assert.equal(s.resting,false);assert.equal(s.destination.arrival,'idle');assert.equal(g.contains(built,s.destination),false);
 assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());until(g,()=>s.awaitingPlacement);
 assert.equal(g.contains(built,s),false);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('v6 placement flags round-trip, malformed flags fail, and older saves preserve assigned employees',()=>{
 const g=clinic(),waiting=ok(g.hire('nia')).staff,saved=g.snapshot();assert.deepEqual(Game.restore(saved).snapshot(),saved);
 for(const mutate of [s=>s.manualPlacement='yes',s=>s.awaitingPlacement=0,s=>s.manualPlacement=false,s=>{delete s.manualPlacement;},s=>s.state='cleaning',s=>s.breakPending=true]){
  const bad=structuredClone(saved);mutate(bad.staff.find(s=>s.id===waiting.id));assert.throws(()=>Game.restore(bad),/Invalid staff placement/);
 }
 const old=structuredClone(saved);for(const s of old.staff){delete s.manualPlacement;delete s.awaitingPlacement;}
 const restored=Game.restore(old);assert.equal(restored.version,6);
 for(const original of g.staff.filter(s=>s.roomId!==null)){const loaded=restored.staff.find(s=>s.id===original.id);assert.equal(loaded.roomId,original.roomId);assert.deepEqual(xy(loaded),xy(original));assert.equal(loaded.state,original.state);assert.equal(loaded.manualPlacement,false);assert.equal(loaded.awaitingPlacement,false);}
});
