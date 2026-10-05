import { runPreflightV38 } from './preflightV38.js';
import { buildStructuralTopologyV39 } from './structuralTopologyV39.js';
import { buildProductionZonesV40, polygonAreaV40 } from './offsetEngineV40.js';

const clone=v=>structuredClone(v);
const issue=(severity,code,title,detail,entityId=null)=>({severity,code,title,detail,entityId});
function panelArea(panel){const pts=Array.isArray(panel?.points)?panel.points:[];return Math.abs(polygonAreaV40(pts))}

export function buildOffsetDocumentV40(state,{doc=null,bleedMm=null,safeMm=null,join='miter',miterLimit=4,roundSegments=8,curveSteps=24,tolerance=.01,minArea=.1}={}){
  const topology=buildStructuralTopologyV39(state,{doc,curveSteps,tolerance,minArea}),bleed=bleedMm??topology.doc?.settings?.bleedMm??state?.structure?.bleed??3,safe=safeMm??topology.doc?.settings?.safeMm??state?.structure?.safe??5,zones=buildProductionZonesV40(topology,{bleedMm:bleed,safeMm:safe,join,miterLimit,roundSegments}),next=clone(topology.doc);
  next.panels=clone(topology.panels||[]);next.settings={...(next.settings||{}),bleedMm:Number(bleed),safeMm:Number(safe),offsetJoin:join};next.zones={bleed:clone(zones.bleed),safe:clone(zones.safe),glue:clone(zones.glue)};next.metadata={...(next.metadata||{}),offsetSchema:zones.schema,offsetSummary:clone(zones.summary)};return{topology,zones,doc:next};
}

export function runPreflightV40(state,options={}){
  const built=buildOffsetDocumentV40(state,options),base=runPreflightV38(state,{doc:built.doc,tolerance:options.tolerance??.01}),checks=base.checks.filter(x=>x.code!=='POLYGON_OFFSET_REVIEW');
  for(const z of built.zones.issues)checks.push(issue(z.severity,z.code,'Production offset',`${z.panelId||'panel'} · ${z.zone||'zone'} · ${z.detail}`,z.panelId||null));
  const bleedMap=new Map(built.zones.bleed.map(z=>[z.panelId,z])),safeMap=new Map(built.zones.safe.map(z=>[z.panelId,z]));for(const panel of built.topology.panels||[]){const pArea=panelArea(panel),bz=bleedMap.get(panel.id),sz=safeMap.get(panel.id);if(!bz)checks.push(issue('error','BLEED_OFFSET_MISSING','Bleed offset',`No production bleed polygon generated for ${panel.id}.`,panel.id));else if(Number(bz.area)<=pArea)checks.push(issue('error','BLEED_OFFSET_DIRECTION','Bleed offset',`Bleed area for ${panel.id} did not expand beyond panel area.`,panel.id));else checks.push(issue('pass','BLEED_OFFSET_READY','Bleed offset',`${panel.id}: ${built.doc.settings.bleedMm} mm ${bz.join} offset generated.`,panel.id));if(!sz)checks.push(issue('error','SAFE_OFFSET_MISSING','Safe offset',`No production safe polygon generated for ${panel.id}.`,panel.id));else if(Number(sz.area)>=pArea)checks.push(issue('error','SAFE_OFFSET_DIRECTION','Safe offset',`Safe area for ${panel.id} did not inset inside panel area.`,panel.id));else checks.push(issue('pass','SAFE_OFFSET_READY','Safe offset',`${panel.id}: ${built.doc.settings.safeMm} mm inset generated.`,panel.id))}
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');return{schema:'boxstudio-preflight-v40',ok:errors.length===0,errors,warnings,passes,checks,topology:built.topology,zones:built.zones,dieline:built.doc,summary:{errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,panels:built.topology.panels?.length||0,bleedZones:built.zones.bleed.length,safeZones:built.zones.safe.length}};
}

export function productionGateV40(state,options={}){const report=runPreflightV40(state,options);return{schema:'boxstudio-production-gate-v40',ok:report.ok,blocked:!report.ok,requiresApproval:false,requiresLogin:false,price:0,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
