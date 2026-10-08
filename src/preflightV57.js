import { runPreflightV56 } from './preflightV56.js';
import { buildLinkedWorkspaceModelV49 } from './linkedWorkspaceV49.js';
import { scanFoldSequenceV51 } from './foldSequenceV51.js';
import { createFactoryDatabaseV56, normalizeFactoryDatabaseV56 } from './factoryProfilesV56.js';
import { createRoutingDatabaseV57, normalizeRoutingDatabaseV57, routeFactoryJobV57, routingPreflightChecksV57 } from './factoryRoutingV57.js';

export function runPreflightV57(state={},options={}){
  const {factoryDatabase=null,routingDatabase=null,routingJob=null,routingBlocking=false,...rest}=options;
  const factories=normalizeFactoryDatabaseV56(factoryDatabase||createFactoryDatabaseV56()),routing=normalizeRoutingDatabaseV57(factories,routingDatabase||createRoutingDatabaseV57(factories));
  const linked=buildLinkedWorkspaceModelV49(state),graph=linked.review.graph,geo=linked.review.geo,foldState=linked.state,collisionReport=scanFoldSequenceV51(foldState,graph,geo),route=routeFactoryJobV57(foldState,graph,geo,collisionReport,factories,routing,routingJob||{}),baseProfile=route.primary?factories.profiles.find(x=>x.id===route.primary.factoryId):factories.profiles[0];
  const base=runPreflightV56(state,{...rest,factoryDatabase:factories,factoryProfile:baseProfile,factoryBlocking:false}),routingChecks=routingPreflightChecksV57(route,Boolean(routingBlocking)),checks=[...base.checks,...routingChecks],errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{...base,schema:'boxstudio-preflight-v57',ok:errors.length===0,checks,errors,warnings,passes,routing:{blocking:Boolean(routingBlocking),result:route},summary:{...base.summary,errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,v57Routeable:Boolean(route.primary),v57PrimaryFactory:route.primary?.factoryId||null,v57BackupFactory:route.backup?.factoryId||null,v57RoutingBlocking:Boolean(routingBlocking)}};
}
export function productionGateV57(state={},options={}){const report=runPreflightV57(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
