import {ROOMS} from './content.js';
import {ROLES} from './recruitment.js';

const SHAPES={
 menu:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 rooms:'<path d="m3 19 9-9 3 3-9 9-3-3Zm8-12 4-4h4l3 3-4 4-3-3-2 2-2-2Z"/><path d="m3 4 3-2 3 3-3 3-3-4Z" fill="currentColor" opacity=".18"/>',
 expand:'<path d="M3 14V3h11M3 3l7 7m11 0v11H10m11 0-7-7M3 18v3h3M18 3h3v3"/><path d="M10 10h4v4h-4Z" fill="currentColor" opacity=".22"/>',
 staff:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',
 patients:'<circle cx="8" cy="6" r="3"/><path d="M2 20v-4a6 6 0 0 1 12 0v4M16 12c-5-3-5 3 0 6 5-3 5-9 0-6Z"/><path d="M16 12c-5-3-5 3 0 6 5-3 5-9 0-6Z" fill="currentColor" opacity=".22"/>',
 clinic:'<path d="M4 22V7h5V2h6v5h5v15H4Zm6 0v-5h4v5M12 5v6m-3-3h6M7 13h1m8 0h1"/><path d="M9 7h6v5H9Z" fill="currentColor" opacity=".12"/>',
 reception:'<path d="M2 14h20v7M4 14v7M8 14V8h11v6m-7-6V5h3M5 11H2"/><circle cx="4" cy="5" r="2"/>',
 waiting:'<path d="M5 12V5h14v7M3 12h18v6H3v-6Zm2 6v4m14-4v4M7 8h10"/>',
 gp:'<path d="M7 4H4v5a5 5 0 0 0 10 0V4h-3M9 14v2a5 5 0 0 0 10 0v-3"/><circle cx="19" cy="10" r="3"/>',
 pharmacy:'<path d="M6 4h12M8 4v4l-3 4v9h14v-9l-3-4V4M9 15h6m-3-3v6"/>',
 therapy:'<path d="M10 5C5 2 1 8 5 11c-4 4 1 10 5 7m4-13c5-3 9 3 5 6 4 4-1 10-5 7M12 3v18M6 8l4 2m-5 5 5-2m8-5-4 2m5 5-5-2"/>',
 surgery:'<path d="m4 20 9-9m-4-1 5 5m-1-8 5-5 4 4-5 5-4-4ZM3 21l4-1-3-3-1 4Z"/>',
 lab:'<path d="M8 3h8m-6 0v7L4 20q-1 2 2 2h12q3 0 2-2l-6-10V3M8 15h8"/><circle cx="11" cy="18" r=".5"/>',
 lounge:'<path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Zm14 1h2a3 3 0 0 1 0 6h-2M6 3v2m4-3v3m4-2v2"/>',
 toilet:'<path d="M5 3h8v8H5V3Zm0 8h15v2a7 7 0 0 1-7 7H9v-4a5 5 0 0 1-4-5Zm4 9v2h8M8 6h2"/>',
 receptionist:'<circle cx="10" cy="7" r="4"/><path d="M3 8V6a7 7 0 0 1 14 0v4h-4m-9 12v-4a6 6 0 0 1 12 0v4m1-7h5v7"/>',
 doctor:'<circle cx="12" cy="6" r="4"/><path d="M4 22v-4a8 8 0 0 1 16 0v4M12 14v6m-3-3h6"/>',
 nurse:'<path d="M6 8 4 3h16l-2 5M12 3v5M9.5 5.5h5M8 9a4 4 0 0 0 8 0M4 22v-3a8 8 0 0 1 16 0v3"/>',
 surgeon:'<path d="M6 8V5a6 6 0 0 1 12 0v3M6 8h12v5l-6 3-6-3V8ZM3 22v-3l4-3m14 6v-3l-4-3M9 11h6"/>',
 janitor:'<path d="m14 2-4 13m-5-1 10 3-2 5H2l3-8Zm2 3-2 5m5-4-1 4M17 7h5m-2.5-2.5v5"/>',
 queue:'<circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><path d="M2 15v-4h6v4m1 0v-4h6v4m1 0v-4h6v4M4 20h16m-3-3 3 3-3 3"/>',
 research:'<path d="M6 22h15M9 22v-4M5 18h11M8 4l4-2 4 8-4 2-4-8Zm5 9-3 2M17 9a7 7 0 0 1-2 13"/><circle cx="17" cy="9" r="2"/>',
 finances:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v5c0 4 16 4 16 0V5M4 10v5c0 4 16 4 16 0v-5M4 15v4c0 4 16 4 16 0v-4M12 3v4"/>',
 episodes:'<path d="M5 22V3m0 0c5-4 9 4 15 0v10c-6 4-10-4-15 0M2 22h7"/><path d="M7 5c4-2 7 3 11 1v5c-4 1-7-3-11-1Z" fill="currentColor" opacity=".18"/>',
 settings:'<path d="m9 3 1-2h4l1 2 3 2 2-.2 2 3-1 2v4l1 2-2 3-2-.2-3 2-1 2h-4l-1-2-3-2-2 .2-2-3 1-2v-4l-1-2 2-3 2 .2 3-2Z"/><circle cx="12" cy="12" r="3.5"/>',
 language:'<path d="M2 5h12M8 2v3m-4 3c1 4 4 7 9 9M12 5c0 6-4 10-9 12m10 5 4-11h2l4 11m-8-4h6"/>',
 sound:'<path d="M3 9h4l5-5v16l-5-5H3V9Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
 help:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 5 2c-1 1-2 1-2 4m0 3v.2"/>',
 load:'<path d="M3 8V4h7l2 3h9v4M2 11h20l-3 10H4L2 11Z"/><path d="M12 18v-7m-3 3 3-3 3 3"/>',
 save:'<path d="M4 2h13l4 4v16H3V2h1Zm3 0v7h10V2M7 22v-8h10v8m-3-17v2"/>'
};
const svg=key=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${SHAPES[key]||SHAPES.menu}</svg>`;

export function renderGameMenu(game,{open=false,section='rooms',announcementsEnabled=false,helpers}){
 const {t,copy,label,btn,escape,money=n=>`$${n}`,menuIcon}=helpers,icon=key=>menuIcon?.(key)||svg(key);
 const sections=[['rooms',copy('Build','Bauen')],['staff',copy('Staff','Personal')],['patients',copy('Patients','Patienten')],['clinic',copy('Clinic','Klinik')]];
 const current=sections.some(([key])=>key===section)?section:'rooms',sectionName=sections.find(([key])=>key===current)[1];
 const captions={expand:copy('Expand','Ausbauen'),rooms:copy('Build','Bauen'),staff:copy('Team','Team'),patients:copy('Patients','Patienten'),clinic:copy('Clinic','Klinik'),reception:copy('Reception','Empfang'),waiting:copy('Waiting','Warten'),gp:copy('Diagnosis','Diagnostik'),pharmacy:copy('Pharmacy','Apotheke'),therapy:copy('Therapy','Therapie'),surgery:copy('Surgery','Chirurgie'),lab:copy('Laboratory','Labor'),lounge:copy('Lounge','Pausenraum'),toilet:copy('Restrooms','Toiletten'),receptionist:copy('Reception','Empfang'),doctor:copy('Doctor','Arzt'),nurse:copy('Nurse','Pflege'),surgeon:copy('Surgeon','Chirurg'),janitor:copy('Maintenance','Haustechnik'),queue:copy('Queue','Warteliste'),research:copy('Research','Forschung'),finances:copy('Finances','Finanzen'),episodes:copy('Story','Story'),save:copy('Save','Speichern'),load:copy('Load','Laden'),language:copy('Language','Sprache'),sound:copy('Sound','Ton'),settings:copy('Settings','Optionen'),help:copy('Help','Hilfe')};
 const toggle=expanded=>{const title=copy(expanded?'Close menu':'Open menu',expanded?'Menü schließen':'Menü öffnen');return btn('game-menu',`${icon(expanded?'close':'menu')}<span class="game-menu-tooltip">${title}</span>`,expanded?'game-menu-close':'game-menu-toggle',`aria-label="${escape(title)}" aria-expanded="${expanded}"`);};
 if(!open)return toggle(false);
 let items;
 if(current==='rooms')items=[{icon:'expand',title:copy('Expand & upgrade','Ausbauen & verbessern'),action:'panel',extra:'data-panel="development"'},...Object.entries(ROOMS).map(([type,room])=>({icon:type,title:label(room.name)+' · '+(game.available(type)?money(room.cost):copy('Unlock in episode ','Ab Episode ')+(type==='therapy'?2:3)),action:'build',extra:`data-type="${type}" ${game.available(type)?'':'disabled'}`}))];
 else if(current==='staff')items=[...ROLES.map(role=>({icon:role,title:`${t(role)} · ${copy('Hire','Einstellen')}`,action:'open-staff',extra:`data-role="${role}" data-view="hire"`})),{icon:'staff',title:copy('Your team','Dein Team'),action:'open-staff',extra:'data-view="team"'}];
 else if(current==='patients')items=[{icon:'patients',title:copy('Patient records','Patientenakten'),action:'panel',extra:'data-panel="patients"'},{icon:'queue',title:copy('Waiting list','Warteliste'),action:'panel',extra:'data-panel="queue"'}];
 else items=[{icon:'research',title:t('research'),action:'panel',extra:'data-panel="research"'},{icon:'finances',title:t('finances'),action:'panel',extra:'data-panel="finances"'},{icon:'episodes',title:copy('Scenarios','Szenarien'),action:'episodes'},{icon:'save',title:t('save'),action:'save'},{icon:'load',title:copy('Load session','Sitzung laden'),action:'load-game',extra:'aria-haspopup="dialog"'},{icon:'language',title:copy('Language','Sprache'),action:'language',extra:'aria-haspopup="dialog"'},{icon:'sound',title:copy('Sound options','Tonoptionen')+' · '+copy(announcementsEnabled?'announcements on':'announcements off',announcementsEnabled?'Durchsagen an':'Durchsagen aus'),action:'audio-options',extra:`aria-haspopup="dialog" data-sound-active="${announcementsEnabled}"`},...['settings','help'].map(action=>({icon:action,title:t(action),action}))];
 const radial=(item,index,count,inner=false)=>{
  const angle=inner?-45+index*90:index*360/count,side=Math.sin(angle*Math.PI/180),attributes=`${item.extra||''} aria-label="${escape(item.title)}" style="--menu-angle:${angle}deg;--menu-counter-angle:${-angle}deg;--menu-delay:${index*24}ms" data-menu-icon="${item.icon}" data-tooltip-side="${side<-.4?'left':side>.4?'right':'center'}"`;
  return btn(item.action,`${icon(item.icon)}<span class="game-menu-caption" aria-hidden="true">${escape(inner?item.title:item.icon==='patients'?copy('Records','Akten'):captions[item.icon]||item.title)}</span><span class="game-menu-tooltip">${escape(item.title)}</span>`,`game-menu-orbit ${inner?'game-menu-category':'game-menu-item'}${inner&&item.key===current?' active':''}`,attributes);
 };
 return `<div class="game-menu-wheel"><div class="game-menu-center">${toggle(true)}<strong>${sectionName}</strong></div><div class="game-menu-categories" role="group" aria-label="${escape(copy('Menu sections','Menübereiche'))}">${sections.map(([key,title],index)=>radial({key,icon:key,title,action:'menu-section',extra:`data-section="${key}" aria-pressed="${key===current}"`},index,4,true)).join('')}</div><div class="game-menu-items" data-section="${current}" role="group" aria-label="${escape(sectionName)}">${items.map((item,index)=>radial(item,index,items.length)).join('')}</div></div>`;
}
