// Canvas-only furniture. Registry coordinates, seats and simulation state are read-only.
import {PRACTICE_SIZES,drawPracticeObject,drawCounterDesign} from './practice-art.js';
import {rotateLocal} from './objects.js';
import {needActivity} from './patient-needs.js';
const KINDS = new Set(['chair','sofa','stool','counter','monitor','bell','cabinet','plant','toys','books','sink','toilet','coffee','gp','pharmacy','surgery','therapy','lab','poster','clock',...Object.keys(PRACTICE_SIZES)]);
const tint = (hex, n) => `rgb(${[1,3,5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i,i+2),16)+n))).join(',')})`;
const PALETTES={
  reception:{body:'#286f75',light:'#d1ded1',trim:'#20515d',seat:'#397e83',accent:'#d69e50',wood:'#bb895a',metal:'#94b0aa'},
  gp:{body:'#79bbaa',light:'#e3f1e4',trim:'#458d83',seat:'#9ccfba',accent:'#60aeb9',wood:'#d6c8ab',metal:'#afc8c2'},
  pharmacy:{body:'#6095ba',light:'#dceaf1',trim:'#386b96',seat:'#76a6cb',accent:'#edbd64',wood:'#c3cbd0',metal:'#acbdce'},
  therapy:{body:'#9c88b4',light:'#ece1ef',trim:'#72638f',seat:'#b4a0cc',accent:'#d8adb8',wood:'#c6aba5',metal:'#b6b1c7'},
  surgery:{body:'#cb91a4',light:'#f2e3e7',trim:'#976e88',seat:'#dfb0bd',accent:'#76b6b3',wood:'#d0d5d5',metal:'#b8c9ce'},
  lab:{body:'#407f83',light:'#f0df9d',trim:'#285e68',seat:'#ccad4b',accent:'#e1b643',wood:'#d3bd79',metal:'#9cb8b5'},
  lounge:{body:'#bf765c',light:'#ecd2b8',trim:'#885949',seat:'#ca8469',accent:'#d9ad64',wood:'#a8754e',metal:'#aca891'},
  waiting:{body:'#659b8d',light:'#eee0bb',trim:'#387c7b',seat:'#55a69f',accent:'#e4aa4b',wood:'#c59b65',metal:'#91aaa0'},
  toilet:{body:'#8ab2b0',light:'#edf0e0',trim:'#608e8d',seat:'#a6c9bf',accent:'#cbb178',wood:'#c6c7b0',metal:'#b6c9c4'}
};
// Detail coordinates use each object's own design space, never the room's origin.
const DESIGN_SIZE={chair:[.76,.7],sofa:[1.61,.7],stool:[.5,.5],counter:[2,.8],monitor:[.5,.2],bell:[.4,.4],cabinet:[.65,.55],plant:[.4,.4],toys:[1.15,.7],books:[.7,.55],sink:[.65,.55],toilet:[.8,1],coffee:[.7,.6],poster:[.62,.035],clock:[.3,.035],...PRACTICE_SIZES};
const doorPoint=(x,y,open,part='leaf-left')=>{const a=Math.max(0,Math.min(1,open))*Math.PI*.48,c=Math.cos(a),sn=Math.sin(a),left=part==='leaf-left',dx=x-(left?.078:.650),dy=y-.05;return left?{x:.078+dx*c+dy*sn,y:.05-dx*sn+dy*c}:{x:.078+.572*c+dx*c-dy*sn,y:.05-.572*sn+dx*sn+dy*c};};
// A moving door leaf and its three fixed frame pieces have independent depth.
// The visual hinge uses exactly the same polygon as the scene's occlusion box.
export function cubiclePieces(object,open=0){
 if(object.kind!=='cubicle-door')return [object];
 const local=object.local||{x:0,y:0,w:object.w,h:object.h},frame=object.frame||{x:object.x,y:object.y,w:object.w,h:object.h,rotation:0};
 return [['jamb-left',0,0,.078,.1,.02,1.18],['jamb-right',1.222,0,.078,.1,.02,1.18],['header',0,0,1.3,.1,1.148,1.18],['leaf-left',.078,.012,.572,.076,.15,1.148],['leaf-right',.650,.012,.572,.076,.15,1.148]].map(([renderPart,x,y,w,h,base,z])=>{
  const points=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([xx,yy])=>{const p=renderPart.startsWith('leaf')?doorPoint(xx,yy,open,renderPart):{x:xx,y:yy};return rotateLocal({x:local.x+p.x*local.w/1.3,y:local.y+p.y*local.h/.1},frame.w,frame.h,frame.rotation);}),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return {...object,renderPart,doorOpen:open,occlusion:{x:frame.x+Math.min(...xs),y:frame.y+Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),base,z}};
 });
}
// Keep one selectable furniture identity, but let actors interleave with its
// actual seat, back and arms. A whole-sofa depth cannot represent both seats.
export function upholsteryPieces(object){
 if(!['chair','sofa','stool'].includes(object.kind))return [object];
 const [w,h]=DESIGN_SIZE[object.kind],local=object.local||{x:0,y:0,w:object.w,h:object.h},frame=object.frame||{x:object.x,y:object.y,w:object.w,h:object.h,rotation:0};
 const pieces=[['base',0,0,w,h,0,.32],['back',.015,.025,w-.03,.17,.28,object.kind==='stool'?.73:.66],['arm-left',-.008,.13,.11,h-.14,.28,.43],['arm-right',w-.105,.13,.11,h-.14,.28,.43]];
 return pieces.map(([renderPart,x,y,pw,ph,base,z])=>{
  const points=[[x,y],[x+pw,y],[x,y+ph],[x+pw,y+ph]].map(([xx,yy])=>rotateLocal({x:local.x+xx*local.w/w,y:local.y+yy*local.h/h},frame.w,frame.h,frame.rotation)),minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y));
  return {...object,renderPart,occlusion:{x:frame.x+minX,y:frame.y+minY,w:Math.max(...points.map(p=>p.x))-minX,h:Math.max(...points.map(p=>p.y))-minY,base,z}};
 });
}
function objectSpace(renderer,object){
  const [w,h]=DESIGN_SIZE[object.kind]||[1.65,1.9],sx=object.w/w;
  const sy=(['poster','clock'].includes(object.kind)?Math.min(object.h,.045):object.h)/h,scale=Math.min(1,sx,sy),local=Object.create(renderer);
  const anchor={monitor:.57,bell:.57,poster:.64,clock:.98}[object.kind]||0;
  const heightScale=['chair','sofa','stool','counter','medicine-rack'].includes(object.kind)?1:scale;
  local.project=(x,y,z=0)=>renderer.project(object.x+x*sx,object.y+(object.kind==='monitor'?object.h-y*sy:y*sy),anchor+(z-anchor)*heightScale);
  local.tw=renderer.tw*scale;
  return {renderer:local,object:{...object,x:0,y:0,w,h}};
}

