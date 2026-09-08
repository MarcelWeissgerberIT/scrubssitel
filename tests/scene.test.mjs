import {furnishedRoom} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {sceneLayers,roomWalls} from '../src/scene.js';
import {roomObjects,furniturePorts,OBJECT_INFO,FURNITURE} from '../src/objects.js';
import {workplace} from '../src/staff.js';
import {skeleton,characterScale} from '../src/animation.js';

test('the receptionist sits behind the counter while working hands and patients remain in front',()=>{
 const g=new Game(),r=furnishedRoom(g,'reception',{x:15,y:12,w:5,h:4}).room,p={...workplace(r),id:90,roomId:r.id,role:'receptionist',state:'working',hasSeat:true,staff:true},visitor={...g.servicePoint(r),id:91,state:'service'};
 const layers=sceneLayers(g,[visitor,p]),index=fn=>layers.findIndex(fn),person=index(v=>v.kind==='person'&&v.person.id===p.id),counter=index(v=>v.object?.kind==='counter');
 assert.ok(index(v=>v.object?.kind==='stool')<person);assert.ok(person<counter);assert.ok(counter<index(v=>v.kind==='hands'));assert.ok(counter<index(v=>v.kind==='person'&&v.person.id===visitor.id));
 for(const kind of ['bell','monitor'])assert.ok(counter<index(v=>v.object?.kind===kind),'Desktop objects remain visible and clickable above the counter');
 const pose=skeleton({time:0,sit:1,walk:0,phase:0,work:1,celebrate:0},p),table=roomObjects(r).find(o=>o.kind==='counter');for(const arm of pose.arms){assert.ok(p.y+.5+arm.hand[1]*characterScale(p)>table.y);assert.ok(arm.hand[2]*characterScale(p)>.57);}
});

test('purchased room details keep unique clickable identities and descriptions',()=>{
 for(const type of ['reception','waiting','gp','pharmacy','therapy','surgery','lab','lounge','toilet']){const r={id:1,type,x:2,y:2,w:5,h:4,furniture:[]};for(const [kind,spec] of Object.entries(FURNITURE))if(spec.rooms.includes(type))r.furniture.push({id:kind,kind,x:0,y:0,rotation:0});const objects=roomObjects(r);assert.equal(new Set(objects.map(o=>o.id)).size,objects.length);for(const o of objects)assert.ok(OBJECT_INFO[o.kind]?.[1].every(s=>s.length>20));for(const kind of ['poster','clock'])assert.ok(objects.some(o=>o.kind===kind));}
});

test('a sofa stays on the correct side of both occupied seats in every rotation',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const room={id:1,type:'waiting',x:2,y:2,w:5,h:4,furniture:[{id:'sofa',kind:'sofa',x:1,y:1,rotation}]},game={rooms:[room]};
  const people=furniturePorts(room).filter(port=>port.kind==='seat').map((port,index)=>({...port,id:100+index,state:'seated'}));
  const emptyDepth=sceneLayers(game,[]).find(layer=>layer.object?.kind==='sofa').depth;
  for(const occupants of [[people[0]],[people[1]],people]){
   const layers=sceneLayers(game,occupants),sofaIndex=layers.findIndex(layer=>layer.object?.kind==='sofa');
   assert.equal(layers[sofaIndex].depth,emptyDepth,'Furniture depth must not jump as people sit down');
   for(const person of occupants){const personIndex=layers.findIndex(layer=>layer.person?.id===person.id);assert.ok([1,2].includes(rotation)?sofaIndex>personIndex:sofaIndex<personIndex,`Sofa rotation ${rotation} must layer correctly for seat ${person.localIndex}`);}
  }
 }
});

