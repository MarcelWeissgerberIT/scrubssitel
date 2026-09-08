import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,ENTRY,GRID} from '../src/game.js';
import {BASE_GRID,EXPANSIONS,gridFor} from '../src/expansion.js';
import {furnitureBlocked} from '../src/layout.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const DT=.05,ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
const rects={east:{x:24,y:2,w:5,h:4},south:{x:2,y:18,w:5,h:5}};
const tick=g=>{g.update(DT);assert.equal(g.over,false);assert.equal(g.event,null);};
function until(g,predicate,seconds=180){for(let i=0;i<seconds/DT&&!predicate();i++)tick(g);assert.ok(predicate(),`timeout at ${g.clock}`);}
function clinic(expansion=null){
 const g=new Game({mode:'sandbox',seed:42});if(expansion)ok(g.expand(expansion));
 for(const [type,rect] of [['reception',{x:15,y:12,w:5,h:4}],['gp',expansion?rects[expansion]:{x:2,y:2,w:5,h:4}],['pharmacy',{x:8,y:2,w:5,h:4}]])ok(furnishedRoom(g,type,rect));
 for(const cast of ['rosa','milo','bea'])ok(hireAndPlace(g,cast));
 until(g,()=>g.staff.every(s=>g.staffReady(s)),40);ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;for(const s of g.staff)s.nextBreakAt=1e9;return g;
}

test('each expansion adds its empty area once, independently and for its advertised price',()=>{
 assert.deepEqual(GRID,{w:24,h:18});assert.deepEqual(BASE_GRID,GRID);
 for(const order of [['east','south'],['south','east']]){
  const g=new Game({mode:'sandbox',seed:42});assert.deepEqual(g.expansions,[]);assert.deepEqual(g.grid,BASE_GRID);
  const changed=g.grid;changed.w=999;assert.deepEqual(g.grid,BASE_GRID,'a caller cannot mutate the grid through its getter');
  let total=0;for(const id of order){const spec=EXPANSIONS.find(e=>e.id===id),before=g.snapshot();assert.ok(spec.name.en&&spec.name.de);const result=ok(g.expand(id));total+=spec.cost;
   assert.equal(result.expansion.id,id);assert.equal(g.cash,50000-total);assert.equal(g.construction,total);assert.equal(g.yearlyProfit(),-total);assert.equal(g.clock,0);assert.deepEqual(g.rooms,before.rooms);assert.deepEqual(g.staff,before.staff);assert.deepEqual(g.patients,before.patients);
   assert.deepEqual(g.grid,gridFor(order.slice(0,g.expansions.length)));assert.equal(g.logs[0].code,'expanded');assert.equal(g.logs[0].extra,id);
  }
  assert.deepEqual(g.grid,{w:30,h:24});assert.equal(g.cash,5000);assert.deepEqual(g.expansions,order);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 }
});

test('invalid, repeated, unaffordable and unavailable expansion purchases are atomic',()=>{
 const g=new Game({mode:'sandbox',seed:42});
 for(const id of ['west','north','__proto__',null,undefined,{}]){const before=g.snapshot();assert.equal(g.expand(id).error,'expansionInvalid');assert.deepEqual(g.snapshot(),before);}
 g.cash=19999;let before=g.snapshot();assert.equal(g.expand('east').error,'notEnough');assert.deepEqual(g.snapshot(),before);
 g.cash=20000;ok(g.expand('east'));assert.equal(g.cash,0);before=g.snapshot();assert.equal(g.expand('east').error,'expansionOwned');assert.deepEqual(g.snapshot(),before);
 for(const field of ['event','over']){const stopped=new Game({seed:42});stopped[field]=field==='event'?'printer':true;const saved=stopped.snapshot();assert.equal(stopped.expand('south').error,'expansionUnavailable');assert.deepEqual(stopped.snapshot(),saved);}
});

