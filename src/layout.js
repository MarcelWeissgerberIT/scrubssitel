import {FURNITURE,satisfiesRequirement,requirements,rotatedSize,furnitureRect,furniturePorts} from './objects.js';

export const ACTOR_RADIUS=.22;
export const LAYOUT_GRID=.25;
const EPS=1e-7,cache=new WeakMap(),same=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<EPS;
const actor=p=>({x:p.x-.5,y:p.y-.5}),physical=p=>({x:p.x+.5,y:p.y+.5});
export function roomDoor(r){return {x:r.x+Math.floor(r.w/2),y:r.y<8?r.y+r.h:r.y-1};}
export function innerDoor(r){return {x:r.x+Math.floor(r.w/2),y:r.y<8?r.y+r.h-.75:r.y-.25};}
function geometry(r){const key=`${r.x},${r.y},${r.w},${r.h},${r.type}|${JSON.stringify(r.furniture||[])}`;let g=cache.get(r);if(g?.key===key)return g;
 const solids=[];for(const f of r.furniture||[]){const spec=FURNITURE[f.kind];if(!spec)continue;for(const rect of spec.solids)solids.push({...furnitureRect(r,f,rect),id:`${f.id}:${rect.part}`,furnitureId:f.id});}
 g={key,solids,ports:furniturePorts(r),nodes:null};cache.set(r,g);return g;
}
export function solidRects(r){return geometry(r).solids;}
function onSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;if(len<EPS)return same(p,a);const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/len;return t>=-EPS&&t<=1+EPS&&Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)<EPS*Math.max(1,Math.sqrt(len));}
const permitted=(port,options)=>!port.requiresDoor||options.doorFurnitureId===port.furnitureId;
function interactionAt(g,p,options){return g.ports.find(port=>port.approach&&permitted(port,options)&&onSegment(p,port,port.approach));}
function exemptions(g,a,b,options){return new Set(g.ports.filter(p=>p.approach&&permitted(p,options)&&onSegment(a,p,p.approach)&&onSegment(b,p,p.approach)).map(p=>p.solidId));}
function pointInBounds(r,p){const q=physical(p),d=physical(roomDoor(r));if(q.x>=r.x+ACTOR_RADIUS-EPS&&q.x<=r.x+r.w-ACTOR_RADIUS+EPS&&q.y>=r.y+ACTOR_RADIUS-EPS&&q.y<=r.y+r.h-ACTOR_RADIUS+EPS)return true;
 return Math.abs(q.x-d.x)<=.3+EPS&&(r.y<8?q.y>=r.y+r.h-.75-EPS&&q.y<=d.y+EPS:q.y<=r.y+.75+EPS&&q.y>=d.y-EPS);
}
function segmentRect(a,b,rect,radius=ACTOR_RADIUS){const p=physical(a),q=physical(b),minX=rect.x-radius,maxX=rect.x+rect.w+radius,minY=rect.y-radius,maxY=rect.y+rect.h+radius;let lo=0,hi=1;for(const [v,d,min,max] of [[p.x,q.x-p.x,minX,maxX],[p.y,q.y-p.y,minY,maxY]]){if(Math.abs(d)<EPS){if(v<=min+EPS||v>=max-EPS)return false;}else{const t1=(min-v)/d,t2=(max-v)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>=hi-EPS)return false;}}return lo<=hi+EPS&&hi>=0&&lo<=1;}
function rawBlocked(r,g,a,b,ignore=new Set()){if(!pointInBounds(r,a)||!pointInBounds(r,b))return true;
 // The union of the inset room and its narrow doorway is not convex.
 const length=Math.hypot(b.x-a.x,b.y-a.y);for(let n=1;n<Math.ceil(length/.1);n++){const t=n/Math.ceil(length/.1);if(!pointInBounds(r,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return true;}
 return g.solids.some(rect=>!ignore.has(rect.id)&&segmentRect(a,b,rect));
}
export function segmentBlocked(r,a,b,{allowInteraction=true,doorFurnitureId=null}={}){if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return true;const g=geometry(r);return rawBlocked(r,g,a,b,allowInteraction?exemptions(g,a,b,{doorFurnitureId}):new Set());}
// Global movement can test every room with this predicate: unlike segmentBlocked
// it checks furniture only, and does not reject ordinary corridor coordinates.
export function furnitureBlocked(r,a,b,{allowInteraction=true,doorFurnitureId=null}={}){if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return true;const g=geometry(r),ignore=allowInteraction?exemptions(g,a,b,{doorFurnitureId}):new Set();return g.solids.some(rect=>!ignore.has(rect.id)&&segmentRect(a,b,rect));}
export function pointBlocked(r,p,{allowInteraction=false}={}){return segmentBlocked(r,p,p,{allowInteraction});}
function graph(r,g){if(g.nodes)return g.nodes;const nodes=new Map();for(let ix=1;ix<r.w*4;ix++)for(let iy=1;iy<r.h*4;iy++){const p=actor({x:r.x+ix/4,y:r.y+iy/4});if(!rawBlocked(r,g,p,p))nodes.set(`${ix},${iy}`,{...p,key:`${ix},${iy}`,ix,iy,edges:[]});}
 for(const node of nodes.values())for(const [dx,dy] of [[0,-1],[1,0],[-1,0],[0,1]]){const other=nodes.get(`${node.ix+dx},${node.iy+dy}`);if(other&&!rawBlocked(r,g,node,other))node.edges.push(other.key);}
 const d=roomDoor(r),inner=innerDoor(r),innerKey=`${Math.round((inner.x+.5-r.x)*4)},${Math.round((inner.y+.5-r.y)*4)}`;
 if(nodes.has(innerKey)&&!rawBlocked(r,g,d,inner)){nodes.set('door',{...d,key:'door',edges:[innerKey]});nodes.get(innerKey).edges.push('door');}
 g.nodes=nodes;return nodes;
}
function links(r,g,nodes,p){if(same(p,roomDoor(r)))return nodes.has('door')?['door']:[];const ix=(p.x+.5-r.x)*4,iy=(p.y+.5-r.y)*4,out=[];for(let x=Math.floor(ix)-1;x<=Math.ceil(ix)+1;x++)for(let y=Math.floor(iy)-1;y<=Math.ceil(iy)+1;y++){const node=nodes.get(`${x},${y}`);if(node&&!rawBlocked(r,g,p,node))out.push(node.key);}const d=nodes.get('door');if(d&&Math.hypot(p.x-d.x,p.y-d.y)<1.3&&!rawBlocked(r,g,p,d))out.push('door');return out;
}
export function insidePath(r,from,to,options={}){
 if(!from||!to||![from.x,from.y,to.x,to.y].every(Number.isFinite))return null;
 const door=roomDoor(r),inner=innerDoor(r),fromDoor=same(from,door),toDoor=same(to,door);
 if(fromDoor&&toDoor)return [];
 // Doorway approach is a mandatory waypoint. A closed door must never stop a
 // person at the beginning of a long segment several tiles inside the room.
 if(fromDoor||toDoor){if(segmentBlocked(r,door,inner))return null;const path=interiorPath(r,fromDoor?inner:from,toDoor?inner:to,options);if(path===null)return null;return [...(fromDoor?[{...inner}]:[]),...path,...(toDoor?[{...door}]:[])];}
 return interiorPath(r,from,to,options);
}
function interiorPath(r,from,to,options){
 if(!from||!to||![from.x,from.y,to.x,to.y].every(Number.isFinite))return null;
 const g=geometry(r);if(!segmentBlocked(r,from,to,options))return same(from,to)?[]:[{x:to.x,y:to.y}];
 const startPort=interactionAt(g,from,options),endPort=interactionAt(g,to,options),start=startPort?.approach||from,end=endPort?.approach||to;
 if(startPort&&segmentBlocked(r,from,start,options)||endPort&&segmentBlocked(r,end,to,options))return null;
 if(rawBlocked(r,g,start,start)||rawBlocked(r,g,end,end))return null;
 let middle=[];
 if(!rawBlocked(r,g,start,end)){if(!same(start,end))middle.push({x:end.x,y:end.y});}
 else{const nodes=graph(r,g),starts=links(r,g,nodes,start),ends=new Set(links(r,g,nodes,end));if(!starts.length||!ends.size)return null;const q=[...starts],prev=new Map(starts.map(k=>[k,null]));let last=null;
  for(let i=0;i<q.length;i++){const key=q[i];if(ends.has(key)){last=key;break;}for(const next of nodes.get(key).edges)if(!prev.has(next)){prev.set(next,key);q.push(next);}}
  if(last===null)return null;for(let k=last;k!==null;k=prev.get(k)){const p=nodes.get(k);middle.unshift({x:p.x,y:p.y});}if(!same(middle.at(-1)||start,end))middle.push({x:end.x,y:end.y});
  // Only shortcut segments verified against the same inflated furniture solids.
  const reduced=[];let anchor=start;for(let i=0;i<middle.length;){let next=i;while(next+1<middle.length&&!rawBlocked(r,g,anchor,middle[next+1]))next++;if(!same(anchor,middle[next])){reduced.push(middle[next]);anchor=middle[next];}i=next+1;}middle=reduced;
 }
 const route=[...(startPort&&!same(from,start)?[{x:start.x,y:start.y}]:[]),...middle,...(endPort&&!same(end,to)?[{x:to.x,y:to.y}]:[])];
 return route.filter((p,i)=>!same(p,i?route[i-1]:from));
}
export function workPoint(r){return geometry(r).ports.find(p=>p.kind==='work')||null;}
export function patientPoint(r){return geometry(r).ports.find(p=>p.kind==='patient')||null;}
export function roomSeats(r,purpose=r.type){return r.type===purpose?geometry(r).ports.filter(p=>p.kind==='seat').map((p,index)=>({...p,index})):[];}
const overlap=(a,b)=>a.x<b.x+b.w-EPS&&a.x+a.w>b.x+EPS&&a.y<b.y+b.h-EPS&&a.y+a.h>b.y+EPS;
function structuralError(r){if(!Array.isArray(r.furniture)||r.furniture.length>60)return 'furnitureInvalid';const ids=new Set(),boxes=[],wallBoxes=[];let primary=false;for(const f of r.furniture){const spec=f&&Object.hasOwn(FURNITURE,f.kind)?FURNITURE[f.kind]:null;if(!spec||typeof f.id!=='string'||!f.id.length||f.id.length>80||ids.has(f.id)||![f.x,f.y].every(n=>Number.isFinite(n)&&Math.abs(n*4-Math.round(n*4))<EPS)||![0,1,2,3].includes(f.rotation))return 'furnitureInvalid';ids.add(f.id);if(!spec.rooms.includes(r.type))return 'furnitureRoom';if(spec.ports.some(p=>p.kind==='work')){if(primary)return 'furnitureDuplicate';primary=true;}const size=rotatedSize(spec,f.rotation),box={x:f.x,y:f.y,...size};if(box.x<0||box.y<0||box.x+box.w>r.w+EPS||box.y+box.h>r.h+EPS)return 'furnitureBounds';if(spec.wall){if(!(f.rotation===0&&f.y===0||f.rotation===3&&f.x===0))return 'furnitureWall';if(f.rotation===0&&r.y>=8&&box.x<Math.floor(r.w/2)+1-EPS&&box.x+box.w>Math.floor(r.w/2)+EPS)return 'furnitureDoor';if(wallBoxes.some(other=>overlap(other,box)))return 'furnitureOverlap';wallBoxes.push(box);}else{if(boxes.some(other=>overlap(other,box)))return 'furnitureOverlap';boxes.push(box);}}
 const d=physical(roomDoor(r)),portal={x:d.x-.35,y:r.y<8?r.y+r.h-.75:r.y,w:.7,h:.75};if(geometry(r).solids.some(rect=>overlap(rect,portal)))return 'furnitureDoor';return null;
}
export function layoutStatus(r){let blocked=structuralError(r);const items=Array.isArray(r.furniture)?r.furniture:[],missing=requirements(r.type).map(req=>({...req,have:req.kind==='seat'?items.reduce((sum,f)=>sum+(Object.hasOwn(FURNITURE,f?.kind)?FURNITURE[f.kind].ports.filter(p=>p.kind==='seat').length:0),0):items.filter(f=>satisfiesRequirement(f?.kind,req.kind)).length})).filter(v=>v.have<v.need);if(!blocked){const d=roomDoor(r);if(pointBlocked(r,innerDoor(r))||geometry(r).ports.some(p=>!p.optional&&insidePath(r,d,p,p.requiresDoor?{doorFurnitureId:p.furnitureId}:{})===null))blocked='furnitureBlocked';}return {ready:!blocked&&!missing.length,missing,blocked};}
export function validatePlacement(r,item,ignoreId=null){const furniture=(r.furniture||[]).filter(f=>f.id!==ignoreId);const candidate={...r,furniture:[...furniture,{...item}]};return layoutStatus(candidate).blocked;}
export function defaultFurniture(r,{legacyToilet=false}={}){
 const draft={...r,furniture:[]};let serial=0;
 const put=(kind,x,y,rotation=0)=>{const item={id:`default-${kind}-${++serial}`,kind,x,y,rotation};if(!validatePlacement(draft,item)){draft.furniture.push(item);return true;}serial--;return false;};
 const search=kind=>{for(const rotation of [0,1,2,3])for(let y=.25;y<r.h;y+=.25)for(let x=.25;x<r.w;x+=.25)if(put(kind,x,y,rotation))return true;return false;};
 if(r.type==='reception'){if(!put('counter',.25,.75))search('counter');}
 else if(['gp','pharmacy','therapy','surgery','lab'].includes(r.type)){if(!put(r.type,.25,.75))search(r.type);}
 else if(r.type==='toilet'){const kind=legacyToilet?'toilet':'toilet-cubicle';if(!put(kind,.25,legacyToilet||r.y>=8?.75:.25,!legacyToilet&&r.y>=8?2:0))search(kind);if(!put('sink',r.w-1,.75))search('sink');}
 else if(['waiting','lounge'].includes(r.type)){
  const kind=r.type==='lounge'?'sofa':'chair';if(!put(kind,.25,.75))search(kind);
  const target=Math.min(r.type==='waiting'?8:4,Math.max(1,Math.floor(r.w*r.h/4)));
  for(let y=.75;y<r.h-1;y+=1.5)for(let x=.25;x<r.w-.5&&roomSeats(draft).length<target;x+=r.type==='lounge'?2:1)put(kind,x,y);
 }
 return draft.furniture;
}
