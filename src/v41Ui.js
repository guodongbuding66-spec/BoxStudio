import {setUiVersion} from './uiVersion.js';
import { STORAGE_KEY, defaultState, stateForTemplate } from './model.js';
import { V32_TEMPLATE_CATALOG, resolveBoxDimensionsV32 } from './parametricTemplatesV32.js';
import { MATERIAL_PRESETS_V32, FLUTE_PRESETS_V32, resolveMaterialV32 } from './materialsV32.js';
import { openReview } from './v35Ui.js';

const VERSION='V0.41';
const clone=v=>structuredClone(v);
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
let observer=null,templateHost=null;

function readState(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,structure:{...defaultState.structure,...(p.structure||{})},variables:{...defaultState.variables,...(p.variables||{})}}:clone(defaultState)}catch{return clone(defaultState)}
}
function writeState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function reloadTo(tab='Structure'){const state=readState();state.page='editor';state.editorTab=tab;writeState(state);location.reload()}
function templateName(id){const t=V32_TEMPLATE_CATALOG.find(x=>x.id===id);return t?.nameZh||t?.name||id}
function fmt(d){return `${d.L.toFixed(1)} × ${d.W.toFixed(1)} × ${d.H.toFixed(1)} mm`}
function categoryLabel(id){return ({shipping:'运输箱',mailer:'飞机盒 / Mailer','folding-carton':'折叠纸盒'}[id]||id)}

function useTemplate(id){
  const current=readState(),preset=stateForTemplate(id,current.variables);current.structure=preset.structure;current.elements=preset.elements;current.selectedId=preset.selectedId;current.projectName=`${templateName(id)} / Project`;current.foldProgress=100;current.page='editor';current.editorTab='Structure';writeState(current);location.reload();
}

function templateCard(t){return `<button class="v41-template-card" data-v41-template="${esc(t.id)}"><div class="v41-template-thumb"><span>${esc(t.code)}</span><i>${t.category==='mailer'?'▱':t.category==='folding-carton'?'▯':'▭'}</i></div><div><b>${esc(t.nameZh||t.name)}</b><span>${esc(t.standard)} · ${esc(t.code)}</span><small>${t.status==='implemented'?'Production core':'Engineering core'}</small></div></button>`}
function renderTemplateList(host,query='',category='all'){
  const q=String(query).trim().toLowerCase(),items=V32_TEMPLATE_CATALOG.filter(t=>(category==='all'||t.category===category)&&(!q||[t.id,t.code,t.name,t.nameZh,...t.tags].join(' ').toLowerCase().includes(q)));
  host.innerHTML=items.map(templateCard).join('')||'<div class="v41-empty">没有匹配的盒型。</div>';
  host.querySelectorAll('[data-v41-template]').forEach(b=>b.onclick=()=>useTemplate(b.dataset.v41Template));
}
function openTemplateCenter(){
  templateHost?.remove();templateHost=document.createElement('div');templateHost.id='boxstudio-v41-templates';templateHost.innerHTML=`<div class="v41-template-shell"><header><div><b>Template Center</b><span>Pacdora-style discovery · all templates free</span></div><button data-v41-close>×</button></header><div class="v41-template-search"><input data-v41-search placeholder="搜索盒型、FEFCO / ECMA / Model ID，例如 0427 / mailer / auto lock"><div class="v41-cats">${['all','shipping','mailer','folding-carton'].map((x,i)=>`<button data-v41-cat="${x}" class="${i===0?'active':''}">${x==='all'?'全部':categoryLabel(x)}</button>`).join('')}</div></div><main data-v41-list></main><footer><span>选择模板后直接进入参数 Generator。核心设计与导出免费，无水印、无审批门。</span></footer></div>`;document.body.appendChild(templateHost);
  const list=templateHost.querySelector('[data-v41-list]'),search=templateHost.querySelector('[data-v41-search]');let cat='all';renderTemplateList(list,'',cat);
  search.oninput=()=>renderTemplateList(list,search.value,cat);templateHost.querySelectorAll('[data-v41-cat]').forEach(b=>b.onclick=()=>{cat=b.dataset.v41Cat;templateHost.querySelectorAll('[data-v41-cat]').forEach(x=>x.classList.toggle('active',x===b));renderTemplateList(list,search.value,cat)});templateHost.querySelector('[data-v41-close]').onclick=()=>{templateHost.remove();templateHost=null};
}

