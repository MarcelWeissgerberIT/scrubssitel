import {roomObjects} from './objects.js';

export function objectDepth(o){
 // Seat backs go behind the seated person; the counter goes in front of them.
 if(['chair','sofa','stool'].includes(o.kind)){const backFacesCamera=[1,2].includes(o.rotation||0);return o.x+o.y+(o.w+o.h)/2+(backFacesCamera?.10:-.16);}
 return o.x+o.y+(o.w+o.h)/2;
}

export function sceneLayers(game,people){
 const layers=game.rooms.flatMap(room=>roomObjects(room).map(object=>({kind:'object',room,object,depth:objectDepth(object)})));
 for(const layer of layers)if(['bell','monitor'].includes(layer.object.kind)){
  const counter=layers.find(other=>other.room.id===layer.room.id&&other.object.furnitureId===layer.object.furnitureId&&other.object.kind==='counter');
  if(counter)layer.depth=Math.max(layer.depth,counter.depth+.02);
 }
 for(const person of people){
  layers.push({kind:'person',person,depth:person.x+person.y+1});
  if(person.role==='receptionist'&&person.hasSeat&&person.state==='working'){
   const counter=layers.find(layer=>layer.object?.kind==='counter'&&layer.room.id===person.roomId);
   if(counter&&counter.depth>person.x+person.y+1)layers.push({kind:'hands',person,depth:counter.depth+.01});
  }
 }
 return layers.sort((a,b)=>a.depth-b.depth);
}
