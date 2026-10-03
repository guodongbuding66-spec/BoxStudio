const DEFAULT_MERGE_DOMAINS=[
  'projectName','structure','variables','elements','hiddenGroups','lockedGroups','lockedVariables',
  'customerProfileId','packagingRuleProfileId','markTemplateId','masterTemplates','customCustomerProfiles','customPackagingRules','customMarkTemplates','customMarkAssets',
  'exportOptions','repairTolerance','productionJobs','activeProductionJobId','batch',
];

function clone(value){return structuredClone(value);}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
function equal(a,b){return JSON.stringify(stable(a))===JSON.stringify(stable(b));}

export function analyzeProjectMerge({baseState=null,localState={},remoteState={},domains=DEFAULT_MERGE_DOMAINS}={}){
  const hasBase=Boolean(baseState&&typeof baseState==='object'),entries=[];
  for(const path of domains){const local=localState?.[path],remote=remoteState?.[path],base=hasBase?baseState?.[path]:undefined;let status='same';
    if(!hasBase)status=equal(local,remote)?'same':'conflict';
    else{const lc=!equal(local,base),rc=!equal(remote,base);if(equal(local,remote))status=lc||rc?'both-same':'same';else if(lc&&!rc)status='local';else if(!lc&&rc)status='remote';else if(lc&&rc)status='conflict';}
    entries.push({path,status,local:clone(local),remote:clone(remote),base:clone(base)});
  }
  return{hasBase,entries,conflicts:entries.filter(entry=>entry.status==='conflict'),localOnly:entries.filter(entry=>entry.status==='local'),remoteOnly:entries.filter(entry=>entry.status==='remote'),autoMergeable:entries.every(entry=>entry.status!=='conflict')};
}

export function applyProjectMerge(analysis,{localState={},remoteState={},resolutions={}}={}){
  if(!analysis?.entries)throw new Error('Merge analysis is required.');const next=clone(localState||{}),unresolved=[];
  for(const entry of analysis.entries){if(entry.status==='remote')next[entry.path]=clone(remoteState?.[entry.path]);else if(entry.status==='both-same'||entry.status==='same')next[entry.path]=clone(localState?.[entry.path]);else if(entry.status==='local')next[entry.path]=clone(localState?.[entry.path]);else if(entry.status==='conflict'){const choice=resolutions?.[entry.path];if(choice==='remote')next[entry.path]=clone(remoteState?.[entry.path]);else if(choice==='local')next[entry.path]=clone(localState?.[entry.path]);else unresolved.push(entry.path);}}
  return{state:next,unresolved};
}

export function mergeSummary(analysis){return{domains:analysis?.entries?.length||0,conflicts:analysis?.conflicts?.length||0,localOnly:analysis?.localOnly?.length||0,remoteOnly:analysis?.remoteOnly?.length||0,autoMergeable:Boolean(analysis?.autoMergeable)};}
export {DEFAULT_MERGE_DOMAINS};
