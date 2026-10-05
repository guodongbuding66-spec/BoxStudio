import { STORAGE_KEY, defaultState } from './model.js';
import { closeCad, openDielineCadV38, getDielineDocumentV38 } from './v38Ui.js';
import { splitEdgeV44, mergeSplitNodeV44, canMergeSplitNodeV44, setNodeContinuityV44, continuityDiagnosticsV44, curveLengthV44 } from './curveEditingV44.js';
import { runPreflightV44 } from './preflightV44.js';

const VERSION='V0.44',clone=v=>structuredClone(v),esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let observer=null,queued=false;
function readState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,structure:{...defaultState.structure,...(p.structure||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function writeDoc(doc){const state=readState();state.dielineV38=doc;state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function clickNode(el){el?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}
function restoreSelection({nodeId=null,edgeId=null}={}){const cad=document.querySelector('#boxstudio-v38-cad');if(!cad)return false;const id=nodeId||edgeId;if(!id)return true;const attr=nodeId?'data-v38-node':'data-v38-edge',target=cad.querySelector(`[${attr}="${CSS.escape(id)}"]`);if(!target)return false;clickNode(target);return true}
function reopen(doc,selection={}){closeCad();writeDoc(doc);openDielineCadV38();if(!restoreSelection(selection))queueMicrotask(()=>restoreSelection(selection))}
function selectedEdgeId(){return document.querySelector('#boxstudio-v38-cad .v38-edge.selected[data-v38-edge]')?.dataset.v38Edge||null}
function selectedNodeId(){return document.querySelector('#boxstudio-v38-cad .v38-node.selected[data-v38-node]')?.dataset.v38Node||null}
function findInspector(title){return[...document.querySelectorAll('#boxstudio-v38-cad .v38-right section')].find(s=>s.querySelector('.v38-section-head h3')?.textContent===title)||null}

function showPreflight(){
  document.querySelector('#boxstudio-v44-preflight')?.remove();const state=readState(),doc=getDielineDocumentV38(),report=runPreflightV44(state,{doc}),host=document.createElement('div');host.id='boxstudio-v44-preflight';host.innerHTML=`<div class="v44-modal"><header><div><b>V0.44 Curve Topology Preflight</b><span>${report.ok?'PASS':'BLOCKED'} · ${report.summary.errors} errors · ${report.summary.warnings} warnings</span></div><button data-v44-close>×</button></header><div class="v44-preflight-list">${report.checks.filter(x=>x.severity!=='pass').slice(0,40).map(x=>`<div class="${x.severity}"><b>${esc(x.code)}</b><span>${esc(x.detail||x.title)}</span></div>`).join('')||'<div class="pass"><b>PASS</b><span>No V0.44 curve-topology blockers.</span></div>'}</div><footer>Split nodes: ${report.summary.splitNodes||0} · lossless mergeable: ${report.summary.mergeableSplitNodes||0} · continuity nodes: ${report.summary.continuityNodes||0}</footer></div>`;document.body.appendChild(host);host.querySelector('[data-v44-close]').onclick=()=>host.remove();
}

function decorateTop(cad){
  const brand=cad.querySelector('.v38-brand span');if(brand&&!brand.dataset.v44){brand.dataset.v44='true';brand.textContent='Professional Dieline CAD · V0.44 Curve Topology'}
  const top=cad.querySelector('.v38-top');if(top&&!top.querySelector('[data-v44-preflight]')){const button=document.createElement('button');button.dataset.v44Preflight='';button.textContent='Curve Preflight';button.onclick=showPreflight;const close=top.querySelector('[data-v38-action="close"]');top.insertBefore(button,close)}
}

function decorateEdge(cad){
  const id=selectedEdgeId(),section=findInspector('Edge');if(!id||!section||section.querySelector('.v44-edge-tools'))return;const doc=getDielineDocumentV38();let length=0;try{length=curveLengthV44(doc,id)}catch{}
  const box=document.createElement('div');box.className='v44-edge-tools';box.innerHTML=`<div class="v44-head"><b>Professional Curve</b><span>${length.toFixed(3)} mm path length</span></div><div class="v44-split-row"><label>Split position <input data-v44-split-t type="number" min="1" max="99" step="1" value="50"> %</label><button data-v44-split>Split Native</button></div><small>Line, Cubic and Arc stay native. The new node carries reversible provenance for lossless merge.</small>`;section.appendChild(box);box.querySelector('[data-v44-split]').onclick=()=>{const t=Math.min(.99,Math.max(.01,Number(box.querySelector('[data-v44-split-t]').value||50)/100));try{const result=splitEdgeV44(getDielineDocumentV38(),id,t);reopen(result.doc,{nodeId:result.nodeId})}catch(error){alert(error.message)}};
}

function decorateNode(cad){
  const id=selectedNodeId(),section=findInspector('Node');if(!id||!section||section.querySelector('.v44-node-tools'))return;const doc=getDielineDocumentV38(),diag=continuityDiagnosticsV44(doc,id),merge=canMergeSplitNodeV44(doc,id),box=document.createElement('div');box.className='v44-node-tools';
  const continuity=diag.eligible?`<div class="v44-head"><b>Continuity</b><span>tangent ${diag.tangentErrorDeg.toFixed(4)}° · curvature Δ ${diag.curvatureDelta.toExponential(2)}</span></div><label>Driver edge <select data-v44-driver>${diag.edgeIds.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><div class="v44-continuity-buttons">${['corner','g1','c1','g2'].map(mode=>`<button data-v44-continuity="${mode}" class="${diag.mode===mode?'active':''}">${mode.toUpperCase()}</button>`).join('')}</div><small>G1 aligns tangents. C1 also equalizes first-derivative magnitude. G2 additionally matches signed curvature.</small>`:`<div class="v44-head"><b>Continuity</b><span>Requires a degree-2 Cubic ↔ Cubic junction</span></div>`;
  box.innerHTML=`${continuity}<div class="v44-merge"><button data-v44-merge ${merge.ok?'':'disabled'}>Lossless Merge Split</button><span>${merge.ok?'Reversible provenance verified.':esc(merge.detail||'Not a reversible split node.')}</span></div>`;section.appendChild(box);
  box.querySelectorAll('[data-v44-continuity]').forEach(button=>button.onclick=()=>{try{const driver=box.querySelector('[data-v44-driver]')?.value||null,next=setNodeContinuityV44(getDielineDocumentV38(),id,button.dataset.v44Continuity,{driverEdgeId:driver});reopen(next,{nodeId:id})}catch(error){alert(error.message)}});
  const mergeButton=box.querySelector('[data-v44-merge]');if(mergeButton&&!mergeButton.disabled)mergeButton.onclick=()=>{try{const result=mergeSplitNodeV44(getDielineDocumentV38(),id);reopen(result.doc,{edgeId:result.edgeId})}catch(error){alert(error.message)}};
}

function decorate(){document.title='BoxStudio V0.44';document.body.dataset.v44CurveTopology='true';const cad=document.querySelector('#boxstudio-v38-cad');if(!cad)return;decorateTop(cad);decorateEdge(cad);decorateNode(cad)}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});decorate();

window.BoxStudioV44={version:VERSION,nativeArcSplit:true,nativeCubicSplit:true,reversibleSplitMerge:true,continuityModes:['corner','g1','c1','g2'],splitEdge:splitEdgeV44,mergeSplitNode:mergeSplitNodeV44,setNodeContinuity:setNodeContinuityV44,continuityDiagnostics:continuityDiagnosticsV44,runPreflight:runPreflightV44};