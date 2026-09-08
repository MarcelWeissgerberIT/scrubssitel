import {characterScale,skeleton} from './animation.js';
// Original cast modeled from the OpenArt cast reference. Live articulated
// geometry supplies complete front, side and back views without slicing a bitmap.
export const LOOKS={
 milo:{skin:'#bd8056',hair:'#332520',shirt:'#289c98',pants:'#267d79',shoes:'#eef4e6',style:'curls',glasses:true,medical:true},
 bea:{skin:'#efb990',hair:'#a64020',shirt:'#83aacf',pants:'#6c93c0',shoes:'#f4eee0',style:'bun',medical:true,stout:true},
 rosa:{skin:'#b47750',hair:'#34241f',shirt:'#df9d40',sleeve:'#a9d5c4',pants:'#2d8480',shoes:'#f3e9ce',style:'bob'},
 nia:{skin:'#815139',hair:'#272322',shirt:'#9b739e',pants:'#795a89',shoes:'#e9e4db',style:'bun',medical:true},
 park:{skin:'#ddb48b',hair:'#242626',shirt:'#f1efe5',sleeve:'#f5f3ec',pants:'#537e7b',shoes:'#f0ece3',style:'sweep',medical:true},
 otto:{skin:'#daab7e',hair:'#bcbab0',shirt:'#d7a447',pants:'#bb8532',shoes:'#6b6556',style:'tuft',moustache:true},
 'child-0':{skin:'#e4b18a',hair:'#885334',shirt:'#e6ad4d',pants:'#68a6b1',shoes:'#f3ecd7',style:'ponytail'},
 'child-1':{skin:'#9d6849',hair:'#34271f',shirt:'#8cba8d',pants:'#608ca7',shoes:'#f4d787',style:'curls'},
 'child-2':{skin:'#edbc94',hair:'#a7643f',shirt:'#a98abb',pants:'#d38d77',shoes:'#f2e9d6',style:'bob'},
 'patient-0':{skin:'#e4b18a',hair:'#805036',shirt:'#d9675d',sleeve:'#e0786a',pants:'#68726e',shoes:'#eee6ce',style:'ponytail'},
 'patient-1':{skin:'#e0ae87',hair:'#896344',shirt:'#9462a4',pants:'#be9145',shoes:'#736149',style:'bald',stout:true},
 'patient-2':{skin:'#a57452',hair:'#c9c5bd',shirt:'#5faea7',pants:'#4b8d87',shoes:'#ece9d8',style:'bob',glasses:true}
};
// Recruitment identity is shared by the portrait and the live articulated model.
const STAFF_LOOKS={
 receptionist:[LOOKS.rosa,{skin:'#f0c2a1',hair:'#b95d2b',shirt:'#8a74b1',sleeve:'#ecd5ad',pants:'#625889',shoes:'#efc46f',style:'ponytail',freckles:true,headWidth:.22,eyeSpacing:.10},{skin:'#c38d63',hair:'#333634',shirt:'#467fa3',sleeve:'#85bac0',pants:'#355267',shoes:'#ba8657',style:'sweep',moustache:true,stout:true,tie:true,headWidth:.26}],
 doctor:[LOOKS.milo,{skin:'#805039',hair:'#302623',shirt:'#edeedc',sleeve:'#b2ccdb',pants:'#607ca2',shoes:'#eff0e2',style:'bun',medical:true,earring:true,headWidth:.22},LOOKS.park],
 nurse:[LOOKS.bea,{skin:'#ae734d',hair:'#463526',shirt:'#d6b04d',pants:'#5b8796',shoes:'#f2e1aa',style:'curls',medical:true,headWidth:.255},{skin:'#efd0ac',hair:'#273339',shirt:'#8bb68d',pants:'#4d8975',shoes:'#ece7d6',style:'bob',glasses:true,medical:true,eyeSpacing:.105}],
 surgeon:[LOOKS.nia,{skin:'#efb991',hair:'#ba552d',shirt:'#58978b',pants:'#3a7068',shoes:'#f3e7d2',style:'ponytail',freckles:true,medical:true},{skin:'#d6b293',hair:'#bbc2bc',shirt:'#a788a9',pants:'#716380',shoes:'#eceddf',style:'bald',moustache:true,stout:true,medical:true,headWidth:.26}],
 janitor:[LOOKS.otto,{skin:'#81543d',hair:'#302920',shirt:'#719aba',sleeve:'#e4c77d',pants:'#48728d',shoes:'#695341',style:'curls',headWidth:.25},{skin:'#efbb99',hair:'#b84e27',shirt:'#aa7ea5',sleeve:'#a9d0b9',pants:'#7b638c',shoes:'#f1d59c',style:'bun',glasses:true,freckles:true}]
};
export function appearanceFor(person){
 const id=person.applicantId??(typeof person.id==='string'?person.id:''),match=/^(\d+)-(receptionist|doctor|nurse|surgeon|janitor)-([0-2])$/.exec(id);
 if(!match){const key=person.castId||`${person.child?'child':'patient'}-${person.variant||0}`;return {key,look:LOOKS[key]||LOOKS.milo};}
 const round=Number(match[1]),base=STAFF_LOOKS[match[2]][Number(match[3])];if(!round)return {key:id,look:base};
 const shirts=['#bd8675','#79a6ad','#ab97bd','#8aaa82','#cead65'],hair=['#4b342a','#aa6038','#706454','#c1beb0'];
 return {key:id,look:{...base,hair:hair[(round+Number(match[3]))%hair.length],shirt:shirts[(round+Number(match[3])*2)%shirts.length],sleeve:base.medical?base.sleeve:shirts[(round+Number(match[3])*2+1)%shirts.length]}};
}
export function portraitSeed(person){let seed=2166136261;for(const c of appearanceFor(person).key)seed=Math.imul(seed^c.charCodeAt(0),16777619);return seed>>>0;}
const color=(hex,n=0)=>{const i=parseInt(hex.slice(1),16);return `rgb(${[i>>16,(i>>8)&255,i&255].map(v=>Math.max(0,Math.min(255,v+n))).join(',')})`;};
export class CharacterModel{
 constructor(ctx){this.ctx=ctx;}
 draw(person,a,origin,tileWidth,part='all'){
  const c=this.ctx,u=tileWidth*characterScale(person),look=appearanceFor(person).look,pose=skeleton(a,person),commands=[],co=Math.cos(a.yaw),si=Math.sin(a.yaw);
  const project=v=>{const x=v[0]*co+v[1]*si,y=-v[0]*si+v[1]*co;return {x:origin.x+(x-y)*u*.5,y:origin.y+(x+y)*u*.255-v[2]*u,depth:(x+y)*.66+v[2]*.34};};
  const sphere=(point,rx,ry,rz,fill,detail=0)=>{
   const p=project(point),width=Math.sqrt((rx*(co+si))**2+(ry*(si-co))**2)*u*.5,height=Math.sqrt((rx*(co-si)*.255)**2+(ry*(si+co)*.255)**2+rz*rz)*u;
   commands.push({depth:p.depth+detail,draw:()=>{const gradient=c.createRadialGradient(p.x-width*.32,p.y-height*.43,0,p.x,p.y,Math.max(width,height)*1.12);gradient.addColorStop(0,color(fill,38));gradient.addColorStop(.48,color(fill,7));gradient.addColorStop(.82,fill);gradient.addColorStop(1,color(fill,-35));c.fillStyle=gradient;c.beginPath();c.ellipse(p.x,p.y,width,height,0,0,Math.PI*2);c.fill();}});
  };
  const bone=(from,to,radius,fill)=>{const p=project(from),q=project(to),dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,width=radius*u*.72;
   commands.push({depth:(p.depth+q.depth)/2,draw:()=>{const gradient=c.createLinearGradient(p.x-dy/length*width,p.y+dx/length*width,p.x+dy/length*width,p.y-dx/length*width);gradient.addColorStop(0,color(fill,-24));gradient.addColorStop(.45,color(fill,18));gradient.addColorStop(1,fill);c.strokeStyle=gradient;c.lineWidth=width*2;c.lineCap='round';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}});
  };
  const line=(points,fill,width,depthOffset=.001)=>{const pts=points.map(project);commands.push({depth:pts.reduce((s,p)=>s+p.depth,0)/pts.length+depthOffset,draw:()=>{c.strokeStyle=fill;c.lineWidth=width*u;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}});};
  const curve=(points,fill,width=.01,depthOffset=.012)=>{const pts=points.map(project);commands.push({depth:pts.reduce((sum,p)=>sum+p.depth,0)/pts.length+depthOffset,draw:()=>{c.beginPath();c.moveTo(pts[0].x,pts[0].y);c.bezierCurveTo(pts[1].x,pts[1].y,pts[2].x,pts[2].y,pts[3].x,pts[3].y);c.strokeStyle=fill;c.lineWidth=width*u;c.lineCap='round';c.stroke();}});};
  const panel=(points,fill)=>{const pts=points.map(project);commands.push({depth:pts.reduce((sum,p)=>sum+p.depth,0)/pts.length+.015,draw:()=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();}});};
  const smile=(hy,hz)=>{
   const points=[[-.070,hy+.230,hz-.074],[-.035,hy+.245,hz-.105],[.035,hy+.245,hz-.105],[.070,hy+.230,hz-.074]].map(project);
   commands.push({depth:points.reduce((sum,p)=>sum+p.depth,0)/4+.025,draw:()=>{c.beginPath();c.moveTo(points[0].x,points[0].y);c.bezierCurveTo(points[1].x,points[1].y+u*.010,points[2].x,points[2].y+u*.010,points[3].x,points[3].y);c.quadraticCurveTo((points[0].x+points[3].x)/2,(points[0].y+points[3].y)/2+u*.006,points[0].x,points[0].y);c.fillStyle='#723c32';c.fill();c.beginPath();c.moveTo(points[0].x+u*.009,points[0].y+u*.009);c.quadraticCurveTo((points[0].x+points[3].x)/2,(points[0].y+points[3].y)/2+u*.015,points[3].x-u*.009,points[3].y+u*.009);c.strokeStyle='#fff5df';c.lineWidth=u*.010;c.lineCap='round';c.stroke();}});
  };
  if(part==='hands'){
   for(const arm of pose.arms){const fraction=Math.max(0,Math.min(1,(.39-arm.elbow[1])/(arm.hand[1]-arm.elbow[1]||1))),start=arm.elbow.map((v,i)=>v+(arm.hand[i]-v)*fraction);bone(start,arm.hand,.069,look.skin);sphere(arm.hand,.084,.070,.072,look.skin);}
   commands.sort((a,b)=>a.depth-b.depth);for(const command of commands)command.draw();return;
  }
  // Feet retain their ground contact; knees and elbows are articulated joints.
  for(const leg of pose.legs){bone(leg.hip,leg.knee,look.stout?.13:.112,look.pants);bone(leg.knee,[leg.foot[0],leg.foot[1]-.025,leg.foot[2]+.075],.093,look.pants);sphere([leg.foot[0],leg.foot[1]+.075,leg.foot[2]],.107,.155,.049,look.shoes);line([[leg.foot[0]-.06,leg.foot[1]+.08,leg.foot[2]+.026],[leg.foot[0]+.06,leg.foot[1]+.08,leg.foot[2]+.026]],'#fff9e8',.013);}
  sphere(pose.hip,look.stout?.25:.205,.155,.095,look.pants);
  sphere([0,pose.chest[1],pose.hip[2]+.135],look.stout?.295:.245,.17,.205,look.shirt);
  bone([0,0,pose.chest[2]+.02],[0,0,pose.head[2]-.115],.093,look.skin);
  for(const arm of pose.arms){const cuff=arm.shoulder.map((v,i)=>v+(arm.elbow[i]-v)*(look.medical?.68:1));bone(arm.shoulder,cuff,.095,look.sleeve||look.shirt);if(look.medical)bone(cuff,arm.elbow,.075,look.skin);bone(arm.elbow,arm.hand,.069,look.skin);sphere(arm.hand,.084,.070,.072,look.skin);}
  // The face is a volume: hair, ears, nose, eyes and glasses rotate with the head.
  const [hx,hy,hz]=[pose.head[0],pose.head[1],pose.head[2]+.07];
  const headWidth=(look.headWidth||.235)*1.22;
  sphere([hx,hy,hz],headWidth,.235,.213,look.skin);
  sphere([0,hy+.08,hz-.085],headWidth*.78,.17,.127,look.skin,.002);
  for(const side of [-1,1])sphere([side*headWidth*.96,hy-.005,hz-.015],.049,.052,.064,look.skin);
  const visibleFace=(si+co)>.04,blink=((a.time+person.id*.37)%4.8)>.0&&((a.time+person.id*.37)%4.8)<.12;
  if(visibleFace){
   sphere([0,hy+.236,hz-.012],.044,.053,.043,look.skin,.002);
   for(const side of [-1,1]){
    const ex=side*(look.eyeSpacing||.091)*1.17,ey=hy+.211;
    sphere([ex,ey,hz+.026],.057,.032,blink?.008:.059,'#fdf8e9',.003);
    sphere([ex+.006,ey+.026,hz+.024],.034,.022,blink?.004:.040,look.skin==='#bd8056'?'#776334':'#865735',.004);
    sphere([ex+.007,ey+.042,hz+.024],.018,.012,blink?.003:.029,'#282b24',.005);
    if(!blink)sphere([ex-.009,ey+.052,hz+.042],.012,.008,.014,'#ffffff',.005);
    line([[ex-.051,ey-.005,hz+.103],[ex,ey+.010,hz+.12],[ex+.044,ey-.004,hz+.106]],look.hair,.018);
    if(look.glasses){const lens=[];for(let i=0;i<=18;i++){const q=i/18*Math.PI*2;lens.push([ex+Math.cos(q)*.080,hy+.248,hz+.026+Math.sin(q)*.074]);}line(lens,'#4a5349',.014,.01);}
    sphere([side*.17,hy+.196,hz-.071],.050,.018,.025,'#d89279',.006);if(look.freckles)for(let i=0;i<3;i++)sphere([side*(.11+i*.02),hy+.223-i*.006,hz-.04+(i%2)*.02],.007,.006,.007,'#a76e47',.008);
   }
   if(look.glasses)line([[-.025,hy+.253,hz+.035],[.025,hy+.253,hz+.035]],'#4a5349',.014,.01);
   smile(hy,hz);
   if(look.earring)for(const side of [-1,1])sphere([side*headWidth,hy+.018,hz-.07],.025,.02,.032,'#e4bd57',.015);
   if(look.moustache){sphere([-.032,hy+.244,hz-.061],.052,.02,.022,look.hair,.014);sphere([.032,hy+.244,hz-.061],.052,.02,.022,look.hair,.014);}
  }
  if(look.style==='bald'){
   for(const side of [-1,1])sphere([side*headWidth*.93,hy-.045,hz+.022],.058,.115,.13,look.hair);
  }else{
   sphere([0,hy-.11,hz+.015],.266,.145,.181,look.hair);
   sphere([0,hy-.035,hz+.125],.287,.235,.132,look.hair);
   if(['bob','ponytail'].includes(look.style)){sphere([0,hy-.115,hz-.005],.265,.145,.198,look.hair);for(const side of [-1,1])sphere([side*.235,hy-.025,hz-.025],.078,.145,.179,look.hair);}
   if(['curls','bun'].includes(look.style)){const count=tileWidth<26?8:16;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2;sphere([Math.cos(angle)*.225,hy+Math.sin(angle)*.18,hz+.15+(i%3)*.025],.071,.066,.065,look.hair);}for(let i=0;i<3;i++)sphere([(i-1)*.102,hy-.01,hz+.23],.087,.09,.072,look.hair);}
   if(look.style==='bun')sphere([.035,hy-.19,hz+.24],.123,.132,.114,look.hair);
   if(look.style==='ponytail')sphere([0,hy-.28,hz+.10],.13,.16,.175,look.hair);
   if(['sweep','bob'].includes(look.style))sphere([-.075,hy+.135,hz+.137],.176,.116,.11,look.hair);
   if(look.style==='tuft')for(let i=0;i<4;i++)sphere([(i-1.5)*.065,hy+.01,hz+.218+Math.sin(i)*.025],.055,.065,.076,look.hair);
  }
  // Uniform details sit on the front surface, so they disappear from back views.
  if(visibleFace){
   const z=pose.chest[2],waist=pose.hip[2];
   panel([[-.11,.175,z+.07],[0,.20,z+.032],[.11,.175,z+.07]],look.skin);
   line([[-.125,.18,z+.075],[0,.203,z+.017],[.125,.18,z+.075]],look.medical?'#f4f0dc':color(look.shirt,-28),.027,.017);
   if(!look.medical){for(const side of [-1,1])panel([[0,.203,z+.04],[side*.09,.19,z+.075],[side*.13,.195,z+.032]],look.sleeve||color(look.shirt,28));line([[0,.179,z+.015],[0,.184,waist+.006]],color(look.shirt,-25),.012,.02);for(let i=0;i<3;i++)sphere([.022,.187,waist+.03+i*.06],.009,.009,.009,'#f3d8a1',.025);}
   for(const side of [-1,1]){const px=side*.13;panel([[px-.052,.178,waist+.135],[px+.052,.178,waist+.135],[px+.045,.174,waist+.046],[px-.045,.174,waist+.046]],color(look.shirt,-9));line([[px-.052,.181,waist+.13],[px+.052,.181,waist+.13]],color(look.shirt,34),.008,.022);}
   if(look.medical){line([[-.085,.195,z+.035],[-.12,.208,z-.09],[0,.225,z-.14],[.12,.208,z-.09],[.085,.195,z+.035]],'#395c61',.019,.018);sphere([0,.23,z-.14],.034,.021,.036,'#d2deda',.024);sphere([0,.249,z-.14],.020,.01,.022,'#6e9698',.025);}
   if(look.tie)line([[0,.144,pose.chest[2]+.03],[.025,.15,pose.hip[2]+.06]],'#edc66a',.05);
   if(person.castId==='rosa')line([[0,.138,pose.chest[2]], [0,.142,pose.hip[2]+.03]],'#efd797',.021);
   panel([[.116,.195,z+.026],[.174,.186,z+.026],[.174,.186,z-.05],[.116,.195,z-.05]],'#f9f3dd');line([[.129,.201,z+.024],[.161,.198,z+.024]],'#708da3',.01,.025);sphere([.143,.202,z-.008],.012,.008,.014,'#72aeb3',.025);
   if(['sweep','bob','ponytail'].includes(look.style))for(let i=0;i<4;i++){const xx=-.19+i*.062;curve([[xx,hy+.115,hz+.235],[xx-.006,hy+.181,hz+.21],[xx+.035,hy+.196,hz+.14],[xx+.09,hy+.137,hz+.087]],color(look.hair,18),.008,.035);}
   if(['curls','bun'].includes(look.style))for(let i=0;i<7;i++){const xx=(i-3)*.063;curve([[xx-.018,hy+.156,hz+.196],[xx-.043,hy+.189,hz+.231],[xx+.035,hy+.183,hz+.25],[xx+.025,hy+.158,hz+.211]],color(look.hair,20),.008,.04);}
  }
  if(person.role==='janitor'&&a.sit<.1){const hand=pose.arms[1].hand,end=[.11,.55+Math.sin(a.time*3)*a.work*.08,.025];bone(hand,end,.019,'#b6976a');sphere(end,.18,.09,.025,'#d3d0b6');}
  if(a.sit>.8&&(person.role!=='receptionist'||person.state==='resting')){
   // An open magazine is a separate prop held by both hands.
   const z=pose.hip[2]+.03;if(person.child){sphere([0,.32,z+.04],.11,.08,.10,'#e6be79');sphere([-.06,.32,z+.12],.04,.035,.04,'#cfa765');sphere([.06,.32,z+.12],.04,.035,.04,'#cfa765');}else line([[-.17,.31,z],[0,.34,z-.025],[.17,.31,z]],'#f9eed2',.052);line([[-.15,.315,z+.008],[-.03,.33,z-.01]],'#7bb5ad',.028);line([[.03,.33,z-.01],[.15,.315,z+.008]],'#dba588',.028);
  }
  commands.sort((a,b)=>a.depth-b.depth);for(const command of commands)command.draw();
  return {height:(hz+(look.style==='bun'?.38:.32))*u,width:.76*u,head:project([hx,hy,hz])};
 }
}
