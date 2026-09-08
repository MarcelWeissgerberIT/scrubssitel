import {roomObjects} from './objects.js';

export function objectDepth(o){
 // Seat backs go behind the seated person; the counter goes in front of them.
 if(['chair','sofa'].includes(o.kind))return o.x+o.y+.2;
 return o.x+o.y+(o.w+o.h)/2-(o.kind==='stool'?.12:0);
}

export function sceneLayers(game,people){
 const layers=game.rooms.flatMap(room=>roomObjects(room).map(object=>({kind:'object',room,object,depth:objectDepth(object)})));
 for(const layer of layers)if(['bell','monitor'].includes(layer.object.kind)){
  const counter=layers.find(other=>other.room.id===layer.room.id&&other.object.kind==='counter');
  if(counter)layer.depth=Math.max(layer.depth,counter.depth+.02);
 }
 for(const person of people){
  layers.push({kind:'person',person,depth:person.x+person.y+1});
  if(person.role==='receptionist'&&person.hasSeat&&person.state==='working'){
   const counter=layers.find(layer=>layer.object?.kind==='counter'&&layer.room.id===person.roomId);
   if(counter)layers.push({kind:'hands',person,depth:counter.depth+.01});
  }
 }
 return layers.sort((a,b)=>a.depth-b.depth);
}
