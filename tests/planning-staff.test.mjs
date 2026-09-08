import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {Renderer} from '../src/renderer.js';
import {innerDoor,workPoint,furnitureBlocked} from '../src/layout.js';
import {furnishedRoom,deployStaff,hireAndPlace} from './helpers.mjs';

const DT=.05,ok=r=>{assert.equal(r?.error,undefined,r?.error);return r;},xy=p=>({x:p.x,y:p.y});
const roomOf=(g,type)=>g.rooms.find(r=>r.type===type),clinical=g=>g.staff.filter(s=>s.role!=='janitor');
function setup({deploy=true,research=false}={}){
 const g=new Game({mode:'sandbox',seed:42});
 for(const [type,rect] of [['reception',{x:15,y:12,w:5,h:4}],['gp',{x:2,y:2,w:5,h:4}],['pharmacy',{x:8,y:2,w:5,h:4}],['surgery',{x:17,y:2,w:5,h:4}],['lounge',{x:2,y:9,w:5,h:4}]])ok(furnishedRoom(g,type,rect));
 const staff=['rosa','milo','bea','nia','otto'].map(cast=>ok(g.hire(cast)).staff);
 if(deploy)for(const s of staff)ok(deployStaff(g,s));
 if(research){ok(furnishedRoom(g,'lab',{x:8,y:9,w:5,h:4}));ok(hireAndPlace(g,'park'));ok(g.startResearch('care'));}
 return g;
}
function tick(g){const before=[...g.staff,...g.patients].map(entity=>({entity,...xy(entity)}));g.update(DT);for(const from of before){const to=from.entity;assert.ok(Math.hypot(to.x-from.x,to.y-from.y)<=(to.role?2.8:2.5)*DT+1e-7,'planning movement must remain physical');for(const r of g.rooms)assert.equal(furnitureBlocked(r,from,to),false,`${to.name} crossed furniture`);}}
function until(g,predicate,seconds=60){for(let i=0;i<seconds/DT&&!predicate();i++)tick(g);assert.ok(predicate(),`timed out: ${g.staff.map(s=>`${s.role}:${s.state}`).join(', ')}`);}
// Planning permits travel, patrol targets and door animation. Every other saved
// field must stay identical, including records, RNG and every financial baseline.
function frozenSimulation(g){const value=g.snapshot();for(const s of value.staff)for(const key of ['x','y','path','state','destination','patrolIndex'])delete s[key];for(const r of value.rooms)delete r.doorOpen;return value;}
const breakValues=s=>({fatigue:s.fatigue,nextBreakAt:s.nextBreakAt,breakElapsed:s.breakElapsed,breakCount:s.breakCount});

test('all five professions remain individually waiting while the unopened clinic is being planned',()=>{
 const g=setup({deploy:false}),before=g.snapshot();assert.equal(new Set(g.staff.map(s=>JSON.stringify(xy(s)))).size,5);
 for(let i=0;i<4000;i++)tick(g);
 assert.deepEqual(g.snapshot(),before);
 for(const s of g.staff){assert.equal(s.awaitingPlacement,true);assert.equal(s.state,'idle');assert.equal(s.roomId,null);assert.equal(g.staffReady(s),false);}
});

test('placed staff reach their workplace and the receptionist is prepared to sit before opening',()=>{
 const g=setup(),starts=new Map(g.staff.map(s=>[s.id,xy(s)]));
 assert.ok(clinical(g).every(s=>s.state==='travelWork'&&!g.staffReady(s)));
 tick(g);assert.ok(clinical(g).some(s=>Math.hypot(s.x-starts.get(s.id).x,s.y-starts.get(s.id).y)>0));
 until(g,()=>clinical(g).every(s=>g.staffReady(s)));
 for(const s of clinical(g)){assert.equal(s.state,'work');assert.deepEqual(xy(s),xy(workPoint(g.room(s.roomId))));}
 const receptionist=g.staff.find(s=>s.role==='receptionist'),actor=Renderer.prototype.staffActor.call({snapshotGame:null,previousStaff:new Map()},receptionist,g,0);
 assert.equal(actor.hasSeat,true);assert.equal(actor.state,'preparing');assert.equal(actor.lookYaw,workPoint(g.room(receptionist.roomId)).lookYaw);
 const janitor=g.staff.find(s=>s.role==='janitor');assert.equal(janitor.state,'cleaning');assert.equal(janitor.roomId,null);assert.notDeepEqual(xy(janitor),starts.get(janitor.id));
 assert.equal(g.admissionsOpen,false);assert.equal(g.clock,0);assert.equal(g.calendar,0);
});

