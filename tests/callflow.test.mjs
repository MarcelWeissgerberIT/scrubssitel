import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
const DT = .05;
const contract = test;

function ok(result, label) {
  assert.ok(!result?.error, `${label}: ${result?.error}`);
  return result;
}
function clinic({waiting = true, secondDoctor = false} = {}) {
  const g = new Game({mode: 'sandbox', level: 3, seed: 42});
  const rooms = [
    ['reception', {x:15,y:12,w:5,h:4}],
    ['gp', {x:2,y:2,w:5,h:4}],
    ['pharmacy', {x:8,y:2,w:5,h:4}],
    ['lounge', {x:17,y:2,w:5,h:4}],
  ];
  if (waiting) rooms.push(['waiting', {x:7,y:8,w:3,h:3}]);
  if (secondDoctor) rooms.push(['gp', {x:2,y:8,w:3,h:3}]);
  for (const [type, rect] of rooms) ok(g.addRoom(type, rect), `build ${type}`);
  for (const id of ['rosa', 'milo', 'bea', 'otto']) ok(g.hire(id), `hire ${id}`);
  if (secondDoctor) ok(g.hire('milo'), 'hire second doctor');
  ok(g.openClinic(), 'open');
  g.arrivalTimer = 1e9;
  g.nextEvent = 1e9;
  for(let i=0;i<400;i++)g.update(DT);
  for(const s of g.staff)s.nextBreakAt=1e9;
  return g;
}
function advance(g, before) {
  before?.(g);
  g.update(DT);
  assert.equal(g.event, null, 'No unrelated events in these scenarios');
  assert.equal(g.over, false, `Unexpected game over at ${g.clock}`);
}
function until(g, predicate, {seconds = 600, before} = {}) {
  for (let i=0; i < Math.ceil(seconds / DT); i++) {
    if (predicate()) return;
    advance(g, before);
  }
  assert.ok(predicate(), `Timed out after ${seconds}s; states: ${g.patients.map(p => `${p.id}:${p.stage}/${p.state}`).join(', ')}`);
}
function holdDoctors(g) {
  for (const s of g.staff) if (s.role === 'doctor') { s.resting = true; s.fatigue = 100; }
}
function releaseDoctors(g) {
  for (const s of g.staff) if (s.role === 'doctor') { s.resting = false; s.fatigue = 0; }
}
function prepareQueue(g, count) {
  const patients = Array.from({length: count}, () => g.spawnPatient('jitters'));
  until(g, () => patients.every(p => p.stage === 'diagnosis' && ['queue','seated'].includes(p.state)), {before: holdDoctors});
  const orders = patients.map(p => p.queueOrder);
  assert.ok(orders.every(n => Number.isInteger(n) && n > 0));
  assert.equal(new Set(orders).size, count);
  assert.equal(g.calls.length, 0, 'Reception does not announce a doctor appointment');
  return patients.slice().sort((a,b) => a.queueOrder-b.queueOrder);
}
function checkSeats(g) {
  const used = new Set();
  for (const p of g.patients) if (p.seatRoom !== null) {
    const r = g.room(p.seatRoom);
    assert.equal(r?.type, 'waiting');
    assert.ok(['seatTravel','seated'].includes(p.state));
    assert.ok(g.seats(r)[p.seatIndex]);
    const key = `${r.id}:${p.seatIndex}`;
    assert.ok(!used.has(key), `Double seat reservation: ${key}`);
    used.add(key);
  }
  assert.ok(used.size <= g.seatStats().capacity);
}

contract('FIFO follows registration order even after patients[] is reversed', () => {
  const g = clinic();
  const expected = prepareQueue(g, 4).map(p => p.id);
  g.patients.reverse();
  releaseDoctors(g);
  until(g, () => g.calls.filter(c => c.roomType === 'gp').length === expected.length);
  assert.deepEqual(g.calls.filter(c => c.roomType === 'gp').map(c => c.patientId), expected);
  assert.equal(new Set(g.calls.map(c => c.id)).size, g.calls.length);
});

contract('two available doctors claim two different oldest queue entries', () => {
  const g = clinic({secondDoctor: true});
  const expected = prepareQueue(g, 4).slice(0,2).map(p => p.id);
  releaseDoctors(g);
  advance(g);
  const calls = g.calls.filter(c => c.roomType === 'gp');
  assert.deepEqual(calls.map(c => c.patientId), expected);
  assert.equal(new Set(calls.map(c => c.roomId)).size, 2);
  for (const c of calls) {
    const p = g.patients.find(p => p.id === c.patientId), r = g.room(c.roomId);
    assert.equal(p.state, 'called');
    assert.equal(r.patientId, p.id);
    assert.equal(p.targetRoom, r.id);
    assert.equal(r.progress, 0);
    assert.equal(p.seatRoom, null);
    assert.equal(p.seatIndex, null);
    assert.ok(Number.isFinite(p.calledAt));
  }
});

