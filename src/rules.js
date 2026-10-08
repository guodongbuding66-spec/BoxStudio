export const PACKAGING_RULE_PROFILES = Object.freeze({
  artwork: Object.freeze({
    id:'artwork',label:'包装图文设计',requiredVariables:[],requireOrigin:false,requireDestination:false,requireCrnBindings:0,packageNoticeWhenMultiple:false,fixedVariables:Object.freeze({}),barcodeQr:Object.freeze({required:false,allowedPresets:['250x80','200x64'],ratio:3.125,ratioTolerance:0.03,requireLockAspect:false}),
  }),
  generic: Object.freeze({
    id:'generic',label:'Generic Packaging',requiredVariables:['sku'],requireOrigin:false,requireDestination:false,requireCrnBindings:0,packageNoticeWhenMultiple:true,fixedVariables:Object.freeze({}),barcodeQr:Object.freeze({required:false,allowedPresets:['250x80','200x64'],ratio:3.125,ratioTolerance:0.03,requireLockAspect:false}),
  }),
  'us-side-seal': Object.freeze({
    id:'us-side-seal',label:'US Side-Seal Carton',requiredVariables:['sku','nw','gw','crn','contractNo','originCountry','destinationCountry'],requireOrigin:true,requireDestination:true,requireCrnBindings:2,packageNoticeWhenMultiple:true,fixedVariables:Object.freeze({}),barcodeQr:Object.freeze({required:true,allowedPresets:['250x80','200x64'],ratio:3.125,ratioTolerance:0.03,requireLockAspect:true}),
  }),
});

const DEFAULT_BARCODE_QR=Object.freeze({required:false,allowedPresets:['250x80','200x64'],ratio:3.125,ratioTolerance:0.03,requireLockAspect:false});
function nowIso(){return new Date().toISOString();}
function slug(value='custom-rule'){const out=String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return out||`custom-rule-${Date.now()}`;}
function uniqueStrings(values=[]){return Array.from(new Set((Array.isArray(values)?values:String(values||'').split(',')).map(v=>String(v).trim()).filter(Boolean)));}
function snapshotWithoutVersions(rule){const copy=structuredClone(rule||{});delete copy.versions;return copy;}

export function normalizePackagingRuleProfile(profile={}){
  const barcodeQr={...DEFAULT_BARCODE_QR,...(profile.barcodeQr||{})};
  barcodeQr.allowedPresets=uniqueStrings(barcodeQr.allowedPresets?.length?barcodeQr.allowedPresets:DEFAULT_BARCODE_QR.allowedPresets);
  barcodeQr.ratio=Number(barcodeQr.ratio)>0?Number(barcodeQr.ratio):3.125;
  barcodeQr.ratioTolerance=Number(barcodeQr.ratioTolerance)>=0?Number(barcodeQr.ratioTolerance):0.03;
  const createdAt=profile.createdAt||nowIso();
  return {
    id:slug(profile.id||profile.label||'custom-rule'),label:String(profile.label||profile.id||'Custom Packaging Rule').trim(),requiredVariables:uniqueStrings(profile.requiredVariables||[]),requireOrigin:Boolean(profile.requireOrigin),requireDestination:Boolean(profile.requireDestination),requireCrnBindings:Math.max(0,Math.floor(Number(profile.requireCrnBindings)||0)),packageNoticeWhenMultiple:profile.packageNoticeWhenMultiple!==false,fixedVariables:profile.fixedVariables&&typeof profile.fixedVariables==='object'?{...profile.fixedVariables}:{},barcodeQr,custom:true,
    revision:Math.max(1,Number(profile.revision)||1),revisionNote:String(profile.revisionNote||'').trim()||'Initial rule',createdAt,updatedAt:profile.updatedAt||createdAt,versions:Array.isArray(profile.versions)?structuredClone(profile.versions):[],
  };
}

export function getPackagingRuleCatalog(state=null){return {...PACKAGING_RULE_PROFILES,...((state?.customPackagingRules&&typeof state.customPackagingRules==='object')?state.customPackagingRules:{})};}
export function getPackagingRuleProfile(id='generic',state=null){const catalog=getPackagingRuleCatalog(state);return catalog[id]||PACKAGING_RULE_PROFILES.generic;}

export function saveCustomPackagingRule(state,profile,{note=''}={}){
  const next=structuredClone(state||{}),normalized=normalizePackagingRuleProfile(profile);
  if(PACKAGING_RULE_PROFILES[normalized.id]) throw new Error('Built-in packaging rules cannot be overwritten.');
  const existing=next.customPackagingRules?.[normalized.id];
  if(existing){
    const current=normalizePackagingRuleProfile(existing),archived={...snapshotWithoutVersions(current),archivedAt:nowIso()};
    normalized.revision=current.revision+1;
    normalized.revisionNote=String(note||profile.revisionNote||'').trim()||`Revision ${normalized.revision}`;
    normalized.createdAt=current.createdAt;
    normalized.updatedAt=nowIso();
    normalized.versions=[...(current.versions||[]),archived];
  }else{
    normalized.revision=1;
    normalized.revisionNote=String(note||profile.revisionNote||'').trim()||'Initial rule';
    normalized.createdAt=normalized.createdAt||nowIso();
    normalized.updatedAt=normalized.createdAt;
  }
  next.customPackagingRules={...(next.customPackagingRules||{}),[normalized.id]:normalized};
  return next;
}

export function listPackagingRuleRevisions(rule){
  if(!rule?.custom) return [];
  const current=normalizePackagingRuleProfile(rule),archived=(current.versions||[]).map(v=>({revision:Number(v.revision)||1,label:v.label||current.label,revisionNote:v.revisionNote||'',updatedAt:v.updatedAt||v.createdAt||'',current:false}));
  return [...archived,{revision:current.revision,label:current.label,revisionNote:current.revisionNote||'',updatedAt:current.updatedAt||current.createdAt||'',current:true}].sort((a,b)=>b.revision-a.revision);
}

