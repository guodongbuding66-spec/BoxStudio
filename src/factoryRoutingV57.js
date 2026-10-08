import { normalizeFactoryDatabaseV56, evaluateFactoryCapabilityV56 } from './factoryProfilesV56.js';

export const V57_PRODUCT_VERSION='V0.57';
export const V57_ROUTING_SCHEMA='boxstudio-v57-factory-routing';
export const V57_JOB_SCHEMA='boxstudio-v57-manufacturing-job';
export const V57_TICKET_SCHEMA='boxstudio-v57-manufacturing-job-ticket';
export const V57_STORAGE_KEY='boxstudio-v57-routing';

const clone=v=>structuredClone(v);
const num=(v,d=null)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const CRITICAL_CODES=new Set(['V56_MATERIAL_CATEGORY','V56_FLUTE_CAPABILITY','V56_THICKNESS_CAPABILITY','V56_BLANK_SIZE','V56_DIECUTTER_REQUIRED','V56_DIECUTTER_SIZE','V56_FOLD_PENETRATION']);
const CONDITIONAL_CODES=new Set(['V56_FOLDER_GLUER_REQUIRED','V56_FOLDER_GLUER_PANEL','V56_CONCURRENT_FOLDS','V56_GLUE_SYSTEM','V56_GLUE_WIDTH','V56_CREASE_MATRIX']);

export function normalizeRoutingMetaV57(input={},factoryId=''){
  const currency=String(input.currency||'USD').trim().toUpperCase()||'USD';
  return{
    factoryId:String(input.factoryId||factoryId),
    enabled:input.enabled!==false,
    priority:clamp(num(input.priority,50),0,100),
    loadPercent:input.loadPercent==null?null:clamp(num(input.loadPercent,0),0,100),
    leadDays:input.leadDays==null?null:Math.max(0,num(input.leadDays,0)),
    setupCost:input.setupCost==null?null:Math.max(0,num(input.setupCost,0)),
    costPer1000:input.costPer1000==null?null:Math.max(0,num(input.costPer1000,0)),
    currency,
    capacityPerDay:input.capacityPerDay==null?null:Math.max(0,num(input.capacityPerDay,0)),
    backupAllowed:input.backupAllowed!==false,
    notes:String(input.notes||''),
  };
}

