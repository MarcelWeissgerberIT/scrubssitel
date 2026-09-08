// One registry drives furniture, seat reservations, hit targets and explanations.
export const OBJECT_INFO={
 door:[['Quiet please door','Bitte-leise-Tür'],['Opens automatically for arrivals, called patients and staff. Holding it open never changes the waiting order.','Öffnet für Ankommende, aufgerufene Patienten und Personal. Offenhalten ändert niemals die Warteliste.']],
 chair:[['Cloud cushion chair','Wolkenpolster-Stuhl'],['One reserved seat. Sitting slows patience loss. The cushion has heard everything.','Ein reservierbarer Sitzplatz. Sitzen senkt den Geduldsverlust. Das Kissen hat schon alles gehört.']],
 sofa:[['The patience sofa','Geduldssofa'],['Cushioned seats, no wrestling over the remote. In waiting rooms they reduce patience loss; the staff room helps staff recover.','Polsterplätze, kein Streit um die Fernbedienung. Im Wartebereich senken sie den Geduldsverlust; im Personalraum erholen sich Mitarbeiter.']],
 toys:[['Tiny trouble corner','Mini-Chaos-Ecke'],['Blocks, a toy duck and a picture book. Children seated in this waiting room lose 35% less patience. No batteries. Miracles happen.','Bauklötze, Spielente und Bilderbuch. Sitzende Kinder verlieren hier 35 % weniger Geduld. Ohne Batterien. Es gibt Wunder.']],
 books:[['Very old news','Nachrichten von vorgestern'],['A little reading table. The magazines are decorative; nobody has solved the crossword since 1998.','Ein Lesetisch. Die Hefte sind Dekoration; das Kreuzworträtsel ist seit 1998 ungelöst.']],
 plant:[['Dr. Leaf','Dr. Blatt'],['Decorative greenery. Excellent listener, still no medical license.','Dekoratives Grün. Hervorragender Zuhörer, weiterhin ohne Approbation.']],
 counter:[['Check-in counter','Anmeldetheke'],['A complete reception workplace with chair, monitor and bell. Keep both the staff approach and patient side accessible. Registration is free.','Ein vollständiger Empfangsplatz mit Stuhl, Monitor und Klingel. Personalzugang und Patientenseite müssen erreichbar bleiben. Die Anmeldung ist kostenlos.']],
 monitor:[['Queue commander','Wartelisten-Wächter'],['The registration list. Doctors call the oldest waiting appointment as soon as a room and its clinician are ready.','Die Anmeldeliste. Sobald Raum und Behandler frei sind, wird der älteste wartende Termin aufgerufen.']],
 bell:[['Ding, not a diagnosis','Ding ist keine Diagnose'],['The reception bell. Please ring with your finger, not your entire personality. Decorative; hiring reception staff makes registration work.','Die Empfangsglocke. Bitte mit dem Finger klingeln, nicht mit der gesamten Persönlichkeit. Dekoration; für die Anmeldung braucht es Personal.']],
 stool:[['Spin doctor stool','Dreh-und-Angel-Stuhl'],['A seat for staff. Staff recover fatigue during breaks in the staff room.','Ein Personalsitz. Müdigkeit erholt sich in Pausen im Personalraum.']],
 poster:[['Doctor Duck’s wall chart','Doktor Entes Wandbild'],['A cheerful reminder: wash your hands, then believe in the duck. Decorative clinic art.','Eine freundliche Erinnerung: Hände waschen, dann an die Ente glauben. Dekoration für die Klinik.']],
 clock:[['The appointment optimist','Der Termin-Optimist'],['The clinic clock runs while the hospital is open. It has never admitted to being behind schedule.','Die Klinikuhr läuft während der Öffnung. Sie behauptet weiterhin, im Zeitplan zu sein.']],
 gp:[['Quack-o-scan','Quak-o-skop'],['The doctor diagnoses imaginary ailments here. A spinning duck is reassuringly scientific. Upgrading the room speeds up consultations.','Hier diagnostiziert der Arzt Fantasiekrankheiten. Eine rotierende Ente wirkt überzeugend wissenschaftlich. Raumausbau beschleunigt die Sprechstunde.']],
 pharmacy:[['Decaf 3000','Entkoffeinator 3000'],['Nurses treat caffeine jitters and clipboard fever. Upgrade the room for faster treatment and a better cure chance.','Pflegekräfte behandeln Koffeinzittern und Klemmbrettfieber. Raumausbau verbessert Tempo und Heilungschance.']],
 therapy:[['Dream steamer','Traumpuster'],['A doctor treats daydreams that escaped their owner. Room upgrades improve treatment.','Ein Arzt behandelt Tagträume, die ihrem Besitzer entwischt sind. Raumausbau verbessert die Behandlung.']],
 surgery:[['Smile press','Grinsebügler'],['A surgeon irons out fictional beauty disasters. No real medical advice, just extremely confident machinery.','Eine Chirurgin bügelt erfundene Schönheitskatastrophen aus. Keine echte Medizin, nur sehr selbstbewusste Technik.']],
 lab:[['Duck science station','Entenforschungsstation'],['Assign a doctor and fund a research project. Rubber duck peer review is surprisingly strict.','Arzt einstellen und Forschungsprojekt finanzieren. Die Gummienten-Begutachtung ist überraschend streng.']],
 coffee:[['Staff fuel station','Personal-Tankstelle'],['The staff room speeds recovery during breaks. This decorative coffee machine takes morale very seriously.','Der Personalraum beschleunigt die Erholung in Pausen. Diese dekorative Kaffeemaschine nimmt die Stimmung sehr ernst.']],
 toilet:[['Porcelain throne','Porzellanthron'],['A restroom reduces patience loss throughout the clinic. Please do not schedule a board meeting here.','Toiletten senken den Geduldsverlust in der Klinik. Bitte keine Vorstandssitzung hier abhalten.']],
 sink:[['Bubble basin','Blubberbecken'],['Required in restrooms, optional in treatment rooms. Leave a clear approach for handwashing. The soap has an excellent attendance record.','Pflichtausstattung der Toilette, optional in Behandlungsräumen. Der Zugang zum Händewaschen muss frei bleiben. Die Seife glänzt mit Anwesenheit.']],
 cabinet:[['Extremely organized cupboard','Höchst organisierter Schrank'],['Decorative storage for supplies. The drawer marked miscellaneous contains everything.','Dekorativer Vorratsschrank. In der Schublade Sonstiges liegt alles.']]
};

