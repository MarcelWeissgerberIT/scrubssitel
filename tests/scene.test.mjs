import {furnishedRoom} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {sceneLayers,roomWalls} from '../src/scene.js';
import {roomObjects,furniturePorts,furniturePoint,findObject,OBJECT_INFO,FURNITURE} from '../src/objects.js';
import {upholsteryPieces} from '../src/room-art.js';
import {workplace} from '../src/staff.js';
import {skeleton,characterScale,seatOffset,HIP_RADIUS,SEAT_HEIGHT} from '../src/animation.js';

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

function seatScene(kind,rotation,child=false){
 const room={id:1,type:'waiting',x:2,y:8,w:6,h:5,ready:true,furniture:[{id:'seat',kind,x:2,y:1.5,rotation}]},game={rooms:[room]};
 const people=furniturePorts(room).filter(port=>port.kind==='seat').map((port,index)=>({...port,id:100+index,state:'seated',child,pose:{time:0,sit:1,walk:0,phase:0,work:0,celebrate:0,yaw:port.lookYaw}}));
 return {room,game,people,object:roomObjects(room).find(o=>o.furnitureId==='seat')};
}
const worldBone=(person,bone)=>{const scale=characterScale(person),yaw=person.pose.yaw,offset=seatOffset(person,person.pose);return {x:person.x+.5+offset.x+(bone[0]*Math.cos(yaw)+bone[1]*Math.sin(yaw))*scale,y:person.y+.5+offset.y+(-bone[0]*Math.sin(yaw)+bone[1]*Math.cos(yaw))*scale,z:bone[2]*scale};};

test('each occupied seat interleaves with its cushion, back and arms instead of a whole foreground sofa',()=>{
 for(const kind of ['chair','sofa'])for(let rotation=0;rotation<4;rotation++)for(const child of [false,true]){
  const {game,people,object}=seatScene(kind,rotation,child),empty=sceneLayers(game,[]).filter(l=>l.object?.furnitureId==='seat');
  assert.deepEqual(new Set(empty.map(l=>l.object.renderPart)),new Set(['base','back','arm-left','arm-right']));
  for(const occupants of [people.slice(0,1),people.slice(-1),people]){
   const layers=sceneLayers(game,occupants),part=name=>layers.findIndex(l=>l.object?.furnitureId==='seat'&&l.object.renderPart===name),base=part('base'),back=part('back');
   for(const person of occupants){const at=layers.findIndex(l=>l.person?.id===person.id);assert.ok(base<at,`${kind}/${rotation}: cushion must support the visible seated body`);assert.ok([1,2].includes(rotation)?at<back:back<at,`${kind}/${rotation}: only the correctly oriented back may cover the seated body`);}
   for(const name of ['back','arm-left','arm-right'])assert.ok(base<part(name));
   for(const layer of empty){const actual=layers.find(l=>l.object?.furnitureId==='seat'&&l.object.renderPart===layer.object.renderPart);assert.equal(actual.depth,layer.depth,'occupancy must not move the furniture');}
  }
  assert.equal(object.renderPart,undefined,'persisted/catalog furniture remains one unsplit object');
 }
});

test('adult and child knees clear the seat front while hips stay on the cushion in every rotation',()=>{
 for(const kind of ['chair','sofa'])for(let rotation=0;rotation<4;rotation++)for(const child of [false,true]){
  const {room,people}=seatScene(kind,rotation,child),furniture=room.furniture[0],origin=furniturePoint(room,furniture,{x:0,y:0}),forward=furniturePoint(room,furniture,{x:0,y:1}),axis={x:forward.x-origin.x,y:forward.y-origin.y};
  for(const person of people){const anchor={x:person.x,y:person.y},bones=skeleton(person.pose,person),hip=worldBone(person,bones.hip),localForward=p=>(p.x-origin.x)*axis.x+(p.y-origin.y)*axis.y;
   assert.ok(Math.abs(hip.z-HIP_RADIUS*characterScale(person)-SEAT_HEIGHT)<1e-9,'hips must contact the .32-high cushion');
   assert.ok(localForward(hip)>.2&&localForward(hip)<.69,'pelvis stays supported by the actual cushion');
   for(const leg of bones.legs){const knee=worldBone(person,leg.knee),foot=worldBone(person,leg.foot);assert.ok(localForward(knee)>.75,'knee must reach beyond the furniture footprint');assert.ok(localForward(foot)>.75,'ankle must not descend through the sofa base');assert.ok(knee.z>SEAT_HEIGHT);const sole=foot.z-.047*characterScale(person);assert.ok(child?sole>.075&&sole<.12:Math.abs(sole)<.004,'adult soles touch the floor; children have naturally shorter dangling legs');}
   assert.deepEqual({x:person.x,y:person.y},anchor,'presentation corrections cannot mutate saved seat coordinates');
   const offset=seatOffset(person,person.pose);assert.ok(Math.abs(offset.x-(hip.x-person.x-.5))<1e-9);assert.ok(Math.abs(offset.y-(hip.y-person.y-.5))<1e-9,'scene depth and skeleton must use the same presentation anchor');
   const standingOffset=seatOffset(person,{sit:0,yaw:person.pose.yaw});assert.equal(Math.hypot(standingOffset.x,standingOffset.y),0);
  }
 }
 const receptionist={role:'receptionist',hasSeat:true,state:'working',lookYaw:0};assert.deepEqual(seatOffset(receptionist,{sit:1,yaw:0}),{x:0,y:0},'reception hands must retain their keyboard alignment');
});

