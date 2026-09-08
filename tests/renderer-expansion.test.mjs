import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {Game,ENTRY} from '../src/game.js';

// Native drawing is checked separately. These dependency-free fixtures record
// world geometry and exercise the real canvas input handlers.
function fixture(w=1200,h=740){
 const handlers={},selected=[],built=[],ctx=new Proxy({measureText:s=>({width:s.length*7})},{get:(o,k)=>k in o?o[k]:()=>{}});
 const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({left:31,top:47,width:w,height:h}),addEventListener:(name,handler)=>{handlers[name]=handler;},focus(){},setPointerCapture(){},releasePointerCapture(){}};
 const previousObserver=globalThis.ResizeObserver,previousRatio=globalThis.devicePixelRatio;
 globalThis.ResizeObserver=class{observe(){}};globalThis.devicePixelRatio=1;
 let r;try{r=new Renderer(canvas,{onSelect:(...args)=>selected.push(args),onBuild:(...args)=>built.push(args)});}finally{if(previousObserver===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=previousObserver;if(previousRatio===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=previousRatio;}
 const game=new Game({mode:'sandbox',seed:122});r.game=game;r.metrics();
 return {r,game,handlers,selected,built,point:(x,y)=>{const p=r.project(x,y);return {clientX:p.x+31,clientY:p.y+47,button:0,pointerId:1,pointerType:'mouse'};}};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const buy=(game,id)=>assert.equal(game.expand(id).error,undefined);

test('all purchased grids fit and center without changing world coordinates or the entrance',()=>{
 for(const size of [[1200,740],[390,720]])for(const order of [[],['east'],['south'],['east','south'],['south','east']]){
  const {r,game,point}=fixture(...size);for(const id of order)buy(game,id);r.metrics();
  const {w,h}=game.grid,center=r.project(w/2,h/2);close(center.x,r.w/2);close(center.y,r.h/2+28);
  for(const [x,y] of [[0,0],[w,0],[w,h],[0,h]]){const p=r.project(x,y);assert.ok(p.x>=0&&p.x<=r.w&&p.y>=0&&p.y<=r.h,JSON.stringify({size,order,p}));}
  for(const [x,y] of [[ENTRY.x+.5,ENTRY.y+.5],[w-1.5,h-1.5]]){const ground=r.floorPoint(point(x,y));close(ground.x,x);close(ground.y,y);assert.deepEqual(r.tile(point(x,y)),{x:Math.floor(x),y:Math.floor(y)});}
  r.pan={x:29,y:-17};r.metrics();const shifted=r.project(w/2,h/2);close(shifted.x,r.w/2+29);close(shifted.y,r.h/2+11);
 }
 assert.deepEqual(ENTRY,{x:12,y:16});const {r}=fixture();close(r.tw,Math.min(1200/24.8,740/12.8));
});

test('wing previews fit beside the desktop panel and never extend actual placement bounds',()=>{
 for(const first of [null,'east','south'])for(const wing of ['east','south']){
  const {r,game}=fixture();if(first)buy(game,first);r.expansionPreview=wing;const snapshot=game.snapshot(),rect=r.expansionRect();
  if(first===wing){assert.equal(rect,null);continue;}
  const {w,h}=game.grid;assert.deepEqual({x:rect.x,y:rect.y,w:rect.w,h:rect.h},wing==='east'?{x:w,y:0,w:6,h}:{x:0,y:h,w,h:6});
  const proposed={x:rect.x+1,y:rect.y+2,w:3,h:3};assert.ok(game.placement('waiting',proposed));r.metrics();
  const union={w:w+(wing==='east'?6:0),h:h+(wing==='south'?6:0)},center=r.project(union.w/2,union.h/2);close(center.x,(r.w-350)/2);
  for(const [x,y] of [[0,0],[union.w,0],[union.w,union.h],[0,union.h]]){const p=r.project(x,y);assert.ok(p.x>=0&&p.x<=r.w-350&&p.y>=0&&p.y<=r.h);}
  r.drawExpansionPreview();assert.deepEqual(game.snapshot(),snapshot);
  buy(game,wing);assert.equal(r.expansionRect(),null);assert.equal(game.placement('waiting',proposed),null);r.metrics();close(r.project(game.grid.w/2,game.grid.h/2).x,r.w/2);
 }
 const {r}=fixture(390,720);r.expansionPreview='east';r.metrics();close(r.project(15,9).x,195);
 r.expansionPreview='unknown';assert.equal(r.expansionRect(),null);
});

test('purchased wings draw ordinary floor and exterior walls to the new boundary',()=>{
 for(const order of [[],['east'],['south'],['east','south']]){
  const {r,game}=fixture();for(const id of order)buy(game,id);const tiles=[],boxes=[];
  r.tileFace=(...args)=>tiles.push(args);r.box=(...args)=>boxes.push(args);r.draw(game,0);
  const {w,h}=game.grid,floor=tiles.filter(t=>t[2]===1&&t[3]===1&&t[4]===.005);
  assert.equal(floor.length,w*h);assert.equal(new Set(floor.map(t=>`${t[0]},${t[1]}`)).size,w*h);
  assert.ok(floor.some(t=>t[0]===w-1&&t[1]===h-1));assert.ok(floor.every(t=>t[0]>=0&&t[0]<w&&t[1]>=0&&t[1]<h));
  assert.ok(boxes.some(b=>b[0]===-.3&&b[1]===-.3&&b[2]===w+.6&&b[3]===h+.6));
  assert.ok(boxes.some(b=>b[0]===0&&b[1]===0&&b[2]===w&&b[3]===.15));
  assert.ok(boxes.some(b=>b[0]===0&&b[1]===0&&b[2]===.15&&b[3]===h));
  for(const box of boxes.filter(b=>b[4]===1.12)){assert.ok(box[0]+box[2]<=w+.0001&&box[1]+box[3]<=h+.0001,'exterior windows stay inside the enlarged wall');}
 }
});

test('keyboard building and floor selection reach new land after buying both wings',()=>{
 const {r,game,handlers,selected,built,point}=fixture();buy(game,'south');buy(game,'east');
 const result=game.addRoom('waiting',{x:25,y:19,w:3,h:3});assert.equal(result.error,undefined);r.metrics();r.hitAt=()=>null;
 const p=point(26.5,20.5);r.pointerDown(p);r.pointerUp(p);assert.deepEqual(selected,[['room',result.room.id]]);
 r.buildType='waiting';const key=key=>handlers.keydown({key,preventDefault(){}});
 for(let i=0;i<40;i++){key('ArrowRight');key('ArrowDown');}assert.deepEqual(r.keyboard,{x:28,y:22});key('Enter');
 key('ArrowLeft');key('ArrowLeft');key('ArrowUp');key('ArrowUp');key('Enter');assert.deepEqual(built,[['waiting',{x:26,y:20,w:3,h:3}]]);
 r.game=new Game({mode:'sandbox',seed:3});key('ArrowRight');key('ArrowDown');assert.deepEqual(r.keyboard,{x:22,y:16});
});
