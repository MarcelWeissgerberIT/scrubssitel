import {furnishedRoom,hireAndPlace,deployStaff} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game} from '../src/game.js';
import {GUIDE} from '../src/tutorial.js';
const DT=.05,near=(a,b)=>Math.abs(a-b)<1e-7;
function tick(g,n=1){for(let i=0;i<n;i++)g.update(DT);}
function until(g,pred,seconds=120,check=()=>{}){for(let i=0;i<seconds/DT&&!pred();i++){check();tick(g);}assert.ok(pred(),'condition not reached before '+seconds+' seconds');}
function clinic({lounge=true}={}){
 const g=new Game({mode:'sandbox',seed:42});assert.equal(g.version,6,'This suite describes the new v5 contract.');
 for(const st of GUIDE.slice(0,6)){const r=st.room?furnishedRoom(g,st.room,st.rect):hireAndPlace(g,st.cast);assert.equal(r.error,undefined);}
 if(lounge)assert.ok(furnishedRoom(g,'lounge',{x:17,y:2,w:3,h:3}).room);
 g.openClinic();g.arrivalTimer=999999;g.nextEvent=999999;
 until(g,()=>g.staff.every(s=>g.staffReady(s)));
 for(const s of g.staff)s.nextBreakAt=g.clock+10000;
 return g;
}
const roomOf=(g,type)=>g.rooms.find(r=>r.type===type);
const doctor=g=>g.staff.find(s=>s.role==='doctor');
const request=(g,s)=>{s.fatigue=99;s.nextBreakAt=g.clock;s.breakPending=true;};
function reservationInvariant(g){const used=new Set();for(const s of g.staff){assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y));assert.ok(Array.isArray(s.path));if(s.breakRoomId===null){assert.equal(s.breakSeatIndex,null);continue;}const r=g.room(s.breakRoomId);assert.equal(r?.type,'lounge');assert.ok(Number.isInteger(s.breakSeatIndex)&&s.breakSeatIndex>=0);assert.ok(s.breakSeatIndex<Math.max(1,Math.floor((r.w-1)/.8)));const k=s.breakRoomId+':'+s.breakSeatIndex;assert.ok(!used.has(k),'two employees own '+k);used.add(k);}}
function travelNoRecovery(g,s){const before=s.fatigue,phase=s.state;tick(g);if(phase==='travelBreak'&&s.state==='travelBreak')assert.ok(s.fatigue>=before-1e-7,'fatigue recovered during travel');}

test('scheduled and fatigue-triggered breaks finish the current service and room exit before departure',()=>{
 const g=clinic(),r=roomOf(g,'gp'),s=doctor(g),p=g.spawnPatient('jitters');
 until(g,()=>p.stage==='diagnosis'&&p.state==='service');
 const point={x:s.x,y:s.y};request(g,s);g.spawnPatient('jitters');
 until(g,()=>r.patientId!==p.id,60,()=>{assert.ok(g.staffReady(s),'clinician left during committed patient cycle');assert.ok(near(s.x,point.x)&&near(s.y,point.y));});
 assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
 until(g,()=>s.state==='travelBreak');
 const calls=g.calls.filter(c=>c.roomId===r.id).length;
 for(let i=0;i<1200&&s.state!=='break';i++)travelNoRecovery(g,s);assert.equal(s.state,'break');
 until(g,()=>s.state==='travelWork',120,()=>{assert.equal(g.calls.filter(c=>c.roomId===r.id).length,calls);});
 until(g,()=>g.staffReady(s),60,()=>{assert.equal(g.calls.filter(c=>c.roomId===r.id).length,calls);});
 assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
});

