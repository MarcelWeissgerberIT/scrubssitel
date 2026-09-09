import {ROOMS} from './content.js';
import {ACTOR_RADIUS,layoutStatus,pointBlocked} from './layout.js';
import {roomBusy} from './furnishing.js';

const ENTRY={x:12,y:16};
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const covers=(r,p)=>p&&p.x+.5>r.x-ACTOR_RADIUS&&p.x+.5<r.x+r.w+ACTOR_RADIUS&&p.y+.5>r.y-ACTOR_RADIUS&&p.y+.5<r.y+r.h+ACTOR_RADIUS;
export function roomChangeCost(room,rect){return Math.max(0,rect.w*rect.h-room.w*room.h)*Math.ceil(ROOMS[room.type].cost/9)+(rect.x!==room.x||rect.y!==room.y?Math.ceil(ROOMS[room.type].cost*.15):0);}

// A room is evacuated through the ordinary renovation flow before its shell
// changes. Previewing never edits the room, routes, furniture or accounts.
export function previewRoomChange(g,id,proposed){
 const current=g.room(id),rect=Object.fromEntries(['x','y','w','h'].map(key=>[key,proposed?.[key]]));
 const result={error:null,cost:0,rect,room:null},fail=error=>({...result,error});
 if(!current)return fail('invalidRoom');
 if(!Object.values(rect).every(Number.isInteger)||rect.w<3||rect.h<3||rect.w>10||rect.h>8)return fail('smallRoom');
 result.cost=roomChangeCost(current,rect);result.room={...current,...rect};
 if(g.over||g.event)return fail('roomChangeUnavailable');
 if(roomBusy(g,current)||g.staff.some(s=>s.job?.roomId===id)||g.patients.some(p=>p.activity?.roomId===id))return fail('roomResizeBusy');
 if(!current.editing||current.renovating)return fail('roomEditing');
 if(rect.x<1||rect.y<1||rect.x+rect.w>g.grid.w-1||rect.y+rect.h>g.grid.h-1)return fail('invalidRoom');
 if(ENTRY.x>=rect.x&&ENTRY.x<rect.x+rect.w&&ENTRY.y>=rect.y&&ENTRY.y<rect.y+rect.h)return fail('badPlacement');
 if(g.rooms.some(r=>r.id!==id&&overlaps(r,rect)))return fail('invalidRoom');
 const actors=[...g.staff,...g.patients];
 if(actors.some(p=>covers(rect,p)))return fail('roomResizeOccupied');
 // A standing break or a departing patient's last waypoint may be outside its
 // former room. Keep these reserved destinations clear as well as the people.
 if(actors.some(p=>{const target=p.destination?p.destination.roomId===null?p.destination:null:p.state==='relocating'?p.path.at(-1):null;return covers(rect,target);}))return fail('roomResizeOccupied');
 const status=layoutStatus(result.room);if(status.blocked)return fail(status.blocked);
 const rooms=g.rooms.map(r=>r.id===id?result.room:r);
 if(rooms.some(r=>g.path(ENTRY,g.door(r),rooms)===null))return fail('badPlacement');
 for(const actor of actors){const inside=g.rooms.find(r=>g.contains(r,actor)),from=inside?g.door(inside):actor;if(g.path(ENTRY,from,rooms)===null)return fail('badPlacement');}
 if(result.cost>0&&g.cash<result.cost)return fail('notEnough');
 return result;
}

export function applyRoomChange(g,id,rect){
 const preview=previewRoomChange(g,id,rect);if(preview.error)return {error:preview.error};
 const room=g.room(id),changed=['x','y','w','h'].some(key=>room[key]!==preview.rect[key]);
 if(!changed)return {room,cost:0};
 const offset={x:preview.rect.x-room.x,y:preview.rect.y-room.y};
 Object.assign(room,preview.rect);g.cash-=preview.cost;g.construction+=preview.cost;
 if(g.maintenance)g.maintenance.dirt=g.maintenance.dirt.filter(d=>{
  if(d.roomId===id){d.x+=offset.x;d.y+=offset.y;return !pointBlocked(room,d);}
  if(d.roomId===null&&g.contains(room,d)){d.roomId=id;return !pointBlocked(room,d);}
  return true;
 });
 room.doorOpen=0;g.repath();g.rebalance(room.type);g.log('roomChanged',String(id));
 return {room,cost:preview.cost};
}
