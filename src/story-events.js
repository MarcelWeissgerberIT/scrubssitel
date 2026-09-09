export function initStory(){return {queue:[],completed:[],recurringStarted:false,inspectionStarted:false,nextId:1};}
const clamp=n=>Math.max(0,Math.min(100,n));
function schedule(g,kind,delay){const entry={id:g.story.nextId++,kind,at:g.clock+delay,patientId:null};g.story.queue.push(entry);return entry;}
export function scenarioRules(g){return g.mode!=='campaign'?{arrivalMultiplier:1,therapyWeight:1,surgeryWeight:1,faultInterval:240}:{arrivalMultiplier:g.level===1?1.08:1,therapyWeight:g.level===2?2:1,surgeryWeight:g.level===3?2:1,faultInterval:g.level===3?180:240};}
export function storyChoice(g,effect){
 if(effect==='mafiaLoan')schedule(g,'mafiaFavor',120);
 if(effect==='mafiaCare')schedule(g,'mafiaVisit',12);
 if(effect==='followUp')schedule(g,'returnVisit',15);
 if(effect==='inspectionFollowUp')schedule(g,'inspectionResult',90);
}
export function updateStory(g){
 const story=g.story;
 if(g.mode==='campaign'&&g.cured>=3&&!story.recurringStarted){story.recurringStarted=true;schedule(g,'returningPatient',60);}
 if(g.mode==='campaign'&&g.clock>=270&&!story.inspectionStarted){story.inspectionStarted=true;schedule(g,'unannouncedInspection',15);}
 for(const item of [...story.queue]){
  if(g.clock<item.at)continue;
  if(['mafiaFavor','returningPatient','unannouncedInspection'].includes(item.kind)){if(g.event)continue;g.event=item.kind;complete(g,item);break;}
  if(item.kind==='inspectionResult'){
   const passed=g.cleanliness>=80&&g.maintenance.faults.length===0;
   if(passed){g.cash+=500;g.income+=500;g.rep=clamp(g.rep+2);}else{g.cash-=350;g.expenses+=350;g.rep=clamp(g.rep-2);}g.log(passed?'inspectionPassed':'inspectionFailed');complete(g,item);
  }else if(['mafiaVisit','returnVisit'].includes(item.kind)){
   if(item.patientId===null){const p=g.admitPatient('jitters');if(!p){item.at=g.clock+5;continue;}p.name=item.kind==='mafiaVisit'?'Don Fusilli':'Robin Again';g.record(p.id).name=p.name;item.patientId=p.id;}
   const record=g.record(item.patientId);if(record?.dischargedAt!==null&&record?.dischargedAt!==undefined){if(record.outcome==='cured'){const reward=item.kind==='mafiaVisit'?1500:250;g.cash+=reward;g.income+=reward;g.rep=clamp(g.rep+1);g.log('storyThanks',record.name);}else{g.rep=clamp(g.rep-1);g.log('storyConcern',record.name);}complete(g,item);}
  }
 }
}
function complete(g,item){g.story.queue=g.story.queue.filter(q=>q.id!==item.id);g.story.completed.push(item.id);g.story.completed=g.story.completed.slice(-100);}
export function validateStory(g){const s=g.story;if(!s||!Array.isArray(s.queue)||!Array.isArray(s.completed)||s.queue.length>20||s.completed.length>100||typeof s.recurringStarted!=='boolean'||typeof s.inspectionStarted!=='boolean'||!Number.isSafeInteger(s.nextId)||s.nextId<1)throw Error('Invalid story');const ids=[...s.completed,...s.queue.map(q=>q.id)];if(new Set(ids).size!==ids.length||ids.some(id=>!Number.isInteger(id)||id<1||id>=s.nextId))throw Error('Invalid story ids');for(const q of s.queue)if(!['mafiaFavor','mafiaVisit','returningPatient','returnVisit','unannouncedInspection','inspectionResult'].includes(q.kind)||!Number.isFinite(q.at)||q.at<0||q.patientId!==null&&!g.record(q.patientId))throw Error('Invalid story consequence');}
