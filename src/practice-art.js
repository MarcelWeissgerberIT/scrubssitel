// Local furniture geometry only. The room-art adapter supplies scale and rotation.
export const PRACTICE_SIZES={
  'writing-desk':[1.5,.75],'round-table':[1,1],'medicine-rack':[.75,.5],
  'gum-machine':[.5,.5],'newspaper-rack':[.5,.5],'water-dispenser':[.5,.5],
  'coat-rack':[.5,.5],sanitizer:[.25,.25]
};

function cross(b,x,y,z,size,color){
  b.wire([[x-size/2,y,z],[x+size/2,y,z]],color,size*.28);
  b.wire([[x,y,z-size/2],[x,y,z+size/2]],color,size*.28);
}

function packageFace(b,x,y,z,w,h,color){
  b.face(x,y,z,w,h,color,.008);
  b.face(x+.015,y+.001,z+h*.53,w-.03,h*.24,'#f7f0df',.004);
  if(b.frontFacing)b.wire([[x+.025,y+.003,z+h*.24],[x+w-.025,y+.003,z+h*.24]],'#77998e',.008);
}

function cylinder(b,renderer,x,y,r,top,color,base){
  const points=Array.from({length:40},(_,i)=>[x+Math.cos(i*Math.PI/20)*r,y+Math.sin(i*Math.PI/20)*r]);
  const p=b.project(0,0),a=b.project(1,0),d=b.project(0,1);
  const orientation=Math.sign((a.x-p.x)*(d.y-p.y)-(a.y-p.y)*(d.x-p.x))||1;
  const shade=n=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(color.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
  for(let i=0;i<points.length;i++){
    const left=points[i],right=points[(i+1)%points.length],q=b.project(...left,base),s=b.project(...right,base);
    if((s.x-q.x)*orientation<-.00001)renderer.poly([q,s,b.project(...right,top),b.project(...left,top)],shade((s.y-q.y)*orientation>0?-25:-12));
  }
  renderer.poly(points.map(point=>b.project(...point,top)),shade(10));
}

export function drawCounterDesign(b,o){
  const {x,y,w,h,design}=o,{soft,wire,face,palette:p}=b;
  if(design==='round'){
    soft(x+.16,y+.11,w-.32,h-.18,.12,'#775743',.035,.30);
    soft(x+.10,y+.06,w-.20,h-.10,.51,'#a8714b',.07,.34);
    soft(x,y,w,h,.57,'#d4ab78',.50,.38);
    if(b.frontFacing)for(let xx=x+.43;xx<x+w-.4;xx+=.12)wire([[xx,y+h-.052,.15],[xx,y+h-.052,.46]],'#dfb985',.018);
  }else if(design==='modern'){
    soft(x+.12,y+.09,w-.24,h-.15,.12,'#637d7c',.045,.08);
    soft(x+.055,y+.035,w-.11,h-.08,.52,'#e5eee4',.10,.12);
    soft(x,y,w,h,.57,'#f7f3e5',.51,.15);
    face(x+.13,y+h-.041,.22,w-.26,.12,'#76b1ac',.025);
    if(b.frontFacing){
      wire([[x+w*.69,y+h-.037,.14],[x+w*.69,y+h-.037,.46]],'#bbd0c7',.012);
      cross(b,x+.34,y+h-.035,.395,.115,'#448d87');
    }
  }else if(design==='dispensary'){
    soft(x+.025,y+.02,w-.05,h-.04,.12,'#779b8e',.035,.04);
    soft(x+.04,y+.035,w-.08,h-.07,.52,'#b6d1c5',.07,.07);
    face(x+.11,y+h-.033,.14,w-.22,.32,'#709b93',.017);
    if(b.frontFacing){
      for(let row=0;row<2;row++)for(let col=0;col<6;col++){
        const xx=x+.16+col*(w-.31)/6,zz=.17+row*.145;
        packageFace(b,xx,y+h-.030,zz,(w-.48)/6,.115,['#e6c383','#c8dcd0','#e5b0a2','#c8c4df'][((row*2)+col)%4]);
      }
      face(x+.11,y+h-.020,.14,w-.22,.32,'#cae8dd32',.012);
      for(const xx of [x+.1,x+w*.5,x+w-.13])soft(xx,y+h-.039,.03,.025,.49,'#e7eedc',.115,.009);
      wire([[x+w*.56,y+h-.010,.42],[x+w*.69,y+h-.010,.23]],'#f4ffef75',.025);
    }
    if(b.frontFacing)soft(x+.075,y+h-.05,w-.15,.035,.31,'#e7eedc',.285,.009);
    soft(x,y,w,h,.57,'#eee6c9',.51,.085);
  }else return false;
  return true;
}

export function drawPracticeObject(b,renderer,room,o,time){
  const {x,y,w,h,kind}=o,{soft,wire,dot,face,paper,c,u,project,palette:p}=b;
  if(kind==='writing-desk'){
    for(const xx of [x+.08,x+w-.14])for(const yy of [y+.075,y+h-.13])soft(xx,yy,.055,.055,.55,'#7d7865',.035,.018);
    soft(x+.07,y+.055,.39,h-.1,.52,'#aa8a67',.08,.035);
    for(let i=0;i<3;i++){
      face(x+.095,y+h-.044,.12+i*.125,.34,.102,'#d2b18a',.01);
      if(b.frontFacing)wire([[x+.21,y+h-.038,.18+i*.125],[x+.30,y+h-.038,.18+i*.125]],'#826b51',.019);
    }
    soft(x,y,w,h,.59,'#d4b68b',.53,.055);
    soft(x+.56,y+.17,.57,.40,.606,'#77a697',.591,.026);
    paper(x+.66,y+.21,.63,.34,.29);
    wire([[x+.99,y+.28,.641],[x+1.06,y+.43,.641]],'#b27953',.017);
    soft(x+1.26,y+.13,.105,.12,.74,'#6b9b94',.59,.023);
    for(let i=0;i<3;i++)wire([[x+1.285+i*.023,y+.18,.72],[x+1.27+i*.03,y+.17,.85+(i%2)*.03]],['#bd7b63','#547a85','#c1a757'][i],.012);
    soft(x+.13,y+.15,.17,.18,.63,'#88765e',.59,.018);
    const stamp=project(x+.215,y+.235,.70);renderer.duck(stamp.x,stamp.y,u*.13,0);
  }else if(kind==='round-table'){
    cylinder(b,renderer,x+.5,y+.5,.22,.075,'#87745a',.025);
    cylinder(b,renderer,x+.5,y+.5,.06,.54,'#ae8a60',.075);
    cylinder(b,renderer,x+.5,y+.5,.49,.575,'#d2ab75',.52);
    soft(x+.13,y+.15,.36,.28,.60,'#67958f',.576,.022);
    paper(x+.155,y+.17,.617,.30,.22);
    wire([[x+.21,y+.22,.621],[x+.39,y+.22,.621]],'#b26e62',.017);
    soft(x+.59,y+.39,.23,.23,.593,'#efe4c8',.577,.11);
    soft(x+.65,y+.45,.11,.11,.71,'#e2b071',.593,.048);
    dot(x+.705,y+.505,.714,.046,.021,'#775e43');
    wire([[x+.756,y+.50,.68],[x+.79,y+.50,.675],[x+.79,y+.50,.626],[x+.756,y+.50,.62]],'#e2b071',.018);
    soft(x+.36,y+.63,.22,.19,.70,'#96b6a7',.576,.024);
    paper(x+.395,y+.68,.725,.11,.07);
  }else if(kind==='medicine-rack'){
    soft(x+.035,y+.025,w-.07,h-.05,1.08,'#c3cdb4',.07,.025);
    soft(x+.015,y+.012,w-.03,h-.024,1.115,'#e8e7cd',1.07,.025);
    face(x+.075,y+h-.023,.15,w-.15,.85,'#739287',.012);
    if(b.frontFacing)for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      const xx=x+.09+col*.14,zz=.18+row*.275;
      packageFace(b,xx,y+h-.020,zz,.11,.19+(col%2)*.035,['#e8c37d','#b5d2c0','#d8aa9e','#b3c6df'][(row+col)%4]);
    }
    if(b.frontFacing)for(let row=0;row<4;row++)soft(x+.058,y+h-.05,w-.116,.037,.155+row*.275,'#e5e4c8',.124+row*.275,.008);
    if(b.frontFacing)cross(b,x+w*.50,y+h-.010,1.039,.064,'#5e9a88');
  }else if(kind==='gum-machine'){
    soft(x+.045,y+.045,w-.09,h-.09,.105,'#865654',.025,.11);
    soft(x+.09,y+.09,w-.18,h-.18,.455,'#bd6961',.09,.07);
    soft(x+.13,y+.11,w-.26,h-.22,.57,'#bcbba2',.455,.04);
    const q=project(x+w/2,y+h/2,.82);
    const glass=c.createRadialGradient(q.x-u*.075,q.y-u*.09,u*.025,q.x,q.y,u*.255);
    glass.addColorStop(0,'#f6f4dce8');glass.addColorStop(.7,'#c0d7cde8');glass.addColorStop(1,'#8daea5');
    renderer.ellipse(q.x,q.y,u*.21,u*.25,glass);
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){
      const dx=(col-2)*.068+(row%2)*.016,dy=.135-row*.067;
      if(Math.abs(dx)>.145&&row===3)continue;
      renderer.ellipse(q.x+dx*u,q.y+dy*u,u*.036,u*.038,['#dcbd71','#c38486','#83bca4','#85a8c4','#b39cc0'][(row*2+col)%5]);
    }
    b.line([{x:q.x-u*.12,y:q.y-u*.11},{x:q.x-u*.14,y:q.y+u*.015}],'#ffffedbd',.022);
    soft(x+.07,y+.07,w-.14,h-.14,1.105,'#bd6961',1.075,.16);
    soft(x+.205,y+.205,.09,.09,1.145,'#e5c583',1.105,.04);
    face(x+.16,y+h-.081,.235,.18,.105,'#d3c59e',.024);
    if(b.frontFacing){wire([[x+.205,y+h-.077,.294],[x+.295,y+h-.077,.294]],'#6a7064',.015);wire([[x+.25,y+h-.072,.265],[x+.25,y+h-.072,.315]],'#8c7660',.023);}
    face(x+.17,y+h-.080,.135,.16,.066,'#6a5e55',.019);
  }else if(kind==='newspaper-rack'){
    soft(x+.025,y+.025,w-.05,h-.05,.08,'#9b7d5a',.025,.035);
    for(const xx of [x+.055,x+w-.095])soft(xx,y+.075,.04,.05,.99,'#9b7d5a',.07,.018);
    soft(x+.04,y+.065,w-.08,.07,1.01,'#c7aa78',.94,.025);
    for(let row=0;row<2;row++){
      const zz=.18+row*.38,yy=y+.16-row*.055;
      soft(x+.065,yy,w-.13,.22,zz,'#bd9c6c',zz-.045,.022);
      for(let col=0;col<2;col++){
        const xx=x+.08+col*.175,front=yy+.038;
        soft(xx,yy,.16,.032,zz+.31,['#d9b585','#9fbcb0'][(row+col)%2],zz,.005);
        face(xx+.012,front,zz+.042,.135,.242,'#f1e8cd',.003);
        if(b.frontFacing){
          wire([[xx+.027,front+.002,zz+.253],[xx+.133,front+.002,zz+.253]],row?'#709785':'#b47e6e',.019);
          for(let line=0;line<3;line++)wire([[xx+.025,front+.002,zz+.095+line*.032],[xx+.135,front+.002,zz+.095+line*.032]],'#a7ac91',.008);
          const eye=project(xx+.075,front+.004,zz+.187);renderer.ellipse(eye.x,eye.y,u*.029,u*.028,'#d9bc79');
        }
      }
      soft(x+.06,yy+.19,w-.12,.035,zz+.12,'#bf9e6b',zz,.012);
    }
  }else if(kind==='water-dispenser'){
    soft(x+.065,y+.06,w-.13,h-.12,.10,'#91a6a0',.025,.055);
    soft(x+.055,y+.045,w-.11,h-.09,.75,'#e2e7d8',.085,.055);
    soft(x+.06,y+.05,w-.12,h-.1,.785,'#b3c5bb',.735,.05);
    soft(x+.115,y+.105,w-.23,h-.21,1.105,'#a9ccc7',.805,.12);
    soft(x+.135,y+.125,w-.27,h-.25,1.15,'#c7ded2',1.105,.11);
    for(const zz of [.85,.98,1.065])soft(x+.115,y+.105,w-.23,h-.21,zz+.012,'#c6ded3',zz,.12);
    face(x+.117,y+h-.044,.275,.266,.30,'#789b94',.033);
    if(b.frontFacing)for(let i=0;i<2;i++){
      const xx=x+.183+i*.13;soft(xx-.025,y+h-.075,.05,.055,.555,i?'#a46e66':'#6e9bb3',.515,.012);
      if(b.frontFacing)wire([[xx,y+h-.012,.525],[xx,y+h-.012,.481]],'#d6ddcd',.019);
    }
    if(b.frontFacing)soft(x+.115,y+h-.11,.27,.07,.29,'#bdcfc1',.267,.014);
    if(b.frontFacing){face(x+.226,y+h-.026,.293,.07,.115,'#eee9cf',.009);wire([[x+.165,y+h-.043,.62],[x+.335,y+h-.043,.62]],'#91b0a2',.014);}
    wire([[x+.17,y+.13,.85],[x+.17,y+.13,1.065]],'#f4ffef7a',.016);
    // A quiet bubble follows the caller's simulation animation clock, so pause
    // freezes it and static catalog renders never animate or install a timer.
    if(renderer.game?.admissionsOpen)dot(x+.27,y+.26,.86+(time*.025%.19),.012,.016,'#ecf9e5b0');
  }else if(kind==='coat-rack'){
    soft(x+.035,y+.035,w-.07,h-.07,.07,'#897965',.023,.21);
    const coat=()=>{
      soft(x+.13,y+.28,.235,.055,.94,'#729f9b',.44,.025);
      wire([[x+.14,y+.306,.91],[x+.075,y+.306,.72]],'#729f9b',.055);
      wire([[x+.355,y+.306,.91],[x+.412,y+.306,.72]],'#729f9b',.055);
      face(x+.185,y+.338,.77,.105,.16,'#abc6b6',.014);
      if(b.frontFacing){wire([[x+.245,y+.341,.46],[x+.245,y+.341,.875]],'#548682',.010);for(const zz of [.59,.71,.80])dot(x+.26,y+.343,zz,.009,.009,'#dfd1a7');}
    };
    if(!b.frontFacing)coat();
    soft(x+.226,y+.226,.048,.048,1.105,'#aa8158',.07,.02);
    for(const [dx,dy] of [[-.17,0],[.17,0],[0,-.17],[0,.17]]){
      wire([[x+.25,y+.25,.96],[x+.25+dx,y+.25+dy,1.085]],'#aa8158',.03);
      dot(x+.25+dx,y+.25+dy,1.10,.028,.031,'#ccb082');
    }
    dot(x+.25,y+.25,1.16,.042,.045,'#cca976');
    if(b.frontFacing)coat();
  }else if(kind==='sanitizer'){
    soft(x+.006,y+.006,w-.012,h-.012,.048,'#97aba3',.016,.115);
    soft(x+.105,y+.105,.04,.04,.66,'#b6c7bc',.047,.018);
    soft(x+.035,y+.055,.18,.14,.87,'#f0ecda',.65,.032);
    soft(x+.055,y+.072,.14,.105,.925,'#9ebdad',.866,.025);
    wire([[x+.13,y+.12,.923],[x+.13,y+.12,.967],[x+.19,y+.12,.967]],'#6b958b',.021);
    face(x+.066,y+.199,.697,.114,.127,'#b1d2ba',.02);
    if(b.frontFacing)cross(b,x+.124,y+.202,.761,.058,'#5c9885');
    soft(x+.058,y+.06,.133,.133,.643,'#8faea1',.62,.04);
  }else return false;
  return true;
}
