import { STORAGE_KEY } from '../src/model.js';
import { openDielineCadV38, getDielineDocumentV38 } from '../src/v38Ui.js';
import { setEdgeCurveV38 } from '../src/dielineCadV38.js';
import { buildDielineSvgV38, buildDxfV38, buildDielinePdfV38 } from '../src/productionExportV38.js';
import { buildStructuralTopologyV39 } from '../src/structuralTopologyEngineV39.js';
import { buildProductionPdfV43 } from '../src/productionPdfV43.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(60)}throw new Error(`Timeout: ${label}`)};
const click=node=>node?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
const signal=async(kind,text)=>{try{await fetch(`/__v44_${kind}__`,{method:'POST',body:text})}catch{}};
const state=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');

try{
  await waitFor(()=>window.BoxStudioV44,'V0.44 API');await waitFor(()=>document.querySelector('.workspace'),'workspace');
  if(!window.BoxStudioV44.nativeArcSplit||!window.BoxStudioV44.nativeCubicSplit||!window.BoxStudioV44.reversibleSplitMerge)throw new Error('V0.44 capabilities missing.');
  openDielineCadV38();let cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'Dieline CAD');
  let doc=getDielineDocumentV38(),cubic=doc.edges.find(e=>e.lineType==='CUT'&&e.curve==='cubic');if(!cubic)throw new Error('Native cubic fixture missing.');
  click(await waitFor(()=>cad.querySelector(`[data-v38-edge="${cubic.id}"]`),'cubic edge'));let tools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-edge-tools'),'V0.44 edge tools');tools.querySelector('[data-v44-split-t]').value='37';click(tools.querySelector('[data-v44-split]'));
  let nodeEl=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-node.selected[data-v38-node]'),'split node selected'),nodeId=nodeEl.dataset.v38Node,nodeTools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-node-tools'),'node tools');let mergeButton=nodeTools.querySelector('[data-v44-merge]');if(!mergeButton||mergeButton.disabled)throw new Error('Fresh cubic split is not losslessly mergeable in UI.');
  const verdict=window.BoxStudioV44.continuityDiagnostics(getDielineDocumentV38(),nodeId);if(!verdict.eligible)throw new Error('Split cubic node is not continuity eligible.');
  click(mergeButton);const selectedMerged=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-edge.selected[data-v38-edge]'),'merged edge selected'),mergedId=selectedMerged.dataset.v38Edge;doc=getDielineDocumentV38();if(doc.edges.find(e=>e.id===mergedId)?.curve!=='cubic')throw new Error('Lossless merge did not restore cubic edge.');
  tools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-edge-tools'),'edge tools after merge');tools.querySelector('[data-v44-split-t]').value='50';click(tools.querySelector('[data-v44-split]'));
  nodeEl=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-node.selected[data-v38-node]'),'second split node');nodeId=nodeEl.dataset.v38Node;nodeTools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-node-tools'),'second node tools');const g2=nodeTools.querySelector('[data-v44-continuity="g2"]');if(!g2)throw new Error('G2 control missing.');click(g2);
  await waitFor(()=>{const d=getDielineDocumentV38();return d.nodes.find(n=>n.id===nodeId)?.continuityV44==='g2'},'G2 persistence');doc=getDielineDocumentV38();const diag=window.BoxStudioV44.continuityDiagnostics(doc,nodeId);if(diag.tangentErrorDeg>1e-3||diag.curvatureDelta>1e-4)throw new Error(`G2 continuity failed: tangent=${diag.tangentErrorDeg} curvature=${diag.curvatureDelta}`);
  const line=doc.edges.find(e=>e.lineType==='CUT'&&e.curve==='line');if(!line)throw new Error('CUT line fixture missing for browser arc split.');const arcDoc=setEdgeCurveV38(doc,line.id,'arc',{rx:20,ry:20,rotation:0,largeArc:false,sweep:true}),arcSplit=window.BoxStudioV44.splitEdge(arcDoc,line.id,.43);if(!arcSplit.doc.edges.filter(e=>arcSplit.edgeIds.includes(e.id)).every(e=>e.curve==='arc'))throw new Error('Browser API arc split did not preserve arc entities.');const arcMerge=window.BoxStudioV44.mergeSplitNode(arcSplit.doc,arcSplit.nodeId);if(arcMerge.doc.edges.find(e=>e.id===arcMerge.edgeId)?.curve!=='arc')throw new Error('Browser API arc merge did not restore arc.');
  click(await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v44-preflight]'),'Curve Preflight button'));await waitFor(()=>document.querySelector('#boxstudio-v44-preflight'),'Curve Preflight modal');const report=window.BoxStudioV44.runPreflight(state(),{doc});if(report.errors.some(x=>String(x.code).startsWith('V44_')))throw new Error(`V0.44 preflight errors: ${report.errors.map(x=>x.code).join(',')}`);
  const svg=buildDielineSvgV38(doc),dxf=buildDxfV38(doc),pdf=new TextDecoder().decode(buildDielinePdfV38(doc));if(!/\sC\s/.test(svg)||!dxf.includes('\nSPLINE\n')||!/\sc\s/.test(pdf))throw new Error('Native curve production serializers regressed after V0.44 editing.');
  const topology=buildStructuralTopologyV39(state(),{doc,curveSteps:24,tolerance:.01,minArea:.1});if(!(topology.stats.faces>0))throw new Error('Topology rebuild failed after V0.44 curve editing.');const finalPdf=buildProductionPdfV43(state(),{doc}),finalText=new TextDecoder().decode(finalPdf);if(finalPdf.length<1000||!/\sc\s/.test(finalText))throw new Error('Final Production PDF lost native structural curves.');
  const text=`PASS cubicSplitMerge=true arcSplitMerge=true continuity=G2 tangent=${diag.tangentErrorDeg.toFixed(6)} curvature=${diag.curvatureDelta.toExponential(2)} faces=${topology.stats.faces} productionPdf=${finalPdf.length}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
