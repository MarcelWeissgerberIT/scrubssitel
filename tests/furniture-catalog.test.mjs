import test from 'node:test';
import assert from 'node:assert/strict';
import {filterFurniture,CATALOG_FILTERS} from '../src/furniture-catalog.js';
import {FURNITURE,requirements,satisfiesRequirement} from '../src/objects.js';
import {ROOMS} from '../src/content.js';
test('required catalog finds every valid alternative including full cubicles and sofa seats',()=>{
 for(const roomType of Object.keys(ROOMS)){
  const entries=filterFurniture(roomType,{category:'required'});
  for(const req of requirements(roomType))assert.ok(entries.some(([kind,spec])=>req.kind==='seat'?spec.ports.some(p=>p.kind==='seat'):satisfiesRequirement(kind,req.kind)));
 }
 assert.ok(filterFurniture('toilet',{category:'required'}).some(([kind])=>kind==='toilet-cubicle'));
 assert.ok(filterFurniture('waiting',{category:'required'}).some(([kind])=>kind==='sofa'));
});
test('bilingual search and combined budget/category filters retain room restrictions without mutating objects',()=>{
 const before=JSON.stringify(FURNITURE);
 assert.ok(filterFurniture('toilet',{query:'blickdichte kabine'}).some(([kind])=>kind==='toilet-cubicle'));
 assert.ok(filterFurniture('toilet',{query:'private cubicle'}).some(([kind])=>kind==='toilet-cubicle'));
 assert.equal(filterFurniture('reception',{query:'private cubicle'}).length,0);
 assert.equal(filterFurniture('toilet',{query:'kabine',affordable:true,cash:449}).length,0);
 for(const roomType of Object.keys(ROOMS))for(const category of CATALOG_FILTERS)for(const [kind,spec] of filterFurniture(roomType,{category,affordable:true,cash:150})){
  assert.ok(spec.rooms.includes(roomType));assert.ok(spec.cost<=150);assert.equal(FURNITURE[kind],spec);
 }
 assert.equal(JSON.stringify(FURNITURE),before);assert.deepEqual(filterFurniture('waiting',{query:'not-a-real-chair'}),[]);
});
