import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {DEMAND,getDemandStatus,patientHappiness,eligibleIllnesses,reviewVisit} from '../src/demand.js';
import {EVENTS} from '../src/content.js';
import {GUIDE,YEAR_SECONDS} from '../src/tutorial.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const DT=.05,ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
function step(g){g.update(DT);assert.equal(g.over,false);assert.equal(g.event,null);}
function advance(g,seconds){for(let i=0;i<Math.round(seconds/DT);i++)step(g);}
function until(g,predicate,seconds=180){for(let i=0;i<seconds/DT&&!predicate();i++)step(g);assert.ok(predicate(),`timeout at ${g.clock}`);}
function clinic({mode='sandbox',level=3,seed=42,waiting=true}={}){
 const g=new Game({mode,level,seed});
 for(const s of GUIDE.slice(0,6)){if(s.room)ok(furnishedRoom(g,s.room,s.rect));else if(s.cast)ok(hireAndPlace(g,s.cast));}
 if(waiting){const s=GUIDE.find(s=>s.id==='waiting');ok(furnishedRoom(g,s.room,s.rect));}
 until(g,()=>g.staff.every(s=>g.staffReady(s)),30);ok(g.openClinic());g.nextEvent=1e9;return g;
}

test('all modes open quietly with two or three arrivals in the first minute and no unsupported illnesses',()=>{
 for(const mode of ['tutorial','campaign','sandbox'])for(const seed of [1,42,2026]){
  const g=clinic({mode,seed});advance(g,60);assert.ok(g.records.length>=2&&g.records.length<=3,`${mode}/${seed}: ${g.records.length}`);
  assert.ok(g.records.every(r=>['jitters','inbox'].includes(r.illness)));assert.ok(g.demandStatus().active<=5);assert.equal(g.left,0);
 }
});

test('missing departments, unfinished rooms and unplaced employees cannot attract patients they cannot treat',()=>{
 const g=clinic(),before=g.snapshot();assert.equal(g.admitPatient('funny'),null);assert.equal(g.admitPatient('daydream'),null);assert.deepEqual(g.snapshot(),before);
 const therapy=ok(g.addRoom('therapy',{x:2,y:8,w:4,h:4})).room;
 ok(g.autoFurnish(therapy.id));assert.equal(g.admitPatient('daydream'),null);ok(g.finishRoom(therapy.id));assert.equal(g.admitPatient('daydream'),null);
 const doctor=ok(g.hire('park')).staff;assert.equal(g.admitPatient('daydream'),null);ok(g.placeStaff(doctor.id,therapy.id));assert.ok(g.admitPatient('daydream'));
 assert.ok(eligibleIllnesses(g).every(i=>['pharmacy','therapy'].includes(i.room)));assert.ok(eligibleIllnesses(g).some(i=>i.id==='keyboard-claw'));assert.ok(eligibleIllnesses(g).some(i=>i.id==='appointment-amnesia'));
 const receptionist=g.staff.find(s=>s.role==='receptionist');ok(g.dismiss(receptionist.id));const serial=g.patientSerial,rng=g.rng;
 assert.equal(g.admitPatient(),null);assert.equal(g.demandStatus().reason,'noReception');advance(g,10);assert.equal(g.patientSerial,serial);assert.equal(g.rng,rng);
});

test('clinical backlog pauses all arrival sources without deleting or teleporting existing patients',()=>{
 const g=clinic();g.arrivalTimer=0;
 for(let i=0;i<31;i++)g.spawnPatient('jitters');
 const snapshot=g.snapshot(),loaded=Game.restore(snapshot);assert.deepEqual(loaded.snapshot(),snapshot);const ids=g.patients.map(p=>p.id),rng=g.rng;
 assert.equal(getDemandStatus(g).reason,'backlog');assert.equal(g.admitPatient(),null);assert.equal(g.rng,rng);
 g.event='rush';ok(g.resolveEvent(0));assert.equal(g.patientSerial,31);g.event='influencer';ok(g.resolveEvent(0));assert.equal(g.patientSerial,31);
 step(g);assert.deepEqual(g.patients.map(p=>p.id),ids);assert.equal(g.patientSerial,31);assert.ok(g.arrivalTimer>=DEMAND.resumeDelay);
});

test('event groups respect capacity and specialty availability, even with an empty waiting room',()=>{
 const g=clinic();g.event='influencer';ok(g.resolveEvent(0));assert.equal(g.records.length,0);
 g.event='rush';ok(g.resolveEvent(0));assert.equal(g.records.length,getDemandStatus(g).limit);assert.equal(getDemandStatus(g).paused,true);
 const before=g.patientSerial;g.event='rush';ok(g.resolveEvent(0));assert.equal(g.patientSerial,before);
});

