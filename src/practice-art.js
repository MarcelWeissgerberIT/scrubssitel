// Local furniture geometry only. The room-art adapter supplies scale and rotation.
import {amenityActivity} from './amenities.js';
export const PRACTICE_SIZES={
  'writing-desk':[1.5,.75],'round-table':[1,1],'medicine-rack':[.75,.5],
  'gum-machine':[.5,.5],'snack-machine':[.75,.75],'drink-machine':[.75,.75],
  'newspaper-rack':[.5,.5],'water-dispenser':[.5,.5],
  'coat-rack':[.5,.5],sanitizer:[.25,.25],
  'privacy-screen':[1.5,.25],'glass-partition':[1.5,.25],
  'cubicle-back':[1.5,.1],'cubicle-side':[.1,1.9],'cubicle-door':[1.3,.1],
  'treatment-trolley':[.75,.5],'waste-bin':[.5,.5],'examination-couch':[1.75,.75]
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

function cubiclePanel(b,o){
  const {x,y,w,h,z,kind,part}=o,{soft,wire,dot,project,c,u}=b,side=kind==='cubicle-side',door=kind==='cubicle-door';
  const top=z||1.18,metal='#9aafa7',edge='#c4d5c8',body=door?'#a9c9bb':side?'#b7cec2':'#c5d7c8';
  const length=side?h:w;
  // Small visible feet support genuinely opaque panels; the open space under
  // them is a foot gap, never translucent glass or a simulated occupancy light.
  for(const along of [.08,length-.08]){
    const xx=side?x+w/2:x+along,yy=side?y+along:y+h/2;
    soft(xx-.025,yy-.025,.05,.05,.20,metal,.025,.018);
    soft(xx-.04,yy-.04,.08,.08,.043,'#c8d3c5',.021,.025);
  }
  soft(x+.009,y+.009,w-.018,h-.018,top-.025,body,.13,.018);
  soft(x+.003,y+.003,w-.006,h-.006,top,edge,top-.032,.022);
  if(side){
    for(const yy of [y+.018,y+h-.05])soft(x+.008,yy,w-.016,.032,top-.012,metal,.11,.01);
    // Hooks belong to the inside face of each side wall, and disappear behind
    // the panel when that face turns away from the camera.
    const interior=part==='left'?1:-1,axis=project(x+1,y),origin=project(x,y);
    if((axis.y-origin.y)*interior>0){
      const xx=x+(interior>0?w+.004:-.004),yy=y+h*.70;
      wire([[xx,yy,.94],[xx+interior*.046,yy,.94],[xx+interior*.046,yy,.985]],'#7e9691',.019);
      dot(xx,yy,.94,.022,.026,edge);
    }
    return;
  }
  const front=b.frontFacing,fy=front?y+h+.003:y-.003;
  const surface=(xx,zz,ww,hh,color,radius=.018)=>{
    const q=project(xx,fy,zz),axis=project(xx+1,fy,zz);c.save();
    c.transform(axis.x-q.x,axis.y-q.y,0,-u,q.x,q.y);c.fillStyle=color;c.beginPath();c.roundRect(0,0,ww,hh,radius);c.fill();c.restore();
  };
  if(!door){surface(x+.08,.20,w-.16,.80,'#ccdbcf',.025);return;}
  // Jambs, door leaf and a narrow real seam make this read as a closed cubicle.
  for(const xx of [x+.005,x+w-.055])soft(xx,y+.004,.05,h-.008,top-.012,metal,.075,.012);
  surface(x+.078,.158,w-.156,top-.225,front?'#b9d3c4':'#c4d9cb',.025);
  wire([[x+.065,fy,.16],[x+.065,fy,top-.053]],'#819e95',.011);
  wire([[x+w-.065,fy,.16],[x+w-.065,fy,top-.053]],'#819e95',.009);
  for(const zz of [.30,.86])surface(x+.046,zz,.034,.10,'#dce4d7',.006);
  const handle=x+w-.17;surface(handle-.033,.52,.065,.14,'#e5e8d8',.017);
  wire([[handle,fy+(front?.009:-.009),.61],[handle-.087,fy+(front?.009:-.009),.61]],'#657f78',.026);
  if(front){
    surface(x+w*.5-.17,.82,.34,.20,'#f3edcf',.028);
    const q=project(x+w*.5,fy+.004,.855),axis=project(x+w*.5+1,fy+.004,.855);
    c.save();c.transform(axis.x-q.x,axis.y-q.y,0,u,q.x,q.y);c.fillStyle='#537b70';c.font='700 .12px sans-serif';c.textAlign='center';c.fillText('WC',0,0);c.restore();
    for(let i=0;i<4;i++)surface(x+.27,.24+i*.035,w-.54,.012,'#85a89a',.006);
  }else{
    wire([[x+w*.55,fy,.85],[x+w*.55,fy-.055,.85],[x+w*.55,fy-.055,.91]],'#829b91',.021);
  }
}

// A purchase's simulation progress is the only clock for vending movement.
// Idle catalog renders and paused games therefore draw the same exact pixels.
function vendingCabinet(b,o,activity){
  const {x,y,w,h,kind}=o,{soft,wire,face,dot,project,c,u}=b,drink=kind==='drink-machine';
  const active=!!activity?.active,progress=active?activity.progress:0;
  const pulse=active?Math.sin(Math.PI*progress):0,turn=progress*Math.PI*6;
  const body=drink?'#4e999b':'#cb8168',trim=drink?'#286a74':'#86504b',cream='#f0dfb4';
  for(const xx of [x+.09,x+w-.17])for(const yy of [y+.08,y+h-.16])soft(xx,yy,.08,.08,.10,trim,.025,.02);
  soft(x+.035,y+.035,w-.07,h-.07,1.34,body,.07,.095);
  soft(x+.018,y+.018,w-.036,h-.036,1.38,cream,1.285,.08);
  soft(x+.043,y+.043,w-.086,h-.086,.155,trim,.07,.065);
  // Service doors and cooling vents follow the side plane rather than the screen.
  const servicePanel=(right)=>{
    const xx=right?x+w-.033:x+.14,yy=right?y+.14:y+.033,q=project(xx,yy,.28),axis=project(xx+(right?0:1),yy+(right?1:0),.28);
    c.save();c.transform(axis.x-q.x,axis.y-q.y,0,-u,q.x,q.y);
    c.fillStyle=trim;c.beginPath();c.roundRect(0,0,.46,.74,.025);c.fill();
    c.fillStyle=body;c.beginPath();c.roundRect(.016,.018,.428,.704,.015);c.fill();
    c.fillStyle=trim;for(let row=0;row<5;row++){c.beginPath();c.roundRect(.067,.075+row*.039,.29,.015,.007);c.fill();}
    c.fillStyle=cream;c.beginPath();c.roundRect(.365,.44,.026,.09,.009);c.fill();
    c.fillStyle=drink?'#90c6ba':'#e2a98b';c.beginPath();c.roundRect(.105,.38,.22,.22,.035);c.fill();
    c.fillStyle=cream;c.beginPath();c.arc(.215,.49,.055,0,Math.PI*2);c.fill();c.restore();
  };
  if(project(x+1,y).y>project(x,y).y)servicePanel(true);
  if(!b.frontFacing)servicePanel(false);
  // Recessed display, generous metal surround, and a real dark collection bay.
  face(x+.075,y+h-.027,.43,.45,.82,cream,.038);
  face(x+.10,y+h-.023,.455,.40,.765,'#294c50',.025);
  face(x+.54,y+h-.025,.445,.12,.71,trim,.025);
  face(x+.11,y+h-.023,.19,.40,.18,cream,.034);
  face(x+.137,y+h-.019,.215,.346,.128,'#314b49',.021);
  if(!b.frontFacing)return;
  // A restrained pennant strip gives the machines their little party outfit.
  wire([[x+.10,y+h-.008,1.30],[x+.31,y+h-.008,1.285],[x+.50,y+h-.008,1.30]],trim,.009);
  for(let i=0;i<5;i++)dot(x+.12+i*.088,y+h-.003,1.298-(i===2?.015:.005),.017,.022,['#dca64f','#8bb9a3','#d68a7f'][i%3]);
  face(x+.555,y+h-.020,.985,.088,.105,active?'#e7cf76':'#a4c1a6',.012);
  for(let i=0;i<3;i++){
    dot(x+.599,y+h-.010,.89-i*.13,.023,.019,active&&i===1?'#f7dc86':'#ded4b3');
    face(x+.565,y+h-.014,.495+i*.046,.064,.018,'#527670',.006);
  }
  wire([[x+.574,y+h-.007,1.045],[x+.626,y+h-.007,1.045]],'#547562',.014);
  const fy=y+h-.015,colors=drink?['#e4b359','#8fc3bb','#d98c84']:['#deb36c','#a1c2a0','#d39195'];
  for(let row=0;row<3;row++){
    const z=.485+row*.246;
    face(x+.103,fy,z,.394,.028,'#a4bcb0',.006);
    for(let col=0;col<3;col++){
      const xx=x+.125+col*.124,selected=active&&row===1&&col===1;
      const shake=selected?Math.sin(turn)*.006*pulse:0;
      if(drink){
        face(xx+.014+shake,fy+.002,z+.045,.078,.16,colors[(row+col)%3],.022);
        face(xx+.032+shake,fy+.003,z+.195,.042,.033,'#dddcbf',.008);
        face(xx+.022+shake,fy+.006,z+.105,.062,.051,'#f0ead2',.005);
        wire([[xx+.027+shake,fy+.008,z+.163],[xx+.027+shake,fy+.008,z+.181]],'#ffffff90',.010);
      }else{
        face(xx+shake,fy+.002,z+.045,.097,.151,colors[(row+col)%3],.016);
        face(xx+.012+shake,fy+.004,z+.096,.073,.060,'#efe2bd',.007);
        dot(xx+.049+shake,fy+.009,z+.122,.016,.016,trim);
        for(const zz of [z+.05,z+.186])wire([[xx+.009+shake,fy+.008,zz],[xx+.087+shake,fy+.008,zz]],'#f3d39b',.008);
        const coil=[];for(let i=0;i<=18;i++){const a=i*Math.PI/3+(selected?turn:0);coil.push([xx+.008+i*.0044,fy+.017,z+.068+Math.sin(a)*.018]);}wire(coil,'#d8dccc',.009);
      }
    }
  }
  // Glass stays transparent enough for products and their mechanism to read.
  face(x+.101,fy+.021,.456,.398,.762,'#d5eddf14',.022);
  wire([[x+.127,fy+.025,1.06],[x+.189,fy+.025,1.18]],'#effffb90',.017);
  wire([[x+.437,fy+.025,.62],[x+.473,fy+.025,.69]],'#effffb55',.012);
  if(active&&progress>.30&&progress<.92){
    const drop=Math.min(1,Math.max(0,(progress-.30)/.43)),z=.79-drop*.555,xx=x+.25;
    face(xx,fy+.030,z,.11,drink?.16:.13,colors[1],drink?.025:.012);
    face(xx+.012,fy+.032,z+.049,.086,.048,'#f1e7c7',.006);
    if(drink)face(xx+.034,fy+.032,z+.15,.043,.03,'#efe2be',.006);
  }
  // The pickup flap lifts within the cabinet footprint, without entering the use port.
  const opening=active?Math.sin(Math.PI*Math.min(1,Math.max(0,(progress-.55)/.4))):0;
  face(x+.137,fy+.039,.31+opening*.035,.346,.024,'#adc4b5',.008);
  dot(x+.595,fy+.034,1.06,.011+Math.max(0,pulse)*.004,.011,active?'#fff1a5':'#728f77');
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
  const activity=['gum-machine','snack-machine','drink-machine'].includes(kind)?amenityActivity(renderer.game,room.id,o.furnitureId):null;
  if(['cubicle-back','cubicle-side','cubicle-door'].includes(kind)){
    cubiclePanel(b,o);
  }else if(kind==='writing-desk'){
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
  }else if(kind==='snack-machine'||kind==='drink-machine'){
    vendingCabinet(b,o,activity);
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
      const jiggle=activity?.active?Math.sin(activity.progress*Math.PI*6+col+row)*Math.sin(activity.progress*Math.PI)*.013:0;
      renderer.ellipse(q.x+(dx+jiggle)*u,q.y+dy*u,u*.036,u*.038,['#dcbd71','#c38486','#83bca4','#85a8c4','#b39cc0'][(row*2+col)%5]);
    }
    b.line([{x:q.x-u*.12,y:q.y-u*.11},{x:q.x-u*.14,y:q.y+u*.015}],'#ffffedbd',.022);
    soft(x+.07,y+.07,w-.14,h-.14,1.105,'#bd6961',1.075,.16);
    soft(x+.205,y+.205,.09,.09,1.145,'#e5c583',1.105,.04);
    face(x+.16,y+h-.081,.235,.18,.105,'#d3c59e',.024);
    if(b.frontFacing){const a=(activity?.progress||0)*Math.PI*2;wire([[x+.205,y+h-.077,.294],[x+.295,y+h-.077,.294]],'#6a7064',.015);wire([[x+.25-Math.sin(a)*.025,y+h-.072,.29-Math.cos(a)*.025],[x+.25+Math.sin(a)*.025,y+h-.072,.29+Math.cos(a)*.025]],'#8c7660',.023);}
    face(x+.17,y+h-.080,.135,.16,.066,'#6a5e55',.019);
    if(b.frontFacing&&activity?.active&&activity.progress>.58&&activity.progress<.95)dot(x+.25,y+h-.073,.172,.023,.025,'#e8ba60');
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
  }else if(kind==='privacy-screen'||kind==='glass-partition'){
    const glass=kind==='glass-partition',metal=glass?'#99b1ac':'#b7ad91';
    for(const xx of [x+.095,x+w-.255])soft(xx,y+.008,.16,h-.016,.065,metal,.025,.035);
    if(glass){
      soft(x+.067,y+.085,w-.134,.07,1.09,'#b9d8d1',.20,.02);
      face(x+.085,y+.158,.22,w-.17,.45,'#e3eee1',.014);
      if(b.frontFacing)for(let i=0;i<3;i++)wire([[x+.18+i*.37,y+.161,.74],[x+.35+i*.37,y+.161,1.01]],'#effbf2a6',.025);
      for(const xx of [x+.037,x+w/2-.024,x+w-.085])soft(xx,y+.079,.048,.082,1.14,metal,.065,.016);
      for(const zz of [.195,1.12])soft(x+.046,y+.078,w-.092,.084,zz+.026,metal,zz,.013);
      if(b.frontFacing){for(const xx of [x+.35,x+1.10])cross(b,xx,y+.162,.455,.095,'#9bbab0');}
    }else{
      for(let i=0;i<3;i++){
        const xx=x+.055+i*.475,yy=y+(i%2?.145:.07);
        soft(xx+.02,yy,.40,.045,1.095,['#83b5a7','#93c0ac','#83b5a7'][i],.205,.018);
        if(b.frontFacing){for(let fold=0;fold<5;fold++)wire([[xx+.055+fold*.074,yy+.047,.245],[xx+.055+fold*.074,yy+.047,1.06]],fold%2?'#b8d3b5':'#71a697',.009);}
        for(const edge of [xx,xx+.42])soft(edge,yy-.009,.033,.065,1.13,metal,.065,.013);
        for(const zz of [.19,1.10])wire([[xx+.016,yy+.025,zz],[xx+.437,yy+.025,zz]],metal,.024);
        if(i<2)wire([[xx+.435,yy+.02,.84],[xx+.493,y+(i%2?.09:.165),.84]],'#998f78',.02);
      }
    }
  }else if(kind==='treatment-trolley'){
    for(const xx of [x+.09,x+w-.09])for(const yy of [y+.075,y+h-.075]){wire([[xx,yy,.20],[xx,yy,.065]],'#9caca3',.028);dot(xx,yy,.045,.035,.032,'#667f79');}
    soft(x+.035,y+.025,w-.07,h-.05,.265,'#99b7ae',.215,.04);
    soft(x+.12,y+.09,.32,.26,.345,'#e8e4d0',.266,.02);
    for(const zz of [.289,.316])wire([[x+.145,y+.351,zz],[x+.415,y+.351,zz]],'#c3c8b1',.009);
    for(const xx of [x+.06,x+w-.08])for(const yy of [y+.055,y+h-.075])soft(xx,yy,.022,.022,.68,'#a3b9b1',.14,.007);
    soft(x+.018,y+.013,w-.036,h-.026,.64,'#d7e1cf',.587,.035);
    for(const yy of [y+.023,y+h-.047])wire([[x+.045,yy,.696],[x+w-.045,yy,.696]],'#93b0a4',.025);
    soft(x+.11,y+.14,.13,.14,.805,'#9cb9c4',.64,.035);soft(x+.123,y+.153,.104,.114,.84,'#eee9d5',.805,.028);
    soft(x+.305,y+.13,.16,.17,.755,'#e5cc96',.64,.018);paper(x+.32,y+.145,.759,.125,.135);
    soft(x+.535,y+.16,.085,.095,.83,'#8dbaa7',.64,.022);soft(x+.549,y+.174,.057,.067,.895,'#e6e4cb',.83,.012);
    if(b.frontFacing)cross(b,x+.383,y+.303,.695,.058,'#b49c69');
  }else if(kind==='waste-bin'){
    const pedal=()=>soft(x+.20,y+.424,.10,.064,.10,'#8ba69c',.065,.018);
    if(!b.frontFacing)pedal();
    soft(x+.075,y+.074,w-.15,h-.148,.10,'#829d98',.033,.07);
    soft(x+.065,y+.072,w-.13,h-.144,.54,'#b4c7bb',.08,.075);
    soft(x+.035,y+.045,w-.07,h-.09,.585,'#e0e6d5',.532,.075);
    wire([[x+.16,y+.097,.585],[x+.16,y+.097,.608],[x+.33,y+.097,.608],[x+.33,y+.097,.585]],'#91afa3',.018);
    if(b.frontFacing)pedal();
    face(x+.145,y+h-.070,.245,.21,.19,'#e4e5ce',.035);
    if(b.frontFacing){for(const xx of [x+.205,x+.295])dot(xx,y+h-.067,.372,.011,.014,'#6f8d7b');wire([[x+.20,y+h-.065,.315],[x+.245,y+h-.065,.293],[x+.29,y+h-.065,.315]],'#7d9a84',.012);}
  }else if(kind==='examination-couch'){
    for(const xx of [x+.15,x+w-.20])for(const yy of [y+.12,y+h-.15]){
      soft(xx,yy,.045,.045,.43,'#a7bbb2',.075,.016);dot(xx+.022,yy+.023,.05,.035,.032,'#788f87');
    }
    soft(x+.095,y+.055,w-.19,h-.11,.43,'#a0bcb0',.37,.05);
    soft(x+.045,y+.025,w-.09,h-.05,.555,'#8ebcae',.427,.095);
    soft(x+.41,y+.075,w-.48,h-.15,.572,'#f0eddb',.555,.025);
    soft(x+.075,y+.066,.36,h-.13,.68,'#afd1bc',.55,.085);
    wire([[x+.12,y+.105,.687],[x+.38,y+.105,.687]],'#d8e3cb',.009);
    soft(x+w-.265,y+.09,.18,h-.18,.635,'#e7e6d4',.554,.08);
    wire([[x+.485,y+.133,.576],[x+w-.30,y+.133,.576]],'#d2d8c3',.008);
    if(b.frontFacing){wire([[x+.78,y+h-.032,.475],[x+.96,y+h-.032,.475]],'#6a9f93',.023);cross(b,x+.87,y+h-.030,.482,.045,'#d8e7d0');}
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
