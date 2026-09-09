import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {GUIDE} from '../src/tutorial.js';
import {faultFor} from '../src/maintenance.js';
import {updateStory} from '../src/story-events.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';
const DT=.05,ok=r=>{assert.equal(r?.error,undefined,r?.error);return r;};
function step(g){g.update(DT);assert.equal(g.over,false);assert.equal(g.event,null);}
function until(g,p,seconds=180){for(let i=0;i<seconds/DT&&!p();i++)step(g);assert.ok(p(),`timeout at ${g.clock}`);}
function fixture({janitor=false}={}){const g=new Game({mode:'sandbox',seed:2});for(const s of GUIDE.slice(0,6)){if(s.room)ok(furnishedRoom(g,s.room,s.rect));else ok(hireAndPlace(g,s.cast));}for(const id of ['waiting','lounge','toilet']){const s=GUIDE.find(s=>s.id===id);ok(furnishedRoom(g,s.room,s.rect));}if(janitor)ok(hireAndPlace(g,'otto'));until(g,()=>g.staff.filter(s=>s.role!=='janitor').every(s=>g.staffReady(s)),30);ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;g.maintenance.nextAt=g.maintenance.nextFaultAt=1e9;for(const s of g.staff)s.nextBreakAt=1e9;return g;}
function dirt(g,x=12,y=15){const d={id:g.maintenance.nextId++,x,y,roomId:null,severity:1};g.maintenance.dirt.push(d);return d;}
function fault(g,r){const f={id:g.maintenance.nextId++,roomId:r.id,furnitureId:r.furniture[0].id,since:g.clock};g.maintenance.faults.push(f);return f;}

test('a janitor must travel to local dirt and complete real work before cleanliness improves',()=>{
 const g=fixture(),d=dirt(g);g.cleanliness=70;const before=g.cleanliness;for(let i=0;i<40;i++)step(g);assert.ok(g.cleanliness<before);assert.equal(g.maintenance.dirt.length,1);
 const s=ok(hireAndPlace(g,'otto')).staff;until(g,()=>s.job?.id===d.id);assert.equal(s.job.phase,'travel');const start=g.cleanliness;
 until(g,()=>s.job?.phase==='work');assert.ok(Math.hypot(s.x-d.x,s.y-d.y)<.08);assert.ok(g.cleanliness<=start);
 const copy=Game.restore(g.snapshot());for(let i=0;i<100&&g.maintenance.dirt.length;i++){step(g);step(copy);assert.deepEqual(copy.snapshot(),g.snapshot());}
 assert.equal(g.maintenance.dirt.length,0);assert.ok(g.cleanliness>start+3);
});

