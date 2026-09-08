import {ROOMS} from './content.js';
import {waitingComfort} from './objects.js';
import {roomReady} from './furnishing.js';

const text=(en,de)=>({en,de});
const format=(value,unit)=>`${Number(value.toFixed(2))}${unit?' '+unit:''}`;
const treatmentTypes=new Set(['pharmacy','therapy','surgery']);

// Read-only comparison of the current room and the exact next upgrade. Room
// factors are separate from staff/research factors; success uses the engine.
export function roomUpgradeInfo(game,room){
 const spec=ROOMS[room?.type];
 if(!spec||!Number.isInteger(room.level)||room.level<1||room.level>3)return null;
 const currentLevel=room.level,maxLevel=3,nextLevel=Math.min(maxLevel,currentLevel+1),atMax=currentLevel===maxLevel;
 const cost=atMax?null:Math.round(spec.cost*.65*currentLevel);
 const monthlyBefore=Math.round(spec.cost*.025*currentLevel),monthlyAfter=Math.round(spec.cost*.025*nextLevel);
 const draft=!roomReady(room),affordable=!atMax&&game.cash>=cost,effects=[],notes=[];
 const add=(id,en,de,before,after,unit='%')=>effects.push({id,label:text(en,de),before:format(before,unit),after:format(after,unit)});
 if(!atMax){
  if(spec.time>0){
   add('serviceSpeed','Room work speed, including condition','Arbeitstempo des Raums, mit Zustand',100*(1+.25*(currentLevel-1))*(room.condition/200+.5),100*(1+.25*(nextLevel-1)));
   notes.push(text('Room speed is relative to level 1 at full condition; staff, fatigue and research apply separately.','Raumtempo relativ zu Stufe 1 bei vollem Zustand; Personal, Müdigkeit und Forschung wirken zusätzlich.'));
  }
  if(treatmentTypes.has(room.type)){
   add('success','Treatment success at current clinic values','Heilchance bei aktuellen Klinikwerten',100*game.success(room),100*game.success({...room,level:nextLevel,condition:100}));
   add('treatmentFee','Treatment fee, share of the base tariff','Behandlungsgebühr, Anteil am Grundtarif',100*(1+.1*(currentLevel-1)),100*(1+.1*(nextLevel-1)));
   if(!game.staff.some(s=>s.id===room.staffId))notes.push(text('Without assigned staff, success uses the engine’s standard skill of 1.','Ohne zugewiesenes Personal rechnet die Heilchance mit dem Standardkönnen 1.'));
  }
  if(room.type==='gp')notes.push(text('The diagnosis fee stays unchanged.','Die Diagnosegebühr bleibt unverändert.'));
  if(room.type==='reception')notes.push(text('Registration stays free.','Die Anmeldung bleibt kostenlos.'));
  if(room.type==='lab'){
   add('researchSpeed','This lab’s research speed factor','Forschungstempo-Faktor dieses Labors',100*(1+.3*(currentLevel-1)),100*(1+.3*(nextLevel-1)));
   notes.push(text('Applies while this lab is researching, multiplied by staff skill. Condition and fatigue do not change research speed.','Gilt, wenn dieses Labor forscht, multipliziert mit dem Können des Personals. Zustand und Müdigkeit ändern das Forschungstempo nicht.'));
   const activeLab=game.rooms.find(r=>r.type==='lab'&&game.staffReady(game.staff.find(s=>s.id===r.staffId)));
   if(activeLab&&activeLab.id!==room.id)notes.push(text('Another staffed lab currently has research priority.','Ein anderes besetztes Labor hat derzeit Vorrang bei der Forschung.'));
  }
  if(room.type==='lounge'){
   add('recovery','Fatigue recovered during a seated break','Erholung bei einer sitzenden Pause',2.3*(1+.3*(currentLevel-1)),2.3*(1+.3*(nextLevel-1)),'/ s');
   notes.push(text('Only seated breaks use this rate; standing breaks stay at 0.65 per second.','Nur sitzende Pausen nutzen diesen Wert; Pausen im Stehen bleiben bei 0.65 pro Sekunde.'));
  }
  if(room.type==='waiting'){
   const comfort=waitingComfort(room),loss=level=>100*Math.max(.2,.35-(level-1)*.05)*comfort;
   add('seatedPatience','Adult seated patience loss, relative to standing','Geduldsverlust im Sitzen, Erwachsene gegenüber Stehen',loss(currentLevel),loss(nextLevel));
   if(room.furniture?.some(f=>f.kind==='toys'))add('childPatience','Child seated patience loss, with play corner','Geduldsverlust sitzender Kinder, mit Spielecke',loss(currentLevel)*.65,loss(nextLevel)*.65);
   notes.push(text('Includes this room’s comfort furniture. Clinic-wide patience factors apply additionally. The upgrade adds no seats.','Komfortmöbel dieses Raums sind eingerechnet. Klinikweite Geduldsfaktoren wirken zusätzlich. Der Ausbau schafft keine weiteren Sitze.'));
  }
  if(room.type==='toilet'){
   const otherBest=Math.max(0,...game.rooms.filter(r=>r.id!==room.id&&r.type==='toilet'&&roomReady(r)).map(r=>r.level));
   const loss=level=>100*(.72-(Math.max(otherBest,level)-1)*.1);
   add('toiletPatience','Clinic-wide patience loss from restrooms','Klinikweiter Geduldsverlust durch WC-Komfort',loss(currentLevel),loss(nextLevel));
   notes.push(text('Only the highest-level finished restroom counts. Other restrooms do not stack.','Es zählt nur das fertiggestellte WC mit der höchsten Stufe. Mehrere WCs addieren sich nicht.'));
   if(otherBest>=nextLevel)notes.push(text('Another restroom already provides this comfort; this upgrade adds no clinic-wide patience benefit.','Ein anderes WC bietet diesen Komfort bereits; der Ausbau bringt klinikweit keinen weiteren Geduldsvorteil.'));
  }
  if(room.condition<100)add('condition','Room condition after the upgrade','Raumzustand nach dem Ausbau',room.condition,100);
 }
 return {cost,maxLevel,currentLevel,nextLevel,atMax,draft,affordable,canUpgrade:!atMax&&affordable,monthlyBefore,monthlyAfter,monthlyIncrease:monthlyAfter-monthlyBefore,effects,
  draftNote:draft?text('This room is a draft. These operating values compare the levels after it is finished; upgrading does not finish or furnish the room.','Dieser Raum ist ein Entwurf. Die Betriebswerte vergleichen die Stufen nach der Fertigstellung; ein Ausbau stellt den Raum weder fertig noch richtet er ihn ein.'):null,
  note:notes.length?text(notes.map(n=>n.en).join(' '),notes.map(n=>n.de).join(' ')):null};
}
