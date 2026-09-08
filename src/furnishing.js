import {cancelAmenity} from './amenities.js';
import {FURNITURE} from './objects.js';
import {defaultFurniture,layoutStatus,validatePlacement,insidePath,workPoint,patientPoint,roomSeats,pointBlocked} from './layout.js';
import {dispatchStaff,validateStaff} from './staff.js';

export function roomReady(r){return !!r&&r.ready===true&&!r.editing&&!r.renovating;}
export function roomBusy(g,r){return !!r.patientId||g.patients.some(p=>g.contains(r,p)||p.seatRoom===r.id||['inside','called'].includes(p.state)&&p.targetRoom===r.id)||g.staff.some(s=>g.contains(r,s)||s.breakRoomId===r.id||s.path.length&&s.destination?.roomId===r.id);}
export function beginRoomEdit(g,id){
 const r=g.room(id);if(!r)return {error:'invalidRoom'};
 if(r.editing)return {room:r};
 r.renovating=true;
 // Finish booked visits; all other patients leave the room before moving furniture.
 for(const p of g.patients){
  if(g.room(p.targetRoom)?.patientId===p.id)continue;
  if(p.seatRoom===id||p.targetRoom===id||g.contains(r,p)){
   cancelAmenity(p,g.clock);p.path=g.contains(r,p)?g.exitPath(r,p):[];p.seatRoom=null;p.seatIndex=null;p.targetRoom=null;p.state=p.path.length?'relocating':'waiting';
  }
 }
 for(const s of g.staff){
  if(s.breakRoomId===id){dispatchStaff(g,s);}
  else if(s.roomId===id&&!s.resting)g.requestBreak(s.id);
 }
 if(roomBusy(g,r))return {room:r,pending:true};
 r.ready=false;r.renovating=false;r.editing=true;return {room:r};
}
export function furniturePlacement(g,id,item,ignoreId=null){
 const r=g.room(id);if(!r||!r.editing)return 'roomEditing';return validatePlacement(r,item,ignoreId);
}
export function addFurniture(g,id,kind,position){
 const r=g.room(id),spec=FURNITURE[kind];if(!r||!spec)return {error:'furnitureInvalid'};
 const item={id:`f-${g.id+1}`,kind,x:position.x,y:position.y,rotation:position.rotation??0,paid:spec.cost};const error=furniturePlacement(g,id,item);if(error)return {error};if(g.cash<spec.cost)return {error:'notEnough'};
 g.id++;g.cash-=spec.cost;g.construction+=spec.cost;r.furniture.push(item);return {room:r,object:item};
}
export function moveFurniture(g,id,furnitureId,position){const r=g.room(id),item=r?.furniture.find(o=>o.id===furnitureId);if(!item)return {error:'furnitureInvalid'};const coordinates={x:position.x,y:position.y,rotation:position.rotation??item.rotation},next={...item,...coordinates},error=furniturePlacement(g,id,next,furnitureId);if(error)return {error};Object.assign(item,coordinates);return {room:r,object:item};}
export function removeFurniture(g,id,furnitureId){const r=g.room(id);if(!r?.editing)return {error:'roomEditing'};const item=r.furniture.find(o=>o.id===furnitureId);if(!item)return {error:'furnitureInvalid'};const refund=Math.round((item.paid||0)*.75);g.cash+=refund;g.construction-=refund;r.furniture=r.furniture.filter(o=>o.id!==furnitureId);return {room:r};}
export function autoFurnish(g,id){
 const r=g.room(id);if(!r?.editing)return {error:'roomEditing'};if(r.furniture.length)return {error:'furnitureNotEmpty'};
 const furniture=defaultFurniture(r).map(o=>({...o,paid:FURNITURE[o.kind].cost})),cost=furniture.reduce((sum,o)=>sum+o.paid,0);
 const status=layoutStatus({...r,furniture});if(!status.ready)return {error:status.blocked||'furnitureMissing'};if(g.cash<cost)return {error:'notEnough'};
 r.furniture=furniture;g.cash-=cost;g.construction+=cost;return {room:r};
}
export function finishRoom(g,id){
 const r=g.room(id);if(!r?.editing)return {error:'roomEditing'};const status=layoutStatus(r);if(!status.ready)return {error:status.blocked||'furnitureMissing'};
 r.editing=false;r.renovating=false;r.ready=true;g.assignStaff();for(const s of g.staff)if(s.roomId===id&&s.state==='idle')dispatchStaff(g,s);g.repath();g.rebalance(r.type);g.checkTutorial();return {room:r};
}
export function validateFurniture(g){
 const ids=new Set();
 for(const r of g.rooms){
  if(!Array.isArray(r.furniture)||r.furniture.length>60||typeof r.ready!=='boolean'||typeof r.editing!=='boolean'||typeof r.renovating!=='boolean'||r.editing&&(r.ready||r.renovating))throw Error('Invalid room furnishing state');
  for(const o of r.furniture){if(typeof o.id!=='string'||o.id.length>80||ids.has(`${r.id}:${o.id}`)||!FURNITURE[o.kind]||![0,FURNITURE[o.kind].cost].includes(o.paid)||validatePlacement(r,o,o.id))throw Error('Invalid furniture');ids.add(`${r.id}:${o.id}`);}
  if(r.ready&&!layoutStatus(r).ready)throw Error('Inaccessible furnished room');
  if(r.editing&&roomBusy(g,r))throw Error('Occupied room under construction');
 }
}
// Version-five furniture was decorative and had no saved coordinates. Preserve all
// clinical and financial history while moving old anchors onto the new layout.
function legacyFurniture(r){
 const furniture=defaultFurniture(r,{legacyToilet:true}).map(o=>({...o,paid:0})),draft={...r,furniture};
 const extras=r.type==='waiting'?['toys','books','plant']:r.type==='lounge'?['coffee','books','plant','poster','clock']:r.type==='toilet'?['poster','clock']:['cabinet',...(r.type==='reception'?[]:['sink']),'plant','poster','clock'];
 for(const kind of extras){const spec=FURNITURE[kind],positions=[];
  if(spec.wall){for(let x=.25;x<=r.w-spec.w;x+=.25)positions.push({x,y:0,rotation:0});for(let y=.25;y<=r.h-spec.w;y+=.25)positions.push({x:0,y,rotation:3});}
  else{for(const [x,y] of [[r.w-spec.w-.25,.25],[r.w-spec.w-.25,r.h-spec.h-.25],[.25,r.h-spec.h-.25]])positions.push({x,y,rotation:0});for(let y=.25;y<=r.h-spec.h-.25;y+=.5)for(let x=.25;x<=r.w-spec.w-.25;x+=.5)positions.push({x,y,rotation:0});}
  for(const position of positions){const item={id:'legacy-'+kind,kind,...position,paid:0};if(!validatePlacement(draft,item)){furniture.push(item);break;}}
 }
 return furniture;
}
const xy=p=>({x:p.x,y:p.y});
export function migrateFurniture(g){
 for(const r of g.rooms){r.furniture=legacyFurniture(r);r.ready=true;r.editing=false;r.renovating=false;if(!layoutStatus(r).ready)throw Error('Unable to migrate room layout');}
 const clearPoint=(r,p)=>{
  if(!pointBlocked(r,p))return {x:p.x,y:p.y};
  const points=[];for(let x=r.x-.25;x<r.x+r.w-.5;x+=.25)for(let y=r.y-.25;y<r.y+r.h-.5;y+=.25){const q={x,y};if(!pointBlocked(r,q)&&insidePath(r,g.door(r),q))points.push(q);}
  return points.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||g.door(r);
 };
 for(const s of g.staff){const r=g.room(s.roomId),lounge=g.room(s.breakRoomId),inside=g.rooms.find(r=>g.contains(r,s));
  if(s.state==='work'&&r){Object.assign(s,xy(workPoint(r)));s.destination={...xy(workPoint(r)),roomId:r.id,arrival:'work'};}
  else if(s.state==='break'&&lounge){const seats=roomSeats(lounge,'lounge'),seat=seats[s.breakSeatIndex];if(seat){Object.assign(s,{x:seat.x,y:seat.y});s.destination={x:seat.x,y:seat.y,roomId:lounge.id,arrival:'break'};}else{Object.assign(s,g.door(lounge));s.breakRoomId=null;s.breakSeatIndex=null;s.destination={x:s.x,y:s.y,roomId:null,arrival:'break'};}}
  else if(inside)Object.assign(s,clearPoint(inside,s));
  if(s.destination?.roomId&&s.destination.arrival==='work')Object.assign(s.destination,xy(workPoint(g.room(s.destination.roomId))));
  if(s.destination?.roomId&&s.destination.arrival==='break'){const seats=roomSeats(g.room(s.destination.roomId),'lounge'),seat=seats[s.breakSeatIndex];if(seat)Object.assign(s.destination,{x:seat.x,y:seat.y});else{const door=g.door(g.room(s.destination.roomId));s.destination={...door,roomId:null,arrival:'break'};s.breakRoomId=null;s.breakSeatIndex=null;}}
 }
 for(const p of g.patients){const r=g.room(p.targetRoom),waiting=g.room(p.seatRoom),inside=g.rooms.find(r=>g.contains(r,p));
  if(p.state==='service'&&r)Object.assign(p,xy(patientPoint(r)));
  else if(['seated','seatTravel'].includes(p.state)&&waiting){const seat=roomSeats(waiting)[p.seatIndex];if(seat){if(p.state==='seated')Object.assign(p,{x:seat.x,y:seat.y});else if(inside)Object.assign(p,clearPoint(inside,p));}else{if(inside)Object.assign(p,clearPoint(inside,p));p.seatRoom=null;p.seatIndex=null;p.state='relocating';p.path=g.corridorPath(p,g.door(waiting))||[];}}
  else if(inside)Object.assign(p,clearPoint(inside,p));
 }
 g.version=6;g.repath();validateFurniture(g);validateStaff(g);
}
