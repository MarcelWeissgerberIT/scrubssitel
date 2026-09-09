import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {ROOMS} from '../src/content.js';
import {previewRoomChange,applyRoomChange,roomChangeCost} from '../src/room-resize.js';
import {layoutStatus,furnitureBlocked} from '../src/layout.js';
import {furnishedRoom,hireAndPlace} from './helpers.mjs';

const ok=result=>{assert.equal(result?.error,undefined,result?.error);return result;};
function draft(){const g=new Game({mode:'sandbox',seed:3}),r=ok(g.addRoom('gp',{x:2,y:2,w:4,h:4})).room;ok(g.autoFurnish(r.id));return {g,r};}

test('room preview is read-only and apply preserves room, furniture, purchases and level identities',()=>{
 const {g,r}=draft();ok(g.upgrade(r.id));const furniture=r.furniture,before=g.snapshot(),rect={x:8,y:2,w:5,h:5},quote=previewRoomChange(g,r.id,rect);
 assert.equal(quote.error,null);assert.equal(quote.cost,9*Math.ceil(ROOMS.gp.cost/9)+Math.ceil(ROOMS.gp.cost*.15));assert.deepEqual(g.snapshot(),before);
 const result=ok(applyRoomChange(g,r.id,rect));assert.equal(result.room,r);assert.equal(r.furniture,furniture);assert.deepEqual(r.furniture,before.rooms[0].furniture);assert.equal(r.level,2);assert.equal(r.editing,true);assert.equal(g.cash,before.cash-quote.cost);assert.equal(g.construction,before.construction+quote.cost);assert.equal(layoutStatus(r).ready,true);
 assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
 const unchanged=g.snapshot();assert.equal(ok(applyRoomChange(g,r.id,rect)).cost,0);assert.deepEqual(g.snapshot(),unchanged);
});

test('shrinking and moving cannot manufacture a refund or raise the room sale value',()=>{
 const {g,r}=draft(),before=g.cash;ok(applyRoomChange(g,r.id,{x:2,y:2,w:3,h:3}));assert.equal(g.cash,before);
 const cost=roomChangeCost(r,{x:8,y:2,w:3,h:3});ok(applyRoomChange(g,r.id,{x:8,y:2,w:3,h:3}));assert.equal(g.cash,before-cost);
 ok(applyRoomChange(g,r.id,{x:2,y:2,w:3,h:3}));assert.equal(g.cash,before-cost*2);
 const priorSale=g.cash;ok(g.sell(r.id));assert.equal(g.cash-priorSale,Math.round(ROOMS.gp.cost*.5));
});

test('room changes reject collisions, invalid geometry, blocked doors and inaccessible furniture atomically',()=>{
 const {g,r}=draft();ok(g.addRoom('waiting',{x:9,y:2,w:4,h:4}));
 for(const [rect,error] of [[{x:9,y:2,w:4,h:4},'invalidRoom'],[{x:22,y:2,w:4,h:4},'invalidRoom'],[{x:2.5,y:2,w:4,h:4},'smallRoom'],[{x:2,y:2,w:2,h:4},'smallRoom'],[{x:2,y:2,w:11,h:4},'smallRoom'],[{x:11,y:14,w:4,h:3},'badPlacement']]){const before=g.snapshot();assert.equal(applyRoomChange(g,r.id,rect).error,error);assert.deepEqual(g.snapshot(),before);}
 const other=ok(g.addRoom('waiting',{x:2,y:7,w:4,h:3})).room,before=g.snapshot();assert.equal(previewRoomChange(g,r.id,{x:2,y:2,w:4,h:5}).error,'badPlacement');assert.deepEqual(g.snapshot(),before);
 ok(g.sell(other.id));ok(g.addFurniture(r.id,'cabinet',{x:3,y:1,rotation:0}));assert.equal(previewRoomChange(g,r.id,{x:2,y:2,w:3,h:4}).error,'furnitureBounds');
 const poor=draft();poor.g.cash=0;assert.equal(applyRoomChange(poor.g,poor.r.id,{x:8,y:2,w:4,h:4}).error,'notEnough');
 poor.g.cash=-1;assert.equal(ok(applyRoomChange(poor.g,poor.r.id,{x:2,y:2,w:3,h:3})).cost,0);assert.equal(poor.g.cash,-1);
});

