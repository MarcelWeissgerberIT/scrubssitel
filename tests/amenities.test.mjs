import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {FURNITURE,furniturePorts} from '../src/objects.js';
import {furnitureBlocked} from '../src/layout.js';
import {initAmenities,tryStartAmenity,updateAmenity,cancelAmenity,validateAmenities,amenityActivity,AMENITY_STATES} from '../src/amenities.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const DT=.05,KINDS=['gum-machine','snack-machine','drink-machine'];
const ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const finances=g=>({cash:g.cash,income:g.income,expenses:g.expenses,sales:structuredClone(g.amenitySales)});
function setup(kind='snack-machine',rotation=0){
 const g=new Game({mode:'sandbox',seed:42}),r=ok(g.addRoom('waiting',{x:2,y:9,w:6,h:6})).room;
 for(const y of [.75,2.25,3.75])ok(g.addFurniture(r.id,'chair',{x:.25,y,rotation:0}));
 const item=ok(g.addFurniture(r.id,kind,{x:3,y:2,rotation})).object;ok(g.finishRoom(r.id));
 g.admissionsOpen=true;g.clock=20;g.amenitySales={count:0,revenue:0,costs:0};g.arrivalTimer=g.nextEvent=1e9;
 return {g,r,item};
}
function seated(g,r,index=0){
 if((g.id+1)%4===0)g.id++;
 const p=g.spawnPatient('jitters'),seat=g.seats(r)[index];initAmenities(p,g.clock);
 Object.assign(p,{x:seat.x,y:seat.y,state:'seated',stage:'diagnosis',registered:true,queueOrder:++g.queueSerial,seatRoom:r.id,seatIndex:index,path:[]});p.amenityNextAt=0;return p;
}
function tick(g,p,dt=DT){
 const from={x:p.x,y:p.y};g.clock+=dt;updateAmenity(g,p,dt);
 assert.ok(Math.hypot(p.x-from.x,p.y-from.y)<=2.5*dt+1e-7,'a shopper must walk instead of teleporting');
 for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,p),false,'a shopper must go around furniture');
 validateAmenities(g);
}
function until(g,p,predicate){for(let i=0;i<1600&&!predicate();i++)tick(g,p);assert.ok(predicate(),'shopping trip timed out');}

test('each vending product works in four rotations: reserved seat, real approach, one receipt, physical return',()=>{
 for(const kind of KINDS)for(let rotation=0;rotation<4;rotation++){
  const {g,r,item}=setup(kind,rotation),p=seated(g,r),seat={x:p.x,y:p.y},order=p.queueOrder,before=finances(g),record=structuredClone(g.record(p.id)),rng=g.rng;
  assert.equal(tryStartAmenity(g,p),true,kind+'/'+rotation);assert.equal(p.state,'amenityTravel');assert.equal(p.seatRoom,r.id);assert.equal(p.seatIndex,0);
  until(g,p,()=>p.state==='amenityBuy');assert.deepEqual(finances(g),before,'walking never earns money');
  const port=furniturePorts(r).find(v=>v.furnitureId===item.id&&v.kind==='use');assert.ok(near(p,port));
  for(let i=0;i<47;i++)tick(g,p);assert.equal(p.state,'amenityBuy');assert.deepEqual(finances(g),before,'an unfinished purchase never earns money');
  const spec=FURNITURE[kind].vending;tick(g,p);assert.equal(p.state,'amenityReturn');
  assert.equal(g.cash,before.cash+spec.price-spec.cost);assert.equal(g.income,before.income+spec.price);assert.equal(g.expenses,before.expenses+spec.cost);assert.deepEqual(g.amenitySales,{count:1,revenue:spec.price,costs:spec.cost});
  until(g,p,()=>p.state==='seated');assert.ok(near(p,seat));assert.equal(p.seatIndex,0);assert.equal(p.queueOrder,order);assert.equal(g.rng,rng);assert.deepEqual(g.record(p.id),record,'shopping must not enter the medical bill');
  const paid=finances(g);for(let i=0;i<100;i++){assert.equal(tryStartAmenity(g,p),false);tick(g,p);}assert.deepEqual(finances(g),paid,'one visit cannot be sold again');
 }
});

test('a machine and the temporarily empty chair stay reserved for their shopper',()=>{
 const {g,r}=setup(),p=seated(g,r),other=seated(g,r,1);assert.equal(tryStartAmenity(g,p),true);assert.equal(tryStartAmenity(g,other),false);
 const third=g.spawnPatient('jitters');initAmenities(third,g.clock);assert.equal(g.reserveSeat(third),true);assert.equal(third.seatIndex,2,'walking to a machine cannot release the original chair');
 until(g,p,()=>p.state==='seated');other.amenityNextAt=0;assert.equal(tryStartAmenity(g,other),true,'the machine is available when its previous user has returned');
});

