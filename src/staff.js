import {workPoint,roomSeats,innerDoor,pointBlocked,insidePath,ACTOR_RADIUS} from './layout.js';
import {ROOMS} from './content.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const STAFF_STATES=['idle','travelWork','work','travelBreak','break','cleaning'];
export function workplace(r){if(Array.isArray(r.furniture))return workPoint(r);return r.type==='reception'?{x:r.x+r.w*.5-.5,y:r.y+.1}:{x:r.x+r.w*.75-.5,y:r.y+.6};}
export function loungeSeats(r){if(Array.isArray(r.furniture))return roomSeats(r,'lounge');return Array.from({length:Math.max(1,Math.floor((r.w-1)/.8))},(_,i)=>({x:r.x+.45+i*.8,y:r.y+.4}));}
export function initStaff(g,s,legacy=false){
 const r=g.room(s.roomId),wasResting=!!s.resting;
 Object.assign(s,{manualPlacement:!legacy,awaitingPlacement:!legacy,x:legacy&&r?workplace(r).x:12,y:legacy&&r?workplace(r).y:16,path:[],state:legacy&&r?'work':'idle',destination:null,breakRoomId:null,breakSeatIndex:null,breakPending:legacy&&wasResting,breakElapsed:0,breakCount:0,nextBreakAt:g.clock+120+s.id%9*5,patrolIndex:s.id%5});s.resting=false;
}
export function staffReady(g,s){const r=g.room(s?.roomId);if(!s||s.awaitingPlacement||!r||s.resting||s.state!=='work'||s.path.length||Array.isArray(r.furniture)&&(!r.ready||r.editing||r.renovating&&!r.patientId))return false;const target=workplace(r);return !!target&&Math.hypot(s.x-target.x,s.y-target.y)<.08;}
function freeCorridor(g,p){return Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&p.x>=0&&p.x<=23&&p.y>=0&&p.y<=17&&!g.rooms.some(r=>p.x+.5>r.x-ACTOR_RADIUS&&p.x+.5<r.x+r.w+ACTOR_RADIUS&&p.y+.5>r.y-ACTOR_RADIUS&&p.y+.5<r.y+r.h+ACTOR_RADIUS);}
function freeDrop(g,s,r,p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(r?g.contains(r,p)&&!pointBlocked(r,p):freeCorridor(g,p))&&!g.staff.some(other=>other!==s&&Math.hypot(other.x-p.x,other.y-p.y)<.4)&&!g.patients.some(other=>Math.hypot(other.x-p.x,other.y-p.y)<.4);}
export function entrySpot(g){
 const spots=[];for(let x=1;x<23;x++)for(let y=1;y<17;y++){const p={x,y};if(Math.hypot(x-12,y-16)<.7||!freeDrop(g,null,null,p)||g.rooms.some(r=>{const d=g.door(r);return d.x===x&&d.y===y;})||g.staff.some(s=>s.destination&&Math.hypot(s.destination.x-x,s.destination.y-y)<.6))continue;spots.push(p);}
 return spots.sort((a,b)=>Math.hypot(a.x-12,a.y-16)-Math.hypot(b.x-12,b.y-16)||b.y-a.y||a.x-b.x).find(p=>g.path({x:12,y:16},p)!==null)||null;
}
export function canPickUpStaff(g,id){const s=g.staff.find(s=>s.id===id);return !s?'staffNotFound':g.room(s.roomId)?.patientId?'staffBusy':null;}
function placementPlan(g,id,roomId,point){
 const error=canPickUpStaff(g,id);if(error)return {error};
 const s=g.staff.find(s=>s.id===id),r=roomId===null||roomId===undefined?null:g.room(roomId);
 if(roomId!==null&&roomId!==undefined&&!r)return {error:'staffRoomRequired'};
 if(s.role!=='janitor'&&!r)return {error:'staffRoomRequired'};
 if(r&&!g.roomReady(r))return {error:'staffRoomNotReady'};
 if(r&&s.role!=='janitor'&&ROOMS[r.type].role!==s.role)return {error:'staffWrongRoom'};
 if(r&&s.role!=='janitor'&&(r.staffId!==null&&r.staffId!==s.id||r.patientId))return {error:'staffRoomOccupied'};
 if(r&&g.path({x:12,y:16},g.door(r))===null)return {error:'staffUnreachable'};
 let drop=point;
 if(drop===undefined&&r){const near=innerDoor(r),points=[near];for(let x=.25;x<r.w;x+=.25)for(let y=.25;y<r.h;y+=.25)points.push({x:r.x+x-.5,y:r.y+y-.5});drop=points.sort((a,b)=>Math.hypot(a.x-near.x,a.y-near.y)-Math.hypot(b.x-near.x,b.y-near.y)).find(p=>freeDrop(g,s,r,p)&&insidePath(r,g.door(r),p)!==null);}
 if(!freeDrop(g,s,r,drop))return {error:'staffDropBlocked'};
 if(r?insidePath(r,g.door(r),drop)===null:g.path({x:12,y:16},drop)===null)return {error:'staffUnreachable'};
 const target=s.role==='janitor'?null:workplace(r),path=target&&insidePath(r,drop,target);
 if(s.role!=='janitor'&&(!target||path===null||insidePath(r,g.door(r),target)===null))return {error:'staffUnreachable'};
 return {s,r,drop:{x:drop.x,y:drop.y},target,path};
}
export function staffPlacement(g,id,roomId,point){return placementPlan(g,id,roomId,point).error||null;}
export function placeStaff(g,id,roomId,point){
 const plan=placementPlan(g,id,roomId,point);if(plan.error)return {error:plan.error};const {s,r,drop,target,path}=plan,previous=g.room(s.roomId),first=s.awaitingPlacement;
 if(previous?.staffId===s.id)previous.staffId=null;
 Object.assign(s,{manualPlacement:true,awaitingPlacement:false,x:drop.x,y:drop.y,roomId:s.role==='janitor'?null:r.id,resting:false,breakPending:false,breakRoomId:null,breakSeatIndex:null,breakElapsed:0,path:[],destination:null,state:'idle'});
 if(first)s.nextBreakAt=g.clock+120+s.id%9*5;
 if(s.role==='janitor')dispatchStaff(g,s);
 else{r.staffId=s.id;s.path=path;s.destination={x:target.x,y:target.y,roomId:r.id,arrival:'work'};s.state=path.length?'travelWork':'work';}
 for(const type of new Set([previous?.type,r?.type].filter(Boolean)))g.rebalance(type);g.checkTutorial();return {staff:s,room:r};
}
function corridorRoute(g,s,to){return g.corridorPath(s,to);}
function walk(g,s,to,room,state,arrival){
 if(!to)return false;
 const path=room?g.routeInto(s,room,to):corridorRoute(g,s,to);if(path===null)return false;
 s.path=path;
 const end=s.path.at(-1)||s;if(Math.hypot(end.x-to.x,end.y-to.y)>1e-8)s.path.push({x:to.x,y:to.y});
 s.destination={x:to.x,y:to.y,roomId:room?.id??null,arrival};s.state=s.path.length?state:arrival;return true;
}