function materialCards(state){return MATERIAL_PRESETS_V32.map(m=>{const active=state.structure?.materialId===m.id,visual=m.appearance==='kraft'?'kraft':m.appearance==='grey-fiber'?'grey':'white';return `<button class="v41-material ${active?'active':''}" data-v41-material="${m.id}"><i class="${visual}"></i><b>${esc(m.name)}</b><span>${m.category}</span></button>`}).join('')}
function fluteOptions(state){return Object.values(FLUTE_PRESETS_V32).map(f=>`<option value="${f.id}" ${state.structure?.flute===f.id?'selected':''}>${f.label} · ${f.thicknessMm} mm</option>`).join('')}
function dimensionBlock(state){const dims=resolveBoxDimensionsV32(state.structure||{}),mode=state.structure?.sizeType||'internal';return `<div class="v41-dim-tabs">${[['internal','Inner'],['manufacturing','Manufacturing'],['external','Outer']].map(([id,l])=>`<button data-v41-mode="${id}" class="${mode===id?'active':''}">${l}</button>`).join('')}</div><div class="v41-dim-summary"><div><span>Inner</span><b>${fmt(dims.inside)}</b></div><div><span>Manufacturing</span><b>${fmt(dims.manufacturing)}</b></div><div><span>Outer</span><b>${fmt(dims.external)}</b></div></div>`}

function generatorMarkup(state){const s=state.structure||{},resolved=resolveMaterialV32(s);return `<section class="v41-generator" data-v41-generator><div class="v41-generator-head"><div><b>${esc(templateName(s.template))}</b><span>${esc(s.template)} · parameter generator</span></div><button data-v41-templates>Change</button></div>${dimensionBlock(state)}<div class="v41-size-grid">${[['length','L'],['width','W'],['height','H']].map(([k,l])=>`<label><span>${l}</span><input data-v41-size="${k}" type="number" step="0.1" value="${n(s[k])}"><em>mm</em></label>`).join('')}</div><h4>Material</h4><div class="v41-materials">${materialCards(state)}</div><div class="v41-row"><label><span>Flute</span><select data-v41-flute>${fluteOptions(state)}</select></label><label><span>Thickness</span><input data-v41-thickness type="number" step="0.05" min="0.05" value="${resolved.thicknessMm}"><em>mm</em></label></div><button class="v41-apply" data-v41-apply>Apply & Generate</button><p class="v41-hint">修改结构后一次性重建 2D、Panel、Fold Graph 与 3D。所有核心功能免费。</p></section>`}

function applyGenerator(host){
  const state=readState(),s={...state.structure};host.querySelectorAll('[data-v41-size]').forEach(i=>s[i.dataset.v41Size]=Math.max(.1,n(i.value,s[i.dataset.v41Size])));s.flute=host.querySelector('[data-v41-flute]')?.value||s.flute;s.thickness=Math.max(.05,n(host.querySelector('[data-v41-thickness]')?.value,s.thickness));const selected=host.querySelector('.v41-material.active');if(selected)s.materialId=selected.dataset.v41Material;const activeMode=host.querySelector('[data-v41-mode].active');if(activeMode)s.sizeType=activeMode.dataset.v41Mode;state.structure=s;state.page='editor';state.editorTab='Structure';writeState(state);location.reload();
}
function bindGenerator(host){
  host.querySelector('[data-v41-templates]').onclick=openTemplateCenter;
  host.querySelectorAll('[data-v41-material]').forEach(b=>b.onclick=()=>{host.querySelectorAll('[data-v41-material]').forEach(x=>x.classList.toggle('active',x===b));const material=MATERIAL_PRESETS_V32.find(x=>x.id===b.dataset.v41Material);if(material){const flute=host.querySelector('[data-v41-flute]'),th=host.querySelector('[data-v41-thickness]');if(material.defaultFlute)flute.value=material.defaultFlute;th.value=material.defaultThicknessMm}});
  host.querySelectorAll('[data-v41-mode]').forEach(b=>b.onclick=()=>{const state=readState(),current=resolveBoxDimensionsV32(state.structure||{}),target=b.dataset.v41Mode,set=target==='internal'?current.inside:target==='manufacturing'?current.manufacturing:current.external;host.querySelectorAll('[data-v41-mode]').forEach(x=>x.classList.toggle('active',x===b));[['length','L'],['width','W'],['height','H']].forEach(([k,key])=>{const i=host.querySelector(`[data-v41-size="${k}"]`);if(i)i.value=set[key].toFixed(1)})});
  host.querySelector('[data-v41-apply]').onclick=()=>applyGenerator(host);
}

