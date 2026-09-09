import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {FURNITURE,OBJECT_INFO,requirements,satisfiesRequirement,furniturePoint,furniturePorts,roomObjects,findObject} from '../src/objects.js';
import {defaultFurniture,layoutStatus,roomDoor,insidePath,pointBlocked,segmentBlocked,solidRects} from '../src/layout.js';

const ok=result=>{assert.equal(result?.error,undefined,JSON.stringify(result));return result;};
const actorPoint=(r,f,p)=>{const q=furniturePoint(r,f,p);return {x:q.x-.5,y:q.y-.5};};
function assertRoute(r,from,to,options={}){const path=insidePath(r,from,to,options);assert.notEqual(path,null);let previous=from;for(const point of path){assert.equal(segmentBlocked(r,previous,point,options),false);previous=point;}assert.ok(Math.hypot(previous.x-to.x,previous.y-to.y)<1e-8);return path;}

test('new WC templates fit an enclosed cubicle and sink in every supported room size',()=>{
 for(const y of [2,9])for(let w=3;w<=10;w++)for(let h=3;h<=8;h++){
  const r={id:1,type:'toilet',x:2,y,w,h,furniture:[]};r.furniture=defaultFurniture(r);
  assert.deepEqual(r.furniture.map(f=>f.kind),['toilet-cubicle','sink']);assert.deepEqual(layoutStatus(r),{ready:true,missing:[],blocked:null});
  for(const port of furniturePorts(r)){assert.equal(pointBlocked(r,port),false);const target=port.approach||port;assertRoute(r,roomDoor(r),target);assertRoute(r,target,roomDoor(r));if(port.requiresDoor){assert.equal(insidePath(r,target,port),null);assertRoute(r,target,port,{doorFurnitureId:port.furnitureId});assertRoute(r,port,target,{doorFurnitureId:port.furnitureId});}}
 }
 for(const y of [2,9]){
  const g=new Game({mode:'sandbox',seed:71}),r=ok(g.addRoom('toilet',{x:2,y,w:3,h:3})).room,before=g.cash;
  assert.deepEqual(requirements('toilet'),[{kind:'toilet',need:1},{kind:'sink',need:1}]);assert.equal(g.finishRoom(r.id).error,'furnitureMissing');
  ok(g.autoFurnish(r.id));assert.equal(before-g.cash,FURNITURE['toilet-cubicle'].cost+FURNITURE.sink.cost);ok(g.finishRoom(r.id));assert.equal(g.roomReady(r),true);
  assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 }
});

test('all four cubicle rotations preserve identity, block their walls and leave an accessible outside entrance',()=>{
 const g=new Game({mode:'sandbox',seed:7}),r=ok(g.addRoom('toilet',{x:2,y:9,w:6,h:6})).room,f=ok(g.addFurniture(r.id,'toilet-cubicle',{x:2,y:2,rotation:0})).object;
 const ids=roomObjects(r).filter(o=>o.furnitureId===f.id).map(o=>o.id),cash=g.cash,ports=[];
 for(let rotation=0;rotation<4;rotation++){
  ok(g.moveFurniture(r.id,f.id,{x:2,y:2,rotation}));assert.equal(g.cash,cash);
  const objects=roomObjects(r).filter(o=>o.furnitureId===f.id);assert.deepEqual(objects.map(o=>o.id),ids);assert.equal(objects.length,5);assert.equal(solidRects(r).length,5);
  for(const object of objects){assert.equal(object.furnitureKind,'toilet-cubicle');assert.equal(object.frame.rotation,rotation);assert.equal(findObject(g,object.id).furnitureId,f.id);assert.ok(OBJECT_INFO[object.kind][1].every(s=>s.length>20));const {x,y,w,h}=object.local,expected=furniturePoint(r,f,{x:x+w/2,y:y+h/2});assert.ok(Math.hypot(object.x+object.w/2-expected.x,object.y+object.h/2-expected.y)<1e-8);}
  const port=furniturePorts(r)[0],expected=actorPoint(r,f,{x:1.0,y:1.5}),outside=actorPoint(r,f,{x:.75,y:2.25});assert.equal(port.kind,'use');assert.deepEqual(port.approach,outside);assert.equal(port.solidId,`${f.id}:door`);assert.equal(port.requiresDoor,true);assert.equal(port.lookYaw,Math.PI-rotation*Math.PI/2);assert.ok(Math.hypot(port.x-expected.x,port.y-expected.y)<1e-8);ports.push([port.x,port.y]);
  assert.equal(pointBlocked(r,port),false);assertRoute(r,roomDoor(r),outside);assertRoute(r,outside,port,{doorFurnitureId:f.id});assert.equal(insidePath(r,outside,port,{doorFurnitureId:'another-cubicle'}),null);
  for(const solid of FURNITURE['toilet-cubicle'].solids){const center=actorPoint(r,f,{x:solid.x+solid.w/2,y:solid.y+solid.h/2});assert.equal(pointBlocked(r,center),true,`${rotation}/${solid.part} must be solid`);}
  const interior=actorPoint(r,f,{x:.75,y:1.55});assert.equal(pointBlocked(r,interior),false,'the free interior floor is not an invisible solid rectangle');assert.equal(insidePath(r,outside,interior),null,'a closed cubicle cannot be used as a shortcut');
  for(const [from,to] of [[{x:-.3,y:1.5},{x:.4,y:1.5}],[{x:1.1,y:1.5},{x:1.8,y:1.5}],[{x:.75,y:-.3},{x:.75,y:.4}],[{x:.75,y:1.5},{x:.75,y:2.4}]])assert.equal(segmentBlocked(r,actorPoint(r,f,from),actorPoint(r,f,to)),true);
 }
 assert.equal(new Set(ports.map(JSON.stringify)).size,4);
});

