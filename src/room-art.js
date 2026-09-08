// Canvas-only furniture. Registry coordinates, seats and simulation state are read-only.
const KINDS = new Set(['chair','sofa','stool','counter','monitor','bell','cabinet','plant','toys','books','sink','toilet','coffee','gp','pharmacy','surgery','therapy','lab','poster','clock']);
const tint = (hex, n) => `rgb(${[1,3,5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i,i+2),16)+n))).join(',')})`;

function brushes(renderer) {
  const c=renderer.ctx, u=renderer.tw, project=renderer.project.bind(renderer);
  const line=(points,color,width=.022)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=u*width;c.lineCap='round';c.lineJoin='round';c.stroke();};
  const wire=(points,color,width)=>line(points.map(p=>project(...p)),color,width);
  const dot=(x,y,z,rx,ry,color)=>{const p=project(x,y,z);renderer.ellipse(p.x,p.y,rx*u,ry*u,color);};
  const panel=(x,y,w,h,r,color)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();};
  const face=(x,y,z,w,h,color,r=.045)=>{
    const p=project(x,y,z),axis=project(x+1,y,z);c.save();
    c.transform(axis.x-p.x,axis.y-p.y,0,-u,p.x,p.y);
    c.beginPath();c.roundRect(0,0,w,h,Math.min(r,w/2,h/2));c.fillStyle=color;c.fill();c.restore();
  };
  // Rounded footprints retain an isometric top and shaded curved vertical sides.
  const soft=(x,y,w,h,top,color,base=0,radius=.065)=>{
    const r=Math.min(radius,w/2,h/2), ring=[];
    for(const [cx,cy,start] of [[x+r,y+r,Math.PI],[x+w-r,y+r,Math.PI*1.5],[x+w-r,y+h-r,0],[x+r,y+h-r,Math.PI*.5]])
      for(let i=0;i<=3;i++){const a=start+i*Math.PI/6;ring.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}
    for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1];if(dy-dx>1e-6)renderer.poly([project(...a,base),project(...b,base),project(...b,top),project(...a,top)],tint(color,dy>Math.abs(dx)?-25:-12));}
    renderer.poly(ring.map(p=>project(...p,top)),tint(color,10),tint(color,20));
  };
  const paper=(x,y,z,w=.3,h=.22)=>{soft(x,y,w,h,z,'#f5edd7',z-.025,.012);for(let i=0;i<3;i++)wire([[x+.05,y+.06+i*.045,z+.005],[x+w-.045,y+.06+i*.045,z+.005]],'#94aea6',.009);};
  const button=(x,y,z,on=false)=>dot(x,y,z,.027,.021,on?'#ffd98a':'#6e9990');
  return {c,u,project,line,wire,dot,panel,face,soft,paper,button};
}

function upholstered(b,o,office=false) {
  const {x,y,w,h,kind}=o,{soft,wire,dot,face}=b, sofa=kind==='sofa', color=office?'#548d87':sofa?'#77aaa1':'#d8ac77';
  if(office){
    const cx=x+w/2,cy=y+h/2;
    for(let i=0;i<5;i++){const a=i*Math.PI*.4,xx=cx+Math.cos(a)*w*.42,yy=cy+Math.sin(a)*h*.42;wire([[cx,cy,.12],[xx,yy,.075]],'#78918b',.038);dot(xx,yy,.035,.045,.033,'#405e59');}
    soft(cx-.035,cy-.035,.07,.07,.29,'#a2b7ae',.09,.025);
  }else for(const xx of [x+.12,x+w-.18])for(const yy of [y+.13,y+h-.15])soft(xx,yy,.065,.065,.23,'#9b7854',.025,.02);
  soft(x+.025,y+.075,w-.05,h-.1,.29,color,.20,.11);
  soft(x+.015,y+.025,w-.03,.16,office?.73:.66,color,.28,.07);
  const count=o.seats||1, width=(w-.16)/count;
  for(let i=0;i<count;i++){
    // Cushion top is the shared actor seat height; do not raise it for upholstery.
    soft(x+.08+i*width,y+.20,width-.025,h-.26,.32,tintHex(color,24),.265,.075);
    face(x+.08+i*width,y+.191,.36,width-.025,office?.29:.255,tintHex(color,23),.065);
    dot(x+.08+(i+.5)*width,y+.162,.48,.016,.015,tintHex(color,-18));
    wire([[x+.13+i*width,y+h-.085,.322],[x+.08+(i+1)*width-.065,y+h-.085,.322]],tintHex(color,-8),.009);
  }
  for(const xx of [x-.008,x+w-.105])soft(xx,y+.13,.11,h-.14,.43,color,.28,.05);
}
const tintHex=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');

