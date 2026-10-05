import { STORAGE_KEY, defaultState } from '../src/model.js';
import { openDielineCadV38, getDielineDocumentV38 } from '../src/v38Ui.js';
import { dielineDocumentFromStateV38, setEdgeCurveV38 } from '../src/dielineCadV38.js';
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
  if(!window.BoxStudioV44.nativeArcSplit||!window.BoxStudioV44.nativeCubicSplit||!window.BoxStudioV44.reversibleSplitMerge||!window.BoxStudioV44.legacyNodeControlsUpgraded)throw new Error('V0.44 capabilities missing.');
  openDielineCadV38();let cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'Dieline CAD');
  let doc=getDielineDocumentV38(),cubic=doc.edges.find(e=>e.lineType==='CUT'&&e.curve==='cubic');if(!cubic)throw new Error('Native cubic fixture missing.');
  click(await waitFor(()=>cad.querySelector(`[data-v38-edge="${cubic.id}"]`),'cubic edge'));let tools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-edge-tools'),'V0.44 edge tools');tools.querySelector('[data-v44-split-t]').value='37';click(tools.querySelector('[data-v44-split]'));
  let nodeEl=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-node.selected[data-v38-node]'),'split node selected'),nodeId=nodeEl.dataset.v38Node,nodeTools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-node-tools'),'node tools');let mergeButton=nodeTools.querySelector('[data-v44-merge]');if(!mergeButton||mergeButton.disabled)throw new Error('Fresh cubic split is not losslessly mergeable in UI.');
  const verdict=window.BoxStudioV44.continuityDiagnostics(getDielineDocumentV38(),nodeId);if(!verdict.eligible)throw new Error('Split cubic node is not continuity eligible.');
  click(mergeButton);const selectedMerged=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-edge.selected[data-v38-edge]'),'merged edge selected'),mergedId=selectedMerged.dataset.v38Edge;doc=getDielineDocumentV38();if(doc.edges.find(e=>e.id===mergedId)?.curve!=='cubic')throw new Error('Lossless merge did not restore cubic edge.');
  tools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-edge-tools'),'edge tools after merge');tools.querySelector('[data-v44-split-t]').value='50';click(tools.querySelector('[data-v44-split]'));
  nodeEl=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-node.selected[data-v38-node]'),'second split node');nodeId=nodeEl.dataset.v38Node;nodeTools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v44-node-tools'),'second node tools');const g2=nodeTools.querySelector('[data-v44-continuity="g2"]');if(!g2)throw new Error('G2 control missing.');click(g2);
  await waitFor(()=>{const d=getDielineDocumentV38();return d.nodes.find(n=>n.id===nodeId)?.continuityV44==='g2'},'G2 persistence');doc=getDielineDocumentV38();const diag=window.BoxStudioV44.continuityDiagnostics(doc,nodeId);if(diag.tangentErrorDeg>1e-3||diag.curvatureDelta>1e-4)throw new Error(`G2 continuity failed: tangent=${diag.tangentErrorDeg} curvature=${diag.curvatureDelta}`);

  // Exercise the original left-side CAD buttons through the V0.44 routing layer: Line -> Arc -> Add Node -> Lossless Merge -> Line.
  const line=doc.edges.find(e=>e.lineType==='CUT'&&e.curve==='line');if(!line)throw new Error('CUT line fixture missing for browser arc split.');cad=document.querySelector('#boxstudio-v38-cad');click(await waitFor(()=>cad.querySelector(`[data-v38-edge="${line.id}"]`),'CUT line for Arc conversion'));click(await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v38-curve="arc"]'),'Arc conversion button'));
  await waitFor(()=>getDielineDocumentV38().edges.find(e=>e.id===line.id)?.curve==='arc','Arc conversion persistence');cad=document.querySelector('#boxstudio-v38-cad');const legacyAdd=await waitFor(()=>cad.querySelector('[data-v38-action="insert-node"][data-v44-native-split="true"]'),'upgraded Add Node');click(legacyAdd);
  const arcNodeEl=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-node.selected[data-v38-node]'),'Arc split node selected'),arcNodeId=arcNodeEl.dataset.v38Node;doc=getDielineDocumentV38();const arcChildren=doc.edges.filter(e=>(e.a===arcNodeId||e.b===arcNodeId)&&e.curve==='arc');if(arcChildren.length!==2)throw new Error(`Upgraded Add Node did not create two native arcs: ${arcChildren.length}`);
  const legacyMerge=await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v38-action="delete-node"][data-v44-lossless-merge="true"]'),'upgraded Delete Node lossless merge');click(legacyMerge);
  const arcRestored=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v38-edge.selected[data-v38-edge]'),'restored Arc selected'),arcRestoredId=arcRestored.dataset.v38Edge;doc=getDielineDocumentV38();if(doc.edges.find(e=>e.id===arcRestoredId)?.curve!=='arc')throw new Error('Lossless Merge did not restore Arc through legacy Delete Node.');click(await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v38-curve="line"]'),'Line conversion button'));await waitFor(()=>getDielineDocumentV38().edges.find(e=>e.id===arcRestoredId)?.curve==='line','restore Arc test edge to line');doc=getDielineDocumentV38();

  click(await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v44-preflight]'),'Curve Preflight button'));await waitFor(()=>document.querySelector('#boxstudio-v44-preflight'),'Curve Preflight modal');const report=window.BoxStudioV44.runPreflight(state(),{doc});if(report.errors.some(x=>String(x.code).startsWith('V44_')))throw new Error(`V0.44 preflight errors: ${report.errors.map(x=>x.code).join(',')}`);
  const svg=buildDielineSvgV38(doc),dxf=buildDxfV38(doc),pdf=new TextDecoder().decode(buildDielinePdfV38(doc));if(!/\sC\s/.test(svg)||!dxf.includes('\nSPLINE\n')||!/\sc\s/.test(pdf))throw new Error('Native curve production serializers regressed after V0.44 editing.');
  const topology=buildStructuralTopologyV39(state(),{doc,curveSteps:24,tolerance:.01,minArea:.1});if(!(topology.stats.faces>0))throw new Error('Topology rebuild failed after V0.44 curve editing.');

  // Final Production PDF is verified with a production-safe default document containing a real V0.44 split cubic.
  // This keeps serializer acceptance independent from the known 0427 panel-remap review gate tested above via topology.
  const productionState=structuredClone(defaultState),productionDoc=dielineDocumentFromStateV38(productionState),productionLine=productionDoc.edges.find(e=>e.lineType==='CUT'&&e.curve==='line');if(!productionLine)throw new Error('Production CUT line fixture missing.');
  const productionNodes=new Map(productionDoc.nodes.map(x=>[x.id,x])),pa=productionNodes.get(productionLine.a),pb=productionNodes.get(productionLine.b),pc1={x:pa.x+(pb.x-pa.x)/3,y:pa.y+(pb.y-pa.y)/3},pc2={x:pa.x+2*(pb.x-pa.x)/3,y:pa.y+2*(pb.y-pa.y)/3},productionCurved=setEdgeCurveV38(productionDoc,productionLine.id,'cubic',{c1:pc1,c2:pc2}),productionSplit=window.BoxStudioV44.splitEdge(productionCurved,productionLine.id,.5);
  const finalPdf=buildProductionPdfV43(productionState,{doc:productionSplit.doc}),finalText=new TextDecoder().decode(finalPdf);if(finalPdf.length<1000||!/\sc\s/.test(finalText))throw new Error('Final Production PDF lost V0.44 split cubic structural curves.');
  const text=`PASS cubicSplitMerge=true arcSplitMerge=legacy-ui continuity=G2 tangent=${diag.tangentErrorDeg.toFixed(6)} curvature=${diag.curvatureDelta.toExponential(2)} faces=${topology.stats.faces} productionPdf=${finalPdf.length}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}