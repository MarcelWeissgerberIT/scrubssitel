export const tr = (value, lang='en') => typeof value==='object' ? value[lang] ?? value.en : value;
export const ROOMS = {
  gp: {cost:1400, role:'doctor', time:8, color:'#8dc9b5', icon:'✚', name:{en:'Diagnosis',de:'Diagnostik'}, desc:{en:'Every curious case starts here. Requires a doctor.',de:'Hier beginnt jeder kuriose Fall. Benötigt einen Arzt.'}},
  pharmacy:{cost:1800,role:'nurse',time:10,color:'#9fbce3',icon:'⚕',name:{en:'Pharmacy',de:'Apotheke'},desc:{en:'A spoonful of science. Requires a nurse.',de:'Ein Löffel Wissenschaft. Benötigt eine Pflegekraft.'}},
  therapy:{cost:2800,role:'doctor',time:13,color:'#c4a6d5',icon:'☁',name:{en:'Daydream clinic',de:'Tagtraumklinik'},desc:{en:'Turns overthinking into regular thinking. Requires a doctor.',de:'Macht aus Überdenken wieder Denken. Benötigt einen Arzt.'}},
  surgery:{cost:4200,role:'surgeon',time:17,color:'#e8b18c',icon:'✂',name:{en:'Odd surgery',de:'Kuriose Chirurgie'},desc:{en:'For the delightfully complicated cases. Requires a surgeon.',de:'Für wunderbar komplizierte Fälle. Benötigt einen Chirurgen.'}},
  lounge:{cost:900,role:null,time:0,color:'#ecd28f',icon:'☕',name:{en:'Staff lounge',de:'Pausenraum'},desc:{en:'Rested staff work faster and recover from burnout.',de:'Erholtes Personal arbeitet schneller und baut Stress ab.'}},
  toilet:{cost:650,role:null,time:0,color:'#a9c7ca',icon:'◈',name:{en:'Restrooms',de:'Toiletten'},desc:{en:'A little dignity. Keeps patients comfortable while they wait.',de:'Ein bisschen Würde. Hält wartende Patienten zufrieden.'}},
  lab:{cost:2600,role:'doctor',time:0,color:'#b8cc91',icon:'⚗',name:{en:'Research lab',de:'Forschungslabor'},desc:{en:'A doctor researches better treatments. Start a project under Research.',de:'Ein Arzt erforscht bessere Therapien. Starte ein Projekt unter Forschung.'}}
};
export const CAST = [
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