test('long planning walks and patrols cannot advance money, research, patients, RNG, fatigue or break timers',()=>{
 const g=setup({research:true});g.arrivalTimer=0;g.nextEvent=0;g.spawnPatient('jitters');
 const doctor=g.staff.find(s=>s.role==='doctor');doctor.fatigue=90;doctor.nextBreakAt=0;doctor.breakPending=true;
 const before=frozenSimulation(g);for(let i=0;i<8000;i++)tick(g);
 assert.deepEqual(frozenSimulation(g),before);
 assert.ok(clinical(g).every(s=>g.staffReady(s)),'even an overdue employee first completes their placement route during setup');
 assert.equal(g.project.progress,0);assert.equal(g.patients.length,1);assert.equal(g.patients[0].state,'waiting');assert.equal(g.event,null);
});

test('saving in the middle of a pre-opening journey resumes every next step deterministically',()=>{
 const g=setup({research:true});tick(g);assert.ok(clinical(g).some(s=>s.state==='travelWork'));
 const before=frozenSimulation(g),restored=Game.restore(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());
 for(let i=0;i<600;i++){tick(g);tick(restored);assert.deepEqual(restored.snapshot(),g.snapshot(),`planning diverged on step ${i}`);}
 assert.ok(clinical(g).every(s=>g.staffReady(s)));assert.deepEqual(frozenSimulation(g),before);
});

test('repositioning prepared staff before opening follows the newly assigned workplace without changing business time',()=>{
 const g=setup();until(g,()=>clinical(g).every(s=>g.staffReady(s)));
 const s=g.staff.find(s=>s.role==='doctor'),old=g.room(s.roomId),next=ok(furnishedRoom(g,'gp',{x:8,y:9,w:5,h:4})).room;
 const cash=g.cash;ok(g.placeStaff(s.id,next.id));assert.deepEqual(xy(s),innerDoor(next));assert.equal(s.state,'travelWork');assert.equal(old.staffId,null);
 const before=frozenSimulation(g);until(g,()=>g.staffReady(s));assert.deepEqual(xy(s),xy(workPoint(next)));assert.equal(g.cash,cash);assert.deepEqual(frozenSimulation(g),before);
 assert.equal(old.staffId,null);assert.equal(next.staffId,s.id);
});

test('opening starts ordinary patient care, research and breaks after staff have prepared their workplaces',()=>{
 const g=setup({research:true});until(g,()=>clinical(g).every(s=>g.staffReady(s)));
 ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;const p=g.spawnPatient('jitters'),s=g.staff.find(s=>s.roomId===roomOf(g,'gp').id);
 until(g,()=>p.state==='service'&&p.targetRoom===s.roomId);assert.ok(g.clock>0&&g.calendar>0);assert.ok(g.project.progress>0);assert.ok(s.fatigue>0);
 assert.equal(g.requestBreak(s.id),true);until(g,()=>s.state==='break');assert.ok(g.record(p.id).timeline.some(e=>e.code==='diagnosed'));
 until(g,()=>s.breakCount===1&&g.staffReady(s));until(g,()=>g.record(p.id).dischargedAt!==null);
 assert.ok(['cured','failed'].includes(g.record(p.id).outcome));assert.ok(g.income>0);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('an unopened restored clinic does not recover fatigue or advance an existing lounge break',()=>{
 const g=setup();until(g,()=>clinical(g).every(s=>g.staffReady(s)));ok(g.openClinic());g.arrivalTimer=g.nextEvent=1e9;
 const doctor=g.staff.find(s=>s.role==='doctor');doctor.fatigue=65;g.requestBreak(doctor.id);until(g,()=>doctor.state==='break');
 const data=g.snapshot();data.admissionsOpen=false;const restored=Game.restore(data),s=restored.staff.find(s=>s.id===doctor.id),before=breakValues(s);
 for(let i=0;i<500;i++)tick(restored);assert.deepEqual(breakValues(s),before);assert.equal(s.state,'break');assert.equal(restored.clock,data.clock);assert.equal(restored.calendar,data.calendar);
});

test('renovation before opening evacuates placed staff, unlocks editing and returns them after finishing',()=>{
 const g=setup();until(g,()=>clinical(g).every(s=>g.staffReady(s)));const r=roomOf(g,'gp'),s=g.staff.find(s=>s.roomId===r.id),before=breakValues(s),cash=g.cash;
 assert.equal(ok(g.beginRoomEdit(r.id)).pending,true);until(g,()=>r.editing);
 assert.equal(g.contains(r,s),false);assert.equal(g.roomReady(r),false);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 ok(g.finishRoom(r.id));until(g,()=>g.staffReady(s));assert.equal(s.roomId,r.id);assert.equal(r.staffId,s.id);
 assert.deepEqual(breakValues(s),before);assert.equal(g.cash,cash);assert.equal(g.clock,0);assert.equal(g.calendar,0);
});