test('staff breaks lower available capacity and preserve an admission delay when service resumes',()=>{
 const g=clinic(),nurse=g.staff.find(s=>s.role==='nurse');g.arrivalTimer=0;
 assert.equal(getDemandStatus(g).limit,5);assert.equal(g.requestBreak(nurse.id),true);until(g,()=>nurse.state==='break');
 assert.equal(getDemandStatus(g).reason,'staffBreak');assert.equal(getDemandStatus(g).limit,3);const serial=g.patientSerial;advance(g,2);assert.equal(g.patientSerial,serial);
 until(g,()=>!getDemandStatus(g).paused);assert.ok(g.arrivalTimer>=DEMAND.resumeDelay-DT*2);advance(g,4);assert.equal(g.patientSerial,serial);advance(g,2);assert.equal(g.patientSerial,serial+1);
});

test('empty expansion land and decorative construction do not manufacture clinical demand',()=>{
 const g=clinic(),before=getDemandStatus(g);ok(g.expand('east'));
 assert.deepEqual(getDemandStatus(g),before);ok(furnishedRoom(g,'lounge',{x:24,y:2,w:5,h:4}));assert.deepEqual(getDemandStatus(g),before);
 const draft=ok(g.addRoom('gp',{x:24,y:10,w:5,h:4})).room;assert.deepEqual(getDemandStatus(g),before);ok(g.autoFurnish(draft.id));ok(g.finishRoom(draft.id));assert.deepEqual(getDemandStatus(g),before);
});

test('real waiting, actual seating comfort and cleanliness affect patient happiness',()=>{
 const seated=clinic(),standing=clinic({waiting:false});
 for(const g of [seated,standing]){g.arrivalTimer=1e9;ok(g.dismiss(g.rooms.find(r=>r.type==='gp').staffId));g.spawnPatient('jitters');}
 until(seated,()=>seated.patients[0].state==='seated');until(standing,()=>standing.patients[0].state==='waiting'&&standing.patients[0].registered);
 const p=seated.patients[0],q=standing.patients[0],initial=patientHappiness(seated,p);advance(seated,120);advance(standing,120);
 assert.ok(patientHappiness(seated,p)<initial);assert.ok(patientHappiness(seated,p)>patientHappiness(standing,q)+10);
 const clean=patientHappiness(seated,p);seated.cleanliness=20;assert.ok(patientHappiness(seated,p)<clean-15);
});

