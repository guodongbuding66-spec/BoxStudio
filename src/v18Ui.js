import { STORAGE_KEY, defaultState } from './model.js';
import { generateGeometry } from './geometry.js';
import { buildFoldGraph } from './foldgraph.js';
import { buildTextureProofModel, mountArtworkProof } from './threeArtworkProof.js';
import { appearanceStats } from './svgAppearance.js';
import { buildBleedContinuityReport } from './bleedContinuity.js';
import { outputIccInfo } from './iccRegistry.js';

const BLOCK_ID='boxstudio-v18-tools';
let controller=null;
function clone(v){return structuredClone(v)}
function esc(v=''){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function readState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,batch:{...defaultState.batch,...(p.batch||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function hideSuperseded(){document.getElementById('boxstudio-v17-tools')?.setAttribute('hidden','');document.getElementById('v16Atlas')?.closest('section')?.setAttribute('hidden','')}
function collectAppearance(state){const marks=(state.elements||[]).filter(e=>e.type==='svg-symbol'&&e.svgMark?.appearance),items=marks.map(e=>({id:e.id,label:e.label||e.id,...appearanceStats(e.svgMark.appearance),warnings:e.svgMark.appearance.warnings||[]}));return{items,marks:items.length,primitives:items.reduce((n,x)=>n+x.primitives,0),gradients:items.reduce((n,x)=>n+x.gradients,0),clips:items.reduce((n,x)=>n+x.clips,0),masks:items.reduce((n,x)=>n+x.masks,0),warnings:items.reduce((n,x)=>n+x.warnings,0)}}
function statusLabel(status){return status==='two-sided'?'two-sided artwork':status==='one-sided'?'one-sided warning':status==='empty'?'no seam artwork':'missing geometry'}

function renderWorkspace(block){
  const host=block.querySelector('#v18Workspace');if(!host)return;controller?.dispose?.();controller=null;
  try{
    const state=readState(),geo=generateGeometry(state.structure),graph=buildFoldGraph(geo),proof=buildTextureProofModel(state,geo,graph),appearance=collectAppearance(state),bleed=buildBleedContinuityReport(state,geo,graph),icc=outputIccInfo();
    host.innerHTML=`<div class="v18-stats"><span>${proof.stats.panels} folded panels</span><span>${proof.stats.texturedPanels} artwork panels</span><span>${appearance.primitives} SVG fill primitive(s)</span><span>${appearance.gradients} gradient(s)</span><span>${appearance.clips} clip(s)</span><span>${appearance.masks} binary mask(s)</span><span class="${bleed.warnings?'warn':'ok'}">${bleed.warnings} bleed seam warning(s)</span></div>
      <div class="v18-controls"><label>Fold <input id="v18Fold" type="range" min="0" max="100" value="${Number(state.foldProgress||100)}"> <b id="v18FoldLabel">${Number(state.foldProgress||100)}%</b></label><button id="v18Refresh">Rebuild Proof</button><button id="v18Reset">Reset View</button></div>
      <div id="v18ProofCanvas" class="v18-proof-canvas"></div>
      <div class="v18-note"><b>V0.18 appearance path:</b> imported SVG explicit solid fills, linear/radial gradients, basic clipPath and binary geometric masks now flow into the Panel Artwork Atlas and folded proof. Production SVG/PDF materialization remains outline-safe; this preview does not claim full Illustrator Appearance fidelity.</div>
      <div class="v18-grid"><section><h4>Fold Bleed Continuity</h4><p>Examines a ${bleed.bandMm.toFixed(1)} mm band on both sides of every fold. One-sided artwork is surfaced for manual review instead of being treated as automatic continuation.</p><div class="v18-list">${bleed.seams.map(s=>`<div class="v18-row ${esc(s.status)}"><span><b>${esc(s.from)} → ${esc(s.to)}</b><small>${esc(s.label||'fold')}</small></span><span><small>${s.a?`${esc(s.a.panelId)} · ${esc(s.a.side)} · ${s.a.count} command(s)`:'—'}</small><small>${s.b?`${esc(s.b.panelId)} · ${esc(s.b.side)} · ${s.b.count} command(s)`:'—'}</small></span><em>${esc(statusLabel(s.status))}</em></div>`).join('')||'<div class="profile-empty">No fold seams.</div>'}</div></section>
      <section><h4>SVG Appearance Diagnostics</h4>${appearance.items.length?`<div class="v18-list">${appearance.items.map(x=>`<div class="v18-row"><span><b>${esc(x.label)}</b><small>${x.primitives} fill · ${x.gradients} gradient · ${x.clips} clip · ${x.masks} mask</small></span><span>${x.warnings.length?`<small>${x.warnings.map(esc).join(' · ')}</small>`:'<small>safe subset parsed</small>'}</span><em>${x.warnings.length?'review':'ready'}</em></div>`).join('')}</div>`:'<div class="profile-empty">No imported SVG marks with appearance metadata.</div>'}</section></div>
      <section class="v18-color"><h4>Display Color Pipeline</h4>${icc?`<div class="v18-stats"><span>${esc(icc.name)}</span><span>${esc(icc.colorSpace||'Unknown')}</span><span>PCS ${esc(icc.pcs||'—')}</span><span>ICC ${esc(icc.version)}</span></div><p>Output ICC metadata is present for production export. The browser folded proof still renders through Canvas/sRGB; V0.18 deliberately does not claim ICC PCS conversion or monitor-calibrated soft proof.</p>`:'<p>No output ICC is loaded in the current page session. Folded proof uses the browser Canvas/sRGB display path.</p>'}</section>`;
    controller=mountArtworkProof(host.querySelector('#v18ProofCanvas'),state,geo,graph,{maxTexturePixels:900});const range=host.querySelector('#v18Fold'),label=host.querySelector('#v18FoldLabel');range.oninput=()=>{label.textContent=`${range.value}%`;controller?.setProgress(Number(range.value))};host.querySelector('#v18Refresh').onclick=()=>renderWorkspace(block);host.querySelector('#v18Reset').onclick=()=>controller?.setView({yaw:.55,pitch:-.34,zoom:1});
  }catch(error){host.innerHTML=`<div class="v18-warning">${esc(error?.message||error)}</div>`}
}
function install(){hideSuperseded();const scroll=document.querySelector('#boxstudio-profile-manager .profile-manager-scroll');if(!scroll||document.getElementById(BLOCK_ID))return;const block=document.createElement('div');block.id=BLOCK_ID;block.className='profile-section v18-tools';block.innerHTML=`<div class="v18-title"><div><h3>V0.18 Appearance & Fold Bleed Proof</h3><p>SVG fills/gradients/clip/mask · fold bleed continuity · color-pipeline visibility.</p></div><span>V0.18</span></div><section><div id="v18Workspace"></div></section>`;scroll.appendChild(block);renderWorkspace(block)}
function updateVersion(){const v=document.querySelector('.brand small');if(v)v.textContent='V0.18';document.title='BoxStudio V0.18'}
const observer=new MutationObserver(()=>{updateVersion();hideSuperseded();install()});observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('beforeunload',()=>controller?.dispose?.());updateVersion();install();
