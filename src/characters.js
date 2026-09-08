import {CHARACTER_SCALE,skeleton} from './animation.js';
// Original cast modeled from the OpenArt cast reference. Live articulated
// geometry supplies complete front, side and back views without slicing a bitmap.
export const LOOKS={
 milo:{skin:'#bd8056',hair:'#332520',shirt:'#289c98',pants:'#267d79',shoes:'#eef4e6',style:'curls',glasses:true,medical:true},
 bea:{skin:'#efb990',hair:'#a64020',shirt:'#83aacf',pants:'#6c93c0',shoes:'#f4eee0',style:'bun',medical:true},
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
 draw(person,a,origin,tileWidth){
  const c=this.ctx,u=tileWidth*CHARACTER_SCALE*(person.child?.73:1),look=appearanceFor(person).look,pose=skeleton(a,person),commands=[],co=Math.cos(a.yaw),si=Math.sin(a.yaw);
  const project=v=>{v=[v[0],v[1],v[2]+(person.child?a.sit*.13:0)];const x=v[0]*co+v[1]*si,y=-v[0]*si+v[1]*co;return {x:origin.x+(x-y)*u*.5,y:origin.y+(x+y)*u*.255-v[2]*u,depth:(x+y)*.66+v[2]*.34};};
  const sphere=(point,rx,ry,rz,fill,detail=0)=>{
   const p=project(point),width=Math.sqrt((rx*(co+si))**2+(ry*(si-co))**2)*u*.5,height=Math.sqrt((rx*(co-si)*.255)**2+(ry*(si+co)*.255)**2+rz*rz)*u;
   commands.push({depth:p.depth+detail,draw:()=>{const gradient=c.createRadialGradient(p.x-width*.32,p.y-height*.43,0,p.x,p.y,Math.max(width,height)*1.12);gradient.addColorStop(0,color(fill,28));gradient.addColorStop(.57,fill);gradient.addColorStop(1,color(fill,-29));c.fillStyle=gradient;c.beginPath();c.ellipse(p.x,p.y,width,height,0,0,Math.PI*2);c.fill();}});
  };
  const bone=(from,to,radius,fill)=>{const p=project(from),q=project(to),dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,width=radius*u*.72;
   commands.push({depth:(p.depth+q.depth)/2,draw:()=>{const gradient=c.createLinearGradient(p.x-dy/length*width,p.y+dx/length*width,p.x+dy/length*width,p.y-dx/length*width);gradient.addColorStop(0,color(fill,-24));gradient.addColorStop(.45,color(fill,18));gradient.addColorStop(1,fill);c.strokeStyle=gradient;c.lineWidth=width*2;c.lineCap='round';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}});
  };
  const line=(points,fill,width,depthOffset=.001)=>{const pts=points.map(project);commands.push({depth:pts.reduce((s,p)=>s+p.depth,0)/pts.length+depthOffset,draw:()=>{c.strokeStyle=fill;c.lineWidth=width*u;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}});};
  // Feet retain their ground contact; knees and elbows are articulated joints.
  for(const leg of pose.legs){bone(leg.hip,leg.knee,.088,look.pants);bone(leg.knee,[leg.foot[0],leg.foot[1]-.025,leg.foot[2]+.075],.068,look.pants);sphere([leg.foot[0],leg.foot[1]+.075,leg.foot[2]],.079,.13,.047,look.shoes);line([[leg.foot[0]-.06,leg.foot[1]+.08,leg.foot[2]+.026],[leg.foot[0]+.06,leg.foot[1]+.08,leg.foot[2]+.026]],'#fff9e8',.013);}
  sphere(pose.hip,look.stout?.20:.165,.135,.095,look.pants);
  sphere([0,pose.chest[1],pose.hip[2]+.135],look.stout?.23:.18,.125,.18,look.shirt);
  bone([0,0,pose.chest[2]+.02],[0,0,pose.head[2]-.115],.075,look.skin);
  for(const arm of pose.arms){bone(arm.shoulder,arm.elbow,.067,look.sleeve||look.shirt);bone(arm.elbow,arm.hand,.052,look.skin);sphere(arm.hand,.064,.057,.061,look.skin);}
  // The face is a volume: hair, ears, nose, eyes and glasses rotate with the head.
  const [hx,hy,hz]=pose.head;
  sphere(pose.head,look.headWidth||.235,.20,.192,look.skin);
  for(const side of [-1,1])sphere([side*.226,hy-.005,hz-.015],.038,.040,.059,look.skin);
  const visibleFace=(si+co)>.04,blink=((a.time+person.id*.37)%4.8)>.0&&((a.time+person.id*.37)%4.8)<.12;
  if(visibleFace){
   sphere([0,hy+.194,hz-.018],.038,.048,.041,look.skin,.002);
   for(const side of [-1,1]){
    const ex=side*(look.eyeSpacing||.091),ey=hy+.172;
    sphere([ex,ey,hz+.026],.046,.029,blink?.008:.053,'#fdf8e9',.003);
    sphere([ex,ey+.021,hz+.024],.025,.017,blink?.004:.032,'#31372f',.004);
    if(!blink)sphere([ex-.006,ey+.033,hz+.036],.008,.007,.010,'#ffffff',.005);
    line([[ex-.04,ey-.005,hz+.095],[ex,ey+.010,hz+.102],[ex+.038,ey-.004,hz+.093]],look.hair,.018);
    if(look.glasses){const lens=[];for(let i=0;i<=18;i++){const q=i/18*Math.PI*2;lens.push([ex+Math.cos(q)*.069,hy+.205,hz+.026+Math.sin(q)*.062]);}line(lens,'#4a5349',.014,.01);}
    sphere([side*.135,hy+.150,hz-.065],.039,.018,.018,'#d89279',.006);if(look.freckles)for(let i=0;i<3;i++)sphere([side*(.11+i*.02),hy+.176-i*.006,hz-.04+(i%2)*.02],.007,.006,.007,'#a76e47',.008);
   }
   if(look.glasses)line([[-.025,hy+.208,hz+.035],[.025,hy+.208,hz+.035]],'#4a5349',.014,.01);
   line([[-.052,hy+.178,hz-.083],[0,hy+.200,hz-.098],[.052,hy+.178,hz-.083]],'#9e6453',.014,.012);
   if(look.earring)for(const side of [-1,1])sphere([side*.23,hy+.018,hz-.07],.025,.02,.032,'#e4bd57',.015);
   if(look.moustache){sphere([-.032,hy+.198,hz-.061],.052,.02,.022,look.hair,.014);sphere([.032,hy+.198,hz-.061],.052,.02,.022,look.hair,.014);}
  }
  if(look.style==='bald'){
   for(const side of [-1,1])sphere([side*.207,hy-.045,hz+.022],.049,.1,.12,look.hair);
  }else{
   sphere([0,hy-.11,hz+.015],.216,.12,.169,look.hair);
   sphere([0,hy-.035,hz+.125],.24,.19,.115,look.hair);
   if(['bob','ponytail'].includes(look.style)){sphere([0,hy-.115,hz-.005],.218,.112,.186,look.hair);for(const side of [-1,1])sphere([side*.184,hy-.025,hz-.025],.075,.13,.172,look.hair);}
   if(['curls','bun'].includes(look.style)){const count=tileWidth<26?7:12;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2;sphere([Math.cos(angle)*.18,hy+Math.sin(angle)*.135,hz+.15+(i%3)*.025],.075,.064,.072,look.hair);}for(let i=0;i<3;i++)sphere([(i-1)*.085,hy-.01,hz+.222],.078,.065,.060,look.hair);}
   if(look.style==='bun')sphere([.06,hy-.12,hz+.30],.12,.105,.11,look.hair);
   if(look.style==='ponytail')sphere([0,hy-.245,hz+.12],.1,.14,.16,look.hair);
   if(['sweep','bob'].includes(look.style))sphere([-.075,hy+.095,hz+.13],.145,.086,.095,look.hair);
   if(look.style==='tuft')for(let i=0;i<4;i++)sphere([(i-1.5)*.065,hy+.01,hz+.218+Math.sin(i)*.025],.055,.065,.076,look.hair);
  }
  // Uniform details sit on the front surface, so they disappear from back views.
  if(visibleFace){
   if(look.medical){const z=pose.chest[2];line([[-.07,.104,z+.01],[-.085,.142,z-.08],[0,.15,z-.13],[.085,.142,z-.08],[.07,.104,z+.01]],'#47696c',.018);sphere([0,.155,z-.13],.03,.017,.033,'#d8ddd1',.002);}
   if(look.tie)line([[0,.144,pose.chest[2]+.03],[.025,.15,pose.hip[2]+.06]],'#edc66a',.05);
   if(person.castId==='rosa')line([[0,.138,pose.chest[2]], [0,.142,pose.hip[2]+.03]],'#efd797',.021);
   sphere([.1,.12,pose.chest[2]-.04],.031,.018,.024,'#f9efd7',.004);
  }
  if(person.role==='janitor'&&a.sit<.1){const hand=pose.arms[1].hand,end=[.11,.55+Math.sin(a.time*3)*a.work*.08,.025];bone(hand,end,.019,'#b6976a');sphere(end,.18,.09,.025,'#d3d0b6');}
  if(a.sit>.8&&(person.role!=='receptionist'||person.state==='resting')){
   // An open magazine is a separate prop held by both hands.
   const z=pose.hip[2]+.03;if(person.child){sphere([0,.32,z+.04],.11,.08,.10,'#e6be79');sphere([-.06,.32,z+.12],.04,.035,.04,'#cfa765');sphere([.06,.32,z+.12],.04,.035,.04,'#cfa765');}else line([[-.17,.31,z],[0,.34,z-.025],[.17,.31,z]],'#f9eed2',.052);line([[-.15,.315,z+.008],[-.03,.33,z-.01]],'#7bb5ad',.028);line([[.03,.33,z-.01],[.15,.315,z+.008]],'#dba588',.028);
  }
  commands.sort((a,b)=>a.depth-b.depth);for(const command of commands)command.draw();
  return {height:(pose.head[2]+(look.style==='bun'?.41:.29))*u,width:.56*u,head:project(pose.head)};
 }
}