test('buying a wing preserves every existing room, furnishing, door, person, chart and current path',()=>{
 const g=clinic(),p=g.spawnPatient('jitters');until(g,()=>p.state==='inside'&&p.stage==='diagnosis');
 const before=g.snapshot(),doors=g.rooms.map(r=>g.door(r));ok(g.expand('east'));
 for(const field of ['rooms','staff','patients','records','rng','clock','calendar','income','expenses','financing','contracts'])assert.deepEqual(g[field],before[field],field+' changed during purchase');
 assert.deepEqual(g.rooms.map(r=>g.door(r)),doors);assert.deepEqual(ENTRY,{x:12,y:16});
 assert.equal(g.cash,before.cash-20000);assert.equal(g.construction,before.construction+20000);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('room building and paths reject unowned wings and permit the purchased wing up to its corridor boundary',()=>{
 for(const id of ['east','south']){
  const g=new Game({mode:'sandbox',seed:42}),rect=rects[id],point=id==='east'?{x:27,y:7}:{x:12,y:21};
  assert.equal(g.addRoom('gp',rect).error,'invalidRoom');assert.equal(g.path(ENTRY,point),null);assert.equal(g.path(point,ENTRY),null);
  ok(g.expand(id));assert.ok(g.path(ENTRY,point)?.length);assert.ok(g.path(point,ENTRY)?.length);const room=ok(furnishedRoom(g,'gp',rect)).room;
  assert.ok(g.path(ENTRY,g.door(room))?.length);const stand=g.standingPoint(room,{id:-1,...(id==='east'?{x:23,y:8}:{x:8,y:22})});assert.ok(stand.path.length);assert.ok(id==='east'?stand.spot.x>=23:stand.spot.y>=17);assert.deepEqual(stand.path.at(-1),stand.spot);
  const edge=id==='east'?{x:27,y:10,w:3,h:3}:{x:10,y:21,w:3,h:3};assert.equal(g.placement('waiting',edge),'invalidRoom','the outer circulation strip remains free');
  const absent=id==='east'?{x:2,y:18,w:5,h:5}:{x:24,y:2,w:5,h:4};assert.equal(g.placement('waiting',absent),'invalidRoom');
  assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 }
});

test('clinical work, patient care, staff breaks and saved continuation operate in either new wing',()=>{
 for(const id of ['east','south']){
  const g=clinic(id),gp=g.rooms.find(r=>r.type==='gp'),doctor=g.staff.find(s=>s.id===gp.staffId),loungeRect=id==='east'?{x:24,y:10,w:5,h:4}:{x:10,y:18,w:5,h:5};
  const lounge=ok(furnishedRoom(g,'lounge',loungeRect)).room,p=g.spawnPatient('jitters');
  until(g,()=>p.state==='service'&&p.targetRoom===gp.id);assert.ok(id==='east'?p.x>23:p.y>17);assert.ok(id==='east'?doctor.x>23:doctor.y>17);
  const copy=Game.restore(g.snapshot());assert.deepEqual(copy.snapshot(),g.snapshot());
  for(let i=0;i<3000&&g.record(p.id).dischargedAt===null;i++){
   const before=[...g.patients,...g.staff].map(person=>({person,x:person.x,y:person.y}));tick(g);tick(copy);assert.deepEqual(copy.snapshot(),g.snapshot());
   for(const from of before)for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,from.person),false);
  }
  assert.notEqual(g.record(p.id).dischargedAt,null);assert.equal(g.left,0);assert.equal(g.cured+g.failed,1);
  assert.equal(g.requestBreak(doctor.id),true);until(g,()=>doctor.state==='break');assert.equal(doctor.breakRoomId,lounge.id);assert.ok(id==='east'?doctor.x>23:doctor.y>17);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
  until(g,()=>g.staffReady(doctor));assert.equal(doctor.roomId,gp.id);
 }
});

