import { buildProductionContextV39, buildProductionPdfV39, productionPdfV39Diagnostics } from './productionPdfV39.js';
import { runPreflightV40 } from './preflightV40.js';
import { accessPolicyV40 } from './freeAccessV40.js';
import { downloadBytes } from './export.js';

export const V40_PRODUCTION_SCHEMA='boxstudio-production-v40';

export function buildProductionContextV40(state,options={}){
  const preflight=runPreflightV40(state,options),base=buildProductionContextV39(state,{...options,doc:preflight.dieline}),errors=[...preflight.errors,...base.errors],warnings=[...preflight.warnings,...base.warnings],uniq=a=>[...new Map(a.map(x=>[`${x.code}|${x.entityId||x.elementId||''}|${x.detail}`,x])).values()],uniqueErrors=uniq(errors),uniqueWarnings=uniq(warnings),ok=uniqueErrors.length===0&&(options.allowWarnings!==false||uniqueWarnings.length===0);
  return{schema:V40_PRODUCTION_SCHEMA,version:1,ok,access:accessPolicyV40(),preflight,offsetZones:preflight.zones,topology:preflight.topology,base,productionState:base.productionState,errors:uniqueErrors,warnings:uniqueWarnings,summary:{errors:uniqueErrors.length,warnings:uniqueWarnings.length,panels:preflight.summary.panels,bleedZones:preflight.summary.bleedZones,safeZones:preflight.summary.safeZones,requiresApproval:false,price:0}};
}

export function buildProductionPdfV40(state,options={}){
  const context=buildProductionContextV40(state,options);if(!context.ok){const codes=[...new Set(context.errors.map(x=>x.code))];throw Object.assign(new Error(`V0.40 Production PDF blocked: ${codes.join(', ')||'preflight failed'}`),{code:'V40_PRODUCTION_BLOCKED',context});}
  return buildProductionPdfV39(state,{...options,doc:context.preflight.dieline});
}

export function productionPdfV40Diagnostics(state,options={}){const context=buildProductionContextV40(state,options),base=context.ok?productionPdfV39Diagnostics(state,{...options,doc:context.preflight.dieline}):null;return{schema:V40_PRODUCTION_SCHEMA,ok:context.ok,access:context.access,summary:context.summary,offsetSchema:context.offsetZones.schema,blockingCodes:[...new Set(context.errors.map(x=>x.code))],warningCodes:[...new Set(context.warnings.map(x=>x.code))],base}}
export function exportProductionPdfV40(state,options={}){const bytes=buildProductionPdfV40(state,options);downloadBytes('boxstudio-v0.40-production.pdf',bytes,'application/pdf');return bytes}
