import {CAST} from './content.js';
export const ROLES=['receptionist','doctor','nurse','surgeon','janitor'];
export const RECRUITMENT_FEE=250;
export const PERSONALITIES={
 steady:{en:'Steady hands. Labels the label maker. Normal fatigue.',de:'Ruhige Hand. Beschriftet den Beschrifter. Normale Ermüdung.'},
 rookie:{en:'Budget talent. Brings emergency biscuits. 20% less fatigue, 17% slower.',de:'Preiswertes Talent. Hat Notfallkekse. 20 % weniger Ermüdung, 17 % langsamer.'},
 star:{en:'Speed expert. Races the lift. 25% faster, 50% more fatigue.',de:'Tempo-Profi. Rennt gegen den Aufzug. 25 % schneller, 50 % mehr Ermüdung.'}
};
const names={receptionist:['Rosa Reed','Pippa Post','Enzo Bell'],doctor:['Dr. Milo Finch','Dr. Tessa Fern','Dr. Felix Park'],nurse:['Bea Bell','Luca Lemon','Cleo Patch'],surgeon:['Dr. Nia Bloom','Dr. Oona Peach','Dr. Hugo Glint'],janitor:['Otto Sparks','Mika Mop','Zoe Bolt']};
export function candidates(round=0){return ROLES.flatMap(role=>['steady','rookie','star'].map((personality,tier)=>{
 const castId=role==='doctor'&&tier===2?'park':{receptionist:'rosa',doctor:'milo',nurse:'bea',surgeon:'nia',janitor:'otto'}[role],base=CAST.find(c=>c.id===castId),anchor=CAST.find(c=>c.role===role);
 return {...base,id:`${round}-${role}-${tier}`,castId,round,personality,name:names[role][tier]+(round?' · '+(round+1):''),skill:Number((anchor.skill*[1,.83,1.25][tier]).toFixed(3)),wage:Math.round(anchor.wage*[1,.72,1.55][tier]),hire:Math.round(anchor.hire*[1,.65,1.6][tier]),fatigueRate:[1,.8,1.5][tier]};
}));}
export function candidate(id){if(typeof id!=='string'||!/^\d+-(receptionist|doctor|nurse|surgeon|janitor)-[0-2]$/.test(id))return null;const round=Number(id.split('-')[0]);if(!Number.isSafeInteger(round)||round>10000)return null;return candidates(round).find(c=>c.id===id);}
