import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {defaultOperations,setOperations,operationStatus,initTraining,trainingEffects,trainingQuote,startTraining,updateTraining,migrateOperations,validateOperations,effectiveSkill} from '../src/operations.js';
import {renderOperationsPanel,renderStaffTraining} from '../src/operations-panel.js';
import {GUIDE} from '../src/tutorial.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
function employee(role='doctor'){const g=new Game({mode:'sandbox',seed:8}),s=ok(g.hireApplicant(g.applicants(role)[0].id)).staff;migrateOperations(g);g.admissionsOpen=true;return {g,s};}
const helpers=lang=>({copy:(en,de)=>lang==='de'?de:en,label:o=>o[lang],escape:String,money:value=>`$${value}`,btn:(action,body,cls,attrs='')=>`<button data-action="${action}" class="${cls}" ${attrs}>${body}</button>`,panelHeader:title=>`<h2>${title}</h2>`});

test('opening windows repeat every 120 seconds, support overnight work and default to always open',()=>{
 const g=new Game();assert.deepEqual(g.operations||defaultOperations(),defaultOperations());for(const clock of [0,39.999,40,89.999,90,119.99,120,160]){g.clock=clock;assert.equal(operationStatus(g).open,true);}
 ok(setOperations(g,{hours:{enabled:true,open:8,close:18},admissionLimit:4}));for(const [clock,open] of [[0,false],[39.999,false],[40,true],[89.999,true],[90,false],[160,true]]){g.clock=clock;assert.equal(operationStatus(g).open,open);assert.equal(operationStatus(g).admissionLimit,4);}
 ok(setOperations(g,{hours:{open:22,close:6}}));for(const [clock,open] of [[0,true],[29.999,true],[30,false],[109.99,false],[110,true]]){g.clock=clock;assert.equal(operationStatus(g).open,open);}
});

test('invalid operations settings leave accounts, patients and the previous schedule unchanged',()=>{
 const g=new Game();migrateOperations(g);for(const change of [{admissionLimit:0},{admissionLimit:13},{admissionLimit:1.5},{hours:{open:8,close:8}},{hours:{enabled:'yes'}},{hours:{open:-1}},{hours:{close:24}}]){const before=g.snapshot();assert.equal(setOperations(g,change).error,'operationsInvalid');assert.deepEqual(g.snapshot(),before);}
 const before=g.snapshot();ok(setOperations(g,{admissionLimit:1}));assert.equal(g.cash,before.cash);assert.deepEqual(g.patients,before.patients);
});

test('training is paid once, waits for safe off-work time, and gives capped effects without changing applicant identity',()=>{
 const {g,s}=employee(),identity={skill:s.skill,wage:s.wage,fatigueRate:s.fatigueRate,applicantId:s.applicantId},before={cash:g.cash,expenses:g.expenses},quote=trainingQuote(g,s.id,'expertise');
 ok(startTraining(g,s.id,'expertise'));assert.equal(g.cash,before.cash-quote.cost);assert.equal(g.expenses,before.expenses+quote.cost);const paid=g.snapshot();assert.equal(startTraining(g,s.id,'expertise').error,'trainingBusy');assert.deepEqual(g.snapshot(),paid);
 s.job={roomId:1};assert.equal(updateTraining(g,s,60),false);assert.equal(s.trainingCourse.progress,0);s.job=null;
 s.awaitingPlacement=false;s.state='work';assert.equal(updateTraining(g,s,60),false);assert.equal(s.trainingCourse.progress,0);
 s.state='break';assert.equal(updateTraining(g,s,20),false);assert.equal(s.trainingCourse.progress,20);assert.equal(updateTraining(g,s,25),true);assert.equal(s.trainingCourse,null);assert.equal(s.training.expertise,1);assert.equal(effectiveSkill(s),s.skill+.08);
 ok(startTraining(g,s.id,'expertise'));assert.equal(updateTraining(g,s,60),true);assert.equal(s.training.expertise,2);assert.equal(startTraining(g,s.id,'expertise').error,'trainingMax');
 for(const track of ['stamina','care'])for(let i=0;i<2;i++){ok(startTraining(g,s.id,track));assert.equal(updateTraining(g,s,90),true);}
 assert.deepEqual(trainingEffects(s),{skillBonus:.16,fatigueMultiplier:.76,successBonus:.06});assert.deepEqual({skill:s.skill,wage:s.wage,fatigueRate:s.fatigueRate,applicantId:s.applicantId},identity);validateOperations(g);
});

test('unplaced staff may study at the entrance but paused setup and unsuitable professions reject courses',()=>{
 const {g,s}=employee('janitor'),before=g.cash;assert.equal(startTraining(g,s.id,'care').error,'trainingInvalid');assert.equal(g.cash,before);
 g.admissionsOpen=false;assert.equal(startTraining(g,s.id,'stamina').error,'trainingUnavailable');g.admissionsOpen=true;ok(startTraining(g,s.id,'stamina'));assert.equal(s.awaitingPlacement,true);assert.equal(updateTraining(g,s,45),true);assert.equal(s.training.stamina,1);
});

