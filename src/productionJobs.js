import { runPreflight } from './preflight.js';

function clone(value){ return structuredClone(value); }
function nowIso(){ return new Date().toISOString(); }
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  return value;
}
function fnv1a(text=''){
  let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,0x01000193)>>>0;
  }
  return hash.toString(16).padStart(8,'0');
}

export function productionFingerprint(state){
  const payload={
    structure:state?.structure||{},
    variables:state?.variables||{},
    elements:state?.elements||[],
    customerProfileId:state?.customerProfileId||'',
    packagingRuleProfileId:state?.packagingRuleProfileId||'',
    markTemplateId:state?.markTemplateId||'',
    exportOptions:state?.exportOptions||{},
    lockedVariables:state?.lockedVariables||[],
    lockedGroups:state?.lockedGroups||{},
  };
  return fnv1a(JSON.stringify(stable(payload)));
}

function preflightSummary(state){
  const checks=runPreflight(state||{}),errors=checks.filter(check=>check.severity==='error'),warnings=checks.filter(check=>check.severity==='warning');
  return {
    errorCount:errors.length,
    warningCount:warnings.length,
    errors:errors.map(check=>({code:check.code||'',title:check.title||'',detail:check.detail||''})),
    warnings:warnings.map(check=>({code:check.code||'',title:check.title||'',detail:check.detail||''})),
  };
}
function audit(action,actor='local-user',note='',extra={}){
  return {id:`audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,at:nowIso(),action,actor:String(actor||'local-user'),note:String(note||''),...extra};
}
function assertStatus(job,allowed,action){
  if(!allowed.includes(job?.status)) throw new Error(`${action} is not allowed while job status is ${job?.status||'unknown'}.`);
}

export function createProductionJob(state,{id=null,label=null,actor='local-user',note=''}={}){
  const createdAt=nowIso(),summary=preflightSummary(state);
  return {
    id:id||`prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,
    label:String(label||`${state?.projectName||'BoxStudio'} · ${state?.variables?.sku||'No SKU'}`),
    status:'draft',revision:1,
    createdAt,updatedAt:createdAt,
    fingerprint:productionFingerprint(state),
    project:{name:state?.projectName||'',sku:String(state?.variables?.sku||''),packageIndex:String(state?.variables?.packageIndex||''),packageCount:String(state?.variables?.packageCount||'')},
    profiles:{customerProfileId:state?.customerProfileId||'',packagingRuleProfileId:state?.packagingRuleProfileId||'',markTemplateId:state?.markTemplateId||''},
    preflight:summary,
    audit:[audit('created',actor,note,{revision:1,errorCount:summary.errorCount,warningCount:summary.warningCount})],
  };
}

export function submitProductionJob(job,{actor='local-user',note=''}={}){
  assertStatus(job,['draft','rejected'],'Submit');
  if(Number(job?.preflight?.errorCount||0)>0) throw new Error(`Cannot submit production job with ${job.preflight.errorCount} preflight error(s).`);
  const next=clone(job);next.status='submitted';next.updatedAt=nowIso();next.audit=[...(next.audit||[]),audit('submitted',actor,note,{revision:next.revision})];return next;
}
export function approveProductionJob(job,{actor='local-user',note=''}={}){
  assertStatus(job,['submitted'],'Approve');
  if(Number(job?.preflight?.errorCount||0)>0) throw new Error('Cannot approve a production job with preflight errors.');
  const next=clone(job);next.status='approved';next.approvedAt=nowIso();next.updatedAt=next.approvedAt;next.audit=[...(next.audit||[]),audit('approved',actor,note,{revision:next.revision})];return next;
}
export function rejectProductionJob(job,{actor='local-user',note=''}={}){
  assertStatus(job,['submitted'],'Reject');
  const next=clone(job);next.status='rejected';next.updatedAt=nowIso();next.audit=[...(next.audit||[]),audit('rejected',actor,note,{revision:next.revision})];return next;
}
export function reviseProductionJob(job,state,{actor='local-user',note=''}={}){
  assertStatus(job,['draft','rejected','approved'],'Revise');
  const next=clone(job),summary=preflightSummary(state);next.revision=Math.max(1,Number(next.revision)||1)+1;next.status='draft';next.updatedAt=nowIso();next.approvedAt=null;next.fingerprint=productionFingerprint(state);next.project={name:state?.projectName||'',sku:String(state?.variables?.sku||''),packageIndex:String(state?.variables?.packageIndex||''),packageCount:String(state?.variables?.packageCount||'')};next.profiles={customerProfileId:state?.customerProfileId||'',packagingRuleProfileId:state?.packagingRuleProfileId||'',markTemplateId:state?.markTemplateId||''};next.preflight=summary;next.audit=[...(next.audit||[]),audit('revised',actor,note,{revision:next.revision,errorCount:summary.errorCount,warningCount:summary.warningCount})];return next;
}

export function approvalGate(state,job){
  if(!job) return {ok:false,reason:'No production job selected.'};
  if(job.status!=='approved') return {ok:false,reason:`Production job is ${job.status}, not approved.`};
  const fingerprint=productionFingerprint(state);
  if(fingerprint!==job.fingerprint) return {ok:false,reason:'Current artwork/structure no longer matches the approved revision.',expected:job.fingerprint,actual:fingerprint};
  if(Number(job?.preflight?.errorCount||0)>0) return {ok:false,reason:'Approved job contains preflight errors.'};
  return {ok:true,reason:'Approved production revision matches current project.',fingerprint};
}

export function upsertProductionJob(state,job,{activate=true}={}){
  const next=clone(state||{}),jobs=Array.isArray(next.productionJobs)?next.productionJobs:[],index=jobs.findIndex(item=>item?.id===job?.id);
  if(index>=0) jobs[index]=clone(job);else jobs.push(clone(job));next.productionJobs=jobs;if(activate)next.activeProductionJobId=job.id;return next;
}
export function deleteProductionJob(state,id){
  const next=clone(state||{});next.productionJobs=(next.productionJobs||[]).filter(job=>job?.id!==id);if(next.activeProductionJobId===id)next.activeProductionJobId=next.productionJobs[0]?.id||null;return next;
}
export function activeProductionJob(state){return (state?.productionJobs||[]).find(job=>job?.id===state?.activeProductionJobId)||null;}
