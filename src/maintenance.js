import {effectiveSkill} from './operations.js';
import {scenarioRules} from './story-events.js';
import {FURNITURE,furniturePorts} from './objects.js';
import {pointBlocked,insidePath} from './layout.js';

export function initMaintenance(clock=0){return {dirt:[],faults:[],nextId:1,nextAt:clock+18,nextFaultAt:clock+240};}
export function faultFor(g,r){return r&&g.maintenance?.faults.find(f=>f.roomId===r.id)||null;}
const position=(g,job)=>job.kind==='dirt'?g.maintenance.dirt.find(d=>d.id===job.id):(()=>{const f=g.maintenance.faults.find(f=>f.id===job.id),r=f&&g.room(f.roomId),p=r&&furniturePorts(r).filter(p=>p.furnitureId===f.furnitureId&&['patient','use','work'].includes(p.kind)).sort((a,b)=>['patient','use','work'].indexOf(a.kind)-['patient','use','work'].indexOf(b.kind))[0];if(!p)return null;if(p.kind==='work'){const target=[{x:p.x+.75,y:p.y},{x:p.x-.75,y:p.y},{x:p.x,y:p.y+.75},{x:p.x,y:p.y-.75}].find(q=>!pointBlocked(r,q)&&insidePath(r,g.door(r),q)!==null);return target?{...target,lookYaw:p.lookYaw,roomId:r.id}:null;}return {...p,roomId:r.id};})();
export function updateMaintenance(g,dt){
 const m=g.maintenance;if(!m)return;
 if(g.clock>=m.nextAt){m.nextAt=g.clock+18;if(m.dirt.length<16){
  const candidates=[...g.patients.filter(p=>p.stage!=='exit'),{x:12,y:15},{x:10,y:7},{x:19,y:8}];
  const p=candidates.find(p=>{const r=g.rooms.find(r=>g.contains(r,p));return (!r||g.roomReady(r)&&!pointBlocked(r,p)&&insidePath(r,g.door(r),p)!==null)&&!m.dirt.some(d=>Math.hypot(d.x-p.x,d.y-p.y)<.8);});
  if(p){const room=g.rooms.find(r=>g.contains(r,p));m.dirt.push({id:m.nextId++,x:p.x,y:p.y,roomId:room?.id??null,severity:1});}
 }}
 if(g.clock>=m.nextFaultAt){m.nextFaultAt=g.clock+scenarioRules(g).faultInterval;const rooms=g.rooms.filter(r=>g.roomReady(r)&&['gp','pharmacy','therapy','surgery','lab'].includes(r.type)&&r.condition<98&&!faultFor(g,r));const r=rooms[Math.floor(g.clock/180)%Math.max(1,rooms.length)],item=r?.furniture.find(f=>FURNITURE[f.kind]?.maxCount===1||['gp','pharmacy','therapy','surgery','lab','pharmacy-counter'].includes(f.kind));if(item)m.faults.push({id:m.nextId++,roomId:r.id,furnitureId:item.id,since:g.clock});}
 // Removing or renovating a fixture cannot leave a dangling repair reservation.
 m.faults=m.faults.filter(f=>g.room(f.roomId)?.furniture.some(o=>o.id===f.furnitureId));
 m.dirt=m.dirt.filter(d=>d.roomId===null||g.room(d.roomId));
}
export function repathMaintenance(g){
 if(!g.maintenance)return;
 g.maintenance.dirt=g.maintenance.dirt.filter(d=>{const room=g.rooms.find(r=>g.contains(r,d));d.roomId=room?.id??null;return !room||!pointBlocked(room,d)&&insidePath(room,g.door(room),d)!==null;});
 g.maintenance.faults=g.maintenance.faults.filter(f=>g.room(f.roomId)?.furniture.some(o=>o.id===f.furnitureId));
 for(const s of g.staff){if(!s.job)continue;const target=position(g,s.job),room=target?.roomId&&g.room(target.roomId);if(!target||room&&!g.roomReady(room)){s.job=null;s.path=[];s.destination=null;s.state='idle';continue;}
  const path=room?g.routeInto(s,room,target):g.corridorPath(s,target);if(path===null){s.job=null;s.path=[];s.destination=null;s.state='idle';continue;}s.path=path;const end=s.path.at(-1)||s;if(Math.hypot(end.x-target.x,end.y-target.y)>1e-8)s.path.push({x:target.x,y:target.y});s.destination={x:target.x,y:target.y,roomId:room?.id??null,lookYaw:target.lookYaw||0,arrival:'cleaning'};s.job.phase=s.path.length?'travel':'work';
 }
}
export function assignMaintenanceJob(g,s){
 if(s.role!=='janitor'||s.awaitingPlacement||s.resting||s.trainingCourse||s.job)return false;
 const jobs=[...g.maintenance.faults.map(f=>({kind:'fault',id:f.id})),...g.maintenance.dirt.map(d=>({kind:'dirt',id:d.id}))],choices=[];
 for(const job of jobs){if(g.staff.some(other=>other!==s&&other.job?.kind===job.kind&&other.job.id===job.id))continue;const target=position(g,job),room=target?.roomId&&g.room(target.roomId);if(!target||room&&(!g.roomReady(room)||job.kind==='fault'&&room.patientId))continue;const path=room?g.routeInto(s,room,target):g.corridorPath(s,target);if(path===null)continue;choices.push({job,target,room,path});}
 const choice=choices.sort((a,b)=>(a.job.kind==='fault'?-1:0)-(b.job.kind==='fault'?-1:0)||a.path.length-b.path.length)[0];if(!choice)return false;
 s.job={...choice.job,phase:choice.path.length?'travel':'work',elapsed:0};s.path=choice.path;const last=s.path.at(-1)||s;if(Math.hypot(last.x-choice.target.x,last.y-choice.target.y)>1e-8)s.path.push({x:choice.target.x,y:choice.target.y});s.destination={x:choice.target.x,y:choice.target.y,roomId:choice.room?.id??null,arrival:'cleaning',lookYaw:choice.target.lookYaw||0};s.state='cleaning';return true;
}
export function updateMaintenanceWorker(g,s,dt){
 if(!s.job)return false;const target=position(g,s.job);if(!target||s.role!=='janitor'){s.job=null;return false;}
 if(s.path.length)return true;if(Math.hypot(s.x-target.x,s.y-target.y)>.08){s.job=null;return false;}
 s.job.phase='work';s.job.elapsed+=dt*effectiveSkill(s);const duration=s.job.kind==='fault'?5:3;if(s.job.elapsed<duration)return true;
 if(s.job.kind==='dirt'){g.maintenance.dirt=g.maintenance.dirt.filter(d=>d.id!==s.job.id);g.cleanliness=Math.min(100,g.cleanliness+4);}
 else{const fault=g.maintenance.faults.find(f=>f.id===s.job.id),r=fault&&g.room(fault.roomId);if(r)r.condition=100;g.maintenance.faults=g.maintenance.faults.filter(f=>f.id!==s.job.id);}
 s.job=null;return false;
}
export function validateMaintenance(g){
 const m=g.maintenance,ids=new Set();if(!m||!Array.isArray(m.dirt)||!Array.isArray(m.faults)||m.dirt.length>16||m.faults.length>100||!Number.isSafeInteger(m.nextId)||m.nextId<1||![m.nextAt,m.nextFaultAt].every(n=>Number.isFinite(n)&&n>=0))throw Error('Invalid maintenance');
 for(const item of [...m.dirt,...m.faults]){if(!Number.isInteger(item.id)||item.id<1||item.id>=m.nextId||ids.has(item.id))throw Error('Invalid maintenance id');ids.add(item.id);}
 for(const d of m.dirt)if(![d.x,d.y,d.severity].every(Number.isFinite)||d.severity<=0||d.x<0||d.y<0||d.x>g.grid.w-1||d.y>g.grid.h-1||d.roomId!==null&&!g.room(d.roomId))throw Error('Invalid dirt');
 const fixtures=new Set();for(const f of m.faults){const key=`${f.roomId}:${f.furnitureId}`;if(!g.room(f.roomId)?.furniture.some(o=>o.id===f.furnitureId)||fixtures.has(key)||!Number.isFinite(f.since)||f.since<0)throw Error('Invalid fault');fixtures.add(key);}
 const jobs=new Set();for(const s of g.staff){if(s.job===null)continue;const j=s.job,key=`${j?.kind}:${j?.id}`;if(!j||s.role!=='janitor'||s.awaitingPlacement||s.resting||s.state!=='cleaning'||!['dirt','fault'].includes(j.kind)||!['travel','work'].includes(j.phase)||!Number.isFinite(j.elapsed)||j.elapsed<0||j.elapsed>5||!position(g,j)||jobs.has(key))throw Error('Invalid maintenance job');jobs.add(key);if(j.phase==='work'&&(s.path.length||Math.hypot(s.x-position(g,j).x,s.y-position(g,j).y)>.08))throw Error('Invalid maintenance arrival');}
}