export function createRoutingDatabaseV57(factoryDb={}){
  const db=normalizeFactoryDatabaseV56(factoryDb),factories={};
  for(const p of db.profiles)factories[p.id]=normalizeRoutingMetaV57({factoryId:p.id},p.id);
  return{schema:V57_ROUTING_SCHEMA,version:1,factories};
}
export function normalizeRoutingDatabaseV57(factoryDb={},input={}){
  const base=createRoutingDatabaseV57(factoryDb),src=input?.factories||{};
  for(const id of Object.keys(base.factories))base.factories[id]=normalizeRoutingMetaV57(src[id]||base.factories[id],id);
  return base;
}
export function updateRoutingMetaV57(factoryDb={},routingDb={},factoryId='',patch={}){
  const next=normalizeRoutingDatabaseV57(factoryDb,routingDb);if(!next.factories[factoryId])return next;
  next.factories[factoryId]=normalizeRoutingMetaV57({...next.factories[factoryId],...patch,factoryId},factoryId);return next;
}
export function normalizeRoutingJobV57(job={}){
  return{
    schema:V57_JOB_SCHEMA,
    jobId:String(job.jobId||'JOB-001'),
    quantity:Math.max(1,Math.round(num(job.quantity,1000))),
    targetLeadDays:job.targetLeadDays==null?null:Math.max(0,num(job.targetLeadDays,0)),
    maxTotalCost:job.maxTotalCost==null?null:Math.max(0,num(job.maxTotalCost,0)),
    currency:String(job.currency||'USD').trim().toUpperCase()||'USD',
    preferMode:['machine','manual','any'].includes(job.preferMode)?job.preferMode:'machine',
    preferredFactoryId:String(job.preferredFactoryId||''),
    notes:String(job.notes||''),
  };
}
function planningCompleteness(meta){const fields=['loadPercent','leadDays','setupCost','costPer1000','capacityPerDay'],filled=fields.filter(k=>meta[k]!=null);return{filled:filled.length,total:fields.length,ratio:filled.length/fields.length,missing:fields.filter(k=>meta[k]==null)}}
function estimateCost(meta,job){if(meta.currency!==job.currency||meta.setupCost==null||meta.costPer1000==null)return null;return Math.round((meta.setupCost+meta.costPer1000*(job.quantity/1000))*100)/100}
function operationalFlags(meta,job,profile){const flags=[];if(meta.loadPercent!=null&&meta.loadPercent>=90)flags.push({code:'V57_HIGH_LOAD',severity:'conditional',detail:`设备负载 ${meta.loadPercent}% ≥ 90%。`});if(job.targetLeadDays!=null&&meta.leadDays!=null&&meta.leadDays>job.targetLeadDays)flags.push({code:'V57_LEAD_TIME',severity:'conditional',detail:`预计 ${meta.leadDays} 天超过目标 ${job.targetLeadDays} 天。`});if(meta.capacityPerDay!=null&&meta.capacityPerDay>0){const days=job.quantity/meta.capacityPerDay;if(job.targetLeadDays!=null&&days>job.targetLeadDays)flags.push({code:'V57_CAPACITY',severity:'conditional',detail:`按 ${meta.capacityPerDay}/天估算需 ${Math.ceil(days)} 天，超过目标交期。`})}if(job.preferMode!=='any'&&profile.mode!==job.preferMode)flags.push({code:'V57_MODE_PREFERENCE',severity:'conditional',detail:`当前为 ${profile.mode}，任务偏好 ${job.preferMode}。`});return flags}
function classify(evaluation,meta,job,profile){if(meta.enabled===false)return{status:'incompatible',reasons:[{code:'V57_FACTORY_DISABLED',severity:'incompatible',detail:'该工厂已从自动路由中停用。'}]};const critical=evaluation.errors.filter(x=>CRITICAL_CODES.has(x.code));if(critical.length)return{status:'incompatible',reasons:critical.map(x=>({code:x.code,severity:'incompatible',detail:x.detail||x.title}))};const conditionalErrors=evaluation.errors.filter(x=>CONDITIONAL_CODES.has(x.code)||!CRITICAL_CODES.has(x.code)),flags=operationalFlags(meta,job,profile),reasons=[...conditionalErrors.map(x=>({code:x.code,severity:'conditional',detail:x.detail||x.title})),...flags];return{status:reasons.length?'conditional':'compatible',reasons}}
function scoreCandidate(evaluation,meta,job,profile,status,cost){let s=evaluation.score;const completeness=planningCompleteness(meta);s+=meta.priority*.12;if(meta.loadPercent!=null)s-=meta.loadPercent*.12;if(meta.leadDays!=null)s-=meta.leadDays*1.5;if(job.preferMode!=='any'&&profile.mode!==job.preferMode)s-=12;if(job.preferredFactoryId&&profile.id===job.preferredFactoryId)s+=8;if(status==='conditional')s-=12;if(status==='incompatible')s-=1000;if(job.maxTotalCost!=null&&cost!=null&&cost>job.maxTotalCost)s-=Math.min(40,((cost-job.maxTotalCost)/Math.max(1,job.maxTotalCost))*40);s+=completeness.ratio*3;return Math.round(s*100)/100}

export function routeFactoryJobV57(state={},graph={},geo={},collisionReport={},factoryDb={},routingDb={},jobInput={}){
  const factories=normalizeFactoryDatabaseV56(factoryDb),routing=normalizeRoutingDatabaseV57(factories,routingDb),job=normalizeRoutingJobV57(jobInput),candidates=[];
  for(const profile of factories.profiles){const meta=routing.factories[profile.id]||normalizeRoutingMetaV57({},profile.id),evaluation=evaluateFactoryCapabilityV56(state,graph,geo,collisionReport,profile),classification=classify(evaluation,meta,job,profile),cost=estimateCost(meta,job),reasons=[...classification.reasons];if(job.maxTotalCost!=null&&cost!=null&&cost>job.maxTotalCost)reasons.push({code:'V57_COST_LIMIT',severity:'conditional',detail:`估算总成本 ${cost} ${job.currency} 超过预算 ${job.maxTotalCost} ${job.currency}。`});let status=classification.status;if(status==='compatible'&&reasons.length)status='conditional';const completeness=planningCompleteness(meta),routeScore=scoreCandidate(evaluation,meta,job,profile,status,cost);candidates.push({factoryId:profile.id,factoryName:profile.name,builtIn:profile.builtIn,mode:profile.mode,status,routeScore,capabilityScore:evaluation.score,evaluation,planning:clone(meta),planningCompleteness:completeness,estimatedCost:cost,currency:meta.currency,reasons:uniq(reasons.map(x=>JSON.stringify(x))).map(x=>JSON.parse(x))})}
  const rank={compatible:2,conditional:1,incompatible:0};candidates.sort((a,b)=>rank[b.status]-rank[a.status]||b.routeScore-a.routeScore||b.capabilityScore-a.capabilityScore||a.factoryName.localeCompare(b.factoryName));
  const eligible=candidates.filter(x=>x.status!=='incompatible'),primary=eligible[0]||null,backup=eligible.find(x=>x.factoryId!==primary?.factoryId&&x.planning.backupAllowed)||null;
  return{schema:V57_ROUTING_SCHEMA,version:1,job,factoryCount:candidates.length,candidates,primary,backup,summary:{compatible:candidates.filter(x=>x.status==='compatible').length,conditional:candidates.filter(x=>x.status==='conditional').length,incompatible:candidates.filter(x=>x.status==='incompatible').length,primaryFactoryId:primary?.factoryId||null,backupFactoryId:backup?.factoryId||null,routeable:Boolean(primary)}};
}

