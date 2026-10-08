import { runPreflightV46 } from './preflightV46.js';
import { buildLinkedWorkspaceModelV49 } from './linkedWorkspaceV49.js';
import { scanFoldSequenceV51 } from './foldSequenceV51.js';
import { buildManufacturingProfilesV55, manufacturingPreflightChecksV55 } from './manufacturingIntelligenceV55.js';

export function runPreflightV55(state={},options={}){
  const {manufacturingProfile='safe',manufacturingBlocking=false,factoryThicknessMm=null,...baseOptions}=options,base=runPreflightV46(state,baseOptions),linked=buildLinkedWorkspaceModelV49(state),graph=linked.review.graph,geo=linked.review.geo,foldState=linked.state,collisionReport=scanFoldSequenceV51(foldState,graph,geo),overrides=Number.isFinite(Number(factoryThicknessMm))&&Number(factoryThicknessMm)>0?{thicknessMm:Number(factoryThicknessMm)}:{},manufacturing=buildManufacturingProfilesV55(foldState,graph,geo,collisionReport,overrides),manufacturingChecks=manufacturingPreflightChecksV55(manufacturing,manufacturingProfile,{blocking:manufacturingBlocking}),checks=[...base.checks,...manufacturingChecks];
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{...base,schema:'boxstudio-preflight-v55',ok:errors.length===0,checks,errors,warnings,passes,manufacturing:{profile:manufacturingProfile,blocking:manufacturingBlocking,bundle:manufacturing},summary:{...base.summary,errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,v55ManufacturingProfile:manufacturingProfile,v55ManufacturingBlocking:manufacturingBlocking,v55ManufacturingScore:manufacturing.profiles.find(x=>x.profile.id===manufacturingProfile)?.score??null}};
}
export function productionGateV55(state={},options={}){const report=runPreflightV55(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
