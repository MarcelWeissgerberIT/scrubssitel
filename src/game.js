import {initStaff,entrySpot,dispatchStaff,staffReady,updateStaff,repathStaff,requestBreak,migrateStaff,validateStaff,staffPlacement,placeStaff,canPickUpStaff} from './staff.js';
import {ROOMS, CAST, ILLNESSES, LEVELS, PROJECTS, EVENTS} from './content.js';
import {MONTH_SECONDS,YEAR_SECONDS,ANNUAL_TARGET,GUIDE,guideIndex} from './tutorial.js';
import {candidates,candidate,RECRUITMENT_FEE} from './recruitment.js';
import {waitingSeats,waitingComfort} from './objects.js';
import {insidePath,patientPoint,segmentBlocked} from './layout.js';
import * as furnishing from './furnishing.js';
export const GRID={w:24,h:18};
export const ENTRY={x:12,y:16};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(x,y)=>`${x},${y}`;
const names=['Alex','Sam','Robin','Jamie','Casey','Lou','Charlie','River','Jules','Taylor','Kim','Morgan','Rene','Ari','Noor','Sasha','Drew','Billie'];
export class Game {
 constructor({level=1,mode='tutorial',seed=Date.now()}={}){
  this.version=6;this.queueSerial=0;this.callSerial=0;this.calls=[];this.recruitmentRound=0;this.applicantIds=candidates(0).map(c=>c.id);this.mode=mode;this.level=level;this.rng=seed>>>0||1;this.clock=0;this.day=1;this.cash=50000;
  this.rep=60;this.cured=0;this.failed=0;this.left=0;this.cleanliness=95;this.rooms=[];this.staff=[];this.patients=[];this.logs=[];this.id=0;this.income=0;this.expenses=0;this.construction=0;this.completed=[];this.project=null;this.event=null;this.nextEvent=75;this.arrivalTimer=4;this.won=false;this.over=false;this.ledger=[];
  this.admissionsOpen=false;this.calendar=0;this.year=1;this.month=1;this.yearStart={income:0,expenses:0,construction:0};this.accountOrigin={income:0,expenses:0,construction:0};this.financialYears=[];this.records=[];this.patientSerial=0;this.tutorial={chartRead:false};this.contracts=[];this.financing=0;this.modifiers=[];this.eventsSeen=[];this.curedByRoom={};
 }
 checkTutorial(){if(this.mode==='tutorial'&&!this.won&&guideIndex(this)>=GUIDE.length-1&&this.financialYears.some(y=>y.profit>=ANNUAL_TARGET)){this.won=true;this.log('completedTutorial');}}
 guide(){
  if(this.mode!=='tutorial'||this.won)return null;
  const index=guideIndex(this),step=GUIDE[index],unfinished=step.room?this.rooms.find(r=>r.type===step.room&&!this.roomReady(r)):null;
  if(unfinished)return {id:'furnish-'+unfinished.type,furnish:true,roomId:unfinished.id,index,title:{en:'Make this room your own',de:'Richte diesen Raum selbst ein'},text:{en:'Place the required furniture. Green access markers need clear paths to the door. You choose the positions; furniture can be moved again later.',de:'Platziere die benötigten Möbel. Die grünen Zugangspunkte brauchen freie Wege zur Tür. Du bestimmst die Positionen und kannst später umräumen.'}};
  return {...step,index};
 }
 skipTutorial(){if(this.mode==='tutorial'){this.mode='sandbox';this.won=false;}return {};}
 roomReady(r){return furnishing.roomReady(r);}
 beginRoomEdit(id){return furnishing.beginRoomEdit(this,id);}
 furniturePlacement(id,item,ignoreId){return furnishing.furniturePlacement(this,id,item,ignoreId);}
 addFurniture(id,kind,position){return furnishing.addFurniture(this,id,kind,position);}
 moveFurniture(id,item,position){return furnishing.moveFurniture(this,id,item,position);}
 removeFurniture(id,item){return furnishing.removeFurniture(this,id,item);}
 autoFurnish(id){return furnishing.autoFurnish(this,id);}
 finishRoom(id){return furnishing.finishRoom(this,id);}
 staffPlacement(id,roomId,point){return staffPlacement(this,id,roomId,point);}
 placeStaff(id,roomId,point){return placeStaff(this,id,roomId,point);}
 canPickUpStaff(id){return canPickUpStaff(this,id);}

