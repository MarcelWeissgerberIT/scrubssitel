// Preferences must never prevent the clinic or its saved progress from opening.
export function readPreferences(storage){
 let prefs={lang:'auto',sound:false},progress=[];
 try{
  const value=JSON.parse(storage.getItem('scrubssitel-prefs')||'null');
  if(value&&typeof value==='object'&&!Array.isArray(value))prefs={...value,lang:['auto','de','en'].includes(value.lang)?value.lang:'auto',sound:value.sound===true};
 }catch{}
 try{
  const value=JSON.parse(storage.getItem('scrubssitel-progress')||'[]');
  if(Array.isArray(value))progress=[...new Set(value.filter(x=>[1,2,3,'tutorial'].includes(x)))];
 }catch{}
 return {prefs,progress};
}
