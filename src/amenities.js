import {FURNITURE,furniturePorts} from './objects.js';
import {insidePath,segmentBlocked} from './layout.js';

export const AMENITY_STATES=['amenityTravel','amenityBuy','amenityReturn'];
const near=(a,b)=>!!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const active=p=>AMENITY_STATES.includes(p.state);
const canRun=g=>g.admissionsOpen===true&&!g.over&&!g.event;
const vending=kind=>Object.hasOwn(FURNITURE,kind||'')?FURNITURE[kind].vending:null;

export function initAmenities(p,clock=0){p.amenity=null;p.amenityPurchased=false;p.amenityNextAt=clock+8+p.id%5;}
// The caller owns its next patient state: a call, evacuation or departure must
// replace the trip immediately without moving the patient back to their seat.
export function cancelAmenity(p,clock=0){p.amenity=null;p.amenityNextAt=Math.max(p.amenityNextAt||0,clock+12);}

function visit(g,p){
 const a=p.amenity,r=a&&g.room(a.roomId),item=r?.furniture.find(f=>f.id===a.furnitureId),spec=item&&vending(item.kind);
 const port=spec&&furniturePorts(r).find(v=>v.furnitureId===item.id&&v.kind==='use'),seat=r&&g.seats(r)[p.seatIndex];
 return a&&r?.type==='waiting'&&g.roomReady(r)&&p.seatRoom===r.id&&item?.kind===a.kind&&port&&seat?{a,r,item,spec,port,seat}:null;
}
function arrive(p,v){
 if(p.state==='amenityTravel'&&near(p,v.port)){p.state='amenityBuy';p.amenity.elapsed=0;return true;}
 if(p.state==='amenityReturn'&&near(p,v.seat)){p.state='seated';p.amenity=null;return true;}
 return false;
}
function abortVisit(g,p){
 cancelAmenity(p,g.clock);
 const r=g.room(p.seatRoom),seat=r&&g.seats(r)[p.seatIndex],path=r&&g.roomReady(r)&&seat?insidePath(r,p,seat):null;
 if(path!==null){p.path=path;p.state=path.length?'seatTravel':'seated';return;}
 p.path=r?g.corridorPath(p,g.door(r))||[]:[];p.seatRoom=null;p.seatIndex=null;p.targetRoom=null;p.state=p.path.length?'relocating':'waiting';
}

export function tryStartAmenity(g,p){
 if(!canRun(g)||!p.registered||p.state!=='seated'||p.amenity||p.amenityPurchased||p.patience<20||g.clock<p.amenityNextAt||p.id%4===0)return false;
 const r=g.room(p.seatRoom),seat=r&&g.seats(r)[p.seatIndex];
 if(r?.type!=='waiting'||!g.roomReady(r)||!seat||!near(p,seat))return false;
 const ports=furniturePorts(r),choices=[];
 for(const item of r.furniture){
  const spec=vending(item.kind);if(!spec)continue;
  if(g.patients.some(other=>other!==p&&other.amenity?.roomId===r.id&&other.amenity.furnitureId===item.id))continue;
  const port=ports.find(v=>v.furnitureId===item.id&&v.kind==='use');if(!port)continue;
  if([...g.patients,...g.staff].some(other=>other!==p&&Math.hypot(other.x-port.x,other.y-port.y)<.4))continue;
  const path=insidePath(r,p,port);if(path===null||insidePath(r,port,seat)===null)continue;
  choices.push({item,port,path});
 }
 if(!choices.length){p.amenityNextAt=g.clock+3;return false;}
 // The patient's stable identity selects a product without consuming the game's
 // random stream or changing the medical queue order.
 const choice=choices[(Math.imul(p.id,2654435761)>>>0)%choices.length];
 p.amenity={roomId:r.id,furnitureId:choice.item.id,kind:choice.item.kind,elapsed:0,paid:false};
 p.path=choice.path;p.state=choice.path.length?'amenityTravel':'amenityBuy';return true;
}

