import {ROOMS,tr,ILLNESSES} from './content.js';
import {GRID} from './game.js';
const shade=(color,amount)=>{let values;if(color.startsWith('#')){const n=parseInt(color.slice(1),16);values=[n>>16,(n>>8)&255,n&255];}else values=(color.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number);return `rgb(${values.map(n=>Math.max(0,Math.min(255,Math.round(n+amount)))).join(',')})`;};
export class Renderer{
 constructor(canvas,options){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=options;this.zoom=1;this.pan={x:0,y:0};this.hover=null;this.drag=null;this.pointer=null;this.keyboard={x:3,y:11};this.selected=null;this.lang='en';this.buildType=null;this.game=null;
  new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{canvas.focus();this.pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);if(e.button===2||e.button===1){this.panning=true;return;}const pos=this.tile(e);if(this.buildType){this.drag={start:pos,end:pos};}else this.down=pos;});
  canvas.addEventListener('pointermove',e=>{if(this.panning&&this.pointer){this.pan.x+=e.clientX-this.pointer.x;this.pan.y+=e.clientY-this.pointer.y;}this.pointer={x:e.clientX,y:e.clientY};this.hover=this.tile(e);if(this.drag)this.drag.end=this.hover;});
  canvas.addEventListener('pointerup',e=>{if(this.panning){this.panning=false;return;}if(this.drag){const rect=this.rectangle();this.options.onBuild(this.buildType,rect);this.drag=null;}else if(this.down){const pos=this.tile(e);if(Math.abs(pos.x-this.down.x)+Math.abs(pos.y-this.down.y)<2)this.selectAt(pos);}this.down=null;});
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
 selectAt(pos){const p=this.game.patients.filter(p=>Math.abs(p.x-pos.x)<.8&&Math.abs(p.y-pos.y)<.8).at(-1);if(p)this.options.onSelect('patient',p.id);else {const r=this.game.rooms.find(r=>pos.x>=r.x&&pos.x<r.x+r.w&&pos.y>=r.y&&pos.y<r.y+r.h);this.options.onSelect(r?'room':null,r?.id);}}
 poly(points,color,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.6;c.stroke();}}
 tileFace(x,y,w,h,z,color,stroke){this.poly([this.project(x,y,z),this.project(x+w,y,z),this.project(x+w,y+h,z),this.project(x,y+h,z)],color,stroke);}
 box(x,y,w,h,z,color,base=0){const p=(a,b,c)=>this.project(a,b,c);this.poly([p(x+w,y,base),p(x+w,y+h,base),p(x+w,y+h,z),p(x+w,y,z)],shade(color,-28));this.poly([p(x,y+h,base),p(x+w,y+h,base),p(x+w,y+h,z),p(x,y+h,z)],shade(color,-13));this.tileFace(x,y,w,h,z,shade(color,12));}
 ellipse(x,y,rx,ry,color){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 plant(x,y){this.box(x-.22,y-.22,.45,.45,.4,'#c6a788');const p=this.project(x,y,.75);this.ellipse(p.x,p.y,this.tw*.27,this.tw*.31,'#5b8b62');this.ellipse(p.x-this.tw*.13,p.y+this.tw*.04,this.tw*.16,this.tw*.2,'#73a576');}
 furniture(r){const x=r.x,y=r.y,w=r.w,h=r.h;
  if(r.type==='gp'){this.box(x+.55,y+.55,1.8,.8,.6,'#f1e2c4');this.box(x+1.4,y+.65,.48,.15,1,'#355c58',.6);this.box(x+.8,y+1.6,.55,.5,.35,'#467f72');this.box(x+w-1.25,y+.6,.65,1.8,.48,'#dce6d6');this.box(x+w-1.2,y+.65,.55,.5,.62,'#faf4e6');this.plant(x+.5,y+h-.7);}
  if(r.type==='pharmacy'){this.box(x+.35,y+.25,w-.7,.6,.95,'#ecebdc');for(let i=0;i<Math.floor(w*2)-2;i++){const xx=x+.5+i*.42;this.box(xx,y+.45,.19,.22,1.13,['#8babc9','#c4bf80','#c08384'][i%3],.95);}this.box(x+.5,y+1.7,2,.7,.62,'#819db5');this.box(x+.65,y+1.85,.5,.4,.82,'#e3e8d2',.62);this.box(x+w-1.1,y+h-1.1,.7,.6,.8,'#829aab');}
  if(r.type==='lounge'){this.box(x+.4,y+.5,w-1,.75,.45,'#c8844a');this.box(x+.4,y+.4,w-1,.25,.75,'#cf8c50');this.box(x+1.3,y+2,1.2,.9,.35,'#e9d7b2');this.box(x+1.65,y+2.2,.2,.2,.52,'#f8f3de',.35);this.box(x+w-1,y+h-1.1,.7,.6,1.1,'#3c6159');this.plant(x+.6,y+h-.6);}
  if(r.type==='therapy'){this.box(x+.45,y+.7,1,2,.4,'#9973a9');this.box(x+.45,y+.7,1,.4,.75,'#ac88ba');this.box(x+w-1.5,y+1,.7,.7,.38,'#738e88');this.box(x+w-1.4,y+2,.6,.6,.43,'#c4ac84');this.plant(x+.5,y+h-.5);}
  if(r.type==='surgery'){this.box(x+w/2-.5,y+h/2-.9,1,2,.7,'#729c94');this.box(x+w/2-.4,y+h/2-.85,.8,.45,.81,'#faf5dd');this.box(x+.4,y+.5,.7,.75,.9,'#d5dccc');this.box(x+.48,y+.6,.5,.2,1.22,'#395d53',.9);this.box(x+w-1,y+.5,.2,.2,1.65,'#98aaa2');}
  if(r.type==='toilet'){for(let i=0;i<Math.max(1,Math.floor(w/1.3));i++){this.box(x+.3+i*1.25,y+.5,.8,.8,.35,'#eef0e6');this.box(x+.35+i*1.25,y+.3,.7,.3,.7,'#e3e8e0');if(i)this.box(x+.1+i*1.25,y+.3,.1,1.7,1.1,'#85aaac');}this.box(x+.5,y+h-.8,w-1,.5,.55,'#bbc9bf');}
  if(r.type==='lab'){this.box(x+.4,y+.5,w-.8,.8,.65,'#e3ddbb');for(let i=0;i<w-1;i++){this.box(x+.6+i,y+.7,.25,.3,1.05,i%2?'#8eaf69':'#8995b8',.65);}this.box(x+1,y+2,.8,.8,1,'#a0b088');this.box(x+1.1,y+2.1,.6,.6,1.15,'#c9e6bb',1);}
 }
 person(person,staff=false,time=0){const c=this.ctx;const p=this.project(person.x+.5,person.y+.5);const s=this.tw/30;const walking=['travel','exit','inside'].includes(person.state);const step=walking?Math.sin(time*9+person.id)*2:0;this.ellipse(p.x,p.y+2*s,6*s,3*s,'#244d4125');c.lineCap='round';c.lineWidth=3.1*s;c.strokeStyle='#414b4f';c.beginPath();c.moveTo(p.x-2*s,p.y-5*s);c.lineTo(p.x-(2+step)*s,p.y);c.moveTo(p.x+2*s,p.y-5*s);c.lineTo(p.x+(2+step)*s,p.y);c.stroke();
  c.fillStyle=person.color;c.beginPath();c.roundRect(p.x-5*s,p.y-15*s,10*s,11*s,3*s);c.fill();this.ellipse(p.x,p.y-19*s,4.6*s,5*s,person.skin||'#dfb790');c.fillStyle=person.hair||'#49413c';c.beginPath();c.arc(p.x,p.y-20.5*s,4.6*s,Math.PI,Math.PI*2);c.fill();
  if(staff){c.fillStyle='#f3edcf';c.fillRect(p.x+1*s,p.y-13*s,2*s,3*s);}else if(person.cured){c.fillStyle='#32795b';c.font=`bold ${11*s}px sans-serif`;c.fillText('♥',p.x-4*s,p.y-29*s);}else if(person.patience<40){c.fillStyle='#bd5a4d';c.font=`bold ${13*s}px sans-serif`;c.fillText('!',p.x-2*s,p.y-28*s);}else if(person.stage==='treatment'&&ILLNESSES.find(i=>i.id===person.illness)?.room==='therapy'){c.fillStyle='#fffef6';c.font=`${12*s}px sans-serif`;c.fillText('☁',p.x-5*s,p.y-29*s);}
  if(this.selected?.type==='patient'&&this.selected.id===person.id){c.strokeStyle='#efb657';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+2*s,9*s,4*s,0,0,Math.PI*2);c.stroke();}
 }
 label(r){const c=this.ctx;const p=this.project(r.x+r.w/2,r.y+r.h/2,.15);const size=Math.max(10,Math.min(13,this.tw*.34));const name=tr(ROOMS[r.type].name,this.lang);c.font=`700 ${size}px "Trebuchet MS", sans-serif`;const width=c.measureText(name).width+20;const yy=p.y+this.tw*.75;c.fillStyle='#fffff4ed';c.beginPath();c.roundRect(p.x-width/2,yy,width,25,7);c.fill();c.fillStyle='#304e46';c.textAlign='center';c.fillText(name,p.x,yy+17);c.textAlign='left';
  if(ROOMS[r.type].role){const s=this.game.staff.find(s=>s.id===r.staffId);const color=!s?'#d68153':s.resting?'#d4a44f':'#62988c';this.ellipse(p.x+width/2-1,yy-1,4,4,color);}
  if(r.patientId){const width=36;const pp=this.project(r.x+r.w/2,r.y+r.h/2,.2);c.fillStyle='#274a4440';c.fillRect(pp.x-18,yy+29,width,4);c.fillStyle='#346f5e';c.fillRect(pp.x-18,yy+29,width*Math.min(1,r.progress/ROOMS[r.type].time),4);}
  const q=this.game.queue(r);if(q){const pp=this.project(r.x+r.w/2,r.y+r.h+.4);c.font='bold 11px sans-serif';c.fillStyle='#376156';c.fillText(`${q} ↳`,pp.x+6,pp.y+5);}
 }
 draw(game,time){this.game=game;this.metrics();const c=this.ctx;c.clearRect(0,0,this.w,this.h);
  // The construction surface is actual game geometry, with a navigable tile grid.
  this.box(-.3,-.3,24.6,18.6,-.2,'#a4b7a1',-.65);this.tileFace(0,0,24,18,0,'#e6e8d7');
  for(let y=0;y<18;y++)for(let x=0;x<24;x++){const corridor=y>=7&&y<=10||x>=11&&x<=14&&y>7;this.tileFace(x,y,1,1,.005,corridor?((x+y)%2?'#e4e3cf':'#e9e7d5'):((x+y)%2?'#dce2d4':'#e1e6d8'),'#ffffff26');}
  this.box(0,0,24,.15,1.35,'#b6c9ba');this.box(0,0,.15,18,1.35,'#c2d1bf');
  for(let x=2;x<23;x+=4){this.box(x,0,.12,.22,1.6,'#d3deca');this.box(x+.3,.06,2,.06,1.12,'#89b2b5',.55);}
  for(let y=3;y<17;y+=4)this.box(.06,y,.06,2,1.12,'#98b7b4',.55);
  // Garden, entrance and corridor seating.
  this.plant(1,7.1);this.plant(22.6,7.1);this.plant(1,16.5);this.plant(22.5,16.5);
  for(const x of [3,8,17,21]){this.box(x,8.7,1.5,.45,.34,'#638e85');this.box(x,9.1,1.5,.1,.63,'#739d91');}
  this.box(13.5,15.5,2.5,.75,.75,'#c3a777');this.box(14.2,15.65,.5,.2,1.1,'#405c55',.75);
  const entry=this.project(11.9,17.35);c.save();c.translate(entry.x,entry.y);c.rotate(-.47);c.font=`bold ${Math.max(10,this.tw*.29)}px sans-serif`;c.fillStyle='#638174';c.fillText(this.lang==='de'?'↑  WILLKOMMEN':'↑  WELCOME',-43,0);c.restore();
  for(const r of [...game.rooms].sort((a,b)=>(a.x+a.y)-(b.x+b.y))){const col=ROOMS[r.type].color;this.tileFace(r.x,r.y,r.w,r.h,.025,col);for(let x=r.x;x<r.x+r.w;x++)for(let y=r.y;y<r.y+r.h;y++)this.tileFace(x,y,1,1,.03,(x+y)%2?col:shade(col,7),'#ffffff35');this.box(r.x,r.y,r.w,.12,1.2,shade(col,25));this.box(r.x,r.y,.12,r.h,1.2,shade(col,15));
   // Low front partitions leave all action visible. The real door opens toward the central corridor.
   const d=game.door(r);for(let x=r.x;x<r.x+r.w;x++)if(!(r.y<8&&x===d.x))this.box(x,r.y+r.h-.12,1,.12,.27,shade(col,3));this.box(r.x+r.w-.12,r.y,.12,r.h,.27,shade(col,-5));
   this.furniture(r);if(this.selected?.type==='room'&&this.selected.id===r.id){const pts=[this.project(r.x,r.y,.1),this.project(r.x+r.w,r.y,.1),this.project(r.x+r.w,r.y+r.h,.1),this.project(r.x,r.y+r.h,.1)];c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.strokeStyle='#fff7bc';c.lineWidth=3;c.stroke();}}
  const people=game.patients.map(p=>{if(p.state==='queue'){const peers=game.patients.filter(v=>v.state==='queue'&&v.targetRoom===p.targetRoom);const i=peers.indexOf(p),r=game.room(p.targetRoom);return {...p,x:p.x+(i%5-2)*.34,y:p.y+Math.floor(i/5)*.4*(r?.y<8?1:-1),staff:false};}return {...p,staff:false};});for(const s of game.staff){const r=game.room(s.roomId);if(r&&!s.resting)people.push({...s,x:r.x+r.w*.55,y:r.y+r.h*.4,staff:true});else{const l=game.rooms.find(r=>r.type==='lounge');people.push({...s,x:s.resting&&l?l.x+1:5+(Math.sin(time*.12+s.id)+1)*5,y:s.resting&&l?l.y+1:7.4,staff:true});}}
  for(const p of people.sort((a,b)=>(a.x+a.y)-(b.x+b.y)))this.person(p,p.staff,time);
  for(const r of game.rooms)this.label(r);
  if(this.buildType){const rect=this.drag?this.rectangle():this.hover?{...this.hover,w:3,h:3}:null;if(rect){const valid=!game.placement(this.buildType,rect);this.tileFace(rect.x,rect.y,rect.w,rect.h,.08,valid?'#d5eb6a99':'#e77f7299','#ffffff');const p=this.project(rect.x+rect.w/2,rect.y+rect.h/2,.1);c.font='bold 14px sans-serif';c.fillStyle='#234740';c.textAlign='center';c.fillText(`${rect.w} × ${rect.h}`,p.x,p.y);c.textAlign='left';}}
 }
}