for (const waiting of [false, true]) contract(`all patients finish with ${waiting ? 'one seat and overflow' : 'no waiting seats'}`, () => {
  const g = clinic({waiting}), people = prepareQueue(g, 4);
  checkSeats(g);
  assert.ok(people.some(p => p.state === 'queue'), 'Scenario exercises standing overflow');
  releaseDoctors(g);
  until(g, () => people.every(p => g.record(p.id).dischargedAt !== null), {before: checkSeats});
  assert.equal(g.left, 0);
  assert.equal(g.cured + g.failed, people.length);
  assert.equal(g.patients.length, 0);
  assert.equal(g.seatStats().reserved, 0);
});

contract('called is visible before entering; service and billing occur exactly once', () => {
  const g = clinic(), p = g.spawnPatient('jitters'), seen = new Set(), beforeCash = g.cash;
  const recorded = new Set();
  until(g, () => g.record(p.id).dischargedAt !== null, {before() {
    seen.add(p.state);
    for (const event of g.record(p.id).timeline) if (event.code === 'serviceStarted' && !recorded.has(event)) {
      recorded.add(event);
      const room = g.room(event.roomId), point = g.servicePoint(room);
      assert.equal(p.state, 'service', 'serviceStarted must describe actual service');
      assert.ok(Math.hypot(p.x-point.x,p.y-point.y) < 1e-8);
    }
    if (p.state === 'called') {
      assert.equal(g.room(p.targetRoom).progress, 0);
      assert.equal(p.path.length, 0, 'Patient waits during the brief announcement phase');
    }
  }});
  const record = g.record(p.id);
  assert.ok(seen.has('called') && seen.has('inside') && seen.has('roomExit'));
  assert.equal(record.timeline.filter(e => e.code === 'registered').length, 1);
  assert.equal(record.timeline.filter(e => e.code === 'diagnosed').length, 1);
  assert.equal(record.timeline.filter(e => e.code === 'serviceStarted').length, 3);
  assert.equal(g.calls.filter(c => c.patientId === p.id).length, 2);
  assert.equal(record.diagnosisCharge, g.diagnosisFee());
  assert.equal(record.bill, record.diagnosisCharge + record.treatmentCharge);
  assert.equal(g.cash, beforeCash + g.income - g.expenses);
});

contract('closed door blocks crossing; opening and manual hold permit it', () => {
  const g = clinic(), r = g.rooms.find(r => r.type === 'gp'), p = g.spawnPatient('jitters');
  Object.assign(p, g.door(r), {state:'inside',targetRoom:r.id,path:g.enterPath(r,g.servicePoint(r))});
  r.patientId = p.id;
  r.doorOpen = 0;
  const start = {x:p.x,y:p.y};
  g.move(p, .25);
  assert.deepEqual({x:p.x,y:p.y}, start);
  r.doorOpen = 1;
  g.move(p, .25);
  assert.ok(Math.hypot(p.x-start.x,p.y-start.y) > 0);
  assert.ok(Math.hypot(p.x-start.x,p.y-start.y) <= .625 + 1e-9);
  p.x = 12; p.y = 16; p.state = 'waiting'; r.patientId = null;
  g.toggleDoor(r.id); g.updateDoors(.25);
  assert.equal(r.doorHeld, true); assert.equal(r.doorOpen, 1);
  g.toggleDoor(r.id); g.updateDoors(.25);
  assert.equal(r.doorHeld, false); assert.equal(r.doorOpen, 0);
});

contract('complete path is continuous and doorway crossings happen with an open door', () => {
  const g = clinic(), p = g.spawnPatient('jitters');
  for (let i=0; i<12000 && g.record(p.id).dischargedAt === null; i++) {
    const from = {x:p.x,y:p.y};
    advance(g);
    assert.ok(Math.hypot(p.x-from.x,p.y-from.y) <= 2.5*DT+1e-8, `Teleport at ${g.clock}`);
    for (const r of g.rooms.filter(r => ['gp','pharmacy'].includes(r.type))) {
      const d = g.door(r), edge = r.y < 8 ? r.y+r.h-.5 : r.y-.5;
      if ((from.y-edge)*(p.y-edge) < 0 && Math.abs(from.x-d.x)<.6) {
        assert.ok(r.doorOpen >= .85, `Crossed ${r.type} with doorOpen=${r.doorOpen}`);
      }
    }
  }
  assert.notEqual(g.record(p.id).dischargedAt, null);
});

contract('save during called resumes identically without emitting that call again', () => {
  const g = clinic(), p = g.spawnPatient('jitters');
  until(g, () => p.state === 'called' && p.stage === 'diagnosis');
  const snapshot = g.snapshot(), restored = Game.restore(snapshot);
  assert.deepEqual(restored.snapshot(), snapshot);
  const serial = g.callSerial;
  for (let i=0; i<10; i++) { advance(g); advance(restored); }
  assert.equal(g.callSerial, serial, 'One call must not be recreated during its delay');
  assert.deepEqual(restored.snapshot(), g.snapshot());
  for (let i=0; i<3000; i++) { advance(g); advance(restored); }
  assert.deepEqual(restored.snapshot(), g.snapshot());
});

