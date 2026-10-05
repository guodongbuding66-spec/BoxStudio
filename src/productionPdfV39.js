import { buildProductionPdfV27, productionPdfV27Diagnostics } from './productionPdfV27.js';
import { runPreflightV38 } from './preflightV38.js';
import { buildStructuralTopologyV39, reconcileArtworkToTopologyV39, topologyProductionGateV39 } from './structuralTopologyV39.js';
import { downloadBytes } from './export.js';

const clone=v=>structuredClone(v);
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

export const V39_PRODUCTION_SCHEMA='boxstudio-production-v39';

export function importedGeometryFromTopologyV39(topology){
  const geo=clone(topology.geometry),foldCandidates=(topology.graph?.edges||[]).map((edge,index)=>({
    id:`v39-fold-${index+1}`,a:edge.from,b:edge.to,confirmed:true,angle:num(edge.angle,90),hinge:clone(edge.hinge||null),sourceEdgeIds:clone(edge.sourceEdgeIds||[]),angleSource:edge.angleSource||'review-default',
  }));
  return{
    width:geo.width,height:geo.height,panels:clone(geo.panels||[]),
    cutLines:clone(geo.cutLines||[]),creaseLines:clone(geo.creaseLines||[]),perfLines:clone(geo.perfLines||[]),glueLines:clone(geo.glueLines||[]),
    cutCurves:clone(geo.cutCurves||[]),creaseCurves:clone(geo.creaseCurves||[]),perfCurves:clone(geo.perfCurves||[]),glueCurves:clone(geo.glueCurves||[]),
    foldCandidates,foldRoot:topology.graph?.root||geo.panels?.[0]?.id||null,source:'BoxStudio V0.39 rebuilt semantic topology',warnings:(topology.warnings||[]).map(x=>`${x.code}: ${x.detail}`),
  };
}

export function productionStateFromTopologyV39(state,topology){
  const reconciled=reconcileArtworkToTopologyV39(state,topology),importedGeometry=importedGeometryFromTopologyV39(topology),prior=clone(reconciled.state.structure||{}),next=clone(reconciled.state);
  next.structure={...prior,template:'imported',sizeType:'artboard',length:Math.max(80,num(topology.doc?.width,300)),width:Math.max(60,num(topology.doc?.height,200)),importedGeometry,bleed:num(topology.doc?.settings?.bleedMm,prior.bleed??3),safe:num(topology.doc?.settings?.safeMm,prior.safe??5),compensation:false};
  next.topologyV39={...(next.topologyV39||{}),productionProxy:true,sourceTemplate:state?.structure?.template||topology.doc?.template||'unknown',foldRoot:topology.graph?.root||null};
  return{state:next,reconciled,importedGeometry};
}

export function buildProductionContextV39(state,{doc=null,curveSteps=18,tolerance=.01,minArea=.1,allowWarnings=true}={}){
  const topology=buildStructuralTopologyV39(state,{doc,curveSteps,tolerance,minArea}),topologyGate=topologyProductionGateV39(state,topology),proxy=productionStateFromTopologyV39(state,topology),preflight=runPreflightV38(proxy.state,{doc:topology.doc,tolerance}),errors=[...topologyGate.errors,...preflight.errors],warnings=[...topologyGate.warnings,...preflight.warnings];
  const uniqueErrors=[...new Map(errors.map(x=>[`${x.code}|${x.entityId||x.elementId||''}|${x.detail}`,x])).values()],uniqueWarnings=[...new Map(warnings.map(x=>[`${x.code}|${x.entityId||x.elementId||''}|${x.detail}`,x])).values()],ok=uniqueErrors.length===0&&(allowWarnings||uniqueWarnings.length===0);
  return{schema:V39_PRODUCTION_SCHEMA,version:1,ok,topology,topologyGate,preflight,productionState:proxy.state,reconciled:proxy.reconciled,importedGeometry:proxy.importedGeometry,errors:uniqueErrors,warnings:uniqueWarnings,summary:{errors:uniqueErrors.length,warnings:uniqueWarnings.length,panels:topology.stats.faces,folds:topology.stats.foldTreeEdges,remappedArtwork:proxy.reconciled.remapped.length,orphanedArtwork:proxy.reconciled.orphaned.length}};
}

export function buildProductionPdfV39(state,options={}){
  const context=buildProductionContextV39(state,options);if(!context.ok){const codes=[...new Set(context.errors.map(x=>x.code))];throw Object.assign(new Error(`V0.39 Production PDF blocked: ${codes.join(', ')||'preflight failed'}`),{code:'V39_PRODUCTION_BLOCKED',context});}
  return buildProductionPdfV27(context.productionState);
}

export function productionPdfV39Diagnostics(state,options={}){
  const context=buildProductionContextV39(state,options),pdf=context.ok?productionPdfV27Diagnostics(context.productionState):null;return{schema:V39_PRODUCTION_SCHEMA,ok:context.ok,summary:context.summary,topology:context.topology.stats,foldRoot:context.topology.graph?.root||null,blockingCodes:[...new Set(context.errors.map(x=>x.code))],warningCodes:[...new Set(context.warnings.map(x=>x.code))],serializer:pdf?.serializer||'v0.27-native-cubic-production',baseDiagnostics:pdf};
}

export function exportProductionPdfV39(state,options={}){const bytes=buildProductionPdfV39(state,options);downloadBytes('boxstudio-v0.39-unified-production.pdf',bytes,'application/pdf');return bytes;}
