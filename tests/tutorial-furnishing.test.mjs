import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {GUIDE,guideIndex,ANNUAL_TARGET} from '../src/tutorial.js';
import {furnishedRoom} from './helpers.mjs';

const stepFor=type=>GUIDE.find(step=>step.room===type);
function shell(g,type){const step=stepFor(type),result=g.addRoom(type,step.rect);assert.equal(result.error,undefined);return result.room;}
function finish(g,room){assert.equal(g.autoFurnish(room.id).error,undefined);assert.equal(g.finishRoom(room.id).error,undefined);}
function afterFirstCures(){
 const g=new Game({seed:42});
 for(const step of GUIDE.slice(0,7)){if(step.room)assert.ok(furnishedRoom(g,step.room,step.rect).room);else if(step.cast)assert.ok(g.hire(step.cast).staff);}
 assert.equal(g.openClinic().error,undefined);g.nextEvent=1e9;
 for(let ticks=0;ticks<3000&&g.cured<3;ticks++){g.update(.05);if(g.records.length)g.readChart(g.records[0].id);}
 assert.ok(g.cured>=3);assert.equal(g.guide().id,'lounge');return g;
}

test('each initial room lesson waits for furnishing and explicit completion of its existing shell',()=>{
 const g=new Game({seed:42});
 for(const [index,step] of GUIDE.slice(0,7).entries()){
  if(step.cast){assert.ok(g.hire(step.cast).staff);continue;}
  const room=shell(g,step.room),count=g.rooms.length;
  for(const furnished of [false,true]){
   if(furnished)assert.equal(g.autoFurnish(room.id).error,undefined);
   assert.equal(guideIndex(g),index,`${step.id} advanced before finishing`);
   const guide=g.guide();assert.equal(guide.furnish,true);assert.equal(guide.roomId,room.id);assert.equal(guide.room,undefined,'must not offer another shell');assert.equal(g.rooms.length,count);
  }
  assert.equal(g.finishRoom(room.id).error,undefined);assert.equal(guideIndex(g),index+1);
 }
});

test('an additional unfinished diagnosis room does not replace the next required lesson',()=>{
 const g=afterFirstCures(),extra=g.addRoom('gp',{x:2,y:11,w:3,h:3});assert.equal(extra.error,undefined);
 assert.equal(g.guide().id,'lounge');assert.equal(g.guide().room,'lounge');assert.equal(g.roomReady(extra.room),false);
});

for(const type of ['lounge','toilet'])test(`unfinished ${type} cannot complete its lesson or trigger the tutorial win`,()=>{
 const g=afterFirstCures();
 for(const support of ['lounge','toilet']){const room=shell(g,support);if(support!==type)finish(g,room);}
 assert.ok(g.hire('otto').staff);
 for(const clinical of ['gp','pharmacy'])assert.equal(g.upgrade(g.rooms.find(r=>r.type===clinical).id).error,undefined);
 // Isolate furnishing from the independently tested annual accounting rule.
 g.financialYears.push({year:1,income:ANNUAL_TARGET,expenses:0,construction:0,profit:ANNUAL_TARGET,closingCash:g.cash});
 const room=g.rooms.find(r=>r.type===type),index=GUIDE.findIndex(step=>step.room===type);
 assert.equal(guideIndex(g),index);assert.equal(g.guide().roomId,room.id);assert.equal(g.guide().room,undefined);
 g.checkTutorial();assert.equal(g.won,false);
 assert.equal(g.autoFurnish(room.id).error,undefined);g.checkTutorial();assert.equal(g.won,false,'furniture alone does not finish a draft');
 assert.equal(g.finishRoom(room.id).error,undefined);assert.equal(g.won,true);
});

test('an upgraded unfinished extra room does not satisfy the upgrade lesson',()=>{
 const g=afterFirstCures();for(const type of ['lounge','toilet'])finish(g,shell(g,type));assert.ok(g.hire('otto').staff);
 const extra=g.addRoom('gp',{x:6,y:12,w:3,h:3});assert.equal(extra.error,undefined);assert.equal(g.upgrade(extra.room.id).error,undefined);
 assert.equal(g.guide().id,'upgradeGp');assert.equal(guideIndex(g),GUIDE.findIndex(step=>step.id==='upgradeGp'));
});