test('cubicle placement rejects room-door conflicts, overlap and a blocked cubicle entrance atomically',()=>{
 const g=new Game({mode:'sandbox',seed:6}),r=ok(g.addRoom('toilet',{x:2,y:2,w:6,h:5})).room;
 const f=ok(g.addFurniture(r.id,'toilet-cubicle',{x:2,y:1,rotation:0})).object;
 for(const [kind,position,error] of [['plant',{x:2.5,y:3,rotation:0},'furnitureBlocked'],['plant',{x:2.5,y:2.25,rotation:0},'furnitureOverlap'],['toilet-cubicle',{x:5,y:1,rotation:0},'furnitureBounds']]){const before=g.snapshot();assert.equal(g.addFurniture(r.id,kind,position).error,error);assert.deepEqual(g.snapshot(),before);}
 assert.deepEqual(layoutStatus(r).missing,[{kind:'sink',need:1,have:0}]);ok(g.addFurniture(r.id,'sink',{x:.25,y:.25,rotation:0}));ok(g.finishRoom(r.id));
 assert.equal(g.moveFurniture(r.id,f.id,{x:3,y:1}).error,'roomEditing');
 const small=ok(g.addRoom('toilet',{x:10,y:2,w:3,h:3})).room;assert.equal(g.addFurniture(small.id,'toilet-cubicle',{x:.25,y:.75,rotation:0}).error,'furnitureDoor');
 const wrong=ok(g.addRoom('waiting',{x:15,y:2,w:4,h:4})).room;assert.equal(g.addFurniture(wrong.id,'toilet-cubicle',{x:.25,y:.25,rotation:0}).error,'furnitureRoom');
});

test('old furnished saves keep their bare toilets, coordinates and accounts unchanged',()=>{
 const g=new Game({mode:'sandbox',seed:2}),r=ok(g.addRoom('toilet',{x:2,y:9,w:5,h:4})).room;
 ok(g.addFurniture(r.id,'toilet',{x:.5,y:1.25,rotation:1}));ok(g.addFurniture(r.id,'sink',{x:3.75,y:1,rotation:0}));ok(g.finishRoom(r.id));
 assert.equal(satisfiesRequirement('toilet','toilet'),true);assert.equal(satisfiesRequirement('toilet-cubicle','toilet'),true);assert.equal(satisfiesRequirement('cubicle-side','toilet'),false);
 const before=g.snapshot(),restored=Game.restore(before);assert.deepEqual(restored.snapshot(),before);assert.ok(restored.room(r.id).furniture.every(f=>f.kind!=='toilet-cubicle'));assert.deepEqual(Game.restore(restored.snapshot()).snapshot(),before);
});

test('version-five migration preserves the old WC template and never inserts paid cubicles',()=>{
 for(const y of [2,9]){
  const g=new Game({mode:'sandbox',seed:5}),r=ok(g.addRoom('toilet',{x:2,y,w:3,h:3})).room,old=g.snapshot();old.version=5;
  const migrated=Game.restore(old),room=migrated.room(r.id),legacy=defaultFurniture(room,{legacyToilet:true});
  assert.equal(migrated.version,6);assert.equal(migrated.cash,old.cash);assert.equal(migrated.construction,old.construction);assert.deepEqual([room.x,room.y,room.w,room.h],[r.x,r.y,r.w,r.h]);
  assert.ok(room.furniture.every(f=>f.kind!=='toilet-cubicle'&&f.paid===0));for(const original of legacy)assert.deepEqual(room.furniture.find(f=>f.id===original.id),{...original,paid:0});assert.equal(layoutStatus(room).ready,true);
  assert.deepEqual(Game.restore(migrated.snapshot()).snapshot(),migrated.snapshot());
 }
});