function brushes(renderer,palette) {
  const c=renderer.ctx, u=renderer.tw, project=renderer.project.bind(renderer);
  const origin=project(0,0),axisX=project(1,0),axisY=project(0,1);
  const orientation=Math.sign((axisX.x-origin.x)*(axisY.y-origin.y)-(axisX.y-origin.y)*(axisY.x-origin.x))||1;
  const frontFacing=axisY.y>origin.y;
  const line=(points,color,width=.022)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=u*width;c.lineCap='round';c.lineJoin='round';c.stroke();};
  const wire=(points,color,width)=>line(points.map(p=>project(...p)),color,width);
  const dot=(x,y,z,rx,ry,color)=>{const p=project(x,y,z);renderer.ellipse(p.x,p.y,rx*u,ry*u,color);};
  const panel=(x,y,w,h,r,color)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();};
  const face=(x,y,z,w,h,color,r=.045)=>{
    if(!frontFacing)return;
    const p=project(x,y,z),axis=project(x+1,y,z);c.save();
    c.transform(axis.x-p.x,axis.y-p.y,0,-u,p.x,p.y);
    c.beginPath();c.roundRect(0,0,w,h,Math.min(r,w/2,h/2));c.fillStyle=color;c.fill();c.restore();
  };
  // Rounded footprints retain an isometric top and shaded curved vertical sides.
  const soft=(x,y,w,h,top,color,base=0,radius=.065)=>{
    const r=Math.min(radius,w/2,h/2), ring=[];
    for(const [cx,cy,start] of [[x+r,y+r,Math.PI],[x+w-r,y+r,Math.PI*1.5],[x+w-r,y+h-r,0],[x+r,y+h-r,Math.PI*.5]])
      for(let i=0;i<=3;i++){const a=start+i*Math.PI/6;ring.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}
    for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],p=project(...a,base),q=project(...b,base);if((q.x-p.x)*orientation<-.00001)renderer.poly([p,q,project(...b,top),project(...a,top)],tint(color,(q.y-p.y)*orientation>0?-25:-12));}
    renderer.poly(ring.map(p=>project(...p,top)),tint(color,10),tint(color,20));
  };
  const paper=(x,y,z,w=.3,h=.22)=>{soft(x,y,w,h,z,'#f5edd7',z-.025,.012);for(let i=0;i<3;i++)wire([[x+.05,y+.06+i*.045,z+.005],[x+w-.045,y+.06+i*.045,z+.005]],'#94aea6',.009);};
  const button=(x,y,z,on=false)=>dot(x,y,z,.027,.021,on?'#ffd98a':'#6e9990');
  return {c,u,project,line,wire,dot,panel,face,soft,paper,button,palette,frontFacing};
}

