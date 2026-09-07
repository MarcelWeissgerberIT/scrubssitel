import {ROOMS,tr,ILLNESSES} from './content.js';
import {SpriteBank} from './sprites.js';
import {GRID} from './game.js';
const shade=(color,amount)=>{let values;if(color.startsWith('#')){const n=parseInt(color.slice(1),16);values=[n>>16,(n>>8)&255,n&255];}else values=(color.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number);return `rgb(${values.map(n=>Math.max(0,Math.min(255,Math.round(n+amount)))).join(',')})`;};
export class Renderer{
 constructor(canvas,options){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=options;this.zoom=1;this.pan={x:0,y:0};this.hover=null;this.drag=null;this.pointer=null;this.keyboard={x:3,y:11};this.selected=null;this.lang='en';this.buildType=null;this.game=null;this.sprites=new SpriteBank();this.staffVisuals=new Map();this.hits=[];this.lastTime=0;this.guideRect=null;
  new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{canvas.focus();this.pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);if(e.button===2||e.button===1){this.panning=true;return;}const pos=this.tile(e);if(this.buildType){this.drag={start:pos,end:pos};}else this.down=pos;});
  canvas.addEventListener('pointermove',e=>{if(this.panning&&this.pointer){this.pan.x+=e.clientX-this.pointer.x;this.pan.y+=e.clientY-this.pointer.y;}this.pointer={x:e.clientX,y:e.clientY};this.hover=this.tile(e);if(this.drag)this.drag.end=this.hover;});
  canvas.addEventListener('pointerup',e=>{if(this.panning){this.panning=false;return;}if(this.drag){const rect=this.rectangle();this.options.onBuild(this.buildType,rect);this.drag=null;}else if(this.down){const pos=this.tile(e);if(Math.abs(pos.x-this.down.x)+Math.abs(pos.y-this.down.y)<2)this.selectAt(pos,e);}this.down=null;});
  canvas.addEventListener('pointercancel',()=>{this.panning=false;this.drag=null;this.down=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(this.zoom+(e.deltaY<0?.1:-.1));},{passive:false});
  canvas.addEventListener('keydown',e=>{const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];if(this.buildType){this.keyboard.x=Math.max(1,Math.min(22,this.keyboard.x+x));this.keyboard.y=Math.max(1,Math.min(16,this.keyboard.y+y));this.hover={...this.keyboard};if(this.drag)this.drag.end={...this.keyboard};}else{this.pan.x-=x*25;this.pan.y-=y*25;}}if(e.key==='Enter'&&this.buildType){e.preventDefault();if(this.drag){this.options.onBuild(this.buildType,this.rectangle());this.drag=null;}else this.drag={start:{...this.keyboard},end:{...this.keyboard}};}});
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=r.width*d;this.canvas.height=r.height*d;this.ctx.setTransform(d,0,0,d,0,0);}
 setZoom(z){this.zoom=Math.max(.55,Math.min(1.9,z));}
 reset(){this.zoom=1;this.pan={x:0,y:0};}
 metrics(){this.tw=Math.min(this.w/24.8,this.h/12.8)*this.zoom;this.th=this.tw*.51;this.ox=this.w/2-(GRID.w-GRID.h)*this.tw/4+this.pan.x;this.oy=this.h/2-(GRID.w+GRID.h)*this.th/4+28+this.pan.y;}
 project(x,y,z=0){return {x:this.ox+(x-y)*this.tw/2,y:this.oy+(x+y)*this.th/2-z*this.tw};}
 tile(e){const r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left-this.ox,y=e.clientY-r.top-this.oy;return {x:Math.floor(x/this.tw+y/this.th),y:Math.floor(y/this.th-x/this.tw)};}
 rectangle(){const {start:a,end:b}=this.drag;return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x)+1,h:Math.abs(a.y-b.y)+1};}
 selectAt(pos,event){if(event){const bounds=this.canvas.getBoundingClientRect(),x=event.clientX-bounds.left,y=event.clientY-bounds.top;const hit=this.hits.slice().reverse().find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);if(hit){this.options.onSelect(hit.type,hit.id);return;}}const p=this.game.patients.filter(p=>Math.abs(p.x-pos.x)<.8&&Math.abs(p.y-pos.y)<.8).at(-1);if(p)this.options.onSelect('patient',p.id);else {const r=this.game.rooms.find(r=>pos.x>=r.x&&pos.x<r.x+r.w&&pos.y>=r.y&&pos.y<r.y+r.h);this.options.onSelect(r?'room':null,r?.id);}}
 poly(points,color,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.6;c.stroke();}}
 tileFace(x,y,w,h,z,color,stroke){this.poly([this.project(x,y,z),this.project(x+w,y,z),this.project(x+w,y+h,z),this.project(x,y+h,z)],color,stroke);}
 box(x,y,w,h,z,color,base=0){const p=(a,b,c)=>this.project(a,b,c);this.poly([p(x+w,y,base),p(x+w,y+h,base),p(x+w,y+h,z),p(x+w,y,z)],shade(color,-28));this.poly([p(x,y+h,base),p(x+w,y+h,base),p(x+w,y+h,z),p(x,y+h,z)],shade(color,-13));this.tileFace(x,y,w,h,z,shade(color,12));}
 ellipse(x,y,rx,ry,color){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 plant(x,y){this.box(x-.22,y-.22,.45,.45,.4,'#c6a788');const p=this.project(x,y,.75);this.ellipse(p.x,p.y,this.tw*.27,this.tw*.31,'#5b8b62');this.ellipse(p.x-this.tw*.13,p.y+this.tw*.04,this.tw*.16,this.tw*.2,'#73a576');}
 prop(key,x,y,width){const image=this.sprites.get('prop-'+key);if(!image)return false;const p=this.project(x,y),w=this.tw*width,h=w*image.height/image.width;this.ctx.drawImage(image,p.x-w/2,p.y-h+this.tw*.15,w,h);return true;}
 furniture(r){const x=r.x,y=r.y,w=r.w,h=r.h;
  if(r.type==='reception'){if(!this.prop('reception',x+w*.48,y+h*.52,2.9)){this.box(x+.5,y+1,w-1,.8,.7,'#d9bb93');this.box(x+w/2,y+1.2,.5,.2,1.12,'#427d80',.7);}return;}
  if(r.type==='gp'&&this.sprites.get('prop-desk')&&this.sprites.get('prop-bed')){this.prop('desk',x+w*.32,y+h*.48,2.15);this.prop('bed',x+w*.75,y+h*.68,2.05);return;}
  if(r.type==='pharmacy'&&this.sprites.get('prop-pharmacy')){this.prop('pharmacy',x+w*.45,y+h*.56,3);this.box(x+w-1.25,y+h-1.1,.7,.6,.52,'#ecdfc4');return;}
  if(r.type==='lounge'&&this.sprites.get('prop-lounge')){this.prop('lounge',x+w*.5,y+h*.65,3.15);return;}
  if(r.type==='toilet'&&this.sprites.get('prop-toilet')){this.prop('toilet',x+w*.5,y+h*.6,2.4);return;}

  if(r.type==='gp'){this.box(x+.55,y+.55,1.8,.8,.6,'#e5c995');this.box(x+.58,y+.58,1.74,.74,.63,'#f1dcba',.6);this.box(x+1.4,y+.65,.48,.15,1,'#355c58',.6);this.box(x+.8,y+1.6,.55,.5,.35,'#467f72');this.box(x+w-1.25,y+.6,.8,1.9,.4,'#83b6b4');this.box(x+w-1.24,y+.62,.78,1.85,.54,'#e3ece6',.4);this.box(x+w-1.2,y+1.35,.7,1,.59,'#8abbbb',.54);this.box(x+w-1.2,y+.65,.55,.5,.62,'#faf4e6');this.plant(x+.5,y+h-.7);}
  if(r.type==='pharmacy'){this.box(x+.35,y+.25,w-.7,.6,.95,'#ecebdc');for(let i=0;i<Math.floor(w*2)-2;i++){const xx=x+.5+i*.42;this.box(xx,y+.45,.19,.22,1.13,['#8babc9','#c4bf80','#c08384'][i%3],.95);}this.box(x+.5,y+1.7,2,.7,.62,'#819db5');this.box(x+.65,y+1.85,.5,.4,.82,'#e3e8d2',.62);this.box(x+w-1.1,y+h-1.1,.7,.6,.8,'#829aab');}
  if(r.type==='lounge'){this.box(x+.4,y+.5,w-1,.75,.45,'#c8844a');this.box(x+.4,y+.4,w-1,.25,.75,'#cf8c50');this.box(x+1.3,y+2,1.2,.9,.35,'#e9d7b2');this.box(x+1.65,y+2.2,.2,.2,.52,'#f8f3de',.35);this.box(x+w-1,y+h-1.1,.7,.6,1.1,'#3c6159');this.plant(x+.6,y+h-.6);}
  if(r.type==='therapy'){this.box(x+.45,y+.7,1,2,.4,'#9973a9');this.box(x+.45,y+.7,1,.4,.75,'#ac88ba');this.box(x+w-1.5,y+1,.7,.7,.38,'#738e88');this.box(x+w-1.4,y+2,.6,.6,.43,'#c4ac84');this.plant(x+.5,y+h-.5);}
  if(r.type==='surgery'){this.box(x+w/2-.5,y+h/2-.9,1,2,.7,'#729c94');this.box(x+w/2-.4,y+h/2-.85,.8,.45,.81,'#faf5dd');this.box(x+.4,y+.5,.7,.75,.9,'#d5dccc');this.box(x+.48,y+.6,.5,.2,1.22,'#395d53',.9);this.box(x+w-1,y+.5,.2,.2,1.65,'#98aaa2');}
  if(r.type==='toilet'){for(let i=0;i<Math.max(1,Math.floor(w/1.3));i++){this.box(x+.3+i*1.25,y+.5,.8,.8,.35,'#eef0e6');this.box(x+.35+i*1.25,y+.3,.7,.3,.7,'#e3e8e0');if(i)this.box(x+.1+i*1.25,y+.3,.1,1.7,1.1,'#85aaac');}this.box(x+.5,y+h-.8,w-1,.5,.55,'#bbc9bf');}
  if(r.type==='lab'){this.box(x+.4,y+.5,w-.8,.8,.65,'#e3ddbb');for(let i=0;i<w-1;i++){this.box(x+.6+i,y+.7,.25,.3,1.05,i%2?'#8eaf69':'#8995b8',.65);}this.box(x+1,y+2,.8,.8,1,'#a0b088');this.box(x+1.1,y+2.1,.6,.6,1.15,'#c9e6bb',1);}
 }
 person(person,staff=false,time=0){
  const c=this.ctx,p=this.project(person.x+.5,person.y+.5),walking=['travel','exit','inside'].includes(person.state),working=person.state==='working'||person.state==='service';
  const gait=time*9+(person.id%7),frame=walking?(Math.sin(gait)>0?1:0):working&&Math.sin(time*4)>0?1:0,key=staff?person.castId:`patient-${person.variant||0}`,sprite=this.sprites.get(`${key}-${frame}`)||this.sprites.get(`${key}-0`);
  const height=this.tw*(staff?1.62:1.52),width=height*.75,bob=walking?Math.abs(Math.sin(gait))*this.tw*.047:Math.sin(time*2.4+person.id)*this.tw*.012,lean=walking?Math.sin(gait)*.025:working?Math.sin(time*3)*.018:0;
  this.ellipse(p.x,p.y+this.tw*.06,this.tw*.22,this.tw*.09,'#1d403b35');
  if(sprite){c.save();c.translate(p.x,p.y-bob+this.tw*.1);c.rotate(lean);c.scale(person.facing===-1?-1:1,1);c.drawImage(sprite,-width/2,-height,width,height);c.restore();}
  else{const skin=person.skin||'#dbac87';c.save();c.translate(p.x,p.y);c.fillStyle=person.color||'#5baba1';c.beginPath();c.roundRect(-width*.18,-height*.53,width*.36,height*.4,9);c.fill();this.ellipse(0,-height*.72,width*.23,height*.18,skin);c.fillStyle='#443d34';c.beginPath();c.arc(0,-height*.8,width*.23,Math.PI,Math.PI*2);c.fill();c.fillStyle='#2e3434';c.fillRect(-width*.12,-height*.12,width*.09,height*.12);c.fillRect(width*.04,-height*.12,width*.09,height*.12);this.ellipse(-width*.09,-height*.73,2,3,'#303c36');this.ellipse(width*.09,-height*.73,2,3,'#303c36');c.restore();}
  this.hits.push({x:p.x-width*.45,y:p.y-height,w:width*.9,h:height,type:staff?'staff':'patient',id:person.id});
  const bubble=person.cured?'♥':person.patience<40?'!':staff&&person.resting?'☕':!staff&&person.stage==='reception'?'…':working?(person.role==='receptionist'?'✓':'✚'):null;
  if(bubble){const yy=p.y-height-bob-6;c.fillStyle='#fffff6f2';c.beginPath();c.roundRect(p.x-11,yy-15,22,22,7);c.fill();c.fillStyle=person.patience<40?'#d27659':'#408875';c.font='bold 14px sans-serif';c.textAlign='center';c.fillText(bubble,p.x,yy+1);c.textAlign='left';}
  if(this.selected?.id===person.id){c.strokeStyle='#e9ae4d';c.lineWidth=2.5;c.beginPath();c.ellipse(p.x,p.y+this.tw*.05,this.tw*.28,this.tw*.12,0,0,Math.PI*2);c.stroke();}
 }
 staffActor(s,game,time){
  const room=game.room(s.roomId),lounge=game.rooms.find(r=>r.type==='lounge');let target,signature;
  if(s.resting&&lounge){target={x:lounge.x+lounge.w*.6,y:lounge.y+lounge.h*.65};signature='rest'+lounge.id;}
  else if(room){target={x:room.x+room.w*.25,y:room.y+room.h*.28};signature='room'+room.id;}
  else{const stop=Math.floor(time/5+s.id)%4,points=[{x:4,y:7},{x:10,y:8},{x:19,y:8},{x:12,y:14}];target=points[stop];signature='walk'+stop;}
  let v=this.staffVisuals.get(s.id);if(!v){v={x:12,y:16,path:[],signature:null,facing:1};this.staffVisuals.set(s.id,v);}
  if(v.signature!==signature){let from={x:v.x,y:v.y};const oldRoom=game.rooms.find(r=>game.occupied(Math.round(v.x),Math.round(v.y),[r]));const first=oldRoom?[game.door(oldRoom)]:[];if(first.length)from=first[0];const dest=room&&!s.resting?game.door(room):s.resting&&lounge?game.door(lounge):target;v.path=[...first,...(game.path(from,dest)||[]),target];v.signature=signature;}
  const dt=Math.min(.1,Math.max(0,time-this.lastTime));let distance=dt*2.8;while(v.path.length&&distance>0){const q=v.path[0],dx=q.x-v.x,dy=q.y-v.y,d=Math.hypot(dx,dy);v.facing=dx-dy<0?-1:1;if(d<=distance){v.x=q.x;v.y=q.y;v.path.shift();distance-=d;}else{v.x+=dx/d*distance;v.y+=dy/d*distance;distance=0;}}
  return {...s,x:v.x,y:v.y,facing:v.facing,state:v.path.length?'travel':s.resting?'resting':room?.patientId?'working':'idle',staff:true};
 }

 label(r){const c=this.ctx;const p=this.project(r.x+r.w/2,r.y+r.h/2,.15);const size=Math.max(10,Math.min(13,this.tw*.34));const name=tr(ROOMS[r.type].name,this.lang);c.font=`700 ${size}px "Trebuchet MS", sans-serif`;const width=c.measureText(name).width+20;const yy=p.y+this.tw*1.0;c.fillStyle='#fffff4ed';c.beginPath();c.roundRect(p.x-width/2,yy,width,25,7);c.fill();c.fillStyle='#304e46';c.textAlign='center';c.fillText(name,p.x,yy+17);c.textAlign='left';
  if(ROOMS[r.type].role){const s=this.game.staff.find(s=>s.id===r.staffId);const color=!s?'#d68153':s.resting?'#d4a44f':'#62988c';this.ellipse(p.x+width/2-1,yy-1,4,4,color);}
  if(r.patientId){const width=36;const pp=this.project(r.x+r.w/2,r.y+r.h/2,.2);c.fillStyle='#274a4440';c.fillRect(pp.x-18,yy+29,width,4);c.fillStyle='#346f5e';c.fillRect(pp.x-18,yy+29,width*Math.min(1,r.progress/ROOMS[r.type].time),4);}
  const q=this.game.queue(r);if(q){const pp=this.project(r.x+r.w/2,r.y+r.h+.4);c.font='bold 11px sans-serif';c.fillStyle='#376156';c.fillText(`${q} ↳`,pp.x+6,pp.y+5);}
 }
 draw(game,time){if(this.game!==game){this.staffVisuals.clear();this.lastTime=time;this.drag=null;this.down=null;this.panning=false;}this.game=game;this.metrics();const c=this.ctx;this.hits=[];c.clearRect(0,0,this.w,this.h);
  // The construction surface is actual game geometry, with a navigable tile grid.
  this.box(-.3,-.3,24.6,18.6,-.2,'#a4b7a1',-.65);this.tileFace(0,0,24,18,0,'#edf1f0');
  for(let y=0;y<18;y++)for(let x=0;x<24;x++){const corridor=y>=7&&y<=10||x>=11&&x<=14&&y>7;this.tileFace(x,y,1,1,.005,corridor?((x+y)%2?'#e4eeea':'#eff5f0'):((x+y)%2?'#eef2f3':'#f7f8f5'),'#ffffff26');}
  this.box(0,0,24,.15,1.35,'#b6c9ba');this.box(0,0,.15,18,1.35,'#c2d1bf');
  for(let x=2;x<23;x+=4){this.box(x,0,.12,.22,1.6,'#d3deca');this.box(x+.3,.06,2,.06,1.12,'#89b2b5',.55);}
  for(let y=3;y<17;y+=4)this.box(.06,y,.06,2,1.12,'#98b7b4',.55);
  // The clinic starts with empty floor; furnishings belong to purchased departments.
  const entry=this.project(11.9,17.35);c.save();c.translate(entry.x,entry.y);c.rotate(-.47);c.font=`bold ${Math.max(10,this.tw*.29)}px sans-serif`;c.fillStyle='#638174';c.fillText(this.lang==='de'?'↑  WILLKOMMEN':'↑  WELCOME',-43,0);c.restore();
  for(const r of [...game.rooms].sort((a,b)=>(a.x+a.y)-(b.x+b.y))){const col=ROOMS[r.type].color;this.tileFace(r.x,r.y,r.w,r.h,.025,col);for(let x=r.x;x<r.x+r.w;x++)for(let y=r.y;y<r.y+r.h;y++)this.tileFace(x,y,1,1,.03,(x+y)%2?col:shade(col,7),'#ffffff35');if(r.y<8)this.box(r.x,r.y,r.w,.12,1.2,shade(col,25));else{const door=game.door(r);for(let x=r.x;x<r.x+r.w;x++)if(x!==door.x)this.box(x,r.y,1,.12,1.2,shade(col,25));}this.box(r.x,r.y,.12,r.h,1.2,shade(col,15));
   // Low front partitions leave all action visible. The real door opens toward the central corridor.
   const d=game.door(r);for(let x=r.x;x<r.x+r.w;x++)if(!(r.y<8&&x===d.x))this.box(x,r.y+r.h-.12,1,.12,.27,shade(col,3));this.box(r.x+r.w-.12,r.y,.12,r.h,.27,shade(col,-5));
   this.furniture(r);if(this.selected?.type==='room'&&this.selected.id===r.id){const pts=[this.project(r.x,r.y,.1),this.project(r.x+r.w,r.y,.1),this.project(r.x+r.w,r.y+r.h,.1),this.project(r.x,r.y+r.h,.1)];c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.strokeStyle='#fff7bc';c.lineWidth=3;c.stroke();}}
  const people=game.patients.map(p=>{if(p.state==='queue'){const peers=game.patients.filter(v=>v.state==='queue'&&v.targetRoom===p.targetRoom);const i=peers.indexOf(p),r=game.room(p.targetRoom);return {...p,x:p.x+(i%5-2)*.34,y:p.y+Math.floor(i/5)*.4*(r?.y<8?1:-1),staff:false};}return {...p,staff:false,facing:p.path.length&&p.path[0].x-p.x-(p.path[0].y-p.y)<0?-1:1};});for(const staff of game.staff)people.push(this.staffActor(staff,game,time));
  for(const p of people.sort((a,b)=>(a.x+a.y)-(b.x+b.y)))this.person(p,p.staff,time);
  for(const r of game.rooms)this.label(r);
  if(this.guideRect&&!this.buildType){const r=this.guideRect;this.tileFace(r.x,r.y,r.w,r.h,.06,'#e6bc5b25','#daa548');const p=this.project(r.x+r.w/2,r.y+r.h/2,.12);c.font='600 13px sans-serif';c.fillStyle='#a47c30';c.textAlign='center';c.fillText(tr(ROOMS[r.type].name,this.lang)+' +',p.x,p.y);c.textAlign='left';}
  if(this.buildType){const rect=this.drag?this.rectangle():this.hover?{...this.hover,w:3,h:3}:null;if(rect){const valid=!game.placement(this.buildType,rect);this.tileFace(rect.x,rect.y,rect.w,rect.h,.08,valid?'#d5eb6a99':'#e77f7299','#ffffff');const p=this.project(rect.x+rect.w/2,rect.y+rect.h/2,.1);c.font='bold 14px sans-serif';c.fillStyle='#234740';c.textAlign='center';c.fillText(`${rect.w} × ${rect.h}`,p.x,p.y);c.textAlign='left';}}
  this.lastTime=time;
 }
}