 openClinic(){for(const type of ['reception','gp','pharmacy'])if(!this.rooms.some(r=>r.type===type&&r.staffId&&this.roomReady(r)))return {error:'openingRequirements'};this.admissionsOpen=true;this.arrivalTimer=1;this.log('clinicOpened');return {};}
 yearlyProfit(){return (this.income-this.yearStart.income)-(this.expenses-this.yearStart.expenses)-(this.construction-this.yearStart.construction);}
 annualReport(){return {year:this.year,income:this.income-this.yearStart.income,expenses:this.expenses-this.yearStart.expenses,construction:this.construction-this.yearStart.construction,profit:this.yearlyProfit()};}
 closeYear(){const report=this.annualReport();this.financialYears.push({...report,closingCash:this.cash});this.checkTutorial();this.yearStart={income:this.income,expenses:this.expenses,construction:this.construction};this.year++;this.log('yearClosed',String(report.profit));}
 treatmentFee(p,r=null){const base=ILLNESSES.find(i=>i.id===p.illness).fee;return Math.round(base*(this.mode==='tutorial'?12.5:1)*(1+((r?.level||1)-1)*.1));}
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
  if(this.staff.some(s=>s.x>=x-.4&&s.x<x+w-.4&&s.y>=y-.4&&s.y<y+h-.4))return 'invalidRoom';
  if(this.patients.some(p=>p.state!=='service'&&p.state!=='inside'&&p.x>=x-.4&&p.x<x+w-.4&&p.y>=y-.4&&p.y<y+h-.4))return 'invalidRoom';
  const all=[...this.rooms,rect];for(const r of all)if(this.path(ENTRY,this.door(r),all)===null)return 'badPlacement';
  for(const s of this.staff){const inside=this.rooms.find(r=>this.contains(r,s));if(this.path(ENTRY,inside?this.door(inside):s,all)===null)return 'badPlacement';}
  if(this.cash<ROOMS[type].cost)return 'notEnough';return null;
 }
 addRoom(type,rect,free=false){const error=free?null:this.placement(type,rect);if(error)return {error};const r={id:++this.id,type,...rect,level:1,condition:100,staffId:null,patientId:null,progress:0,doorOpen:0,doorHeld:false,furniture:[],ready:false,editing:true,renovating:false};this.rooms.push(r);if(!free){this.cash-=ROOMS[type].cost;this.construction+=ROOMS[type].cost;this.log('built',type);}this.assignStaff();this.repath();this.rebalance(type);this.checkTutorial();return {room:r};}
 rebalance(type){for(const p of this.patients)if(p.state==='waiting'&&this.need(p)===type)this.routePatient(p);}
 repath(){
  repathStaff(this);
  for(const p of this.patients){const r=this.room(p.targetRoom),seatRoom=this.room(p.seatRoom);let route;
   if(p.state==='relocating'&&p.path.length)route=this.corridorPath(p,p.path.at(-1));
   else if(p.state==='travel'&&r)route=this.corridorPath(p,this.door(r));
   else if(p.state==='seatTravel'&&seatRoom)route=this.routeInto(p,seatRoom,this.seats(seatRoom)[p.seatIndex]);
   else if(p.state==='inside'&&r)route=this.routeInto(p,r,this.servicePoint(r));
   else if(p.state==='roomExit'&&r)route=this.exitPath(r,p);
   else if(p.state==='exit')route=this.corridorPath(p,ENTRY);
   if(route!==undefined&&route!==null)p.path=route;
  }
 }

 room(id){return this.rooms.find(r=>r.id===id);}
 applicants(role=null){return this.applicantIds.map(candidate).filter(c=>c&&(!role||c.role===role));}
 refreshApplicants(){if(this.cash<RECRUITMENT_FEE)return {error:'notEnough'};if(this.recruitmentRound>=10000)return {error:'noApplicants'};this.cash-=RECRUITMENT_FEE;this.expenses+=RECRUITMENT_FEE;this.recruitmentRound++;this.applicantIds=candidates(this.recruitmentRound).map(c=>c.id);this.log('newApplicants');return {};}
 hire(castId,free=false){const base=CAST.find(s=>s.id===castId);if(!base)return {error:'noApplicants'};const choice=this.applicants().find(c=>c.castId===castId)||this.applicants(base.role)[0];return choice?this.hireApplicant(choice.id,free):{error:'noApplicants'};}
 hireApplicant(applicantId,free=false){const base=this.applicants().find(c=>c.id===applicantId);if(!base)return {error:'noApplicants'};if(!free&&this.cash<base.hire)return {error:'notEnough'};const spot=entrySpot(this);if(!spot)return {error:'staffNoSpace'};const s={...base,id:++this.id,applicantId:base.id,fatigue:0,resting:false,roomId:null};this.applicantIds=this.applicantIds.filter(id=>id!==applicantId);this.staff.push(s);initStaff(this,s);Object.assign(s,spot);if(!free){this.cash-=base.hire;this.construction+=base.hire;this.log('hireDone',s.name);}this.checkTutorial();return {staff:s};}
 dismiss(id){const s=this.staff.find(v=>v.id===id);if(!s)return;const r=this.room(s.roomId);if(r?.patientId)return {error:'removeBusy'};if(r)r.staffId=null;this.staff=this.staff.filter(v=>v.id!==id);this.assignStaff();return {};}
 assignStaff(){
  for(const s of this.staff){if(s.roomId&&!this.room(s.roomId))s.roomId=null;}
  for(const r of this.rooms){if(r.staffId&&!this.staff.some(s=>s.id===r.staffId)){r.staffId=null;}}
  for(const r of this.rooms){if(!ROOMS[r.type].role||r.staffId||!this.roomReady(r))continue;const s=this.staff.find(s=>!s.manualPlacement&&!s.awaitingPlacement&&s.role===ROOMS[r.type].role&&!s.roomId&&!s.resting);if(s){r.staffId=s.id;s.roomId=r.id;}}
 }
 upgrade(id){const r=this.room(id);if(!r)return {};if(r.level>=3)return {error:'maxLevel'};const cost=Math.round(ROOMS[r.type].cost*.65*r.level);if(this.cash<cost)return {error:'notEnough'};this.cash-=cost;this.construction+=cost;r.level++;r.condition=100;this.log('upgraded',r.type);this.checkTutorial();return {};}
 sell(id){const r=this.room(id);if(!r)return {};if(r.patientId||this.patients.some(p=>p.seatRoom===id||this.contains(r,p))||this.staff.some(s=>this.contains(r,s)||s.breakRoomId===id||s.destination?.roomId===id))return {error:'removeBusy'};const s=this.staff.find(s=>s.id===r.staffId);if(s)s.roomId=null;for(const p of this.patients)if(p.targetRoom===id){p.path=this.corridorPath(p,this.room(p.seatRoom)?this.door(this.room(p.seatRoom)):p)||[];p.seatRoom=null;p.seatIndex=null;p.targetRoom=null;p.state=p.path.length?'relocating':'waiting';}this.cash+=Math.round(ROOMS[r.type].cost*.5);this.construction-=Math.round(ROOMS[r.type].cost*.5);this.rooms=this.rooms.filter(r=>r.id!==id);this.assignStaff();repathStaff(this);return {};}
 debtRemaining(){return this.contracts.reduce((sum,c)=>sum+c.months*2250,0);}
 storyGoalsMet(){const level=LEVELS[this.level-1];return this.cured>=level.goal&&this.rep>=level.rep&&(!level.specialty||(this.curedByRoom[level.specialty]||0)>=level.specialtyGoal)&&(!level.project||this.completed.includes(level.project));}
 dailyCost(){return this.staff.reduce((a,s)=>a+s.wage,0)+this.rooms.reduce((a,r)=>a+Math.round(ROOMS[r.type].cost*.025*r.level),0);}
 success(r){const s=this.staff.find(s=>s.id===r.staffId);return clamp((this.mode==='tutorial'?.85:.79)+(s?.skill||1)*.07+(r.level-1)*.035+(this.completed.includes('care')?.12:0)-(100-this.cleanliness)*.0015-(100-r.condition)*.001, .5,.99);}
 startResearch(id){const p=PROJECTS.find(p=>p.id===id);if(!p||this.project||this.completed.includes(id))return {};if(!this.rooms.some(r=>r.type==='lab'&&this.roomReady(r)))return {error:'noResearch'};if(this.cash<p.cost)return {error:'notEnough'};this.cash-=p.cost;this.construction+=p.cost;this.project={id,progress:0};return {};}
 resolveEvent(index){if(!this.event)return {};const ev=EVENTS.find(e=>e.id===this.event);const c=ev.choices[index];if(!c)return {};if(c.cost>0&&this.cash<c.cost)return {error:'notEnough'};this.cash-=c.cost;if(c.cost>0)this.expenses+=c.cost;else this.income-=c.cost;
  if(c.effect==='mafiaLoan'){this.cash+=12000;this.financing+=12000;this.contracts.push({months:8});}
  if(c.effect==='paperwork')this.modifiers.push({kind:'paperwork',endsAt:this.clock+60});
  if(c.effect==='inspectionClean'){this.cleanliness=100;this.rep=clamp(this.rep+3,0,100);}
  if(c.effect==='inspectionCheck')this.rep=clamp(this.rep+(this.cleanliness>=85?2:-5),0,100);
  if(c.effect==='beautyRush')for(let i=0;i<5;i++)this.spawnPatient('funny');
  if(c.effect==='energy')this.staff.forEach(s=>s.fatigue=clamp(s.fatigue-35,0,100));if(c.effect==='fatigue')this.staff.forEach(s=>s.fatigue=clamp(s.fatigue+20,0,100));if(c.effect==='rep')this.rep=clamp(this.rep+5,0,100);if(c.effect==='quality')this.rep=clamp(this.rep+(this.cleanliness>75?3:-2),0,100);if(c.effect==='refer')this.rep=clamp(this.rep-3,0,100);if(c.effect==='rush')for(let i=0;i<6;i++)this.spawnPatient('jitters');this.eventsSeen.push(this.event);this.event=null;return {};
 }
 patientAge(){const roll=this.random();return roll<.23?4+Math.floor(roll/.23*12):18+Math.floor((roll-.23)/.77*68);}
 spawnPatient(illnessId){
  if(this.patients.length>=55)return null;
  const max=this.mode==='sandbox'?6:this.mode==='tutorial'?2:this.level*2;
  const illness=illnessId||ILLNESSES[Math.floor(this.random()*max)].id;
  const surname=['Bennett','Keller','Navarro','Wagner','Okafor','Hart','Nguyen','Weber','Moreno','Reed','Baumann','Brooks'][Math.floor(this.random()*12)];
  const name=names[Math.floor(this.random()*names.length)]+' '+surname,age=this.patientAge(),serial=++this.patientSerial;
  const p={id:++this.id,name,illness,age,child:age<16,queueOrder:0,calledAt:null,x:ENTRY.x+(this.random()-.5)*.25,y:ENTRY.y,stage:'reception',state:'waiting',patience:100,targetRoom:null,path:[],seatRoom:null,seatIndex:null,registered:false,variant:Math.floor(this.random()*3),color:['#d39360','#568f9a','#b887b8'][serial%3],skin:['#eec3a1','#bd865e','#815640'][serial%3],hair:['#3e3836','#81533b','#9fa1a7'][serial%3]};
  this.records.push({id:p.id,number:'CG-'+String(serial).padStart(5,'0'),name,age,birthDate:`${2026+this.year-1-age}-${String(1+Math.floor(this.random()*12)).padStart(2,'0')}-${String(1+Math.floor(this.random()*28)).padStart(2,'0')}`,occupation:((roll)=>age<16?(age<6?7:6):Math.floor(roll*6))(this.random()),insurance:Math.floor(this.random()*3),allergy:Math.floor(this.random()*4),priority:serial%7===0?'priorityUrgent':'priorityRoutine',illness,variant:p.variant,admittedAt:this.clock,admittedYear:this.year,admittedMonth:this.month,dischargedAt:null,status:'arrived',diagnosed:false,bill:0,diagnosisCharge:0,treatmentCharge:0,outcome:null,timeline:[]});
  this.patients.push(p);this.recordEvent(p,'arrived');return p;
 }

 need(p){return p.stage==='reception'?'reception':p.stage==='diagnosis'?'gp':ILLNESSES.find(i=>i.id===p.illness).room;}
 waitingList(type=null){return this.patients.filter(p=>p.registered&&p.stage!=='exit'&&['waiting','travel','queue','seatTravel','seated','relocating'].includes(p.state)&&(!type||this.need(p)===type)).sort((a,b)=>a.queueOrder-b.queueOrder||a.id-b.id);}
 staffReady(s){return staffReady(this,s);}
 requestBreak(id){return requestBreak(this,id);}
 callNext(r){const staff=this.staff.find(s=>s.id===r.staffId);if(!this.roomReady(r)||r.patientId||!this.staffReady(staff)||staff.breakPending||!ROOMS[r.type].time)return false;const p=r.type==='reception'?this.patients.filter(p=>p.targetRoom===r.id&&['queue','travel','seatTravel','seated'].includes(p.state)).sort((a,b)=>a.id-b.id)[0]:this.waitingList(r.type)[0];if(!p||!['queue','seated'].includes(p.state))return false;r.patientId=p.id;r.progress=0;p.targetRoom=r.id;p.state='called';p.calledAt=this.clock;p.path=[];p.seatRoom=null;p.seatIndex=null;if(p.registered){const call={id:++this.callSerial,patientId:p.id,name:p.name,roomId:r.id,roomType:r.type,time:this.clock};this.calls.push(call);this.calls=this.calls.slice(-12);this.recordEvent(p,'called',r);}return true;}
 toggleDoor(id){const r=this.room(id);if(r)r.doorHeld=!r.doorHeld;}
 updateDoors(dt){for(const r of this.rooms){const d=this.door(r),inner={x:d.x,y:r.y<8?r.y+r.h-1:r.y};const near=this.staff.some(s=>s.path.length&&Math.min(Math.hypot(s.x-d.x,s.y-d.y),Math.hypot(s.x-inner.x,s.y-inner.y))<1.5)||this.patients.some(p=>['called','inside','roomExit','seatTravel','relocating','exit'].includes(p.state)&&Math.min(Math.hypot(p.x-d.x,p.y-d.y),Math.hypot(p.x-inner.x,p.y-inner.y))<1.5);const target=r.doorHeld||near?1:0;r.doorOpen=clamp(r.doorOpen+(target?1:-1)*dt*5,0,1);}}
 queue(r){if(r.type!=='reception'&&ROOMS[r.type].time)return this.waitingList(r.type).length;return this.patients.filter(p=>p.targetRoom===r.id&&['waiting','travel','queue','seatTravel','seated','relocating'].includes(p.state)).length;}
 contains(r,p){return p.x+.5>r.x+1e-7&&p.x+.5<r.x+r.w-1e-7&&p.y+.5>r.y+1e-7&&p.y+.5<r.y+r.h-1e-7;}
 servicePoint(r){return Array.isArray(r.furniture)?patientPoint(r):r.type==='reception'?{x:r.x+r.w*.5-.5,y:r.y+2}:{x:r.x+r.w*.66-.5,y:r.y+r.h*.65-.5};}
 insideRoute(r,from,to){return to?insidePath(r,from,to):null;}
 enterPath(r,to){return this.insideRoute(r,this.door(r),to);}
 exitPath(r,p){return this.insideRoute(r,p,this.door(r));}
 routeInto(p,r,to){
  if(this.contains(r,p))return this.insideRoute(r,p,to);
  const outside=this.corridorPath(p,this.door(r)),inside=this.enterPath(r,to);return outside===null||inside===null?null:[...outside,...inside];
 }
 corridorPath(p,to){const inside=this.rooms.find(r=>this.contains(r,p));if(!inside)return this.path(p,to);const exit=this.exitPath(inside,p),corridor=this.path(this.door(inside),to);return exit===null||corridor===null?null:[...exit,...corridor];}

 seats(r){return waitingSeats(r);}
 seatStats(){const capacity=this.rooms.reduce((n,r)=>n+this.seats(r).length,0),reserved=this.patients.filter(p=>p.seatRoom!==null).length,seated=this.patients.filter(p=>p.state==='seated').length;return {capacity,reserved,seated,standing:this.patients.filter(p=>p.state==='queue').length};}
 reserveSeat(p){
  if(p.seatRoom!==null)return false;
  const choices=this.rooms.filter(r=>r.type==='waiting'&&this.roomReady(r)).flatMap(r=>this.seats(r).map((seat,index)=>({r,seat,index,path:this.routeInto(p,r,seat)}))).filter(v=>v.path!==null&&!this.patients.some(q=>q.seatRoom===v.r.id&&q.seatIndex===v.index)).sort((a,b)=>a.path.length-b.path.length||a.index-b.index);
  if(!choices.length)return false;const {r,index,path}=choices[0];p.seatRoom=r.id;p.seatIndex=index;p.path=path;p.state='seatTravel';return true;
 }

 standingPoint(r,p){const d=this.door(r),spots=[];for(let radius=1;radius<=3;radius++)for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++){if(Math.abs(dx)+Math.abs(dy)!==radius)continue;const spot={x:d.x+dx,y:d.y+dy};if(spot.x<1||spot.x>22||spot.y<1||spot.y>16||this.occupied(spot.x,spot.y)||this.rooms.some(room=>{const door=this.door(room);return door.x===spot.x&&door.y===spot.y;})||this.patients.some(q=>q.id!==p.id&&([q,q.path.at(-1)].some(v=>v&&Math.hypot(v.x-spot.x,v.y-spot.y)<.6))))continue;const path=this.corridorPath(p,spot);if(path!==null)spots.push({spot,path});}return spots.sort((a,b)=>a.path.length-b.path.length)[0]||{spot:d,path:this.corridorPath(p,d)||[]};}
 routePatient(p){const type=this.need(p);const choices=this.rooms.filter(r=>r.type===type&&r.staffId&&this.roomReady(r)).map(r=>({r,path:this.corridorPath(p,this.door(r))})).filter(v=>v.path!==null).sort((a,b)=>(this.queue(a.r)+(a.r.patientId?1:0))-(this.queue(b.r)+(b.r.patientId?1:0))||a.path.length-b.path.length);if(!choices.length)return;const {r,path}=choices[0],busy=p.registered||r.patientId||this.queue(r)>0;p.targetRoom=r.id;p.path=path;p.state='travel';if(busy&&!this.reserveSeat(p))p.path=this.standingPoint(r,p).path;}
 leave(p,abandoned=false){const path=this.corridorPath(p,ENTRY)||[];const r=this.room(p.targetRoom);if(r?.patientId===p.id){r.patientId=null;r.progress=0;}if(abandoned){const record=this.record(p.id);if(record)record.outcome='left';this.recordEvent(p,'left');this.left++;this.rep=clamp(this.rep-2,0,100);this.log('left',p.name);}p.stage='exit';p.targetRoom=null;p.seatRoom=null;p.seatIndex=null;p.state='exit';p.path=path;}
 move(p,dt,pace=2.5){
  let distance=dt*pace;
  while(distance>0&&p.path.length){
   const target=p.path[0],dx=target.x-p.x,dy=target.y-p.y,length=Math.hypot(dx,dy),step=Math.min(distance,length);
   if(length<1e-9){p.path.shift();continue;}
   const next={x:p.x+dx/length*step,y:p.y+dy/length*step};
   const doorBlocked=this.rooms.some(r=>{const edge=r.y<8?r.y+r.h-.5:r.y-.5;return Math.abs(next.x-this.door(r).x)<.6&&Math.abs(next.y-p.y)>1e-8&&Math.min(p.y,next.y)<=edge&&Math.max(p.y,next.y)>=edge&&r.doorOpen<.85;});
   const room=this.rooms.find(r=>this.contains(r,p)||this.contains(r,next));
   if(doorBlocked||room&&segmentBlocked(room,p,next))break;
   p.x=next.x;p.y=next.y;distance-=step;if(length<=step+1e-9){p.path.shift();break;}
  }
 }

 update(dt){if(this.over||this.event||dt<=0||!this.admissionsOpen)return;dt=Math.min(dt,.25);this.clock+=dt;
  this.calendar+=dt;
  const newDay=Math.floor((this.calendar+1e-7)/MONTH_SECONDS)+1;
  if(newDay>this.day){this.day=newDay;let cost=this.dailyCost();this.cash-=cost;this.expenses+=cost;for(const contract of this.contracts){if(contract.months>0){this.cash-=2250;this.financing-=1500;this.expenses+=750;cost+=2250;contract.months--;}}this.contracts=this.contracts.filter(c=>c.months>0);this.ledger.unshift({day:this.month,year:this.year,cost});this.ledger=this.ledger.slice(0,24);this.log('paid',String(cost));if((newDay-1)%12===0)this.closeYear();this.month=(newDay-1)%12+1;}

  this.assignStaff();this.updateDoors(dt);updateStaff(this,dt);
  const toilet=Math.max(0,...this.rooms.filter(r=>r.type==='toilet'&&this.roomReady(r)).map(r=>r.level)),janitors=this.staff.filter(s=>s.role==='janitor'&&s.state==='cleaning'&&!s.resting).reduce((n,s)=>n+s.skill,0);
  this.cleanliness=clamp(this.cleanliness+dt*(janitors*.24-this.patients.length*.007-.035),0,100);
  this.modifiers=this.modifiers.filter(m=>m.endsAt>this.clock);
  for(const r of this.rooms){r.condition=clamp(r.condition+dt*(janitors*.1-(r.patientId?.055:.006)),20,100);const s=this.staff.find(s=>s.id===r.staffId);if(!this.staffReady(s))continue;if(!r.patientId){this.callNext(r);}
   const p=this.patients.find(p=>p.id===r.patientId);if(!p||p.state!=='service')continue;
   const speed=s.skill*(1-s.fatigue*.004)*(1+(r.level-1)*.25)*(this.completed.includes('speed')?1.25:1)*(r.condition/200+.5)*(r.type==='gp'&&this.modifiers.some(m=>m.kind==='paperwork')?1/1.35:1);r.progress+=dt*speed;
   if(r.progress>=ROOMS[r.type].time){r.progress=0;p.state='roomExit';p.path=this.exitPath(r,p);
    if(p.stage==='reception'){p.registered=true;p.queueOrder=++this.queueSerial;this.recordEvent(p,'registered',r);p.stage='diagnosis';}
    else if(p.stage==='diagnosis'){const fee=this.diagnosisFee();this.cash+=fee;this.income+=fee;this.recordEvent(p,'diagnosed',r,fee);p.stage='treatment';p.queueOrder=++this.queueSerial;}
    else {const illness=ILLNESSES.find(i=>i.id===p.illness);const supplies=this.mode==='tutorial'?350:35;this.cash-=supplies;this.expenses+=supplies;if(this.random()<this.success(r)){const earned=this.treatmentFee(p,r);this.recordEvent(p,'cured',r,earned);const record=this.record(p.id);if(record)record.outcome='cured';this.cash+=earned;this.income+=earned;this.cured++;this.curedByRoom[r.type]=(this.curedByRoom[r.type]||0)+1;this.rep=clamp(this.rep+.9+(p.patience>70?.25:0),0,100);p.cured=true;this.log('cure',p.name);}else{this.recordEvent(p,'failed',r);const record=this.record(p.id);if(record)record.outcome='failed';this.failed++;this.rep=clamp(this.rep-1,0,100);this.log('failed',p.name);}p.stage='exit';}
   }
  }
  for(const p of this.patients){if(p.state==='called'){if(this.clock-p.calledAt>=.65){const r=this.room(p.targetRoom);p.state='inside';p.path=this.routeInto(p,r,this.servicePoint(r))||[];}continue;}if(p.state==='roomExit'){this.move(p,dt);if(!p.path.length){const r=this.room(p.targetRoom);if(r){r.patientId=null;r.progress=0;}p.targetRoom=null;if(p.stage==='exit')this.leave(p);else p.state='waiting';}continue;}if(p.state==='exit'){this.move(p,dt);continue;}
   p.patience=clamp(p.patience-dt*(p.state==='service'?.015:.28)*(p.state==='seated'?Math.max(.2,.35-((this.room(p.seatRoom)?.level||1)-1)*.05):1)*(p.state==='seated'?waitingComfort(this.room(p.seatRoom)):1)*(p.child&&p.state==='seated'&&this.room(p.seatRoom)?.furniture.some(o=>o.kind==='toys')?.65:1)*(toilet?(.72-(toilet-1)*.1):1)*(this.completed.includes('patience')?.65:1)*(1+(100-this.cleanliness)/100),0,100);
   if(p.patience<=0&&p.state!=='service'&&p.state!=='inside'){this.leave(p,true);continue;}
   if(p.state==='waiting')this.routePatient(p);
   if(['travel','inside','seatTravel','relocating'].includes(p.state)){this.move(p,dt);if(!p.path.length){const destination=p.state==='inside'?this.servicePoint(this.room(p.targetRoom)):p.state==='seatTravel'?this.seats(this.room(p.seatRoom))[p.seatIndex]:null;if(destination&&Math.hypot(p.x-destination.x,p.y-destination.y)>.08)continue;if(p.state==='inside')this.recordEvent(p,'serviceStarted',this.room(p.targetRoom));p.state={inside:'service',travel:'queue',seatTravel:'seated',relocating:'waiting'}[p.state];}}
   if(p.state==='queue'&&this.room(p.targetRoom)?.patientId&&Math.floor(this.clock*2)!==Math.floor((this.clock-dt)*2))this.reserveSeat(p);
   if(['queue','seated','seatTravel','travel'].includes(p.state)&&!this.room(p.targetRoom)?.staffId){const wr=this.room(p.seatRoom);p.path=wr?this.corridorPath(p,this.door(wr))||[]:[];p.state=p.path.length?'relocating':'waiting';p.seatRoom=null;p.seatIndex=null;p.targetRoom=null;}
  }
  for(const p of this.patients)if(p.state==='exit'&&!p.path.length){const record=this.record(p.id);if(record){record.dischargedAt=this.clock;this.recordEvent(p,'discharged');}}
  this.patients=this.patients.filter(p=>!(p.state==='exit'&&!p.path.length));
  if(this.project){const lab=this.rooms.find(r=>r.type==='lab'&&this.staffReady(this.staff.find(s=>s.id===r.staffId)));if(lab){this.project.progress+=dt*(this.staff.find(s=>s.id===lab.staffId)?.skill||1)*(1+(lab.level-1)*.3);const project=PROJECTS.find(p=>p.id===this.project.id);if(this.project.progress>=project.time){this.completed.push(project.id);this.project=null;this.log('researchDone',project.id);}}}
  for(const r of this.rooms)if(r.renovating&&!furnishing.roomBusy(this,r))furnishing.beginRoomEdit(this,r.id);
  this.arrivalTimer-=dt;if(this.arrivalTimer<=0){this.spawnPatient();this.arrivalTimer=(this.mode==='tutorial'?8:this.mode==='sandbox'?8:LEVELS[this.level-1].arrival)*(.85+this.random()*.3);}
  if(this.clock>=this.nextEvent&&(this.mode!=='tutorial'||guideIndex(this)>=GUIDE.length-1)){const options=EVENTS.filter(e=>(!e.minLevel||this.mode==='sandbox'||this.level>=e.minLevel)&&!(e.id==='mafia'&&this.contracts.length));this.event=options[Math.floor(this.random()*options.length)].id;this.nextEvent=this.clock+95+this.random()*30;}
  if(this.mode==='campaign'&&!this.won){const target=LEVELS[this.level-1];if(this.storyGoalsMet()){this.won=true;this.log('completed');}}
  if(this.cash< -5000||this.rep<=0)this.over=true;
 }
 snapshot(){return JSON.parse(JSON.stringify(this));}
 static migrate(input){
  const data=JSON.parse(JSON.stringify(input));data.version=2;data.admissionsOpen=true;data.calendar=0;data.day=1;data.ledger=[];data.year=1;data.month=1;data.yearStart={income:data.income,expenses:data.expenses,construction:data.construction};data.accountOrigin={...data.yearStart};data.financialYears=[];data.tutorial={chartRead:false};data.contracts=[];data.financing=0;data.modifiers=[];data.eventsSeen=[];data.curedByRoom={};data.patientSerial=data.patients?.length||0;
  data.records=(data.patients||[]).map((p,i)=>({id:p.id,number:'CG-L'+String(i+1).padStart(5,'0'),name:p.name,age:30+p.id%40,birthDate:`${2026-(30+p.id%40)}-06-15`,occupation:p.id%6,insurance:p.id%3,allergy:p.id%4,priority:'priorityRoutine',illness:p.illness,variant:p.variant||0,admittedAt:0,admittedYear:1,admittedMonth:1,dischargedAt:null,status:'legacyRecord',diagnosed:p.stage!=='diagnosis',bill:0,diagnosisCharge:0,treatmentCharge:0,outcome:null,timeline:[{time:data.clock,year:1,month:1,code:'legacyRecord',roomId:null,roomType:null,staffName:'',amount:0}]}));return data;
 }
 static restore(data){
  if(data?.version<6){data=JSON.parse(JSON.stringify(data));for(const r of data.rooms||[]){delete r.furniture;delete r.ready;delete r.editing;delete r.renovating;}}
  if(data?.version===1)data=Game.migrate(data);
  if(data?.version===2){data=JSON.parse(JSON.stringify(data));data.version=3;data.recruitmentRound=0;data.applicantIds=candidates(0).filter(c=>!data.staff.some(s=>s.name===c.name)).map(c=>c.id);for(const s of data.staff)if(!s.applicantId){s.personality='steady';s.fatigueRate=1;}for(const p of data.patients){p.seatRoom=null;p.seatIndex=null;}}
  if(data?.version===3){data=JSON.parse(JSON.stringify(data));data.version=4;data.queueSerial=0;data.callSerial=0;data.calls=[];const ordered=data.patients.slice().sort((a,b)=>{const at=p=>data.records.find(r=>r.id===p.id)?.timeline.filter(e=>['registered','diagnosed'].includes(e.code)).at(-1)?.time||0;return at(a)-at(b)||a.id-b.id;});for(const r of data.rooms){r.doorOpen=1;r.doorHeld=false;}for(const p of ordered){p.registered=['diagnosis','treatment'].includes(p.stage)||!!p.registered;p.age=data.records.find(r=>r.id===p.id)?.age||30;p.child=p.age<16;p.queueOrder=p.registered?++data.queueSerial:0;p.calledAt=null;if(['seated','seatTravel'].includes(p.state)){p.seatRoom=null;p.seatIndex=null;p.state='waiting';p.path=[];}}}
  if(data?.version===4){data=JSON.parse(JSON.stringify(data));data.version=5;migrateStaff(data);}
  if(!data||![5,6].includes(data.version)||!['tutorial','campaign','sandbox'].includes(data.mode)||![1,2,3].includes(data.level))throw Error('Invalid save');
  const isNum=v=>typeof v==='number'&&Number.isFinite(v);for(const key of ['rng','clock','day','cash','rep','cured','failed','left','cleanliness','id','income','expenses','construction','nextEvent','arrivalTimer'])if(!isNum(data[key]))throw Error('Invalid number');
  if(data.clock<0||data.rep<0||data.rep>100||!Array.isArray(data.rooms)||data.rooms.length>100||!Array.isArray(data.patients)||data.patients.length>60||!Array.isArray(data.staff)||data.staff.length>100)throw Error('Invalid entities');
  const ids=new Set();for(const entity of [...data.rooms,...data.staff,...data.patients]){if(!Number.isInteger(entity.id)||ids.has(entity.id))throw Error('Invalid id');ids.add(entity.id);}
  for(const r of data.rooms){if(!ROOMS[r.type]||!['x','y','w','h','level','condition','progress'].every(k=>isNum(r[k]))||r.x<1||r.y<1||r.w<3||r.h<3||r.x+r.w>23||r.y+r.h>17||r.level<1||r.level>3)throw Error('Invalid room');}
  for(const s of data.staff)if(!CAST.some(c=>c.id===s.castId)||!isNum(s.fatigue)||!isNum(s.wage)||!isNum(s.skill)||typeof s.name!=='string')throw Error('Invalid staff');
  for(const p of data.patients)if(!ILLNESSES.some(i=>i.id===p.illness)||!['waiting','travel','queue','seatTravel','seated','relocating','called','inside','service','roomExit','exit'].includes(p.state)||!['reception','diagnosis','treatment','exit'].includes(p.stage)||!isNum(p.x)||!isNum(p.y)||!isNum(p.patience)||!Array.isArray(p.path)||p.path.length>500||!p.path.every(v=>isNum(v.x)&&isNum(v.y))||typeof p.name!=='string')throw Error('Invalid patient');
  if(!Array.isArray(data.completed)||!data.completed.every(id=>PROJECTS.some(p=>p.id===id))||!Array.isArray(data.logs)||!Array.isArray(data.ledger)||data.event&&!EVENTS.some(e=>e.id===data.event)||data.project&&(!PROJECTS.some(p=>p.id===data.project.id)||!isNum(data.project.progress)))throw Error('Invalid progress');
  if(data.id<Math.max(0,...ids))throw Error('Invalid counter');
  if(typeof data.won!=='boolean'||typeof data.over!=='boolean')throw Error('Invalid status');
  for(const s of data.staff){const original=s.applicantId?candidate(s.applicantId):CAST.find(c=>c.id===s.castId);if(!original||s.applicantId&&(s.castId!==original.castId||s.name!==original.name||s.personality!==original.personality||s.fatigueRate!==original.fatigueRate))throw Error('Invalid applicant');if(typeof s.resting!=='boolean'||s.personality!==(original.personality||'steady')||s.fatigueRate!==(original.fatigueRate||1)||s.role!==original.role||s.skill!==original.skill||s.wage!==original.wage||s.fatigue<0||s.fatigue>100||s.name.length>80)throw Error('Invalid employee');if(s.roomId!==null&&!data.rooms.some(r=>r.id===s.roomId&&r.staffId===s.id&&ROOMS[r.type].role===s.role))throw Error('Invalid assignment');}
  for(const r of data.rooms){if(r.staffId!==null&&!data.staff.some(s=>s.id===r.staffId&&s.roomId===r.id))throw Error('Invalid staffing');if(r.patientId!==null&&!data.patients.some(p=>p.id===r.patientId&&p.targetRoom===r.id&&['called','inside','service','roomExit'].includes(p.state)))throw Error('Invalid occupant');}
  for(const p of data.patients){if(p.name.length>80||p.x<0||p.x>24||p.y<0||p.y>18||p.patience<0||p.patience>100)throw Error('Invalid patient bounds');if(p.targetRoom!==null&&!data.rooms.some(r=>r.id===p.targetRoom))throw Error('Invalid target');if(['called','inside','service','roomExit'].includes(p.state)&&!data.rooms.some(r=>r.id===p.targetRoom&&r.patientId===p.id))throw Error('Invalid service');}
  for(let i=0;i<data.rooms.length;i++)for(let j=i+1;j<data.rooms.length;j++){const a=data.rooms[i],b=data.rooms[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)throw Error('Overlapping rooms');}
  if(data.logs.length>12||!data.logs.every(l=>isNum(l.id)&&isNum(l.time)&&typeof l.code==='string'&&typeof l.extra==='string'))throw Error('Invalid log');
  const fields=['queueSerial','callSerial','calls','version','mode','level','rng','clock','day','cash','rep','cured','failed','left','cleanliness','rooms','staff','patients','logs','id','income','expenses','construction','completed','project','event','nextEvent','arrivalTimer','won','over','ledger','admissionsOpen','calendar','year','month','yearStart','accountOrigin','financialYears','records','patientSerial','tutorial','contracts','financing','modifiers','eventsSeen','curedByRoom','recruitmentRound','applicantIds'];
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
  for(const record of data.records){if(!['priorityRoutine','priorityUrgent'].includes(record.priority)||record.occupation<0||record.occupation>7||record.insurance<0||record.insurance>2||record.allergy<0||record.allergy>3||record.variant<0||record.variant>2||record.age<0||record.age>120||record.admittedYear<1||record.admittedMonth<1||record.admittedMonth>12||Math.abs(record.bill-record.diagnosisCharge-record.treatmentCharge)>.001)throw Error('Invalid patient details');for(const event of record.timeline){if(!Number.isInteger(event.year)||event.year<1||!Number.isInteger(event.month)||event.month<1||event.month>12||event.roomType!==null&&!Object.hasOwn(ROOMS,event.roomType)||event.roomId!==null&&!Number.isInteger(event.roomId)||!['arrived','registered','diagnosed','called','serviceStarted','cured','failed','left','discharged','legacyRecord'].includes(event.code))throw Error('Invalid care timeline');}}
  if(data.patientSerial<maxSerial||data.patients.some(p=>{const record=data.records.find(r=>r.id===p.id);return !record||record.illness!==p.illness||record.name!==p.name||record.dischargedAt!==null;}))throw Error('Mismatched patient identity');
  if(data.patients.some(p=>!recordIds.has(p.id))||data.id<Math.max(0,...recordIds))throw Error('Missing patient chart');
  if(!isNum(data.financing)||!Array.isArray(data.contracts)||!data.contracts.every(c=>Number.isInteger(c.months)&&c.months>0&&c.months<=8)||!Array.isArray(data.modifiers)||!data.modifiers.every(m=>m.kind==='paperwork'&&isNum(m.endsAt))||!Array.isArray(data.eventsSeen)||!data.eventsSeen.every(id=>EVENTS.some(e=>e.id===id))||!data.curedByRoom||!Object.entries(data.curedByRoom).every(([k,v])=>Object.hasOwn(ROOMS,k)&&Number.isInteger(v)&&v>=0))throw Error('Invalid management state');
  if(data.financing!==1500*data.contracts.reduce((sum,c)=>sum+c.months,0)||Object.values(data.curedByRoom).reduce((sum,n)=>sum+n,0)>data.cured)throw Error('Inconsistent financing or treatment counters');
  if(!Number.isInteger(data.recruitmentRound)||data.recruitmentRound<0||data.recruitmentRound>10000||!Array.isArray(data.applicantIds)||new Set(data.applicantIds).size!==data.applicantIds.length||data.applicantIds.some(id=>!candidate(id)||candidate(id).round!==data.recruitmentRound||data.staff.some(s=>s.applicantId===id)))throw Error('Invalid recruitment');
  const hiredIds=data.staff.filter(s=>s.applicantId).map(s=>s.applicantId);if(new Set(hiredIds).size!==hiredIds.length)throw Error('Duplicate employment');
  const reservations=new Set();for(const p of data.patients){if(p.seatRoom!==null){const r=data.rooms.find(r=>r.id===p.seatRoom&&r.type==='waiting');if(!r||!['seatTravel','seated'].includes(p.state)||!Number.isInteger(p.seatIndex)||p.seatIndex<0||p.seatIndex>=Game.prototype.seats.call(null,r).length||reservations.has(`${p.seatRoom}:${p.seatIndex}`))throw Error('Invalid seat');reservations.add(`${p.seatRoom}:${p.seatIndex}`);}else if(['seatTravel','seated'].includes(p.state)||p.seatIndex!==null)throw Error('Missing seat');}
  if(!Number.isInteger(data.queueSerial)||data.queueSerial<0||!Number.isInteger(data.callSerial)||data.callSerial<0||!Array.isArray(data.calls)||data.calls.length>12||data.calls.some((c,i)=>!Number.isInteger(c.id)||c.id>data.callSerial||i>0&&c.id<=data.calls[i-1].id||!recordIds.has(c.patientId)||typeof c.name!=='string'||!isNum(c.time)||!Object.hasOwn(ROOMS,c.roomType)))throw Error('Invalid calls');
  for(const r of data.rooms)if(!isNum(r.doorOpen)||r.doorOpen<0||r.doorOpen>1||typeof r.doorHeld!=='boolean')throw Error('Invalid door');
  for(const p of data.patients)if(typeof p.registered!=='boolean'||['diagnosis','treatment'].includes(p.stage)&&!p.registered||p.age!==data.records.find(r=>r.id===p.id).age||p.child!==(p.age<16)||!Number.isInteger(p.queueOrder)||p.queueOrder<0||p.queueOrder>data.queueSerial||p.calledAt!==null&&!isNum(p.calledAt)||p.state==='called'&&!isNum(p.calledAt))throw Error('Invalid appointment');
  const g=Object.create(Game.prototype);for(const field of fields)g[field]=JSON.parse(JSON.stringify(data[field]));
  for(const s of g.staff)if(!Object.hasOwn(s,'manualPlacement')&&!Object.hasOwn(s,'awaitingPlacement')){s.manualPlacement=false;s.awaitingPlacement=false;}
  for(const r of g.rooms)if(g.path(ENTRY,g.door(r))===null)throw Error('Inaccessible room');
  if(g.version===5){validateStaff(g);furnishing.migrateFurniture(g);}else{furnishing.validateFurniture(g);validateStaff(g);}
  g.assignStaff();return g;
 }
}
