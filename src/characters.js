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
const PATIENT_SKIN=['#edbf98','#dca77c','#c28a5f','#a96e4a','#895437','#6d4433','#efc9ac','#b78061'];
const PATIENT_HAIR=['#30251f','#64432d','#9b6036','#ba7c44','#cfad70','#493b33','#783f29'];
const PATIENT_CLOTHES=[
 ['#d87859','#f0bb86','#456b7b'],['#588fa7','#b4d6cc','#314d6e'],['#9270ae','#dcc4dc','#777185'],
 ['#53a392','#d0e4b3','#c49a58'],['#cc9d44','#f1d595','#536d82'],['#b05f76','#e6b6ac','#65506c'],
 ['#728f4f','#c5d595','#856249'],['#518486','#8cc0c0','#555f74'],['#c27742','#e6bc72','#547978'],
 ['#8399bf','#dde1ec','#9b7056'],['#ac7d93','#ead2be','#506575'],['#9d594b','#d9a184','#374b62']
];
const hashKey=value=>{let seed=2166136261;for(const c of String(value))seed=Math.imul(seed^c.charCodeAt(0),16777619);return seed>>>0;};
function patientAppearance(person){
 const variant=Math.abs(Number(person.variant)||0)%3,age=Number.isFinite(person.age)?person.age:null;
 const child=age===null?!!person.child:age<16,group=child?'child':age===null?(variant===2?'senior':'adult'):age>=65?'senior':age>=40?'mature':'adult';
 const key=`patient:${person.id??'variant-'+variant}:${group}:${variant}`,pick=(values,channel)=>values[hashKey(key+':'+channel)%values.length];
 const base=LOOKS[`${child?'child':'patient'}-${variant}`],outfit=pick(PATIENT_CLOTHES,'clothes');
 const styles=child?['curls','bob','ponytail','tuft','sweep','bun']:group==='senior'?['bob','bun','sweep','bald','tuft']:group==='mature'?['curls','bob','ponytail','sweep','bun','bald']:['curls','bob','ponytail','sweep','bun','tuft'];
 const hair=group==='senior'?pick(['#d1cec4','#a7aaa4','#bab4a5','#797b75','#d8d5cc','#665c50'],'hair'):pick(PATIENT_HAIR,'hair');
 return {key,look:{...base,patient:true,skin:pick(PATIENT_SKIN,'skin'),hair,shirt:outfit[0],sleeve:outfit[1],pants:outfit[2],
  shoes:pick(child?['#f1dc98','#e89c75','#8bc2c5','#edead8']:['#ede4ca','#625347','#47666a','#9a7050'],'shoes'),style:pick(styles,'style'),
  glasses:hashKey(key+':glasses')%(group==='senior'?3:child?8:6)===0,freckles:hashKey(key+':freckles')%4===0,
  iris:pick(['#7c5636','#5c786e','#787f46','#6c7895'],'iris'),accent:outfit[1],pattern:pick(['plain','stripe','dots','cardigan'],'pattern')}};
}
export function appearanceFor(person){
 const id=person.applicantId??(typeof person.id==='string'?person.id:''),match=/^(\d+)-(receptionist|doctor|nurse|surgeon|janitor)-([0-2])$/.exec(id);
 if(!match){
  const key=person.castId||`${person.child?'child':'patient'}-${person.variant||0}`;
  // Recruitment and legacy employee identities must never acquire patient variation.
  if(person.role||person.applicantId||person.castId&&!/^(patient|child)-/.test(person.castId))return {key,look:LOOKS[key]||LOOKS.milo};
  return patientAppearance(person);
 }
 const round=Number(match[1]),base=STAFF_LOOKS[match[2]][Number(match[3])];if(!round)return {key:id,look:base};
 const shirts=['#bd8675','#79a6ad','#ab97bd','#8aaa82','#cead65'],hair=['#4b342a','#aa6038','#706454','#c1beb0'];
 return {key:id,look:{...base,hair:hair[(round+Number(match[3]))%hair.length],shirt:shirts[(round+Number(match[3])*2)%shirts.length],sleeve:base.medical?base.sleeve:shirts[(round+Number(match[3])*2+1)%shirts.length]}};
}
export function portraitSeed(person){let seed=2166136261;for(const c of appearanceFor(person).key)seed=Math.imul(seed^c.charCodeAt(0),16777619);return seed>>>0;}
// The same small palette supplies hundreds of gradient stops every frame.
// Cache their CSS strings, never poses or rasterized animation frames.
const RGB_COLORS=new Map(),HEX_COLORS=new Map();
const color=(hex,n=0)=>{
 let shades=RGB_COLORS.get(hex);if(!shades){shades=new Map();RGB_COLORS.set(hex,shades);}
 let value=shades.get(n);if(value===undefined){const i=parseInt(hex.slice(1),16);value=`rgb(${[i>>16,(i>>8)&255,i&255].map(v=>Math.max(0,Math.min(255,v+n))).join(',')})`;shades.set(n,value);}return value;
};
const colorHex=(hex,n)=>{
 let shades=HEX_COLORS.get(hex);if(!shades){shades=new Map();HEX_COLORS.set(hex,shades);}
 let value=shades.get(n);if(value===undefined){value='#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');shades.set(n,value);}return value;
};
const pointOrder=(a,b)=>a.x-b.x||a.y-b.y;
const CIRCLES=[10,20].map(count=>Array.from({length:count},(_,i)=>[Math.cos(i*Math.PI*2/count),Math.sin(i*Math.PI*2/count)]));
export class CharacterModel{
 constructor(ctx){this.ctx=ctx;}
 draw(person,a,origin,tileWidth,part='all'){
  const c=this.ctx,u=tileWidth*characterScale(person),look=appearanceFor(person).look,pose=skeleton(a,person),commands=[],co=Math.cos(a.yaw),si=Math.sin(a.yaw);
  const bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
  const include=(x,y,rx=0,ry=rx)=>{bounds.left=Math.min(bounds.left,x-rx-1);bounds.right=Math.max(bounds.right,x+rx+1);bounds.top=Math.min(bounds.top,y-ry-1);bounds.bottom=Math.max(bounds.bottom,y+ry+1);};
  const project=v=>{const x=v[0]*co+v[1]*si,y=-v[0]*si+v[1]*co;return {x:origin.x+(x-y)*u*.5,y:origin.y+(x+y)*u*.255-v[2]*u,depth:(x+y)*.66+v[2]*.34};};
  const sphere=(point,rx,ry,rz,fill,detail=0)=>{
   const p=project(point),width=Math.sqrt((rx*(co+si))**2+(ry*(si-co))**2)*u*.5,height=Math.sqrt((rx*(co-si)*.255)**2+(ry*(si+co)*.255)**2+rz*rz)*u;
   include(p.x,p.y,width,height);
   commands.push({depth:p.depth+detail,draw:()=>{const gradient=c.createRadialGradient(p.x-width*.32,p.y-height*.43,0,p.x,p.y,Math.max(width,height)*1.12);gradient.addColorStop(0,color(fill,38));gradient.addColorStop(.48,color(fill,7));gradient.addColorStop(.82,fill);gradient.addColorStop(1,color(fill,-35));c.fillStyle=gradient;c.beginPath();c.ellipse(p.x,p.y,width,height,0,0,Math.PI*2);c.fill();}});
  };
  const bone=(from,to,radius,fill)=>{const p=project(from),q=project(to),dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,width=radius*u*.72;
   include(p.x,p.y,width);include(q.x,q.y,width);
   commands.push({depth:(p.depth+q.depth)/2,draw:()=>{const gradient=c.createLinearGradient(p.x-dy/length*width,p.y+dx/length*width,p.x+dy/length*width,p.y-dx/length*width);gradient.addColorStop(0,color(fill,-24));gradient.addColorStop(.45,color(fill,18));gradient.addColorStop(1,fill);c.strokeStyle=gradient;c.lineWidth=width*2;c.lineCap='round';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}});
  };
  const line=(points,fill,width,depthOffset=.001)=>{const pts=points.map(project);for(const p of pts)include(p.x,p.y,width*u/2);commands.push({depth:pts.reduce((s,p)=>s+p.depth,0)/pts.length+depthOffset,draw:()=>{c.strokeStyle=fill;c.lineWidth=width*u;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}});};
  const curve=(points,fill,width=.01,depthOffset=.012)=>{const pts=points.map(project);for(const p of pts)include(p.x,p.y,width*u/2);commands.push({depth:pts.reduce((sum,p)=>sum+p.depth,0)/pts.length+depthOffset,draw:()=>{c.beginPath();c.moveTo(pts[0].x,pts[0].y);c.bezierCurveTo(pts[1].x,pts[1].y,pts[2].x,pts[2].y,pts[3].x,pts[3].y);c.strokeStyle=fill;c.lineWidth=width*u;c.lineCap='round';c.stroke();}});};
  const panel=(points,fill)=>{const pts=points.map(project);for(const p of pts)include(p.x,p.y);commands.push({depth:pts.reduce((sum,p)=>sum+p.depth,0)/pts.length+.015,draw:()=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();}});};
  // Single continuous silhouettes keep cloth and skin from reading as stacked
  // beads. The rig still supplies every foot, knee, elbow, hand and seat anchor.
  const silhouette=(points,fill,depth,matte=1,projected=false)=>{
   const pts=(projected?points:points.map(project)).sort(pointOrder);
   const half=reverse=>{const out=[];for(let i=reverse?pts.length-1:0;reverse?i>=0:i<pts.length;reverse?i--:i++){
    const p=pts[i];while(out.length>1){const a=out[out.length-2],b=out[out.length-1];if((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)>0)break;out.pop();}out.push(p);
   }return out;};
   const lower=half(false),upper=half(true);lower.pop();upper.pop();const hull=lower.concat(upper);
   let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
   for(const p of hull){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);}
   include(left,top);include(right,bottom);
   commands.push({depth,draw:()=>{
    const w=right-left,h=bottom-top,g=c.createRadialGradient(left+w*.29,top+h*.46,0,left+w*.50,top+h*.48,Math.max(w,h)*.61);g.addColorStop(0,color(fill,45*matte));g.addColorStop(.42,color(fill,20*matte));g.addColorStop(.73,fill);g.addColorStop(1,color(fill,-36*matte));
    c.fillStyle=g;c.beginPath();const last=hull.at(-1),first=hull[0];c.moveTo((last.x+first.x)/2,(last.y+first.y)/2);
    hull.forEach((p,i)=>{const q=hull[(i+1)%hull.length];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);});c.closePath();c.fill();
   }});
  };
  const volume=(center,rings,fill,detail=0)=>{
   const points=[],circle=CIRCLES[tileWidth<70?0:1];
   for(const [z,rx,ry,dy=0] of rings){const p=project([center[0],center[1]+dy,center[2]+z]);
    for(const [cs,sn] of circle)points.push({x:p.x+(cs*rx*(co+si)+sn*ry*(si-co))*u*.5,y:p.y+(cs*rx*(co-si)+sn*ry*(si+co))*u*.255});
   }
   silhouette(points,fill,project(center).depth+detail,1,true);
  };
  const ribbon=(points,radii,fill,detail=0)=>{
   const pts=points.map(project),sides=[[],[]];
   pts.forEach((p,i)=>{const before=pts[Math.max(0,i-1)],after=pts[Math.min(pts.length-1,i+1)],dx=after.x-before.x,dy=after.y-before.y,len=Math.hypot(dx,dy)||1;
    for(let side=0;side<2;side++){const r=radii[i]*u*(side?1:-1);sides[side].push({x:p.x-dy/len*r,y:p.y+dx/len*r});}
   });
   let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
   for(const side of sides)for(const p of side){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);}
   include(left,top);include(right,bottom);include(pts[0].x,pts[0].y,radii[0]*u);include(pts.at(-1).x,pts.at(-1).y,radii.at(-1)*u);
   commands.push({depth:pts.reduce((sum,p)=>sum+p.depth,0)/pts.length+detail,draw:()=>{
    const g=c.createLinearGradient(left,top,right,bottom);g.addColorStop(0,color(fill,14));g.addColorStop(.42,color(fill,7));g.addColorStop(1,color(fill,-21));
    c.fillStyle=g;c.beginPath();c.moveTo(sides[0][0].x,sides[0][0].y);
    const edge=(side,reverse=false)=>{for(let i=1;i<side.length-1;i++){const index=reverse?side.length-1-i:i,p=side[index],q=side[index+(reverse?-1:1)];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}const end=side[reverse?0:side.length-1];c.lineTo(end.x,end.y);};
    const cap=(p,q,r,end)=>{const dx=p.x-q.x,dy=p.y-q.y,len=Math.hypot(dx,dy)||1;c.quadraticCurveTo(p.x+dx/len*r*u,p.y+dy/len*r*u,end.x,end.y);};
    edge(sides[0]);cap(pts.at(-1),pts.at(-2),radii.at(-1),sides[1].at(-1));edge(sides[1],true);cap(pts[0],pts[1],radii[0],sides[0][0]);c.closePath();c.fill();
   }});
  };
  const hand=(arm,start=arm.elbow)=>{
   ribbon([start,arm.hand],[.048,.041],look.skin);
   volume(arm.hand,[[-.061,.042,.040],[-.036,.064,.050],[.023,.065,.057],[.058,.033,.036]],look.skin,.004);
   // Thumb joins the palm rather than forming another separate round joint.
   const thumb=[arm.hand[0]-arm.side*.043,arm.hand[1]+.022,arm.hand[2]+.007];
   ribbon([[thumb[0],thumb[1],thumb[2]+.035],thumb,[thumb[0]-arm.side*.016,thumb[1]+.018,thumb[2]-.01]],[.024,.025,.013],look.skin,.009);
   curve([[arm.hand[0]-.022,arm.hand[1]+.051,arm.hand[2]-.010],[arm.hand[0]-.010,arm.hand[1]+.057,arm.hand[2]-.022],[arm.hand[0]+.012,arm.hand[1]+.057,arm.hand[2]-.023],[arm.hand[0]+.023,arm.hand[1]+.052,arm.hand[2]-.014]],color(look.skin,-19),.005,.02);
  };
  if(part==='hands'){
   for(const arm of pose.arms){const fraction=Math.max(0,Math.min(1,(.52-arm.elbow[1])/(arm.hand[1]-arm.elbow[1]||1))),start=arm.elbow.map((v,i)=>v+(arm.hand[i]-v)*fraction);hand(arm,start);}
   commands.sort((a,b)=>a.depth-b.depth);for(const command of commands)command.draw();return;
  }
  // Seamless trousers follow the articulated leg as one tapered cloth shape.
  for(const leg of pose.legs){
   const ankle=[leg.foot[0],leg.foot[1]-.014,leg.foot[2]+.074],mid=leg.knee.map((v,i)=>(v+ankle[i])/2);
   ribbon([leg.hip,leg.knee,mid,ankle],[look.stout?.091:.079,.077,.068,.065],look.pants);
   volume([leg.foot[0],leg.foot[1]+.064,leg.foot[2]],[[-.047,.079,.124],[-.029,.108,.160],[.023,.098,.151],[.061,.062,.090,-.022]],look.shoes,.01);
   curve([[leg.foot[0]-.088,leg.foot[1]+.104,leg.foot[2]-.018],[leg.foot[0]-.085,leg.foot[1]+.226,leg.foot[2]-.018],[leg.foot[0]+.081,leg.foot[1]+.226,leg.foot[2]-.018],[leg.foot[0]+.095,leg.foot[1]+.094,leg.foot[2]-.018]],color(look.shoes,-29),.009,.018);
   for(let i=0;i<2;i++)line([[leg.foot[0]-.041,leg.foot[1]+.092+i*.037,leg.foot[2]+.046],[leg.foot[0]+.040,leg.foot[1]+.084+i*.037,leg.foot[2]+.046]],'#f6f0df',.010,.025);
  }
  // The pelvis retains exactly the rig's .095 radius at the seat contact.
  volume(pose.hip,[[-.095,.105,.075],[-.068,look.stout?.24:.20,.14],[.025,look.stout?.25:.205,.155],[.09,.17,.12]],look.pants);
  const torsoWidth=look.stout?.29:.24;
  volume([0,pose.chest[1],pose.hip[2]+.14],[[-.16,torsoWidth*.83,.135],[-.12,torsoWidth,.161],[.01,torsoWidth,.176],[.09,torsoWidth*.91,.146],[.15,.105,.092]],look.shirt);
  ribbon([[0,pose.chest[1],pose.chest[2]+.025],[0,pose.head[1],pose.head[2]-.105]],[.061,.067],look.skin,-.002);
  for(const arm of pose.arms){
   const cuff=arm.shoulder.map((v,i)=>v+(arm.elbow[i]-v)*(look.medical?.64:.96));
   ribbon([arm.shoulder,cuff],[.081,look.medical?.068:.055],look.sleeve||look.shirt,.006);
   if(look.medical)ribbon([cuff,arm.elbow,arm.hand],[.051,.050,.039],look.skin);
   hand(arm);
   const seam=cuff.map((v,i)=>v+(arm.shoulder[i]-v)*.04);
   line([[seam[0]-.027,seam[1]+.04,seam[2]],[seam[0]+.026,seam[1]+.04,seam[2]]],color(look.sleeve||look.shirt,24),.008,.015);
  }
  // A single sculpted cheek/chin silhouette replaces the old overlapping balls.
  const [hx,hy,hz]=[pose.head[0],pose.head[1],pose.head[2]+.07],headWidth=(look.headWidth||.235)*1.22;
  volume([hx,hy,hz],[[-.214,.087,.10,.035],[-.178,headWidth*.66,.170,.025],[-.100,headWidth*.93,.219,.016],[.010,headWidth,.235],[.115,headWidth*.93,.207],[.198,headWidth*.66,.151],[.217,.08,.058]],look.skin);
  const front=si+co,sideView=co-si,visibleFace=front>.02;
  for(const side of [-1,1]){
   const ear=[side*headWidth*.96,hy-.002,hz-.038];
   volume(ear,[[-.052,.020,.031],[0,.045,.052],[.046,.028,.032]],look.skin);
   if(side*sideView>-.2)curve([[ear[0]+side*.016,ear[1]+.038,ear[2]-.025],[ear[0]-side*.018,ear[1]+.055,ear[2]-.012],[ear[0]-side*.012,ear[1]+.051,ear[2]+.024],[ear[0]+side*.019,ear[1]+.030,ear[2]+.025]],color(look.skin,-27),.009,.009);
  }
  const blinkPhase=(a.time+(portraitSeed(person)%100)*.037)%4.8,blink=!a.portrait&&blinkPhase>0&&blinkPhase<.10;
  for(const side of [-1,1]){
   const ex=side*(look.eyeSpacing||.091)*1.17,ey=hy+.227-(ex/headWidth)**2*.058;
   if(front*.86+side*sideView*.46<.12)continue;
   const p=project([ex,ey,hz+.023]),px=project([ex+1,ey-ex*.8,hz+.023]);
   include(p.x,p.y,u*.085,u*.098);
   commands.push({depth:p.depth+.02,draw:()=>{
    c.save();c.transform(px.x-p.x,px.y-p.y,0,u,p.x,p.y);
    const eyePath=()=>{c.beginPath();c.moveTo(-.060,.002);c.bezierCurveTo(-.044,-.066,.036,-.067,.060,.001);c.bezierCurveTo(.038,.047,-.034,.050,-.060,.002);c.closePath();};
    if(!blink){eyePath();c.fillStyle='#f7efdf';c.fill();c.save();c.clip();
     const iris=c.createLinearGradient(0,-.028,0,.033);iris.addColorStop(0,color(look.iris||'#775238',-18));iris.addColorStop(1,color(look.iris||'#775238',20));
     c.fillStyle=iris;c.beginPath();c.ellipse(.004,-.005,.032,.045,0,0,Math.PI*2);c.fill();c.fillStyle='#262c28';c.beginPath();c.ellipse(.006,-.009,.020,.034,0,0,Math.PI*2);c.fill();
     c.fillStyle='#fffaf0';c.beginPath();c.ellipse(-.004,-.016,.008,.010,0,0,Math.PI*2);c.fill();c.restore();
    }
    c.beginPath();c.moveTo(-.060,.002);c.bezierCurveTo(-.044,blink?.008:-.066,.036,blink?.008:-.067,.060,.001);c.strokeStyle=color(look.hair,-9);c.lineWidth=.007;c.lineCap='round';c.stroke();
    c.beginPath();c.moveTo(-.044,-.063);c.bezierCurveTo(-.016,-.078,.024,-.076,.047,-.059);c.strokeStyle=look.hair;c.lineWidth=.012;c.stroke();
    if(look.glasses){c.beginPath();c.roundRect(-.070,-.051,.14,.106,.037);c.strokeStyle='#3c514e';c.lineWidth=.010;c.stroke();}
    c.restore();
   }});
   const cheek=project([side*.164,hy+.209,hz-.065]);commands.push({depth:cheek.depth+.018,draw:()=>{c.save();c.globalAlpha=.16;c.fillStyle='#d97862';c.beginPath();c.ellipse(cheek.x,cheek.y,.030*u,.016*u,0,0,Math.PI*2);c.fill();c.restore();}});
   if(look.freckles)for(let i=0;i<3;i++)sphere([side*(.12+i*.02),hy+.23-i*.006,hz-.040+(i%2)*.013],.004,.004,.004,colorHex(look.skin,-35),.020);
  }
  // Profile views retain their nose and one eye instead of losing the face at
  // one yaw threshold. Surface-facing tests hide only the far-side features.
  if(front>-.42){
   volume([0,hy+.232,hz-.026],[[-.025,.026,.020],[0,.042,.051],[.030,.024,.029]],look.skin,.021);
   const mouth=[[-.072,hy+.221,hz-.081],[-.032,hy+.248,hz-.101],[.040,hy+.242,hz-.10],[.078,hy+.216,hz-.074]].map(project);
   commands.push({depth:mouth.reduce((sum,p)=>sum+p.depth,0)/4+.032,draw:()=>{c.beginPath();c.moveTo(mouth[0].x,mouth[0].y);c.bezierCurveTo(mouth[1].x,mouth[1].y,mouth[2].x,mouth[2].y,mouth[3].x,mouth[3].y);c.bezierCurveTo(mouth[2].x,mouth[2].y+u*.019,mouth[1].x,mouth[1].y+u*.019,mouth[0].x,mouth[0].y);c.fillStyle='#794436';c.fill();}});
   if(front>.22)curve([[-.052,hy+.237,hz-.088],[-.020,hy+.250,hz-.102],[.030,hy+.245,hz-.101],[.061,hy+.229,hz-.082]],'#f6e9d3',.014,.034);
   if(look.glasses)line([[-.038,hy+.246,hz+.020],[0,hy+.255,hz+.027],[.038,hy+.246,hz+.020]],'#3c514e',.010,.026);
   if(look.moustache)for(const side of [-1,1])ribbon([[0,hy+.263,hz-.068],[side*.037,hy+.260,hz-.077],[side*.070,hy+.240,hz-.064]],[.013,.020,.006],look.hair,.033);
   if(look.earring)for(const side of [-1,1])sphere([side*headWidth,hy+.025,hz-.092],.018,.015,.024,'#dfb55a',.020);
  }
  // Hair is a continuous fitted cap, with swept tapered locks and sculpted
  // ridges. The back and profile share the same volume as the front hairline.
  const hairPoints=[],longHair=look.style==='bob',short=look.style==='bald';
  if(!short){
   const segments=tileWidth<70?14:28;
   for(let i=0;i<segments;i++){
    const angle=i*Math.PI*2/segments,sn=Math.sin(angle),cs=Math.cos(angle),lower=sn>0?.098+cs*.022+Math.sin(angle*3)*.010:longHair?-.159:-.084;
    hairPoints.push([cs*headWidth*1.025,hy+sn*.228-.023,hz+lower]);
    hairPoints.push([cs*headWidth*.99,hy+sn*.218-.035,hz+.164]);
    hairPoints.push([cs*headWidth*.71,hy+sn*.157-.038,hz+.245]);
    hairPoints.push([cs*.065,hy+sn*.048-.038,hz+.271]);
   }
   const headDepth=project([0,hy,hz]).depth,hairDepth=headDepth+.095;
   silhouette(hairPoints,look.hair,headDepth-.012,.85);
   // Only the camera-facing sectors of the back shell cover the skull. A
   // single rear silhouette would either mask the face or expose a bald back.
   for(let i=segments/2;i<segments;i++){
    const angle=(i+.5)*Math.PI*2/segments,facing=Math.cos(angle)*sideView+Math.sin(angle)*front;
    if(facing<=.025)continue;
    const sector=[];for(const index of [i-1,i,i+1]){const wrapped=(index+segments)%segments;sector.push(...hairPoints.slice(wrapped*4,wrapped*4+4));}
    silhouette(sector,look.hair,headDepth+.033+facing*.030,.85);
   }
   silhouette(hairPoints.filter(point=>point[2]>=hz+.075),look.hair,hairDepth,.85);
   const lock=(points,width,shade=0,frontLock=true)=>{
    const samples=[],steps=tileWidth<70?4:10;for(let i=0;i<=steps;i++){const t=i/steps,s=1-t;samples.push(points[0].map((v,j)=>s*s*s*v+3*s*s*t*points[1][j]+3*s*t*t*points[2][j]+t*t*t*points[3][j]));}
    ribbon(samples,samples.map((_,i)=>width*(.28+.72*Math.sin((i/steps)*Math.PI)**.55)),colorHex(look.hair,shade),.023);if(frontLock)commands.at(-1).depth=hairDepth+.018;
    if(tileWidth>=55){curve(points,color(look.hair,shade+13),.004,.034);if(frontLock)commands.at(-1).depth=hairDepth+.020;}
   };
   if(['sweep','bob','ponytail','tuft'].includes(look.style)){
    for(let i=0;i<5;i++){
     const x=-.22+i*.086;
     lock([[x+.07,hy-.06,hz+.249],[x+.11,hy+.09,hz+.28],[x+.04,hy+.242,hz+.208],[x-.048,hy+.22,hz+.094+(i%2)*.014]],.022+(4-i)*.004,i%2?1:-5);
    }
   }else{
    const count=tileWidth<70?10:18;
    for(let i=0;i<count;i++){
     const angle=i/(count/2)*Math.PI*2,layer=i<count/2?0:1,x=Math.cos(angle)*(.205-layer*.067),y=hy+Math.sin(angle)*(.168-layer*.06),z=hz+.158+layer*.075;
     lock([[x+.027,y+.005,z-.020],[x-.045,y+.024,z-.038],[x-.040,y+.053,z+.048],[x+.026,y+.020,z+.031]],.025,i%3*3-3);
    }
   }
   if(longHair)for(const side of [-1,1])for(let i=0;i<3;i++){
    const yy=hy-.1+i*.066;
    lock([[side*.21,yy-.027,hz+.19],[side*.30,yy+.011,hz+.088],[side*.29,yy+.014,hz-.137],[side*.215,yy+.022,hz-.155]],.036,i*2-5,false);
   }
   if(look.style==='bun'||look.style==='ponytail'){
    const tail=[.015,hy-.215,hz+(look.style==='bun'?.205:.06)];
    volume(tail,look.style==='bun'?[[-.065,.068,.064],[0,.108,.099],[.095,.091,.076],[.129,.02,.025]]:[[-.17,.037,.047],[-.09,.087,.086],[.06,.105,.12],[.137,.044,.056]],look.hair,-.012);
    for(let i=0;i<4;i++)curve([[tail[0]-.055+i*.03,tail[1]+.066,tail[2]+.087],[tail[0]-.11+i*.028,tail[1]+.10,tail[2]+.025],[tail[0]-.08+i*.03,tail[1]+.102,tail[2]-.06],[tail[0]-.025+i*.02,tail[1]+.057,tail[2]-.10]],color(look.hair,17),.008,.029);
   }
   // Back strands follow the skull instead of exposing a second hair shell.
   for(let i=0;i<7;i++){const theta=Math.PI+ i*Math.PI/6,x=Math.cos(theta),y=Math.sin(theta);curve([[x*.12,hy+y*.09-.03,hz+.23],[x*.21,hy+y*.17-.035,hz+.16],[x*headWidth,hy+y*.223-.03,hz+.035],[x*headWidth*.97,hy+y*.225-.03,hz+(longHair?-.13:-.065)]],color(look.hair,11),.006,.019);}
  }else for(const side of [-1,1]){
   volume([side*headWidth*.9,hy-.073,hz-.002],[[-.107,.033,.045],[.002,.057,.106],[.123,.022,.068]],look.hair,.005);
   for(let i=0;i<3;i++)curve([[side*headWidth*.83,hy-.08+i*.026,hz+.105],[side*headWidth,hy-.07+i*.026,hz+.067],[side*headWidth,hy-.072+i*.026,hz-.024],[side*headWidth*.91,hy-.09+i*.026,hz-.075]],color(look.hair,16),.006,.022);
  }
  // Uniform details sit on the front surface, so they disappear from back views.
  if(visibleFace){
   const z=pose.chest[2],waist=pose.hip[2];
   panel([[-.11,.175,z+.07],[0,.20,z+.032],[.11,.175,z+.07]],look.skin);
   line([[-.125,.18,z+.075],[0,.203,z+.017],[.125,.18,z+.075]],look.medical?'#f4f0dc':color(look.shirt,-28),.027,.017);
   if(!look.medical){for(const side of [-1,1])panel([[0,.203,z+.04],[side*.09,.19,z+.075],[side*.13,.195,z+.032]],look.sleeve||color(look.shirt,28));line([[0,.179,z+.015],[0,.184,waist+.006]],color(look.shirt,-25),.012,.02);for(let i=0;i<3;i++)sphere([.022,.187,waist+.03+i*.06],.009,.009,.009,'#f3d8a1',.025);}
   for(const side of [-1,1]){const px=side*.13;panel([[px-.052,.178,waist+.135],[px+.052,.178,waist+.135],[px+.045,.174,waist+.046],[px-.045,.174,waist+.046]],color(look.shirt,-9));line([[px-.052,.181,waist+.13],[px+.052,.181,waist+.13]],color(look.shirt,34),.008,.022);}
   // Fabric marks add identity on the existing torso surface; body/pose geometry is unchanged.
   if(look.patient&&look.pattern==='stripe')for(let i=0;i<3;i++)line([[-.16,.187,waist+.07+i*.05],[0,.202,waist+.075+i*.05],[.16,.187,waist+.07+i*.05]],look.accent,.018,.026);
   if(look.patient&&look.pattern==='dots')for(let i=0;i<6;i++){const xx=(i%3-1)*.10,zz=waist+.08+Math.floor(i/3)*.075;line([[xx-.004,.201-Math.abs(xx)*.09,zz],[xx+.004,.201-Math.abs(xx)*.09,zz]],look.accent,.016,.026);}
   if(look.patient&&look.pattern==='cardigan')for(const side of [-1,1])line([[side*.065,.192,z+.022],[side*.04,.206,waist+.14],[side*.04,.191,waist+.015]],look.accent,.024,.026);
   if(look.medical){line([[-.085,.195,z+.035],[-.12,.208,z-.09],[0,.225,z-.14],[.12,.208,z-.09],[.085,.195,z+.035]],'#395c61',.019,.018);sphere([0,.23,z-.14],.034,.021,.036,'#d2deda',.024);sphere([0,.249,z-.14],.020,.01,.022,'#6e9698',.025);}
   if(look.tie)line([[0,.144,pose.chest[2]+.03],[.025,.15,pose.hip[2]+.06]],'#edc66a',.05);
   if(person.castId==='rosa')line([[0,.138,pose.chest[2]], [0,.142,pose.hip[2]+.03]],'#efd797',.021);
   panel([[.116,.195,z+.026],[.174,.186,z+.026],[.174,.186,z-.05],[.116,.195,z-.05]],'#f9f3dd');line([[.129,.201,z+.024],[.161,.198,z+.024]],'#708da3',.01,.025);sphere([.143,.202,z-.008],.012,.008,.014,'#72aeb3',.025);
  }
  if(person.role==='janitor'&&a.sit<.1){const hand=pose.arms[1].hand,end=[.11,.55+Math.sin(a.time*3)*a.work*.08,.025];bone(hand,end,.019,'#b6976a');sphere(end,.18,.09,.025,'#d3d0b6');}
  if(a.sit>.8&&(person.role!=='receptionist'||person.state==='resting')){
   // An open magazine is a separate prop held by both hands.
   const z=pose.hip[2]+.03;if(person.child){sphere([0,.32,z+.04],.11,.08,.10,'#e6be79');sphere([-.06,.32,z+.12],.04,.035,.04,'#cfa765');sphere([.06,.32,z+.12],.04,.035,.04,'#cfa765');}else line([[-.17,.31,z],[0,.34,z-.025],[.17,.31,z]],'#f9eed2',.052);line([[-.15,.315,z+.008],[-.03,.33,z-.01]],'#7bb5ad',.028);line([[.03,.33,z-.01],[.15,.315,z+.008]],'#dba588',.028);
  }
  commands.sort((a,b)=>a.depth-b.depth);for(const command of commands)command.draw();
  return {height:origin.y-bounds.top,width:2*Math.max(origin.x-bounds.left,bounds.right-origin.x),head:project([hx,hy,hz]),bounds};
 }
}