function machine(b,renderer,room,o,time,active) {
  const {x,y,w,h,kind}=o,{c,u,soft,wire,dot,project,line,panel,button}=b, pulse=active?Math.sin(time*5):0;
  soft(x+.08,y+.08,w-.16,h-.16,.18,'#72998e',.035,.13);
  soft(x+.035,y+.04,w-.07,h-.1,.36,'#e1e8d9',.15,.15);
  soft(x+.10,y+h-.37,w-.20,.25,.49,'#5a8c81',.35,.07);
  for(let i=0;i<3;i++)button(x+.23+i*.14,y+h-.105,.43,active&&i===Math.floor(time*2)%3);
  const q=project(x+w*.49,y+h*.38,.99);
  if(kind==='gp'){
    for(const side of [-1,1])line([{x:q.x+side*u*.36,y:q.y+u*.31},{x:q.x+side*u*.36,y:q.y+u*.64}],'#7aa89b',.10);
    const ring=(dx,dy,outer,inner,color)=>{c.beginPath();c.ellipse(q.x+dx*u,q.y+dy*u,outer*u,outer*u,0,0,Math.PI*2);c.ellipse(q.x+dx*u,q.y+dy*u,inner*u,inner*u,0,0,Math.PI*2);c.fillStyle=color;c.fill('evenodd');};
    ring(.045,.035,.51,.33,'#55887e');ring(0,0,.51,.34,'#e4ead5');ring(0,0,.415,.335,'#81bdb2');
    for(let i=0;i<8;i++){const a=i*Math.PI/4;renderer.ellipse(q.x+Math.cos(a)*u*.46,q.y+Math.sin(a)*u*.46,u*.025,u*.025,active&&(i+Math.floor(time*3))%3===0?'#ffcb72':'#b2c7b8');}
    renderer.duck(q.x,q.y-u*.52,u*.27,active?pulse*.06:0);
    soft(x+w*.30,y+h*.44,w*.40,h*.46,.49,'#9cbfaf',.36,.09);
    soft(x+w*.33,y+h*.49,w*.34,h*.14,.535,'#f6eed9',.49,.06);
    if(active){c.save();c.beginPath();c.arc(q.x,q.y,u*.327,0,Math.PI*2);c.clip();line([{x:q.x-u*.34,y:q.y+pulse*u*.28},{x:q.x+u*.34,y:q.y+pulse*u*.28}],'#77ceb5aa',.025);c.restore();}
  }else if(kind==='pharmacy'){
    for(const xx of [x+.41,x+1.03])soft(xx,y+.48,.15,.23,.85,'#8fb3a4',.36,.05);
    for(let i=0;i<2;i++){
      const p=project(x+.48+i*.62,y+.55,1.11);
      panel(p.x-u*.17,p.y-u*.24,u*.34,u*.69,u*.07,'#accfc3');panel(p.x-u*.13,p.y-u*.20,u*.26,u*.60,u*.05,'#e1f0e6');
      panel(p.x-u*.115,p.y+u*(.04+pulse*.018),u*.23,u*(.33-pulse*.018),u*.035,i?'#c89462':'#8fbea1');
      line([{x:p.x-u*.09,y:p.y-u*.12},{x:p.x-u*.09,y:p.y+u*.27}],'#ffffff95',.018);
      if(active)for(let k=0;k<3;k++)renderer.ellipse(p.x+Math.sin(k*5)*u*.06,p.y+u*.31-((time*.20+k*.11)%.3)*u,u*.016,u*.02,'#fff4d9');
      soft(x+.30+i*.62,y+.39,.35,.32,1.4,'#5b9189',1.33,.07);
    }
    wire([[x+.25,y+.28,1.38],[x+.25,y+.13,1.52],[x+1.2,y+.13,1.52],[x+1.2,y+.38,1.35]],'#bf8d58',.075);
    soft(x+.58,y+1.3,.48,.32,.71,'#f1e8cf',.44,.085);dot(x+.82,y+1.44,.715,.14,.053,'#826044');
    for(const xx of [x+.73,x+.9])dot(xx,y+1.62,.59,.020,.023,'#806246');
    wire([[x+.77,y+1.622,.54],[x+.815,y+1.622,.52],[x+.86,y+1.622,.54]],'#a57558',.013);
    if(active){const cup=project(x+.82,y+1.44,.76);renderer.particles(cup.x,cup.y,time,'#f6f2dd','~');}
  }else if(kind==='surgery'){
    soft(x+.61,y+.64,.36,.22,.77,'#9bb4a6',.36,.06);
    renderer.ellipse(q.x,q.y-u*.08,u*.42,u*.56,'#b89169');renderer.ellipse(q.x,q.y-u*.08,u*.35,u*.48,'#c6ded7');
    line([{x:q.x-u*.2,y:q.y-u*.32},{x:q.x+u*.12,y:q.y+u*.01}],'#edf6df88',.05);
    for(const side of [-1,1])renderer.ellipse(q.x+side*u*.10,q.y-u*.07,u*.023,u*.029,'#79a69b');
    c.beginPath();c.arc(q.x,q.y+u*.04,u*.13,.10,Math.PI-.10);c.strokeStyle='#b68587';c.lineWidth=u*.024;c.stroke();
    for(let i=0;i<10;i++){const a=i*Math.PI/5;renderer.ellipse(q.x+Math.cos(a)*u*.385,q.y-u*.08+Math.sin(a)*u*.52,u*.027,u*.027,active?'#ffdf92':'#e2c99c');}
    const zz=.75+pulse*.07;wire([[x+1.3,y+.32,.40],[x+1.3,y+.32,1.32],[x+1.02,y+.9,zz+.20]],'#819e92',.065);
    soft(x+.78,y+.83,.42,.47,zz,'#c993a1',zz-.10,.12);soft(x+.88,y+.93,.19,.17,zz+.13,'#936777',zz,.06);
    soft(x+.50,y+1.35,.55,.29,.61,'#aac7b8',.43,.09);
    if(active)renderer.particles(q.x+u*.17,q.y-u*.15,time,'#fff0c5','~');
  }else if(kind==='therapy'){
    soft(x+.17,y+.40,w-.34,h-.65,.49,'#b2a5cb',.35,.16);soft(x+.27,y+.48,w-.54,.36,.59,'#e0d7e9',.49,.13);
    wire([[x+1.25,y+.28,.40],[x+1.25,y+.28,1.45],[x+.65,y+.28,1.45]],'#90a99d',.045);
    for(let i=0;i<4;i++){const p=project(x+.36+i*.24,y+.30,1.25+(active?Math.sin(time*2+i)*.025:0));renderer.ellipse(p.x,p.y,u*.18,u*.14,'#e7e1ed');}
    renderer.duck(q.x,q.y+u*.18,u*.32,active?pulse*.04:0);if(active)renderer.particles(q.x,q.y-u*.30,time,'#a494c4','z');
  }else{
    soft(x+.18,y+.23,w-.36,.60,.76,'#b6cbbb',.36,.10);renderer.duck(q.x,q.y-u*.08,u*.38,active?pulse*.05:0);
    soft(x+.25,y+1.12,1.12,.39,.56,'#dfceaa',.41,.05);
    for(let i=0;i<4;i++){const xx=x+.41+i*.23,zz=.83+(active?Math.sin(time*3+i)*.018:0);wire([[xx,y+1.30,.58],[xx,y+1.30,zz]],'#bad9cd',.10);wire([[xx,y+1.30,.60],[xx,y+1.30,zz-.07]],['#ddb18a','#9abdaf','#c5b0d1','#a6c8d0'][i],.062);}
    if(active)renderer.particles(q.x,q.y-u*.35,time,'#a6b58a','·');
  }
}

