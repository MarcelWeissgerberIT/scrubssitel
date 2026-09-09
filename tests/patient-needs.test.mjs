import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {GUIDE} from '../src/tutorial.js';
import {FURNITURE,furniturePorts} from '../src/objects.js';
import {segmentBlocked,insidePath} from '../src/layout.js';
import {NEED_STATES,needActivity} from '../src/patient-needs.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';
const DT=.05,ok=r=>{assert.equal(r?.error,undefined,r?.error);return r;};
function step(g){g.update(DT);assert.equal(g.event,null);assert.equal(g.over,false);}
function until(g,p,seconds=120){for(let i=0;i<seconds/DT&&!p();i++)step(g);assert.ok(p(),`timeout ${g.clock}: ${g.patients.map(p=>p.state+'/'+p.activity?.phase)}`);}
function fixture(){const g=new Game({mode:'sandbox',seed:42});for(const s of GUIDE.slice(0,6)){if(s.room)ok(furnishedRoom(g,s.room,s.rect));else ok(hireAndPlace(g,s.cast));}for(const id of ['waiting','toilet']){const s=GUIDE.find(s=>s.id===id);ok(furnishedRoom(g,s.room,s.rect));}until(g,()=>g.staff.every(s=>g.staffReady(s)),30);ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;g.maintenance.nextAt=g.maintenance.nextFaultAt=1e9;for(const s of g.staff)s.nextBreakAt=1e9;ok(g.dismiss(g.rooms.find(r=>r.type==='gp').staffId));return g;}
function visitor(g){const p=g.spawnPatient('jitters');p.needs={hunger:0,thirst:0,bladder:90,boredom:0};p.needsNextAt=0;return p;}
function addLeisure(g,kind){const r=g.rooms.find(r=>r.type==='waiting');ok(g.beginRoomEdit(r.id));let found=false;for(let rotation=0;rotation<4&&!found;rotation++)for(let y=.25;y<r.h&&!found;y+=.25)for(let x=.25;x<r.w&&!found;x+=.25)if(!g.furniturePlacement(r.id,{id:'candidate',kind,x,y,rotation})&&(()=>{const draft={...r,furniture:[...r.furniture,{id:'candidate',kind,x,y,rotation}]},port=furniturePorts(draft).find(p=>p.furnitureId==='candidate');return port&&insidePath(draft,g.door(draft),port)!==null;})()){ok(g.addFurniture(r.id,kind,{x,y,rotation}));found=true;}assert.ok(found);ok(g.finishRoom(r.id));return r;}

test('a WC visit walks through its own door, closes it, uses the toilet, washes and returns to the reserved seat',()=>{
 const g=fixture(),p=visitor(g);until(g,()=>!!p.activity);const seat=[p.seatRoom,p.seatIndex],phases=new Set(),copies=new Map();let last={x:p.x,y:p.y};
 for(let i=0;i<2000&&p.activity;i++){
  const a=p.activity,phase=a.phase,r=g.room(a.roomId);phases.add(phase);if(!copies.has(phase)){const copy=Game.restore(g.snapshot());assert.deepEqual(copy.snapshot(),g.snapshot());copies.set(phase,copy);}
  const visual=needActivity(g,a.roomId,a.furnitureId);if(phase==='use')assert.equal(visual.doorOpen,0);if(['enter','exit'].includes(phase))assert.equal(visual.doorOpen,1);
  const options=['enter','exit'].includes(phase)?{doorFurnitureId:a.furnitureId}:{};step(g);
  assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<=DT*3+1e-7);if(g.contains(r,last)&&g.contains(r,p))assert.equal(segmentBlocked(r,last,p,options),false);
  assert.deepEqual([p.seatRoom,p.seatIndex],seat);last={x:p.x,y:p.y};
 }
 assert.equal(p.state,'seated');assert.ok(p.needs.bladder<10);assert.deepEqual([...phases],['travel','open','enter','close','use','exitOpen','exit','exitClose','washTravel','wash','return']);
 for(const copy of copies.values()){const cp=copy.patients.find(q=>q.id===p.id);until(copy,()=>!cp.activity);assert.equal(cp.state,'seated');assert.ok(cp.needs.bladder<10);}
});

