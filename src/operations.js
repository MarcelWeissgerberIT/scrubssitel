const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const SHIFT_SECONDS=120;
export const TRAINING={
 expertise:{name:{en:'Professional skills',de:'Fachwissen'},desc:{en:'+8 skill points per level, for work and research.',de:'+8 Könnenpunkte je Stufe für Arbeit und Forschung.'},cost:1000,duration:45,roles:['receptionist','doctor','nurse','surgeon','janitor']},
 stamina:{name:{en:'Sustainable working',de:'Kräfte einteilen'},desc:{en:'12% less work fatigue per level.',de:'12 % weniger Arbeitsmüdigkeit je Stufe.'},cost:900,duration:45,roles:['receptionist','doctor','nurse','surgeon','janitor']},
 care:{name:{en:'Treatment quality',de:'Behandlungsqualität'},desc:{en:'+3 percentage points treatment success per level.',de:'+3 Prozentpunkte Heilchance je Stufe.'},cost:1400,duration:60,roles:['doctor','nurse','surgeon']}
};
export function defaultOperations(){return {admissionLimit:12,hours:{enabled:false,open:8,close:18}};}
export function initTraining(s){s.training={expertise:0,stamina:0,care:0};s.trainingCourse=null;}
function validOperations(value){return value&&Number.isInteger(value.admissionLimit)&&value.admissionLimit>=1&&value.admissionLimit<=12&&value.hours&&typeof value.hours.enabled==='boolean'&&['open','close'].every(key=>Number.isInteger(value.hours[key])&&value.hours[key]>=0&&value.hours[key]<24)&&value.hours.open!==value.hours.close;}
export function setOperations(g,changes){
 const current=g.operations||defaultOperations(),next={admissionLimit:changes?.admissionLimit??current.admissionLimit,hours:{...current.hours,...changes?.hours}};
 if(!validOperations(next))return {error:'operationsInvalid'};g.operations=next;return {operations:next};
}
export function operationStatus(g){
 const settings=g.operations||defaultOperations(),hour=((g.clock%SHIFT_SECONDS)+SHIFT_SECONDS)%SHIFT_SECONDS/SHIFT_SECONDS*24,{enabled,open,close}=settings.hours;
 const within=open<close?hour>=open&&hour<close:hour>=open||hour<close;
 return {hour,open:!enabled||within,admissionLimit:settings.admissionLimit,hours:{...settings.hours}};
}
export function trainingEffects(s){const levels=s?.training||{};return {skillBonus:.08*(levels.expertise||0),fatigueMultiplier:1-.12*(levels.stamina||0),successBonus:.03*(levels.care||0)};}
export function effectiveSkill(s){return (s?.skill||1)+trainingEffects(s).skillBonus;}
export function trainingQuote(g,id,track){
 const staff=g.staff.find(s=>s.id===id),spec=TRAINING[track],level=(staff?.training?.[track]||0)+1;
 const quote={error:null,staff,track,level,cost:spec?spec.cost*level:0,duration:spec?spec.duration+(level-1)*15:0};
 if(!staff||!spec||!spec.roles.includes(staff.role))quote.error='trainingInvalid';
 else if(level>2)quote.error='trainingMax';
 else if(staff.trainingCourse)quote.error='trainingBusy';
 else if(!g.admissionsOpen||g.over||g.event)quote.error='trainingUnavailable';
 else if(g.cash<quote.cost)quote.error='notEnough';
 return quote;
}
export function startTraining(g,id,track){
 const quote=trainingQuote(g,id,track);if(quote.error)return {error:quote.error};
 const s=quote.staff;if(!s.training)initTraining(s);
 s.trainingCourse={track,level:quote.level,progress:0};g.cash-=quote.cost;g.expenses+=quote.cost;
 if(!s.awaitingPlacement&&!s.resting)g.requestBreak(id);
 g.log('trainingStarted',s.name);return {staff:s,cost:quote.cost};
}
// Called by the staff update. A committed appointment/job finishes before the
// normal break route starts; a course holds that break until progress completes.
export function updateTraining(g,s,dt){
 const course=s.trainingCourse;if(!course||dt<=0||!g.admissionsOpen||s.job||s.path.length||g.room(s.roomId)?.patientId)return false;
 if(s.state!=='break'&&!(s.awaitingPlacement&&s.state==='idle'))return false;
 const spec=TRAINING[course.track],duration=spec.duration+(course.level-1)*15;
 course.progress=clamp(course.progress+dt,0,duration);
 if(course.progress+1e-8<duration)return false;
 s.training[course.track]=course.level;s.trainingCourse=null;g.log('trainingDone',s.name);return true;
}
export function migrateOperations(g){
 if(!Object.hasOwn(g,'operations'))g.operations=defaultOperations();
 for(const s of g.staff)if(!Object.hasOwn(s,'training')&&!Object.hasOwn(s,'trainingCourse'))initTraining(s);
}
export function validateOperations(g){
 if(!validOperations(g.operations))throw Error('Invalid clinic operations');
 for(const s of g.staff){
  if(!s.training||Object.keys(s.training).length!==3||Object.entries(TRAINING).some(([key,spec])=>!Number.isInteger(s.training[key])||s.training[key]<0||s.training[key]>2||s.training[key]>0&&!spec.roles.includes(s.role)))throw Error('Invalid staff training');
  const c=s.trainingCourse;if(c===null)continue;
  const spec=c&&TRAINING[c.track],duration=spec?spec.duration+(c.level-1)*15:0;
  if(!spec||!spec.roles.includes(s.role)||c.level!==s.training[c.track]+1||c.level>2||!Number.isFinite(c.progress)||c.progress<0||c.progress>=duration)throw Error('Invalid training course');
 }
}
