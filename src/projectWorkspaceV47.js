export const V47_PROJECT_LIBRARY_KEY='boxstudio-free-projects-v47';
const clone=v=>structuredClone(v);
const safeName=(value,fallback='Untitled Packaging')=>String(value||'').trim().slice(0,120)||fallback;
const makeId=()=>`p47-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

export function readProjectLibraryV47(storage=globalThis.localStorage){
  try{const parsed=JSON.parse(storage?.getItem?.(V47_PROJECT_LIBRARY_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(x=>x&&x.id&&x.state):[]}catch{return[]}
}
function writeLibrary(storage,records){storage?.setItem?.(V47_PROJECT_LIBRARY_KEY,JSON.stringify(records));return records}

export function saveProjectSnapshotV47(state,{id=null,name=null}={},storage=globalThis.localStorage){
  const records=readProjectLibraryV47(storage),projectId=id||state?.projectId||makeId(),now=new Date().toISOString(),index=records.findIndex(x=>x.id===projectId),record={id:projectId,name:safeName(name??state?.projectName),updatedAt:now,createdAt:index>=0?records[index].createdAt:now,template:state?.structure?.template||'unknown',state:{...clone(state),projectId,projectName:safeName(name??state?.projectName),savedAt:now}};
  if(index>=0)records[index]=record;else records.unshift(record);writeLibrary(storage,records);return clone(record);
}

export function renameProjectSnapshotV47(id,name,storage=globalThis.localStorage){
  const records=readProjectLibraryV47(storage),record=records.find(x=>x.id===id);if(!record)throw Object.assign(new Error(`Project ${id} not found.`),{code:'V47_PROJECT_NOT_FOUND'});record.name=safeName(name,record.name);record.state.projectName=record.name;record.updatedAt=new Date().toISOString();writeLibrary(storage,records);return clone(record);
}

export function duplicateProjectSnapshotV47(id,{name=null}={},storage=globalThis.localStorage){
  const source=readProjectLibraryV47(storage).find(x=>x.id===id);if(!source)throw Object.assign(new Error(`Project ${id} not found.`),{code:'V47_PROJECT_NOT_FOUND'});const copied=clone(source.state);delete copied.projectId;return saveProjectSnapshotV47(copied,{name:safeName(name,`${source.name} Copy`)},storage);
}

export function loadProjectSnapshotV47(id,storage=globalThis.localStorage){
  const source=readProjectLibraryV47(storage).find(x=>x.id===id);if(!source)throw Object.assign(new Error(`Project ${id} not found.`),{code:'V47_PROJECT_NOT_FOUND'});return clone(source.state);
}

export function deleteProjectSnapshotV47(id,storage=globalThis.localStorage){const next=readProjectLibraryV47(storage).filter(x=>x.id!==id);writeLibrary(storage,next);return next.length}

export function newLocalProjectV47(defaultState,{name='Untitled Packaging'}={}){const next=clone(defaultState);next.projectId=makeId();next.projectName=safeName(name);next.savedAt=null;next.page='editor';next.editorTab='Structure';return next}

export function projectLibrarySummaryV47(storage=globalThis.localStorage){const items=readProjectLibraryV47(storage);return{count:items.length,items:items.map(x=>({id:x.id,name:x.name,updatedAt:x.updatedAt,template:x.template}))}}
