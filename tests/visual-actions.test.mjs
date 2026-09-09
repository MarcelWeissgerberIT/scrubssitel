import test from 'node:test';
import assert from 'node:assert/strict';
import {actionFor,CharacterAnimator,skeleton} from '../src/animation.js';
import {expressionFor} from '../src/characters.js';
import {sceneLayers} from '../src/scene.js';
import {roomObjects,furniturePoint} from '../src/objects.js';
import {Renderer} from '../src/renderer.js';
import {Game} from '../src/game.js';
import {applyRoomChange} from '../src/room-resize.js';

test('real work phases choose distinct actions while travel has no pretend work',()=>{
 for(const [kind,expected] of [['dirt','mop'],['fault','repair']]){assert.equal(actionFor({job:{kind,phase:'work'}}),expected);assert.equal(actionFor({job:{kind,phase:'travel'},state:'travel'}),null);}
 for(const kind of ['read','play']){assert.equal(actionFor({activity:{kind,phase:'use'}}),kind);assert.equal(actionFor({activity:{kind,phase:'travel'}}),null);}
 assert.equal(actionFor({activity:{kind:'toilet',phase:'wash'}}),'wash');
 for(const [department,expected] of Object.entries({gp:'examine',pharmacy:'dispense',therapy:'soothe',surgery:'operate',lab:'research'}))assert.equal(actionFor({state:'working',role:'doctor',department}),expected);
 assert.equal(actionFor({state:'working',role:'receptionist',department:'reception'}),null,'keyboard remains the existing receptionist rig');
});

test('actions preserve support feet and pause without a presentation clock advancing',()=>{
 for(const action of ['wash','read','play','mop','repair','examine','dispense','soothe','operate','research'])for(const child of [false,true])for(let heading=0;heading<8;heading++){
  const person={id:103,child,x:2,y:2,lookYaw:heading*Math.PI/4},base={time:1,phase:0,walk:0,sit:0,work:0,celebrate:0,yaw:person.lookYaw},idle=skeleton(base,person),active=skeleton({...base,work:1,action,actionTime:.5},person);
  assert.deepEqual(active.legs,idle.legs);assert.deepEqual(active.hip,idle.hip);assert.deepEqual(active.head,idle.head);
  assert.ok(active.arms.flatMap(a=>[...a.hand,...a.elbow]).every(Number.isFinite));
 }
 const person={id:1,x:2,y:2,activity:{kind:'read',phase:'use',elapsed:.5}},animator=new CharacterAnimator();animator.update(person,0);const pose=animator.update(person,1);
 assert.deepEqual(animator.update(person,1),pose);assert.deepEqual(skeleton(animator.update(person,1),person),skeleton(pose,person));
});

test('mood follows the same happiness data and cured outcomes without identity assumptions',()=>{
 for(const castId of ['milo','rosa','bea'])for(const [happiness,mood] of [[95,'happy'],[60,'calm'],[40,'sad'],[15,'angry']])assert.equal(expressionFor({castId,happiness}),mood);
 assert.equal(expressionFor({happiness:10,cured:true}),'happy');
});

test('the actual WC door leaf rotates inside its cubicle with stable selection identity',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const furniture={id:'cab',kind:'toilet-cubicle',x:1,y:1,rotation},room={id:1,type:'toilet',x:2,y:9,w:6,h:6,furniture:[furniture]},patient={id:1,activity:{kind:'toilet',roomId:1,furnitureId:'cab',phase:'open',elapsed:0}},game={rooms:[room],patients:[patient]};
  const id=roomObjects(room).find(o=>o.kind==='cubicle-door').id,closed=sceneLayers(game,[]).filter(l=>l.object?.kind==='cubicle-door');
  assert.equal(closed.length,5);assert.deepEqual(new Set(closed.map(l=>l.object.renderPart)),new Set(['jamb-left','jamb-right','header','leaf-left','leaf-right']));
  patient.activity.elapsed=.4;const opened=sceneLayers(game,[]).filter(l=>l.object?.kind==='cubicle-door'),leaf=opened.find(l=>l.object.renderPart==='leaf-right').object;
  assert.notDeepEqual(leaf.occlusion,closed.find(l=>l.object.renderPart==='leaf-right').object.occlusion);
  for(const part of opened){assert.equal(part.object.id,id);assert.equal(part.object.furnitureId,'cab');assert.ok(part.object.occlusion.z>part.object.occlusion.base);}
  const corners=[[0,0],[1.5,0],[0,2],[1.5,2]].map(([x,y])=>furniturePoint(room,furniture,{x,y})),xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),b=leaf.occlusion;
  assert.ok(b.x>=Math.min(...xs)&&b.x+b.w<=Math.max(...xs)&&b.y>=Math.min(...ys)&&b.y+b.h<=Math.max(...ys),'leaf must not swing into the outside access route');
  assert.deepEqual(sceneLayers(game,[]),sceneLayers(game,[]),'paused scene is stable');
 }
});

test('room-transform pointer and keyboard previews are reversible and commit only valid rectangles',()=>{
 const game=new Game({mode:'sandbox',seed:211}),room=game.addRoom('gp',{x:2,y:2,w:3,h:3},true).room;
 const canvas={style:{},getBoundingClientRect:()=>({left:0,top:0}),releasePointerCapture(){}},previews=[];
 const r=Object.assign(Object.create(Renderer.prototype),{canvas,game,tw:100,th:51,ox:0,oy:0,editor:{roomId:room.id,tool:null},carriedStaffId:null,activePointerId:null,options:{onRoomTransformPreview:p=>previews.push(p),onRoomTransform:(id,rect)=>!applyRoomChange(game,id,rect).error}});
 const before=game.snapshot();assert.equal(r.beginRoomTransform(room.id,'move'),true);
 const event=(x,y)=>{const p=r.project(x,y);return {clientX:p.x,clientY:p.y};};
 r.startRoomTransformDrag(event(3,3));r.updateRoomTransform(event(4,3));assert.deepEqual(r.roomTransform.rect,{x:3,y:2,w:3,h:3});assert.deepEqual(game.snapshot(),before,'drag is a preview only');
 r.cancelRoomTransform();assert.deepEqual(game.snapshot(),before,'cancel preserves the game');
 assert.equal(r.beginRoomTransform(room.id,'resize'),true);r.startRoomTransformDrag(event(5,5));r.updateRoomTransform(event(6,7));assert.deepEqual(r.roomTransform.rect,{x:2,y:2,w:4,h:5});assert.equal(r.commitRoomTransform(),true);assert.equal(room.w,4);assert.equal(room.h,5);assert.equal(r.roomTransform,null);
 r.beginRoomTransform(room.id,'resize');const cash=game.cash;r.setRoomTransformRect({x:2,y:2,w:1,h:5});assert.ok(r.roomTransform.preview.error);assert.equal(r.commitRoomTransform(),false);assert.equal(game.cash,cash);assert.equal(room.w,4);
 const key={key:'Escape',preventDefault(){},stopPropagation(){}};r.roomTransformKey(key);assert.equal(r.roomTransform,null);assert.ok(previews.length>4);
});
