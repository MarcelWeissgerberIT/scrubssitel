import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {ROOMS,ILLNESSES} from '../src/content.js';
import {roomUpgradeInfo} from '../src/upgrade-info.js';
import {updateStaff,workplace} from '../src/staff.js';
import {furnishedRoom} from './helpers.mjs';

const number=(info,id,side='before')=>parseFloat(info.effects.find(e=>e.id===id)?.[side]);
const close=(a,b,tolerance=.0051)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
function setup(type){
 const g=new Game({mode:'sandbox',seed:21}),r=furnishedRoom(g,type,{x:2,y:2,w:5,h:4},true).room;
 g.arrivalTimer=g.nextEvent=1e9;return {g,r};
}

test('all upgrade prices, monthly costs and repair values match the real purchase without preview mutations',()=>{
 for(const type of Object.keys(ROOMS))for(const level of [1,2]){
  const {g,r}=setup(type);r.level=level;r.condition=67;
  const saved=g.snapshot(),info=roomUpgradeInfo(g,r);assert.deepEqual(g.snapshot(),saved,'preview is read-only');
  const cash=g.cash,construction=g.construction,monthly=g.dailyCost();
  assert.equal(g.upgrade(r.id).error,undefined);assert.equal(info.cost,cash-g.cash);assert.equal(info.cost,g.construction-construction);
  assert.equal(info.monthlyIncrease,g.dailyCost()-monthly);assert.equal(info.monthlyAfter-info.monthlyBefore,info.monthlyIncrease);
  assert.equal(info.nextLevel,r.level);assert.equal(number(info,'condition'),67);assert.equal(number(info,'condition','after'),r.condition);
  for(const effect of info.effects){assert.ok(effect.label.en&&effect.label.de);assert.equal(typeof effect.before,'string');assert.equal(typeof effect.after,'string');}
 }
});

test('max level, unaffordable upgrades and draft rooms mirror existing engine rules',()=>{
 const {g,r}=setup('gp');r.level=3;r.condition=45;
 const max=roomUpgradeInfo(g,r);assert.equal(max.cost,null);assert.equal(max.nextLevel,3);assert.equal(max.monthlyIncrease,0);assert.equal(max.canUpgrade,false);assert.deepEqual(max.effects,[]);assert.equal(g.upgrade(r.id).error,'maxLevel');
 r.level=1;g.cash=0;assert.equal(roomUpgradeInfo(g,r).affordable,false);assert.equal(g.upgrade(r.id).error,'notEnough');
 g.cash=10000;r.ready=false;r.editing=true;const draft=roomUpgradeInfo(g,r);
 assert.equal(draft.draft,true);assert.equal(draft.canUpgrade,true);assert.ok(draft.draftNote.en.includes('does not finish'));assert.equal(g.upgrade(r.id).error,undefined);assert.equal(g.roomReady(r),false);
 assert.equal(roomUpgradeInfo(g,null),null);assert.equal(roomUpgradeInfo(g,{type:'unknown',level:1}),null);
});

test('service speed follows actual room progress, including repair, without promising success or fee bonuses for diagnosis or reception',()=>{
 for(const type of ['reception','gp','pharmacy','therapy','surgery'])for(const level of [1,2]){
  const {g,r}=setup(type),s=g.hireApplicant(g.applicants(ROOMS[type].role)[0].id,true).staff;
  Object.assign(s,workplace(r),{roomId:r.id,state:'work',path:[],awaitingPlacement:false,fatigue:20,nextBreakAt:1e9});r.staffId=s.id;r.level=level;r.condition=62;
  const p=g.spawnPatient(ILLNESSES.find(i=>i.room===type)?.id||'jitters');Object.assign(p,{state:'service',stage:type==='reception'?'reception':type==='gp'?'diagnosis':'treatment',targetRoom:r.id});r.patientId=p.id;
  g.admissionsOpen=true;g.completed=['speed'];g.modifiers=[{kind:'paperwork',endsAt:100}];const info=roomUpgradeInfo(g,r);
  for(const side of ['before','after']){
   if(side==='after')g.upgrade(r.id);r.progress=0;g.update(.001);
   const other=s.skill*(1-s.fatigue*.004)*1.25*(type==='gp'?1/1.35:1);
   close(number(info,'serviceSpeed',side),r.progress/.001/other*100);
  }
  if(['gp','reception'].includes(type)){assert.ok(!info.effects.some(e=>['success','treatmentFee'].includes(e.id)));const fee=g.diagnosisFee();g.upgrade(r.id);assert.equal(g.diagnosisFee(),fee);}
 }
});

