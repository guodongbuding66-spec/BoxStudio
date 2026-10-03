import { STORAGE_KEY, defaultState } from './model.js';
import { generateGeometry } from './geometry.js';
import { buildFoldGraph } from './foldgraph.js';
import { buildTextureProofModel, mountArtworkProof } from './threeArtworkProof.js';

const BLOCK_ID='boxstudio-v17-tools';
let controller=null;
function clone(v){return structuredClone(v)}
function esc(v=''){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function readState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,batch:{...defaultState.batch,...(p.batch||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function hideSuperseded(){document.getElementById('v16Atlas')?.closest('section')?.setAttribute('hidden','')}
function uvText(edge=[]){return edge.map(([u,v])=>`${u.toFixed(3)},${v.toFixed(3)}`).join(' → ')}

function renderProof(block){
  const host=block.querySelector('#v17Proof');if(!host)return;controller?.dispose?.();controller=null;
  try{
    const state=readState(),geo=generateGeometry(state.structure),graph=buildFoldGraph(geo),model=buildTextureProofModel(state,geo,graph),s=model.stats,seams=model.seams;
    host.innerHTML=`<div class="v17-stats"><span>${s.panels} folded panels</span><span>${s.texturedPanels} artwork panels</span><span>${s.triangles} UV triangles</span><span>${s.artworkCommands} artwork commands</span><span class="${s.seamWarnings?'warn':'ok'}">${s.seamWarnings} seam warning(s)</span></div>
      <div class="v17-controls"><label>Fold <input id="v17Fold" type="range" min="0" max="100" value="${Number(state.foldProgress||100)}"> <b id="v17FoldLabel">${Number(state.foldProgress||100)}%</b></label><button id="v17Refresh">Rebuild Artwork Textures</button><button id="v17ResetView">Reset View</button></div>
      <div id="v17ProofCanvas" class="v17-proof-canvas"></div>
      <div class="v17-footnote">Software 3D texture proof：Panel Artwork Texture Atlas 已真实投影到折叠面，包含文字、运输标志、Barcode/QR、线框与导入 SVG。该预览用于结构/位置核对，不等同于印厂 RIP 色彩软打样。</div>
      <details class="v17-seams" ${seams.warnings?'open':''}><summary>UV / Fold Seam Diagnostics · ${seams.mapped}/${seams.total} mapped</summary>${seams.seams.map(x=>`<div class="v17-seam ${x.status}"><span><b>${esc(x.from)} → ${esc(x.to)}</b><small>${esc(x.label||'fold')} · ${x.length?.toFixed?.(1)||0} mm${x.fallback?' · fallback hinge':''}</small></span><span><small>from ${esc(x.fromUv?uvText(x.fromUv):'—')}</small><small>to ${esc(x.toUv?uvText(x.toUv):'—')}</small></span><em>${esc(x.status)}</em></div>`).join('')||'<div class="profile-empty">No fold seams.</div>'}</details>
      ${s.fallbackTriangulations?`<div class="v17-warning">${s.fallbackTriangulations} polygon panel(s) used fan-triangulation fallback. Review concave imported panels before production sign-off.</div>`:''}${s.uvOutside?`<div class="v17-warning">${s.uvOutside} polygon vertex/vertices fall outside the panel UV bounding domain.</div>`:''}`;
    const canvasHost=host.querySelector('#v17ProofCanvas');controller=mountArtworkProof(canvasHost,state,geo,graph,{maxTexturePixels:760});
    const range=host.querySelector('#v17Fold'),label=host.querySelector('#v17FoldLabel');range.oninput=()=>{label.textContent=`${range.value}%`;controller?.setProgress(Number(range.value))};
    host.querySelector('#v17Refresh').onclick=()=>renderProof(block);host.querySelector('#v17ResetView').onclick=()=>controller?.setView({yaw:.55,pitch:-.34,zoom:1});
  }catch(error){host.innerHTML=`<div class="v17-warning">${esc(error?.message||error)}</div>`}
}

function install(){hideSuperseded();const scroll=document.querySelector('#boxstudio-profile-manager .profile-manager-scroll');if(!scroll||document.getElementById(BLOCK_ID))return;const block=document.createElement('div');block.id=BLOCK_ID;block.className='profile-section v17-tools';block.innerHTML=`<div class="v17-title"><div><h3>V0.17 Folded Artwork Proof</h3><p>Panel texture projection · polygon UV triangulation · fold seam diagnostics.</p></div><span>V0.17</span></div><section><h4>Folded 3D Artwork Texture Proof</h4><div id="v17Proof"></div></section>`;scroll.appendChild(block);renderProof(block)}
function updateVersion(){const v=document.querySelector('.brand small');if(v)v.textContent='V0.17';document.title='BoxStudio V0.17'}
const observer=new MutationObserver(()=>{updateVersion();hideSuperseded();install()});observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('beforeunload',()=>controller?.dispose?.());updateVersion();install();
