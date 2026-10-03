const BUNDLE_SCHEMA_VERSION=1;
function clone(value){return structuredClone(value);}
function nowIso(){return new Date().toISOString();}

export function createWorkspaceBundle(state,{label='BoxStudio Workspace Bundle'}={}){
  const source=state||{};
  return {
    schemaVersion:BUNDLE_SCHEMA_VERSION,
    type:'boxstudio-workspace-bundle',
    label:String(label||'BoxStudio Workspace Bundle'),
    createdAt:nowIso(),
    active:{
      customerProfileId:source.customerProfileId||'generic',
      packagingRuleProfileId:source.packagingRuleProfileId||'generic',
      markTemplateId:source.markTemplateId||null,
    },
    customCustomerProfiles:clone(source.customCustomerProfiles||{}),
    customPackagingRules:clone(source.customPackagingRules||{}),
    customMarkTemplates:clone(source.customMarkTemplates||{}),
    customMarkAssets:clone(source.customMarkAssets||{}),
    masterTemplates:clone(Array.isArray(source.masterTemplates)?source.masterTemplates:[]),
  };
}

export function validateWorkspaceBundle(bundle){
  const issues=[];
  if(!bundle||typeof bundle!=='object') return {ok:false,issues:['Bundle is not an object.']};
  if(bundle.type!=='boxstudio-workspace-bundle') issues.push('Unsupported bundle type.');
  if(Number(bundle.schemaVersion)!==BUNDLE_SCHEMA_VERSION) issues.push(`Unsupported bundle schemaVersion: ${bundle.schemaVersion}`);
  for(const key of ['customCustomerProfiles','customPackagingRules','customMarkTemplates','customMarkAssets']){
    if(bundle[key]!=null&&(typeof bundle[key]!=='object'||Array.isArray(bundle[key]))) issues.push(`${key} must be an object.`);
  }
  if(bundle.masterTemplates!=null&&!Array.isArray(bundle.masterTemplates)) issues.push('masterTemplates must be an array.');
  return {ok:issues.length===0,issues};
}

function mergeCatalog(target={},incoming={},strategy='replace'){
  const out={...clone(target)};
  for(const [id,value] of Object.entries(incoming||{})){
    if(strategy==='skip'&&out[id]) continue;
    out[id]=clone(value);
  }
  return out;
}
function mergeMasters(target=[],incoming=[],strategy='replace'){
  const out=clone(Array.isArray(target)?target:[]);
  for(const item of incoming||[]){
    const at=out.findIndex(existing=>existing?.id===item?.id);
    if(at<0){out.push(clone(item));continue;}
    if(strategy==='skip') continue;
    out[at]=clone(item);
  }
  return out;
}

export function applyWorkspaceBundle(state,bundle,{strategy='replace',applyActive=true}={}){
  const check=validateWorkspaceBundle(bundle);
  if(!check.ok) throw new Error(check.issues.join(' '));
  if(!['replace','skip'].includes(strategy)) throw new Error(`Unsupported merge strategy: ${strategy}`);
  const next=clone(state||{});
  next.customCustomerProfiles=mergeCatalog(next.customCustomerProfiles,bundle.customCustomerProfiles,strategy);
  next.customPackagingRules=mergeCatalog(next.customPackagingRules,bundle.customPackagingRules,strategy);
  next.customMarkTemplates=mergeCatalog(next.customMarkTemplates,bundle.customMarkTemplates,strategy);
  next.customMarkAssets=mergeCatalog(next.customMarkAssets,bundle.customMarkAssets,strategy);
  next.masterTemplates=mergeMasters(next.masterTemplates,bundle.masterTemplates,strategy);
  if(applyActive&&bundle.active){
    if(bundle.active.customerProfileId) next.customerProfileId=bundle.active.customerProfileId;
    if(bundle.active.packagingRuleProfileId) next.packagingRuleProfileId=bundle.active.packagingRuleProfileId;
    if(bundle.active.markTemplateId) next.markTemplateId=bundle.active.markTemplateId;
  }
  return next;
}

export function serializeWorkspaceBundle(bundle){
  const check=validateWorkspaceBundle(bundle);
  if(!check.ok) throw new Error(check.issues.join(' '));
  return JSON.stringify(bundle,null,2);
}
export function parseWorkspaceBundle(text){
  const bundle=JSON.parse(text);
  const check=validateWorkspaceBundle(bundle);
  if(!check.ok) throw new Error(check.issues.join(' '));
  return bundle;
}
