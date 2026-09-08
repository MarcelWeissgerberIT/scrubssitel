import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {FURNITURE,furniturePorts} from '../src/objects.js';
import {insidePath} from '../src/layout.js';
import {AMENITY_CLEARANCE,tryStartAmenity,updateAmenity,normalizeAmenities,validateAmenities} from '../src/amenities.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const DT=.05,ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
const money=g=>({cash:g.cash,income:g.income,expenses:g.expenses,sales:structuredClone(g.amenitySales)});
function fixture(offset=0){
 const g=new Game({mode:'sandbox',seed:42}),r=ok(g.addRoom('waiting',{x:2,y:9,w:6,h:6})).room;
 for(const y of [.75,2.25])ok(g.addFurniture(r.id,'chair',{x:.25,y,rotation:0}));
 ok(g.addFurniture(r.id,'snack-machine',{x:3,y:1,rotation:0}));ok(g.addFurniture(r.id,'drink-machine',{x:3+offset,y:2.25,rotation:2}));ok(g.finishRoom(r.id));
 g.admissionsOpen=true;g.clock=20;g.arrivalTimer=g.nextEvent=1e9;
 const people=[0,1].map(index=>{if((g.id+1)%4===0)g.id++;const p=g.spawnPatient('jitters'),seat=g.seats(r)[index];Object.assign(p,{registered:true,stage:'diagnosis',queueOrder:++g.queueSerial,state:'seated',seatRoom:r.id,seatIndex:index,path:[],x:seat.x,y:seat.y,amenityNextAt:0});return p;});
 return {g,r,p:people[0],q:people[1],ports:furniturePorts(r).filter(v=>v.kind==='use')};
}
function advance(g,people){g.clock+=DT;for(const p of people)updateAmenity(g,p,DT);validateAmenities(g);}

test('different vending machines reserve physical body space while their users are still walking',()=>{
 for(const offset of [0,.25,.5]){
  const {g,r,p,q,ports}=fixture(offset);assert.ok(Math.hypot(ports[0].x-ports[1].x,ports[0].y-ports[1].y)<AMENITY_CLEARANCE);
  assert.equal(tryStartAmenity(g,p),true);assert.equal(p.state,'amenityTravel');assert.equal(tryStartAmenity(g,q),false,'different furniture identities must not bypass a reserved use point');
  const before=money(g);for(let i=0;i<1000&&p.state!=='seated';i++)advance(g,[p,q]);
  assert.equal(p.state,'seated');assert.equal(g.amenitySales.count,1);assert.equal(q.amenityPurchased,false);assert.equal(q.seatRoom,r.id);
  assert.ok(g.income>before.income);q.amenityNextAt=0;assert.equal(tryStartAmenity(g,q),true,'the second machine becomes available after the first visit');
 }
});

test('nearby vending machines with enough user space still operate concurrently',()=>{
 const {g,p,q,ports}=fixture(.75);assert.ok(Math.hypot(ports[0].x-ports[1].x,ports[0].y-ports[1].y)>AMENITY_CLEARANCE);
 assert.equal(tryStartAmenity(g,p),true);assert.equal(tryStartAmenity(g,q),true);let concurrent=false;
 for(let i=0;i<1000&&!(p.state==='seated'&&q.state==='seated');i++){advance(g,[p,q]);if(p.state==='amenityBuy'&&q.state==='amenityBuy'){concurrent=true;assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=AMENITY_CLEARANCE);}}
 assert.equal(concurrent,true);assert.equal(g.amenitySales.count,2);
});

