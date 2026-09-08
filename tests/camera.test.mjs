import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {Game} from '../src/game.js';

// Exercise production pointer handlers without a browser or a drawing dependency.
// Painted hit detection is covered by the native canvas harness; these fixtures
// supply the kind of painted surface beneath a press.
function fixture(){
 const game=new Game({mode:'sandbox',seed:29}),room=game.addRoom('waiting',{x:2,y:2,w:4,h:3}).room;
 const selected=[],picked=[],built=[],modes=[],captures=new Set();let hit=null;
 const canvas={style:{},focus(){},setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),getBoundingClientRect:()=>({left:31,top:47,width:1200,height:740})};
 const r=Object.assign(Object.create(Renderer.prototype),{canvas,game,w:1200,h:740,zoom:1,pan:{x:0,y:0},panMode:false,panCandidate:null,staffPickCandidate:null,activePointerId:null,carriedStaffId:null,pointer:null,down:null,drag:null,panning:false,editor:null,buildType:null,previousStaff:new Map(),animator:{actors:new Map()}});
 r.options={onSelect:(...args)=>selected.push(args),onBuild:(...args)=>built.push(args),onStaffPick:id=>{picked.push(id);return true;},onPanModeChange:mode=>{modes.push(mode);assert.equal(r.setPanMode(mode),mode);}};
 r.hitAt=()=>hit;r.metrics();
 const point=(x=3.5,y=3.5)=>{const p=r.project(x,y);return {clientX:p.x+31,clientY:p.y+47,button:0,pointerId:1,pointerType:'mouse'};};
 const moved=(p,x,y,extra={})=>({...p,clientX:p.clientX+x,clientY:p.clientY+y,...extra});
 const panIs=(x,y)=>assert.ok(Math.hypot(r.pan.x-x,r.pan.y-y)<1e-8,`pan ${r.pan.x},${r.pan.y} != ${x},${y}`);
 return {r,game,room,selected,picked,built,modes,captures,point,moved,panIs,setHit:value=>{hit=value;}};
}

test('room-floor clicks select while deliberate left drags pan without changing the clinic',()=>{
 const f=fixture(),{r,point,moved,panIs}=f,p=point(),snapshot=f.game.snapshot();
 r.pointerDown(p);r.pointerMove(moved(p,3,2));panIs(0,0);r.pointerUp(moved(p,3,2));
 assert.deepEqual(f.selected,[['room',f.room.id]]);
 r.pointerDown(p);r.pointerMove(moved(p,32,-15));r.pointerMove(moved(p,51,-22));r.pointerUp(moved(p,51,-22));
 panIs(51,-22);assert.equal(f.selected.length,1);assert.equal(f.picked.length,0);assert.equal(f.built.length,0);assert.equal(f.captures.size,0);
 assert.deepEqual(f.game.snapshot(),snapshot);
});

test('touch panning honors its threshold and canceled or unrelated pointers cannot select or build',()=>{
 const f=fixture(),{r,moved,panIs}=f,p={...f.point(),pointerType:'touch'};
 r.pointerDown(p);r.pointerMove(moved(p,7,0));panIs(0,0);
 r.pointerMove(moved(p,40,20,{pointerId:2}));panIs(0,0);
 r.pointerMove(moved(p,25,11));panIs(25,11);
 r.clearPointer();r.pointerUp(moved(p,25,11));
 assert.equal(r.panCandidate,null);assert.equal(r.panning,false);assert.equal(f.selected.length,0);assert.equal(f.built.length,0);assert.equal(f.captures.size,0);
});

test('explicit pan mode moves over people and furniture without selecting or picking them up',()=>{
 const f=fixture(),{r,point,moved,panIs}=f;
 assert.equal(r.setPanMode(true),true);assert.equal(r.setPanMode(true),true);assert.deepEqual(f.modes,[true]);
 for(const type of ['staff','patient','object']){
  f.setHit({type,id:123});const p=point(),before={...r.pan};
  r.pointerDown(p);r.pointerMove(moved(p,23,-12));r.pointerUp(moved(p,23,-12));panIs(before.x+23,before.y-12);
  r.pointerDown(p);r.pointerUp(p);
 }
 assert.equal(f.picked.length,0);assert.equal(f.selected.length,0);assert.equal(r.canvas.style.cursor,'grab');
 assert.equal(r.setPanMode(false),false);assert.deepEqual(f.modes,[true,false]);
});

test('right and middle drag remain available while construction and editor tools stay untouched',()=>{
 const f=fixture(),{r,point,moved,panIs}=f;
 for(const mode of ['build','editor'])for(const button of [1,2]){
  const p={...point(),button},before={...r.pan};r.buildType=mode==='build'?'gp':null;r.editor=mode==='editor'?{roomId:f.room.id,tool:{kind:'chair',x:1,y:1,rotation:0}}:null;const editorBefore=structuredClone(r.editor);
  r.pointerDown(p);r.pointerMove(moved(p,17,9));r.pointerUp(moved(p,17,9));panIs(before.x+17,before.y+9);
  assert.equal(r.buildType,mode==='build'?'gp':null);assert.deepEqual(r.editor,editorBefore);assert.equal(r.drag,null);
 }
 assert.equal(f.built.length,0);assert.equal(f.selected.length,0);
});

test('pickup, editor and build actions leave pan mode and prevent conflicting activation',()=>{
 const f=fixture(),{r,game,point,moved}=f,staff=game.hireApplicant(game.applicants('doctor')[0].id).staff;
 r.setPanMode(true);assert.equal(r.pickUpStaff(staff.id),true);assert.equal(r.panMode,false);assert.equal(r.setPanMode(true),false);r.cancelStaffCarry();
 r.setPanMode(true);r.startEditor(f.room.id);assert.equal(r.panMode,false);assert.equal(r.setPanMode(true),false);r.editor=null;
 r.setPanMode(true);r.buildType='gp';const p=point();r.pointerDown(p);assert.equal(r.panMode,false);assert.equal(r.setPanMode(true),false);
 r.pointerMove(moved(p,40,20));r.pointerUp(moved(p,40,20));assert.equal(f.built.length,1);assert.equal(f.picked.length,1);
});
