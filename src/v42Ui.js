import {setUiVersion} from './uiVersion.js';
import { STORAGE_KEY, defaultState } from './model.js';
import { generateGeometry, defaultsForTemplate } from './geometry.js';
import { V32_TEMPLATE_CATALOG } from './parametricTemplatesV32.js';

const VERSION='V0.42';
const clone=v=>structuredClone(v);
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const NS='http://www.w3.org/2000/svg';
let observer=null,detailHost=null,foldTimer=0;

const CONTROL_SPECS=Object.freeze([
  {id:'flapTaper',label:'Flap taper',unit:'mm',max:30,step:.5,help:'Inset the free edge of supported tuck flaps.'},
  {id:'notch',label:'Finger notch',unit:'mm',max:25,step:.5,help:'Cut depth for the centered tuck access notch.'},
  {id:'shoulder',label:'Lock shoulder',unit:'mm',max:30,step:.5,help:'Adds paired retention shoulder slits on supported tuck panels.'},
  {id:'relief',label:'Fold relief',unit:'mm',max:20,step:.5,help:'Adds corner relief cuts to the 0427 roll-end structure.'},
  {id:'cornerRadius',label:'Corner radius',unit:'mm',max:30,step:.5,help:'Stored in the structure model. Current production line engine does not emit ARC/Cubic geometry yet.',metadataOnly:true},
]);
const CAPABILITIES=Object.freeze({
  'fefco-0427':['flapTaper','notch','shoulder','relief','cornerRadius'],
  'reverse-tuck-end':['flapTaper','notch','shoulder','cornerRadius'],
  'auto-lock-bottom':['flapTaper','notch','shoulder','cornerRadius'],
});

function readState(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,structure:{...defaultState.structure,...(p.structure||{})},variables:{...defaultState.variables,...(p.variables||{})}}:clone(defaultState)}catch{return clone(defaultState)}
}
function writeState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function templateById(id){return V32_TEMPLATE_CATALOG.find(t=>t.id===id)||{id,code:id,name:id,nameZh:id,standard:'CUSTOM',status:'implemented',category:'custom',tags:[]}}
function structureForTemplate(id){const current=readState();return current.structure?.template===id?{...defaultsForTemplate(id),...current.structure}:defaultsForTemplate(id)}
function capabilities(id){return CAPABILITIES[id]||[]}
function fmtMm(v){return `${n(v).toFixed(1)} mm`}