test('physical actors and reserved corridor destinations cannot be covered by a moved room',()=>{
 const {g,r}=draft(),s=ok(g.hire('otto')).staff;
 const rect={x:8,y:9,w:4,h:4};Object.assign(s,{x:9,y:10});assert.equal(previewRoomChange(g,r.id,rect).error,'roomResizeOccupied');
 Object.assign(s,{x:13,y:15,destination:{x:9,y:10,roomId:null,arrival:'break'}});assert.equal(previewRoomChange(g,r.id,rect).error,'roomResizeOccupied');
 s.destination=null;assert.equal(previewRoomChange(g,r.id,rect).error,null);
});

test('an occupied room clears normally, moves without teleporting staff, and reopens with the same assignment',()=>{
 const g=new Game({mode:'sandbox',seed:9}),r=ok(furnishedRoom(g,'gp',{x:2,y:2,w:4,h:4})).room,s=ok(hireAndPlace(g,'milo')).staff;
 for(let i=0;i<600&&!g.staffReady(s);i++)g.update(.05);assert.equal(g.staffReady(s),true);
 const target={x:8,y:2,w:4,h:4};assert.equal(previewRoomChange(g,r.id,target).error,'roomResizeBusy');assert.equal(ok(g.beginRoomEdit(r.id)).pending,true);
 for(let i=0;i<600&&!r.editing;i++)g.update(.05);assert.equal(r.editing,true);const old={x:s.x,y:s.y};ok(applyRoomChange(g,r.id,target));assert.deepEqual({x:s.x,y:s.y},old);assert.equal(s.roomId,r.id);ok(g.finishRoom(r.id));
 for(let i=0;i<800&&!g.staffReady(s);i++){const from={x:s.x,y:s.y};g.update(.05);assert.ok(Math.hypot(s.x-from.x,s.y-from.y)<=.14+1e-8);for(const room of g.rooms)assert.equal(furnitureBlocked(room,from,s),false);}
 assert.equal(g.staffReady(s),true);assert.equal(r.staffId,s.id);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});

test('moving across the room-door orientation boundary validates the new doorway against old furniture',()=>{
 const {g,r}=draft();ok(g.addFurniture(r.id,'poster',{x:2,y:0,rotation:0}));const before=g.snapshot();assert.equal(applyRoomChange(g,r.id,{x:2,y:9,w:4,h:4}).error,'furnitureDoor');assert.deepEqual(g.snapshot(),before);
});

test('room moves carry existing dirt with the floor and resizing removes only dirt on discarded or blocked floor',()=>{
 const g=new Game({mode:'sandbox',seed:6}),r=ok(g.addRoom('waiting',{x:2,y:2,w:4,h:4})).room;
 g.maintenance.dirt=[{id:1,x:3,y:3,roomId:r.id,severity:1},{id:2,x:5,y:3,roomId:r.id,severity:1},{id:3,x:10,y:4,roomId:null,severity:1},{id:4,x:18,y:10,roomId:null,severity:1}];g.maintenance.nextId=5;
 ok(g.changeRoom(r.id,{x:8,y:2,w:4,h:4}));assert.deepEqual(g.maintenance.dirt.map(d=>[d.id,d.x,d.y,d.roomId]),[[1,9,3,r.id],[2,11,3,r.id],[3,10,4,r.id],[4,18,10,null]]);
 ok(g.changeRoom(r.id,{x:8,y:2,w:3,h:3}));assert.deepEqual(g.maintenance.dirt.map(d=>d.id),[1,3,4]);assert.deepEqual(Game.restore(g.snapshot()).snapshot(),g.snapshot());
});
