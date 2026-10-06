import { runPreflightV55 } from './preflightV55.js';
import { buildLinkedWorkspaceModelV49 } from './linkedWorkspaceV49.js';
import { scanFoldSequenceV51 } from './foldSequenceV51.js';
import { createFactoryDatabaseV56, normalizeFactoryDatabaseV56, normalizeFactoryProfileV56, evaluateFactoryCapabilityV56, factoryPreflightChecksV56 } from './factoryProfilesV56.js';

export function runPreflightV56(state={},options={}){
  const {factoryDatabase=null,factoryProfileId=null,factoryProfile=null,factoryBlocking=null,...rest}=options;
  const database=normalizeFactoryDatabaseV56(factoryDatabase||createFactoryDatabaseV56()),selected=factoryProfile?normalizeFactoryProfileV56(factoryProfile):database.profiles.find(x=>x.id===(factoryProfileId||database.selectedId))||database.profiles[0],manufacturingProfile=rest.manufacturingProfile||selected.productionGate.manufacturingProfile||'machine';
  const base=runPreflightV55(state,{...rest,manufacturingProfile}),linked=buildLinkedWorkspaceModelV49(state),graph=linked.review.graph,geo=linked.review.geo,foldState=linked.state,collisionReport=scanFoldSequenceV51(foldState,graph,geo),evaluation=evaluateFactoryCapabilityV56(foldState,graph,geo,collisionReport,selected),blocking=factoryBlocking===null?Boolean(selected.productionGate.enabled):Boolean(factoryBlocking),factoryChecks=factoryPreflightChecksV56(evaluation,blocking),checks=[...base.checks,...factoryChecks],errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{...base,schema:'boxstudio-preflight-v56',ok:errors.length===0,checks,errors,warnings,passes,factory:{profileId:selected.id,profileName:selected.name,blocking,evaluation,databaseSummary:{profiles:database.profiles.length,selectedId:database.selectedId}},summary:{...base.summary,errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,v56FactoryProfile:selected.id,v56FactoryBlocking:blocking,v56FactoryScore:evaluation.score,v56FactoryStatus:evaluation.status}};
}
export function productionGateV56(state={},options={}){const report=runPreflightV56(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