test('two janitors cannot reserve one local job and staff on breaks perform no invisible repairs',()=>{
 const g=fixture({janitor:true}),first=g.staff.find(s=>s.role==='janitor');ok(hireAndPlace(g,'otto'));dirt(g,10,7);
 until(g,()=>g.staff.some(s=>s.job));assert.equal(g.staff.filter(s=>s.job).length,1);
 const worker=g.staff.find(s=>s.job),idle=g.staff.find(s=>s.role==='janitor'&&s!==worker);assert.equal(g.requestBreak(idle.id),true);until(g,()=>idle.state==='break');assert.equal(idle.job,null);
 assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('a machine fault lets a committed treatment finish, blocks the next booking, and ends only after a local repair',()=>{
 const g=fixture({janitor:true}),r=g.rooms.find(r=>r.type==='pharmacy'),p=g.spawnPatient('jitters');until(g,()=>p.state==='service'&&p.targetRoom===r.id);const f=fault(g,r);
 assert.equal(g.callNext(r),false);until(g,()=>p.stage==='exit');assert.ok(['cured','failed'].includes(g.record(p.id).outcome));assert.ok(faultFor(g,r));
 until(g,()=>g.staff.some(s=>s.job?.kind==='fault'&&s.job.phase==='work'));const worker=g.staff.find(s=>s.job?.kind==='fault');assert.ok(g.contains(r,worker));assert.equal(r.patientId,null);
 const copy=Game.restore(g.snapshot());for(let i=0;i<150&&faultFor(g,r);i++){step(g);step(copy);assert.deepEqual(copy.snapshot(),g.snapshot());}
 assert.equal(faultFor(g,r),null);assert.ok(r.condition>99);assert.equal(g.maintenance.faults.some(x=>x.id===f.id),false);
});

test('unplaced maintenance employees cannot clean or repair and invalid job imports fail safely',()=>{
 const g=fixture(),s=ok(g.hire('otto')).staff;dirt(g);const before=g.cleanliness;for(let i=0;i<80;i++)step(g);assert.equal(s.job,null);assert.equal(s.awaitingPlacement,true);assert.equal(g.maintenance.dirt.length,1);assert.ok(g.cleanliness<before);
 for(const mutate of [d=>d.maintenance.dirt[0].x=99,d=>d.maintenance.dirt[0].roomId=99999,d=>d.staff[0].job={kind:'dirt',id:d.maintenance.dirt[0].id,phase:'work',elapsed:1},d=>d.maintenance.faults=[{id:d.maintenance.nextId++,roomId:d.rooms[0].id,furnitureId:'missing',since:0}]]){const data=g.snapshot();mutate(data);assert.throws(()=>Game.restore(data));}
});

test('the inspection follow-up is delayed, persisted and charges or rewards exactly once',()=>{
 for(const clean of [true,false]){const g=fixture();g.cleanliness=clean?100:30;g.event='unannouncedInspection';ok(g.resolveEvent(0));assert.equal(g.story.queue[0].kind,'inspectionResult');for(let i=0;i<1799;i++)step(g);
  assert.equal(g.income,0);const before={income:g.income,expenses:g.expenses},copy=Game.restore(g.snapshot());for(let i=0;i<10;i++){step(g);step(copy);assert.deepEqual(copy.snapshot(),g.snapshot());}
  assert.equal(g.story.queue.length,0);assert.equal(g.story.completed.length,1);assert.equal(g.income-before.income,clean?500:0);assert.equal(g.expenses-before.expenses,clean?g.dailyCost():g.dailyCost()+350);
  const received=g.income;for(let i=0;i<100;i++)step(g);assert.equal(g.income,received);
 }
});

test('a recurring patient uses normal reception and treatment, keeps one chart, and rewards an actual outcome',()=>{
 const g=fixture();g.event='returningPatient';ok(g.resolveEvent(0));assert.equal(g.patients.length,0);until(g,()=>g.patients.some(p=>p.name==='Robin Again'));const p=g.patients.find(p=>p.name==='Robin Again');assert.equal(p.stage,'reception');assert.equal(p.registered,false);const copy=Game.restore(g.snapshot());
 for(let i=0;i<3000&&g.story.queue.length;i++){step(g);step(copy);assert.deepEqual(copy.snapshot(),g.snapshot());}
 assert.equal(g.story.queue.length,0);assert.equal(g.records.filter(r=>r.id===p.id).length,1);assert.equal(g.record(p.id).name,'Robin Again');assert.notEqual(g.record(p.id).dischargedAt,null);assert.equal(g.cash,50000+g.income-g.expenses-g.construction+g.financing);
});

test('old saves receive optional simulation defaults without moving existing people or changing accounts',()=>{
 const g=fixture(),p=g.spawnPatient('jitters');until(g,()=>p.state==='inside');const old=g.snapshot();delete old.operations;delete old.maintenance;delete old.story;for(const s of old.staff){delete s.job;delete s.training;delete s.trainingCourse;}for(const p of old.patients){delete p.needs;delete p.activity;delete p.needsNextAt;}
 const saved=structuredClone(old),copy=Game.restore(old);assert.deepEqual(old,saved);for(const key of ['cash','income','expenses','construction','financing','rooms','calls','records'])assert.deepEqual(copy[key],old[key]);
 for(const p of copy.patients){const original=old.patients.find(o=>o.id===p.id);for(const key of ['x','y','path','state','targetRoom','registered','queueOrder'])assert.deepEqual(p[key],original[key]);}
 assert.equal(copy.maintenance.dirt.length,0);assert.equal(copy.story.queue.length,0);assert.deepEqual(Game.restore(copy.snapshot()).snapshot(),copy.snapshot());
});

test('a faulty laboratory pauses research until a janitor physically repairs it beside the researcher',()=>{
 const g=fixture(),lab=ok(furnishedRoom(g,'lab',{x:17,y:7,w:4,h:3})).room,scientist=ok(hireAndPlace(g,'park')).staff;
 until(g,()=>g.staffReady(scientist));ok(g.startResearch('care'));for(let i=0;i<40;i++)step(g);const progress=g.project.progress;assert.ok(progress>0);fault(g,lab);
 for(let i=0;i<80;i++)step(g);assert.equal(g.project.progress,progress);
 const janitor=ok(hireAndPlace(g,'otto')).staff;until(g,()=>janitor.job?.kind==='fault'&&janitor.job.phase==='work');assert.ok(Math.hypot(janitor.x-scientist.x,janitor.y-scientist.y)>.6);assert.equal(g.project.progress,progress);
 until(g,()=>!faultFor(g,lab));for(let i=0;i<10;i++)step(g);assert.ok(g.project.progress>progress);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('construction over a distant dirt target releases its old job and keeps the changed floor saveable',()=>{
 const g=fixture({janitor:true}),d=dirt(g,14,7);until(g,()=>g.staff.some(s=>s.job?.id===d.id));const worker=g.staff.find(s=>s.job?.id===d.id);
 assert.ok(Math.hypot(worker.x-d.x,worker.y-d.y)>2);const r=ok(g.addRoom('toilet',{x:13,y:6,w:3,h:3})).room;
 assert.equal(worker.job,null);assert.ok(!g.maintenance.dirt.some(q=>q.id===d.id)||g.maintenance.dirt.find(q=>q.id===d.id).roomId===r.id);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 ok(g.autoFurnish(r.id));ok(g.finishRoom(r.id));assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());for(let i=0;i<600;i++)step(g);assert.equal(g.contains(r,worker)&&worker.job?.id===d.id,false);
});

test('long-running story history retains the latest 100 completions and restores without losing pending consequences or reusing ids',()=>{
 const g=new Game({mode:'sandbox',seed:42}),pending={id:g.story.nextId++,kind:'mafiaFavor',at:1000,patientId:null};g.story.queue.push(pending);
 for(let i=0;i<130;i++){
  g.story.queue.push({id:g.story.nextId++,kind:'inspectionResult',at:g.clock,patientId:null});updateStory(g);
  assert.ok(g.story.completed.length<=100);if([98,99,100,129].includes(i))assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 }
 assert.deepEqual(g.story.completed,Array.from({length:100},(_,i)=>i+32));assert.equal(g.story.nextId,132);assert.deepEqual(g.story.queue,[pending]);
 const loaded=Game.restore(g.snapshot());for(const state of [g,loaded]){state.story.queue.push({id:state.story.nextId++,kind:'inspectionResult',at:state.clock,patientId:null});updateStory(state);}
 assert.deepEqual(loaded.snapshot(),g.snapshot());assert.equal(g.story.completed[0],33);assert.equal(g.story.completed.at(-1),132);assert.equal(g.story.nextId,133);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});