function upholstered(b,o,office=false) {
  const {x,y,w,h,kind}=o,{soft,wire,dot,face,palette:p}=b,sofa=kind==='sofa',color=office?p.trim:sofa?p.seat:p.accent;
  const base=!o.renderPart||o.renderPart==='base',back=!o.renderPart||o.renderPart==='back';
  if(base&&office){
    const cx=x+w/2,cy=y+h/2;
    for(let i=0;i<5;i++){const a=i*Math.PI*.4,xx=cx+Math.cos(a)*w*.42,yy=cy+Math.sin(a)*h*.42;wire([[cx,cy,.12],[xx,yy,.075]],p.metal,.038);dot(xx,yy,.035,.045,.033,p.trim);}
    soft(cx-.035,cy-.035,.07,.07,.29,p.metal,.09,.025);
  }else if(base)for(const xx of [x+.12,x+w-.18])for(const yy of [y+.13,y+h-.15])soft(xx,yy,.065,.065,.23,p.wood,.025,.02);
  if(base)soft(x+.025,y+.075,w-.05,h-.1,.29,color,.20,.11);
  if(back)soft(x+.015,y+.025,w-.03,.16,office?.73:.66,color,.28,.07);
  const count=Math.max(1,Math.floor(o.seats||1)),width=w/count,pad=Math.min(.08,width*.12);
  for(let i=0;i<count;i++){
    // Cushion top is the shared actor seat height; do not raise it for upholstery.
    if(base){soft(x+pad+i*width,y+.20,width-pad*2,h-.26,.32,tintHex(color,24),.265,.075);wire([[x+pad*1.5+i*width,y+h-.085,.322],[x+(i+1)*width-pad*1.5,y+h-.085,.322]],tintHex(color,-8),.009);}
    if(back){face(x+pad+i*width,y+.191,.36,width-pad*2,office?.29:.255,tintHex(color,23),.065);if(b.frontFacing)dot(x+(i+.5)*width,y+.162,.48,.016,.015,tintHex(color,-18));}
  }
  for(const [part,xx] of [['arm-left',x-.008],['arm-right',x+w-.105]])if(!o.renderPart||o.renderPart===part)soft(xx,y+.13,.11,h-.14,.43,color,.28,.05);
}
const tintHex=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');