test('a placed clinician is unavailable until physical arrival at the workstation',()=>{
 const g=clinic(),r=roomOf(g,'gp'),old=doctor(g);assert.equal(g.dismiss(old.id)?.error,undefined);
 const s=g.hireApplicant(g.applicants('doctor')[0].id).staff;deployStaff(g,s);
 assert.equal(s.state,'travelWork');assert.equal(g.staffReady(s),false);
 const p=g.spawnPatient('jitters');
 until(g,()=>g.staffReady(s),60,()=>{if(p.targetRoom===r.id)assert.notEqual(p.state,'called');});
 assert.ok(g.contains(r,s));assert.ok(s.path.length===0);assert.equal(s.state,'work');
});

test('two lounge places cannot be double reserved by three simultaneous break requests',()=>{
 const g=clinic(),lounge=roomOf(g,'lounge');assert.equal(Math.floor((lounge.w-1)/.8),2);
 for(const s of g.staff)request(g,s);
 for(let i=0;i<180/DT;i++){reservationInvariant(g);const before=g.staff.map(s=>({id:s.id,state:s.state,fatigue:s.fatigue}));tick(g);for(const prev of before){const s=g.staff.find(s=>s.id===prev.id);if(prev.state==='travelBreak'&&s.state==='travelBreak')assert.ok(s.fatigue>=prev.fatigue-1e-7);}}
 reservationInvariant(g);assert.ok(g.staff.every(s=>Number.isInteger(s.breakCount)&&s.breakCount>=1),'every employee must complete one break, including overflow fallback');
});

test('standing fallback starts recovery only after reaching its break destination',()=>{
 const g=clinic({lounge:false}),s=doctor(g);request(g,s);
 until(g,()=>s.state==='travelBreak');
 for(let i=0;i<1200&&s.state!=='break';i++)travelNoRecovery(g,s);assert.equal(s.state,'break');
 assert.equal(s.breakRoomId,null);assert.equal(s.breakSeatIndex,null);assert.equal(s.path.length,0);
 const fatigue=s.fatigue;tick(g,20);assert.ok(s.fatigue<fatigue);assert.equal(s.state,'break');
});

test('native v4 migration preserves a committed patient and ignores forged v5 employee fields',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-v4-in-service.json',import.meta.url),'utf8'));
 for(const s of source.staff)Object.assign(s,{x:NaN,y:-500,path:[{x:900,y:900}],state:'break',breakRoomId:99999,breakSeatIndex:0,breakPending:'forged',nextBreakAt:'forged',breakElapsed:99999,breakCount:-1});
 const original=JSON.parse(fs.readFileSync(new URL('./fixtures/legacy-v4-in-service.json',import.meta.url),'utf8'));
 const a=Game.restore(original),b=Game.restore(source);assert.equal(a.version,6);assert.deepEqual(a.snapshot(),b.snapshot());
 const s=doctor(a),r=roomOf(a,'gp'),id=r.patientId;assert.ok(gStaffReady(a,s));
 until(a,()=>r.patientId!==id,60,()=>assert.ok(gStaffReady(a,s),'migration interrupted existing service'));
 assert.equal(a.record(id).timeline.filter(e=>e.code==='diagnosed').length,1);
});
function gStaffReady(g,s){return g.staffReady(s);}

test('save and restore resume the exact next ticks in travelBreak, break, and travelWork',()=>{
 for(const phase of ['travelBreak','break','travelWork']){
  const a=clinic(),s=doctor(a);request(a,s);until(a,()=>s.state===phase,240);
  const b=Game.restore(a.snapshot());assert.deepEqual(a.snapshot(),b.snapshot());
  for(let i=0;i<600;i++){tick(a);tick(b);assert.deepEqual(a.snapshot(),b.snapshot());}
 }
});

