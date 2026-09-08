import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CAST} from '../src/content.js';
import {appearanceFor,portraitSeed,LOOKS} from '../src/characters.js';
import {candidates,ROLES,personGender,staffRoleLabel} from '../src/recruitment.js';
import {renderStaffPanel} from '../src/staff-panel.js';
test('all fifteen candidates have distinct looks and stable numeric portrait seeds',()=>{const all=candidates();assert.equal(new Set(all.map(s=>JSON.stringify(appearanceFor(s).look))).size,15);for(const s of all)assert.ok(Number.isInteger(portraitSeed(s)));for(const role of ROLES)assert.equal(new Set(all.filter(s=>s.role===role).map(s=>appearanceFor(s).look.style+appearanceFor(s).look.hair+appearanceFor(s).look.shirt)).size,3);});
test('appearance survives hiring, later adverts and restoring without using mutable recruitment round',()=>{for(const round of [0,1,9999,10000]){const g=new Game();g.recruitmentRound=round;g.applicantIds=candidates(round).map(c=>c.id);for(const c of g.applicants()){const before=appearanceFor(c),s=g.hireApplicant(c.id,true).staff;assert.deepEqual(appearanceFor(s),before);}const looks=g.staff.map(appearanceFor);if(round<10000)g.refreshApplicants();assert.deepEqual(g.staff.map(appearanceFor),looks);assert.deepEqual(Game.restore(g.snapshot()).staff.map(appearanceFor),looks);}});
test('legacy employees retain their original cast instead of acquiring a different contract identity',()=>{for(const c of CAST){const result=appearanceFor({...c,id:99,castId:c.id,personality:'steady'});assert.equal(result.look,LOOKS[c.id]);}});

test('a direct named cast profile and its hired form resolve to the same character',()=>{
 for(const cast of CAST){
  const direct=appearanceFor(cast),hired=appearanceFor({...cast,id:99,castId:cast.id});
  assert.deepEqual(direct,hired,cast.name);assert.equal(direct.look,LOOKS[cast.id]);
  assert.equal(direct.gender,cast.gender);assert.equal(personGender(cast),cast.gender);
 }
});

test('authored employee identity follows the named applicant through hiring, adverts and old saves',()=>{
 const genders=['nonbinary','female','male','male','female','male','female','male','female','female','female','male','male','nonbinary','female'];
 for(const round of [0,3]){
  const g=new Game();g.recruitmentRound=round;g.applicantIds=candidates(round).map(c=>c.id);
  for(const [index,applicant] of g.applicants().entries()){
   const identity=appearanceFor(applicant),staff=g.hireApplicant(applicant.id,true).staff;
   assert.equal(applicant.gender,genders[index]);assert.equal(identity.gender,genders[index]);
   assert.deepEqual(appearanceFor(staff),identity);assert.equal(personGender(staff),genders[index]);
   assert.equal(personGender({...staff,gender:'changed',name:'Unrelated name'}),genders[index]);
  }
  const saved=g.snapshot();for(const staff of saved.staff)delete staff.gender;
  const old=Game.restore(saved);assert.deepEqual(old.staff.map(personGender),genders);
  assert.deepEqual(old.staff.map(appearanceFor),g.staff.map(appearanceFor));
  old.refreshApplicants();assert.deepEqual(old.staff.map(personGender),genders);
 }
 const first=candidates();assert.equal(staffRoleLabel(first[4],'de'),'Ärztin');assert.equal(staffRoleLabel(first[3],'de'),'Arzt');
 assert.equal(staffRoleLabel(first[9],'de'),'Chirurgin');assert.equal(staffRoleLabel(first[11],'de'),'Chirurg');
 assert.equal(staffRoleLabel(first[7],'de'),'Pflegekraft');assert.equal(staffRoleLabel(first[0],'de'),'Empfangskraft');
});

test('patient charts, live figures and restored patients share one stable appearance without name-based gender',()=>{
 for(const seed of [12,77,234]){
  const g=new Game({mode:'sandbox',seed});for(let i=0;i<55;i++)g.spawnPatient('jitters');
  const restored=Game.restore(g.snapshot());
  for(const p of g.patients){const record=g.records.find(r=>r.id===p.id),identity=appearanceFor(p);
   assert.deepEqual(appearanceFor({...record,child:record.age<16}),identity);
   assert.deepEqual(appearanceFor(restored.patients.find(r=>r.id===p.id)),identity);
   assert.deepEqual(appearanceFor({...p,name:'A different unisex name'}),identity);
   assert.equal(personGender(p),null);assert.equal(identity.gender,null);
  }
 }
});

test('loading rejects a live patient whose appearance variant disagrees with the chart',()=>{
 const g=new Game({mode:'sandbox',seed:77}),p=g.spawnPatient('jitters'),saved=g.snapshot();
 const forged=structuredClone(saved);forged.patients[0].variant=(p.variant+1)%3;
 assert.throws(()=>Game.restore(forged),/Mismatched patient identity/);
 assert.deepEqual(Game.restore(saved).snapshot(),saved,'valid older identities remain unchanged');
});

test('German individual staff cards use the named profile’s professional title',()=>{
 const people=candidates().filter(p=>['Dr. Tessa Fern','Dr. Nia Bloom','Dr. Hugo Glint','Luca Lemon','Rosa Reed'].includes(p.name));
 const g={staff:people,applicants:()=>[],room:()=>null,canPickUpStaff:()=>null};
 const helpers={t:x=>x,copy:(en,de)=>de,label:x=>x.de,avatar:()=>'',btn:()=>'',money:String,escape:String,staffStatus:()=>'',panelHeader:()=>''};
 const html=renderStaffPanel(g,{view:'team',helpers});
 for(const [name,title] of [['Dr. Tessa Fern','Ärztin'],['Dr. Nia Bloom','Chirurgin'],['Dr. Hugo Glint','Chirurg'],['Luca Lemon','Pflegekraft'],['Rosa Reed','Empfangskraft']])assert.ok(html.includes(`<b>${name}</b><span>${title} ·`),name);
});
