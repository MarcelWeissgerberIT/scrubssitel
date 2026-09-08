import {furnishedRoom,hireAndPlace,deployStaff} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterAnimator,stepPose,skeleton,STRIDE,CHARACTER_SCALE,characterScale,SEAT_HEIGHT,HIP_RADIUS} from '../src/animation.js';
import {Renderer} from '../src/renderer.js';
import {LOOKS} from '../src/characters.js';
import {Game} from '../src/game.js';
import {CAST} from '../src/content.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('gait follows actual distance at different frame rates and holds direction after stopping',()=>{
 let expected;for(const fps of [10,30,60,120]){const animator=new CharacterAnimator(),p={id:1,x:0,y:0,state:'travel'};animator.update(p,0);let pose;for(let i=1;i<=fps;i++){p.x=i/fps*2.5;pose=animator.update(p,i/fps);}near(pose.phase,2.5/(STRIDE*characterScale(p))*Math.PI*2);if(expected)near(pose.yaw,expected.yaw);expected=pose;const phase=pose.phase,yaw=pose.yaw;for(let i=1;i<=fps;i++)pose=animator.update(p,1+i/fps);near(pose.phase,phase);near(pose.yaw,yaw);assert.ok(pose.walk<.0001);}
});
test('a planted foot stays fixed in world space and each complete step cycle closes',()=>{
 const start=stepPose(0);for(let t=0;t<.55;t+=.025){const pose=stepPose(t*Math.PI*2);assert.ok(pose.contact);near(pose.lift,0);near(t*STRIDE+pose.forward,start.forward);}
 near(stepPose(Math.PI*2-1e-8).forward,start.forward);for(let i=0;i<100;i++){const pose=stepPose(i/100*Math.PI*2);assert.ok(pose.lift>=0&&pose.lift<=.121);assert.ok(Math.abs(pose.forward)<=STRIDE*.276);}
});
test('all eight headings and seated transitions have finite continuous joints',()=>{
 for(let direction=0;direction<8;direction++){const animator=new CharacterAnimator(),p={id:direction,x:0,y:0,state:'travel'},yaw=direction*Math.PI/4;animator.update(p,0);let a;for(let i=1;i<=60;i++){p.x=Math.sin(yaw)*i/60;p.y=Math.cos(yaw)*i/60;a=animator.update(p,i/60);}assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-yaw),Math.cos(a.yaw-yaw)))<.00001);p.state='seated';p.lookYaw=0;let previous=skeleton(a,p);for(let i=1;i<=30;i++){a=animator.update(p,1+i/60);const current=skeleton(a,p);assert.ok(Math.abs(current.hip[2]-previous.hip[2])<.035);for(const leg of current.legs)for(const joint of [leg.hip,leg.knee,leg.foot])assert.ok(joint.every(Number.isFinite));previous=current;}assert.ok(a.sit>.99);p.state='waiting';for(let i=1;i<=30;i++)a=animator.update(p,1.5+i/60);assert.ok(a.sit<.01);}
});
function rendererForStaff(){return Object.assign(Object.create(Renderer.prototype),{staffVisuals:new Map(),layoutKey:'test',initializingActors:false,lastTime:0});}
test('staff presentation interpolates actual simulated positions without advancing their journey',()=>{
 const game=new Game({seed:1});furnishedRoom(game,'gp',{x:1,y:1,w:5,h:3});const s=hireAndPlace(game,'milo').staff,r=rendererForStaff();r.previousPatients=new Map();r.captureStep(game);game.admissionsOpen=true;game.arrivalTimer=1e9;game.update(.05);const snapshot=game.snapshot(),a=r.staffActor(s,game,1,0),b=r.staffActor(s,game,1,1),middle=r.staffActor(s,game,1,.5);near(middle.x,(a.x+b.x)/2);near(middle.y,(a.y+b.y)/2);assert.deepEqual(game.snapshot(),snapshot);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>0);
});
test('staff enter wide rooms through an open doorway and never sit without a real seat',()=>{
 const game=new Game({seed:1}),room=furnishedRoom(game,'gp',{x:1,y:9,w:10,h:3}).room,s=hireAndPlace(game,'milo').staff,renderer=rendererForStaff();game.admissionsOpen=true;game.arrivalTimer=1e9;game.nextEvent=1e9;let before={x:s.x,y:s.y},crossed=false;
 for(let i=0;i<1000&&!game.staffReady(s);i++){game.update(.05);if(!game.contains(room,before)&&game.contains(room,s)){near(s.x,game.door(room).x);assert.ok(room.doorOpen>=.85);crossed=true;}assert.ok(Math.hypot(s.x-before.x,s.y-before.y)<=.140001);before={x:s.x,y:s.y};}
 assert.ok(game.staffReady(s));game.requestBreak(s.id);for(let i=0;i<1000&&s.state!=='break';i++)game.update(.05);assert.equal(s.state,'break');const actor=renderer.staffActor(s,game,20),animator=new CharacterAnimator();animator.update(actor,20);const pose=animator.update(actor,21);assert.equal(actor.hasSeat,false);near(pose.sit,0);before={x:s.x,y:s.y};for(let i=0;i<4000&&!game.staffReady(s);i++){game.update(.05);if(!game.contains(room,before)&&game.contains(room,s)){near(s.x,game.door(room).x);assert.ok(room.doorOpen>=.85);crossed=true;}assert.ok(Math.hypot(s.x-before.x,s.y-before.y)<=.140001);before={x:s.x,y:s.y};}assert.ok(crossed,'return from break must pass the open door');assert.ok(game.staffReady(s));
});
test('all original staff and patients have complete modeled appearances at the smaller scale',()=>{
 for(const person of CAST)assert.ok(LOOKS[person.id]);for(let i=0;i<3;i++)assert.ok(LOOKS[`patient-${i}`]);assert.ok(CHARACTER_SCALE<=1);
});