test('treatment success and tariff factors agree with the engine, including repairs, research and the success cap',()=>{
 for(const mode of ['tutorial','sandbox'])for(const type of ['pharmacy','therapy','surgery'])for(const condition of [24,100])for(const level of [1,2]){
  const {g,r}=setup(type);g.mode=mode;r.level=level;r.condition=condition;g.cleanliness=88;g.completed=['care'];
  const s=g.hireApplicant(g.applicants(ROOMS[type].role)[2].id,true).staff;r.staffId=s.id;
  const info=roomUpgradeInfo(g,r),p={illness:ILLNESSES.find(i=>i.room===type).id},base=g.treatmentFee(p,{level:1});
  close(number(info,'success'),g.success(r)*100);close(number(info,'treatmentFee'),g.treatmentFee(p,r)/base*100);
  g.upgrade(r.id);close(number(info,'success','after'),g.success(r)*100);assert.ok(number(info,'success','after')<=99);
  close(number(info,'treatmentFee','after'),g.treatmentFee(p,r)/base*100);
 }
});

test('lab upgrades use research progress and seated lounge upgrades use actual fatigue recovery',()=>{
 for(const level of [1,2]){
  const {g,r}=setup('lab'),s=g.hireApplicant(g.applicants('doctor')[0].id,true).staff;
  Object.assign(s,workplace(r),{roomId:r.id,state:'work',path:[],awaitingPlacement:false,fatigue:78,nextBreakAt:1e9});r.staffId=s.id;r.level=level;r.condition=25;
  g.admissionsOpen=true;g.completed=['speed'];g.project={id:'care',progress:0};const lab=roomUpgradeInfo(g,r);
  for(const side of ['before','after']){if(side==='after')g.upgrade(r.id);g.project.progress=0;g.update(.001);close(number(lab,'researchSpeed',side),g.project.progress/.001/s.skill*100);}
  assert.ok(!lab.effects.some(e=>['serviceSpeed','success','treatmentFee'].includes(e.id)));
  const lounge=setup('lounge');lounge.r.level=level;const seat=lounge.g.seats(lounge.r)[0]||{x:3,y:3};
  const employee={id:999,role:'doctor',roomId:null,state:'break',resting:true,breakRoomId:lounge.r.id,breakSeatIndex:0,breakElapsed:0,breakCount:0,nextBreakAt:1e9,fatigue:70,path:[],...seat};lounge.g.staff=[employee];
  const info=roomUpgradeInfo(lounge.g,lounge.r);
  for(const side of ['before','after']){if(side==='after')lounge.g.upgrade(lounge.r.id);const before=employee.fatigue;updateStaff(lounge.g,.1);close(number(info,'recovery',side),(before-employee.fatigue)/.1);}
 }
});

function patienceStep(g,p){const before=p.patience;g.update(.001);return before-p.patience;}
test('waiting room factors match seated adult and child patience, including existing comfort furniture',()=>{
 for(const level of [1,2])for(const child of [false,true]){
  const {g,r}=setup('waiting');r.level=level;r.furniture.push({id:'comfort',kind:'gum-machine',x:3,y:1,rotation:0});
  if(!r.furniture.some(f=>f.kind==='toys'))r.furniture.push({id:'play',kind:'toys',x:3,y:2,rotation:0});
  const p=g.spawnPatient('jitters'),seat=g.seats(r)[0];Object.assign(p,seat,{state:'seated',registered:true,seatRoom:r.id,seatIndex:0,targetRoom:null,child});g.admissionsOpen=true;
  const info=roomUpgradeInfo(g,r),id=child?'childPatience':'seatedPatience';
  for(const side of ['before','after']){
   if(side==='after')g.upgrade(r.id);const loss=patienceStep(g,p),clinicFactor=1+(100-g.cleanliness)/100;
   close(number(info,id,side),loss/.001/.28/clinicFactor*100);
  }
 }
});

test('WC comfort uses the best finished WC, including a stronger existing room and unfinished alternatives',()=>{
 for(const otherLevel of [1,2,3])for(const otherReady of [false,true]){
  const {g,r}=setup('toilet'),other=furnishedRoom(g,'toilet',{x:9,y:2,w:5,h:4},true).room;other.level=otherLevel;other.ready=otherReady;other.editing=!otherReady;
  const p=g.spawnPatient('jitters');p.state='queue';g.admissionsOpen=true;const info=roomUpgradeInfo(g,r);
  for(const side of ['before','after']){if(side==='after')g.upgrade(r.id);p.state='queue';const loss=patienceStep(g,p),clinicFactor=1+(100-g.cleanliness)/100;close(number(info,'toiletPatience',side),loss/.001/.28/clinicFactor*100);}
  if(otherReady&&otherLevel>=2)assert.equal(number(info,'toiletPatience'),number(info,'toiletPatience','after'));
 }
});