export function restorePackagingRuleRevision(state,id,revision){
  if(PACKAGING_RULE_PROFILES[id]) throw new Error('Built-in packaging rules do not have editable revision history.');
  const next=structuredClone(state||{}),currentRaw=next.customPackagingRules?.[id];
  if(!currentRaw) throw new Error(`Packaging rule ${id} was not found.`);
  const current=normalizePackagingRuleProfile(currentRaw),target=Number(revision);
  if(target===current.revision) return next;
  const archived=(current.versions||[]).find(v=>Number(v.revision)===target);
  if(!archived) throw new Error(`Revision ${revision} was not found.`);
  const currentSnapshot={...snapshotWithoutVersions(current),archivedAt:nowIso()};
  const restored=normalizePackagingRuleProfile({...archived,id:current.id,label:current.label,revision:current.revision+1,revisionNote:`Restored from revision ${target}`,createdAt:current.createdAt,updatedAt:nowIso(),versions:[...(current.versions||[]),currentSnapshot]});
  next.customPackagingRules={...(next.customPackagingRules||{}),[id]:restored};
  return next;
}

export function deleteCustomPackagingRule(state,id){
  if(PACKAGING_RULE_PROFILES[id]) throw new Error('Built-in packaging rules cannot be deleted.');
  const next=structuredClone(state||{}),rules={...(next.customPackagingRules||{})};delete rules[id];next.customPackagingRules=rules;if(next.packagingRuleProfileId===id)next.packagingRuleProfileId='generic';return next;
}

function renderedTemplate(element,variables){return String(element?.template||'').replace(/{{\s*(\w+)\s*}}/g,(_,key)=>String(variables?.[key]??''));}
export function countVariableBindings(elements=[],variableName){const needle=new RegExp(`{{\\s*${variableName}\\s*}}`,'i');return elements.filter(element=>needle.test(String(element?.template||''))).length;}

export function validatePackagingRuleState(state,profileId=state?.packagingRuleProfileId||'generic'){
  const profile=getPackagingRuleProfile(profileId,state),variables=state?.variables||{},elements=Array.isArray(state?.elements)?state.elements:[],checks=[];
  for(const key of profile.requiredVariables||[]){const value=String(variables[key]??'').trim();checks.push({severity:value?'pass':'error',title:`Rule · ${key}`,detail:value||`Required by ${profile.label}`,code:`rule.required.${key}`});}
  for(const [key,expected] of Object.entries(profile.fixedVariables||{})){const actual=String(variables[key]??''),ok=actual===String(expected);checks.push({severity:ok?'pass':'error',title:`Rule · fixed ${key}`,detail:ok?actual:`Expected ${expected}; got ${actual||'(empty)'}`,code:`rule.fixed.${key}`});}
  const packageCount=Number(variables.packageCount||1),packageIndex=Number(variables.packageIndex||1),packageOk=Number.isFinite(packageCount)&&Number.isFinite(packageIndex)&&packageCount>=1&&packageIndex>=1&&packageIndex<=packageCount;
  checks.push({severity:packageOk?'pass':'error',title:'Rule · Package index/count',detail:packageOk?`${packageIndex}/${packageCount}`:`Invalid package index/count: ${packageIndex}/${packageCount}`,code:'rule.package.index'});
  if(profile.packageNoticeWhenMultiple&&packageCount>1){const notice=elements.find(element=>element?.id==='packageNotice'||element?.type==='notice'),visibleText=renderedTemplate(notice,variables).trim();checks.push({severity:notice&&visibleText?'pass':'error',title:'Rule · Multi-package notice',detail:notice&&visibleText?visibleText.replace(/\n/g,' / '):'Multiple packages require a package notice element.',code:'rule.package.notice'});}
  if(profile.requireCrnBindings>0){const bindings=countVariableBindings(elements,'crn');checks.push({severity:bindings>=profile.requireCrnBindings?'pass':'error',title:'Rule · CRN repeated binding',detail:`${bindings} binding(s); minimum ${profile.requireCrnBindings}`,code:'rule.crn.bindings'});}
  const group=elements.find(element=>element?.type==='barcode-qr-group');
  if(profile.barcodeQr?.required&&!group) checks.push({severity:'error',title:'Rule · Barcode + QR group',detail:'Missing required locked group.',code:'rule.barcodeQr.missing'});
  else if(group){const settings={...DEFAULT_BARCODE_QR,...(profile.barcodeQr||{})},width=Number(group.w),height=Number(group.h),ratio=height>0?width/height:0,ratioOk=Math.abs(ratio-settings.ratio)<=settings.ratioTolerance,presetOk=!group.preset||settings.allowedPresets.includes(group.preset),lockOk=!settings.requireLockAspect||group.lockAspect===true;checks.push({severity:ratioOk?'pass':'error',title:'Rule · Barcode + QR ratio',detail:`${width}×${height} mm · ratio ${ratio.toFixed(3)}`,code:'rule.barcodeQr.ratio'});checks.push({severity:presetOk?'pass':'warning',title:'Rule · Barcode + QR preset',detail:group.preset||'custom size',code:'rule.barcodeQr.preset'});checks.push({severity:lockOk?'pass':'error',title:'Rule · Barcode + QR aspect lock',detail:lockOk?'Aspect lock enabled.':'Aspect lock is required.',code:'rule.barcodeQr.lock'});}
  checks.unshift({severity:'pass',title:'Packaging Rule Profile',detail:`${profile.label}${profile.custom?` · custom r${profile.revision||1}`:''}`,code:'rule.profile'});
  return checks;
}
