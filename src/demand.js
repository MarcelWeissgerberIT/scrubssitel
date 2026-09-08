import {ILLNESSES,ROOMS} from './content.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DEMAND={firstArrival:8,startInterval:26,growthSeconds:300,resumeDelay:5,maxActive:12,reviewWeight:.18};
const assigned=(g,type)=>g.rooms.filter(r=>r.type===type&&g.roomReady(r)&&g.staff.some(s=>s.id===r.staffId&&s.roomId===r.id&&s.role===ROOMS[type].role&&!s.awaitingPlacement));
const availableWorker=(g,r)=>{const s=g.staff.find(s=>s.id===r.staffId);return !!s&&!s.resting&&!s.breakPending&&['work','travelWork'].includes(s.state);};
const capacity=(g,rooms)=>rooms.reduce((sum,r)=>sum+(1+(r.level-1)*.2)*(availableWorker(g,r)?1:.35),0);

export function patientHappiness(g,p){
 const outcome=g.record(p.id)?.outcome;
 let happiness=.75*clamp(p.patience,0,100)+.25*clamp(g.cleanliness,0,100);
 if(outcome==='cured')happiness+=5;
 if(outcome==='failed')happiness=Math.min(happiness-35,50);
 if(outcome==='left')happiness=Math.min(happiness,20);
 return clamp(happiness,0,100);
}

export function reviewVisit(g,p){
 const record=g.record(p.id);if(!record||record.rating!==null||!record.outcome)return;
 const rating=patientHappiness(g,p);record.rating=rating;g.ratings++;
 g.satisfaction+=(rating-g.satisfaction)*DEMAND.reviewWeight;
 g.rep=clamp(g.rep+clamp((rating-60)/30,-2,1.2),0,100);
}

export function eligibleIllnesses(g){
 const max=g.mode==='sandbox'?6:g.mode==='tutorial'?2:g.level*2;
 return ILLNESSES.slice(0,max).filter(i=>assigned(g,i.room).length);
}

export function getDemandStatus(g){
 const patients=g.patients.filter(p=>p.stage!=='exit'),active=patients.length;
 const reception=assigned(g,'reception'),diagnosis=assigned(g,'gp'),illnesses=eligibleIllnesses(g),types=[...new Set(illnesses.map(i=>i.room))],treatment=types.flatMap(type=>assigned(g,type));
 const bottleneck=Math.min(capacity(g,reception),capacity(g,diagnosis),capacity(g,treatment));
 const limit=clamp(Math.floor(3+2*bottleneck),3,DEMAND.maxActive);
 const current=active?patients.reduce((sum,p)=>sum+patientHappiness(g,p),0)/active:g.satisfaction;
 const happiness=clamp(.6*g.satisfaction+.4*current,0,100);
 const phase=g.clock<60?'starting':g.clock<DEMAND.growthSeconds?'growing':'established';
 const growth=clamp((g.clock-60)/(DEMAND.growthSeconds-60),0,1)*clamp(g.ratings/8,0,1);
 const quality=clamp((happiness-55)/35,0,1);
 const mature=clamp(20-4*quality-3*Math.max(0,bottleneck-1)-2*Math.max(0,types.length-1),10,24);
 const interval=DEMAND.startInterval+(mature-DEMAND.startInterval)*growth+(1-quality)*8*growth;
 let reason=!g.admissionsOpen||g.over?'closed':!reception.length?'noReception':!diagnosis.length?'noDiagnosis':!treatment.length?'noTreatment':null;
 if(!reason&&(!reception.some(r=>availableWorker(g,r))||!diagnosis.some(r=>availableWorker(g,r))||!treatment.some(r=>availableWorker(g,r))))reason='staffBreak';
 if(!reason&&active>=limit)reason='backlog';
 return {phase,interval,active,limit,paused:!!reason,reason,happiness,ratings:g.ratings};
}

// All public admission sources share this gate. A declined visit consumes no RNG.
export function admitPatient(g,illnessId){
 const status=getDemandStatus(g);if(status.paused)return null;
 const choices=eligibleIllnesses(g).filter(i=>(!illnessId||i.id===illnessId)&&assigned(g,i.room).some(r=>availableWorker(g,r)));
 if(!choices.length)return null;
 const illness=illnessId||choices[Math.floor(g.random()*choices.length)].id;
 return g.spawnPatient(illness);
}