export function updateAmenity(g,p,dt){
 if(!active(p))return false;
 if(!canRun(g)||!Number.isFinite(dt)||dt<=0)return true;
 const v=visit(g,p);if(!v){abortVisit(g,p);return true;}
 if(p.state==='amenityBuy'){
  // An animation, a saved paid flag or simply standing near a machine can never
  // create another receipt. Only a complete, unpaid visit at its port can pay.
  if(!near(p,v.port)||p.path.length){abortVisit(g,p);return true;}
  v.a.elapsed=Math.min(v.spec.duration,v.a.elapsed+dt);
  if(v.a.elapsed+1e-9<v.spec.duration)return true;
  const back=insidePath(v.r,p,v.seat);if(back===null){abortVisit(g,p);return true;}
  if(!v.a.paid&&!p.amenityPurchased){
   v.a.paid=true;p.amenityPurchased=true;
   g.cash+=v.spec.price-v.spec.cost;g.income+=v.spec.price;g.expenses+=v.spec.cost;
   g.amenitySales??={count:0,revenue:0,costs:0};g.amenitySales.count++;g.amenitySales.revenue+=v.spec.price;g.amenitySales.costs+=v.spec.cost;
  }
  p.path=back;p.state='amenityReturn';if(!back.length)arrive(p,v);return true;
 }
 g.move(p,dt);if(!p.path.length&&!arrive(p,v))abortVisit(g,p);return true;
}

export function repathAmenities(g){
 for(const p of g.patients){
  if(!active(p))continue;const v=visit(g,p);if(!v){abortVisit(g,p);continue;}
  if(p.state==='amenityBuy'){if(!near(p,v.port))abortVisit(g,p);continue;}
  const path=insidePath(v.r,p,p.state==='amenityTravel'?v.port:v.seat);
  if(path===null){abortVisit(g,p);continue;}p.path=path;if(!path.length)arrive(p,v);
 }
}

export function amenityActivity(g,roomId,furnitureId){
 const p=g?.patients?.find(p=>p.state==='amenityBuy'&&p.amenity?.roomId===roomId&&p.amenity.furnitureId===furnitureId&&!p.amenity.paid);
 const spec=p&&vending(p.amenity.kind);return spec?{active:true,patientId:p.id,progress:Math.max(0,Math.min(1,p.amenity.elapsed/spec.duration))}:null;
}

export function validateAmenities(g){
 const reserved=new Set();
 for(const p of g.patients){
  if(typeof p.amenityPurchased!=='boolean'||!Number.isFinite(p.amenityNextAt)||p.amenityNextAt<0||p.amenity===undefined)throw Error('Invalid amenity history');
  if(p.amenity===null){if(active(p))throw Error('Missing amenity visit');continue;}
  const a=p.amenity;if(!active(p)||!a||typeof a!=='object'||Array.isArray(a)||!Number.isInteger(a.roomId)||typeof a.furnitureId!=='string'||typeof a.kind!=='string'||typeof a.paid!=='boolean'||!Number.isFinite(a.elapsed)||a.elapsed<0)throw Error('Invalid amenity visit');
  const v=visit(g,p),key=`${a.roomId}:${a.furnitureId}`;
  if(!v||reserved.has(key)||a.elapsed>v.spec.duration||!p.registered||p.stage==='exit'||!Array.isArray(p.path))throw Error('Invalid amenity reservation');
  reserved.add(key);
  if(p.state==='amenityReturn'){
   if(!a.paid||!p.amenityPurchased||Math.abs(a.elapsed-v.spec.duration)>1e-7||!p.path.length||!near(p.path.at(-1),v.seat))throw Error('Invalid paid amenity return');
  }else if(a.paid||p.amenityPurchased)throw Error('Invalid amenity payment');
  if(p.state==='amenityTravel'&&(a.elapsed!==0||!p.path.length||!near(p.path.at(-1),v.port)))throw Error('Invalid amenity approach');
  if(p.state==='amenityBuy'&&(p.path.length||!near(p,v.port)||a.elapsed>=v.spec.duration))throw Error('Invalid amenity purchase');
  let previous=p;for(const step of p.path){if(segmentBlocked(v.r,previous,step))throw Error('Invalid amenity route');previous=step;}
  const target=p.state==='amenityReturn'?v.seat:v.port;if(insidePath(v.r,p,target)===null)throw Error('Unreachable amenity visit');
 }
}
