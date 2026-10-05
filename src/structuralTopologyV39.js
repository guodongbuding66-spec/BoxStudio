import {
  V39_TOPOLOGY_SCHEMA,
  buildStructuralTopologyV39 as buildEngineTopologyV39,
  reconcileArtworkToTopologyV39 as reconcileEngineArtworkV39,
  topologyProductionGateV39 as engineProductionGateV39,
} from './structuralTopologyEngineV39.js';

export { V39_TOPOLOGY_SCHEMA };

function safeTopology(topology){
  const unresolved=new Set();
  const issues=(topology?.issues||[]).map(item=>{
    if(item.code!=='PANEL_REMAP_REVIEW')return item;
    for(const id of item.panels||[])unresolved.add(id);
    return{...item,severity:'error',code:'PANEL_REMAP_REQUIRED',detail:`Explicit panel identity review is required before production. ${item.detail}`};
  });
  const panelIdMap={...(topology?.panelIdMap||{})};
  for(const id of unresolved)delete panelIdMap[id];
  const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');
  return{...topology,panelIdMap,issues,errors,warnings,ok:errors.length===0,stats:{...(topology?.stats||{}),errors:errors.length,warnings:warnings.length,unresolvedPanels:unresolved.size}};
}

export function buildStructuralTopologyV39(state,options={}){
  return safeTopology(buildEngineTopologyV39(state,options));
}

export function reconcileArtworkToTopologyV39(state,topology){
  return reconcileEngineArtworkV39(state,safeTopology(topology));
}

export function topologyProductionGateV39(state,topology){
  return engineProductionGateV39(state,safeTopology(topology));
}
