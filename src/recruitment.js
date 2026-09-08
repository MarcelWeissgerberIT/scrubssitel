import {CAST} from './content.js';
export const ROLES=['receptionist','doctor','nurse','surgeon','janitor'];
export const RECRUITMENT_FEE=250;
export const PERSONALITIES={
 steady:{en:'Steady hands. Labels the label maker. Normal fatigue.',de:'Ruhige Hand. Beschriftet den Beschrifter. Normale Ermüdung.'},
 rookie:{en:'Budget talent. Brings emergency biscuits. 20% less fatigue, 17% slower.',de:'Preiswertes Talent. Hat Notfallkekse. 20 % weniger Ermüdung, 17 % langsamer.'},
 star:{en:'Speed expert. Races the lift. 25% faster, 50% more fatigue.',de:'Tempo-Profi. Rennt gegen den Aufzug. 25 % schneller, 50 % mehr Ermüdung.'}
};
// Authored fictional identities, independent of jobs, hairstyles and clothes.
// Named profiles keep their identity through new adverts and old save files.
export const STAFF_PROFILES={
 receptionist:[{name:'Rosa Reed',gender:'nonbinary'},{name:'Pippa Post',gender:'female'},{name:'Enzo Bell',gender:'male'}],
 doctor:[{name:'Dr. Milo Finch',gender:'male'},{name:'Dr. Tessa Fern',gender:'female'},{name:'Dr. Felix Park',gender:'male'}],
 nurse:[{name:'Bea Bell',gender:'female'},{name:'Luca Lemon',gender:'male'},{name:'Cleo Patch',gender:'female'}],
 surgeon:[{name:'Dr. Nia Bloom',gender:'female'},{name:'Dr. Oona Peach',gender:'female'},{name:'Dr. Hugo Glint',gender:'male'}],
 janitor:[{name:'Otto Sparks',gender:'male'},{name:'Mika Mop',gender:'nonbinary'},{name:'Zoe Bolt',gender:'female'}]
};
export function personGender(person){
 const id=person?.applicantId??(typeof person?.id==='string'?person.id:''),match=/^\d+-(receptionist|doctor|nurse|surgeon|janitor)-([0-2])$/.exec(id);
 if(match)return STAFF_PROFILES[match[1]][Number(match[2])].gender;
 const cast=CAST.find(c=>c.id===(person?.castId||id));
 return cast?.gender||null; // Patients have no authored gender; never infer it.
}
export function staffRoleLabel(person,lang='en'){
 const role=person?.role,gender=personGender(person);
 if(lang!=='de')return {receptionist:'Receptionist',doctor:'Doctor',nurse:'Nurse',surgeon:'Surgeon',janitor:'Maintenance'}[role]||role||'';
 return {receptionist:'Empfangskraft',doctor:gender==='female'?'Ärztin':gender==='male'?'Arzt':'Ärztliches Personal',nurse:'Pflegekraft',surgeon:gender==='female'?'Chirurgin':gender==='male'?'Chirurg':'Chirurgisches Personal',janitor:'Haustechnik'}[role]||role||'';
}
export function candidates(round=0){return ROLES.flatMap(role=>['steady','rookie','star'].map((personality,tier)=>{
 const castId=role==='doctor'&&tier===2?'park':{receptionist:'rosa',doctor:'milo',nurse:'bea',surgeon:'nia',janitor:'otto'}[role],base=CAST.find(c=>c.id===castId),anchor=CAST.find(c=>c.role===role);
 const profile=STAFF_PROFILES[role][tier];
 return {...base,...profile,id:`${round}-${role}-${tier}`,castId,round,personality,name:profile.name+(round?' · '+(round+1):''),skill:Number((anchor.skill*[1,.83,1.25][tier]).toFixed(3)),wage:Math.round(anchor.wage*[1,.72,1.55][tier]),hire:Math.round(anchor.hire*[1,.65,1.6][tier]),fatigueRate:[1,.8,1.5][tier]};
}));}
export function candidate(id){if(typeof id!=='string'||!/^\d+-(receptionist|doctor|nurse|surgeon|janitor)-[0-2]$/.test(id))return null;const round=Number(id.split('-')[0]);if(!Number.isSafeInteger(round)||round>10000)return null;return candidates(round).find(c=>c.id===id);}
