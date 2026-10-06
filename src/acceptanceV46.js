import { buildProductionContextV39 } from './productionPdfV39.js';
import { buildFoldGraph, graphStats } from './foldgraph.js';
import { validateV46ConstraintState } from './curveConstraintsV46.js';

const clone=v=>structuredClone(v);
const issue=(severity,code,detail,extra={})=>({severity,code,detail,...extra});

export function runCadTopology3dAcceptanceV46(state,{doc=null,curveSteps=24,tolerance=.01,minArea=.1,allowWarnings=true,tangentToleranceDeg=.05,equalRadiusTolerance=.001}={}){
  const checks=[],constraints=validateV46ConstraintState(doc,{tangentToleranceDeg,equalRadiusTolerance});
  for(const x of constraints.issues)checks.push(issue(x.severity,x.code,x.detail,{entityId:x.entityId||null,stage:'2d-constraints'}));
  const context=buildProductionContextV39(state,{doc,curveSteps,tolerance,minArea,allowWarnings});
  for(const x of context.errors||[])checks.push(issue('error',`V46_TOPOLOGY_${x.code}`,x.detail||x.code,{entityId:x.entityId||null,stage:'topology'}));
  for(const x of context.warnings||[])checks.push(issue('warning',`V46_TOPOLOGY_${x.code}`,x.detail||x.code,{entityId:x.entityId||null,stage:'topology'}));
  let foldGraph=null,stats=null;
  if(context.topology?.graph&&context.productionState?.structure){
    try{
      foldGraph=buildFoldGraph(context.productionState.structure);stats=graphStats(foldGraph);
      const topologyNodes=context.topology.graph.nodes?.length||0,topologyEdges=context.topology.graph.edges?.length||0;
      if(stats.panels!==topologyNodes)checks.push(issue('error','V46_3D_PANEL_COUNT_DRIFT',`Topology has ${topologyNodes} panels but the 3D fold graph has ${stats.panels}.`,{stage:'3d'}));
      if(stats.hinges!==topologyEdges)checks.push(issue('error','V46_3D_HINGE_COUNT_DRIFT',`Topology has ${topologyEdges} fold-tree hinges but the 3D fold graph has ${stats.hinges}.`,{stage:'3d'}));
      if(String(stats.root||'')!==String(context.topology.graph.root||''))checks.push(issue('error','V46_3D_ROOT_DRIFT',`Topology root ${context.topology.graph.root||'none'} differs from 3D root ${stats.root||'none'}.`,{stage:'3d'}));
      const topologyIds=new Set((context.topology.graph.nodes||[]).map(n=>n.id)),graphIds=new Set((foldGraph.nodes||[]).map(n=>n.id)),missing=[...topologyIds].filter(id=>!graphIds.has(id)),extra=[...graphIds].filter(id=>!topologyIds.has(id));
      if(missing.length||extra.length)checks.push(issue('error','V46_3D_PANEL_ID_DRIFT',`3D panel identity drift. Missing: ${missing.join(', ')||'none'}; extra: ${extra.join(', ')||'none'}.`,{stage:'3d',missing,extra}));
      if(!checks.some(x=>x.severity==='error'&&x.stage==='3d'))checks.push(issue('pass','V46_3D_FOLDGRAPH_CONSISTENT',`${stats.panels} panels / ${stats.hinges} hinges / root ${stats.root||'none'} match rebuilt topology.`,{stage:'3d'}));
    }catch(error){checks.push(issue('error','V46_3D_FOLDGRAPH_BUILD_FAILED',error?.message||String(error),{stage:'3d'}))}
  }else checks.push(issue('error','V46_3D_SOURCE_UNAVAILABLE','Topology did not produce a production structure for 3D fold-graph validation.',{stage:'3d'}));
  if(context.ok)checks.push(issue('pass','V46_2D_TO_TOPOLOGY_CONSISTENT',`${context.summary.panels} panels and ${context.summary.folds} folds rebuilt from the current 2D CAD document.`,{stage:'topology'}));
  if(constraints.ok)checks.push(issue('pass','V46_ADVANCED_CONSTRAINTS_VALID','All stored V0.45/V0.46 curve and corner constraints are within tolerance.',{stage:'2d-constraints'}));
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{schema:'boxstudio-acceptance-v46',version:1,ok:errors.length===0&&(allowWarnings||warnings.length===0),checks,errors,warnings,passes,constraints,context,foldGraph:foldGraph?clone(foldGraph):null,stats:stats?clone(stats):null,summary:{errors:errors.length,warnings:warnings.length,passes:passes.length,panels:context.summary?.panels||0,folds:context.summary?.folds||0,threePanels:stats?.panels||0,threeHinges:stats?.hinges||0}};
}
