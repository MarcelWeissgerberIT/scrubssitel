export const tr = (value, lang='en') => typeof value==='object' ? value[lang] ?? value.en : value;
export const ROOMS = {
  waiting:{cost:900,role:null,time:0,color:'#f3d5a8',icon:'▥',name:{en:'Waiting area',de:'Wartebereich'},desc:{en:'Real seats, magazines from the future and a very patient plant. Seated patients lose 65% less patience. Larger rooms have more seats; upgrades improve comfort.',de:'Echte Sitzplätze, Zeitschriften aus der Zukunft und eine sehr geduldige Pflanze. Sitzende Patienten verlieren 65 % weniger Geduld. Größere Räume bieten mehr Plätze; Ausbauten erhöhen den Komfort.'}},
  reception:{cost:1600,role:'receptionist',time:2.5,color:'#e6b68a',icon:'▤',name:{en:'Reception',de:'Rezeption'},desc:{en:'First stop for every patient. Must be staffed by a receptionist.',de:'Erste Station für jeden Patienten. Muss von einer Empfangskraft besetzt sein.'}},
  gp: {cost:1400, role:'doctor', time:8, color:'#8dc9b5', icon:'✚', name:{en:'Diagnosis',de:'Diagnostik'}, desc:{en:'Every curious case starts here. Requires a doctor.',de:'Hier beginnt jeder kuriose Fall. Benötigt einen Arzt.'}},
  pharmacy:{cost:1800,role:'nurse',time:10,color:'#9fbce3',icon:'⚕',name:{en:'Pharmacy',de:'Apotheke'},desc:{en:'A spoonful of science. Requires a nurse.',de:'Ein Löffel Wissenschaft. Benötigt eine Pflegekraft.'}},
  therapy:{cost:2800,role:'doctor',time:13,color:'#c4a6d5',icon:'☁',name:{en:'Daydream clinic',de:'Tagtraumklinik'},desc:{en:'Turns overthinking into regular thinking. Requires a doctor.',de:'Macht aus Überdenken wieder Denken. Benötigt einen Arzt.'}},
  surgery:{cost:4200,role:'surgeon',time:17,color:'#e8b18c',icon:'✂',name:{en:'Odd surgery',de:'Kuriose Chirurgie'},desc:{en:'For the delightfully complicated cases. Requires a surgeon.',de:'Für wunderbar komplizierte Fälle. Benötigt einen Chirurgen.'}},
  lounge:{cost:900,role:null,time:0,color:'#ecd28f',icon:'☕',name:{en:'Staff lounge',de:'Pausenraum'},desc:{en:'Rested staff work faster and recover from burnout.',de:'Erholtes Personal arbeitet schneller und baut Stress ab.'}},
  toilet:{cost:650,role:null,time:0,color:'#a9c7ca',icon:'◈',name:{en:'Restrooms',de:'Toiletten'},desc:{en:'A little dignity. Keeps patients comfortable while they wait.',de:'Ein bisschen Würde. Hält wartende Patienten zufrieden.'}},
  lab:{cost:2600,role:'doctor',time:0,color:'#b8cc91',icon:'⚗',name:{en:'Research lab',de:'Forschungslabor'},desc:{en:'A doctor researches better treatments. Start a project under Research.',de:'Ein Arzt erforscht bessere Therapien. Starte ein Projekt unter Forschung.'}}
};
export const CAST = [
 {id:'rosa',name:'Rosa Reed',role:'receptionist',color:'#d48e50',portrait:5,skill:1.15,wage:140,hire:650,quote:{en:'“Name, symptoms, and your least dramatic explanation, please.”',de:'„Name, Symptome und bitte die am wenigsten dramatische Erklärung.“'},trait:{en:'Unflappable first impression',de:'Unerschütterlich am Empfang'}},
 {id:'milo',name:'Dr. Milo Finch',role:'doctor',color:'#4ba99b',portrait:0,skill:1.05,wage:150,hire:650,quote:{en:'“My diagnosis? An excellent learning opportunity.”',de:'„Meine Diagnose? Eine hervorragende Lernchance.“'},trait:{en:'Optimistic overthinker',de:'Optimistischer Grübler'}},
 {id:'bea',name:'Bea Bell',role:'nurse',color:'#668bc1',portrait:3,skill:1.1,wage:130,hire:550,quote:{en:'“I have a system. Please stop having symptoms in it.”',de:'„Ich habe ein System. Bitte keine Symptome darin.“'},trait:{en:'The actual boss',de:'Die eigentliche Chefin'}},
 {id:'otto',name:'Otto Sparks',role:'janitor',color:'#d3a73d',portrait:4,skill:1,wage:85,hire:350,quote:{en:'“That noise? The building is applauding.”',de:'„Das Geräusch? Das Gebäude applaudiert.“'},trait:{en:'Suspiciously resourceful',de:'Verdächtig erfinderisch'}},
 {id:'nia',name:'Dr. Nia Bloom',role:'surgeon',color:'#a275ac',portrait:1,skill:1.2,wage:230,hire:1300,quote:{en:'“Steady hands. Unsteady coffee budget.”',de:'„Ruhige Hände. Unruhiges Kaffeebudget.“'},trait:{en:'Cool under pressure',de:'Behält einen kühlen Kopf'}},
 {id:'park',name:'Dr. Felix Park',role:'doctor',color:'#8a9898',portrait:2,skill:1.3,wage:220,hire:1100,quote:{en:'“Wonderful. Another meeting that could be a nap.”',de:'„Wunderbar. Noch ein Meeting, das ein Nickerchen sein könnte.“'},trait:{en:'Professionally unimpressed',de:'Professionell unbeeindruckt'}}
];
export const ILLNESSES = [
 {id:'jitters',room:'pharmacy',fee:520,color:'#dfa645',name:{en:'Espresso tremolo',de:'Espresso-Tremolo'}},
 {id:'inbox',room:'pharmacy',fee:550,color:'#76adc6',name:{en:'Inbox inflammation',de:'Postfachentzündung'}},
 {id:'daydream',room:'therapy',fee:790,color:'#ae85c4',name:{en:'Chronic daydreaming',de:'Chronisches Tagträumen'}},
 {id:'main',room:'therapy',fee:840,color:'#a291c9',name:{en:'Main-character syndrome',de:'Hauptfiguren-Syndrom'}},
 {id:'funny',room:'surgery',fee:1250,color:'#d58c71',name:{en:'Dislocated funny bone',de:'Verrutschter Lachmuskel'}},
 {id:'ego',room:'surgery',fee:1350,color:'#d697a9',name:{en:'Inflatable ego',de:'Aufblasbares Ego'}}
];
export const LEVELS = [
 {id:1, cash:14000, goal:15, rep:62, days:0, arrival:8.5, name:{en:'The first shift',de:'Die erste Schicht'},desc:{en:'A small clinic. A big coffee problem. Cure 15 patients and earn 62 reputation.',de:'Eine kleine Klinik. Ein großes Kaffeeproblem. Heile 15 Patienten und erreiche 62 Ruf.'}},
 {id:2,cash:16500,goal:32,rep:70,days:0,arrival:7.5,name:{en:'A little off-script',de:'Neben der Spur'},desc:{en:'The city has its head in the clouds. Build a daydream clinic, cure 32 patients and reach 70 reputation.',de:'Die Stadt hat den Kopf in den Wolken. Baue eine Tagtraumklinik, heile 32 Patienten und erreiche 70 Ruf.'}},
 {id:3,cash:20500,goal:50,rep:78,days:0,arrival:6.5,name:{en:'Beautiful chaos',de:'Wunderbares Chaos'},desc:{en:'All departments, all the drama. Cure 50 patients and reach 78 reputation.',de:'Alle Stationen, das volle Drama. Heile 50 Patienten und erreiche 78 Ruf.'}}
];
export const PROJECTS = [
 {id:'care', cost:1700,time:65,name:{en:'Better bedside manner',de:'Besser am Krankenbett'},desc:{en:'+12% treatment success',de:'+12 % Behandlungserfolg'}},
 {id:'speed',cost:2300,time:85,name:{en:'Less paperwork',de:'Weniger Papierkram'},desc:{en:'Treatments are 20% faster',de:'Behandlungen sind 20 % schneller'}},
 {id:'patience',cost:1500,time:60,name:{en:'Surprisingly comfy chairs',de:'Überraschend bequeme Stühle'},desc:{en:'Patients wait 35% longer',de:'Patienten warten 35 % länger'}}
];
export const EVENTS = [
 {id:'coffee',name:{en:'The great decaf incident',de:'Der große Entkoffeinierungsfall'},text:{en:'Someone replaced the coffee with decaf. The staff have formed a very tired committee.',de:'Jemand hat den Kaffee durch entkoffeinierten ersetzt. Das Team hat einen sehr müden Ausschuss gegründet.'},choices:[{label:{en:'Emergency beans · $450',de:'Notfallbohnen · 450 $'},cost:450,effect:'energy'},{label:{en:'Call it a wellness day',de:'Zum Wellnesstag erklären'},cost:0,effect:'fatigue'}]},
 {id:'review',name:{en:'A critic in a dressing gown',de:'Ein Kritiker im Bademantel'},text:{en:'A local reviewer is judging your hospital entirely on its vibes and the firmness of its grapes.',de:'Ein lokaler Kritiker bewertet die Klinik ausschließlich nach Stimmung und Traubenfestigkeit.'},choices:[{label:{en:'Fresh fruit & flowers · $350',de:'Frisches Obst & Blumen · 350 $'},cost:350,effect:'rep'},{label:{en:'Let the care do the talking',de:'Die Pflege sprechen lassen'},cost:0,effect:'quality'}]},
 {id:'grant',name:{en:'A suspiciously nice donation',de:'Eine verdächtig nette Spende'},text:{en:'A former patient left you $900 and a drawing of a duck. There are no strings attached. We checked.',de:'Ein ehemaliger Patient schenkt euch 900 $ und eine Entenzeichnung. Ohne Haken. Wir haben nachgesehen.'},choices:[{label:{en:'Frame the duck · +$900',de:'Die Ente einrahmen · +900 $'},cost:-900,effect:'none'}]},
 {id:'rush',name:{en:'The office espresso contest',de:'Der Büro-Espressowettbewerb'},text:{en:'An office coffee contest has gone exactly as expected. Six jittery patients are on their way.',de:'Ein Büro-Kaffeewettbewerb lief genau wie erwartet. Sechs zittrige Patienten sind auf dem Weg.'},choices:[{label:{en:'Send them in · +$600 grant',de:'Herein damit · +600 $ Zuschuss'},cost:-600,effect:'rush'},{label:{en:'Refer them elsewhere · −3 reputation',de:'Weitervermitteln · −3 Ruf'},cost:0,effect:'refer'}]}
];
export const PATIENT_FACTS={
 occupation:[{en:'Teacher',de:'Lehrkraft'},{en:'Software developer',de:'Softwareentwickler'},{en:'Florist',de:'Florist'},{en:'Retired',de:'Im Ruhestand'},{en:'Chef',de:'Koch'},{en:'Bus driver',de:'Busfahrer'}],
 insurance:[{en:'CommonCare',de:'Miteinander Kasse'},{en:'City Health Plan',de:'Städtische Gesundheitskasse'},{en:'Self-paying',de:'Selbstzahler'}],
 allergy:[{en:'None known',de:'Keine bekannt'},{en:'Pollen',de:'Pollen'},{en:'Adhesive tape',de:'Pflasterkleber'},{en:'Nickel',de:'Nickel'}]
};
export const COMPLAINTS={
 jitters:{en:'“My hands are on their seventh espresso. I have only had six.”',de:'„Meine Hände sind beim siebten Espresso. Ich hatte erst sechs.“'},
 inbox:{en:'“I hear email notifications even when I am eating soup.”',de:'„Ich höre E-Mail-Töne, sogar beim Suppeessen.“'},
 daydream:{en:'“I came for my appointment. The rest of me is still on a beach.”',de:'„Ich bin zum Termin hier. Der Rest von mir liegt noch am Strand.“'},
 main:{en:'“Every time I enter a room, I expect background music.”',de:'„Wenn ich einen Raum betrete, erwarte ich Hintergrundmusik.“'},
 funny:{en:'“I laughed at a tax form and now my elbow tells jokes.”',de:'„Ich habe über ein Steuerformular gelacht. Jetzt erzählt mein Ellbogen Witze.“'},
 ego:{en:'“My confidence no longer fits through standard doorways.”',de:'„Mein Selbstbewusstsein passt nicht mehr durch normale Türen.“'}
};
EVENTS.push(
 {id:'mafia',name:{en:'An offer you can absolutely refuse',de:'Ein Angebot, das du durchaus ablehnen kannst'},text:{en:'Don Fusilli of the Towel Family offers $12,000 for your clinic. Eight monthly repayments of $2,250 follow: $18,000 in total. He calls the $6,000 interest “extra fluffy service”. Loans do not count as profit.',de:'Don Fusilli von der Handtuchfamilie bietet deiner Klinik 12.000 $. Danach folgen acht Monatsraten zu 2.250 $: insgesamt 18.000 $. Die 6.000 $ Zinsen nennt er „extra flauschigen Service“. Kredite zählen nicht als Gewinn.'},choices:[{label:{en:'Accept the loan · $18,000 repayment',de:'Kredit annehmen · 18.000 $ Rückzahlung'},cost:0,effect:'mafiaLoan'},{label:{en:'We already have towels, thank you',de:'Wir haben schon Handtücher, danke'},cost:0,effect:'none'}]},
 {id:'printer',name:{en:'The printer has become self-aware',de:'Der Drucker hat ein Bewusstsein entwickelt'},text:{en:'It will only print discharge letters in comic verse. Fixing it costs $900. Handwriting works too, but diagnosis takes 35% longer for two months.',de:'Er druckt Entlassungsbriefe nur noch als Schüttelreime. Eine Reparatur kostet 900 $. Handschrift geht auch, verlängert Diagnosen aber zwei Monate lang um 35 %.'},choices:[{label:{en:'A professional exorcism · $900',de:'Professionelle Austreibung · 900 $'},cost:900,effect:'none'},{label:{en:'Break out the pens · slower diagnosis',de:'Stifte raus · langsamere Diagnostik'},cost:0,effect:'paperwork'}]},
 {id:'inspection',name:{en:'The extremely serious rubber-duck inspection',de:'Die äußerst ernste Gummienten-Inspektion'},text:{en:'An inspector has arrived with a clipboard and a duck. A deep clean costs $700 and earns 3 reputation. Otherwise, your current cleanliness decides: at least 85 earns 2, below 85 loses 5.',de:'Ein Prüfer erscheint mit Klemmbrett und Ente. Eine Grundreinigung kostet 700 $ und bringt 3 Ruf. Sonst entscheidet die Sauberkeit: mindestens 85 bringt 2 Ruf, darunter verlierst du 5.'},choices:[{label:{en:'Polish everything · $700 / +3 reputation',de:'Alles polieren · 700 $ / +3 Ruf'},cost:700,effect:'inspectionClean'},{label:{en:'Trust Otto and the duck',de:'Otto und der Ente vertrauen'},cost:0,effect:'inspectionCheck'}]},
 {id:'influencer',minLevel:3,name:{en:'The #NoFilter waiting room',de:'Das #OhneFilter-Wartezimmer'},text:{en:'A beauty vlogger has brought five friends with filteritis. Treat the group for a $1,000 advance, but your glow-up clinic needs room for the rush.',de:'Ein Beauty-Vlogger bringt fünf Freunde mit Filteritis. Für die Gruppe gibt es 1.000 $ Vorschuss, aber deine Schönheitsklinik braucht Platz für den Ansturm.'},choices:[{label:{en:'Book the group · +$1,000, five patients',de:'Gruppe buchen · +1.000 $, fünf Patienten'},cost:-1000,effect:'beautyRush'},{label:{en:'Suggest a group walk instead',de:'Stattdessen einen Gruppenspaziergang empfehlen'},cost:0,effect:'none'}]}
);
ROOMS.surgery.name={en:'Glow-up clinic',de:'Schönheitsklinik'};
ROOMS.surgery.desc={en:'A specialist cosmetic practice for filteritis and theatrical smiles. Requires a surgeon.',de:'Eine Spezialpraxis für Filteritis und theatralische Lächeln. Benötigt einen Chirurgen.'};
ILLNESSES.find(i=>i.id==='funny').name={en:'Persistent filteritis',de:'Hartnäckige Filteritis'};
ILLNESSES.find(i=>i.id==='ego').name={en:'Red-carpet smile lock',de:'Roter-Teppich-Lächelstarre'};
COMPLAINTS.funny={en:'“My video filter is still on. I closed the app yesterday.”',de:'„Mein Videofilter ist noch an. Die App habe ich gestern geschlossen.“'};
COMPLAINTS.ego={en:'“I smiled for one photograph. It has been three days.”',de:'„Ich habe für ein Foto gelächelt. Das ist drei Tage her.“'};
Object.assign(LEVELS[0],{name:{en:'A practice of your own',de:'Deine eigene Praxis'},desc:{en:'Bea has the keys. You have $50,000 and empty rooms. Open a staffed practice, cure 15 patients and earn 62 reputation.' ,de:'Bea hat die Schlüssel. Du hast 50.000 $ und leere Räume. Öffne eine besetzte Praxis, heile 15 Patienten und erreiche 62 Ruf.'}});
Object.assign(LEVELS[1],{specialty:'therapy',specialtyGoal:12,project:'care',name:{en:'Head in the clouds',de:'Die Tagtraumpraxis'},desc:{en:'The city keeps missing its own meetings. Open a daydream practice: 32 cures, 12 therapy successes, bedside-manner research and 70 reputation.',de:'Die Stadt verpasst ihre eigenen Meetings. Eröffne eine Tagtraumpraxis: 32 Heilungen, davon 12 in der Therapie, erforschte Patientenbetreuung und 70 Ruf.'}});
Object.assign(LEVELS[2],{specialty:'surgery',specialtyGoal:18,project:'speed',name:{en:'A perfectly imperfect practice',de:'Die Schönheitsklinik'},desc:{en:'A red-carpet event has caused a filteritis outbreak. Run a cosmetic practice: 50 cures, 18 glow-up treatments, paperwork research and 78 reputation.',de:'Ein Roter-Teppich-Event löst Filteritis aus. Leite eine Schönheitsklinik: 50 Heilungen, davon 18 Schönheitsbehandlungen, erforschter Papierkram und 78 Ruf.'}});

PATIENT_FACTS.occupation.push({en:'School pupil',de:'Schulkind'},{en:'Kindergarten explorer',de:'Kindergarten-Entdecker'});

// Short consultations offset the real waiting-room journeys and door transitions.
ROOMS.gp.time=5;ROOMS.pharmacy.time=6;