function previewSvg(g){
  const cuts=(g.cutLines||[]).map(l=>`<line class="cut" x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`).join('');
  const creases=(g.creaseLines||[]).map(l=>`<line class="crease" x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`).join('');
  const panels=(g.bodyPanels||[]).map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/>`).join('');
  return `<svg viewBox="0 0 ${Math.max(1,g.width)} ${Math.max(1,g.height)}" preserveAspectRatio="xMidYMid meet"><g class="panels">${panels}</g><g>${cuts}${creases}</g></svg>`;
}
function isometricBox(structure){
  const L=Math.max(25,n(structure.length,200)),W=Math.max(20,n(structure.width,120)),H=Math.max(15,n(structure.height,60)),ratio=clamp(W/L,.35,1.2),height=clamp(H/Math.max(L,W),.18,.7);
  return `<div class="v42-iso" style="--v42-depth:${(ratio*54).toFixed(1)}px;--v42-height:${(height*118).toFixed(1)}px"><i class="top"></i><i class="front"></i><i class="side"></i><span>${Math.round(L)} × ${Math.round(W)} × ${Math.round(H)}</span></div>`;
}
function panelCards(g){
  const panels=[...(g.bodyPanels||[]),...(g.flapPanels||[])];
  return panels.slice(0,14).map(p=>`<div class="v42-panel-card"><b>${esc(p.label||p.id)}</b><span>${esc(p.role||p.kind||'panel')}</span><small>${fmtMm(p.w)} × ${fmtMm(p.h)}</small></div>`).join('');
}
function capabilityRows(id,structure){
  const supported=new Set(capabilities(id));
  return CONTROL_SPECS.map(spec=>`<div class="v42-cap ${supported.has(spec.id)?'on':'off'}"><span>${esc(spec.label)}</span><b>${supported.has(spec.id)?fmtMm(structure[spec.id]||0):'—'}</b><small>${supported.has(spec.id)?(spec.metadataOnly?'model only':'production geometry'):'not enabled for this engine'}</small></div>`).join('');
}

function openTemplateDetail(id){
  const t=templateById(id),structure=structureForTemplate(id);let g=null,error='';
  try{g=generateGeometry(structure)}catch(e){error=e?.message||String(e)}
  detailHost?.remove();detailHost=document.createElement('div');detailHost.id='boxstudio-v42-detail';
  detailHost.innerHTML=`<div class="v42-detail-shell"><header><div><span>${esc(t.standard)} · ${esc(t.code)}</span><b>${esc(t.nameZh||t.name)}</b><small>${esc(t.name)} · ${esc(t.status)}</small></div><button data-v42-close>×</button></header><main><section class="v42-detail-preview"><div class="v42-detail-tabs"><b>Dieline Preview</b><span>2D structure + assembly silhouette</span></div><div class="v42-preview-grid"><div class="v42-dieline-preview">${g?previewSvg(g):`<div class="v42-error">${esc(error||'Preview unavailable')}</div>`}</div><div class="v42-iso-preview">${isometricBox(structure)}<p>Assembly silhouette uses current L/W/H. Exact folds are available in the linked 2D↔3D Review after creating the project.</p></div></div><h4>Semantic panels</h4><div class="v42-panel-grid">${g?panelCards(g):''}</div></section><aside><h4>Template parameters</h4><div class="v42-detail-dims"><div><span>Length</span><b>${fmtMm(structure.length)}</b></div><div><span>Width</span><b>${fmtMm(structure.width)}</b></div><div><span>Height</span><b>${fmtMm(structure.height)}</b></div><div><span>Thickness</span><b>${fmtMm(structure.thickness)}</b></div></div><h4>Advanced structure</h4><div class="v42-cap-list">${capabilityRows(id,structure)}</div>${g?.advancedV42?.cornerRadiusMode==='metadata-only-line-engine'?'<div class="v42-warning">Corner radius is preserved as structure metadata but is not exported as a production arc by the current line-segment generator.</div>':''}<div class="v42-detail-actions"><button data-v42-edit>${readState().structure?.template===id?'Edit current template':'Create & edit'}</button><button class="primary" data-v42-use>Use template</button></div></aside></main></div>`;
  document.body.appendChild(detailHost);
  const close=()=>{detailHost?.remove();detailHost=null};detailHost.querySelector('[data-v42-close]').onclick=close;
  detailHost.querySelector('[data-v42-edit]').onclick=()=>{if(readState().structure?.template!==id)window.BoxStudioV41?.useTemplate?.(id);else{close();document.querySelector('.tabbar [data-tab="Structure"]')?.click()}};
  detailHost.querySelector('[data-v42-use]').onclick=()=>window.BoxStudioV41?.useTemplate?.(id);
}

function decorateTemplateCards(){
  document.querySelectorAll('.v41-template-card[data-v41-template]').forEach(card=>{
    if(card.dataset.v42Decorated)return;card.dataset.v42Decorated='true';const detail=document.createElement('span');detail.className='v42-card-detail';detail.textContent='Details';detail.title='Open template detail';
    detail.onpointerdown=e=>e.stopPropagation();detail.onclick=e=>{e.preventDefault();e.stopPropagation();openTemplateDetail(card.dataset.v41Template)};card.appendChild(detail);
  });
}

function advancedMarkup(state){
  const enabled=new Set(capabilities(state.structure?.template));
  if(!enabled.size)return `<section class="v42-advanced v42-disabled"><div class="v42-advanced-head"><div><b>Advanced Structure</b><span>This legacy engine keeps its existing production geometry in V0.42.</span></div><button data-v42-detail-current>Template Detail</button></div></section>`;
  return `<section class="v42-advanced"><div class="v42-advanced-head"><div><b>Advanced Structure</b><span>Changes below modify supported semantic CUT geometry.</span></div><button data-v42-detail-current>Detail</button></div><div class="v42-advanced-grid">${CONTROL_SPECS.filter(spec=>enabled.has(spec.id)).map(spec=>`<label class="${spec.metadataOnly?'metadata-only':''}" title="${esc(spec.help)}"><span>${esc(spec.label)}${spec.metadataOnly?' *':''}</span><div><input data-v42-advanced="${spec.id}" type="number" min="0" max="${spec.max}" step="${spec.step}" value="${n(state.structure?.[spec.id],0)}"><em>${spec.unit}</em></div><small>${esc(spec.help)}</small></label>`).join('')}</div><div class="v42-legend"><span><i class="live"></i> production geometry</span><span><i class="meta"></i> metadata-only until ARC/Cubic production support</span></div></section>`;
}
function saveAdvanced(host){
  const state=readState();host.querySelectorAll('[data-v42-advanced]').forEach(input=>{state.structure[input.dataset.v42Advanced]=Math.max(0,n(input.value,0))});writeState(state);
}
function decorateGenerator(){
  const host=document.querySelector('[data-v41-generator]');if(!host||host.querySelector('.v42-advanced'))return;
  const state=readState(),apply=host.querySelector('[data-v41-apply]');if(!apply)return;
  apply.insertAdjacentHTML('beforebegin',advancedMarkup(state));
  host.querySelector('[data-v42-detail-current]')?.addEventListener('click',()=>openTemplateDetail(state.structure?.template));
  apply.addEventListener('click',()=>saveAdvanced(host),true);
}

function injectPanelLabels(){
  const svg=document.querySelector('#designSvg');if(!svg||svg.querySelector('.v42-panel-labels'))return;
  let g;try{g=generateGeometry(readState().structure)}catch{return}const group=document.createElementNS(NS,'g');group.setAttribute('class','v42-panel-labels ui-only');
  for(const p of g.bodyPanels||[]){if(!(n(p.w)>12&&n(p.h)>10))continue;const text=document.createElementNS(NS,'text');text.setAttribute('x',String(n(p.x)+n(p.w)/2));text.setAttribute('y',String(n(p.y)+n(p.h)/2));text.textContent=String(p.label||p.id).toUpperCase();group.appendChild(text)}svg.appendChild(group);
}

function enhanceInspector(){
  document.querySelectorAll('.v40-inspector-content .panel-section').forEach(section=>{if(section.dataset.v42Collapse)return;const title=section.querySelector('h4,h3');if(!title)return;section.dataset.v42Collapse='ready';title.title='Click to collapse';title.onclick=()=>section.classList.toggle('v42-collapsed')});
  const workspace=document.querySelector('.workspace.v40-shell'),right=document.querySelector('.v40-rightdeck');if(!workspace||!right||right.querySelector('.v42-resize-handle'))return;
  const saved=Number(localStorage.getItem('boxstudio-v42-inspector-width'));if(Number.isFinite(saved)&&saved>=280&&saved<=520)workspace.style.setProperty('--v42-inspector-width',`${saved}px`);
  const handle=document.createElement('div');handle.className='v42-resize-handle';handle.title='Drag to resize Inspector / 3D panel';right.prepend(handle);
  let dragging=false;handle.onpointerdown=e=>{dragging=true;handle.setPointerCapture?.(e.pointerId);document.body.classList.add('v42-resizing')};handle.onpointermove=e=>{if(!dragging)return;const rect=workspace.getBoundingClientRect(),width=clamp(rect.right-e.clientX,280,520);workspace.style.setProperty('--v42-inspector-width',`${Math.round(width)}px`);localStorage.setItem('boxstudio-v42-inspector-width',String(Math.round(width)))};handle.onpointerup=handle.onpointercancel=()=>{dragging=false;document.body.classList.remove('v42-resizing')};
}

function setFold(range,value){range.value=String(Math.round(clamp(value,0,100)));range.dispatchEvent(new Event('input',{bubbles:true}))}
function stopFoldAnimation(){if(foldTimer){clearInterval(foldTimer);foldTimer=0}}
function playFold(range){
  stopFoldAnimation();let current=Number(range.value);if(current>=99){setFold(range,0);current=0}
  foldTimer=setInterval(()=>{current=Math.min(100,current+4);setFold(range,current);if(current>=100){stopFoldAnimation();setFold(range,100)}},40);
}
function decorateFoldStrip(){
  const bar=document.querySelector('.v41-fold-strip');if(!bar||bar.querySelector('.v42-fold-controls'))return;const range=bar.querySelector('[data-v41-fold]');if(!range)return;
  const controls=document.createElement('div');controls.className='v42-fold-controls';controls.innerHTML=`${[0,50,100].map(v=>`<button data-v42-fold-step="${v}">${v}</button>`).join('')}<button class="play" data-v42-fold-play title="Play assembly">▶</button>`;bar.insertBefore(controls,bar.querySelector('[data-v41-review]'));
  controls.querySelectorAll('[data-v42-fold-step]').forEach(b=>b.onclick=()=>{stopFoldAnimation();setFold(range,Number(b.dataset.v42FoldStep))});
  controls.querySelector('[data-v42-fold-play]').onclick=()=>playFold(range);
  range.addEventListener('pointerdown',stopFoldAnimation);
}

function freePolicy(){document.body.dataset.v42Free='true';document.body.dataset.v42ApprovalRequired='false'}
function ensure(){setUiVersion('V0.42');decorateTemplateCards();decorateGenerator();decorateFoldStrip();injectPanelLabels();enhanceInspector();freePolicy()}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;ensure()})}
observer=new MutationObserver(schedule);observer.observe(document.getElementById('app'),{childList:true,subtree:true});observer.observe(document.body,{childList:true,subtree:true});ensure();

window.BoxStudioV42={version:VERSION,openTemplateDetail,capabilities,freeAccess:true,approvalRequired:false,cornerRadiusProductionArc:false};
