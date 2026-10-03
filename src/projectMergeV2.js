const DEFAULT_OBJECT_MERGE_DOMAINS=['elements','masterTemplates','productionJobs'];
const DEFAULT_MAP_MERGE_DOMAINS=['customCustomerProfiles','customPackagingRules','customMarkTemplates','customMarkAssets'];

function clone(v){return structuredClone(v)}
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v}
function equal(a,b){return JSON.stringify(stable(a))===JSON.stringify(stable(b))}
function isObject(v){return Boolean(v)&&typeof v==='object'&&!Array.isArray(v)}
function keyedArray(value){return Array.isArray(value)&&value.every(item=>!item||typeof item!=='object'||item.id!=null)}
function mapById(value=[]){const m=new Map();for(const item of value||[])if(item&&item.id!=null)m.set(String(item.id),item);return m}
function keysOf(...objects){const out=new Set();for(const o of objects)for(const k of Object.keys(o||{}))out.add(k);return [...out]}

function threeWayStatus(base,local,remote,hasBase=true){
  if(!hasBase)return equal(local,remote)?'same':'conflict';
  const lc=!equal(local,base),rc=!equal(remote,base);
  if(equal(local,remote))return lc||rc?'both-same':'same';
  if(lc&&!rc)return'local';if(!lc&&rc)return'remote';if(lc&&rc)return'conflict';return'same';
}

function mergeLeaf(path,base,local,remote,hasBase,conflicts){
  const status=threeWayStatus(base,local,remote,hasBase);
  if(status==='remote')return clone(remote);
  if(status==='conflict'){conflicts.push({path,status,base:clone(base),local:clone(local),remote:clone(remote)});return clone(local)}
  return clone(local);
}

function mergeObject(path,base={},local={},remote={},hasBase,conflicts){
  const out={};for(const key of keysOf(base,local,remote)){const p=path?`${path}.${key}`:key,b=base?.[key],l=local?.[key],r=remote?.[key];
    if(isObject(l)||isObject(r)||isObject(b))out[key]=mergeObject(p,isObject(b)?b:{},isObject(l)?l:{},isObject(r)?r:{},hasBase,conflicts);
    else out[key]=mergeLeaf(p,b,l,r,hasBase,conflicts);
  }return out;
}

function mergeKeyedArray(path,base=[],local=[],remote=[],hasBase,conflicts){
  const bm=mapById(base),lm=mapById(local),rm=mapById(remote),ids=[...new Set([...bm.keys(),...lm.keys(),...rm.keys()])],out=[];
  const localOrder=(local||[]).map(item=>String(item?.id)).filter(Boolean),remoteOrder=(remote||[]).map(item=>String(item?.id)).filter(Boolean),order=[...localOrder,...remoteOrder.filter(id=>!localOrder.includes(id)),...ids.filter(id=>!localOrder.includes(id)&&!remoteOrder.includes(id))];
  const merged=new Map();for(const id of ids){const b=bm.get(id),l=lm.get(id),r=rm.get(id),p=`${path}[${id}]`;
    if(l===undefined||r===undefined){const status=threeWayStatus(b,l,r,hasBase);if(status==='remote'){if(r!==undefined)merged.set(id,clone(r));continue;}if(status==='conflict'){conflicts.push({path:p,status,base:clone(b),local:clone(l),remote:clone(r),kind:'presence'});if(l!==undefined)merged.set(id,clone(l));continue;}if(l!==undefined)merged.set(id,clone(l));continue;}
    merged.set(id,mergeObject(p,isObject(b)?b:{},l,r,hasBase,conflicts));
  }
  for(const id of order)if(merged.has(id))out.push(merged.get(id));return out;
}

function mergeMapDomain(path,base={},local={},remote={},hasBase,conflicts){
  const out={};for(const id of keysOf(base,local,remote)){const b=base?.[id],l=local?.[id],r=remote?.[id],p=`${path}.${id}`;
    if(l===undefined||r===undefined){const status=threeWayStatus(b,l,r,hasBase);if(status==='remote'){if(r!==undefined)out[id]=clone(r);continue;}if(status==='conflict'){conflicts.push({path:p,status,base:clone(b),local:clone(l),remote:clone(r),kind:'presence'});if(l!==undefined)out[id]=clone(l);continue;}if(l!==undefined)out[id]=clone(l);continue;}
    out[id]=mergeObject(p,isObject(b)?b:{},isObject(l)?l:{},isObject(r)?r:{},hasBase,conflicts);
  }return out;
}

export function analyzeObjectLevelMerge({baseState=null,localState={},remoteState={},objectDomains=DEFAULT_OBJECT_MERGE_DOMAINS,mapDomains=DEFAULT_MAP_MERGE_DOMAINS}={}){
  const hasBase=Boolean(baseState&&typeof baseState==='object'),merged=clone(localState||{}),conflicts=[],summaries=[];
  for(const path of objectDomains){const b=baseState?.[path]||[],l=localState?.[path]||[],r=remoteState?.[path]||[];if(!keyedArray(l)||!keyedArray(r)||!keyedArray(b)){merged[path]=mergeLeaf(path,b,l,r,hasBase,conflicts);summaries.push({path,mode:'atomic'});continue;}const before=conflicts.length;merged[path]=mergeKeyedArray(path,b,l,r,hasBase,conflicts);summaries.push({path,mode:'id+field',conflicts:conflicts.length-before,count:merged[path].length});}
  for(const path of mapDomains){const before=conflicts.length;merged[path]=mergeMapDomain(path,baseState?.[path]||{},localState?.[path]||{},remoteState?.[path]||{},hasBase,conflicts);summaries.push({path,mode:'key+field',conflicts:conflicts.length-before,count:Object.keys(merged[path]||{}).length});}
  return{hasBase,merged,conflicts,summaries,autoMergeable:conflicts.length===0};
}

function setPath(root,path,value){
  const tokens=[];String(path).replace(/([^.[\]]+)|\[([^\]]+)\]/g,(_,a,b)=>{tokens.push(a??b);return''});let node=root;
  for(let i=0;i<tokens.length-1;i++){const token=tokens[i],next=tokens[i+1];if(Array.isArray(node)){let item=node.find(v=>String(v?.id)===String(token));if(!item){item={id:token};node.push(item)}node=item;}else{if(node[token]==null)node[token]=/^\d+$/.test(next)?[]:{};node=node[token];}}
  const last=tokens[tokens.length-1];if(Array.isArray(node)){const idx=node.findIndex(v=>String(v?.id)===String(last));if(value===undefined){if(idx>=0)node.splice(idx,1)}else if(idx>=0)node[idx]=clone(value);else node.push(clone(value));}else if(value===undefined)delete node[last];else node[last]=clone(value);
}

export function applyObjectLevelResolutions(analysis,resolutions={}){
  if(!analysis?.merged)throw new Error('Object-level merge analysis is required.');const state=clone(analysis.merged),unresolved=[];
  for(const conflict of analysis.conflicts||[]){const choice=resolutions[conflict.path];if(choice==='local')setPath(state,conflict.path,conflict.local);else if(choice==='remote')setPath(state,conflict.path,conflict.remote);else unresolved.push(conflict.path);}
  return{state,unresolved};
}

export function objectMergeSummary(analysis){return{conflicts:analysis?.conflicts?.length||0,domains:analysis?.summaries?.length||0,autoMergeable:Boolean(analysis?.autoMergeable),fieldLevel:(analysis?.summaries||[]).filter(s=>s.mode!=='atomic').length};}
export {DEFAULT_OBJECT_MERGE_DOMAINS,DEFAULT_MAP_MERGE_DOMAINS};