test('legacy operations and training migrate once; malformed or partial saved progress is rejected',()=>{
 const {g,s}=employee();delete g.operations;delete s.training;delete s.trainingCourse;const identity=s.applicantId;migrateOperations(g);validateOperations(g);assert.equal(s.applicantId,identity);assert.deepEqual(g.operations,defaultOperations());
 ok(startTraining(g,s.id,'care'));updateTraining(g,s,12);const state=g.snapshot();migrateOperations(g);assert.deepEqual(g.snapshot(),state);validateOperations(g);
 for(const mutate of [x=>delete x.operations,x=>x.operations.admissionLimit=100,x=>delete x.staff[0].trainingCourse,x=>x.staff[0].training.expertise=3,x=>x.staff[0].trainingCourse.progress=60,x=>x.staff[0].trainingCourse.track='unknown',x=>x.staff[0].trainingCourse.level=2]){const bad=structuredClone(state);mutate(bad);assert.throws(()=>validateOperations(bad));}
});

test('operations and training controls expose matching bilingual fields, costs and disabled states',()=>{
 for(const lang of ['en','de']){const {g,s}=employee(),h=helpers(lang),html=renderOperationsPanel(g,{helpers:h});for(const id of ['operations-limit','operations-scheduled','operations-open','operations-close'])assert.match(html,new RegExp(`id="${id}"`));assert.match(html,/data-action="operations-apply"/);assert.match(html,/120/);
  const training=renderStaffTraining(g,s,h);assert.equal((training.match(/data-action="staff-train"/g)||[]).length,3);assert.match(training,/data-track="care"/);assert.match(training,new RegExp(`data-training-staff="${s.id}"`));g.cash=0;assert.equal((renderStaffTraining(g,s,h).match(/ disabled/g)||[]).length,3);
  const janitor=employee('janitor');janitor.s.training.expertise=1;assert.match(renderStaffTraining(janitor.g,janitor.s,h),/1\/4/);
 }
});

function operatingClinic(){
 const g=new Game({mode:'sandbox',seed:42});for(const step of GUIDE.slice(0,6)){if(step.room)ok(furnishedRoom(g,step.room,step.rect));else if(step.cast)ok(hireAndPlace(g,step.cast));}
 for(const id of ['waiting','lounge']){const step=GUIDE.find(s=>s.id===id);ok(furnishedRoom(g,step.room,step.rect));}
 for(let i=0;i<600&&!g.staff.every(s=>g.staffReady(s));i++)g.update(.05);ok(g.openClinic());g.nextEvent=1e9;g.maintenance.nextAt=g.maintenance.nextFaultAt=1e9;for(const s of g.staff)s.nextBreakAt=1e9;return g;
}
function until(g,predicate,seconds=180){for(let i=0;i<seconds/.05&&!predicate();i++){g.update(.05);assert.equal(g.over,false);assert.equal(g.event,null);}assert.ok(predicate(),`timeout at ${g.clock}`);}

test('real opening hours stop only admissions, preserve current care and bills, and resume without a burst',()=>{
 const g=operatingClinic();ok(g.setOperations({admissionLimit:1,hours:{enabled:true,open:0,close:6}}));g.arrivalTimer=0;
 until(g,()=>g.records.length===1);const p=g.patients[0],id=p.id;assert.equal(g.admitPatient('jitters'),null);
 until(g,()=>g.clock>=30);assert.equal(operationStatus(g).open,false);const count=g.patientSerial;assert.ok(g.calendar>=30);assert.ok(g.expenses>0);assert.equal(g.demandStatus().reason,'closed');
 until(g,()=>g.record(id).dischargedAt!==null);assert.ok(g.record(id).timeline.some(e=>e.code==='diagnosed'));assert.equal(g.patientSerial,count);
 until(g,()=>g.clock>=119);assert.equal(g.patientSerial,count);const saved=Game.restore(g.snapshot());assert.deepEqual(saved.snapshot(),g.snapshot());
 until(g,()=>g.patientSerial>count,35);assert.equal(g.patientSerial,count+1);assert.ok(g.demandStatus().active<=1);
});