function standingSpot(g,s,near){const d=near?g.door(near):{x:12,y:16},points=[];for(let x=1;x<23;x++)for(let y=1;y<17;y++){if(g.occupied(x,y)||g.rooms.some(r=>{const q=g.door(r);return q.x===x&&q.y===y;})||g.staff.some(q=>q!==s&&Math.hypot((q.destination?.x??q.x)-x,(q.destination?.y??q.y)-y)<.7)||g.patients.some(p=>Math.hypot(p.x-x,p.y-y)<.7))continue;points.push({x,y});}return points.sort((a,b)=>Math.hypot(a.x-d.x,a.y-d.y)-Math.hypot(b.x-d.x,b.y-d.y)).find(p=>corridorRoute(g,s,p)!==null)||{x:s.x,y:s.y};}
function startBreak(g,s){
 const choices=g.rooms.filter(r=>r.type==='lounge'&&g.roomReady(r)).flatMap(r=>loungeSeats(r).map((p,i)=>({r,p,i}))).filter(v=>!g.staff.some(other=>other!==s&&other.breakRoomId===v.r.id&&other.breakSeatIndex===v.i)).sort((a,b)=>Math.hypot(a.p.x-s.x,a.p.y-s.y)-Math.hypot(b.p.x-s.x,b.p.y-s.y));
 const choice=choices[0];s.breakRoomId=choice?.r.id??null;s.breakSeatIndex=choice?.i??null;s.breakElapsed=0;s.resting=true;s.breakPending=false;
 if(!walk(g,s,choice?.p||standingSpot(g,s,g.rooms.find(r=>r.type==='lounge')||g.room(s.roomId)),choice?.r,'travelBreak','break')){s.resting=false;s.breakPending=true;s.breakRoomId=null;s.breakSeatIndex=null;}
}
export function dispatchStaff(g,s){if(s.awaitingPlacement)return;s.breakRoomId=null;s.breakSeatIndex=null;s.resting=false;const r=g.room(s.roomId);if(r&&g.roomReady(r)){if(!walk(g,s,workplace(r),r,'travelWork','work')){s.state='idle';s.destination=null;s.path=[];}return;}
 if(s.role==='janitor'){const points=[{x:4,y:7},{x:10,y:7},{x:19,y:8},{x:12,y:14},{x:12,y:16}].filter(p=>!g.occupied(p.x,p.y)&&corridorRoute(g,s,p)!==null);s.patrolIndex=(s.patrolIndex+1)%Math.max(1,points.length);walk(g,s,points[s.patrolIndex]||standingSpot(g,s),null,'cleaning','cleaning');return;}
 if(s.manualPlacement&&!s.roomId){walk(g,s,standingSpot(g,s),null,'travelWork','idle');if(s.state==='idle'){s.awaitingPlacement=true;s.destination=null;s.breakPending=false;}return;}
 s.state='idle';s.destination=null;s.path=[];
}
export function requestBreak(g,id){const s=g.staff.find(s=>s.id===id);if(s&&!s.awaitingPlacement&&!s.resting){s.breakPending=true;return true;}return false;}
export function repathStaff(g){for(const s of g.staff){const dest=s.destination;if(!dest)continue;const room=dest.roomId===null?null:g.room(dest.roomId);if(dest.roomId!==null&&!room){s.path=[];s.destination=null;s.breakRoomId=null;s.breakSeatIndex=null;s.state='idle';s.resting=false;continue;}if(!s.path.length)continue;if(!room&&(g.occupied(dest.x,dest.y)||corridorRoute(g,s,dest)===null)){if(s.state==='cleaning'||dest.arrival==='idle')dispatchStaff(g,s);else walk(g,s,standingSpot(g,s,g.room(s.roomId)),null,'travelBreak','break');}else walk(g,s,dest,room,s.state,dest.arrival);}}
export function updateStaff(g,dt){
 for(const s of g.staff){const r=g.room(s.roomId),occupied=!!r?.patientId;
  if(s.awaitingPlacement)continue;
  if(!s.resting&&(s.fatigue>=86||g.clock>=s.nextBreakAt))s.breakPending=true;
  // A booked appointment, including the patient's exit, finishes before a break.
  if(s.breakPending&&!s.resting&&!occupied){startBreak(g,s);}
  if(s.state==='idle'&&!s.resting&&!s.breakPending)dispatchStaff(g,s);
  if(['travelWork','travelBreak'].includes(s.state)&&(!s.path.length||!s.destination))throw Error('Missing staff route');
 if(s.state==='work'&&(!r||!g.roomReady(r)&&!r.patientId)&&!s.breakPending)dispatchStaff(g,s);
  if(s.path.length){g.move(s,dt,2.8);if(!s.path.length){s.state=s.destination?.arrival||'idle';if(s.state==='work')s.resting=false;if(s.state==='idle'&&s.manualPlacement&&!s.roomId&&s.role!=='janitor'){s.awaitingPlacement=true;s.destination=null;s.breakPending=false;}}}
  if(s.state==='break'){
   s.breakElapsed+=dt;const room=g.room(s.breakRoomId),seated=room?.type==='lounge'&&s.breakSeatIndex!==null;
   s.fatigue=clamp(s.fatigue-dt*(seated?2.3*(1+(room.level-1)*.3):.65),0,100);
   if(s.breakElapsed>=12&&s.fatigue<=28){s.breakCount++;s.nextBreakAt=g.clock+150+s.id%7*5;dispatchStaff(g,s);}
  }else if(!s.resting){const busy=occupied||s.state==='cleaning'||r?.type==='lab'&&g.project;s.fatigue=clamp(s.fatigue+dt*(busy?.32*s.fatigueRate:.035),0,100);}
  if(s.state==='cleaning'&&!s.path.length)dispatchStaff(g,s);
 }
}
export function migrateStaff(data){const shell={...data,room:id=>data.rooms.find(r=>r.id===id)};for(const s of data.staff)initStaff(shell,s,true);}
export function validateStaff(g){const seats=new Set();for(const s of g.staff){if(typeof s.manualPlacement!=='boolean'||typeof s.awaitingPlacement!=='boolean'||s.awaitingPlacement&&(!s.manualPlacement||s.roomId!==null||s.state!=='idle'||s.path?.length||s.destination!==null||s.resting||s.breakPending||s.breakRoomId!==null||s.breakSeatIndex!==null||!freeCorridor(g,s))||s.manualPlacement&&!s.awaitingPlacement&&s.role!=='janitor'&&s.roomId===null&&!s.resting&&!(s.state==='travelWork'&&s.destination?.arrival==='idle'&&s.destination.roomId===null))throw Error('Invalid staff placement');
 if(!STAFF_STATES.includes(s.state)||![s.x,s.y,s.breakElapsed,s.nextBreakAt].every(Number.isFinite)||s.breakElapsed<0||s.nextBreakAt<0||s.x<0||s.x>24||s.y<0||s.y>18||!Array.isArray(s.path)||s.path.length>500||s.path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||typeof s.breakPending!=='boolean'||!Number.isInteger(s.breakCount)||s.breakCount<0||!Number.isInteger(s.patrolIndex)||s.patrolIndex<0)throw Error('Invalid staff journey');
 if(s.destination&&(!Number.isFinite(s.destination.x)||!Number.isFinite(s.destination.y)||!STAFF_STATES.includes(s.destination.arrival)||s.destination.roomId!==null&&!g.room(s.destination.roomId)))throw Error('Invalid staff destination');
 if(s.breakRoomId!==null){const r=g.room(s.breakRoomId),key=`${s.breakRoomId}:${s.breakSeatIndex}`;if(!r||r.type!=='lounge'||!Number.isInteger(s.breakSeatIndex)||!loungeSeats(r)[s.breakSeatIndex]||seats.has(key)||!['travelBreak','break'].includes(s.state))throw Error('Invalid break seat');seats.add(key);}else if(s.breakSeatIndex!==null)throw Error('Invalid standing break');
 if(['travelWork','travelBreak'].includes(s.state)&&(!s.path.length||!s.destination))throw Error('Missing staff route');
 if(s.state==='work'){const r=g.room(s.roomId),target=r&&workplace(r);if(!target||s.path.length||Math.hypot(s.x-target.x,s.y-target.y)>.08||Array.isArray(r.furniture)&&(!r.ready||r.editing))throw Error('Invalid workplace');}
 if(s.state==='break'&&(s.path.length||!s.destination||Math.hypot(s.x-s.destination.x,s.y-s.destination.y)>.08))throw Error('Invalid break arrival');
 if(s.resting!==['travelBreak','break'].includes(s.state))throw Error('Invalid break state');
 }}
