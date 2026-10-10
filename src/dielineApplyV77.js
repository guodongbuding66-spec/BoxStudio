import {buildStructuralTopologyV39,topologyProductionGateV39} from './structuralTopologyV39.js';
import {productionStateFromTopologyV39} from './productionPdfV39.js';
export function applyDielineV77(state,doc){
 const topology=buildStructuralTopologyV39(state,{doc}),gate=topologyProductionGateV39(state,topology);
 if(!topology.ok||!gate.ok)throw new Error('请先检查刀版：'+[...topology.errors,...gate.errors].map(e=>e.detail||e.code).slice(0,3).join('；'));
 const result=productionStateFromTopologyV39(state,topology);
 if(result.reconciled.orphaned.length)throw new Error('修改后有图文失去所属面，请先在刀版面板映射中确认。');
 const next=result.state;next.dielineV38=structuredClone(topology.doc);next.page='editor';next.editorTab='Structure';next.foldProgress=100;next.topologyV39.graph=structuredClone(topology.graph);return next;
}
