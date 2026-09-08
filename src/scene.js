import {roomObjects,furniturePorts} from './objects.js';

export function objectDepth(o,seatPorts=[]){
 // Seat backs go behind the seated person; the counter goes in front of them.
 if(['chair','sofa','stool'].includes(o.kind)){const backFacesCamera=[1,2].includes(o.rotation||0),depths=seatPorts.filter(port=>port.furnitureId===o.furnitureId&&port.kind==='seat').map(port=>port.x+port.y+1);if(o.kind==='sofa'&&depths.length)return (backFacesCamera?Math.max(...depths):Math.min(...depths))+(backFacesCamera?.10:-.16);return o.x+o.y+(o.w+o.h)/2+(backFacesCamera?.10:-.16);}
 return o.x+o.y+(o.w+o.h)/2;
}

// Short wall pieces can interleave with nearby furniture and walking actors.
export function roomWalls(room){
 const walls=[],doorX=room.x+Math.floor(room.w/2),frontDoor=room.y<8,waiting=room.type==='waiting';
 const strip=(side,x,y,w,h,z,tone,gap=false)=>{const horizontal=w>h,length=horizontal?w:h;for(let n=0;n<length-1e-8;n+=.5){const span=Math.min(.5,length-n),xx=x+(horizontal?n:0),yy=y+(horizontal?0:n);if(gap&&xx>=doorX-1e-8&&xx<doorX+1-1e-8)continue;const next=xx+span,joinEnd=n+span<length-1e-8&&!(gap&&next>=doorX-1e-8&&next<doorX+1-1e-8);walls.push({id:`${room.id}:wall:${side}:${n}`,side,x:xx,y:yy,w:horizontal?span:w,h:horizontal?h:span,z,tone,joinEnd});}};
 strip('back',room.x,room.y,room.w,.12,waiting?.27:1.2,waiting?18:25,!frontDoor);
 strip('left',room.x,room.y,.12,room.h,waiting?.27:1.2,waiting?12:15);
 strip('front',room.x,room.y+room.h-.12,room.w,.12,.27,3,frontDoor);
 strip('right',room.x+room.w-.12,room.y,.12,room.h,.27,-5);
 return walls;
}
const mountedOn=(a,b)=>['poster','clock'].includes(a.object?.kind)&&b.kind==='wall'&&a.room.id===b.room.id&&b.wall.side===(a.object.rotation===3?'left':'back');
const cache=new WeakMap(),divider=layer=>layer.kind==='wall'||['privacy-screen','glass-partition'].includes(layer.object?.kind);
function bounds(layer){
 const p=layer.person,o=layer.wall||layer.object,b=p?{x:p.x+.24,y:p.y+.24,w:.52,h:.52,z:1.3}:o;
 const x=b.x,y=b.y,xx=x+b.w,yy=y+b.h,z=b.z||1,base={poster:.64,clock:.83,monitor:.57,bell:.57}[o?.kind]||0;
 return {x,y,xx,yy,left:(x-yy)/2,right:(xx-y)/2,top:(x+y)*.255-z,bottom:(xx+yy)*.255-base};
}
function before(a,b){
 // A camera ray travels toward increasing x/y. Only add an ordering edge when
 // projected volumes overlap and their floor footprints are separable.
 if(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top)return 0;
 const ab=a.xx<=b.x+1e-8||a.yy<=b.y+1e-8,ba=b.xx<=a.x+1e-8||b.yy<=a.y+1e-8;
 return ab===ba?0:ab?-1:1;
}
function connect(edges,indegree,from,to){if(!edges[from].includes(to)){edges[from].push(to);indegree[to]++;}}
function staticScene(game){
 const key=JSON.stringify(game.rooms.map(r=>[r.id,r.type,r.x,r.y,r.w,r.h,r.furniture]));let stored=cache.get(game);if(stored?.key===key)return stored;
 const layers=game.rooms.flatMap(room=>{const objects=roomObjects(room),seats=objects.some(o=>o.kind==='sofa')?furniturePorts(room):[];return [...roomWalls(room).map(wall=>({kind:'wall',room,wall,depth:wall.x+wall.y+(wall.w+wall.h)/2})),...objects.map(object=>({kind:'object',room,object,depth:objectDepth(object,seats)}))];});
 for(const layer of layers)if(['bell','monitor'].includes(layer.object?.kind)){const counter=layers.find(other=>other.room.id===layer.room.id&&other.object?.furnitureId===layer.object.furnitureId&&other.object.kind==='counter');if(counter)layer.depth=Math.max(layer.depth,counter.depth+.02);}
 layers.sort((a,b)=>a.depth-b.depth);const boxes=layers.map(bounds),edges=layers.map(()=>[]),indegree=layers.map(()=>0);
 for(let i=0;i<layers.length;i++)for(let j=i+1;j<layers.length;j++)if(divider(layers[i])||divider(layers[j])){if(mountedOn(layers[i],layers[j]))connect(edges,indegree,j,i);else if(mountedOn(layers[j],layers[i]))connect(edges,indegree,i,j);else{const order=before(boxes[i],boxes[j]);if(order)connect(edges,indegree,order<0?i:j,order<0?j:i);}}
 stored={key,layers,boxes,edges,indegree};cache.set(game,stored);return stored;
}
function ordered(layers,edges,indegree){
 const heap=[],done=new Set(),out=[],less=(a,b)=>layers[a].depth<layers[b].depth||layers[a].depth===layers[b].depth&&a<b;
 const push=value=>{let n=heap.length;heap.push(value);while(n){const parent=(n-1)>>1;if(!less(heap[n],heap[parent]))break;[heap[n],heap[parent]]=[heap[parent],heap[n]];n=parent;}};
 const pop=()=>{const value=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let n=0;while(true){let child=n*2+1;if(child>=heap.length)break;if(child+1<heap.length&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],heap[n]))break;[heap[n],heap[child]]=[heap[child],heap[n]];n=child;}}return value;};
 indegree.forEach((n,i)=>{if(!n)push(i);});
 while(out.length<layers.length){if(!heap.length){const remaining=layers.map((_,i)=>i).filter(i=>!done.has(i)).sort((a,b)=>layers[a].depth-layers[b].depth);push(remaining[0]);}const n=pop();if(done.has(n))continue;done.add(n);out.push(layers[n]);for(const next of edges[n])if(--indegree[next]===0)push(next);}
 return out;
}
export function sceneLayers(game,people){
 const base=staticScene(game),layers=[...base.layers],boxes=[...base.boxes],edges=base.edges.map(edge=>[...edge]),indegree=[...base.indegree];
 for(const person of people){
  const index=layers.length;layers.push({kind:'person',person,depth:person.x+person.y+1});boxes.push(bounds(layers[index]));edges.push([]);indegree.push(0);
  if(person.role==='receptionist'&&person.hasSeat&&['working','preparing'].includes(person.state)){
   const counter=layers.findIndex(layer=>layer.object?.kind==='counter'&&layer.room.id===person.roomId);
   if(counter>=0&&layers[counter].depth>person.x+person.y+1){const hands=layers.length;layers.push({kind:'hands',person,depth:layers[counter].depth+.01});boxes.push(bounds(layers[hands]));edges.push([]);indegree.push(0);connect(edges,indegree,index,hands);connect(edges,indegree,counter,hands);}
  }
 }
 for(let i=0;i<base.layers.length;i++)if(divider(layers[i]))for(let j=base.layers.length;j<layers.length;j++){const order=before(boxes[i],boxes[j]);if(order)connect(edges,indegree,order<0?i:j,order<0?j:i);}
 return ordered(layers,edges,indegree);
}
