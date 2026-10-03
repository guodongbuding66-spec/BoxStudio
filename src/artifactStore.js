const DB_NAME='boxstudio-artifacts-v1';
const DB_VERSION=1;
const STORE_NAME='artifacts';

function clone(value){return structuredClone(value);}
function nowIso(){return new Date().toISOString();}
function key(queueId,index){return `${String(queueId)}:${Number(index)}`;}
function toUint8Array(bytes){
  if(bytes instanceof Uint8Array) return bytes;
  if(bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if(ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(Array.isArray(bytes)) return Uint8Array.from(bytes);
  throw new Error('Artifact bytes must be Uint8Array, ArrayBuffer, TypedArray, or number[].');
}
function normalizeRecord(record){
  if(!record?.queueId && record?.queueId!==0) throw new Error('Artifact requires queueId.');
  if(!Number.isInteger(Number(record?.index)) || Number(record.index)<0) throw new Error('Artifact requires a non-negative integer index.');
  const bytes=toUint8Array(record.bytes||[]);
  return {
    key:key(record.queueId,record.index),queueId:String(record.queueId),index:Number(record.index),
    fileName:String(record.fileName||`item-${record.index}.bin`),mime:String(record.mime||'application/octet-stream'),
    bytes:new Uint8Array(bytes),byteLength:bytes.byteLength,fingerprint:String(record.fingerprint||''),
    serializer:String(record.serializer||''),colorSpace:String(record.colorSpace||''),deviceLinkFingerprint:String(record.deviceLinkFingerprint||''),productionJobId:String(record.productionJobId||''),
    createdAt:record.createdAt||nowIso(),updatedAt:nowIso(),
  };
}

function openDb(indexedDBImpl=globalThis.indexedDB){
  if(!indexedDBImpl) throw new Error('IndexedDB is not available in this environment.');
  return new Promise((resolve,reject)=>{
    const req=indexedDBImpl.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_NAME)){const store=db.createObjectStore(STORE_NAME,{keyPath:'key'});store.createIndex('queueId','queueId',{unique:false});}};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Unable to open BoxStudio artifact database.'));
  });
}
function txPromise(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed.'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted.'));});}

export function createIndexedDbArtifactStore(indexedDBImpl=globalThis.indexedDB){
  const withStore=async(mode,fn)=>{const db=await openDb(indexedDBImpl);try{const tx=db.transaction(STORE_NAME,mode),store=tx.objectStore(STORE_NAME),value=await fn(store,tx);await txPromise(tx);return value;}finally{db.close();}};
  return {
    async put(record){const normalized=normalizeRecord(record);await withStore('readwrite',store=>{store.put({...normalized,bytes:normalized.bytes.buffer.slice(normalized.bytes.byteOffset,normalized.bytes.byteOffset+normalized.bytes.byteLength)});});return normalized;},
    async get(queueId,index){return withStore('readonly',store=>new Promise((resolve,reject)=>{const req=store.get(key(queueId,index));req.onsuccess=()=>{const value=req.result;resolve(value?{...value,bytes:new Uint8Array(value.bytes)}:null);};req.onerror=()=>reject(req.error);}));},
    async list(queueId){return withStore('readonly',store=>new Promise((resolve,reject)=>{const idx=store.index('queueId'),req=idx.getAll(String(queueId));req.onsuccess=()=>resolve((req.result||[]).map(value=>({...value,bytes:new Uint8Array(value.bytes)})).sort((a,b)=>a.index-b.index));req.onerror=()=>reject(req.error);}));},
    async remove(queueId,index){await withStore('readwrite',store=>{store.delete(key(queueId,index));});},
    async clearQueue(queueId){const records=await this.list(queueId);await withStore('readwrite',store=>{for(const record of records)store.delete(record.key);});return records.length;},
  };
}

export function createMemoryArtifactStore(seed=[]){
  const map=new Map(seed.map(record=>{const normalized=normalizeRecord(record);return [normalized.key,normalized];}));
  return {
    async put(record){const normalized=normalizeRecord(record);map.set(normalized.key,normalized);return clone(normalized);},
    async get(queueId,index){const value=map.get(key(queueId,index));return value?clone(value):null;},
    async list(queueId){return [...map.values()].filter(record=>record.queueId===String(queueId)).sort((a,b)=>a.index-b.index).map(clone);},
    async remove(queueId,index){map.delete(key(queueId,index));},
    async clearQueue(queueId){let count=0;for(const [k,record] of [...map])if(record.queueId===String(queueId)){map.delete(k);count++;}return count;},
  };
}

export function artifactCoverage(queue,artifacts=[]){
  const artifactMap=new Map((artifacts||[]).map(record=>[Number(record.index),record]));
  const items=queue?.items||[];let completedWithArtifact=0,completedMissingArtifact=0,pendingRecoverable=0,bytes=0;
  for(const item of items){const artifact=artifactMap.get(Number(item.index));if(artifact)bytes+=Number(artifact.byteLength||artifact.bytes?.byteLength||0);if(item.status==='completed'){if(artifact)completedWithArtifact++;else completedMissingArtifact++;}else if(artifact)pendingRecoverable++;}
  return {total:items.length,artifactCount:artifactMap.size,completedWithArtifact,completedMissingArtifact,pendingRecoverable,bytes};
}

export function reconcileQueueArtifacts(queue,artifacts=[]){
  const next=clone(queue||{}),artifactMap=new Map((artifacts||[]).map(record=>[Number(record.index),record]));
  next.items=(next.items||[]).map(item=>{
    const artifact=artifactMap.get(Number(item.index));
    if(item.status==='completed'&&!artifact) return {...item,status:'pending',startedAt:null,finishedAt:null,error:null,fileName:null};
    if(item.status!=='completed'&&artifact) return {...item,status:'completed',startedAt:item.startedAt||artifact.createdAt||nowIso(),finishedAt:artifact.updatedAt||nowIso(),error:null,fileName:artifact.fileName||item.fileName||null};
    return item;
  });
  const unfinished=next.items.some(item=>item.status==='pending'||item.status==='running');
  const failed=next.items.some(item=>item.status==='failed');
  next.status=unfinished?'ready':(failed?'completed-with-errors':'completed');
  next.cancelRequested=false;next.pauseRequested=false;next.updatedAt=nowIso();
  return next;
}

export {DB_NAME,DB_VERSION,STORE_NAME,normalizeRecord as normalizeArtifactRecord,key as artifactKey};