test('break seat reservations persist when another employee leaves or joins the lounge',()=>{
 const game=new Game({seed:1});furnishedRoom(game,'lounge',{x:2,y:2,w:5,h:3});const employees=['otto','otto','otto'].map(id=>hireAndPlace(game,id).staff);game.admissionsOpen=true;game.arrivalTimer=1e9;game.nextEvent=1e9;game.requestBreak(employees[0].id);game.requestBreak(employees[1].id);game.update(.05);const roomId=employees[1].breakRoomId,index=employees[1].breakSeatIndex;assert.notEqual(index,null);game.dismiss(employees[0].id);game.requestBreak(employees[2].id);game.update(.05);assert.equal(employees[1].breakRoomId,roomId);assert.equal(employees[1].breakSeatIndex,index);assert.notEqual(employees[2].breakSeatIndex,index);
});

test('adult and child support feet retain their world position through a planted step',()=>{
 for(const child of [false,true])for(let heading=0;heading<8;heading++){
  const yaw=heading*Math.PI/4,p={id:1,x:0,y:0,child,state:'travel'},animator=new CharacterAnimator(),scale=characterScale(p);animator.update(p,0);const initial=stepPose(0).forward*scale;
  for(let i=1;i<=30;i++){const distance=i/30*STRIDE*scale*.5;p.x=Math.sin(yaw)*distance;p.y=Math.cos(yaw)*distance;const a=animator.update(p,i/60),foot=stepPose(a.phase);assert.ok(foot.contact);near(p.x+Math.sin(yaw)*foot.forward*scale,Math.sin(yaw)*initial);near(p.y+Math.cos(yaw)*foot.forward*scale,Math.cos(yaw)*initial);}
 }
});

test('seated staff start on their chair and all ages meet the actual cushion height',()=>{
 for(const p of [{id:1,role:'receptionist',hasSeat:true,state:'idle'},{id:2,hasSeat:true,state:'resting'},{id:3,child:true,state:'seated'}]){const a=new CharacterAnimator().update({...p,x:0,y:0},0);near(a.sit,1);const pose=skeleton(a,p);near((pose.hip[2]-HIP_RADIUS)*characterScale(p),SEAT_HEIGHT);}
 const a=new CharacterAnimator().update({id:4,x:0,y:0,hasSeat:false,state:'resting'},0);near(a.sit,0);
});
