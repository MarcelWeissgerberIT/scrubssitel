import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_LIBRARY_KEY,MAX_SAVE_SLOTS,readSaveLibrary,saveNamedSlot,renameSaveSlot,deleteSaveSlot} from '../src/save-library.js';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const snapshot={version:6,cash:50000,rooms:[]};
test('named clinics are independent; overwrite, rename and deletion target only their chosen slot',()=>{
 const s=storage();s.setItem('scrubssitel-save','latest-autosave');assert.deepEqual(readSaveLibrary(s),[]);
 const first=saveNamedSlot(s,{name:'  Meine Klinik  ',snapshot},1),second=saveNamedSlot(s,{name:'Schönheit & Chaos',snapshot:{...snapshot,cash:19000}},2);
 snapshot.rooms.push({id:1});assert.deepEqual(readSaveLibrary(s).find(x=>x.id===first.id).snapshot.rooms,[],'stored clinic is independent of running game');snapshot.rooms=[];
 saveNamedSlot(s,{id:first.id,name:'Meine Klinik',snapshot:{...snapshot,cash:12000}},3);renameSaveSlot(s,second.id,'Zweite Praxis');
 const saved=readSaveLibrary(s);assert.equal(saved.length,2);assert.equal(saved.find(x=>x.id===second.id).snapshot.cash,19000);assert.equal(saved.find(x=>x.id===first.id).updatedAt,3);
 deleteSaveSlot(s,first.id);assert.equal(readSaveLibrary(s)[0].name,'Zweite Praxis');assert.equal(s.getItem('scrubssitel-save'),'latest-autosave');
});
test('unreadable library and storage quota failures preserve all prior saves',()=>{
 const s=storage();s.setItem(SAVE_LIBRARY_KEY,'unreadable');assert.throws(()=>saveNamedSlot(s,{name:'New',snapshot}),/saveLibraryUnreadable/);assert.equal(s.getItem(SAVE_LIBRARY_KEY),'unreadable');
 s.setItem(SAVE_LIBRARY_KEY,'');saveNamedSlot(s,{name:'Existing',snapshot});const before=s.getItem(SAVE_LIBRARY_KEY);s.setItem=()=>{throw Error('QuotaExceededError');};
 assert.throws(()=>saveNamedSlot(s,{name:'New',snapshot}),/saveFailed/);assert.equal(s.getItem(SAVE_LIBRARY_KEY),before);
});
test('missing IDs and full libraries cannot silently overwrite a different clinic',()=>{
 const s=storage();for(let i=0;i<MAX_SAVE_SLOTS;i++)saveNamedSlot(s,{name:'Clinic '+i,snapshot});const before=s.getItem(SAVE_LIBRARY_KEY);
 for(const operation of [()=>saveNamedSlot(s,{name:'Extra',snapshot}),()=>saveNamedSlot(s,{id:'slot-missing',name:'Oops',snapshot}),()=>deleteSaveSlot(s,'slot-missing'),()=>renameSaveSlot(s,'slot-missing','Oops')])assert.throws(operation);
 assert.equal(s.getItem(SAVE_LIBRARY_KEY),before);const slot=readSaveLibrary(s)[0];assert.throws(()=>renameSaveSlot(s,slot.id,'   '),/saveNameRequired/);assert.equal(s.getItem(SAVE_LIBRARY_KEY),before);
});