test('machine animation uses purchase progress, freezes with stopped simulation, and is absent in previews',()=>{
 const {g,r,item}=setup(),p=seated(g,r);assert.equal(amenityActivity({},r.id,item.id),null);assert.equal(amenityActivity(g,r.id,item.id),null);
 tryStartAmenity(g,p);assert.equal(amenityActivity(g,r.id,item.id),null);until(g,p,()=>p.state==='amenityBuy');tick(g,p,.2);
 const activity=amenityActivity(g,r.id,item.id),before=structuredClone(p),money=finances(g);assert.ok(activity.progress>0&&activity.progress<1);
 for(let i=0;i<100;i++)assert.deepEqual(amenityActivity(g,r.id,item.id),activity);updateAmenity(g,p,0);assert.deepEqual(p,before);
 g.event='inspection';updateAmenity(g,p,.2);assert.deepEqual(p,before);assert.deepEqual(finances(g),money);g.event=null;
 g.admissionsOpen=false;updateAmenity(g,p,.2);assert.deepEqual(p,before);g.admissionsOpen=true;
 until(g,p,()=>p.state==='amenityReturn');assert.equal(amenityActivity(g,r.id,item.id),null);
});

test('calling the oldest shopper interrupts every shopping phase immediately, preserving FIFO and completed receipts',()=>{
 for(const state of AMENITY_STATES){
  const {g,r}=setup(),p=seated(g,r),other=seated(g,r,1);
  const gp=ok(furnishedRoom(g,'gp',{x:10,y:2,w:5,h:4})).room,s=ok(hireAndPlace(g,'milo')).staff;
  g.admissionsOpen=false;for(let i=0;i<500&&!g.staffReady(s);i++)g.update(DT);assert.equal(g.staffReady(s),true);g.admissionsOpen=true;
  p.targetRoom=other.targetRoom=gp.id;assert.equal(tryStartAmenity(g,p),true);until(g,p,()=>p.state===state);
  const money=finances(g),position={x:p.x,y:p.y};assert.equal(g.waitingList('gp')[0].id,p.id);
  assert.equal(g.callNext(gp),true);assert.equal(gp.patientId,p.id);assert.equal(p.state,'called');assert.equal(p.amenity,null);assert.equal(p.seatRoom,null);assert.ok(near(p,position));
  assert.equal(other.state,'seated');assert.deepEqual(finances(g),money);assert.equal(updateAmenity(g,p,10),false);assert.deepEqual(finances(g),money);
 }
});

test('renovation and abandonment release an unfinished purchase without a charge or stale reservation',()=>{
 for(const action of ['renovate','leave']){
  const {g,r}=setup(),p=seated(g,r);tryStartAmenity(g,p);until(g,p,()=>p.state==='amenityBuy');tick(g,p,.5);const before=finances(g);
  if(action==='renovate')assert.equal(g.beginRoomEdit(r.id).pending,true);else g.leave(p,true);
  assert.equal(p.amenity,null);assert.equal(p.seatRoom,null);assert.equal(AMENITY_STATES.includes(p.state),false);assert.deepEqual(finances(g),before);validateAmenities(g);
 }
});

test('save/load mid-walk, mid-purchase and after payment continues deterministically without a second sale',()=>{
 for(const state of AMENITY_STATES){
  const {g,r}=setup(),p=seated(g,r);tryStartAmenity(g,p);until(g,p,()=>p.state===state);if(state==='amenityBuy')tick(g,p,.6);
  const saved=g.snapshot(),loaded=Game.restore(saved),q=loaded.patients.find(q=>q.id===p.id);assert.deepEqual(loaded.snapshot(),saved);
  for(let i=0;i<1000&&p.state!=='seated';i++){tick(g,p);tick(loaded,q);assert.deepEqual(loaded.snapshot(),g.snapshot());}
  assert.equal(p.state,'seated');assert.equal(loaded.amenitySales.count,1);assert.equal(tryStartAmenity(loaded,q),false);
 }
});

test('invalid imported shopping visits reject missing machines, forged payments and duplicate reservations',()=>{
 const {g,r}=setup(),p=seated(g,r),other=seated(g,r,1);tryStartAmenity(g,p);until(g,p,()=>p.state==='amenityBuy');tick(g,p,.5);
 const saved=g.snapshot();for(const mutate of [
  q=>q.amenity.furnitureId='missing',q=>q.amenity.kind='chair',q=>q.amenity.paid=true,q=>q.amenityPurchased=true,q=>q.amenity.elapsed=-1,q=>q.amenity.elapsed=999,q=>q.amenityNextAt=-1,q=>q.x+=.25,q=>q.amenity=null,
 ]){const data=structuredClone(saved);mutate(data.patients.find(q=>q.id===p.id));assert.throws(()=>Game.restore(data),/amenity|vending/i);}
 const data=structuredClone(saved),q=data.patients.find(q=>q.id===other.id);Object.assign(q,{amenity:structuredClone(p.amenity),state:p.state,x:p.x,y:p.y,path:[]});assert.throws(()=>Game.restore(data),/amenity/i);
 const before=finances(g);cancelAmenity(p,g.clock);p.state='seated';Object.assign(p,{x:g.seats(r)[0].x,y:g.seats(r)[0].y});assert.equal(updateAmenity(g,p,100),false);assert.deepEqual(finances(g),before);
});