export function routingPreflightChecksV57(result={},blocking=false){const checks=[];if(!result?.primary){checks.push({code:'V57_NO_ROUTE',severity:blocking?'error':'warning',title:'Factory routing',detail:'没有 Compatible/Conditional 工厂可承接当前任务。'});return checks}checks.push({code:'V57_PRIMARY_FACTORY',severity:'pass',title:'Primary factory',detail:`${result.primary.factoryName} · ${result.primary.status} · score ${result.primary.routeScore}`});if(result.primary.status==='conditional')checks.push({code:'V57_PRIMARY_CONDITIONAL',severity:blocking?'error':'warning',title:'Conditional routing',detail:result.primary.reasons.map(x=>x.detail).join(' | ')||'Primary factory requires review.'});if(!result.backup)checks.push({code:'V57_NO_BACKUP',severity:'warning',title:'Backup factory',detail:'没有可用 Backup Factory。'});else checks.push({code:'V57_BACKUP_FACTORY',severity:'pass',title:'Backup factory',detail:result.backup.factoryName});return checks}

export function buildManufacturingJobTicketV57(routeResult={},options={}){
  const primary=options.factoryId?routeResult.candidates?.find(x=>x.factoryId===options.factoryId):routeResult.primary,backup=routeResult.backup,ctx=primary?.evaluation?.context||routeResult.primary?.evaluation?.context||{};
  return{schema:V57_TICKET_SCHEMA,version:1,job:clone(routeResult.job||{}),routing:{status:primary?.status||'unrouted',primaryFactory:primary?{id:primary.factoryId,name:primary.factoryName,mode:primary.mode,routeScore:primary.routeScore,capabilityScore:primary.capabilityScore,estimatedCost:primary.estimatedCost,currency:primary.currency,leadDays:primary.planning.leadDays,loadPercent:primary.planning.loadPercent}:null,backupFactory:backup?{id:backup.factoryId,name:backup.factoryName,status:backup.status,routeScore:backup.routeScore}:null},production:{templateId:ctx.templateId||null,material:ctx.material||null,blank:ctx.blank||null,minPanelMm:ctx.minPanelMm??null,glueMm:ctx.glueMm??null,maxConcurrentFolds:ctx.maxConcurrentFolds??null,creaseMatrix:ctx.matchedCreaseMatrix||null},checks:primary?{errors:primary.evaluation.errors.map(x=>x.code),warnings:primary.evaluation.warnings.map(x=>x.code),routingReasons:primary.reasons}:null,notes:String(options.notes||routeResult.job?.notes||'')};
}
export function exportJobTicketV57(ticket={}){return JSON.stringify(ticket,null,2)}
export function routingAcceptanceV57(result={}){const errors=[];if(result.schema!==V57_ROUTING_SCHEMA)errors.push('schema');if(!Array.isArray(result.candidates)||!result.candidates.length)errors.push('candidates');if(result.primary&&result.primary.status==='incompatible')errors.push('primary-incompatible');if(result.backup&&result.primary&&result.backup.factoryId===result.primary.factoryId)errors.push('backup-same-as-primary');return{ok:errors.length===0,errors,summary:{factories:result.candidates?.length||0,routeable:Boolean(result.primary),compatible:result.summary?.compatible||0,conditional:result.summary?.conditional||0,incompatible:result.summary?.incompatible||0}}}