function machine(b,renderer,room,o,time,active) {
  const {x,y,w,h,kind}=o,{c,u,soft,wire,dot,project,line,panel,button,palette:p}=b,pulse=active?Math.sin(time*5):0;
  soft(x+.08,y+.08,w-.16,h-.16,.18,p.body,.035,.13);
  soft(x+.035,y+.04,w-.07,h-.1,.36,p.light,.15,.15);
  soft(x+.10,y+h-.37,w-.20,.25,.49,p.trim,.35,.07);
  for(let i=0;i<3;i++)button(x+.23+i*.14,y+h-.105,.43,active&&i===Math.floor(time*2)%3);
  const q=project(x+w*.49,y+h*.38,.99);
  if(kind==='gp'){
    for(const side of [-1,1])line([{x:q.x+side*u*.36,y:q.y+u*.31},{x:q.x+side*u*.36,y:q.y+u*.64}],p.body,.10);
    const ring=(dx,dy,outer,inner,color)=>{c.beginPath();c.ellipse(q.x+dx*u,q.y+dy*u,outer*u,outer*u,0,0,Math.PI*2);c.ellipse(q.x+dx*u,q.y+dy*u,inner*u,inner*u,0,0,Math.PI*2);c.fillStyle=color;c.fill('evenodd');};
    ring(.045,.035,.51,.33,p.trim);ring(0,0,.51,.34,p.light);ring(0,0,.415,.335,p.body);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;renderer.ellipse(q.x+Math.cos(a)*u*.46,q.y+Math.sin(a)*u*.46,u*.025,u*.025,active&&(i+Math.floor(time*3))%3===0?'#ffcb72':'#b2c7b8');}
    renderer.duck(q.x,q.y-u*.52,u*.27,active?pulse*.06:0);
    soft(x+w*.30,y+h*.44,w*.40,h*.46,.49,p.seat,.36,.09);
    soft(x+w*.33,y+h*.49,w*.34,h*.14,.535,'#f6eed9',.49,.06);
    if(active){c.save();c.beginPath();c.arc(q.x,q.y,u*.327,0,Math.PI*2);c.clip();line([{x:q.x-u*.34,y:q.y+pulse*u*.28},{x:q.x+u*.34,y:q.y+pulse*u*.28}],'#77ceb5aa',.025);c.restore();}
  }else if(kind==='pharmacy'){
    for(const xx of [x+.41,x+1.03])soft(xx,y+.48,.15,.23,.85,p.body,.36,.05);
    for(let i=0;i<2;i++){
      const p=project(x+.48+i*.62,y+.55,1.11);
      panel(p.x-u*.17,p.y-u*.24,u*.34,u*.69,u*.07,'#accfc3');panel(p.x-u*.13,p.y-u*.20,u*.26,u*.60,u*.05,'#e1f0e6');
      panel(p.x-u*.115,p.y+u*(.04+pulse*.018),u*.23,u*(.33-pulse*.018),u*.035,i?'#c89462':'#8fbea1');
      line([{x:p.x-u*.09,y:p.y-u*.12},{x:p.x-u*.09,y:p.y+u*.27}],'#ffffff95',.018);
      if(active)for(let k=0;k<3;k++)renderer.ellipse(p.x+Math.sin(k*5)*u*.06,p.y+u*.31-((time*.20+k*.11)%.3)*u,u*.016,u*.02,'#fff4d9');
      soft(x+.30+i*.62,y+.39,.35,.32,1.4,b.palette.trim,1.33,.07);
    }
    wire([[x+.25,y+.28,1.38],[x+.25,y+.13,1.52],[x+1.2,y+.13,1.52],[x+1.2,y+.38,1.35]],'#bf8d58',.075);
    soft(x+.58,y+1.3,.48,.32,.71,'#f1e8cf',.44,.085);dot(x+.82,y+1.44,.715,.14,.053,'#826044');
    for(const xx of [x+.73,x+.9])dot(xx,y+1.62,.59,.020,.023,'#806246');
    wire([[x+.77,y+1.622,.54],[x+.815,y+1.622,.52],[x+.86,y+1.622,.54]],'#a57558',.013);
    if(active){const cup=project(x+.82,y+1.44,.76);renderer.particles(cup.x,cup.y,time,'#f6f2dd','~');}
  }else if(kind==='surgery'){
    soft(x+.61,y+.64,.36,.22,.77,p.metal,.36,.06);
    renderer.ellipse(q.x,q.y-u*.08,u*.42,u*.56,p.metal);renderer.ellipse(q.x,q.y-u*.08,u*.35,u*.48,'#d4e4e4');
    line([{x:q.x-u*.2,y:q.y-u*.32},{x:q.x+u*.12,y:q.y+u*.01}],'#edf6df88',.05);
    for(const side of [-1,1])renderer.ellipse(q.x+side*u*.10,q.y-u*.07,u*.023,u*.029,'#79a69b');
    c.beginPath();c.arc(q.x,q.y+u*.04,u*.13,.10,Math.PI-.10);c.strokeStyle='#b68587';c.lineWidth=u*.024;c.stroke();
    for(let i=0;i<10;i++){const a=i*Math.PI/5;renderer.ellipse(q.x+Math.cos(a)*u*.385,q.y-u*.08+Math.sin(a)*u*.52,u*.027,u*.027,active?'#ffdf92':'#e2c99c');}
    const zz=.75+pulse*.07;wire([[x+1.3,y+.32,.40],[x+1.3,y+.32,1.32],[x+1.02,y+.9,zz+.20]],p.metal,.065);
    soft(x+.78,y+.83,.42,.47,zz,p.body,zz-.10,.12);soft(x+.88,y+.93,.19,.17,zz+.13,p.trim,zz,.06);
    soft(x+.50,y+1.35,.55,.29,.61,p.seat,.43,.09);
    if(active)renderer.particles(q.x+u*.17,q.y-u*.15,time,'#fff0c5','~');
  }else if(kind==='therapy'){
    soft(x+.17,y+.40,w-.34,h-.65,.49,p.seat,.35,.16);soft(x+.27,y+.48,w-.54,.36,.59,p.light,.49,.13);
    wire([[x+1.25,y+.28,.40],[x+1.25,y+.28,1.45],[x+.65,y+.28,1.45]],p.metal,.045);
    for(let i=0;i<4;i++){const p=project(x+.36+i*.24,y+.30,1.25+(active?Math.sin(time*2+i)*.025:0));renderer.ellipse(p.x,p.y,u*.18,u*.14,'#e7e1ed');}
    renderer.duck(q.x,q.y+u*.18,u*.32,active?pulse*.04:0);if(active)renderer.particles(q.x,q.y-u*.30,time,'#a494c4','z');
  }else{
    soft(x+.18,y+.23,w-.36,.60,.76,p.body,.36,.10);renderer.duck(q.x,q.y-u*.08,u*.38,active?pulse*.05:0);
    soft(x+.25,y+1.12,1.12,.39,.56,p.accent,.41,.05);
    for(let i=0;i<4;i++){const xx=x+.41+i*.23,zz=.83+(active?Math.sin(time*3+i)*.018:0);wire([[xx,y+1.30,.58],[xx,y+1.30,zz]],'#bad9cd',.10);wire([[xx,y+1.30,.60],[xx,y+1.30,zz-.07]],['#ddb18a','#9abdaf','#c5b0d1','#a6c8d0'][i],.062);}
    if(active)renderer.particles(q.x,q.y-u*.35,time,'#a6b58a','·');
  }
}

