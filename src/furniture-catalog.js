import {FURNITURE,requirements,satisfiesRequirement} from './objects.js';
export const CATALOG_FILTERS=['all','required','seating','care','comfort','decor'];
const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const comfort=new Set(['toys','books','coffee','water-cooler','newspaper-rack','gumball-machine']);
const care=new Set(['sink','toilet','toilet-cubicle','cabinet','exam-couch','treatment-trolley','privacy-screen','glass-partition','sanitizer','pedal-bin']);
export function catalogMatches(kind,spec,roomType,category){
 if(category==='all')return true;
 if(category==='required')return requirements(roomType).some(req=>req.kind==='seat'?spec.ports.some(p=>p.kind==='seat'):satisfiesRequirement(kind,req.kind));
 if(category==='seating')return spec.ports.some(p=>p.kind==='seat');
 if(category==='care')return spec.ports.some(p=>p.kind==='work')||care.has(kind);
 if(category==='comfort')return !!spec.vending||comfort.has(kind);
 return !catalogMatches(kind,spec,roomType,'seating')&&!catalogMatches(kind,spec,roomType,'care')&&!catalogMatches(kind,spec,roomType,'comfort');
}
export function filterFurniture(roomType,{query='',category='all',affordable=false,cash=Infinity}={}){
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 return Object.entries(FURNITURE).filter(([kind,spec])=>{
  if(!spec.rooms.includes(roomType)||affordable&&spec.cost>cash||!catalogMatches(kind,spec,roomType,CATALOG_FILTERS.includes(category)?category:'all'))return false;
  const words=normalize([kind,...Object.values(spec.name||{}),...Object.values(spec.desc||{})].join(' '));return terms.every(term=>words.includes(term));
 });
}
