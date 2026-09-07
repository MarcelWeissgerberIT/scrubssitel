import {ROOMS, CAST, ILLNESSES, LEVELS, PROJECTS, EVENTS} from './content.js';
import {MONTH_SECONDS,YEAR_SECONDS,ANNUAL_TARGET,GUIDE,guideIndex} from './tutorial.js';
export const GRID={w:24,h:18};
export const ENTRY={x:12,y:16};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(x,y)=>`${x},${y}`;
const names=['Alex','Sam','Robin','Jamie','Casey','Lou','Charlie','River','Jules','Taylor','Kim','Morgan','Rene','Ari','Noor','Sasha','Drew','Billie'];
export class Game {
 constructor({level=1,mode='tutorial',seed=Date.now()}={}){
  this.version=2;this.mode=mode;this.level=level;this.rng=seed>>>0||1;this.clock=0;this.day=1;this.cash=50000;
  this.rep=60;this.cured=0;this.failed=0;this.left=0;this.cleanliness=95;this.rooms=[];this.staff=[];this.patients=[];this.logs=[];this.id=0;this.income=0;this.expenses=0;this.construction=0;this.completed=[];this.project=null;this.event=null;this.nextEvent=75;this.arrivalTimer=4;this.won=false;this.over=false;this.ledger=[];
  this.admissionsOpen=false;this.calendar=0;this.year=1;this.month=1;this.yearStart={income:0,expenses:0,construction:0};this.accountOrigin={income:0,expenses:0,construction:0};this.financialYears=[];this.records=[];this.patientSerial=0;this.tutorial={chartRead:false};this.contracts=[];this.financing=0;this.modifiers=[];this.eventsSeen=[];this.curedByRoom={};
 }
 checkTutorial(){if(this.mode==='tutorial'&&!this.won&&guideIndex(this)>=15&&this.financialYears.some(y=>y.profit>=ANNUAL_TARGET)){this.won=true;this.log('completedTutorial');}}
 guide(){return this.mode==='tutorial'&&!this.won?{...GUIDE[guideIndex(this)],index:guideIndex(this)}:null;}
 openClinic(){for(const type of ['reception','gp','pharmacy'])if(!this.rooms.some(r=>r.type===type&&r.staffId))return {error:'openingRequirements'};this.admissionsOpen=true;this.arrivalTimer=1;this.log('clinicOpened');return {};}
 yearlyProfit(){return (this.income-this.yearStart.income)-(this.expenses-this.yearStart.expenses)-(this.construction-this.yearStart.construction);}
 annualReport(){return {year:this.year,income:this.income-this.yearStart.income,expenses:this.expenses-this.yearStart.expenses,construction:this.construction-this.yearStart.construction,profit:this.yearlyProfit()};}
 closeYear(){const report=this.annualReport();this.financialYears.push({...report,closingCash:this.cash});this.checkTutorial();this.yearStart={income:this.income,expenses:this.expenses,construction:this.construction};this.year++;this.log('yearClosed',String(report.profit));}
 treatmentFee(p,r=null){const base=ILLNESSES.find(i=>i.id===p.illness).fee;return Math.round(base*(this.mode==='tutorial'?12:1)*(1+((r?.level||1)-1)*.1));}
 diagnosisFee(){return this.mode==='tutorial'?400:90;}
 record(id){return this.records.find(r=>r.id===id);}
 recordEvent(p,code,r=null,amount=0){const record=this.record(p.id);if(!record)return;record.timeline.push({time:this.clock,year:this.year,month:this.month,code,roomId:r?.id??null,roomType:r?.type??null,staffName:this.staff.find(s=>s.id===r?.staffId)?.name||'',amount});record.status=code;if(code==='diagnosed')record.diagnosed=true;if(amount>0){record.bill+=amount;if(code==='diagnosed')record.diagnosisCharge+=amount;else record.treatmentCharge+=amount;}}
 readChart(id){if(this.record(id)){this.tutorial.chartRead=true;this.checkTutorial();}}
 random(){this.rng=(Math.imul(1664525,this.rng)+1013904223)>>>0;return this.rng/4294967296;}
 log(code,extra=''){this.logs.unshift({id:++this.id,time:this.clock,code,extra});this.logs=this.logs.slice(0,12);}
 available(type){return !['therapy','surgery'].includes(type)||this.mode==='sandbox'||this.level>=(type==='therapy'?2:3);}
 door(r){return {x:r.x+Math.floor(r.w/2),y:r.y<8?r.y+r.h:r.y-1};}
 occupied(x,y,rooms=this.rooms){return rooms.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);}
 path(from,to,rooms=this.rooms){
  const start={x:clamp(Math.round(from.x),0,23),y:clamp(Math.round(from.y),0,17)},dest={x:Math.round(to.x),y:Math.round(to.y)};
  const q=[start],prev=new Map([[key(start.x,start.y),null]]);let n=0;
  while(n<q.length){const p=q[n++];if(p.x===dest.x&&p.y===dest.y){const out=[];let c=p;while(c){out.unshift(c);c=prev.get(key(c.x,c.y));}return out.slice(1);}
   for(const [dx,dy] of [[0,-1],[1,0],[-1,0],[0,1]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(x<0||x>=24||y<0||y>=18||this.occupied(x,y,rooms)||prev.has(k))continue;prev.set(k,p);q.push({x,y});}
  }return null;
 }
 placement(type,rect){
  const {x,y,w,h}=rect;if(!ROOMS[type]||!this.available(type))return 'invalidRoom';
  if(![x,y,w,h].every(Number.isInteger)||w<3||h<3)return 'smallRoom';
  if(x<1||y<1||x+w>23||y+h>17||w>10||h>8)return 'invalidRoom';
  if(ENTRY.x>=x&&ENTRY.x<x+w&&ENTRY.y>=y&&ENTRY.y<y+h)return 'badPlacement';
  for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)if(this.occupied(i,j))return 'invalidRoom';
  // Keep people standing in corridors out of the construction footprint.
  if(this.patients.some(p=>p.state!=='service'&&p.state!=='inside'&&p.x>=x-.4&&p.x<x+w-.4&&p.y>=y-.4&&p.y<y+h-.4))return 'invalidRoom';
  const all=[...this.rooms,rect];for(const r of all)if(this.path(ENTRY,this.door(r),all)===null)return 'badPlacement';
  if(this.cash<ROOMS[type].cost)return 'notEnough';return null;
 }
 addRoom(type,rect,free=false){const error=free?null:this.placement(type,rect);if(error)return {error};const r={id:++this.id,type,...rect,level:1,condition:100,staffId:null,patientId:null,progress:0};this.rooms.push(r);if(!free){this.cash-=ROOMS[type].cost;this.construction+=ROOMS[type].cost;this.log('built',type);}this.assignStaff();this.repath();this.rebalance(type);this.checkTutorial();return {room:r};}
 rebalance(type){const affected=this.patients.filter(p=>['queue','travel'].includes(p.state)&&this.need(p)===type);for(const p of affected){p.state='waiting';p.targetRoom=null;p.path=[];}for(const p of affected)this.routePatient(p);}
 repath(){for(const p of this.patients){if(p.state==='travel'&&p.targetRoom){const r=this.room(p.targetRoom);if(r)p.path=this.path(p,this.door(r))||[];}if(p.state==='exit')p.path=this.path(p,ENTRY)||[];}}
 room(id){return this.rooms.find(r=>r.id===id);}
 hire(castId,free=false){const base=CAST.find(s=>s.id===castId);if(!base)return {error:'invalidRoom'};if(!free&&this.cash<base.hire)return {error:'notEnough'};const count=this.staff.filter(s=>s.castId===castId).length;const s={...base,id:++this.id,castId,name:base.name+(count?' '+(count+1):''),fatigue:0,resting:false,roomId:null};this.staff.push(s);if(!free){this.cash-=base.hire;this.construction+=base.hire;this.log('hireDone',s.name);}this.assignStaff();for(const type of Object.keys(ROOMS))this.rebalance(type);this.checkTutorial();return {staff:s};}
 dismiss(id){const s=this.staff.find(v=>v.id===id);if(!s)return;const r=this.room(s.roomId);if(r?.patientId)return {error:'removeBusy'};if(r)r.staffId=null;this.staff=this.staff.filter(v=>v.id!==id);this.assignStaff();return {};}
 assignStaff(){
  for(const s of this.staff){if(s.roomId&&!this.room(s.roomId))s.roomId=null;}
  for(const r of this.rooms){if(r.staffId&&!this.staff.some(s=>s.id===r.staffId)){r.staffId=null;}}
  for(const r of this.rooms){if(!ROOMS[r.type].role||r.staffId)continue;const s=this.staff.find(s=>s.role===ROOMS[r.type].role&&!s.roomId&&!s.resting);if(s){r.staffId=s.id;s.roomId=r.id;}}
 }
 upgrade(id){const r=this.room(id);if(!r)return {};if(r.level>=3)return {error:'maxLevel'};const cost=Math.round(ROOMS[r.type].cost*.65*r.level);if(this.cash<cost)return {error:'notEnough'};this.cash-=cost;this.construction+=cost;r.level++;r.condition=100;this.log('upgraded',r.type);this.checkTutorial();return {};}
 sell(id){const r=this.room(id);if(!r)return {};if(r.patientId||this.patients.some(p=>p.targetRoom===id&&['inside','service'].includes(p.state)))return {error:'removeBusy'};const s=this.staff.find(s=>s.id===r.staffId);if(s)s.roomId=null;for(const p of this.patients)if(p.targetRoom===id){p.targetRoom=null;p.path=[];p.state='waiting';}this.cash+=Math.round(ROOMS[r.type].cost*.5);this.construction-=Math.round(ROOMS[r.type].cost*.5);this.rooms=this.rooms.filter(r=>r.id!==id);this.assignStaff();return {};}
 debtRemaining(){return this.contracts.reduce((sum,c)=>sum+c.months*2250,0);}
 storyGoalsMet(){const level=LEVELS[this.level-1];return this.cured>=level.goal&&this.rep>=level.rep&&(!level.specialty||(this.curedByRoom[level.specialty]||0)>=level.specialtyGoal)&&(!level.project||this.completed.includes(level.project));}
 dailyCost(){return this.staff.reduce((a,s)=>a+s.wage,0)+this.rooms.reduce((a,r)=>a+Math.round(ROOMS[r.type].cost*.025*r.level),0);}
 success(r){const s=this.staff.find(s=>s.id===r.staffId);return clamp(.79+(s?.skill||1)*.07+(r.level-1)*.035+(this.completed.includes('care')?.12:0)-(100-this.cleanliness)*.0015-(100-r.condition)*.001, .5,.99);}
 startResearch(id){const p=PROJECTS.find(p=>p.id===id);if(!p||this.project||this.completed.includes(id))return {};if(!this.rooms.some(r=>r.type==='lab'))return {error:'noResearch'};if(this.cash<p.cost)return {error:'notEnough'};this.cash-=p.cost;this.construction+=p.cost;this.project={id,progress:0};return {};}
 resolveEvent(index){if(!this.event)return {};const ev=EVENTS.find(e=>e.id===this.event);const c=ev.choices[index];if(!c)return {};if(c.cost>0&&this.cash<c.cost)return {error:'notEnough'};this.cash-=c.cost;if(c.cost>0)this.expenses+=c.cost;else this.income-=c.cost;
  if(c.effect==='mafiaLoan'){this.cash+=12000;this.financing+=12000;this.contracts.push({months:8});}
  if(c.effect==='paperwork')this.modifiers.push({kind:'paperwork',endsAt:this.clock+60});
  if(c.effect==='inspectionClean'){this.cleanliness=100;this.rep=clamp(this.rep+3,0,100);}
  if(c.effect==='inspectionCheck')this.rep=clamp(this.rep+(this.cleanliness>=85?2:-5),0,100);
  if(c.effect==='beautyRush')for(let i=0;i<5;i++)this.spawnPatient('funny');
  if(c.effect==='energy')this.staff.forEach(s=>s.fatigue=clamp(s.fatigue-35,0,100));if(c.effect==='fatigue')this.staff.forEach(s=>s.fatigue=clamp(s.fatigue+20,0,100));if(c.effect==='rep')this.rep=clamp(this.rep+5,0,100);if(c.effect==='quality')this.rep=clamp(this.rep+(this.cleanliness>75?3:-2),0,100);if(c.effect==='refer')this.rep=clamp(this.rep-3,0,100);if(c.effect==='rush')for(let i=0;i<6;i++)this.spawnPatient('jitters');this.eventsSeen.push(this.event);this.event=null;return {};
 }
 spawnPatient(illnessId){
  if(this.patients.length>=55)return null;
  const max=this.mode==='sandbox'?6:this.mode==='tutorial'?2:this.level*2;
  const illness=illnessId||ILLNESSES[Math.floor(this.random()*max)].id;
  const surname=['Bennett','Keller','Navarro','Wagner','Okafor','Hart','Nguyen','Weber','Moreno','Reed','Baumann','Brooks'][Math.floor(this.random()*12)];
  const name=names[Math.floor(this.random()*names.length)]+' '+surname,age=18+Math.floor(this.random()*68),serial=++this.patientSerial;
  const p={id:++this.id,name,illness,x:ENTRY.x+(this.random()-.5)*.25,y:ENTRY.y,stage:'reception',state:'waiting',patience:100,targetRoom:null,path:[],registered:false,variant:Math.floor(this.random()*3),color:['#d39360','#568f9a','#b887b8'][serial%3],skin:['#eec3a1','#bd865e','#815640'][serial%3],hair:['#3e3836','#81533b','#9fa1a7'][serial%3]};
  this.records.push({id:p.id,number:'CG-'+String(serial).padStart(5,'0'),name,age,birthDate:`${2026+this.year-1-age}-${String(1+Math.floor(this.random()*12)).padStart(2,'0')}-${String(1+Math.floor(this.random()*28)).padStart(2,'0')}`,occupation:Math.floor(this.random()*6),insurance:Math.floor(this.random()*3),allergy:Math.floor(this.random()*4),priority:serial%7===0?'priorityUrgent':'priorityRoutine',illness,variant:p.variant,admittedAt:this.clock,admittedYear:this.year,admittedMonth:this.month,dischargedAt:null,status:'arrived',diagnosed:false,bill:0,diagnosisCharge:0,treatmentCharge:0,outcome:null,timeline:[]});
  this.patients.push(p);this.recordEvent(p,'arrived');return p;
 }

 need(p){return p.stage==='reception'?'reception':p.stage==='diagnosis'?'gp':ILLNESSES.find(i=>i.id===p.illness).room;}
 queue(r){return this.patients.filter(p=>p.targetRoom===r.id&&p.state!=='service'&&p.state!=='exit').length;}
 routePatient(p){const type=this.need(p);const candidates=this.rooms.filter(r=>r.type===type&&r.staffId).map(r=>({r,path:this.path(p,this.door(r))})).filter(v=>v.path!==null).sort((a,b)=>(this.queue(a.r)+(a.r.patientId?1:0))-(this.queue(b.r)+(b.r.patientId?1:0))||a.path.length-b.path.length);if(!candidates.length)return;const {r,path}=candidates[0];p.targetRoom=r.id;p.path=path;p.state='travel';}
 leave(p,abandoned=false){const r=this.room(p.targetRoom);if(r?.patientId===p.id){r.patientId=null;r.progress=0;}if(abandoned){const record=this.record(p.id);if(record)record.outcome='left';this.recordEvent(p,'left');this.left++;this.rep=clamp(this.rep-2,0,100);this.log('left',p.name);}p.stage='exit';p.targetRoom=null;p.state='exit';p.path=this.path(p,ENTRY)||[];}
 move(p,dt){let distance=dt*2.5;while(distance>0&&p.path.length){const t=p.path[0],dx=t.x-p.x,dy=t.y-p.y,len=Math.hypot(dx,dy);if(len<=distance){p.x=t.x;p.y=t.y;p.path.shift();distance-=len;}else{p.x+=dx/len*distance;p.y+=dy/len*distance;distance=0;}}}
 update(dt){if(this.over||this.event||dt<=0||!this.admissionsOpen)return;dt=Math.min(dt,.25);this.clock+=dt;
  this.calendar+=dt;
  const newDay=Math.floor((this.calendar+1e-7)/MONTH_SECONDS)+1;
  if(newDay>this.day){this.day=newDay;let cost=this.dailyCost();this.cash-=cost;this.expenses+=cost;for(const contract of this.contracts){if(contract.months>0){this.cash-=2250;this.financing-=1500;this.expenses+=750;cost+=2250;contract.months--;}}this.contracts=this.contracts.filter(c=>c.months>0);this.ledger.unshift({day:this.month,year:this.year,cost});this.ledger=this.ledger.slice(0,24);this.log('paid',String(cost));if((newDay-1)%12===0)this.closeYear();this.month=(newDay-1)%12+1;}

  const lounge=Math.max(0,...this.rooms.filter(r=>r.type==='lounge').map(r=>r.level)),toilet=Math.max(0,...this.rooms.filter(r=>r.type==='toilet').map(r=>r.level));const janitors=this.staff.filter(s=>s.role==='janitor').length;
  this.cleanliness=clamp(this.cleanliness+dt*(janitors*.24-this.patients.length*.007-.035),0,100);
  for(const s of this.staff){const r=this.room(s.roomId);const busy=!!r?.patientId||(r?.type==='lab'&&this.project);if(s.resting){s.fatigue=clamp(s.fatigue-dt*(lounge?2.3*(1+(lounge-1)*.3):.65),0,100);if(s.fatigue<=28)s.resting=false;}else{s.fatigue=clamp(s.fatigue+dt*(busy?.32:-.15),0,100);if(s.fatigue>=86&&!r?.patientId)s.resting=true;}}
  this.assignStaff();this.modifiers=this.modifiers.filter(m=>m.endsAt>this.clock);
  for(const r of this.rooms){r.condition=clamp(r.condition+dt*(janitors*.1-(r.patientId?.055:.006)),20,100);const s=this.staff.find(s=>s.id===r.staffId);if(!s||s.resting)continue;if(!r.patientId){const p=this.patients.find(p=>p.targetRoom===r.id&&p.state==='queue');if(p){r.patientId=p.id;r.progress=0;p.state='inside';this.recordEvent(p,'serviceStarted',r);p.path=[{x:r.x+r.w*.66-.5,y:r.y+r.h*.65-.5}];}}
   const p=this.patients.find(p=>p.id===r.patientId);if(!p||p.state!=='service')continue;
   const speed=s.skill*(1-s.fatigue*.004)*(1+(r.level-1)*.25)*(this.completed.includes('speed')?1.25:1)*(r.condition/200+.5)*(r.type==='gp'&&this.modifiers.some(m=>m.kind==='paperwork')?1/1.35:1);r.progress+=dt*speed;
   if(r.progress>=ROOMS[r.type].time){const door=this.door(r);p.x=door.x;p.y=door.y;r.patientId=null;r.progress=0;
    if(p.stage==='reception'){p.registered=true;this.recordEvent(p,'registered',r);p.stage='diagnosis';p.state='waiting';p.targetRoom=null;}
    else if(p.stage==='diagnosis'){const fee=this.diagnosisFee();this.cash+=fee;this.income+=fee;this.recordEvent(p,'diagnosed',r,fee);p.stage='treatment';p.state='waiting';p.targetRoom=null;}
    else {const illness=ILLNESSES.find(i=>i.id===p.illness);const supplies=this.mode==='tutorial'?350:35;this.cash-=supplies;this.expenses+=supplies;if(this.random()<this.success(r)){const earned=this.treatmentFee(p,r);this.recordEvent(p,'cured',r,earned);const record=this.record(p.id);if(record)record.outcome='cured';this.cash+=earned;this.income+=earned;this.cured++;this.curedByRoom[r.type]=(this.curedByRoom[r.type]||0)+1;this.rep=clamp(this.rep+.9+(p.patience>70?.25:0),0,100);p.cured=true;this.log('cure',p.name);}else{this.recordEvent(p,'failed',r);const record=this.record(p.id);if(record)record.outcome='failed';this.failed++;this.rep=clamp(this.rep-1,0,100);this.log('failed',p.name);}this.leave(p);}
   }
  }
  for(const p of this.patients){if(p.state==='exit'){this.move(p,dt);continue;}
   p.patience=clamp(p.patience-dt*(p.state==='service'?.015:.28)*(toilet?(.72-(toilet-1)*.1):1)*(this.completed.includes('patience')?.65:1)*(1+(100-this.cleanliness)/100),0,100);
   if(p.patience<=0&&p.state!=='service'&&p.state!=='inside'){this.leave(p,true);continue;}
   if(p.state==='waiting')this.routePatient(p);
   if(p.state==='travel'||p.state==='inside'){this.move(p,dt);if(!p.path.length)p.state=p.state==='inside'?'service':'queue';}
   if(p.state==='queue'&&!this.room(p.targetRoom)?.staffId){p.state='waiting';p.targetRoom=null;}
  }
  for(const p of this.patients)if(p.state==='exit'&&!p.path.length){const record=this.record(p.id);if(record){record.dischargedAt=this.clock;this.recordEvent(p,'discharged');}}
  this.patients=this.patients.filter(p=>!(p.state==='exit'&&!p.path.length));
  if(this.project){const lab=this.rooms.find(r=>r.type==='lab'&&r.staffId&&!this.staff.find(s=>s.id===r.staffId)?.resting);if(lab){this.project.progress+=dt*(1+(lab.level-1)*.3);const project=PROJECTS.find(p=>p.id===this.project.id);if(this.project.progress>=project.time){this.completed.push(project.id);this.project=null;this.log('researchDone',project.id);}}}
  this.arrivalTimer-=dt;if(this.arrivalTimer<=0){this.spawnPatient();this.arrivalTimer=(this.mode==='tutorial'?8:this.mode==='sandbox'?8:LEVELS[this.level-1].arrival)*(.85+this.random()*.3);}
  if(this.clock>=this.nextEvent&&(this.mode!=='tutorial'||guideIndex(this)>=15)){const options=EVENTS.filter(e=>(!e.minLevel||this.mode==='sandbox'||this.level>=e.minLevel)&&!(e.id==='mafia'&&this.contracts.length));this.event=options[Math.floor(this.random()*options.length)].id;this.nextEvent=this.clock+95+this.random()*30;}
  if(this.mode==='campaign'&&!this.won){const target=LEVELS[this.level-1];if(this.storyGoalsMet()){this.won=true;this.log('completed');}}
  if(this.cash< -5000||this.rep<=0)this.over=true;
 }
 snapshot(){return JSON.parse(JSON.stringify(this));}
 static migrate(input){
  const data=JSON.parse(JSON.stringify(input));data.version=2;data.admissionsOpen=true;data.calendar=0;data.day=1;data.ledger=[];data.year=1;data.month=1;data.yearStart={income:data.income,expenses:data.expenses,construction:data.construction};data.accountOrigin={...data.yearStart};data.financialYears=[];data.tutorial={chartRead:false};data.contracts=[];data.financing=0;data.modifiers=[];data.eventsSeen=[];data.curedByRoom={};data.patientSerial=data.patients?.length||0;
  data.records=(data.patients||[]).map((p,i)=>({id:p.id,number:'CG-L'+String(i+1).padStart(5,'0'),name:p.name,age:30+p.id%40,birthDate:`${2026-(30+p.id%40)}-06-15`,occupation:p.id%6,insurance:p.id%3,allergy:p.id%4,priority:'priorityRoutine',illness:p.illness,variant:p.variant||0,admittedAt:0,admittedYear:1,admittedMonth:1,dischargedAt:null,status:'legacyRecord',diagnosed:p.stage!=='diagnosis',bill:0,diagnosisCharge:0,treatmentCharge:0,outcome:null,timeline:[{time:data.clock,year:1,month:1,code:'legacyRecord',roomId:null,roomType:null,staffName:'',amount:0}]}));return data;
 }
 static restore(data){
  if(data?.version===1)data=Game.migrate(data);
  if(!data||data.version!==2||!['tutorial','campaign','sandbox'].includes(data.mode)||![1,2,3].includes(data.level))throw Error('Invalid save');
  const isNum=v=>typeof v==='number'&&Number.isFinite(v);for(const key of ['rng','clock','day','cash','rep','cured','failed','left','cleanliness','id','income','expenses','construction','nextEvent','arrivalTimer'])if(!isNum(data[key]))throw Error('Invalid number');
  if(data.clock<0||data.rep<0||data.rep>100||!Array.isArray(data.rooms)||data.rooms.length>100||!Array.isArray(data.patients)||data.patients.length>60||!Array.isArray(data.staff)||data.staff.length>100)throw Error('Invalid entities');
  const ids=new Set();for(const entity of [...data.rooms,...data.staff,...data.patients]){if(!Number.isInteger(entity.id)||ids.has(entity.id))throw Error('Invalid id');ids.add(entity.id);}
  for(const r of data.rooms){if(!ROOMS[r.type]||!['x','y','w','h','level','condition','progress'].every(k=>isNum(r[k]))||r.x<1||r.y<1||r.w<3||r.h<3||r.x+r.w>23||r.y+r.h>17||r.level<1||r.level>3)throw Error('Invalid room');}
  for(const s of data.staff)if(!CAST.some(c=>c.id===s.castId)||!isNum(s.fatigue)||!isNum(s.wage)||!isNum(s.skill)||typeof s.name!=='string')throw Error('Invalid staff');
  for(const p of data.patients)if(!ILLNESSES.some(i=>i.id===p.illness)||!['waiting','travel','queue','inside','service','exit'].includes(p.state)||!['reception','diagnosis','treatment','exit'].includes(p.stage)||!isNum(p.x)||!isNum(p.y)||!isNum(p.patience)||!Array.isArray(p.path)||p.path.length>500||!p.path.every(v=>isNum(v.x)&&isNum(v.y))||typeof p.name!=='string')throw Error('Invalid patient');
  if(!Array.isArray(data.completed)||!data.completed.every(id=>PROJECTS.some(p=>p.id===id))||!Array.isArray(data.logs)||!Array.isArray(data.ledger)||data.event&&!EVENTS.some(e=>e.id===data.event)||data.project&&(!PROJECTS.some(p=>p.id===data.project.id)||!isNum(data.project.progress)))throw Error('Invalid progress');
  if(data.id<Math.max(0,...ids))throw Error('Invalid counter');
  if(typeof data.won!=='boolean'||typeof data.over!=='boolean')throw Error('Invalid status');
  for(const s of data.staff){const original=CAST.find(c=>c.id===s.castId);if(s.role!==original.role||s.skill!==original.skill||s.wage!==original.wage||s.fatigue<0||s.fatigue>100||s.name.length>80)throw Error('Invalid employee');if(s.roomId!==null&&!data.rooms.some(r=>r.id===s.roomId&&r.staffId===s.id&&ROOMS[r.type].role===s.role))throw Error('Invalid assignment');}
  for(const r of data.rooms){if(r.staffId!==null&&!data.staff.some(s=>s.id===r.staffId&&s.roomId===r.id))throw Error('Invalid staffing');if(r.patientId!==null&&!data.patients.some(p=>p.id===r.patientId&&p.targetRoom===r.id&&['inside','service'].includes(p.state)))throw Error('Invalid occupant');}
  for(const p of data.patients){if(p.name.length>80||p.x<0||p.x>24||p.y<0||p.y>18||p.patience<0||p.patience>100)throw Error('Invalid patient bounds');if(p.targetRoom!==null&&!data.rooms.some(r=>r.id===p.targetRoom))throw Error('Invalid target');if(['inside','service'].includes(p.state)&&!data.rooms.some(r=>r.id===p.targetRoom&&r.patientId===p.id))throw Error('Invalid service');}
  for(let i=0;i<data.rooms.length;i++)for(let j=i+1;j<data.rooms.length;j++){const a=data.rooms[i],b=data.rooms[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)throw Error('Overlapping rooms');}
  if(data.logs.length>12||!data.logs.every(l=>isNum(l.id)&&isNum(l.time)&&typeof l.code==='string'&&typeof l.extra==='string'))throw Error('Invalid log');
  const fields=['version','mode','level','rng','clock','day','cash','rep','cured','failed','left','cleanliness','rooms','staff','patients','logs','id','income','expenses','construction','completed','project','event','nextEvent','arrivalTimer','won','over','ledger','admissionsOpen','calendar','year','month','yearStart','accountOrigin','financialYears','records','patientSerial','tutorial','contracts','financing','modifiers','eventsSeen','curedByRoom'];
  if(typeof data.admissionsOpen!=='boolean'||!isNum(data.calendar)||data.calendar<0||!Number.isInteger(data.year)||data.year<1||!Number.isInteger(data.month)||data.month<1||data.month>12||!Number.isInteger(data.patientSerial)||data.patientSerial<0||typeof data.tutorial?.chartRead!=='boolean')throw Error('Invalid calendar');
  if(!data.yearStart||!['income','expenses','construction'].every(k=>isNum(data.yearStart[k]))||!Array.isArray(data.financialYears)||!data.financialYears.every(y=>['year','income','expenses','construction','profit','closingCash'].every(k=>isNum(y[k]))))throw Error('Invalid accounts');
  const period=Math.floor((data.calendar+1e-7)/MONTH_SECONDS);if(data.day!==period+1||data.month!==period%12+1||data.year!==Math.floor(period/12)+1||data.financialYears.length!==data.year-1)throw Error('Inconsistent calendar');
  if(!data.accountOrigin||!['income','expenses','construction'].every(k=>isNum(data.accountOrigin[k]))||data.yearStart.income<0||data.yearStart.income>data.income||data.yearStart.expenses<0||data.yearStart.expenses>data.expenses)throw Error('Invalid account baseline');
  for(let i=0;i<data.financialYears.length;i++){const y=data.financialYears[i];if(y.year!==i+1||Math.abs(y.profit-(y.income-y.expenses-y.construction))>.001)throw Error('Invalid annual report');}
  for(const field of ['income','expenses','construction'])if(Math.abs(data.yearStart[field]-(data.accountOrigin[field]+data.financialYears.reduce((sum,y)=>sum+y[field],0)))>.001)throw Error('Inconsistent accounts');
  if(!Array.isArray(data.records)||data.records.length>20000)throw Error('Invalid records');
  if(!data.ledger.every(l=>Number.isInteger(l.day)&&l.day>=1&&l.day<=12&&Number.isInteger(l.year)&&l.year>=1&&isNum(l.cost)&&l.cost>=0))throw Error('Invalid monthly ledger');
  const recordIds=new Set();for(const record of data.records){if(!Number.isInteger(record.id)||recordIds.has(record.id)||typeof record.name!=='string'||record.name.length>100||typeof record.number!=='string'||!ILLNESSES.some(i=>i.id===record.illness)||!['age','admittedAt','bill','diagnosisCharge','treatmentCharge'].every(k=>isNum(record[k]))||!Array.isArray(record.timeline)||record.timeline.length>100||!record.timeline.every(e=>isNum(e.time)&&typeof e.code==='string'&&typeof e.staffName==='string'&&isNum(e.amount)))throw Error('Invalid chart');recordIds.add(record.id);}
  const numbers=new Set();let maxSerial=0;for(const record of data.records){if(numbers.has(record.number)||!/^CG-(?:L)?\d+$/.test(record.number)||typeof record.birthDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(record.birthDate)||!['cured','failed','left',null].includes(record.outcome)||typeof record.diagnosed!=='boolean'||!['occupation','insurance','allergy','variant','admittedYear','admittedMonth'].every(k=>Number.isInteger(record[k]))||record.dischargedAt!==null&&!isNum(record.dischargedAt))throw Error('Invalid chart identity');numbers.add(record.number);maxSerial=Math.max(maxSerial,Number(record.number.replace(/\D/g,'')));if(data.rooms.some(r=>r.id===record.id)||data.staff.some(s=>s.id===record.id))throw Error('Chart id collision');}
  for(const record of data.records){if(!['priorityRoutine','priorityUrgent'].includes(record.priority)||record.occupation<0||record.occupation>5||record.insurance<0||record.insurance>2||record.allergy<0||record.allergy>3||record.variant<0||record.variant>2||record.age<0||record.age>120||record.admittedYear<1||record.admittedMonth<1||record.admittedMonth>12||Math.abs(record.bill-record.diagnosisCharge-record.treatmentCharge)>.001)throw Error('Invalid patient details');for(const event of record.timeline){if(!Number.isInteger(event.year)||event.year<1||!Number.isInteger(event.month)||event.month<1||event.month>12||event.roomType!==null&&!Object.hasOwn(ROOMS,event.roomType)||event.roomId!==null&&!Number.isInteger(event.roomId)||!['arrived','registered','diagnosed','serviceStarted','cured','failed','left','discharged','legacyRecord'].includes(event.code))throw Error('Invalid care timeline');}}
  if(data.patientSerial<maxSerial||data.patients.some(p=>{const record=data.records.find(r=>r.id===p.id);return !record||record.illness!==p.illness||record.name!==p.name||record.dischargedAt!==null;}))throw Error('Mismatched patient identity');
  if(data.patients.some(p=>!recordIds.has(p.id))||data.id<Math.max(0,...recordIds))throw Error('Missing patient chart');
  if(!isNum(data.financing)||!Array.isArray(data.contracts)||!data.contracts.every(c=>Number.isInteger(c.months)&&c.months>0&&c.months<=8)||!Array.isArray(data.modifiers)||!data.modifiers.every(m=>m.kind==='paperwork'&&isNum(m.endsAt))||!Array.isArray(data.eventsSeen)||!data.eventsSeen.every(id=>EVENTS.some(e=>e.id===id))||!data.curedByRoom||!Object.entries(data.curedByRoom).every(([k,v])=>Object.hasOwn(ROOMS,k)&&Number.isInteger(v)&&v>=0))throw Error('Invalid management state');
  if(data.financing!==1500*data.contracts.reduce((sum,c)=>sum+c.months,0)||Object.values(data.curedByRoom).reduce((sum,n)=>sum+n,0)>data.cured)throw Error('Inconsistent financing or treatment counters');
  const g=Object.create(Game.prototype);for(const field of fields)g[field]=JSON.parse(JSON.stringify(data[field]));
  for(const r of g.rooms)if(g.path(ENTRY,g.door(r))===null)throw Error('Inaccessible room');
  g.assignStaff();return g;
 }
}
