export const SAVE_LIBRARY_KEY='scrubssitel-slots-v1';
export const MAX_SAVE_SLOTS=8;
const error=code=>Object.assign(new Error(code),{code});
const validName=name=>typeof name==='string'&&name.trim().length>0&&name.trim().length<=48;
export function readSaveLibrary(storage){
 const raw=storage.getItem(SAVE_LIBRARY_KEY);if(!raw)return [];
 try{
  const data=JSON.parse(raw);
  if(data?.version!==1||!Array.isArray(data.slots)||data.slots.length>MAX_SAVE_SLOTS)throw error('saveLibraryUnreadable');
  const ids=new Set();for(const slot of data.slots){
   if(typeof slot.id!=='string'||!/^slot-[a-zA-Z0-9-]{1,80}$/.test(slot.id)||ids.has(slot.id)||!validName(slot.name)||!Number.isFinite(slot.updatedAt)||slot.updatedAt<0||slot.updatedAt>8640000000000000||!slot.snapshot||typeof slot.snapshot!=='object'||Array.isArray(slot.snapshot))throw error('saveLibraryUnreadable');
   ids.add(slot.id);
  }
  return data.slots;
 }catch{throw error('saveLibraryUnreadable');}
}
function write(storage,slots){try{storage.setItem(SAVE_LIBRARY_KEY,JSON.stringify({version:1,slots}));}catch{throw error('saveFailed');}}
export function saveNamedSlot(storage,{id=null,name,snapshot},now=Date.now()){
 const slots=readSaveLibrary(storage);if(!validName(name))throw error('saveNameRequired');
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw error('badSave');
 const index=id===null?-1:slots.findIndex(s=>s.id===id);
 if(id!==null&&index<0)throw error('saveSlotMissing');
 if(index<0&&slots.length>=MAX_SAVE_SLOTS)throw error('saveSlotLimit');
 const slot={id:id||'slot-'+crypto.randomUUID(),name:name.trim(),updatedAt:now,snapshot:JSON.parse(JSON.stringify(snapshot))};
 if(index<0)slots.unshift(slot);else slots[index]=slot;
 write(storage,slots);return slot;
}
export function renameSaveSlot(storage,id,name){
 const slots=readSaveLibrary(storage),slot=slots.find(s=>s.id===id);if(!slot)throw error('saveSlotMissing');if(!validName(name))throw error('saveNameRequired');
 slot.name=name.trim();write(storage,slots);return slot;
}
export function deleteSaveSlot(storage,id){
 const slots=readSaveLibrary(storage);if(!slots.some(s=>s.id===id))throw error('saveSlotMissing');write(storage,slots.filter(s=>s.id!==id));
}