test('clinical FIFO waits for safe WC exit and handwashing instead of interrupting the cubicle or calling a younger patient',()=>{
 const g=fixture(),p=visitor(g);until(g,()=>p.activity?.phase==='use');const younger=visitor(g);younger.needs.bladder=0;ok(hireAndPlace(g,'milo'));
 const gp=g.rooms.find(r=>r.type==='gp');until(g,()=>g.staffReady(g.staff.find(s=>s.id===gp.staffId)));assert.equal(g.callNext(gp),false);assert.equal(gp.patientId,null);assert.equal(p.activity.abort,true);
 const phases=new Set();for(let i=0;i<1000&&p.state!=='called';i++){phases.add(p.activity?.phase);step(g);}assert.ok(phases.has('wash'));assert.equal(p.state,'called');assert.equal(gp.patientId,p.id);assert.equal(p.activity,null);assert.equal(g.calls.filter(c=>c.patientId===younger.id).length,0);assert.ok(p.needs.bladder<10);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

for(const cause of ['renovation','abandonment'])test(`WC ${cause} finishes the protected exit without trapping the patient or leaving reservations`,()=>{
 const g=fixture(),p=visitor(g);until(g,()=>p.activity?.phase==='use');const room=g.room(p.activity.roomId);
 if(cause==='renovation'){assert.equal(g.beginRoomEdit(room.id).pending,true);assert.equal(room.editing,false);}else p.patience=0;
 for(let i=0;i<1200&&(cause==='renovation'?!room.editing:g.record(p.id).dischargedAt===null);i++){step(g);if(i%10===0)assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());}
 assert.equal(p.activity,null);if(cause==='renovation'){assert.equal(room.editing,true);assert.equal(g.contains(room,p),false);}else{assert.equal(g.record(p.id).outcome,'left');assert.notEqual(g.record(p.id).dischargedAt,null);}
});

test('patients never reserve the same WC or basin twice and malformed trips are rejected',()=>{
 const g=fixture(),p=visitor(g),q=visitor(g);until(g,()=>!!p.activity||!!q.activity);assert.equal(g.patients.filter(p=>p.activity?.kind==='toilet').length,1);
 const active=g.patients.find(p=>p.activity);for(const mutate of [s=>s.patients.find(p=>p.id===active.id).needs.bladder=-1,s=>s.patients.find(p=>p.id===active.id).activity.sinkId='missing',s=>s.patients.find(p=>p.id===active.id).activity.furnitureId='missing',s=>s.patients.find(p=>p.id===active.id).path=[{x:0,y:0}]]){const snapshot=g.snapshot();mutate(snapshot);assert.throws(()=>Game.restore(snapshot));}
});

for(const kind of ['play','read'])test(`${kind} is a real optional furniture visit that relieves boredom and preserves a waiting seat`,()=>{
 const g=fixture();addLeisure(g,kind==='play'?'toys':'books');const p=visitor(g);p.needs.bladder=0;p.needs.boredom=75;p.age=kind==='play'?8:40;p.child=kind==='play';Object.assign(g.record(p.id),{age:p.age,birthDate:`${2026-p.age}-01-01`});
 until(g,()=>p.activity?.kind===kind);const seat=[p.seatRoom,p.seatIndex],start=p.needs.boredom;until(g,()=>p.activity?.phase==='use');assert.ok(p.needs.boredom>=start);
 const copy=Game.restore(g.snapshot());for(let i=0;i<500&&p.activity;i++){step(g);step(copy);assert.deepEqual(copy.snapshot(),g.snapshot());}assert.equal(p.state,'seated');assert.ok(p.needs.boredom<15);assert.deepEqual([p.seatRoom,p.seatIndex],seat);
});

test('a drink relieves thirst only after a completed paid purchase and a restored receipt cannot feed twice',()=>{
 const g=fixture();addLeisure(g,'drink-machine');const p=visitor(g);p.needs={hunger:0,thirst:90,bladder:0,boredom:0};p.amenityNextAt=0;assert.notEqual(p.id%4,0);
 until(g,()=>p.state==='amenityBuy');const before=p.needs.thirst,income=g.income;for(let i=0;i<20;i++)step(g);assert.ok(p.needs.thirst>=before);assert.equal(g.income,income);
 until(g,()=>p.amenityPurchased);assert.ok(p.needs.thirst<30);assert.equal(g.income,income+6);const copy=Game.restore(g.snapshot()),thirst=p.needs.thirst;
 for(let i=0;i<200;i++){step(g);step(copy);assert.deepEqual(copy.snapshot(),g.snapshot());}assert.ok(p.needs.thirst>=thirst);assert.equal(g.amenitySales.count,1);assert.equal(g.income,income+6);
});