test('malformed native v5 movement, timers and seat references are rejected',()=>{
 const g=clinic();request(g,doctor(g));until(g,()=>doctor(g).state==='break');const base=g.snapshot();
 const bad=[s=>s.x=Infinity,s=>s.y=-1,s=>s.path='bad',s=>s.path=[{x:NaN,y:1}],s=>s.state='workingOnMars',s=>s.breakRoomId=999999,s=>s.breakSeatIndex=999,s=>s.breakPending=1,s=>s.nextBreakAt=NaN,s=>s.breakElapsed=-1,s=>s.breakCount=-1,s=>s.breakCount=.5];
 for(const mutate of bad){const data=structuredClone(base),s=data.staff.find(s=>s.role==='doctor');mutate(s);assert.throws(()=>Game.restore(data),String(mutate));}
 const data=structuredClone(base),owner=data.staff.find(s=>s.role==='doctor'),other=data.staff.find(s=>s.role==='nurse');
 Object.assign(other,{state:owner.state,x:owner.x,y:owner.y,path:[],breakRoomId:owner.breakRoomId,breakSeatIndex:owner.breakSeatIndex,resting:owner.resting});
 assert.throws(()=>Game.restore(data),'duplicate lounge reservation');
});

for(const phase of ['called','inside'])test('a break request during '+phase+' preserves the booked appointment until exit',()=>{
 const g=clinic(),s=doctor(g),r=roomOf(g,'gp'),p=g.spawnPatient('jitters');until(g,()=>p.stage==='diagnosis'&&p.state===phase);g.requestBreak(s.id);until(g,()=>p.stage==='treatment'&&r.patientId===null,60,()=>assert.ok(g.staffReady(s)));until(g,()=>s.state==='travelBreak');assert.equal(g.record(p.id).timeline.filter(e=>e.code==='diagnosed').length,1);
});
test('research pauses during the researcher’s journeys and lounge break',()=>{
 const g=clinic();const r=furnishedRoom(g,'lab',{x:17,y:7,w:4,h:3}).room,s=hireAndPlace(g,'park').staff;assert.equal(s.roomId,r.id);g.startResearch('care');assert.equal(g.project.progress,0);until(g,()=>g.staffReady(s),60,()=>assert.equal(g.project.progress,0));tick(g,10);assert.ok(g.project.progress>0);g.requestBreak(s.id);tick(g);const progress=g.project.progress;until(g,()=>s.state==='break');tick(g,20);assert.equal(g.project.progress,progress);
});
test('a cleaner on a break does not provide invisible cleaning',()=>{
 const g=clinic(),s=hireAndPlace(g,'otto').staff;g.requestBreak(s.id);until(g,()=>s.state==='break');g.cleanliness=70;tick(g,20);assert.ok(g.cleanliness<70);until(g,()=>s.state==='cleaning');const before=g.cleanliness;tick(g,20);assert.ok(g.cleanliness>before);
});
test('workplace and path claims in a native save must agree with physical presence',()=>{
 const g=clinic();for(const mutate of [s=>s.x=12,s=>s.path=[{x:s.x,y:s.y}],s=>{s.state='travelWork';s.path=[];}]){const data=g.snapshot();mutate(data.staff.find(s=>s.role==='doctor'));assert.throws(()=>Game.restore(data));}
});

test('a cleaner reaches an exact standing break position even within the same grid cell',()=>{
 const g=clinic({lounge:false}),s=hireAndPlace(g,'otto').staff;const start={x:s.x,y:s.y};tick(g);assert.ok(Math.hypot(s.x-start.x,s.y-start.y)>0&&Math.hypot(s.x-start.x,s.y-start.y)<.15);g.requestBreak(s.id);until(g,()=>s.state==='break');assert.ok(near(s.x,s.destination.x)&&near(s.y,s.destination.y));assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('building over a future patrol stop redirects the cleaner around the new room',()=>{
 const g=clinic({lounge:false}),s=hireAndPlace(g,'otto').staff;until(g,()=>s.destination?.x===19&&s.destination?.y===8);const r=furnishedRoom(g,'toilet',{x:18,y:7,w:3,h:3}).room;assert.ok(r);assert.ok(!g.contains(r,s.destination));for(let i=0;i<600;i++){tick(g);assert.ok(!g.contains(r,s),'cleaner crossed the new room wall');}assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});
