const PROJECT_SCHEMA='boxstudio-project-envelope';
const PROJECT_SCHEMA_VERSION=1;
const LOCAL_LIBRARY_KEY='boxstudio-project-library-v1';

function clone(value){return structuredClone(value);}
function nowIso(){return new Date().toISOString();}
function slug(value='project'){
  const out=String(value||'project').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');
  return out||`project-${Date.now()}`;
}
function assertEnvelope(envelope){
  if(!envelope||typeof envelope!=='object') throw new Error('Project envelope is missing.');
  if(envelope.schema!==PROJECT_SCHEMA) throw new Error(`Unsupported project schema: ${envelope.schema||'unknown'}.`);
  if(Number(envelope.schemaVersion)!==PROJECT_SCHEMA_VERSION) throw new Error(`Unsupported project schema version: ${envelope.schemaVersion}.`);
  if(!envelope.id) throw new Error('Project envelope requires an id.');
  if(!envelope.state||typeof envelope.state!=='object') throw new Error('Project envelope requires state.');
  return envelope;
}

export function snapshotProjectState(state={}){
  const next=clone(state||{});
  delete next.savedAt;
  if(next.batch?.queue) next.batch={...next.batch,queue:clone(next.batch.queue)};
  if(next.remoteSync) delete next.remoteSync;
  return next;
}

export function createProjectEnvelope(state,{id=null,label=null,revision=1,parentRevision=null,updatedBy='local-user',metadata={}}={}){
  const createdAt=nowIso();
  return {
    schema:PROJECT_SCHEMA,
    schemaVersion:PROJECT_SCHEMA_VERSION,
    id:slug(id||state?.projectId||state?.projectName||'boxstudio-project'),
    label:String(label||state?.projectName||'BoxStudio Project'),
    revision:Math.max(1,Number(revision)||1),
    parentRevision:parentRevision==null?null:Math.max(0,Number(parentRevision)||0),
    createdAt,
    updatedAt:createdAt,
    updatedBy:String(updatedBy||'local-user'),
    metadata:clone(metadata||{}),
    state:snapshotProjectState(state),
  };
}

export function reviseProjectEnvelope(previous,state,{updatedBy='local-user',label=null,metadata=null}={}){
  assertEnvelope(previous);
  const next=createProjectEnvelope(state,{id:previous.id,label:label||previous.label,revision:Number(previous.revision||1)+1,parentRevision:Number(previous.revision||1),updatedBy,metadata:metadata==null?previous.metadata:metadata});
  next.createdAt=previous.createdAt||next.createdAt;
  return next;
}

export function validateProjectEnvelope(envelope){
  try{assertEnvelope(envelope);return {ok:true,errors:[]};}
  catch(error){return {ok:false,errors:[error?.message||String(error)]};}
}
export function serializeProjectEnvelope(envelope){assertEnvelope(envelope);return JSON.stringify(envelope,null,2);}
export function parseProjectEnvelope(text){const parsed=JSON.parse(String(text||''));assertEnvelope(parsed);return parsed;}
export function applyProjectEnvelope(currentState,envelope){assertEnvelope(envelope);return {...clone(currentState||{}),...clone(envelope.state),projectId:envelope.id,projectRemoteRevision:Number(envelope.revision)||1};}

function readLibrary(storage){
  try{const parsed=JSON.parse(storage?.getItem?.(LOCAL_LIBRARY_KEY)||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch{return {};}
}
function writeLibrary(storage,library){storage?.setItem?.(LOCAL_LIBRARY_KEY,JSON.stringify(library));}
export function createLocalProjectLibrary(storage=globalThis.localStorage){
  return {
    list(){return Object.values(readLibrary(storage)).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).map(clone);},
    load(id){const item=readLibrary(storage)[id];return item?clone(item):null;},
    save(envelope){assertEnvelope(envelope);const library=readLibrary(storage),copy=clone(envelope);copy.updatedAt=nowIso();library[copy.id]=copy;writeLibrary(storage,library);return clone(copy);},
    remove(id){const library=readLibrary(storage),existed=Boolean(library[id]);delete library[id];writeLibrary(storage,library);return existed;},
    clear(){writeLibrary(storage,{});},
  };
}

function joinUrl(base,path=''){
  const root=String(base||'').trim().replace(/\/+$/,'');
  if(!/^https?:\/\//i.test(root)) throw new Error('Remote project endpoint must start with http:// or https://.');
  return `${root}/${String(path||'').replace(/^\/+/, '')}`;
}
async function decodeResponse(response){
  const type=response.headers?.get?.('content-type')||'';
  if(response.status===204) return null;
  if(type.includes('application/json')) return response.json();
  const text=await response.text();
  try{return JSON.parse(text);}catch{return text;}
}

export function createRestProjectStore({baseUrl,fetchImpl=globalThis.fetch,headers={}}={}){
  if(typeof fetchImpl!=='function') throw new Error('Fetch implementation is required for REST project store.');
  const request=async(path,options={})=>{
    const response=await fetchImpl(joinUrl(baseUrl,path),{...options,headers:{accept:'application/json',...headers,...(options.headers||{})}});
    const body=await decodeResponse(response);
    if(!response.ok){
      const detail=body?.message||body?.error||body||response.statusText;
      const error=new Error(`Remote project store ${response.status}: ${detail}`);error.status=response.status;error.body=body;throw error;
    }
    return body;
  };
  return {
    async list(){const body=await request('projects');return Array.isArray(body)?body:(body?.projects||[]);},
    async load(id){const body=await request(`projects/${encodeURIComponent(id)}`);assertEnvelope(body);return body;},
    async save(envelope,{expectedRevision=null}={}){
      assertEnvelope(envelope);
      const extra=expectedRevision==null?{}:{'if-match':String(expectedRevision)};
      const body=await request(`projects/${encodeURIComponent(envelope.id)}`,{method:'PUT',headers:{'content-type':'application/json',...extra},body:JSON.stringify(envelope)});
      assertEnvelope(body);return body;
    },
    async remove(id,{expectedRevision=null}={}){
      const extra=expectedRevision==null?{}:{'if-match':String(expectedRevision)};
      return request(`projects/${encodeURIComponent(id)}`,{method:'DELETE',headers:extra});
    },
  };
}

export {PROJECT_SCHEMA,PROJECT_SCHEMA_VERSION,LOCAL_LIBRARY_KEY};