// Positions in furniture records are local physical floor coordinates. Actors
// use the same world with a -.5 offset on each axis (the renderer adds it back).
const ALL=['reception','gp','pharmacy','therapy','surgery','lab','waiting','lounge','toilet'];
const solid=(w,h)=>[{part:'body',x:0,y:0,w,h}];
const device=(kind,cost)=>({rooms:[kind],w:1.25,h:1.25,z:1.7,cost,solids:solid(1.25,1.25),ports:[{kind:'work',x:1.75,y:.25,lookYaw:-Math.PI/2},...(kind==='lab'?[]:[{kind:'patient',x:1.75,y:1,lookYaw:-Math.PI/2}])]});
export const FURNITURE={
 counter:{rooms:['reception'],w:1.5,h:1.5,z:.57,cost:450,solids:[{part:'counter',x:0,y:.75,w:1.5,h:.75},{part:'stool',x:.5,y:0,w:.5,h:.5}],ports:[{kind:'work',x:.75,y:.25,lookYaw:0,seat:true,solidPart:'stool',approach:{x:.25,y:.25}},{kind:'patient',x:.75,y:1.75,lookYaw:Math.PI}],parts:[{kind:'stool',part:'stool',x:.5,y:0,w:.5,h:.5,z:.76,seatHeight:.32},{kind:'counter',part:'counter',x:0,y:.75,w:1.5,h:.75,z:.57},{kind:'monitor',part:'monitor',x:.85,y:1.0,w:.4,h:.2,z:.91},{kind:'bell',part:'bell',x:.15,y:1,w:.3,h:.3,z:.72}]},
 gp:device('gp',600),pharmacy:device('pharmacy',750),therapy:device('therapy',1100),surgery:device('surgery',1600),lab:device('lab',1000),
 chair:{rooms:['waiting','lounge'],w:.75,h:.75,z:.7,cost:80,solids:solid(.75,.75),ports:[{kind:'seat',x:.375,y:.375,lookYaw:0,seat:true,solidPart:'body',approach:{x:.375,y:1}}]},
 sofa:{rooms:['waiting','lounge'],w:1.75,h:.75,z:.7,cost:180,solids:solid(1.75,.75),ports:[{kind:'seat',x:.4375,y:.375,lookYaw:0,seat:true,solidPart:'body',approach:{x:.4375,y:1}},{kind:'seat',x:1.3125,y:.375,lookYaw:0,seat:true,solidPart:'body',approach:{x:1.3125,y:1}}]},
 toilet:{rooms:['toilet'],w:.75,h:1,z:.75,cost:180,solids:solid(.75,1),ports:[{kind:'use',x:.375,y:1.25,lookYaw:Math.PI}]},
 sink:{rooms:['toilet','gp','pharmacy','therapy','surgery','lab'],w:.75,h:.5,z:.72,cost:100,solids:solid(.75,.5),ports:[{kind:'use',x:.375,y:.75,lookYaw:Math.PI}]},
 coffee:{rooms:['lounge'],w:.75,h:.75,z:1.1,cost:140,solids:solid(.75,.75),ports:[{kind:'use',x:.375,y:1,lookYaw:Math.PI}]},
 toys:{rooms:['waiting'],w:1,h:.5,z:.45,cost:90,solids:solid(1,.5),ports:[]},
 books:{rooms:['waiting','lounge'],w:.75,h:.5,z:.4,cost:60,solids:solid(.75,.5),ports:[]},
 plant:{rooms:ALL,w:.5,h:.5,z:.85,cost:45,solids:solid(.5,.5),ports:[]},
 cabinet:{rooms:ALL,w:.75,h:.5,z:.85,cost:100,solids:solid(.75,.5),ports:[]},
 poster:{rooms:ALL,w:.5,h:.25,z:1.13,cost:25,wall:true,solids:[],ports:[]},
 clock:{rooms:ALL,w:.25,h:.25,z:1.13,cost:30,wall:true,solids:[],ports:[]}
};
for(const [kind,spec] of Object.entries(FURNITURE)){spec.name={en:OBJECT_INFO[kind][0][0],de:OBJECT_INFO[kind][0][1]};spec.desc={en:OBJECT_INFO[kind][1][0],de:OBJECT_INFO[kind][1][1]};if(spec.ports.some(p=>p.kind==='work'))spec.maxCount=1;}
export function requirements(type){const kinds=type==='reception'?['counter']:['gp','pharmacy','therapy','surgery','lab'].includes(type)?[type]:['waiting','lounge'].includes(type)?['seat']:type==='toilet'?['toilet','sink']:[];return kinds.map(kind=>({kind,need:1}));}
export function rotatedSize(spec,rotation=0){return rotation%2?{w:spec.h,h:spec.w}:{w:spec.w,h:spec.h};}
export function rotateLocal(point,w,h,rotation=0){const {x,y}=point;return rotation===1?{x:h-y,y:x}:rotation===2?{x:w-x,y:h-y}:rotation===3?{x:y,y:w-x}:{x,y};}
export function furniturePoint(r,f,point){const spec=FURNITURE[f.kind],p=rotateLocal(point,spec.w,spec.h,f.rotation);return {x:r.x+f.x+p.x,y:r.y+f.y+p.y};}
export function furnitureRect(r,f,rect){const corners=[{x:rect.x,y:rect.y},{x:rect.x+rect.w,y:rect.y},{x:rect.x,y:rect.y+rect.h},{x:rect.x+rect.w,y:rect.y+rect.h}].map(p=>furniturePoint(r,f,p)),x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));return {x,y,w:Math.max(...corners.map(p=>p.x))-x,h:Math.max(...corners.map(p=>p.y))-y};}
export function furniturePorts(r){const out=[];for(const f of r.furniture||[]){const spec=FURNITURE[f.kind];if(!spec)continue;for(const [localIndex,port] of spec.ports.entries()){const world=furniturePoint(r,f,port),approach=port.approach&&furniturePoint(r,f,port.approach);out.push({...port,id:`${r.id}:${f.id}:port-${localIndex}`,furnitureId:f.id,localIndex,x:world.x-.5,y:world.y-.5,lookYaw:(port.lookYaw||0)-f.rotation*Math.PI/2,approach:approach?{x:approach.x-.5,y:approach.y-.5}:null,solidId:port.solidPart?`${f.id}:${port.solidPart}`:null,purpose:port.kind==='seat'?r.type:port.kind});}}return out;}
export function legacyWaitingSeats(r){if(r.type!=='waiting')return [];const out=[],lane=r.x+Math.floor(r.w/2);for(let row=0;row<(r.h>=5?2:1);row++){for(let x=r.x+.3;x<lane-.7;x+=1.05)out.push({x,y:r.y+.45+row*1.8,kind:'chair'});const right=[];for(let x=lane+.85;x<=r.x+r.w-1;x+=.85)right.push(x);for(const x of right.slice(0,2))out.push({x,y:r.y+.45+row*1.8,kind:right.length>=2?'sofa':'chair'});}return out;}
export function waitingSeats(r){if(!Array.isArray(r.furniture))return legacyWaitingSeats(r);return r.type==='waiting'?furniturePorts(r).filter(p=>p.kind==='seat').map((p,index)=>({...p,index})):[];}
export function roomObjects(r){
 const out=[{id:`${r.id}:door`,roomId:r.id,furnitureId:null,kind:'door',x:r.x+Math.floor(r.w/2),y:r.y<8?r.y+r.h-.06:r.y-.06,w:1,h:.12,z:1.12,rotation:0,frame:null,local:null}];
 for(const f of r.furniture||[]){const spec=FURNITURE[f.kind];if(!spec)continue;const parts=spec.parts||[{kind:f.kind,part:'body',x:0,y:0,w:spec.w,h:spec.h,z:spec.z}];for(const part of parts){const frame={x:r.x+f.x,y:r.y+f.y,w:spec.w,h:spec.h,rotation:f.rotation},local={x:part.x,y:part.y,w:part.w,h:part.h};out.push({...part,...furnitureRect(r,f,part),id:`${r.id}:${f.id}:${part.part}`,roomId:r.id,furnitureId:f.id,rotation:f.rotation,frame,local,canonicalW:part.w,canonicalH:part.h,seats:spec.ports.filter(p=>p.kind==='seat').length||undefined});}}
 return out;
}
export function findObject(game,id){for(const r of game.rooms){const object=roomObjects(r).find(o=>o.id===id);if(object)return object;}return null;}