test('a real booked visit finishes before training, and a saved course completes once before staff return',()=>{
 const g=operatingClinic();g.arrivalTimer=1e9;const p=g.spawnPatient('jitters'),doctor=g.staff.find(s=>s.role==='doctor'),room=g.room(doctor.roomId);
 until(g,()=>p.stage==='diagnosis'&&p.state==='service');const cash=g.cash,cost=trainingQuote(g,doctor.id,'expertise').cost;
 ok(g.startTraining(doctor.id,'expertise'));assert.equal(g.cash,cash-cost);assert.equal(doctor.breakPending,true);assert.equal(g.canPickUpStaff(doctor.id)!==null,true);
 while(room.patientId===p.id){assert.equal(doctor.trainingCourse.progress,0);assert.equal(g.staffReady(doctor),true);g.update(.05);}
 assert.ok(g.record(p.id).timeline.some(e=>e.code==='diagnosed'));until(g,()=>doctor.state==='break'&&doctor.trainingCourse.progress>=5);
 assert.equal(g.canPickUpStaff(doctor.id),'trainingBusy');const beforeDrop=g.snapshot();assert.equal(g.placeStaff(doctor.id,room.id).error,'trainingBusy');assert.deepEqual(g.snapshot(),beforeDrop);
 const copy=Game.restore(g.snapshot());assert.deepEqual(copy.snapshot(),g.snapshot());
 for(let i=0;i<2400&&(doctor.trainingCourse||!g.staffReady(doctor));i++){g.update(.05);copy.update(.05);if(i%25===0)assert.deepEqual(copy.snapshot(),g.snapshot());}
 assert.equal(doctor.trainingCourse,null);assert.equal(doctor.training.expertise,1);assert.equal(g.staffReady(doctor),true);assert.deepEqual(copy.snapshot(),g.snapshot());
 const level=doctor.training.expertise,expense=g.expenses;for(let i=0;i<800;i++)g.update(.05);assert.equal(doctor.training.expertise,level);assert.ok(g.expenses>=expense);
 const next=g.spawnPatient('jitters');until(g,()=>g.record(next.id).timeline.some(e=>e.code==='diagnosed'));assert.equal(room.staffId,doctor.id);
});

test('unplaced staff finish all permitted training levels through real updates and retain them on reload',()=>{
 const g=operatingClinic();g.arrivalTimer=1e9;const s=ok(g.hireApplicant(g.applicants('doctor')[0].id)).staff,origin={x:s.x,y:s.y},baseSkill=s.skill;
 for(const track of ['expertise','stamina','care'])for(let level=1;level<=2;level++){
  ok(g.startTraining(s.id,track));until(g,()=>s.trainingCourse===null,100);assert.equal(s.training[track],level);assert.deepEqual({x:s.x,y:s.y},origin);assert.equal(s.awaitingPlacement,true);
 }
 assert.equal(s.skill,baseSkill);assert.equal(effectiveSkill(s),baseSkill+.16);assert.deepEqual(trainingEffects(s),{skillBonus:.16,fatigueMultiplier:.76,successBonus:.06});assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 const old=g.snapshot();delete old.operations;for(const person of old.staff){delete person.training;delete person.trainingCourse;}const migrated=Game.restore(old);assert.deepEqual(migrated.operations,defaultOperations());assert.ok(migrated.staff.every(person=>person.trainingCourse===null&&Object.values(person.training).every(level=>level===0)));
});

test('completed courses improve actual treatment progress, fatigue and success in the same appointment',()=>{
 const baseline=operatingClinic();baseline.arrivalTimer=1e9;const patient=baseline.spawnPatient('jitters'),doctor=baseline.staff.find(s=>s.role==='doctor');
 until(baseline,()=>patient.stage==='diagnosis'&&patient.state==='service');const trained=Game.restore(baseline.snapshot()),learner=trained.staff.find(s=>s.id===doctor.id);learner.training={expertise:2,stamina:2,care:2};
 const fatigue=doctor.fatigue,room=baseline.room(doctor.roomId),betterRoom=trained.room(doctor.roomId),success=baseline.success(room);baseline.update(.05);trained.update(.05);
 assert.ok(betterRoom.progress>room.progress,'expertise improves actual appointment work');assert.ok(learner.fatigue-fatigue<doctor.fatigue-fatigue,'stamina reduces actual busy fatigue');assert.ok(trained.success(betterRoom)>success+.059,'care improves actual treatment success');
 assert.deepEqual({skill:learner.skill,wage:learner.wage,applicantId:learner.applicantId},{skill:doctor.skill,wage:doctor.wage,applicantId:doctor.applicantId});
});

test('renovating the lounge relocates a studying employee safely and their paid course still completes',()=>{
 const g=operatingClinic();g.arrivalTimer=1e9;const doctor=g.staff.find(s=>s.role==='doctor'),lounge=g.rooms.find(r=>r.type==='lounge');ok(g.startTraining(doctor.id,'expertise'));
 until(g,()=>doctor.state==='break'&&doctor.trainingCourse.progress>=5);const paidProgress=doctor.trainingCourse.progress,assignment=doctor.roomId;assert.equal(ok(g.beginRoomEdit(lounge.id)).pending,true);
 until(g,()=>lounge.editing);assert.equal(g.contains(lounge,doctor),false);const restored=Game.restore(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());
 until(g,()=>doctor.trainingCourse===null&&g.staffReady(doctor),120);assert.ok(paidProgress>0);assert.equal(doctor.training.expertise,1);assert.equal(doctor.roomId,assignment);assert.equal(lounge.editing,true);
});
