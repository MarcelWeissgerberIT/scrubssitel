import {ROOMS,tr,ILLNESSES} from './content.js';
import {CharacterAnimator,SEAT_HEIGHT,mix} from './animation.js';
import {CharacterModel} from './characters.js';
import {GRID} from './game.js';
import {roomObjects,FURNITURE,furniturePorts} from './objects.js';
import {roomSeats,workPoint,patientPoint} from './layout.js';
import {sceneLayers} from './scene.js';
import {drawRoomObject} from './room-art.js';
const shade=(color,amount)=>{let values;if(color.startsWith('#')){const n=parseInt(color.slice(1),16);values=[n>>16,(n>>8)&255,n&255];}else values=(color.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number);return `rgb(${values.map(n=>Math.max(0,Math.min(255,Math.round(n+amount)))).join(',')})`;};
export class Renderer{
 constructor(canvas,options){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=options;this.zoom=1;this.pan={x:0,y:0};this.panMode=false;this.panCandidate=null;this.hover=null;this.drag=null;this.pointer=null;this.keyboard={x:3,y:11};this.selected=null;this.lang='en';this.buildType=null;this.game=null;this.staffVisuals=new Map();this.hits=[];this.lastTime=0;this.guideRect=null;this.animator=new CharacterAnimator();this.characterModel=new CharacterModel(this.ctx);this.previousPatients=new Map();this.previousStaff=new Map();this.snapshotGame=null;this.editor=null;this.carriedStaffId=null;this.staffPickCandidate=null;this.activePointerId=null;
  new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(this.carriedStaffId!==null)this.cancelStaffCarry();});
  canvas.addEventListener('pointerdown',e=>this.pointerDown(e));
  canvas.addEventListener('pointermove',e=>this.pointerMove(e));
  canvas.addEventListener('pointerup',e=>this.pointerUp(e));
  canvas.addEventListener('pointercancel',e=>{if(this.activePointerId===null||e.pointerId===this.activePointerId){this.clearPointer();this.cancelStaffCarry();}});
  canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===this.activePointerId){this.clearPointer();this.cancelStaffCarry();}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey){this.pan.x-=e.deltaX||e.deltaY||0;}else if(e.deltaY)this.setZoom(this.zoom+(e.deltaY<0?.1:-.1));},{passive:false});
  canvas.addEventListener('keydown',e=>{if(this.carriedStaffId!==null){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.cancelStaffCarry();}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();this.dropCarriedStaff();}return;}const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];if(this.editor?.tool){this.editor.tool.x=Math.round((this.editor.tool.x+x*.25)*4)/4;this.editor.tool.y=Math.round((this.editor.tool.y+y*.25)*4)/4;if(FURNITURE[this.editor.tool.kind].wall){if(this.editor.tool.rotation===3)this.editor.tool.x=0;else this.editor.tool.y=0;}}else if(this.buildType){this.keyboard.x=Math.max(1,Math.min(22,this.keyboard.x+x));this.keyboard.y=Math.max(1,Math.min(16,this.keyboard.y+y));this.hover={...this.keyboard};if(this.drag)this.drag.end={...this.keyboard};}else{this.pan.x-=x*25;this.pan.y-=y*25;}}if(e.key==='Enter'){if(this.editor?.tool){e.preventDefault();this.options.onFurniturePlace?.({...this.editor.tool});}else if(this.buildType){e.preventDefault();if(this.drag){this.options.onBuild(this.buildType,this.rectangle());this.drag=null;}else this.drag={start:{...this.keyboard},end:{...this.keyboard}};}}});
 }
 // A pending press still selects normally; only an intentional drag picks up staff.
 pointerDown(e){
  if(e.isPrimary===false||this.activePointerId!==null)return;
  if(this.panMode&&(this.buildType||this.editor))this.setPanMode(false);
  this.canvas.focus();this.pointer={x:e.clientX,y:e.clientY};
  if(this.carriedStaffId!==null&&e.button===2){e.preventDefault();this.cancelStaffCarry();return;}
  this.activePointerId=e.pointerId;this.canvas.setPointerCapture?.(e.pointerId);
  if(e.button===2||e.button===1){if(this.carriedStaffId===null)this.panning=true;return;}
  if(this.carriedStaffId!==null){this.down=this.tile(e);return;}
  this.updateFurnitureHover(e);const pos=this.tile(e);
  if(this.buildType&&!this.editor)this.drag={start:pos,end:pos};
  else{this.down=this.panMode?null:pos;if(!this.editor){const hit=this.hitAt(e),threshold=e.pointerType==='touch'?9:6;if(this.panMode||!hit)this.panCandidate={x:e.clientX,y:e.clientY,pan:{...this.pan},threshold};else if(hit.type==='staff')this.staffPickCandidate={id:hit.id,x:e.clientX,y:e.clientY,threshold};}}
  this.updatePointerCursor(e);
 }
 pointerMove(e){
  if(e.isPrimary===false||this.activePointerId!==null&&e.pointerId!==this.activePointerId)return;
  if(this.panning&&this.pointer){this.pan.x+=e.clientX-this.pointer.x;this.pan.y+=e.clientY-this.pointer.y;}
  const pan=this.panCandidate;if(pan&&Math.hypot(e.clientX-pan.x,e.clientY-pan.y)>=pan.threshold){this.pan.x=pan.pan.x+e.clientX-pan.x;this.pan.y=pan.pan.y+e.clientY-pan.y;this.panCandidate=null;this.panning=true;this.down=null;this.staffPickCandidate=null;}
  this.pointer={x:e.clientX,y:e.clientY};this.hover=this.tile(e);
  const candidate=this.staffPickCandidate;
  if(candidate&&Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)>=candidate.threshold){this.staffPickCandidate=null;this.pickUpStaff(candidate.id);}
  if(this.carriedStaffId!==null){this.canvas.style.cursor='grabbing';return;}
  if(this.drag)this.drag.end=this.hover;if(!this.panning)this.updateFurnitureHover(e);this.updatePointerCursor(e);
 }
 pointerUp(e){
  if(e.pointerId!==this.activePointerId)return;
  this.pointer={x:e.clientX,y:e.clientY};
  if(this.carriedStaffId!==null){if(e.button!==1&&e.button!==2)this.dropCarriedStaff();this.clearPointer();return;}
  if(this.panning){this.clearPointer();this.updatePointerCursor(e);return;}
  if(this.editor?.tool&&this.down){this.updateFurnitureHover(e);this.options.onFurniturePlace?.({...this.editor.tool});}
  else if(this.drag){const rect=this.rectangle();this.options.onBuild(this.buildType,rect);}
  else if(this.down){const pos=this.tile(e);if(Math.abs(pos.x-this.down.x)+Math.abs(pos.y-this.down.y)<2)this.selectAt(pos,e);}
  this.clearPointer();this.updatePointerCursor(e);
 }
 clearPointer(){const id=this.activePointerId;this.activePointerId=null;this.panning=false;this.drag=null;this.down=null;this.staffPickCandidate=null;this.panCandidate=null;this.canvas.style.cursor=this.carriedStaffId!==null?'grabbing':this.panMode?'grab':this.editor?.tool||this.buildType?'crosshair':'';if(id!==null)try{this.canvas.releasePointerCapture?.(id);}catch{}}
 setPanMode(enabled){const next=!!enabled&&!this.editor&&!this.buildType&&this.carriedStaffId===null;if(next!==this.panMode){this.panMode=next;this.clearPointer();this.options.onPanModeChange?.(next);}this.updatePointerCursor();return this.panMode;}
 updatePointerCursor(event){if(this.carriedStaffId!==null||this.panning){this.canvas.style.cursor='grabbing';return;}if(this.panMode){this.canvas.style.cursor='grab';return;}if(this.editor||this.buildType){this.canvas.style.cursor=this.editor?.tool||this.buildType?'crosshair':'';return;}const hit=event&&this.hitAt(event);this.canvas.style.cursor=hit?.type==='staff'&&this.game?.canPickUpStaff?.(hit.id)===null?'grab':'';}
 pickUpStaff(id){
  if(this.editor||this.buildType||this.carriedStaffId!==null||!this.game)return false;
  const error=this.game.canPickUpStaff?.(id);if(error!==null){if(error)this.options.onStaffError?.(error);return false;}
  this.setPanMode(false);if(this.options.onStaffPick?.(id)!==true)return false;
  this.carriedStaffId=id;this.staffCarryStarted=performance.now();this.drag=null;this.down=null;this.staffPickCandidate=null;
  const bounds=this.canvas.getBoundingClientRect();if(!this.pointer||this.pointer.x<bounds.left||this.pointer.x>bounds.left+bounds.width||this.pointer.y<bounds.top||this.pointer.y>bounds.top+bounds.height)this.pointer={x:bounds.left+this.w/2,y:bounds.top+this.h/2};
  this.canvas.style.cursor='grabbing';return true;
 }
 clearStaffCarry(){const id=this.carriedStaffId;this.carriedStaffId=null;this.staffCarryStarted=null;this.animator.actors.delete(id);this.previousStaff.delete(id);this.clearPointer();this.canvas.style.cursor='';}
 cancelStaffCarry(){if(this.carriedStaffId===null)return false;this.clearStaffCarry();this.options.onStaffCancel?.();return true;}
 staffDropTarget(){
  if(this.carriedStaffId===null||!this.pointer)return null;
  const bounds=this.canvas.getBoundingClientRect(),inside=this.pointer.x>=bounds.left&&this.pointer.x<=bounds.left+bounds.width&&this.pointer.y>=bounds.top&&this.pointer.y<=bounds.top+bounds.height;
  const floor=this.floorPoint({clientX:this.pointer.x,clientY:this.pointer.y}),point={x:floor.x-.5,y:floor.y-.5},room=this.game.rooms.find(r=>floor.x>=r.x&&floor.x<r.x+r.w&&floor.y>=r.y&&floor.y<r.y+r.h);
  return {room,roomId:room?.id??null,point,error:inside?this.game.staffPlacement?.(this.carriedStaffId,room?.id??null,point)??null:'outside'};
 }
 dropCarriedStaff(){const target=this.staffDropTarget();if(!target)return false;if(target.error){this.options.onStaffError?.(target.error);return false;}if(this.options.onStaffDrop?.(this.carriedStaffId,target.roomId,target.point)!==true)return false;this.clearStaffCarry();return true;}
 drawStaffCarry(time){
  const staff=this.game.staff.find(s=>s.id===this.carriedStaffId),target=this.staffDropTarget();if(!staff||!target)return;
  const c=this.ctx,valid=!target.error,color=valid?'#388a64':'#b65445',ground=this.project(target.point.x+.5,target.point.y+.5,.08),bounds=this.canvas.getBoundingClientRect();
  if(target.room)this.tileFace(target.room.x+.04,target.room.y+.04,target.room.w-.08,target.room.h-.08,.08,valid?'#83c99538':'#e37b6a38',color);
  this.ellipse(ground.x,ground.y,this.tw*.24,this.tw*.12,valid?'#8bd5ab99':'#e8978999');c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(ground.x,ground.y,this.tw*.24,this.tw*.12,0,0,Math.PI*2);c.stroke();
  const elapsed=(performance.now()-this.staffCarryStarted)/1000,swing=Math.sin(elapsed*4)*.07,px=this.pointer.x-bounds.left,py=this.pointer.y-bounds.top,pose={yaw:this.animator.actors.get(staff.id)?.yaw??0,phase:elapsed*2,walk:.12,sit:0,work:0,celebrate:0,time:time+elapsed};
  // The hand holds the collar while the complete articulated body hangs below it.
  c.save();c.translate(px,py);c.rotate(swing);this.characterModel.draw({...staff,staff:true,state:'idle',hasSeat:false},pose,{x:0,y:this.tw*.80},this.tw);
  c.translate(this.tw*.28,this.tw*.24);c.scale(-this.tw*.60,this.tw*.60);c.lineJoin='round';c.lineCap='round';c.fillStyle='#fff3d6';c.strokeStyle='#71634e';c.lineWidth=.027;
  c.beginPath();c.moveTo(-.22,-.24);c.lineTo(-.20,-.46);c.quadraticCurveTo(-.13,-.51,-.09,-.44);c.lineTo(-.07,-.29);c.lineTo(.16,-.26);c.quadraticCurveTo(.29,-.22,.25,-.11);c.lineTo(.18,.03);c.quadraticCurveTo(.08,.11,-.06,.04);c.lineTo(-.13,-.06);c.quadraticCurveTo(-.26,-.06,-.22,-.24);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(.01,-.22);c.lineTo(.15,-.19);c.moveTo(-.02,-.13);c.lineTo(.11,-.10);c.stroke();c.fillStyle='#8dafba';c.fillRect(-.24,-.47,.18,.09);c.restore();
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=r.width*d;this.canvas.height=r.height*d;this.ctx.setTransform(d,0,0,d,0,0);}
 setZoom(z){this.zoom=Math.max(.55,Math.min(1.9,z));}
 reset(){this.zoom=1;this.pan={x:0,y:0};if(this.editor)this.centerRoom(this.editor.roomId);}
 startEditor(roomId){this.setPanMode(false);this.cancelStaffCarry();this.zoom=Math.max(this.zoom,1.75);this.editor={roomId,itemId:null,tool:null};this.buildType=null;this.drag=null;this.down=null;this.centerRoom(roomId);}
 centerRoom(roomId){const room=this.game?.room(roomId);if(!room)return;this.metrics();const center=this.project(room.x+room.w/2,room.y+room.h/2);const compact=this.w<700,available=compact?this.w:Math.max(200,this.w-350);this.pan.x+=available/2-center.x;this.pan.y+=(compact?Math.max(150,(this.h-285)/2):this.h/2+25)-center.y;}
 setFurnitureTool(kind,item=null){if(!this.editor||!FURNITURE[kind])return;const room=this.game?.room(this.editor.roomId);this.editor.tool=item?{...item}:{kind,x:.5,y:.5,rotation:0};this.editor.itemId=item?.id??null;if(room&&!item){const f=FURNITURE[kind];this.editor.tool.x=Math.round((room.w-f.w)/2*4)/4;this.editor.tool.y=f.wall?0:Math.round((room.h-f.h)/2*4)/4;}}
 cancelFurnitureTool(){if(this.editor)this.editor.tool=null;}
 rotateFurnitureTool(){if(!this.editor?.tool)return;const tool=this.editor.tool,f=FURNITURE[tool.kind],room=this.game.room(this.editor.roomId);if(f.wall){const wasBack=tool.rotation===0;tool.rotation=wasBack?3:0;if(wasBack){tool.y=Math.max(0,Math.min(room.h-f.w,tool.x));tool.x=0;}else{tool.x=Math.max(0,Math.min(room.w-f.w,tool.y));tool.y=0;}}else tool.rotation=(tool.rotation+1)%4;this.options.onFurnitureToolChange?.();}
 floorPoint(e){const r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left-this.ox,y=e.clientY-r.top-this.oy;return {x:x/this.tw+y/this.th,y:y/this.th-x/this.tw};}
 updateFurnitureHover(e){const tool=this.editor?.tool,room=this.game?.room(this.editor?.roomId);if(!tool||!room)return;const point=this.floorPoint(e),f=FURNITURE[tool.kind],w=tool.rotation%2?f.h:f.w,h=tool.rotation%2?f.w:f.h;tool.x=Math.round((point.x-room.x-w/2)*4)/4;tool.y=Math.round((point.y-room.y-h/2)*4)/4;if(f.wall){if(tool.rotation===3)tool.x=0;else tool.y=0;}}
 objectRenderer(object){if(!object.frame||!object.local)return {renderer:this,object};const frame=object.frame,project=this.project.bind(this),rotation=frame.rotation||0;const probe=Object.create(this);probe.project=(x,y,z=0)=>{const [xx,yy]=rotation===1?[frame.h-y,x]:rotation===2?[frame.w-x,frame.h-y]:rotation===3?[y,frame.w-x]:[x,y];return project(frame.x+xx,frame.y+yy,z);};return {renderer:probe,object:{...object,...object.local}};}
 drawRoomFloor(room){const col=ROOMS[room.type].color,wood=['reception','waiting','lounge','therapy'].includes(room.type),warm={reception:'#e7c995',waiting:'#efe0b7',lounge:'#dbc599',therapy:'#e3d3e8',pharmacy:'#dce8ce',surgery:'#e8dce4',lab:'#d8e6d5',gp:'#dce9dd',toilet:'#dce8e7'}[room.type];this.tileFace(room.x,room.y,room.w,room.h,.025,warm||col);for(let x=room.x;x<room.x+room.w;x++)for(let y=room.y;y<room.y+room.h;y++){this.tileFace(x,y,1,1,.03,(x+y)%2?warm||col:shade(warm||col,7),wood?'#b9a87a22':'#ffffff60');if(wood)for(let i=1;i<4;i++)this.tileFace(x+i*.25,y,.007,1,.032,'#a48b6620');else if((x+y)%3===0)this.tileFace(x+.36,y+.36,.28,.28,.032,shade(col,5));}this.tileFace(room.x+.14,room.y+.14,room.w-.28,.08,.033,'#bf986e50');}
 drawFurnitureAccess(room,valid=true,ignoreId=null){const c=this.ctx;for(const port of furniturePorts(room)){if(port.furnitureId===ignoreId)continue;const access=port.approach||port,point=this.project(access.x+.5,access.y+.5,.075),toward=port.approach?this.project(port.x+.5,port.y+.5,.075):this.project(port.x+.5+Math.sin(port.lookYaw)*.3,port.y+.5+Math.cos(port.lookYaw)*.3,.075);c.strokeStyle=valid?'#48895b':'#b56851';c.lineWidth=Math.max(1,this.tw*.024);c.beginPath();c.moveTo(point.x,point.y);c.lineTo(toward.x,toward.y);c.stroke();this.ellipse(point.x,point.y,this.tw*.115,this.tw*.058,valid?'#b7e0abdd':'#edb4a1dd');c.beginPath();c.ellipse(point.x,point.y,this.tw*.115,this.tw*.058,0,0,Math.PI*2);c.stroke();for(const side of [-1,1])this.ellipse(point.x+side*this.tw*.03,point.y,this.tw*.016,this.tw*.03,valid?'#568856':'#a76250');}}
 previewError(room,tool){const key=JSON.stringify([room.furniture,tool]);if(this.previewCheck?.room===room&&this.previewCheck.key===key)return this.previewCheck.error;const error=this.game.furniturePlacement(room.id,{...tool,id:tool.id||'preview'},tool.id);this.previewCheck={room,key,error};return error;}
 drawFurnitureEditor(time){const room=this.game?.room(this.editor?.roomId);if(!room)return;const c=this.ctx;this.tileFace(room.x,room.y,room.w,room.h,.045,'#fff3bb10','#d0a557');for(let x=room.x+.25;x<room.x+room.w;x+=.25)for(let y=room.y+.25;y<room.y+room.h;y+=.25){const p=this.project(x,y,.05);this.ellipse(p.x,p.y,1,1,'#6b8d6d45');}const door=this.game.door(room);this.tileFace(door.x,door.y,1,1,.065,'#f2d69066','#ba9369');const tool=this.editor.tool;this.drawFurnitureAccess(room,true,tool?.id);if(!tool)return;const f=FURNITURE[tool.kind],w=tool.rotation%2?f.h:f.w,h=tool.rotation%2?f.w:f.h,error=this.previewError(room,tool),valid=!error;this.tileFace(room.x+tool.x,room.y+tool.y,w,h,.07,valid?'#87c79b70':'#e58c8170',valid?'#397f57':'#b95648');const ghostRoom={...room,furniture:[{...tool,id:'preview'}]},probe=Object.assign(Object.create(this),{hits:[],selected:null,visualDoors:new Map(this.visualDoors)});c.save();c.globalAlpha=.65;for(const object of roomObjects(ghostRoom).filter(o=>o.furnitureId==='preview'))probe.furniture(ghostRoom,time,[object]);c.restore();this.drawFurnitureAccess(ghostRoom,valid);const point=this.project(room.x+tool.x+w/2,room.y+tool.y+h,.10);c.font='600 12px sans-serif';c.textAlign='center';c.fillStyle=valid?'#2e6748':'#a24438';c.fillText(valid?(this.lang==='de'?'Klicken oder Enter zum Platzieren':'Click or Enter to place'):(this.lang==='de'?'Hier ist kein freier, erreichbarer Platz':'This position is blocked or outside the room'),point.x,point.y+19);c.textAlign='left';}
 metrics(){this.tw=Math.min(this.w/24.8,this.h/12.8)*this.zoom;this.th=this.tw*.51;this.ox=this.w/2-(GRID.w-GRID.h)*this.tw/4+this.pan.x;this.oy=this.h/2-(GRID.w+GRID.h)*this.th/4+28+this.pan.y;}
 project(x,y,z=0){return {x:this.ox+(x-y)*this.tw/2,y:this.oy+(x+y)*this.th/2-z*this.tw};}
 tile(e){const r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left-this.ox,y=e.clientY-r.top-this.oy;return {x:Math.floor(x/this.tw+y/this.th),y:Math.floor(y/this.th-x/this.tw)};}
 rectangle(){const {start:a,end:b}=this.drag;return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x)+1,h:Math.abs(a.y-b.y)+1};}
 hitAt(event){const bounds=this.canvas.getBoundingClientRect(),x=event.clientX-bounds.left,y=event.clientY-bounds.top;return this.hits.slice().reverse().find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h&&this.visibleHit(h,x,y));}
 selectAt(pos,event){if(event){const hit=this.hitAt(event);if(hit){this.options.onSelect(hit.type,hit.id);return;}}const p=this.game.patients.filter(p=>Math.abs(p.x-pos.x)<.8&&Math.abs(p.y-pos.y)<.8).at(-1);if(p)this.options.onSelect('patient',p.id);else {const r=this.game.rooms.find(r=>pos.x>=r.x&&pos.x<r.x+r.w&&pos.y>=r.y&&pos.y<r.y+r.h);this.options.onSelect(r?'room':null,r?.id);}}
 drawWall(layer){const {wall,room}=layer,seam=wall.joinEnd?1.6/this.tw:0;this.box(wall.x,wall.y,wall.w+(wall.w>wall.h?seam:0),wall.h+(wall.h>wall.w?seam:0),wall.z,shade(ROOMS[room.type].color,wall.tone));const corners=[this.project(wall.x,wall.y,wall.z),this.project(wall.x+wall.w,wall.y,wall.z),this.project(wall.x+wall.w,wall.y+wall.h),this.project(wall.x,wall.y+wall.h)],x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));this.hits.push({type:'room',id:room.id,room,wall,x,y,w:Math.max(...corners.map(p=>p.x))-x,h:Math.max(...corners.map(p=>p.y))-y});}
 // Test the painted silhouette only when clicked, without another per-frame render.
 visibleHit(hit,x,y){
  this.hitCanvas??=typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas');
  const canvas=this.hitCanvas;canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.translate(-Math.floor(x),-Math.floor(y));
  if(hit.wall){const probe=Object.assign(Object.create(this),{ctx,hits:[]});probe.drawWall(hit);}
  else if(hit.type==='object'){
   const probe=Object.assign(Object.create(this),{ctx,hits:[],selected:null,visualDoors:new Map(this.visualDoors)});
   probe.furniture(hit.room,this.lastTime,[hit.object]);
  }else new CharacterModel(ctx).draw(hit.person,hit.pose,this.project(hit.person.x+.5,hit.person.y+.5),this.tw,hit.part);
  return ctx.getImageData(0,0,1,1).data[3]>20;
 }
 poly(points,color,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.6;c.stroke();}}
 tileFace(x,y,w,h,z,color,stroke){this.poly([this.project(x,y,z),this.project(x+w,y,z),this.project(x+w,y+h,z),this.project(x,y+h,z)],color,stroke);}
 box(x,y,w,h,z,color,base=0){const p=(a,b,c)=>this.project(a,b,c);this.poly([p(x+w,y,base),p(x+w,y+h,base),p(x+w,y+h,z),p(x+w,y,z)],shade(color,-28));this.poly([p(x,y+h,base),p(x+w,y+h,base),p(x+w,y+h,z),p(x,y+h,z)],shade(color,-13));this.tileFace(x,y,w,h,z,shade(color,12));}
 ellipse(x,y,rx,ry,color){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 plant(x,y){this.box(x-.22,y-.22,.45,.45,.4,'#c6a788');const p=this.project(x,y,.75);this.ellipse(p.x,p.y,this.tw*.27,this.tw*.31,'#5b8b62');this.ellipse(p.x-this.tw*.13,p.y+this.tw*.04,this.tw*.16,this.tw*.2,'#73a576');}
 furniture(r,time=0,objects=roomObjects(r)){for(const o of objects){
  const {x,y,w,h,z,kind}=o,c=this.ctx;
  if(kind==='door'){

   this.visualDoors??=new Map();const old=this.visualDoors.get(r.id)??r.doorOpen,desired=r.doorOpen,open=old+Math.sign(desired-old)*Math.min(Math.abs(desired-old),Math.max(0,time-this.lastTime)*5);this.visualDoors.set(r.id,open);
   const angle=open*Math.PI*.47,xx=x+Math.cos(angle)*.92,yy=y+Math.sin(angle)*.92*(r.y<8?-1:1);
   this.box(x-.07,y-.05,.09,.18,1.14,'#e9dec1');this.box(x+.96,y-.05,.09,.18,1.14,'#e9dec1');
   this.poly([this.project(x,y,.04),this.project(xx,yy,.04),this.project(xx,yy,1.07),this.project(x,y,1.07)],'#82b9ad','#507f74');
   const glass=[this.project(x+(xx-x)*.18,y+(yy-y)*.18,.62),this.project(x+(xx-x)*.8,y+(yy-y)*.8,.62),this.project(x+(xx-x)*.8,y+(yy-y)*.8,.92),this.project(x+(xx-x)*.18,y+(yy-y)*.18,.92)];this.poly(glass,'#d5eee3','#b1d0c5');
   const knob=this.project(x+(xx-x)*.8,y+(yy-y)*.8,.44);this.ellipse(knob.x,knob.y,this.tw*.035,this.tw*.04,'#ffe3a0');
  }else{const view=this.objectRenderer(o);drawRoomObject(view.renderer,r,view.object,time);}
  const points=[this.project(x,y,z),this.project(x+w,y,z),this.project(x+w,y+h,0),this.project(x,y+h,0)],left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));
  const padding=this.tw*.28;this.hits.push({x:left-padding,y:top-padding,w:Math.max(12,right-left)+padding*2,h:Math.max(12,bottom-top)+padding*2,type:'object',id:o.id,room:r,object:o});
  if(this.selected?.type==='object'&&this.selected.id===o.id||this.editor?.itemId&&this.editor.itemId===o.furnitureId){c.strokeStyle='#d7a449';c.lineWidth=2;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();}
 }}

 duck(x,y,size,tilt=0){const c=this.ctx;c.save();c.translate(x,y);c.rotate(tilt);this.ellipse(0,0,size*.48,size*.3,'#ffcf63');this.ellipse(size*.19,-size*.28,size*.27,size*.26,'#ffdf79');this.ellipse(size*.45,-size*.22,size*.16,size*.08,'#e99951');this.ellipse(size*.25,-size*.33,size*.035,size*.043,'#4c5350');this.ellipse(-size*.12,size*.01,size*.2,size*.13,'#efb74e');c.restore();}
 particles(x,y,time,color,glyph){const c=this.ctx;c.fillStyle=color;c.font=`bold ${Math.max(12,this.tw*.26)}px sans-serif`;for(let i=0;i<3;i++){const phase=(time*.7+i/3)%1;c.globalAlpha=1-phase;c.fillText(glyph,x+Math.sin(i*4+time)*this.tw*.2,y-phase*this.tw*.7);}c.globalAlpha=1;}
 captureStep(game){this.snapshotGame=game;this.previousStaff=new Map(game.staff.map(s=>[s.id,{x:s.x,y:s.y}]));this.previousPatients=new Map(game.patients.map(p=>[p.id,{x:p.x,y:p.y}]));}
 person(person,staff=false,time=0){
  const c=this.ctx,p=this.project(person.x+.5,person.y+.5),pose=this.animator.update(person,time);
  this.ellipse(p.x,p.y+this.tw*.025,this.tw*.145,this.tw*.06,'#24463c27');
  const bounds=this.characterModel.draw(person,pose,p,this.tw),height=bounds.height,width=Math.max(this.tw*.38,bounds.width);
  this.hits.push({x:p.x-width/2,y:p.y-height,w:width,h:height+4,type:staff?'staff':'patient',id:person.id,person,pose});
  const bubble=person.cured?'heart':person.state==='amenityBuy'?'coin':person.state==='called'?'call':person.patience<35?'clock':staff&&person.resting?'coffee':person.state==='seated'?(person.child?'bear':['book','dream','duck'][person.id%3]):person.state==='service'?'duck':staff&&person.state==='preparing'?'book':staff&&person.state==='working'?'care':!staff&&person.stage==='reception'?'ticket':null;
  if(bubble){const size=Math.max(13,this.tw*.32),yy=p.y-height-size*.48-4;c.fillStyle='#fffff6ed';c.beginPath();c.roundRect(p.x-size*.65,yy-size,size*1.3,size*1.3,5);c.fill();c.beginPath();c.moveTo(p.x-3,yy+size*.3);c.lineTo(p.x,yy+size*.48);c.lineTo(p.x+3,yy+size*.3);c.fill();c.fillStyle=person.patience<35?'#c47455':'#4b927b';c.font=`bold ${size}px sans-serif`;c.textAlign='center';this.bubbleIcon(bubble,p.x,yy-size*.36,size*.87);c.textAlign='left';}
  if(this.selected?.id===person.id){c.strokeStyle='#e9ae4d';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+this.tw*.03,this.tw*.22,this.tw*.09,0,0,Math.PI*2);c.stroke();}
 }
 bubbleIcon(kind,x,y,size){const c=this.ctx;c.save();c.translate(x,y);c.scale(size,size);c.lineCap='round';c.lineJoin='round';c.lineWidth=.08;c.strokeStyle='#528476';const dot=(x,y,r,col)=>this.ellipse(x,y,r,r,col);
  if(kind==='coin'){dot(0,0,.35,'#d5a34c');dot(-.025,-.025,.27,'#ffe195');c.fillStyle='#936b32';c.font='bold .48px sans-serif';c.textAlign='center';c.fillText('$',0,.16);}
  else if(kind==='duck'){this.duck(0,.08,.8,0);}
  else if(kind==='bear'){dot(-.2,-.22,.13,'#bd8d58');dot(.2,-.22,.13,'#bd8d58');dot(0,0,.30,'#dcb77b');dot(-.1,-.035,.025,'#584932');dot(.1,-.035,.025,'#584932');dot(0,.12,.12,'#f0d9a5');dot(0,.08,.035,'#66543b');}
  else if(kind==='heart'){c.fillStyle='#78ab8d';c.beginPath();c.moveTo(0,.32);c.bezierCurveTo(-.8,-.12,-.18,-.57,0,-.22);c.bezierCurveTo(.18,-.57,.8,-.12,0,.32);c.fill();}
  else if(kind==='book'||kind==='ticket'){c.fillStyle=kind==='book'?'#f5d993':'#e6c998';c.fillRect(-.36,-.26,.72,.5);c.beginPath();c.moveTo(0,-.23);c.lineTo(0,.21);c.stroke();c.lineWidth=.035;for(const yy of [-.13,-.02,.09]){c.beginPath();c.moveTo(-.28,yy);c.lineTo(-.1,yy);c.moveTo(.1,yy);c.lineTo(.28,yy);c.stroke();}}
  else if(kind==='call'){c.fillStyle='#d4a35c';c.beginPath();c.moveTo(-.28,-.1);c.lineTo(.2,-.32);c.lineTo(.2,.23);c.lineTo(-.28,.1);c.closePath();c.fill();c.beginPath();c.moveTo(-.16,.12);c.lineTo(-.1,.32);c.moveTo(.32,-.18);c.lineTo(.42,-.25);c.moveTo(.33,.04);c.lineTo(.45,.07);c.stroke();}
  else if(kind==='clock'){c.beginPath();c.arc(0,0,.32,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(0,-.2);c.lineTo(0,0);c.lineTo(.16,.12);c.stroke();}
  else if(kind==='coffee'){c.fillStyle='#d6ae72';c.fillRect(-.27,-.13,.47,.38);c.beginPath();c.arc(.24,.03,.13,-Math.PI*.6,Math.PI*.6);c.stroke();c.beginPath();c.moveTo(-.12,-.25);c.lineTo(-.06,-.36);c.stroke();}
  else if(kind==='dream'){dot(-.2,0,.15,'#c4b2d9');dot(0,-.09,.23,'#c4b2d9');dot(.23,0,.16,'#c4b2d9');dot(-.2,.25,.045,'#c4b2d9');}
  else{c.fillStyle='#86b3a1';c.fillRect(-.1,-.34,.2,.68);c.fillRect(-.34,-.1,.68,.2);}c.restore();
 }
 staffActor(s,game,time,alpha=1){
  const r=game.room(s.roomId),previous=this.snapshotGame===game?this.previousStaff.get(s.id):null;
  const state=['travelWork','travelBreak'].includes(s.state)?'travel':s.state==='break'?'resting':s.state==='cleaning'?'cleaning':game.staffReady(s)&&(game.patients.some(p=>p.id===r?.patientId&&p.state==='service')||r?.type==='lab'&&game.project)?'working':game.staffReady(s)&&!game.admissionsOpen?'preparing':'idle';
  const breakRoom=game.room(s.breakRoomId),seat=breakRoom?roomSeats(breakRoom)[s.breakSeatIndex]:null;const lookYaw=s.path.length?undefined:s.state==='break'?seat?.lookYaw??0:r?workPoint(r)?.lookYaw:undefined;
  return {...s,x:previous?mix(previous.x,s.x,alpha):s.x,y:previous?mix(previous.y,s.y,alpha):s.y,state,lookYaw,hasSeat:s.state==='break'?s.breakSeatIndex!==null:game.staffReady(s)&&s.role==='receptionist',staff:true};
 }

 label(r){const c=this.ctx;const p=this.project(r.x+r.w/2,r.y+r.h/2,.15);const size=Math.max(10,Math.min(13,this.tw*.34));const name=tr(ROOMS[r.type].name,this.lang)+(r.renovating?(this.lang==='de'?' · wird freigemacht':' · clearing'):!this.game.roomReady(r)?(this.lang==='de'?' · Entwurf':' · draft'):ROOMS[r.type].role?' · '+r.id:'')+(r.type==='waiting'?' · '+this.game.patients.filter(p=>p.seatRoom===r.id).length+'/'+this.game.seats(r).length:'');c.font=`700 ${size}px "Trebuchet MS", sans-serif`;const width=c.measureText(name).width+20;const yy=p.y+this.tw*1.0;c.fillStyle='#fffff4ed';c.beginPath();c.roundRect(p.x-width/2,yy,width,25,7);c.fill();c.fillStyle='#304e46';c.textAlign='center';c.fillText(name,p.x,yy+17);c.textAlign='left';
  if(ROOMS[r.type].role){const s=this.game.staff.find(s=>s.id===r.staffId);const color=!s?'#d68153':!this.game.staffReady(s)?'#d4a44f':'#62988c';this.ellipse(p.x+width/2-1,yy-1,4,4,color);}
  if(r.patientId){const width=36;const pp=this.project(r.x+r.w/2,r.y+r.h/2,.2);c.fillStyle='#274a4440';c.fillRect(pp.x-18,yy+29,width,4);c.fillStyle='#346f5e';c.fillRect(pp.x-18,yy+29,width*Math.min(1,r.progress/ROOMS[r.type].time),4);}
  const q=this.game.queue(r);if(q){const pp=this.project(r.x+r.w/2,r.y+r.h+.4);c.font='bold 11px sans-serif';c.fillStyle='#376156';c.fillText(`${q} ↳`,pp.x+6,pp.y+5);}
 }
 draw(game,time,alpha=1){this.initializingActors=this.game!==game;if(this.game!==game){this.setPanMode(false);this.cancelStaffCarry();this.clearPointer();this.animator.reset();this.visualDoors?.clear();this.loungeSeats?.clear();this.staffVisuals.clear();this.lastTime=time;this.drag=null;this.down=null;this.panning=false;}this.game=game;if(this.panMode&&(this.buildType||this.editor||this.carriedStaffId!==null))this.setPanMode(false);if(this.carriedStaffId!==null&&!game.staff.some(s=>s.id===this.carriedStaffId))this.cancelStaffCarry();this.layoutKey=game.rooms.map(r=>r.id).join(",");this.metrics();const c=this.ctx;this.hits=[];c.clearRect(0,0,this.w,this.h);
  // The construction surface is actual game geometry, with a navigable tile grid.
  this.box(-.3,-.3,24.6,18.6,-.2,'#a4b7a1',-.65);this.tileFace(0,0,24,18,0,'#edf1f0');
  for(let y=0;y<18;y++)for(let x=0;x<24;x++){const corridor=y>=7&&y<=10||x>=11&&x<=14&&y>7;this.tileFace(x,y,1,1,.005,corridor?((x+y)%2?'#e4eeea':'#eff5f0'):((x+y)%2?'#eef2f3':'#f7f8f5'),'#ffffff26');}
  this.box(0,0,24,.15,1.35,'#b6c9ba');this.box(0,0,.15,18,1.35,'#c2d1bf');
  for(let x=2;x<23;x+=4){this.box(x,0,.12,.22,1.6,'#d3deca');this.box(x+.3,.06,2,.06,1.12,'#89b2b5',.55);}
  for(let y=3;y<17;y+=4)this.box(.06,y,.06,2,1.12,'#98b7b4',.55);
  // The clinic starts with empty floor; furnishings belong to purchased departments.
  const entry=this.project(11.9,17.35);c.save();c.translate(entry.x,entry.y);c.rotate(-.47);c.font=`bold ${Math.max(10,this.tw*.29)}px sans-serif`;c.fillStyle='#638174';c.fillText(this.lang==='de'?'↑  WILLKOMMEN':'↑  WELCOME',-43,0);c.restore();
  for(const room of game.rooms)this.drawRoomFloor(room);
  const people=game.patients.map(p=>{const previous=this.snapshotGame===game?this.previousPatients.get(p.id):null,r=game.room(p.targetRoom),seatRoom=game.room(p.seatRoom),lookYaw=p.state==='amenityBuy'&&seatRoom?furniturePorts(seatRoom).find(port=>port.furnitureId===p.amenity?.furnitureId&&port.kind==='use')?.lookYaw:p.state==='seated'&&seatRoom?roomSeats(seatRoom)[p.seatIndex]?.lookYaw:p.state==='service'&&r?patientPoint(r)?.lookYaw:undefined;return {...p,x:previous?mix(previous.x,p.x,alpha):p.x,y:previous?mix(previous.y,p.y,alpha):p.y,staff:false,lookYaw};});for(const staff of game.staff)if(staff.id!==this.carriedStaffId)people.push(this.staffActor(staff,game,time,alpha));
  for(const layer of sceneLayers(game,people)){
   if(layer.kind==='wall')this.drawWall(layer);
   else if(layer.kind==='object'){if(!(layer.room.id===this.editor?.roomId&&layer.object.furnitureId===this.editor?.tool?.id))this.furniture(layer.room,time,[layer.object]);}
   else if(layer.kind==='person')this.person(layer.person,layer.person.staff,time);
   else{
    const p=layer.person,a=this.animator.actors.get(p.id);
    if(a?.work>.1){this.characterModel.draw(p,a,this.project(p.x+.5,p.y+.5),this.tw,'hands');const hit=this.hits.find(h=>h.type==='staff'&&h.id===p.id);if(hit)this.hits.push({...hit,part:'hands'});}
   }
  }
  for(const r of game.rooms){if(this.selected?.type==='room'&&this.selected.id===r.id)this.tileFace(r.x,r.y,r.w,r.h,.04,'#ffffff08','#fff7bc');if(r.id!==this.editor?.roomId)this.label(r);}
  if(this.editor)this.drawFurnitureEditor(time);
  if(this.guideRect&&!this.buildType){const r=this.guideRect;this.tileFace(r.x,r.y,r.w,r.h,.06,'#e6bc5b25','#daa548');const p=this.project(r.x+r.w/2,r.y+r.h/2,.12);c.font='600 13px sans-serif';c.fillStyle='#a47c30';c.textAlign='center';c.fillText(tr(ROOMS[r.type].name,this.lang)+' +',p.x,p.y);c.textAlign='left';}
  if(this.buildType){const rect=this.drag?this.rectangle():this.hover?{...this.hover,w:3,h:3}:null;if(rect){const valid=!game.placement(this.buildType,rect);this.tileFace(rect.x,rect.y,rect.w,rect.h,.08,valid?'#d5eb6a99':'#e77f7299','#ffffff');const p=this.project(rect.x+rect.w/2,rect.y+rect.h/2,.1);c.font='bold 14px sans-serif';c.fillStyle='#234740';c.textAlign='center';c.fillText(`${rect.w} × ${rect.h}`,p.x,p.y);c.textAlign='left';}}
  if(this.carriedStaffId!==null)this.drawStaffCarry(time);
  this.animator.prune([...people.map(p=>p.id),...(this.carriedStaffId===null?[]:[this.carriedStaffId])]);for(const id of this.staffVisuals.keys())if(!game.staff.some(s=>s.id===id))this.staffVisuals.delete(id);this.lastTime=time;
 }
}