test('short wall segments preserve the complete doorway and low front partitions',()=>{
 for(const y of [2,10])for(const type of ['gp','waiting']){
  const room={id:1,type,x:2,y,w:5,h:4},walls=roomWalls(room),doorX=room.x+Math.floor(room.w/2),doorSide=y<8?'front':'back';
  assert.equal(new Set(walls.map(w=>w.id)).size,walls.length);
  for(const wall of walls){assert.ok(Math.max(wall.w,wall.h)<=.5);if(wall.side===doorSide){assert.ok(wall.x+wall.w<=doorX||wall.x>=doorX+1);if(wall.x+wall.w===doorX)assert.equal(wall.joinEnd,false,'Anti-alias overlap must not narrow the doorway');}if(type==='waiting'||['front','right'].includes(wall.side))assert.equal(wall.z,.27);else assert.equal(wall.z,1.2);}
 }
});

test('neighbor walls cover furniture behind them regardless of room insertion order',()=>{
 const pharmacy={id:1,type:'pharmacy',x:8,y:2,w:5,h:4,furniture:[{id:'edge-sink',kind:'sink',x:4,y:2,rotation:0}]},toilet={id:2,type:'toilet',x:14,y:2,w:5,h:4,furniture:[]};
 for(const rooms of [[pharmacy,toilet],[toilet,pharmacy]]){
  const layers=sceneLayers({rooms},[]),sink=layers.findIndex(l=>l.object?.furnitureId==='edge-sink'),wall=layers.findIndex(l=>l.room?.id===2&&l.wall?.side==='left'&&l.wall.y===5.5);
  assert.ok(sink>=0&&wall>sink,'The front neighbor wall must be painted over the rear sink');
 }
});

test('flush clocks and posters are entirely in front of every supporting wall segment',()=>{
 for(const kind of ['poster','clock'])for(const rotation of [0,3])for(const position of [.25,.5,.75,1.25]){
  const room={id:1,type:'gp',x:2,y:2,w:5,h:5,furniture:[{id:'decor',kind,x:rotation===0?position:0,y:rotation===3?position:0,rotation}]},game={rooms:[room]},layers=sceneLayers(game,[]),decor=layers.findIndex(l=>l.object?.furnitureId==='decor'),side=rotation===0?'back':'left';
  for(let i=0;i<layers.length;i++)if(layers[i].wall?.side===side)assert.ok(i<decor,`${kind}/${rotation}/${position}: no supporting piece may cut the decoration`);
 }
});

test('privacy and glass dividers separate people in front and behind in all rotations',()=>{
 for(const kind of ['privacy-screen','glass-partition'])for(let rotation=0;rotation<4;rotation++){
  const room={id:1,type:'waiting',x:2,y:2,w:6,h:5,furniture:[{id:'divider',kind,x:2,y:2,rotation}]},object=roomObjects(room).find(o=>o.furnitureId==='divider'),horizontal=object.w>object.h;
  const people=[-1,1].map((side,index)=>({id:100+index,x:(horizontal?object.x+object.w/2:side<0?object.x-.4:object.x+object.w+.4)-.5,y:(horizontal?side<0?object.y-.4:object.y+object.h+.4:object.y+object.h/2)-.5,state:'waiting'}));
  const layers=sceneLayers({rooms:[room]},people),divider=layers.findIndex(l=>l.object?.furnitureId==='divider');
  assert.ok(layers.findIndex(l=>l.person?.id===100)<divider);assert.ok(layers.findIndex(l=>l.person?.id===101)>divider);
 }
});

test('preparing receptionists retain their foreground hands above the counter',()=>{
 const g=new Game(),room=furnishedRoom(g,'reception',{x:15,y:12,w:5,h:4}).room,person={...workplace(room),id:90,roomId:room.id,role:'receptionist',state:'preparing',hasSeat:true,staff:true};
 const layers=sceneLayers(g,[person]),counter=layers.findIndex(l=>l.object?.kind==='counter'),hands=layers.findIndex(l=>l.kind==='hands');
 assert.ok(counter>=0&&hands>counter);assert.ok(layers.findIndex(l=>l.kind==='person')<hands);
});