contract('children are generated with matching age, chart identity and child flag', () => {
  const g = new Game({mode:'sandbox', seed:42});
  let children=0, adults=0;
  for (let i=0; i<512; i++) {
    const p=g.spawnPatient('jitters'), record=g.record(p.id);
    assert.equal(p.age, record.age);
    assert.equal(p.child, record.age < 16);
    if (p.child) { children++; assert.ok([6,7].includes(record.occupation)); }
    else adults++;
    g.patients=[];
  }
  assert.ok(children > 0 && adults > 0);
});

contract('15/16 age boundary survives save; mismatched child identity is rejected', () => {
  for (const age of [15,16]) {
    const g=clinic(), p=g.spawnPatient('jitters'), data=g.snapshot();
    const person=data.patients[0], record=data.records.find(r=>r.id===p.id);
    person.age=record.age=age; person.child=age<16;
    record.occupation=age<16?6:0; record.birthDate=`${2026-age}-06-15`;
    assert.equal(Game.restore(data).patients[0].child, age<16);
    person.child=!person.child;
    assert.throws(()=>Game.restore(data));
  }
});

function schema3Shape(g) {
  // Synthetic v3 fixture: explicitly remove schema-4-only fields, preserving
  // historical finances, progression and genuine in-flight coordinates.
  const data=g.snapshot(); data.version=3;
  for (const key of ['queueSerial','callSerial','calls']) delete data[key];
  for (const r of data.rooms) { delete r.doorOpen; delete r.doorHeld; }
  for (const p of data.patients) for (const key of ['age','child','queueOrder','calledAt']) delete p[key];
  for (const r of data.records) { r.timeline=r.timeline.filter(e=>e.code!=='called'); if(r.occupation>5)r.occupation=0; }
  return data;
}
for (const state of ['inside','service','roomExit']) contract(`synthetic schema-3 migration preserves ${state} and finances`, () => {
  const g=clinic(), p=g.spawnPatient('jitters');
  until(g,()=>p.state===state&&g.room(p.targetRoom)?.type==='gp');
  const old=schema3Shape(g), migrated=Game.restore(old), person=migrated.patients[0];
  assert.equal(migrated.version,5);
  assert.equal(person.state,state);
  assert.deepEqual({x:person.x,y:person.y},{x:p.x,y:p.y});
  for (const field of ['cash','income','expenses','construction','cured','failed']) assert.equal(migrated[field],old[field]);
  assert.equal(migrated.calls.length,0,'Migration does not invent audible calls');
  assert.equal(person.child,migrated.record(person.id).age<16);
  assert.doesNotThrow(()=>Game.restore(migrated.snapshot()));
  until(migrated,()=>migrated.record(person.id).dischargedAt!==null);
  assert.equal(migrated.record(person.id).timeline.filter(e=>e.code==='diagnosed').length,1);
});

contract('v1 patients without registration metadata can finish their legacy visit',()=>{const g=clinic({waiting:false}),p=g.spawnPatient('jitters'),old=g.snapshot();old.version=1;const person=old.patients[0];person.stage='diagnosis';delete person.registered;person.targetRoom=null;person.state='waiting';const restored=Game.restore(old);assert.equal(restored.patients[0].registered,true);until(restored,()=>restored.record(p.id).dischargedAt!==null);assert.equal(restored.callSerial,2);});

contract('toys reduce a seated child’s patience loss relative to an adult',()=>{const g=clinic(),people=prepareQueue(g,2);for(const r of g.rooms)if(r.type==='waiting')r.w=6;for(const p of people){p.seatRoom=null;p.seatIndex=null;g.reserveSeat(p);}until(g,()=>people.every(p=>p.state==='seated'),{before:holdDoctors});const [child,adult]=people;child.child=true;adult.child=false;child.patience=adult.patience=100;holdDoctors(g);advance(g);assert.ok(Math.abs((100-child.patience)/(100-adult.patience)-.65)<1e-8);});

contract('waiting room seat furniture and reservations use the same unobstructed layout',async()=>{const {roomObjects,waitingSeats,OBJECT_INFO}=await import('../src/objects.js');for(const w of [3,6,10])for(const h of [3,5,8]){const r={id:1,type:'waiting',x:2,y:8,w,h},objects=roomObjects(r),seats=waitingSeats(r),door=Game.prototype.door(r);assert.equal(objects.filter(o=>['chair','sofa'].includes(o.kind)).reduce((sum,o)=>sum+(o.seats||1),0),seats.length);assert.ok(seats.every(s=>Math.abs(s.x-door.x)>.7));assert.ok(objects.some(o=>o.kind==='toys'));assert.equal(new Set(objects.map(o=>o.id)).size,objects.length);for(const o of objects)assert.ok(OBJECT_INFO[o.kind].flat().every(s=>s.length>5));}});
