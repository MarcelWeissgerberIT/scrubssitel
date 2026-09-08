import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {GUIDE} from '../src/tutorial.js';
import {EVENTS} from '../src/content.js';
function tick(g,n){for(let i=0;i<n*20;i++){if(g.event){const ev=EVENTS.find(e=>e.id===g.event);g.resolveEvent(Math.max(0,ev.choices.findIndex(c=>c.cost===0&&c.effect!=='mafiaLoan')));}g.update(.05);}}
function setup(){const g=new Game({seed:42});for(const s of GUIDE.slice(0,7)){if(s.room)assert.ok(g.addRoom(s.room,s.rect).room);if(s.cast)assert.ok(g.hire(s.cast).staff);}g.openClinic();g.arrivalTimer=99999;g.nextEvent=99999;return g;}
test('a busy clinic reserves unique seats, keeps overflow moving and gives seated patients comfort',()=>{
 const g=setup(),reception=g.rooms.find(r=>r.type==='reception');const receptionist=g.staff.find(s=>s.id===reception.staffId);receptionist.fatigue=85;g.requestBreak(receptionist.id);
 for(let i=0;i<10;i++)g.spawnPatient('jitters');tick(g,18);
 const seated=g.patients.filter(p=>p.state==='seated'),standing=g.patients.filter(p=>p.state==='queue');assert.ok(seated.length>0);assert.ok(standing.length>0);
 const reserved=g.patients.filter(p=>p.seatRoom!==null);assert.equal(new Set(reserved.map(p=>`${p.seatRoom}:${p.seatIndex}`)).size,reserved.length);assert.ok(reserved.length<=g.seatStats().capacity);
 const a=seated[0],b=standing[0],beforeA=a.patience,beforeB=b.patience;g.update(.05);assert.ok(beforeA-a.patience<(beforeB-b.patience)*.4);
 const waiting=g.rooms.find(r=>r.type==='waiting');assert.equal(g.sell(waiting.id).error,'removeBusy');assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 const employee=g.staff.find(s=>s.id===reception.staffId);employee.fatigue=0;tick(g,220);assert.ok(g.cured>0);assert.ok(g.records.some(r=>r.dischargedAt!==null));
});
test('every patient movement remains continuous through room exits, seating and appointments',()=>{
 const g=setup();g.arrivalTimer=1;const seen=new Set();for(let i=0;i<6000;i++){if(g.event)g.resolveEvent(0);const before=new Map(g.patients.map(p=>[p.id,{x:p.x,y:p.y}]));g.update(.05);for(const p of g.patients){seen.add(p.state);const q=before.get(p.id);if(q)assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<=.125001,`${p.state} teleported`);}if(i%137===0)assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());}
 for(const state of ['seatTravel','seated','inside','service','roomExit','exit'])assert.ok(seen.has(state),state);
 for(const r of g.records){assert.ok(r.timeline.filter(e=>e.code==='diagnosed').length<=1);assert.ok(r.timeline.filter(e=>e.code==='cured').length<=1);}
});
test('applicant choices are consumed once, carry different contracts, and adverts cost real money',()=>{
 const g=new Game({seed:5});for(const role of ['receptionist','doctor','nurse','surgeon','janitor']){const applicants=g.applicants(role);assert.equal(applicants.length,3);assert.equal(new Set(applicants.map(c=>c.name)).size,3);assert.equal(new Set(applicants.map(c=>c.skill)).size,3);assert.equal(new Set(applicants.map(c=>c.wage)).size,3);}
 const choice=g.applicants('nurse')[1],cash=g.cash;const hired=g.hireApplicant(choice.id).staff;assert.equal(hired.name,choice.name);assert.equal(g.cash,cash-choice.hire);assert.equal(g.hireApplicant(choice.id).error,'noApplicants');assert.equal(g.applicants('nurse').length,2);
 const priorProfit=g.yearlyProfit();g.refreshApplicants();assert.equal(g.yearlyProfit(),priorProfit-250);assert.equal(g.applicants('nurse').length,3);assert.equal(g.staff[0].wage,choice.wage);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 for(const mutate of [s=>s.staff[0].skill=999,s=>s.staff[0].fatigueRate=0,s=>s.applicantIds.push(s.applicantIds[0]),s=>s.staff[0].personality='<b>bad</b>',s=>{delete s.staff[0].applicantId;s.staff[0].fatigueRate='broken';},s=>{delete s.staff[0].applicantId;s.staff[0].personality='<b>html</b>';} ]){const bad=g.snapshot();mutate(bad);assert.throws(()=>Game.restore(bad));}
});
test('v2 saves keep their clinic and acquire the applicant market without resetting finances',()=>{
 const g=setup();tick(g,60);const old=g.snapshot();old.version=2;delete old.applicantIds;delete old.recruitmentRound;for(const s of old.staff){delete s.applicantId;delete s.personality;delete s.fatigueRate;}for(const p of old.patients){p.seatRoom=null;p.seatIndex=null;if(['seatTravel','seated'].includes(p.state)){p.state='waiting';p.targetRoom=null;p.path=[];}}
 const restored=Game.restore(old);assert.equal(restored.cash,old.cash);assert.deepEqual(restored.records,old.records);assert.equal(restored.clock,old.clock);assert.equal(restored.version,5);assert.ok(restored.applicants('nurse').length>0);tick(restored,100);assert.ok(restored.cured>=g.cured);
});
