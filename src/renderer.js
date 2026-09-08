import {ROOMS,tr,ILLNESSES} from './content.js';
import {CharacterAnimator,SEAT_HEIGHT,mix} from './animation.js';
import {CharacterModel} from './characters.js';
import {GRID} from './game.js';
import {roomObjects} from './objects.js';
const shade=(color,amount)=>{let values;if(color.startsWith('#')){const n=parseInt(color.slice(1),16);values=[n>>16,(n>>8)&255,n&255];}else values=(color.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number);return `rgb(${values.map(n=>Math.max(0,Math.min(255,Math.round(n+amount)))).join(',')})`;};
export class Renderer{
 constructor(canvas,options){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=options;this.zoom=1;this.pan={x:0,y:0};this.hover=null;this.drag=null;this.pointer=null;this.keyboard={x:3,y:11};this.selected=null;this.lang='en';this.buildType=null;this.game=null;this.staffVisuals=new Map();this.hits=[];this.lastTime=0;this.guideRect=null;this.animator=new CharacterAnimator();this.characterModel=new CharacterModel(this.ctx);this.previousPatients=new Map();this.previousStaff=new Map();this.snapshotGame=null;
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
 furniture(r,time=0){for(const o of roomObjects(r)){
  const {x,y,w,h,z,kind}=o,c=this.ctx;
  if(kind==='door'){

   this.visualDoors??=new Map();const old=this.visualDoors.get(r.id)??r.doorOpen,desired=r.doorOpen,open=old+Math.sign(desired-old)*Math.min(Math.abs(desired-old),Math.max(0,time-this.lastTime)*5);this.visualDoors.set(r.id,open);
   const angle=open*Math.PI*.47,xx=x+Math.cos(angle)*.92,yy=y+Math.sin(angle)*.92*(r.y<8?-1:1);
   this.box(x-.07,y-.05,.09,.18,1.14,'#e9dec1');this.box(x+.96,y-.05,.09,.18,1.14,'#e9dec1');
   this.poly([this.project(x,y,.04),this.project(xx,yy,.04),this.project(xx,yy,1.07),this.project(x,y,1.07)],'#82b9ad','#507f74');
   const glass=[this.project(x+(xx-x)*.18,y+(yy-y)*.18,.62),this.project(x+(xx-x)*.8,y+(yy-y)*.8,.62),this.project(x+(xx-x)*.8,y+(yy-y)*.8,.92),this.project(x+(xx-x)*.18,y+(yy-y)*.18,.92)];this.poly(glass,'#d5eee3','#b1d0c5');
   const knob=this.project(x+(xx-x)*.8,y+(yy-y)*.8,.44);this.ellipse(knob.x,knob.y,this.tw*.035,this.tw*.04,'#ffe3a0');
  }else if(kind==='chair'||kind==='sofa'){
   const col=kind==='sofa'?'#8ab7ae':'#dbad80';this.box(x+.08,y+.07,w-.16,h-.08,.20,'#aa8867');this.box(x,y,w,h,.31,col);this.box(x,y-.02,w,.15,.65,col);this.box(x-.035,y,.105,h,.45,col);this.box(x+w-.07,y,.105,h,.45,col);
   const count=o.seats||1;for(let i=0;i<count;i++){this.box(x+.1+i*(w-.2)/count,y+.16,(w-.24)/count,h-.23,.34,kind==='sofa'?'#b8d8c6':'#f7d7a5');const q=this.project(x+.1+(i+.5)*(w-.2)/count,y+.09,.53);this.ellipse(q.x,q.y,this.tw*.022,this.tw*.025,'#668e81');}
  }else if(['gp','pharmacy','therapy','surgery','lab'].includes(kind)){this.machine(r,time);}
  else if(kind==='plant')this.plant(x+.2,y+.2);
  else if(kind==='counter'){this.box(x+.08,y+.08,w-.16,h-.16,.50,'#cfa77c');this.box(x-.03,y-.03,w+.06,h+.06,.57,'#eee0bd',.49);for(let i=0;i<w/.4;i++){const q=this.project(x+.2+i*.4,y+h,.27);this.ellipse(q.x,q.y,this.tw*.03,this.tw*.10,'#e7c79c');}}
  else if(kind==='monitor'){this.box(x+.2,y,.12,.2,z-.12,'#527b77',.56);this.box(x,y,w,h,z,'#416e6a',z-.3);const q=this.project(x+w/2,y+h,z-.10);c.fillStyle='#d9eedc';c.font=`${this.tw*.13}px sans-serif`;c.fillText('▤',q.x-this.tw*.07,q.y);}
  else if(kind==='bell'){const q=this.project(x+.2,y+.2,.62+(r.patientId?Math.sin(time*8)*.015:0));this.ellipse(q.x,q.y,this.tw*.15,this.tw*.08,'#b99853');this.ellipse(q.x,q.y-this.tw*.045,this.tw*.11,this.tw*.09,'#f8d27b');}
  else if(kind==='toys'){this.tileFace(x-.06,y-.06,w+.12,h+.12,.04,'#f4d892');for(let i=0;i<5;i++){const xx=x+.12+i*.18,yy=y+.15+(i%2)*.2;this.box(xx,yy,.19,.19,.13+(i%3)*.07,['#c98988','#8ebca8','#97b5d2'][i%3]);}const q=this.project(x+.8,y+.25,.2);this.duck(q.x,q.y,this.tw*.25,Math.sin(time)*.035);this.box(x,y+.45,.4,.24,.3,'#cb9f74');}
  else if(kind==='books'){this.box(x+.06,y+.05,w-.12,h-.1,.3,'#b29b7a');this.box(x,y,w,h,.36,'#e8cfaa');for(let i=0;i<3;i++)this.tileFace(x+.08+i*.17,y+.08,.23,.32,.38+i*.015,['#91bbac','#dba599','#f3dc95'][i]);}
  else if(kind==='sink'){this.box(x,y,w,h,.49,'#a2c2b6');this.box(x-.025,y-.025,w+.05,h+.05,.55,'#eaf0df');const q=this.project(x+w*.5,y+h*.5,.56);this.ellipse(q.x,q.y,this.tw*w*.22,this.tw*.08,'#83a8a0');this.box(x+w*.5,y,.06,.16,.72,'#c9d5d1',.55);}
  else if(kind==='toilet'){this.box(x+.1,y,.6,.25,.7,'#e1e9da');const q=this.project(x+.4,y+.65,.32);this.ellipse(q.x,q.y,this.tw*.3,this.tw*.16,'#f6f4e7');this.ellipse(q.x,q.y,this.tw*.16,this.tw*.08,'#a8bdb4');if(x>r.x+.4)this.box(x-.18,y,.08,1.35,1.05,'#9bbfb5');}
  else if(kind==='coffee'){this.box(x,y,w,h,.8,'#466f65');this.box(x+.06,y+.05,w-.12,h-.1,1.05,'#759890',.8);const q=this.project(x+w*.5,y+h,.66);this.ellipse(q.x,q.y,this.tw*.11,this.tw*.09,'#f4e7bd');}
  else if(kind==='stool'){this.box(x+.15,y+.15,.15,.15,.28,'#6e9187');this.box(x,y,w,h,.33,'#a5cdb7');}
  else if(kind==='cabinet'){this.box(x,y,w,h,z,'#c2d6c4');for(let i=0;i<3;i++){const q=this.project(x+w*.5,y+h,.14+i*.23);this.ellipse(q.x,q.y,this.tw*.055,this.tw*.018,'#7b9f8e');}}
  const points=[this.project(x,y,z),this.project(x+w,y,z),this.project(x+w,y+h,0),this.project(x,y+h,0)],left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));
  this.hits.push({x:left,y:top,w:Math.max(12,right-left),h:Math.max(12,bottom-top),type:'object',id:o.id});
  if(this.selected?.type==='object'&&this.selected.id===o.id){c.strokeStyle='#d7a449';c.lineWidth=2;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();}
 }}

 machine(r,time){
  const c=this.ctx,x=r.x,y=r.y,w=r.w,h=r.h,active=!!r.patientId&&this.game.patients.some(p=>p.id===r.patientId&&p.state==='service'),pulse=active?Math.sin(time*7):0;
  const cx=x+1.05,cy=y+1.05,p=this.project(cx,cy,.65),u=this.tw;
  this.box(cx-.8,cy-.6,1.6,1.2,.38,'#719b97');this.box(cx-.72,cy-.54,1.44,1.08,.47,'#dfe9df');
  const circle=(xx,yy,rad,color)=>this.ellipse(xx,yy,rad,rad,color);
  const line=(points,color,width)=>{c.beginPath();points.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();};
  if(r.type==='gp'){
   const q=this.project(cx,cy,.98);circle(q.x,q.y,u*.58,'#5b9c9a');circle(q.x,q.y,u*.44,'#c9eee4');circle(q.x,q.y,u*.34,'#f1fcdf');
   c.save();c.translate(q.x,q.y);c.rotate(active?time*2:0);for(let i=0;i<8;i++){c.rotate(Math.PI/4);circle(0,-u*.51,u*.035,i%2?'#ffe29b':'#e5fff7');}c.restore();
   this.duck(q.x,q.y+u*.04,u*.55,active?pulse*.05:0);
   if(active){line([[q.x-u*.3,q.y+pulse*u*.25],[q.x+u*.3,q.y+pulse*u*.25]],'#65cbb888',u*.04);this.particles(q.x,q.y-u*.5,time,'#fff3a6','?');}
  }else if(r.type==='pharmacy'){
   for(let i=0;i<2;i++){const q=this.project(cx-.25+i*.65,cy-.1,1.05);c.fillStyle='#c0ebe6';c.beginPath();c.roundRect(q.x-u*.18,q.y-u*.45,u*.36,u*.75,u*.1);c.fill();c.fillStyle=i?'#d39a6d':'#8ed4ae';c.fillRect(q.x-u*.14,q.y-u*.17,u*.28,u*.43);this.ellipse(q.x,q.y-u*.45,u*.22,u*.075,'#638e91');for(let b=0;b<4;b++)circle(q.x+Math.sin(b*9)*u*.07,q.y+u*.23-((time*(active?.55:.08)+b*.16)%.5)*u,u*.025,'#fff5cc');}
   const q=this.project(cx+.3,cy+.65,.6);line([[q.x-u*.3,q.y-u*.65],[q.x+u*.27,q.y-u*.65],[q.x+u*.27,q.y-u*.18]],'#b67c54',u*.12);c.fillStyle='#faf4db';c.beginPath();c.roundRect(q.x-u*.26,q.y-u*.13,u*.46,u*.38,u*.08);c.fill();circle(q.x-u*.11,q.y+u*.04,u*.025,'#634b3f');circle(q.x+u*.06,q.y+u*.04,u*.025,'#634b3f');if(active)this.particles(q.x,q.y-u*.2,time,'#fffdf0','~');
  }else if(r.type==='surgery'){
   const q=this.project(cx,cy,1.05);this.ellipse(q.x,q.y,u*.48,u*.64,'#d5ae76');this.ellipse(q.x,q.y,u*.37,u*.52,'#c2e8e6');for(let i=0;i<10;i++){const angle=i*Math.PI/5;circle(q.x+Math.cos(angle)*u*.43,q.y+Math.sin(angle)*u*.58,u*.045,active&&i%2===Math.floor(time*3)%2?'#fffbc0':'#f8e4b2');}
   circle(q.x-u*.13,q.y-u*.03,u*.035,'#56867f');circle(q.x+u*.13,q.y-u*.03,u*.035,'#56867f');c.beginPath();c.arc(q.x,q.y+u*.08,u*.2,.1,Math.PI-.1);c.strokeStyle='#cf7d83';c.lineWidth=u*.05;c.stroke();const iron=this.project(cx+.75,cy+.45,.73+(active?pulse*.09:0));this.ellipse(iron.x,iron.y,u*.28,u*.12,'#cb91b5');line([[iron.x-u*.13,iron.y-u*.08],[iron.x-u*.08,iron.y-u*.25],[iron.x+u*.12,iron.y-u*.25],[iron.x+u*.16,iron.y-u*.08]],'#915e89',u*.07);if(active)this.particles(q.x,q.y-u*.6,time,'#fff4b7','✦');
  }else if(r.type==='therapy'){
   const q=this.project(cx,cy,.96);for(let i=0;i<5;i++)circle(q.x+(i-2)*u*.18,q.y-Math.sin(i)*u*.09,u*.24,'#e7e4fa');this.duck(q.x,q.y+u*.05,u*.42,pulse*.04);if(active)this.particles(q.x,q.y-u*.35,time,'#bba0dd','z');this.box(cx-.4,cy+.9,.85,.7,.45,'#bc99cf');
  }else{
   const q=this.project(cx,cy,.9);this.duck(q.x,q.y,u*.55,Math.sin(time*3)*.05);for(let i=0;i<3;i++){const v=this.project(cx-.5+i*.45,cy+.7,.7);line([[v.x,v.y-u*.28],[v.x,v.y+u*.13]],['#93bfc9','#dca0b9','#acc48b'][i],u*.13);}if(this.game.project)this.particles(q.x,q.y-u*.4,time,'#e2efb8','!');
  }

  const sign=this.project(cx,cy+1.05,.05);c.font=`700 ${Math.max(8,u*.19)}px sans-serif`;c.fillStyle='#446a60';c.textAlign='center';const titles={gp:['QUACK-O-SCAN','QUAK-O-SKOP'],pharmacy:['DECAF 3000','ENTKOFFEINATOR'],surgery:['SMILE PRESS','GRINSEBÜGLER'],therapy:['DREAM STEAM','TRAUMPUSTER'],lab:['DUCK SCIENCE','ENTENFORSCHUNG']};c.fillText(titles[r.type][this.lang==='de'?1:0],sign.x,sign.y);c.textAlign='left';
 }
 duck(x,y,size,tilt=0){const c=this.ctx;c.save();c.translate(x,y);c.rotate(tilt);this.ellipse(0,0,size*.48,size*.3,'#ffcf63');this.ellipse(size*.19,-size*.28,size*.27,size*.26,'#ffdf79');this.ellipse(size*.45,-size*.22,size*.16,size*.08,'#e99951');this.ellipse(size*.25,-size*.33,size*.035,size*.043,'#4c5350');this.ellipse(-size*.12,size*.01,size*.2,size*.13,'#efb74e');c.restore();}
 particles(x,y,time,color,glyph){const c=this.ctx;c.fillStyle=color;c.font=`bold ${Math.max(12,this.tw*.26)}px sans-serif`;for(let i=0;i<3;i++){const phase=(time*.7+i/3)%1;c.globalAlpha=1-phase;c.fillText(glyph,x+Math.sin(i*4+time)*this.tw*.2,y-phase*this.tw*.7);}c.globalAlpha=1;}
 captureStep(game){this.snapshotGame=game;this.previousStaff=new Map(game.staff.map(s=>[s.id,{x:s.x,y:s.y}]));this.previousPatients=new Map(game.patients.map(p=>[p.id,{x:p.x,y:p.y}]));}
 person(person,staff=false,time=0){
  const c=this.ctx,p=this.project(person.x+.5,person.y+.5),pose=this.animator.update(person,time);
  this.ellipse(p.x,p.y+this.tw*.025,this.tw*.145,this.tw*.06,'#24463c27');
  const bounds=this.characterModel.draw(person,pose,p,this.tw),height=bounds.height,width=Math.max(this.tw*.38,bounds.width);
  this.hits.push({x:p.x-width/2,y:p.y-height,w:width,h:height+4,type:staff?'staff':'patient',id:person.id});
  const bubble=person.cured?'heart':person.state==='called'?'call':person.patience<35?'clock':staff&&person.resting?'coffee':person.state==='seated'?(person.child?'bear':['book','dream','duck'][person.id%3]):person.state==='service'?'duck':staff&&person.state==='working'?'care':!staff&&person.stage==='reception'?'ticket':null;
  if(bubble){const yy=p.y-height-5,size=Math.max(13,this.tw*.32);c.fillStyle='#fffff6ed';c.beginPath();c.roundRect(p.x-size*.65,yy-size,size*1.3,size*1.3,5);c.fill();c.beginPath();c.moveTo(p.x-3,yy+size*.3);c.lineTo(p.x,yy+size*.48);c.lineTo(p.x+3,yy+size*.3);c.fill();c.fillStyle=person.patience<35?'#c47455':'#4b927b';c.font=`bold ${size}px sans-serif`;c.textAlign='center';this.bubbleIcon(bubble,p.x,yy-size*.36,size*.87);c.textAlign='left';}
  if(this.selected?.id===person.id){c.strokeStyle='#e9ae4d';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+this.tw*.03,this.tw*.22,this.tw*.09,0,0,Math.PI*2);c.stroke();}
 }
 bubbleIcon(kind,x,y,size){const c=this.ctx;c.save();c.translate(x,y);c.scale(size,size);c.lineCap='round';c.lineJoin='round';c.lineWidth=.08;c.strokeStyle='#528476';const dot=(x,y,r,col)=>this.ellipse(x,y,r,r,col);
  if(kind==='duck'){this.duck(0,.08,.8,0);}
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
  const state=['travelWork','travelBreak'].includes(s.state)?'travel':s.state==='break'?'resting':s.state==='cleaning'?'cleaning':game.staffReady(s)&&(game.patients.some(p=>p.id===r?.patientId&&p.state==='service')||r?.type==='lab'&&game.project)?'working':'idle';
  const lookYaw=s.path.length?undefined:s.state==='break'||r?.type==='reception'?0:r?Math.atan2(game.servicePoint(r).x-s.x,game.servicePoint(r).y-s.y):undefined;
  return {...s,x:previous?mix(previous.x,s.x,alpha):s.x,y:previous?mix(previous.y,s.y,alpha):s.y,state,lookYaw,hasSeat:s.state==='break'?s.breakSeatIndex!==null:game.staffReady(s)&&s.role==='receptionist',staff:true};
 }

 label(r){const c=this.ctx;const p=this.project(r.x+r.w/2,r.y+r.h/2,.15);const size=Math.max(10,Math.min(13,this.tw*.34));const name=tr(ROOMS[r.type].name,this.lang)+(ROOMS[r.type].role?' · '+r.id:'')+(r.type==='waiting'?' · '+this.game.patients.filter(p=>p.seatRoom===r.id).length+'/'+this.game.seats(r).length:'');c.font=`700 ${size}px "Trebuchet MS", sans-serif`;const width=c.measureText(name).width+20;const yy=p.y+this.tw*1.0;c.fillStyle='#fffff4ed';c.beginPath();c.roundRect(p.x-width/2,yy,width,25,7);c.fill();c.fillStyle='#304e46';c.textAlign='center';c.fillText(name,p.x,yy+17);c.textAlign='left';
  if(ROOMS[r.type].role){const s=this.game.staff.find(s=>s.id===r.staffId);const color=!s?'#d68153':!this.game.staffReady(s)?'#d4a44f':'#62988c';this.ellipse(p.x+width/2-1,yy-1,4,4,color);}
  if(r.patientId){const width=36;const pp=this.project(r.x+r.w/2,r.y+r.h/2,.2);c.fillStyle='#274a4440';c.fillRect(pp.x-18,yy+29,width,4);c.fillStyle='#346f5e';c.fillRect(pp.x-18,yy+29,width*Math.min(1,r.progress/ROOMS[r.type].time),4);}
  const q=this.game.queue(r);if(q){const pp=this.project(r.x+r.w/2,r.y+r.h+.4);c.font='bold 11px sans-serif';c.fillStyle='#376156';c.fillText(`${q} ↳`,pp.x+6,pp.y+5);}
 }
 draw(game,time,alpha=1){this.initializingActors=this.game!==game;if(this.game!==game){this.animator.reset();this.visualDoors?.clear();this.loungeSeats?.clear();this.staffVisuals.clear();this.lastTime=time;this.drag=null;this.down=null;this.panning=false;}this.game=game;this.layoutKey=game.rooms.map(r=>r.id).join(",");this.metrics();const c=this.ctx;this.hits=[];c.clearRect(0,0,this.w,this.h);
  // The construction surface is actual game geometry, with a navigable tile grid.
  this.box(-.3,-.3,24.6,18.6,-.2,'#a4b7a1',-.65);this.tileFace(0,0,24,18,0,'#edf1f0');
  for(let y=0;y<18;y++)for(let x=0;x<24;x++){const corridor=y>=7&&y<=10||x>=11&&x<=14&&y>7;this.tileFace(x,y,1,1,.005,corridor?((x+y)%2?'#e4eeea':'#eff5f0'):((x+y)%2?'#eef2f3':'#f7f8f5'),'#ffffff26');}
  this.box(0,0,24,.15,1.35,'#b6c9ba');this.box(0,0,.15,18,1.35,'#c2d1bf');
  for(let x=2;x<23;x+=4){this.box(x,0,.12,.22,1.6,'#d3deca');this.box(x+.3,.06,2,.06,1.12,'#89b2b5',.55);}
  for(let y=3;y<17;y+=4)this.box(.06,y,.06,2,1.12,'#98b7b4',.55);
  // The clinic starts with empty floor; furnishings belong to purchased departments.
  const entry=this.project(11.9,17.35);c.save();c.translate(entry.x,entry.y);c.rotate(-.47);c.font=`bold ${Math.max(10,this.tw*.29)}px sans-serif`;c.fillStyle='#638174';c.fillText(this.lang==='de'?'↑  WILLKOMMEN':'↑  WELCOME',-43,0);c.restore();
  for(const r of [...game.rooms].sort((a,b)=>(a.x+a.y)-(b.x+b.y))){const col=ROOMS[r.type].color;this.tileFace(r.x,r.y,r.w,r.h,.025,col);for(let x=r.x;x<r.x+r.w;x++)for(let y=r.y;y<r.y+r.h;y++)this.tileFace(x,y,1,1,.03,(x+y)%2?col:shade(col,7),'#ffffff35');if(r.type==='waiting'){const door=game.door(r);for(let x=r.x;x<r.x+r.w;x++)if(!(r.y>=8&&x===door.x))this.box(x,r.y,1,.12,.27,shade(col,18));this.box(r.x,r.y,.12,r.h,.27,shade(col,12));}else if(r.y<8)this.box(r.x,r.y,r.w,.12,1.2,shade(col,25));else{const door=game.door(r);for(let x=r.x;x<r.x+r.w;x++)if(x!==door.x)this.box(x,r.y,1,.12,1.2,shade(col,25));}if(r.type!=='waiting')this.box(r.x,r.y,.12,r.h,1.2,shade(col,15));
   // Low front partitions leave all action visible. The real door opens toward the central corridor.
   const d=game.door(r);for(let x=r.x;x<r.x+r.w;x++)if(!(r.y<8&&x===d.x))this.box(x,r.y+r.h-.12,1,.12,.27,shade(col,3));this.box(r.x+r.w-.12,r.y,.12,r.h,.27,shade(col,-5));
   this.furniture(r,time);if(this.selected?.type==='room'&&this.selected.id===r.id){const pts=[this.project(r.x,r.y,.1),this.project(r.x+r.w,r.y,.1),this.project(r.x+r.w,r.y+r.h,.1),this.project(r.x,r.y+r.h,.1)];c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.strokeStyle='#fff7bc';c.lineWidth=3;c.stroke();}}
  const people=game.patients.map(p=>{const previous=this.snapshotGame===game?this.previousPatients.get(p.id):null,r=game.room(p.targetRoom),lookYaw=p.state==='seated'?0:p.state==='service'&&r?Math.atan2(r.x+1.05-p.x,r.y+1.05-p.y):undefined;return {...p,x:previous?mix(previous.x,p.x,alpha):p.x,y:previous?mix(previous.y,p.y,alpha):p.y,staff:false,lookYaw};});for(const staff of game.staff)people.push(this.staffActor(staff,game,time,alpha));
  for(const p of people.sort((a,b)=>(a.x+a.y)-(b.x+b.y)))this.person(p,p.staff,time);
  for(const r of game.rooms)this.label(r);
  if(this.guideRect&&!this.buildType){const r=this.guideRect;this.tileFace(r.x,r.y,r.w,r.h,.06,'#e6bc5b25','#daa548');const p=this.project(r.x+r.w/2,r.y+r.h/2,.12);c.font='600 13px sans-serif';c.fillStyle='#a47c30';c.textAlign='center';c.fillText(tr(ROOMS[r.type].name,this.lang)+' +',p.x,p.y);c.textAlign='left';}
  if(this.buildType){const rect=this.drag?this.rectangle():this.hover?{...this.hover,w:3,h:3}:null;if(rect){const valid=!game.placement(this.buildType,rect);this.tileFace(rect.x,rect.y,rect.w,rect.h,.08,valid?'#d5eb6a99':'#e77f7299','#ffffff');const p=this.project(rect.x+rect.w/2,rect.y+rect.h/2,.1);c.font='bold 14px sans-serif';c.fillStyle='#234740';c.textAlign='center';c.fillText(`${rect.w} × ${rect.h}`,p.x,p.y);c.textAlign='left';}}
  this.animator.prune(people.map(p=>p.id));for(const id of this.staffVisuals.keys())if(!game.staff.some(s=>s.id===id))this.staffVisuals.delete(id);this.lastTime=time;
 }
}