test('manual maintenance placement and patrol can use both purchased wings without moving the entrance',()=>{
 const g=new Game({mode:'sandbox',seed:42}),s=ok(g.hire('otto')).staff;
 assert.equal(g.staffPlacement(s.id,null,{x:27,y:15}),'staffDropBlocked');assert.equal(g.staffPlacement(s.id,null,{x:12,y:21}),'staffDropBlocked');
 ok(g.expand('east'));ok(g.expand('south'));
 for(const point of [{x:27,y:15},{x:12,y:21}]){ok(g.placeStaff(s.id,null,point));assert.equal(s.x,point.x);assert.equal(s.y,point.y);assert.equal(s.state,'cleaning');assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());}
 let east=false,south=false;for(let i=0;i<4000&&!(east&&south);i++){tick(g);east||=s.x>=25;south||=s.y>=20;}
 assert.equal(east,true);assert.equal(south,true);assert.equal(g.clock,0);assert.deepEqual(ENTRY,{x:12,y:16});
});

test('the annual report deducts expansion capital expenditure once and never treats it as income or monthly rent',()=>{
 const g=new Game({mode:'sandbox',seed:42});ok(g.expand('east'));ok(g.expand('south'));g.admissionsOpen=true;g.arrivalTimer=g.nextEvent=1e9;
 for(let i=0;i<7200;i++)tick(g);
 assert.deepEqual(g.financialYears[0],{year:1,income:0,expenses:0,construction:45000,profit:-45000,closingCash:5000});assert.equal(g.dailyCost(),0);assert.equal(g.cash,50000+g.income-g.expenses-g.construction+g.financing);assert.equal(g.yearlyProfit(),0);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('legacy saves default to the original footprint and malformed expansion lists cannot unlock terrain',()=>{
 const g=clinic(),p=g.spawnPatient('jitters');until(g,()=>p.state==='inside');const legacy=g.snapshot();delete legacy.expansions;const original=structuredClone(legacy),loaded=Game.restore(legacy);
 assert.deepEqual(legacy,original,'loading must not modify the supplied legacy save');assert.deepEqual(loaded.expansions,[]);assert.deepEqual(loaded.grid,BASE_GRID);const restored=loaded.snapshot();delete restored.expansions;assert.deepEqual(restored,legacy);
 for(const expansions of [null,'east',{},['west'],['east','east'],['south','south'],['east','south','east'],[null],Array(1)])assert.throws(()=>Game.restore({...g.snapshot(),expansions}),/Invalid expansions/);
 const spoofed=Game.restore({...g.snapshot(),grid:{w:999,h:999}});assert.deepEqual(spoofed.grid,BASE_GRID);
});

test('save validation checks room, patient, staff, path and destination coordinates against the purchased terrain',()=>{
 const g=new Game({mode:'sandbox',seed:42}),p=g.spawnPatient('jitters'),s=ok(g.hire('otto')).staff;
 for(const mutate of [data=>data.patients[0].x=25,data=>data.patients[0].y=20,data=>data.patients[0].path=[{x:25,y:16}],data=>data.staff[0].x=25,data=>data.staff[0].path=[{x:12,y:20}],data=>data.staff[0].destination={x:25,y:16,roomId:null,arrival:'idle'}]){const saved=g.snapshot();mutate(saved);assert.throws(()=>Game.restore(saved));}
 for(const id of ['east','south']){const expanded=new Game({mode:'sandbox',seed:42});ok(expanded.expand(id));ok(furnishedRoom(expanded,'gp',rects[id]));const saved=expanded.snapshot();saved.expansions=[];assert.throws(()=>Game.restore(saved),/Invalid room/);}
 assert.equal(g.path(ENTRY,{x:NaN,y:1}),null);assert.equal(g.path({x:-1,y:16},ENTRY),null);assert.equal(g.path(ENTRY,{x:24,y:16}),null);assert.ok(p&&s);
});

test('saved room upgrades retain integer levels and reject fractional tiers before reaching the UI',()=>{
 const g=new Game({mode:'sandbox',seed:42}),room=ok(furnishedRoom(g,'gp',{x:2,y:2,w:5,h:4})).room;
 for(const level of [1,2,3]){room.level=level;assert.equal(Game.restore(g.snapshot()).room(room.id).level,level);}
 for(const level of [0,1.5,2.5,4]){const saved=g.snapshot();saved.rooms[0].level=level;assert.throws(()=>Game.restore(saved),/Invalid room/);}
});
