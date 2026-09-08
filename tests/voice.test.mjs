import assert from 'node:assert/strict';
import { Announcer } from '../src/voice.js';
class Clock {
 constructor(){this.now=0;this.serial=0;this.timers=new Map();}
 set(fn,ms){const id=++this.serial;this.timers.set(id,{id,at:this.now+ms,fn});return id;}
 clear(id){this.timers.delete(id);}
 tick(ms){const end=this.now+ms;let count=0;while(true){const timer=[...this.timers.values()].sort((a,b)=>a.at-b.at||a.id-b.id)[0];if(!timer||timer.at>end)break;assert.ok(++count<1000,'timer loop');this.now=timer.at;this.timers.delete(timer.id);timer.fn();}this.now=end;}
}
class Utterance{constructor(text){this.text=text;}}
function setup(mode='async'){
 const clock=new Clock();globalThis.setTimeout=(fn,ms)=>clock.set(fn,ms);globalThis.clearTimeout=id=>clock.clear(id);
 const sounds=[],statuses=[],synth={paused:false,cancels:0,utterances:[],getVoices:()=>[{lang:'de-DE',localService:true}],addEventListener(){},cancel(){this.cancels++;},resume(){this.paused=false;},speak(u){this.utterances.push(u);if(mode==='sync-error')u.onerror({error:'not-allowed'});if(mode==='sync-start')u.onstart();}};
 class FakeAudio {constructor(url){this.url=url;this.paused=false;sounds.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}}
 const a=new Announcer({synth,Utterance,AudioClass:FakeAudio,onStatus:s=>statuses.push(s)});return {a,clock,synth,sounds,statuses};
}
import test from 'node:test';
const realSetTimeout=globalThis.setTimeout,realClearTimeout=globalThis.clearTimeout;
function check(name,fn){test(name,()=>{try{fn();}finally{globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClearTimeout;}});}
check('sync native error: completed fallback does not later disable announcer',()=>{const {a,clock,sounds,statuses}=setup('sync-error');a.activate('de');assert.equal(sounds.length,1);clock.tick(1000);sounds[0].onended();assert.equal(a.ready,true);clock.tick(15000);assert.equal(a.ready,true,`stale timer disabled voice: ${statuses.join(',')}`);});
check('sync native error: only one fallback clip starts',()=>{const {a,clock,sounds}=setup('sync-error');a.activate('de');clock.tick(2600);assert.equal(sounds.length,1,'2.5s native watchdog started fallback a second time');});
check('sync native start: old watchdog cannot cancel a later utterance',()=>{const {a,clock,synth}=setup('sync-start');a.activate('de');clock.tick(1000);synth.utterances[0].onend();clock.tick(18000);a.accept([{id:1,text:'Patient one',roomType:'gp'}],()=>true);assert.equal(synth.utterances.length,2);const before=synth.cancels;clock.tick(1000);assert.equal(synth.cancels,before,'old 20s timer canceled a new utterance');});
check('pause/mute cancels without later callback restarting speech',()=>{const {a,clock,synth}=setup();a.activate('de');const old=synth.utterances[0];old.onstart();a.accept([{id:1,text:'Patient one',roomType:'gp'}],()=>true);a.mute();old.onend();old.onerror({error:'synthesis-failed'});clock.tick(30000);assert.equal(synth.utterances.length,1);assert.equal(a.queue.length,0);assert.equal(a.enabled,false);});
check('blocked calls are not replayed when modal closes',()=>{const {a,synth}=setup();a.activate('de');synth.utterances[0].onend();a.suspend(true);a.accept([{id:1,text:'Patient one',roomType:'gp'}],()=>true);a.suspend(false);a.accept([{id:1,text:'Patient one',roomType:'gp'}],()=>true);assert.equal(synth.utterances.length,1);});
check('failed silent synthesis enters recorded fallback',()=>{const {a,clock,sounds}=setup();a.activate('de');clock.tick(2500);assert.equal(sounds.length,1);assert.equal(sounds[0].url,'./public/assets/voice/de-welcome.m4a');sounds[0].onended();assert.equal(a.ready,true);assert.equal(a.busy,false);});
check('native async start/end retains working subsequent queue',()=>{const {a,clock,synth}=setup();a.activate('de');clock.tick(10);synth.utterances[0].onstart();a.accept([{id:1,text:'Patient one',roomType:'gp'}],()=>true);clock.tick(1000);synth.utterances[0].onend();assert.equal(synth.utterances.length,2);clock.tick(10);synth.utterances[1].onstart();clock.tick(1000);synth.utterances[1].onend();clock.tick(30000);assert.equal(a.ready,true);assert.equal(a.busy,false);});
check('missing native synthesis uses playable recorded speech and has no duplicate calls',()=>{const {a,sounds,clock}=setup();a.synth=undefined;a.activate('en');assert.equal(sounds[0].url,'./public/assets/voice/en-welcome.m4a');sounds[0].onended();a.accept([{id:1,text:'Alex, diagnosis please',roomType:'gp'}],()=>true);a.accept([{id:1,text:'Alex, diagnosis please',roomType:'gp'}],()=>true);assert.equal(sounds.length,2);sounds[1].onended();clock.tick(30000);assert.equal(a.ready,true);});
check('language change and save reset discard queued calls and old callbacks',()=>{const {a,synth,clock}=setup();a.activate('de');const old=synth.utterances[0];a.accept([{id:1,text:'Old call',roomType:'gp'}],()=>true);a.setLanguage('en');old.onend();a.reset(8);a.accept([{id:8,text:'Saved history',roomType:'gp'}],()=>true);assert.equal(synth.utterances.length,1);clock.tick(30000);assert.equal(a.lang,'en');});
check('bounded voice queue drops obsolete waiting calls before speaking',()=>{const {a,synth}=setup();a.activate('en');const valid=new Set([1,2,3,4,5]);a.accept([1,2,3,4,5].map(id=>({id,text:String(id),roomType:'gp'})),c=>valid.has(c.id));assert.equal(a.queue.length,3);valid.delete(3);synth.utterances[0].onend();assert.equal(synth.utterances[1].text,'4');});