test('no purchase starts before registration or its delay, for an unwilling patient, outside a waiting room or while the clinic is closed',()=>{
 const {g,r}=setup(),p=seated(g,r),before=finances(g);p.amenityNextAt=g.clock+8;assert.equal(tryStartAmenity(g,p),false);p.amenityNextAt=0;
 g.admissionsOpen=false;assert.equal(tryStartAmenity(g,p),false);g.admissionsOpen=true;
 p.registered=false;assert.equal(tryStartAmenity(g,p),false);p.registered=true;
 const id=p.id;p.id=4;assert.equal(tryStartAmenity(g,p),false);p.id=id;
 r.type='lounge';assert.equal(tryStartAmenity(g,p),false);r.type='waiting';assert.deepEqual(finances(g),before);
});

test('ordinary Game.update registers a patient, shops while their department is missing, resumes a save and later calls them',()=>{
 const {g,r}=setup('drink-machine');
 ok(furnishedRoom(g,'reception',{x:15,y:12,w:5,h:4}));const receptionist=ok(hireAndPlace(g,'rosa')).staff;
 const firstGP=ok(furnishedRoom(g,'gp',{x:10,y:2,w:5,h:4})).room,firstDoctor=ok(hireAndPlace(g,'milo')).staff;
 ok(furnishedRoom(g,'pharmacy',{x:16,y:2,w:5,h:4}));ok(hireAndPlace(g,'bea'));
 g.admissionsOpen=false;for(let i=0;i<500&&!g.staff.every(s=>g.staffReady(s));i++)g.update(DT);assert.equal(g.staffReady(receptionist),true);ok(g.openClinic());ok(g.dismiss(firstDoctor.id));ok(g.sell(firstGP.id));
 if((g.id+1)%4===0)g.id++;
 const p=g.spawnPatient('jitters');let entered=false;
 for(let i=0;i<2000&&p.state!=='amenityBuy';i++){const before={x:p.x,y:p.y};g.update(DT);for(const room of g.rooms)assert.equal(furnitureBlocked(room,before,p),false);entered||=p.state==='seated';}
 assert.equal(p.state,'amenityBuy');assert.equal(entered,true);assert.equal(p.registered,true);assert.equal(p.targetRoom,null);assert.equal(p.seatRoom,r.id);assert.equal(g.income,0);
 const loaded=Game.restore(g.snapshot()),q=loaded.patients.find(q=>q.id===p.id);
 for(let i=0;i<1000&&!(p.state==='seated'&&p.amenityPurchased);i++){g.update(DT);loaded.update(DT);assert.deepEqual(loaded.snapshot(),g.snapshot());}
 assert.equal(p.state,'seated');assert.equal(p.amenityPurchased,true);assert.equal(g.amenitySales.count,1);assert.equal(g.record(p.id).bill,0);
 const gp=ok(furnishedRoom(g,'gp',{x:10,y:2,w:5,h:4})).room;ok(hireAndPlace(g,'milo'));
 for(let i=0;i<1600&&p.state!=='service';i++)g.update(DT);
 assert.equal(p.state,'service');assert.equal(p.targetRoom,gp.id);assert.equal(p.amenity,null);assert.equal(p.seatRoom,null);assert.equal(g.amenitySales.count,1);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('selling a dismissed department preserves the waiting seat and shopping trip with a loadable save',()=>{
 const {g,r}=setup(),p=seated(g,r),gp=ok(furnishedRoom(g,'gp',{x:10,y:2,w:5,h:4})).room,s=ok(hireAndPlace(g,'milo')).staff;
 p.targetRoom=gp.id;assert.equal(tryStartAmenity(g,p),true);until(g,p,()=>p.state==='amenityBuy');
 const reservation=structuredClone(p.amenity);ok(g.dismiss(s.id));ok(g.sell(gp.id));assert.deepEqual(p.amenity,reservation);assert.equal(p.targetRoom,null);assert.equal(p.seatRoom,r.id);assert.equal(p.state,'amenityBuy');assert.equal(g.amenitySales.count,0);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 until(g,p,()=>p.state==='seated');assert.equal(g.amenitySales.count,1);assert.equal(p.seatRoom,r.id);
});
