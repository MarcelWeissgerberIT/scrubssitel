import {furnishedRoom} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {sceneLayers} from '../src/scene.js';
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
