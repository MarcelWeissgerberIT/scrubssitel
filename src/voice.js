export class Announcer {
 constructor({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,AudioClass=globalThis.Audio,onStatus=()=>{}}={}){this.synth=synth;this.Utterance=Utterance;this.AudioClass=AudioClass;this.onStatus=onStatus;this.enabled=false;this.ready=false;this.queue=[];this.generation=0;this.lastId=0;this.lang='en';this.busy=false;this.blocked=false;this.forceAudio=false;this.refreshVoices=()=>{this.voices=synth?.getVoices?.()||[];};this.refreshVoices();synth?.addEventListener?.('voiceschanged',this.refreshVoices);}
 cancel(){this.generation++;this.queue=[];this.busy=false;for(const timer of this.current?.timers||[])clearTimeout(timer);this.current=null;this.synth?.cancel();if(this.audio){this.audio.onended=null;this.audio.onerror=null;this.audio.pause();this.audio=null;}}
 reset(serial=0){this.cancel();this.lastId=serial;}
 setLanguage(lang){this.cancel();this.lang=lang;}
 suspend(value){if(value&&!this.blocked)this.cancel();this.blocked=value;}
 mute(){this.enabled=false;this.ready=false;this.cancel();this.onStatus('off');}
 activate(lang){this.cancel();this.lang=lang;this.enabled=true;this.ready=true;this.blocked=false;this.onStatus('on');this.play({text:lang==='de'?'Durchsagen sind eingeschaltet.':'Patient announcements are on.',roomType:'welcome',test:true});}
 accept(calls,valid){for(const call of calls){if(call.id<=this.lastId)continue;this.lastId=call.id;if(this.enabled&&this.ready&&!this.blocked&&valid(call))this.queue.push({...call,valid:()=>valid(call)});}this.queue=this.queue.slice(-3);this.next();}
 next(){if(this.busy||!this.enabled||!this.ready||this.blocked)return;let call;while(this.queue.length){const candidate=this.queue.shift();if(!candidate.valid||candidate.valid()){call=candidate;break;}}if(call)this.play(call);}
 play(call){
  const token={generation:this.generation,finished:false,mode:'native',timers:new Set()};this.current=token;this.busy=true;
  const live=()=>this.current===token&&token.generation===this.generation&&!token.finished;
  const clear=()=>{for(const timer of token.timers)clearTimeout(timer);token.timers.clear();};
  const later=(fn,ms)=>{const timer=setTimeout(()=>{token.timers.delete(timer);if(live())fn();},ms);token.timers.add(timer);};
  const finish=()=>{if(!live())return;token.finished=true;clear();this.busy=false;this.current=null;this.next();};
  const fail=()=>{if(!live())return;token.finished=true;clear();this.ready=false;this.cancel();this.onStatus('retry');};
  const fallback=()=>{if(!live()||token.mode==='fallback')return;token.mode='fallback';clear();if(token.utterance){token.utterance.onend=null;token.utterance.onerror=null;token.utterance.onstart=null;this.synth.cancel();}if(!this.AudioClass){fail();return;}try{this.forceAudio=true;const audio=new this.AudioClass(`./public/assets/voice/${this.lang}-${call.roomType}.m4a`);this.audio=audio;audio.volume=.75;audio.onended=finish;audio.onerror=fail;later(fail,15000);audio.play()?.catch(fail);}catch{fail();}};
  if(!this.synth||!this.Utterance||this.forceAudio){fallback();return;}
  const utterance=new this.Utterance(call.text);token.utterance=utterance;utterance.lang=this.lang==='de'?'de-DE':'en-US';utterance.voice=(this.voices||[]).filter(v=>v.lang.toLowerCase().startsWith(this.lang)).sort((a,b)=>Number(b.localService)-Number(a.localService)||Number(b.lang===utterance.lang)-Number(a.lang===utterance.lang))[0]||null;utterance.rate=1.05;utterance.volume=.75;
  utterance.onstart=()=>{if(!live()||token.mode!=='native')return;clear();later(()=>{utterance.onend=null;utterance.onerror=null;this.synth.cancel();finish();},20000);};
  utterance.onend=finish;utterance.onerror=e=>{if(!live()||token.mode!=='native')return;if(['canceled','interrupted'].includes(e.error))finish();else fallback();};
  // Arm before speak(): some engines dispatch start/error synchronously.
  later(fallback,2500);try{if(this.synth.paused)this.synth.resume();this.synth.speak(utterance);}catch{fallback();}
 }
}