export function drawRoomObject(renderer,room,object,time=0) {
  if(!KINDS.has(object.kind))return false; // Doors and unknown types remain the caller's responsibility.
  const b=brushes(renderer),{c,u,soft,wire,dot,project,panel,paper,button}=b,{x,y,w,h,z,kind}=object,game=renderer.game;
  const staff=game?.staff?.find(s=>s.id===room.staffId),ready=!!staff&&staff.roomId===room.id&&!!game.staffReady?.(staff);
  const active=ready&&(room.type==='lab'?!!game.project:!!game.patients?.some(p=>p.id===room.patientId&&p.state==='service'));
  c.save();
  try {
    if(['chair','sofa','stool'].includes(kind))upholstered(b,object,kind==='stool');
    else if(['gp','pharmacy','surgery','therapy','lab'].includes(kind))machine(b,renderer,room,object,time,active);
    else if(kind==='counter'){
      soft(x+.09,y+.06,w-.18,h-.1,.50,'#75a298',.06,.13);soft(x,y,w,h,.57,'#debf96',.49,.14);
      for(let i=0;i<Math.floor(w/.17)-1;i++)wire([[x+.19+i*.17,y+h-.075,.12],[x+.19+i*.17,y+h-.075,.43]],'#a8c1ac',.026);
      paper(x+w-.49,y+.22,.599,.32,.28);soft(x+w-.16,y+.12,.085,.11,.71,'#b19166',.57,.035);wire([[x+w-.12,y+.17,.67],[x+w-.11,y+.16,.82]],'#577f7c',.016);
    }else if(kind==='monitor'){
      soft(x+w*.27,y+.07,w*.46,.19,.60,'#537970',.575,.04);soft(x+w*.46,y+.075,.07,.07,.72,'#7a9990',.60,.02);
      soft(x,y,w,h,z,'#426961',z-.28,.035);renderer.poly([project(x+.035,y+h+.002,z-.04),project(x+w-.035,y+h+.002,z-.04),project(x+w-.035,y+h+.002,z-.23),project(x+.035,y+h+.002,z-.23)],'#c4ded0');
      for(let i=0;i<3;i++)wire([[x+.08,y+h+.005,z-.085-i*.045],[x+w-.08-(i%2)*.08,y+h+.005,z-.085-i*.045]],active&&i===Math.floor(time*2)%3?'#55998a':'#88afa0',.011);
      soft(x-.03,y+.27,w+.04,.17,.599,'#bed0bf',.578,.025);for(let i=0;i<5;i++)wire([[x+.04+i*.08,y+.30,.601],[x+.04+i*.08,y+.39,.601]],'#8aa99b',.009);
    }else if(kind==='bell'){
      const p=project(x+w/2,y+h/2,.64);renderer.ellipse(p.x,p.y,u*.15,u*.055,'#8d7856');renderer.ellipse(p.x,p.y-u*.04,u*.115,u*.08,'#e6be72');dot(x+w/2,y+h/2,.75,.04,.016,'#f6db9a');dot(x+w/2-.055,y+h/2,.708,.028,.018,'#fff0bf');
    }else if(kind==='cabinet'){
      soft(x+.04,y+.035,w-.08,h-.06,z-.03,'#9dbbad',.05,.08);soft(x,y,w,h,z,'#dfdbc5',z-.07,.055);
      for(let i=0;i<3;i++){const zz=.10+i*(z-.15)/3;soft(x+.045,y+h-.075,w-.09,.065,zz+(z-.19)/3,'#c4d4bd',zz,.023);wire([[x+w*.4,y+h+.002,zz+.09],[x+w*.6,y+h+.002,zz+.09]],'#688e80',.025);}
      paper(x+.11,y+.10,z+.024,.22,.23);soft(x+w-.21,y+.09,.09,.11,z+.17,'#91b6ae',z,.025);soft(x+w-.20,y+.10,.07,.09,z+.21,'#e5d7b3',z+.17,.012);
    }else if(kind==='plant'){
      const cx=x+w/2,cy=y+h/2,p=project(cx,cy,.40);soft(x+.055,y+.055,w-.11,h-.11,.34,'#c79868',.045,.13);dot(cx,cy,.345,.17,.072,'#e8c795');dot(cx,cy,.351,.125,.051,'#7c6d4d');
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
      for(const xx of [x+.09,x+w-.14])for(const yy of [y+.09,y+h-.14])soft(xx,yy,.055,.055,.28,'#a78256',.035,.02);soft(x,y,w,h,.35,'#dbbc92',.28,.10);
      for(let i=0;i<3;i++){const xx=x+.08+i*(w-.32)/3;soft(xx,y+.12,.22,.29,.38+i*.009,['#79a697','#d19b8b','#dbc07d'][i],.351,.012);paper(xx+.028,y+.14,.39+i*.009,.16,.22);}
    }else if(kind==='toys'){
      soft(x,y,w,h,.035,'#e8cb85',.015,.13);soft(x+.07,y+.12,w*.49,h*.67,.24,'#d4b88c',.035,.08);soft(x+.11,y+.16,w*.41,h*.55,.27,'#f0dfb6',.24,.06);
      for(let i=0;i<4;i++)soft(x+.15+(i%2)*.18,y+.21+Math.floor(i/2)*.17,.14,.14,.38+(i===3?.07:0),['#c98276','#78a89a','#85a6c2','#ddb566'][i],.27,.018);
      soft(x+w*.64,y+.16,w*.28,h*.60,.23,'#91b3a4',.035,.055);const p=project(x+w*.77,y+.32,.35);dot(x+w*.77,y+.32,.31,.10,.12,'#bd9567');dot(x+w*.71,y+.32,.44,.045,.047,'#b4875c');dot(x+w*.83,y+.32,.44,.045,.047,'#b4875c');dot(x+w*.77,y+.32,.405,.088,.079,'#d6b482');for(const dx of [-.027,.027])renderer.ellipse(p.x+dx*u,p.y-u*.055,u*.01,u*.012,'#5a5544');
      const duck=project(x+w*.52,y+h*.78,.17);renderer.duck(duck.x,duck.y,u*.23,0);
    }else if(kind==='sink'){
      soft(x+.035,y+.025,w-.07,h-.05,.49,'#93b5a8',.065,.075);soft(x,y,w,h,.55,'#e8e9d5',.48,.09);dot(x+w*.51,y+h*.54,.557,w*.22,.075,'#a4c5b8');dot(x+w*.51,y+h*.54,.559,w*.13,.041,'#769f94');
      wire([[x+w*.5,y+.07,.56],[x+w*.5,y+.07,.74],[x+w*.5,y+.20,.74],[x+w*.5,y+.20,.68]],'#b2c7bd',.041);soft(x+.06,y+.07,.075,.09,.66,'#cfae7e',.55,.025);
    }else if(kind==='toilet'){
      soft(x+.14,y+.08,w-.28,.25,.70,'#dce3d1',.09,.065);soft(x+.10,y+.045,w-.20,.29,.74,'#f0edda',.69,.08);soft(x+.24,y+.43,w-.48,.40,.28,'#ccd7c7',.04,.095);dot(x+w/2,y+.65,.33,.28,.14,'#f1efdc');dot(x+w/2,y+.65,.339,.165,.075,'#a8c2b4');dot(x+w/2,y+.66,.341,.115,.045,'#789d92');button(x+w-.25,y+.08,.748);
      if(x>room.x+.4){soft(x-.15,y,.055,h+.2,.97,'#a6c1b1',.05,.02);wire([[x-.14,y+.1,.93],[x-.14,y+h+.12,.93]],'#d3dfc9',.024);}
    }else if(kind==='poster'){
      soft(x,y,w,h,z,'#cbaa7d',.64,.018);b.face(x+.035,y+h+.002,.67,w-.07,.425,'#f3ebd5',.014);
      const p=project(x+w*.49,y+h+.006,.84);renderer.duck(p.x,p.y,u*.21,0);
      wire([[x+w-.14,y+h+.009,.97],[x+w-.14,y+h+.009,1.07]],'#82aa96',.031);
      wire([[x+w-.20,y+h+.009,1.02],[x+w-.08,y+h+.009,1.02]],'#82aa96',.026);
      wire([[x+.11,y+h+.008,.735],[x+w-.11,y+h+.008,.735]],'#b9cbb4',.010);
    }else if(kind==='clock'){
      const p=project(x+w/2,y+h,.98),axis=project(x+w/2+1,y+h,.98),radius=w*.50;
      c.save();c.transform(axis.x-p.x,axis.y-p.y,0,-u,p.x,p.y);
      for(const [size,color] of [[radius,'#78998a'],[radius-.022,'#f3ebd3']]){c.beginPath();c.arc(0,0,size,0,Math.PI*2);c.fillStyle=color;c.fill();}
      for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.arc(Math.sin(a)*radius*.76,Math.cos(a)*radius*.76,.006,0,Math.PI*2);c.fillStyle='#89a293';c.fill();}
      const elapsed=game?.admissionsOpen?time*.018:0;
      for(const [angle,length,width] of [[elapsed+Math.PI/3,radius*.65,.011],[elapsed/12-Math.PI/3,radius*.43,.016]]){
        c.beginPath();c.moveTo(0,0);c.lineTo(Math.sin(angle)*length,Math.cos(angle)*length);c.strokeStyle='#587d6d';c.lineWidth=width;c.lineCap='round';c.stroke();
      }
      c.beginPath();c.arc(0,0,.017,0,Math.PI*2);c.fillStyle='#d1a35d';c.fill();c.restore();
    }else if(kind==='coffee'){
      soft(x,y,w,h,.68,'#91b2a2',.05,.09);soft(x+.04,y+.025,w-.08,h-.08,1.03,'#4c796f',.65,.065);soft(x+.09,y+.065,w-.18,.17,1.08,'#c5b693',1.025,.04);
      soft(x+.13,y+h-.08,w-.26,.10,.60,'#d8d5b9',.54,.025);dot(x+w*.49,y+h-.025,.70,.10,.08,'#ecdfbd');dot(x+w*.49,y+h-.025,.755,.073,.026,'#806246');for(let i=0;i<3;i++)button(x+.17+i*.14,y+h-.052,.91);wire([[x+w*.50,y+h-.05,.84],[x+w*.50,y+h-.05,.78]],'#c6cdb5',.037);
      if(game?.staff?.some(s=>s.state==='break'&&s.breakRoomId===room.id)){const cup=project(x+w*.49,y+h-.025,.82);renderer.particles(cup.x,cup.y,time,'#f5efda','~');}
    }
    return true;
  } finally {c.restore();}
}
