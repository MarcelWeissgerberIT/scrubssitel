const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const STAFF_STATES=['idle','travelWork','work','travelBreak','break','cleaning'];
export function workplace(r){return r.type==='reception'?{x:r.x+r.w*.5-.5,y:r.y+.1}:{x:r.x+r.w*.75-.5,y:r.y+.6};}
export function loungeSeats(r){return Array.from({length:Math.max(1,Math.floor((r.w-1)/.8))},(_,i)=>({x:r.x+.45+i*.8,y:r.y+.4}));}
export function initStaff(g,s,legacy=false){
 const r=g.room(s.roomId),wasResting=!!s.resting;
 Object.assign(s,{x:legacy&&r?workplace(r).x:12,y:legacy&&r?workplace(r).y:16,path:[],state:legacy&&r?'work':'idle',destination:null,breakRoomId:null,breakSeatIndex:null,breakPending:wasResting,breakElapsed:0,breakCount:0,nextBreakAt:g.clock+120+s.id%9*5,patrolIndex:s.id%5});s.resting=false;
}
export function staffReady(g,s){const r=g.room(s?.roomId);if(!s||!r||s.resting||s.state!=='work'||s.path.length)return false;const target=workplace(r);return Math.hypot(s.x-target.x,s.y-target.y)<.08;}
function corridorRoute(g,s,to){const inside=g.rooms.find(r=>g.contains(r,s)),path=g.path(inside?g.door(inside):s,to);return path===null?null:[...(inside?g.exitPath(inside,s):[]),...path];}
function walk(g,s,to,room,state,arrival){
 const path=room&&g.contains(room,s)?[]:corridorRoute(g,s,room?g.door(room):to);if(path===null)return false;
 s.path=room&&g.contains(room,s)?[to]:[...path,...(room?g.enterPath(room,to):[])];
 // Grid routing rounds the start cell; finish the exact trip before changing pose.
 const end=s.path.at(-1)||s;if(Math.hypot(end.x-to.x,end.y-to.y)>1e-8)s.path.push({x:to.x,y:to.y});
 s.destination={...to,roomId:room?.id??null,arrival};s.state=s.path.length?state:arrival;return true;
}
function standingSpot(g,s,near){const d=near?g.door(near):{x:12,y:16},points=[];for(let x=1;x<23;x++)for(let y=1;y<17;y++){if(g.occupied(x,y)||g.rooms.some(r=>{const q=g.door(r);return q.x===x&&q.y===y;})||g.staff.some(q=>q!==s&&Math.hypot((q.destination?.x??q.x)-x,(q.destination?.y??q.y)-y)<.7)||g.patients.some(p=>Math.hypot(p.x-x,p.y-y)<.7))continue;points.push({x,y});}return points.sort((a,b)=>Math.hypot(a.x-d.x,a.y-d.y)-Math.hypot(b.x-d.x,b.y-d.y)).find(p=>corridorRoute(g,s,p)!==null)||{x:s.x,y:s.y};}
function startBreak(g,s){
 const choices=g.rooms.filter(r=>r.type==='lounge').flatMap(r=>loungeSeats(r).map((p,i)=>({r,p,i}))).filter(v=>!g.staff.some(other=>other!==s&&other.breakRoomId===v.r.id&&other.breakSeatIndex===v.i)).sort((a,b)=>Math.hypot(a.p.x-s.x,a.p.y-s.y)-Math.hypot(b.p.x-s.x,b.p.y-s.y));
 const choice=choices[0];s.breakRoomId=choice?.r.id??null;s.breakSeatIndex=choice?.i??null;s.breakElapsed=0;s.resting=true;s.breakPending=false;
 walk(g,s,choice?.p||standingSpot(g,s,g.rooms.find(r=>r.type==='lounge')||g.room(s.roomId)),choice?.r,'travelBreak','break');
}
export function dispatchStaff(g,s){s.breakRoomId=null;s.breakSeatIndex=null;s.resting=false;const r=g.room(s.roomId);if(r){walk(g,s,workplace(r),r,'travelWork','work');return;}
 if(s.role==='janitor'){const points=[{x:4,y:7},{x:10,y:7},{x:19,y:8},{x:12,y:14},{x:12,y:16}].filter(p=>!g.occupied(p.x,p.y)&&corridorRoute(g,s,p)!==null);s.patrolIndex=(s.patrolIndex+1)%Math.max(1,points.length);walk(g,s,points[s.patrolIndex]||standingSpot(g,s),null,'cleaning','cleaning');return;}
 s.state='idle';s.destination=null;s.path=[];
}
export function requestBreak(g,id){const s=g.staff.find(s=>s.id===id);if(s&&!s.resting){s.breakPending=true;return true;}return false;}
export function repathStaff(g){for(const s of g.staff){const dest=s.destination;if(!dest)continue;const room=dest.roomId===null?null:g.room(dest.roomId);if(dest.roomId!==null&&!room){s.path=[];s.destination=null;s.breakRoomId=null;s.breakSeatIndex=null;s.state='idle';s.resting=false;continue;}if(!s.path.length)continue;if(!room&&(g.occupied(dest.x,dest.y)||corridorRoute(g,s,dest)===null)){if(s.state==='cleaning')dispatchStaff(g,s);else walk(g,s,standingSpot(g,s,g.room(s.roomId)),null,'travelBreak','break');}else walk(g,s,dest,room,s.state,dest.arrival);}}
export function updateStaff(g,dt){
 for(const s of g.staff){const r=g.room(s.roomId),occupied=!!r?.patientId;
  if(!s.resting&&(s.fatigue>=86||g.clock>=s.nextBreakAt))s.breakPending=true;
  // A booked appointment, including the patient's exit, finishes before a break.
  if(s.breakPending&&!s.resting&&!occupied){startBreak(g,s);}
  if(s.state==='idle'&&!s.resting&&!s.breakPending)dispatchStaff(g,s);
  if(['travelWork','travelBreak'].includes(s.state)&&(!s.path.length||!s.destination))throw Error('Missing staff route');
 if(s.state==='work'&&!r)dispatchStaff(g,s);
  if(s.path.length){g.move(s,dt,2.8);if(!s.path.length){s.state=s.destination?.arrival||'idle';if(s.state==='work')s.resting=false;}}
  if(s.state==='break'){
   s.breakElapsed+=dt;const room=g.room(s.breakRoomId),seated=room?.type==='lounge'&&s.breakSeatIndex!==null;
   s.fatigue=clamp(s.fatigue-dt*(seated?2.3*(1+(room.level-1)*.3):.65),0,100);
   if(s.breakElapsed>=12&&s.fatigue<=28){s.breakCount++;s.nextBreakAt=g.clock+150+s.id%7*5;dispatchStaff(g,s);}
  }else if(!s.resting){const busy=occupied||s.state==='cleaning'||r?.type==='lab'&&g.project;s.fatigue=clamp(s.fatigue+dt*(busy?.32*s.fatigueRate:.035),0,100);}
  if(s.state==='cleaning'&&!s.path.length)dispatchStaff(g,s);
 }
}
export function migrateStaff(data){const shell={...data,room:id=>data.rooms.find(r=>r.id===id)};for(const s of data.staff)initStaff(shell,s,true);}
export function validateStaff(g){const seats=new Set();for(const s of g.staff){if(!STAFF_STATES.includes(s.state)||![s.x,s.y,s.breakElapsed,s.nextBreakAt].every(Number.isFinite)||s.breakElapsed<0||s.nextBreakAt<0||s.x<0||s.x>24||s.y<0||s.y>18||!Array.isArray(s.path)||s.path.length>500||s.path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||typeof s.breakPending!=='boolean'||!Number.isInteger(s.breakCount)||s.breakCount<0||!Number.isInteger(s.patrolIndex)||s.patrolIndex<0)throw Error('Invalid staff journey');
 if(s.destination&&(!Number.isFinite(s.destination.x)||!Number.isFinite(s.destination.y)||!STAFF_STATES.includes(s.destination.arrival)||s.destination.roomId!==null&&!g.room(s.destination.roomId)))throw Error('Invalid staff destination');
 if(s.breakRoomId!==null){const r=g.room(s.breakRoomId),key=`${s.breakRoomId}:${s.breakSeatIndex}`;if(!r||r.type!=='lounge'||!Number.isInteger(s.breakSeatIndex)||!loungeSeats(r)[s.breakSeatIndex]||seats.has(key)||!['travelBreak','break'].includes(s.state))throw Error('Invalid break seat');seats.add(key);}else if(s.breakSeatIndex!==null)throw Error('Invalid standing break');
 if(['travelWork','travelBreak'].includes(s.state)&&(!s.path.length||!s.destination))throw Error('Missing staff route');
 if(s.state==='work'&&(!g.room(s.roomId)||s.path.length||!staffReady(g,s)))throw Error('Invalid workplace');
 if(s.state==='break'&&(s.path.length||!s.destination||Math.hypot(s.x-s.destination.x,s.y-s.destination.y)>.08))throw Error('Invalid break arrival');
 if(s.resting!==['travelBreak','break'].includes(s.state))throw Error('Invalid break state');
 }}