test('a late occupant stops entry to the machine but cannot block the clinical FIFO call',()=>{
 const {g,r,p,q}=fixture();const gp=ok(furnishedRoom(g,'gp',{x:10,y:2,w:5,h:4})).room,doctor=ok(hireAndPlace(g,'milo')).staff;
 g.admissionsOpen=false;for(let i=0;i<500&&!g.staffReady(doctor);i++)g.update(DT);assert.equal(g.staffReady(doctor),true);g.admissionsOpen=true;
 p.targetRoom=gp.id;assert.equal(tryStartAmenity(g,p),true);const port=furniturePorts(r).find(v=>v.furnitureId===p.amenity.furnitureId&&v.kind==='use');
 Object.assign(q,{x:port.x,y:port.y,state:'queue',path:[],seatRoom:null,seatIndex:null,targetRoom:gp.id});
 const before={x:p.x,y:p.y,...money(g)};for(let i=0;i<100;i++)advance(g,[p]);
 assert.equal(p.state,'amenityTravel');assert.equal(p.x,before.x);assert.equal(p.y,before.y);assert.deepEqual(money(g),{cash:before.cash,income:before.income,expenses:before.expenses,sales:before.sales});
 assert.equal(g.callNext(gp),true);assert.equal(gp.patientId,p.id);assert.equal(p.state,'called');assert.equal(p.amenity,null);assert.equal(g.amenitySales.count,0);
});

function oldOverlap(state){
 const f=fixture(),{g,r,p,q,ports}=f;
 for(const [index,person] of [p,q].entries()){
  const port=ports[index],item=r.furniture.find(item=>item.id===port.furnitureId),paid=state==='amenityReturn';
  Object.assign(person,{state,amenityPurchased:paid,amenity:{roomId:r.id,furnitureId:item.id,kind:item.kind,elapsed:paid?FURNITURE[item.kind].vending.duration:state==='amenityBuy'?.8:0,paid}});
  if(state!=='amenityTravel')Object.assign(person,{x:port.x,y:port.y});
  person.path=state==='amenityBuy'?[]:insidePath(r,person,state==='amenityReturn'?g.seats(r)[index]:port);
  if(paid){const spec=FURNITURE[item.kind].vending;g.cash+=spec.price-spec.cost;g.income+=spec.price;g.expenses+=spec.cost;g.amenitySales.count++;g.amenitySales.revenue+=spec.price;g.amenitySales.costs+=spec.cost;}
 }
 return f;
}

test('old saves resolve overlapping buyers deterministically without moving them or changing completed purchases',()=>{
 for(const state of ['amenityTravel','amenityBuy','amenityReturn']){
  const {g,p,q}=oldOverlap(state),before=money(g),positions=g.patients.map(p=>({id:p.id,x:p.x,y:p.y,purchased:p.amenityPurchased}));
  assert.throws(()=>validateAmenities(g),/Overlapping amenity reservations/);g.patients.reverse();
  const loaded=Game.restore(g.snapshot()),older=loaded.patients.find(v=>v.id===p.id),younger=loaded.patients.find(v=>v.id===q.id);
  assert.deepEqual(money(loaded),before);assert.deepEqual(loaded.patients.map(v=>({id:v.id,x:v.x,y:v.y,purchased:v.amenityPurchased})).sort((a,b)=>a.id-b.id),positions);
  assert.equal(older.state,state);assert.notEqual(older.amenity,null);assert.equal(younger.amenity,null);assert.ok(['seated','seatTravel'].includes(younger.state));assert.equal(younger.seatIndex,1);
  const saved=loaded.snapshot();normalizeAmenities(loaded);assert.deepEqual(loaded.snapshot(),saved,'normalization must be idempotent');validateAmenities(loaded);
  const again=Game.restore(saved);for(let i=0;i<1000&&!(older.state==='seated'&&younger.state==='seated');i++){loaded.update(DT);again.update(DT);assert.deepEqual(again.snapshot(),loaded.snapshot());}
  assert.equal(older.state,'seated');assert.equal(younger.state,'seated');assert.equal(loaded.amenitySales.count,state==='amenityReturn'?2:1);
 }
});

test('normalizing spatial conflicts cannot hide an invalid payment or duplicate lease on the same machine',()=>{
 for(const corrupt of ['paid','duplicate']){
  const {g,p,q}=oldOverlap('amenityBuy');if(corrupt==='paid')q.amenity.paid=true;else q.amenity={...p.amenity};
  const before=g.snapshot();assert.throws(()=>normalizeAmenities(g),/Invalid amenity/);assert.deepEqual(g.snapshot(),before,'invalid imports must fail before mutation');
 }
});