test('split upholstery retains one stable hit and editor identity in all rotations',()=>{
 for(const kind of ['chair','sofa'])for(let rotation=0;rotation<4;rotation++){
  const {game,object}=seatScene(kind,rotation),before=JSON.stringify(game.rooms),parts=upholsteryPieces(object);
  assert.equal(parts.length,4);assert.equal(new Set(parts.map(p=>p.renderPart)).size,4);
  for(const part of parts){assert.equal(part.id,object.id);assert.equal(part.furnitureId,object.furnitureId);assert.equal(part.roomId,object.roomId);assert.equal(findObject(game,part.id).furnitureId,object.furnitureId);assert.ok(part.occlusion.w>0&&part.occlusion.h>0&&part.occlusion.z>part.occlusion.base);}
  assert.equal(roomObjects(game.rooms[0]).filter(o=>o.furnitureId===object.furnitureId).length,1);assert.equal(JSON.stringify(game.rooms),before);
 }
});

// Exact orthographic viewing rays: screen x=(x-y)/2, screen y=.255*(x+y)-z.
// Their world direction toward the viewer is (1,1,.51). This is independent of
// scene.js's footprint-ordering heuristic and also catches adjacent furniture.
function rayInterval(point,box){let lo=-Infinity,hi=Infinity;for(const [name,d,min,max] of [['x',1,box.x,box.x+box.w],['y',1,box.y,box.y+box.h],['z',.51,box.base??0,box.z]]){lo=Math.max(lo,(min-point[name])/d);hi=Math.min(hi,(max-point[name])/d);}return lo<hi?[lo,hi]:null;}

test('visible furniture faces sort in front of and behind walking people along actual viewing rays',()=>{
 let checks=0;
 for(const kind of ['sofa','chair','snack-machine','drink-machine'])for(let rotation=0;rotation<4;rotation++){
  const room={id:1,type:'waiting',x:2,y:8,w:7,h:6,ready:true,furniture:[{id:'ray-object',kind,x:2,y:2,rotation}]},object=roomObjects(room).find(o=>o.furnitureId==='ray-object'),game={rooms:[room]};
  const anchors=[{x:object.x-.6,y:object.y+object.h/2},{x:object.x+object.w+.6,y:object.y+object.h/2},{x:object.x+object.w/2,y:object.y-.6},{x:object.x+object.w/2,y:object.y+object.h+.6},{x:object.x-.4,y:object.y-.4},{x:object.x+object.w+.4,y:object.y+object.h+.4}];
  for(const [id,anchor] of anchors.entries()){
   const person={id:100+id,x:anchor.x-.5,y:anchor.y-.5,state:'travel'},layers=sceneLayers(game,[person]),at=layers.findIndex(l=>l.person?.id===person.id);
   for(let i=0;i<layers.length;i++){const o=layers[i].object;if(o?.furnitureId!=='ray-object'||o.renderPart==='base')continue;const box=o.occlusion||o;
    for(const z of [.1,.3,.5,.7,.9]){const interval=rayInterval({...anchor,z},box);if(!interval)continue;if(interval[0]>.001){assert.ok(i>at,`${kind}/${rotation}: nearer furniture surface cannot shine through the walker`);checks++;}else if(interval[1]<-.001){assert.ok(i<at,`${kind}/${rotation}: walker must cover the farther furniture surface`);checks++;}}
   }
  }
 }
 assert.ok(checks>30,'exercise actual overlapping viewing rays rather than vacuous depth comparisons');
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