export function drawRoomObject(renderer,room,object,time=0) {
  if(!KINDS.has(object.kind))return false; // Doors and unknown types remain the caller's responsibility.
  if(![object.x,object.y,object.w,object.h].every(Number.isFinite)||object.w<=0||object.h<=0)return false;
  if(['chair','sofa','stool'].includes(object.kind)&&!object.renderPart){
    const pieces=upholsteryPieces(object),depth=o=>o.renderPart==='base'?-Infinity:o.occlusion.x+o.occlusion.y+(o.occlusion.w+o.occlusion.h)/2;
    for(const piece of pieces.sort((a,b)=>depth(a)-depth(b)))drawRoomObject(renderer,room,piece,time);
    return true;
  }
  if(object.kind==='cubicle-door'&&!object.renderPart){for(const piece of cubiclePieces(object,object.doorOpen||0).sort((a,b)=>a.occlusion.x+a.occlusion.y-b.occlusion.x-b.occlusion.y))drawRoomObject(renderer,room,piece,time);return true;}
  ({renderer,object}=objectSpace(renderer,object));
  if(object.kind==='cubicle-door'&&object.renderPart.startsWith('leaf')&&object.doorOpen){const previous=renderer,local=Object.create(renderer);local.project=(x,y,z=0)=>{const p=doorPoint(x,y,object.doorOpen,object.renderPart);return previous.project(p.x,p.y,z);};renderer=local;}
  const palette=PALETTES[room.type]||PALETTES.gp;
  const b=brushes(renderer,palette),{c,u,soft,wire,dot,project,panel,paper,button}=b,{x,y,w,h,z,kind}=object,game=renderer.game;
  const staff=game?.staff?.find(s=>s.id===room.staffId),ready=!!staff&&staff.roomId===room.id&&!!game.staffReady?.(staff);
  const fault=game?.maintenance?.faults?.find(f=>f.roomId===room.id&&f.furnitureId===object.furnitureId);
  const active=!fault&&ready&&(room.type==='lab'?!!game.project:!!game.patients?.some(p=>p.id===room.patientId&&p.state==='service'));
  c.save();
  try {
    if(drawPracticeObject(b,renderer,room,object,time))return true;
    if(['chair','sofa','stool'].includes(kind))upholstered(b,object,kind==='stool');
    else if(['gp','pharmacy','surgery','therapy','lab'].includes(kind))machine(b,renderer,room,object,time,active);
    else if(kind==='counter'){
      if(!drawCounterDesign(b,object)){
        soft(x+.09,y+.06,w-.18,h-.1,.50,palette.body,.06,.13);soft(x,y,w,h,.57,palette.wood,.49,.14);
        if(b.frontFacing)for(let i=0;i<Math.floor(w/.17)-1;i++)wire([[x+.19+i*.17,y+h-.075,.12],[x+.19+i*.17,y+h-.075,.43]],palette.light,.026);
      }
      paper(x+w-.49,y+.22,.599,.32,.28);soft(x+w-.16,y+.12,.085,.11,.71,'#b19166',.57,.035);wire([[x+w-.12,y+.17,.67],[x+w-.11,y+.16,.82]],'#577f7c',.016);
    }else if(kind==='monitor'){
      const keyboardCenter=object.frame&&object.local?(object.frame.w/2-object.local.x)/(object.local.w/w):w/2;
      const keyX=x+keyboardCenter-(w+.04)/2;
      const drawKeyboard=()=>{soft(keyX,y+.27,w+.04,.17,.599,'#bed0bf',.578,.025);for(let i=0;i<5;i++)wire([[keyX+.07+i*.08,y+.30,.601],[keyX+.07+i*.08,y+.39,.601]],'#8aa99b',.009);};
      const keyboardInFront=project(x+keyboardCenter,y+.355).y>project(x+w/2,y+h/2).y;
      if(!keyboardInFront)drawKeyboard();
      soft(x+w*.27,y+.07,w*.46,.19,.60,palette.trim,.575,.04);soft(x+w*.46,y+.075,.07,.07,.72,palette.metal,.60,.02);
      soft(x,y,w,h,z,palette.trim,z-.28,.035);
      if(b.frontFacing){renderer.poly([project(x+.035,y+h+.002,z-.04),project(x+w-.035,y+h+.002,z-.04),project(x+w-.035,y+h+.002,z-.23),project(x+.035,y+h+.002,z-.23)],palette.light);
        for(let i=0;i<3;i++)wire([[x+.08,y+h+.005,z-.085-i*.045],[x+w-.08-(i%2)*.08,y+h+.005,z-.085-i*.045]],active&&i===Math.floor(time*2)%3?'#55998a':'#88afa0',.011);
      }else for(let i=0;i<3;i++)wire([[x+.13,y-.002,z-.10-i*.033],[x+w-.13,y-.002,z-.10-i*.033]],palette.metal,.010);
      if(keyboardInFront)drawKeyboard();
    }else if(kind==='bell'){
      const p=project(x+w/2,y+h/2,.64);renderer.ellipse(p.x,p.y,u*.15,u*.055,'#8d7856');renderer.ellipse(p.x,p.y-u*.04,u*.115,u*.08,'#e6be72');dot(x+w/2,y+h/2,.75,.04,.016,'#f6db9a');dot(x+w/2-.055,y+h/2,.708,.028,.018,'#fff0bf');
    }else if(kind==='cabinet'){
      soft(x+.04,y+.035,w-.08,h-.06,z-.03,palette.trim,.05,.08);soft(x,y,w,h,z,palette.light,z-.07,.055);
      for(let i=0;i<3;i++){const zz=.10+i*(z-.15)/3;soft(x+.045,y+h-.075,w-.09,.065,zz+(z-.19)/3,palette.body,zz,.023);wire([[x+w*.4,y+h+.002,zz+.09],[x+w*.6,y+h+.002,zz+.09]],palette.light,.025);}
      paper(x+.11,y+.10,z+.024,.22,.23);soft(x+w-.21,y+.09,.09,.11,z+.17,'#91b6ae',z,.025);soft(x+w-.20,y+.10,.07,.09,z+.21,'#e5d7b3',z+.17,.012);
    }else if(kind==='plant'){
      const cx=x+w/2,cy=y+h/2,p=project(cx,cy,.40);soft(x+.055,y+.055,w-.11,h-.11,.34,palette.accent,.045,.13);dot(cx,cy,.345,.17,.072,palette.light);dot(cx,cy,.351,.125,.051,'#7c6d4d');
      for(let i=0;i<7;i++){
        const a=i*2.4,dx=Math.cos(a)*u*.23+Math.sin(time*.8+i)*u*.003,dy=-u*(.16+(i%3)*.14);
        const length=Math.hypot(dx,dy),nx=-dy/length*u*.065,ny=dx/length*u*.065;
        b.line([{x:p.x,y:p.y},{x:p.x+dx*.6,y:p.y+dy*.6}],'#628967',.014);
        c.beginPath();c.moveTo(p.x+dx*.23,p.y+dy*.23);
        c.quadraticCurveTo(p.x+dx*.64+nx,p.y+dy*.64+ny,p.x+dx,p.y+dy);
        c.quadraticCurveTo(p.x+dx*.64-nx,p.y+dy*.64-ny,p.x+dx*.23,p.y+dy*.23);
        c.fillStyle=['#628d65','#80a577','#4e7a60'][i%3];c.fill();
      }
    }else if(kind==='books'){
      for(const xx of [x+.09,x+w-.14])for(const yy of [y+.09,y+h-.14])soft(xx,yy,.055,.055,.28,palette.wood,.035,.02);soft(x,y,w,h,.35,tintHex(palette.wood,22),.28,.10);
      for(let i=0;i<3;i++){const xx=x+.08+i*(w-.32)/3;soft(xx,y+.12,.22,.29,.38+i*.009,['#79a697','#d19b8b','#dbc07d'][i],.351,.012);paper(xx+.028,y+.14,.39+i*.009,.16,.22);}
    }else if(kind==='toys'){
      soft(x,y,w,h,.035,'#e8cb85',.015,.13);soft(x+.07,y+.12,w*.49,h*.67,.24,'#d4b88c',.035,.08);soft(x+.11,y+.16,w*.41,h*.55,.27,'#f0dfb6',.24,.06);
      for(let i=0;i<4;i++)soft(x+.15+(i%2)*.18,y+.21+Math.floor(i/2)*.17,.14,.14,.38+(i===3?.07:0),['#c98276','#78a89a','#85a6c2','#ddb566'][i],.27,.018);
      soft(x+w*.64,y+.16,w*.28,h*.60,.23,'#91b3a4',.035,.055);const p=project(x+w*.77,y+.32,.35);dot(x+w*.77,y+.32,.31,.10,.12,'#bd9567');dot(x+w*.71,y+.32,.44,.045,.047,'#b4875c');dot(x+w*.83,y+.32,.44,.045,.047,'#b4875c');dot(x+w*.77,y+.32,.405,.088,.079,'#d6b482');for(const dx of [-.027,.027])renderer.ellipse(p.x+dx*u,p.y-u*.055,u*.01,u*.012,'#5a5544');
      const duck=project(x+w*.52,y+h*.78,.17);renderer.duck(duck.x,duck.y,u*.23,0);
    }else if(kind==='sink'){
      soft(x+.035,y+.025,w-.07,h-.05,.49,palette.body,.065,.075);soft(x,y,w,h,.55,palette.light,.48,.09);dot(x+w*.51,y+h*.54,.557,w*.22,.075,palette.metal);dot(x+w*.51,y+h*.54,.559,w*.13,.041,palette.trim);
      wire([[x+w*.5,y+.07,.56],[x+w*.5,y+.07,.74],[x+w*.5,y+.20,.74],[x+w*.5,y+.20,.68]],palette.metal,.041);soft(x+.06,y+.07,.075,.09,.66,palette.accent,.55,.025);
      const use=needActivity(game,room.id,object.furnitureId);
      if(use?.phase==='wash'){
        wire([[x+w*.5,y+.20,.685],[x+w*.5,y+.25,.565]],'#a8dbdce0',.022);
        for(let i=0;i<4;i++){const phase=(use.progress*4+i/4)%1;dot(x+w*.5+Math.sin(i*3)*.055,y+.25+Math.cos(i*3)*.028,.57+phase*.018,.014+phase*.014,.010,'#edf6e7');}
      }
    }else if(kind==='toilet'){
      soft(x+.14,y+.08,w-.28,.25,.70,'#dce3d1',.09,.065);soft(x+.10,y+.045,w-.20,.29,.74,'#f0edda',.69,.08);soft(x+.24,y+.43,w-.48,.40,.28,'#ccd7c7',.04,.095);dot(x+w/2,y+.65,.33,.28,.14,'#f1efdc');dot(x+w/2,y+.65,.339,.165,.075,'#a8c2b4');dot(x+w/2,y+.66,.341,.115,.045,'#789d92');button(x+w-.25,y+.08,.748);
      if(object.furnitureKind==='toilet-cubicle'){
        // Paper and holder stay inside the enclosing side wall, attached to the
        // WC's own depth layer so a nearer opaque panel always covers them.
        wire([[x+w+.095,y+.43,.51],[x+w+.095,y+.61,.51]],'#8ca69b',.025);
        soft(x+w+.052,y+.455,.085,.13,.568,'#f1ebd7',.45,.039);
        soft(x+w+.054,y+.50,.006,.095,.46,'#e5dec9',.385,.002);
      }
      if(object.divider===true){soft(x-.15,y,.055,h+.2,.97,palette.body,.05,.02);wire([[x-.14,y+.1,.93],[x-.14,y+h+.12,.93]],palette.light,.024);}
    }else if(kind==='poster'){
      soft(x,y,w,h,z,palette.wood,.64,.018);b.face(x+.035,y+h+.002,.67,w-.07,.425,palette.light,.014);
      const p=project(x+w*.49,y+h+.006,.84);renderer.duck(p.x,p.y,u*.21,0);
      wire([[x+w-.14,y+h+.009,.97],[x+w-.14,y+h+.009,1.07]],'#82aa96',.031);
      wire([[x+w-.20,y+h+.009,1.02],[x+w-.08,y+h+.009,1.02]],'#82aa96',.026);
      wire([[x+.11,y+h+.008,.735],[x+w-.11,y+h+.008,.735]],'#b9cbb4',.010);
    }else if(kind==='clock'){
      const p=project(x+w/2,y+h,.98),axis=project(x+w/2+1,y+h,.98),radius=w*.50;
      c.save();c.transform(axis.x-p.x,axis.y-p.y,0,-u,p.x,p.y);
      for(const [size,color] of [[radius,palette.trim],[radius-.022,palette.light]]){c.beginPath();c.arc(0,0,size,0,Math.PI*2);c.fillStyle=color;c.fill();}
      for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.arc(Math.sin(a)*radius*.76,Math.cos(a)*radius*.76,.006,0,Math.PI*2);c.fillStyle='#89a293';c.fill();}
      const elapsed=game?.admissionsOpen?time*.018:0;
      for(const [angle,length,width] of [[elapsed+Math.PI/3,radius*.65,.011],[elapsed/12-Math.PI/3,radius*.43,.016]]){
        c.beginPath();c.moveTo(0,0);c.lineTo(Math.sin(angle)*length,Math.cos(angle)*length);c.strokeStyle='#587d6d';c.lineWidth=width;c.lineCap='round';c.stroke();
      }
      c.beginPath();c.arc(0,0,.017,0,Math.PI*2);c.fillStyle='#d1a35d';c.fill();c.restore();
    }else if(kind==='coffee'){
      soft(x,y,w,h,.68,palette.body,.05,.09);soft(x+.04,y+.025,w-.08,h-.08,1.03,palette.trim,.65,.065);soft(x+.09,y+.065,w-.18,.17,1.08,palette.wood,1.025,.04);
      soft(x+.13,y+h-.08,w-.26,.10,.60,'#d8d5b9',.54,.025);dot(x+w*.49,y+h-.025,.70,.10,.08,'#ecdfbd');dot(x+w*.49,y+h-.025,.755,.073,.026,'#806246');for(let i=0;i<3;i++)button(x+.17+i*.14,y+h-.052,.91);wire([[x+w*.50,y+h-.05,.84],[x+w*.50,y+h-.05,.78]],'#c6cdb5',.037);
      if(game?.staff?.some(s=>s.state==='break'&&s.breakRoomId===room.id)){const cup=project(x+w*.49,y+h-.025,.82);renderer.particles(cup.x,cup.y,time,'#f5efda','~');}
    }
    if(fault&&['counter','gp','pharmacy','therapy','surgery','lab'].includes(kind)){
      const pos=project(x+w*.73,y+h*.70,kind==='counter'?.59:1.14),size=u*.16;
      c.fillStyle='#eed392';c.strokeStyle='#ae7546';c.lineWidth=Math.max(.8,u*.013);c.beginPath();c.moveTo(pos.x,pos.y-size);c.lineTo(pos.x+size*.85,pos.y+size*.60);c.lineTo(pos.x-size*.85,pos.y+size*.60);c.closePath();c.fill();c.stroke();
      c.strokeStyle='#875e3e';c.lineWidth=Math.max(1,u*.020);c.lineCap='round';c.beginPath();c.moveTo(pos.x,pos.y-size*.50);c.lineTo(pos.x,pos.y+size*.10);c.stroke();renderer.ellipse(pos.x,pos.y+size*.34,u*.010,u*.010,'#875e3e');
    }
    return true;
  } finally {c.restore();}
}
