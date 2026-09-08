import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterAnimator,stepPose,skeleton,STRIDE,CHARACTER_SCALE} from '../src/animation.js';
import {Renderer} from '../src/renderer.js';
import {LOOKS} from '../src/characters.js';
import {Game} from '../src/game.js';
import {CAST} from '../src/content.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('gait follows actual distance at different frame rates and holds direction after stopping',()=>{
 let expected;for(const fps of [10,30,60,120]){const animator=new CharacterAnimator(),p={id:1,x:0,y:0,state:'travel'};animator.update(p,0);let pose;for(let i=1;i<=fps;i++){p.x=i/fps*2.5;pose=animator.update(p,i/fps);}near(pose.phase,2.5/STRIDE*Math.PI*2);if(expected)near(pose.yaw,expected.yaw);expected=pose;const phase=pose.phase,yaw=pose.yaw;for(let i=1;i<=fps;i++)pose=animator.update(p,1+i/fps);near(pose.phase,phase);near(pose.yaw,yaw);assert.ok(pose.walk<.0001);}
});
test('a planted foot stays fixed in world space and each complete step cycle closes',()=>{
 const start=stepPose(0);for(let t=0;t<.55;t+=.025){const pose=stepPose(t*Math.PI*2);assert.ok(pose.contact);near(pose.lift,0);near(t*STRIDE+pose.forward,start.forward);}
 near(stepPose(Math.PI*2-1e-8).forward,start.forward);for(let i=0;i<100;i++){const pose=stepPose(i/100*Math.PI*2);assert.ok(pose.lift>=0&&pose.lift<=.121);assert.ok(Math.abs(pose.forward)<=STRIDE*.276);}
});
test('all eight headings and seated transitions have finite continuous joints',()=>{
 for(let direction=0;direction<8;direction++){const animator=new CharacterAnimator(),p={id:direction,x:0,y:0,state:'travel'},yaw=direction*Math.PI/4;animator.update(p,0);let a;for(let i=1;i<=60;i++){p.x=Math.sin(yaw)*i/60;p.y=Math.cos(yaw)*i/60;a=animator.update(p,i/60);}assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-yaw),Math.cos(a.yaw-yaw)))<.00001);p.state='seated';p.lookYaw=0;let previous=skeleton(a,p);for(let i=1;i<=30;i++){a=animator.update(p,1+i/60);const current=skeleton(a,p);assert.ok(Math.abs(current.hip[2]-previous.hip[2])<.035);for(const leg of current.legs)for(const joint of [leg.hip,leg.knee,leg.foot])assert.ok(joint.every(Number.isFinite));previous=current;}assert.ok(a.sit>.99);p.state='waiting';for(let i=1;i<=30;i++)a=animator.update(p,1.5+i/60);assert.ok(a.sit<.01);}
});
function rendererForStaff(){return Object.assign(Object.create(Renderer.prototype),{staffVisuals:new Map(),layoutKey:'test',initializingActors:false,lastTime:0});}
test('staff use the full elapsed movement budget at 3x for 10/30/60 FPS',()=>{
 let expected;for(const fps of [10,30,60]){const game=new Game({seed:1});game.addRoom('gp',{x:1,y:1,w:5,h:3});const staff=game.hire('milo').staff,renderer=rendererForStaff();renderer.staffActor(staff,game,0);let actor;for(let i=1;i<=fps;i++){actor=renderer.staffActor(staff,game,i/fps*3);renderer.lastTime=i/fps*3;}if(expected){near(actor.x,expected.x);near(actor.y,expected.y);}expected=actor;}
});
test('staff enter wide rooms through the actual doorway and do not sit without a seat',()=>{
 const game=new Game({seed:1}),room=game.addRoom('gp',{x:1,y:9,w:10,h:3}).room,staff=game.hire('milo').staff,renderer=rendererForStaff();let before=renderer.staffActor(staff,game,0),crossed=false;
 for(let i=1;i<1000;i++){const current=renderer.staffActor(staff,game,i/60);renderer.lastTime=i/60;if(!game.contains(room,before)&&game.contains(room,current)){near(current.x,game.door(room).x);crossed=true;}before=current;}
 assert.ok(crossed);staff.resting=true;const actor=renderer.staffActor(staff,game,20),animator=new CharacterAnimator();animator.update(actor,20);const pose=animator.update(actor,21);assert.equal(actor.hasSeat,false);near(pose.sit,0);
});
test('all original staff and patients have complete modeled appearances at the smaller scale',()=>{
 for(const person of CAST)assert.ok(LOOKS[person.id]);for(let i=0;i<3;i++)assert.ok(LOOKS[`patient-${i}`]);assert.ok(CHARACTER_SCALE<=1);
});

test('break seats remain reserved when another employee leaves or joins the lounge',()=>{
 const game=new Game({seed:1});game.addRoom('lounge',{x:2,y:2,w:5,h:3});const employees=['milo','bea','otto'].map(id=>game.hire(id).staff),r=rendererForStaff();r.initializingActors=true;employees[0].resting=true;employees[1].resting=true;r.staffActor(employees[0],game,0);const before=r.staffActor(employees[1],game,0);employees[0].resting=false;employees[2].resting=true;const after=r.staffActor(employees[1],game,.1),newcomer=r.staffActor(employees[2],game,.1);near(before.x,after.x);near(before.y,after.y);assert.notEqual(newcomer.x,after.x);assert.equal(r.loungeSeats.size,2);
});
