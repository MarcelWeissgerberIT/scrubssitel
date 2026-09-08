import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CAST} from '../src/content.js';
import {appearanceFor,portraitSeed,LOOKS} from '../src/characters.js';
import {candidates,ROLES} from '../src/recruitment.js';
test('all fifteen candidates have distinct looks and stable numeric portrait seeds',()=>{const all=candidates();assert.equal(new Set(all.map(s=>JSON.stringify(appearanceFor(s).look))).size,15);for(const s of all)assert.ok(Number.isInteger(portraitSeed(s)));for(const role of ROLES)assert.equal(new Set(all.filter(s=>s.role===role).map(s=>appearanceFor(s).look.style+appearanceFor(s).look.hair+appearanceFor(s).look.shirt)).size,3);});
test('appearance survives hiring, later adverts and restoring without using mutable recruitment round',()=>{for(const round of [0,1,9999,10000]){const g=new Game();g.recruitmentRound=round;g.applicantIds=candidates(round).map(c=>c.id);for(const c of g.applicants()){const before=appearanceFor(c),s=g.hireApplicant(c.id,true).staff;assert.deepEqual(appearanceFor(s),before);}const looks=g.staff.map(appearanceFor);if(round<10000)g.refreshApplicants();assert.deepEqual(g.staff.map(appearanceFor),looks);assert.deepEqual(Game.restore(g.snapshot()).staff.map(appearanceFor),looks);}});
test('legacy employees retain their original cast instead of acquiring a different contract identity',()=>{for(const c of CAST){const result=appearanceFor({...c,id:99,castId:c.id,personality:'steady'});assert.equal(result.look,LOOKS[c.id]);}});
