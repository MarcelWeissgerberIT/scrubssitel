import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences} from '../src/preferences.js';

const storage=(prefs,progress='[1,2,"tutorial"]')=>({getItem:key=>key==='scrubssitel-prefs'?prefs:progress});

test('unreadable preferences cannot block startup or erase completed episodes',()=>{
 for(const raw of [null,'null','true','17','"de"','[]','{broken']){
  assert.deepEqual(readPreferences(storage(raw)),{prefs:{lang:'auto',sound:false},progress:[1,2,'tutorial']});
 }
});

test('valid language and sound choices survive invalid or unavailable progress',()=>{
 for(const raw of ['{broken','null','false','{}'])assert.deepEqual(readPreferences(storage('{"lang":"de","sound":true}',raw)),{prefs:{lang:'de',sound:true},progress:[]});
 assert.deepEqual(readPreferences({getItem(){throw Error('Storage unavailable');}}),{prefs:{lang:'auto',sound:false},progress:[]});
 assert.deepEqual(readPreferences(storage('{"lang":"fr","sound":"false"}','[1,1,3,"tutorial",9,null]')),{prefs:{lang:'auto',sound:false},progress:[1,3,'tutorial']});
});
