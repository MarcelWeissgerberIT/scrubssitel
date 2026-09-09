import {furniturePorts} from './objects.js';
import {insidePath} from './layout.js';

export const NEED_STATES=['needTravel','needUse','needReturn'];
const clamp=n=>Math.max(0,Math.min(100,n)),near=(a,b)=>!!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const protectedPhases=['enter','close','use','exitOpen','exit','exitClose','washTravel','wash'];
const durations={open:.4,close:.4,use:6,exitOpen:.4,exitClose:.4,wash:2,play:4,read:4};
export function initNeeds(p,clock=0){p.needs={hunger:15+p.id%4*10,thirst:20+p.id%3*12,bladder:20+p.id%6*9,boredom:20+p.id%4*12};p.activity=null;p.needsNextAt=clock+4;}
export function consumePurchase(p,kind){if(!p.needs)return;if(kind==='snack-machine')p.needs.hunger=clamp(p.needs.hunger-65);else if(kind==='drink-machine'){p.needs.thirst=clamp(p.needs.thirst-70);p.needs.bladder=clamp(p.needs.bladder+8);}else{p.needs.hunger=clamp(p.needs.hunger-15);p.needs.boredom=clamp(p.needs.boredom-25);}}
export function updateNeeds(p,dt){if(!p.needs||p.stage==='exit')return;for(const [kind,rate] of Object.entries({hunger:.045,thirst:.06,bladder:.08,boredom:p.child?.13:.09}))p.needs[kind]=clamp(p.needs[kind]+dt*rate);}
export function needsPenalty(p){return p.needs?Object.values(p.needs).reduce((sum,n)=>sum+Math.max(0,n-70),0)*.08:0;}
function port(r,id){return r&&furniturePorts(r).find(v=>v.furnitureId===id&&v.kind==='use');}
function visit(g,p){const a=p.activity,r=a&&g.room(a.roomId),item=r?.furniture.find(f=>f.id===a.furnitureId),use=port(r,a?.furnitureId),sink=port(r,a?.sinkId);return a&&r&&item&&use?{a,r,item,use,outside:use.approach||use,sink}:null;}
function reserved(g,p,roomId,id){return g.patients.some(q=>q!==p&&q.activity?.roomId===roomId&&[q.activity.furnitureId,q.activity.sinkId].includes(id));}
function setPhase(p,phase,path=[]){p.activity.phase=phase;p.activity.elapsed=0;p.path=path;p.state=phase==='return'?'needReturn':['travel','enter','exit','washTravel'].includes(phase)?'needTravel':'needUse';}
function backToSeat(g,p){
 const room=g.room(p.seatRoom),seat=room&&g.seats(room)[p.seatIndex],path=room&&g.roomReady(room)&&seat?g.routeInto(p,room,seat):null;
 if(path!==null){setPhase(p,'return',path);return;}
 p.activity=null;p.needsNextAt=g.clock+12;p.path=g.corridorPath(p,{x:12,y:16})||[];p.seatRoom=null;p.seatIndex=null;p.targetRoom=null;p.state=p.path.length?'relocating':'waiting';
}
export function cancelNeed(g,p,evacuate=false){
 if(!p.activity)return true;
 if(p.activity.kind==='toilet'&&protectedPhases.includes(p.activity.phase)){p.activity.abort=true;p.activity.evacuate||=evacuate;return false;}
 p.activity=null;p.needsNextAt=g.clock+12;return true;
}
export function tryStartNeed(g,p){
 if(!g.admissionsOpen||g.over||g.event||p.state!=='seated'||!p.registered||p.activity||p.amenity||g.clock<p.needsNextAt)return false;
 const kind=p.needs.bladder>=62?'toilet':p.needs.boredom>=48?(p.child?'play':'read'):null;if(!kind)return false;
 const choices=[];
 for(const r of g.rooms.filter(r=>g.roomReady(r)&&(kind==='toilet'?r.type==='toilet':r.id===p.seatRoom)))for(const item of r.furniture){
  if(!(kind==='toilet'?['toilet','toilet-cubicle'].includes(item.kind):item.kind===(kind==='play'?'toys':'books'))||reserved(g,p,r.id,item.id))continue;
  const use=port(r,item.id);if(!use)continue;const outside=use.approach||use,path=g.routeInto(p,r,outside);if(path===null)continue;
  const sink=kind==='toilet'?r.furniture.find(f=>f.kind==='sink'&&!reserved(g,p,r.id,f.id)&&port(r,f.id)&&insidePath(r,outside,port(r,f.id))!==null):null;if(kind==='toilet'&&!sink)continue;
  if(g.patients.some(q=>q!==p&&(Math.hypot(q.x-outside.x,q.y-outside.y)<.6||q.activity?.roomId===r.id&&visit(g,q)&&Math.hypot(visit(g,q).outside.x-outside.x,visit(g,q).outside.y-outside.y)<.6)))continue;
  choices.push({r,item,path,sink});
 }
 if(!choices.length){p.needsNextAt=g.clock+5;return false;}const choice=choices.sort((a,b)=>a.path.length-b.path.length||a.r.id-b.r.id)[0];
 p.activity={kind,roomId:choice.r.id,furnitureId:choice.item.id,sinkId:choice.sink?.id??null,phase:'travel',elapsed:0,abort:false,evacuate:false};setPhase(p,'travel',choice.path);return true;
}
export function updateNeed(g,p,dt){
 if(!NEED_STATES.includes(p.state))return false;if(!g.admissionsOpen||g.over||g.event||dt<=0)return true;
 const v=visit(g,p);if(!v){p.activity=null;p.seatRoom=null;p.seatIndex=null;p.targetRoom=null;p.path=g.corridorPath(p,{x:12,y:16})||[];p.state=p.path.length?'relocating':'waiting';return true;}
 const {a,r,use,outside}=v;
 if((r.renovating||!r.ready)&&!a.abort){if(cancelNeed(g,p,true)){p.activity=a;a.abort=true;backToSeat(g,p);return true;}}
 if(['travel','enter','exit','washTravel','return'].includes(a.phase)){
  if(a.phase==='travel'&&g.patients.some(q=>q!==p&&Math.hypot(q.x-outside.x,q.y-outside.y)<.6))return true;
  g.move(p,dt);if(p.path.length)return true;
  if(a.phase==='return'){p.activity=null;p.needsNextAt=g.clock+20;p.state='seated';return true;}
  if(a.phase==='travel'){if(!near(p,outside)){backToSeat(g,p);return true;}setPhase(p,a.kind==='toilet'&&use.approach?'open':'use');}
  else if(a.phase==='enter')setPhase(p,'close');
  else if(a.phase==='exit')setPhase(p,'exitClose');
  else setPhase(p,'wash');
  return true;
 }
 a.elapsed+=dt;const duration=a.phase==='use'&&a.kind!=='toilet'?durations[a.kind]:durations[a.phase];if(a.elapsed+1e-9<duration)return true;
 if(a.phase==='open'){const path=insidePath(r,outside,use,{doorFurnitureId:a.furnitureId});if(path===null){backToSeat(g,p);return true;}setPhase(p,'enter',path);}
 else if(a.phase==='close')setPhase(p,'use');
 else if(a.phase==='use'){
  if(a.kind==='toilet'){p.needs.bladder=5;if(use.approach)setPhase(p,'exitOpen');else if(a.abort&&a.evacuate)backToSeat(g,p);else setPhase(p,'washTravel',insidePath(r,p,v.sink)||[]);}
  else{p.needs.boredom=8;backToSeat(g,p);}
 }else if(a.phase==='exitOpen')setPhase(p,'exit',insidePath(r,use,outside,{doorFurnitureId:a.furnitureId})||[]);
 else if(a.phase==='exitClose'){if(a.abort&&a.evacuate)backToSeat(g,p);else setPhase(p,'washTravel',insidePath(r,p,v.sink)||[]);}
 else if(a.phase==='wash'){p.patience=clamp(p.patience+1);backToSeat(g,p);}
 return true;
}
export function needActivity(g,roomId,furnitureId){
 const p=g?.patients?.find(p=>p.activity?.roomId===roomId&&[p.activity.furnitureId,p.activity.sinkId].includes(furnitureId));if(!p)return null;const a=p.activity;
 const duration=a.phase==='use'&&a.kind!=='toilet'?durations[a.kind]:durations[a.phase]||1,progress=Math.min(1,a.elapsed/duration);
 const doorOpen=['enter','exit'].includes(a.phase)?1:['open','exitOpen'].includes(a.phase)?progress:['close','exitClose'].includes(a.phase)?1-progress:0;
 return {kind:a.kind,phase:a.phase,progress,doorOpen,patientId:p.id};
}
export function repathNeeds(g){for(const p of g.patients){const v=visit(g,p);if(!v)continue;const {a,r,use,outside}=v;let path;if(a.phase==='travel')path=g.routeInto(p,r,outside);else if(a.phase==='enter'||a.phase==='exit')path=insidePath(r,p,a.phase==='enter'?use:outside,{doorFurnitureId:a.furnitureId});else if(a.phase==='washTravel')path=insidePath(r,p,v.sink);else if(a.phase==='return'){const wr=g.room(p.seatRoom);path=wr&&g.routeInto(p,wr,g.seats(wr)[p.seatIndex]);}if(path!==undefined&&path!==null)p.path=path;}}
export function validateNeeds(g){
 const reservedIds=new Set();for(const p of g.patients){if(!p.needs||Object.keys(p.needs).sort().join(',')!=='bladder,boredom,hunger,thirst'||Object.values(p.needs).some(n=>!Number.isFinite(n)||n<0||n>100)||!Number.isFinite(p.needsNextAt)||p.needsNextAt<0||p.activity===undefined)throw Error('Invalid patient needs');
  if(p.activity===null){if(NEED_STATES.includes(p.state))throw Error('Missing needs visit');continue;}
  const v=visit(g,p),a=p.activity;if(!v||!NEED_STATES.includes(p.state)||!p.registered||p.stage==='exit'||!['toilet','play','read'].includes(a.kind)||!['travel','open','enter','close','use','exitOpen','exit','exitClose','washTravel','wash','return'].includes(a.phase)||!Number.isFinite(a.elapsed)||a.elapsed<0||a.elapsed>6.25||typeof a.abort!=='boolean'||typeof a.evacuate!=='boolean')throw Error('Invalid needs visit');
  if(a.kind==='toilet'&&(!v.sink||!v.r.furniture.some(f=>f.id===a.sinkId&&f.kind==='sink')||!['toilet','toilet-cubicle'].includes(v.item.kind))||a.kind!=='toilet'&&(a.sinkId!==null||v.item.kind!==(a.kind==='play'?'toys':'books')))throw Error('Invalid needs sink');
  for(const id of [a.furnitureId,a.sinkId].filter(Boolean)){const key=`${a.roomId}:${id}`;if(reservedIds.has(key))throw Error('Duplicate needs reservation');reservedIds.add(key);}
  if(['open','exitClose'].includes(a.phase)&&!near(p,v.outside)||['close','use','exitOpen'].includes(a.phase)&&!near(p,v.use)||a.phase==='wash'&&!near(p,v.sink))throw Error('Invalid needs arrival');
  const wr=g.room(p.seatRoom),target=a.phase==='travel'||a.phase==='exit'?v.outside:a.phase==='enter'?v.use:a.phase==='washTravel'?v.sink:a.phase==='return'?wr&&g.seats(wr)[p.seatIndex]:null;
  if(target){if(!near(p.path.at(-1)||p,target))throw Error('Invalid needs route');}else if(p.path.length)throw Error('Moving during needs use');
 }
}