test('actual outcomes produce one archived review, affect reputation, and preserve financial accounting',()=>{
 const g=clinic({seed:2});g.arrivalTimer=1e9;const p=g.spawnPatient('jitters'),rep=g.rep,satisfaction=g.satisfaction;
 until(g,()=>g.record(p.id).dischargedAt!==null);const record=g.record(p.id);assert.equal(record.outcome,'cured');assert.ok(record.rating>80);assert.equal(g.ratings,1);assert.ok(g.satisfaction>satisfaction);assert.ok(g.rep>rep);
 const snapshot=g.snapshot();reviewVisit(g,p);assert.deepEqual(g.snapshot(),snapshot);assert.equal(g.cash,50000+g.income-g.expenses-g.construction+g.financing);
 const q=g.spawnPatient('inbox'),prior=g.rep;q.patience=.001;until(g,()=>g.record(q.id).dischargedAt!==null);assert.equal(g.record(q.id).outcome,'left');assert.ok(g.record(q.id).rating<=20);assert.equal(g.ratings,2);assert.ok(g.rep<prior);
 assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('a real failed treatment lowers reputation even with excellent comfort and fully upgraded rooms',()=>{
 const g=clinic({seed:7});g.arrivalTimer=1e9;
 for(const id of ['lounge','toilet']){const s=GUIDE.find(s=>s.id===id);ok(furnishedRoom(g,s.room,s.rect));}ok(hireAndPlace(g,'otto'));
 for(const r of g.rooms.filter(r=>['reception','gp','pharmacy','toilet'].includes(r.type)))while(r.level<3)ok(g.upgrade(r.id));
 g.completed.push('patience');const p=g.spawnPatient('jitters'),rep=g.rep;
 until(g,()=>g.record(p.id).dischargedAt!==null);const record=g.record(p.id);
 assert.equal(record.outcome,'failed');assert.ok(p.patience>95);assert.ok(record.rating<=50);assert.ok(g.rep<rep);assert.equal(g.ratings,1);
 assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('another available specialty never admits new patients for a department whose worker is on break',()=>{
 const g=clinic();g.arrivalTimer=1e9;
 const therapy=ok(furnishedRoom(g,'therapy',{x:2,y:8,w:4,h:4})).room;ok(hireAndPlace(g,'park'));
 until(g,()=>g.staffReady(g.staff.find(s=>s.id===therapy.staffId)));const nurse=g.staff.find(s=>s.role==='nurse');assert.equal(g.requestBreak(nurse.id),true);
 until(g,()=>nurse.state==='break');assert.equal(getDemandStatus(g).paused,false,'therapy still accepts patients');
 const before=g.snapshot();assert.equal(g.admitPatient('inbox'),null);assert.equal(g.admitPatient('jitters'),null);assert.deepEqual(g.snapshot(),before,'a declined specialty consumes no RNG or cash');
 g.event='rush';ok(g.resolveEvent(0));assert.equal(g.patientSerial,0);
 const p=g.admitPatient();assert.ok(p);assert.ok(['daydream','main'].includes(p.illness));
 until(g,()=>g.staffReady(nurse));assert.ok(g.admitPatient('inbox'),'the original department accepts patients after its worker returns');
});

test('good care grows demand gradually while unhappy patients reduce it at the same capacity',()=>{
 const g=clinic({seed:2});g.clock=DEMAND.growthSeconds;g.ratings=8;
 const baseline=getDemandStatus(g);g.satisfaction=95;const happy=getDemandStatus(g);g.satisfaction=35;const unhappy=getDemandStatus(g);
 assert.equal(happy.limit,unhappy.limit);assert.ok(happy.interval<baseline.interval);assert.ok(unhappy.interval>happy.interval+8);
 g.clock=30;assert.equal(getDemandStatus(g).interval,DEMAND.startInterval);
});

test('review fields migrate from old saves, reject partial or malformed imports, and continue deterministically',()=>{
 const g=clinic();advance(g,100);const loaded=Game.restore(g.snapshot());
 for(let i=0;i<1600;i++){step(g);step(loaded);assert.deepEqual(loaded.snapshot(),g.snapshot());}
 const legacy=g.snapshot();delete legacy.satisfaction;delete legacy.ratings;for(const r of legacy.records)delete r.rating;const untouched=structuredClone(legacy),old=Game.restore(legacy);
 assert.deepEqual(legacy,untouched);assert.equal(old.satisfaction,75);assert.equal(old.ratings,0);assert.ok(old.records.every(r=>r.rating===null));
 for(const mutate of [s=>delete s.ratings,s=>s.satisfaction=-1,s=>s.satisfaction=101,s=>s.satisfaction='happy',s=>s.ratings=1.5,s=>s.ratings=999,s=>s.records[0].rating=101,s=>s.records[0].rating='great']){const data=g.snapshot();mutate(data);assert.throws(()=>Game.restore(data),/Invalid patient reviews/);}
});

function follow(g){const s=g.guide();if(!s)return;if(s.room)ok(furnishedRoom(g,s.room,s.rect));else if(s.cast)ok(hireAndPlace(g,s.cast));else if(s.id==='open')ok(g.openClinic());else if(s.id==='chart')g.readChart(g.records[0].id);else if(s.upgrade)ok(g.upgrade(g.rooms.find(r=>r.type===s.upgrade).id));}
test('a carefully developed tutorial achieves a genuine $100,000 year with the quieter demand across eight seeds',()=>{
 for(const seed of [1,2,3,7,42,99,123,2026]){
  const g=new Game({seed});while(!g.admissionsOpen)follow(g);let peak=0;
  for(let i=0;i<YEAR_SECONDS*3/DT&&!g.won;i++){
   if(g.event){const ev=EVENTS.find(e=>e.id===g.event),index=ev.choices.findIndex(c=>c.cost===0&&c.effect!=='mafiaLoan');ok(g.resolveEvent(index>=0?index:0));}
   follow(g);g.update(DT);assert.equal(g.over,false);peak=Math.max(peak,getDemandStatus(g).active);
  }
  assert.ok(g.won,`seed ${seed}: ${JSON.stringify(g.financialYears)}`);assert.ok(g.financialYears.some(y=>y.profit>=100000));assert.ok(g.financialYears.length>=2);assert.ok(peak<=5);assert.equal(g.left,0);
  assert.equal(g.cash,50000+g.income-g.expenses-g.construction+g.financing);
 }
});