function faceScopeMarkup(){return `<div class="v41-face-scope"><span>Design scope</span>${[['single','Single Face'],['multi','Multi Face'],['full','Full Dieline']].map(([id,l],i)=>`<button data-v41-scope="${id}" class="${i===2?'active':''}">${l}</button>`).join('')}</div>`}
function bindFaceScope(host){host.querySelectorAll('[data-v41-scope]').forEach(b=>b.onclick=()=>{host.querySelectorAll('[data-v41-scope]').forEach(x=>x.classList.toggle('active',x===b));document.body.dataset.v41Scope=b.dataset.v41Scope;localStorage.setItem('boxstudio-v41-scope',b.dataset.v41Scope)})}

function addFoldStrip(){if(document.body.dataset.studioShell==='unified')return;if(document.querySelector('.v41-fold-strip'))return;const main=document.querySelector('.workspace .main');if(!main)return;const state=readState(),bar=document.createElement('div');bar.className='v41-fold-strip';bar.innerHTML=`<span>Fold</span><input data-v41-fold type="range" min="0" max="100" value="${n(state.foldProgress,100)}"><b data-v41-fold-label>${n(state.foldProgress,100)}%</b><button data-v41-review>Assembly / 2D↔3D</button>`;const tabbar=main.querySelector('.tabbar');tabbar?.after(bar);const range=bar.querySelector('[data-v41-fold]');range.oninput=()=>{const next=readState();next.foldProgress=Number(range.value);writeState(next);bar.querySelector('[data-v41-fold-label]').textContent=`${range.value}%`;const reviewRange=document.querySelector('#v35Fold');if(reviewRange){reviewRange.value=range.value;reviewRange.dispatchEvent(new Event('input',{bubbles:true}))}};bar.querySelector('[data-v41-review]').onclick=()=>openReview()}

function recentProjectChip(){const top=document.querySelector('.v40-project-context');if(!top||top.querySelector('.v41-recents'))return;const state=readState(),b=document.createElement('button');b.className='v41-recents';b.textContent='Recent ▾';b.title=`Current: ${state.projectName||'Untitled'}`;b.onclick=()=>{const page=document.querySelector('[data-nav="projects"]');page?.click()};top.appendChild(b)}

function enhanceModePanel(){const panel=document.querySelector('.v40-mode-panel');if(!panel)return;const active=document.querySelector('.tabbar [data-tab].active')?.dataset.tab;if(active==='Structure'&&!panel.querySelector('[data-v41-generator]')){panel.innerHTML=generatorMarkup(readState());bindGenerator(panel)}if(active==='Design'&&!panel.querySelector('.v41-face-scope')){panel.insertAdjacentHTML('afterbegin',faceScopeMarkup());bindFaceScope(panel)}}
function addTemplateButton(){const top=document.querySelector('.v40-top-controls');if(!top||top.querySelector('[data-v41-template-top]'))return;const b=document.createElement('button');b.dataset.v41TemplateTop='';b.textContent='Templates';b.onclick=openTemplateCenter;top.prepend(b)}
function freePolicy(){document.body.dataset.v41Free='true';document.body.dataset.v41ApprovalRequired='false';for(const text of ['Submit for Approval','Approve','Approver'])document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()===text)b.hidden=true})}

function ensure(){setUiVersion('V0.41');addTemplateButton();recentProjectChip();enhanceModePanel();addFoldStrip();freePolicy()}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;ensure()})}
observer=new MutationObserver(schedule);observer.observe(document.getElementById('app'),{childList:true,subtree:true});ensure();

window.BoxStudioV41={version:VERSION,openTemplateCenter,useTemplate,freeAccess:true,approvalRequired:false};
