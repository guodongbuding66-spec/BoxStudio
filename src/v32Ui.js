import { STORAGE_KEY, defaultState, stateForTemplate } from './model.js';
import { defaultsForTemplate, generateGeometry } from './geometry.js';
import { V32_TEMPLATE_CATALOG, searchTemplateCatalogV32, previewSvgForGeometryV32 } from './parametricTemplatesV32.js';
import { MATERIAL_PRESETS_V32, FLUTE_PRESETS_V32 } from './materialsV32.js';

const VERSION='V0.32';
const LABELS={
  'side-seal-rsc':'Side-Seal / FEFCO 0201 RSC',
  'mailer-150010':'Mailer / Flip-top 150010',
  'fefco-0427':'FEFCO 0427 Mailer',
  'reverse-tuck-end':'Reverse Tuck End',
  'auto-lock-bottom':'Auto-lock Bottom',
};
let filter={query:'',category:'all'};

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function readState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||structuredClone(defaultState)}catch{return structuredClone(defaultState)}}
function titleFor(id){return LABELS[id]||id;}
function statusText(t){return t.status==='implemented'?'Implemented · regression protected':'Engineering core · real-sample acceptance pending';}
function categoryText(v){return {'shipping':'运输箱','mailer':'邮寄盒','folding-carton':'折叠盒'}[v]||v;}

function createFromTemplate(id){
  const current=readState(),preset=stateForTemplate(id,current.variables||defaultState.variables),next={...current,...preset};
  next.projectName=`${titleFor(id)} / Project`;
  next.page='editor';next.editorTab='Structure';next.foldProgress=100;next.savedAt=new Date().toISOString();
  if(next.syncDimensions){
    const unit=String(next.variables?.dimensionUnit||'INCH').toUpperCase(),k=unit==='INCH'?1/25.4:unit==='CM'?1/10:1;
    next.variables.length=(next.structure.length*k).toFixed(unit==='INCH'?2:unit==='CM'?1:0);
    next.variables.width=(next.structure.width*k).toFixed(unit==='INCH'?2:unit==='CM'?1:0);
    next.variables.height=(next.structure.height*k).toFixed(unit==='INCH'?2:unit==='CM'?1:0);
  }
  localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
  location.reload();
}

function cardHtml(t){
  const structure=defaultsForTemplate(t.id),g=generateGeometry(structure),svg=previewSvgForGeometryV32(g,{width:300,height:190});
  const dims=`${structure.length} × ${structure.width} × ${structure.height} mm`;
  return `<article class="v32-template-card" data-template-id="${esc(t.id)}">
    <div class="v32-preview">${svg}</div>
    <div class="v32-card-head"><div><span class="v32-code">${esc(t.standard)} · ${esc(t.code)}</span><h3>${esc(t.nameZh)}</h3><p>${esc(t.name)}</p></div><span class="v32-state ${t.status==='implemented'?'ready':'core'}">${t.status==='implemented'?'READY':'CORE'}</span></div>
    <div class="v32-dims">Default · ${esc(dims)}</div>
    <div class="v32-tags">${t.tags.slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    <div class="v32-card-foot"><small>${esc(statusText(t))}</small><button class="primary" data-v32-create="${esc(t.id)}">从此盒型创建</button></div>
  </article>`;
}

function templateCenterHtml(){
  const cats=['all',...new Set(V32_TEMPLATE_CATALOG.map(t=>t.category))],list=searchTemplateCatalogV32(filter);
  return `<section class="v32-template-center" id="v32TemplateCenter">
    <div class="v32-center-head"><div><span class="eyebrow">PARAMETRIC TEMPLATE CORE</span><h2>Template Center</h2><p>5 个真实参数化结构引擎。尺寸、纸厚变化会重新计算刀线/折线，不使用拉伸静态 SVG。</p></div><span class="v32-version">${VERSION}</span></div>
    <div class="v32-filterbar"><label class="v32-search"><span>⌕</span><input id="v32TemplateSearch" value="${esc(filter.query)}" placeholder="搜索盒型、FEFCO、Model ID…"></label><div class="v32-categories">${cats.map(c=>`<button data-v32-category="${esc(c)}" class="${filter.category===c?'active':''}">${c==='all'?'全部':categoryText(c)}</button>`).join('')}</div></div>
    <div class="v32-summary"><b>${list.length}</b> / ${V32_TEMPLATE_CATALOG.length} core templates <span>·</span> 1 unit = 1 mm <span>·</span> deterministic geometry</div>
    <div class="v32-template-grid">${list.map(cardHtml).join('')||'<div class="v32-empty">没有匹配的盒型。</div>'}</div>
    <div class="v32-engineering-note"><b>生产边界：</b>0201 与 150010 保留既有回归；V0.32 新增的 0427 / RTE / Auto-lock 已形成可编辑几何核心，但在真实 CAD 叠图、纸板补偿和工厂样箱验收完成前，不标记为工厂 tooling certified。</div>
  </section>`;
}

function bindCenter(host){
  host.querySelector('#v32TemplateSearch')?.addEventListener('input',e=>{filter.query=e.target.value;renderTemplatePage(true)});
  host.querySelectorAll('[data-v32-category]').forEach(b=>b.addEventListener('click',()=>{filter.category=b.dataset.v32Category;renderTemplatePage()}));
  host.querySelectorAll('[data-v32-create]').forEach(b=>b.addEventListener('click',()=>createFromTemplate(b.dataset.v32Create)));
}

function renderTemplatePage(preserveFocus=false){
  const page=[...document.querySelectorAll('main.page')].find(x=>x.querySelector('h1')?.textContent.trim()==='Templates');
  if(!page)return;
  let host=page.querySelector('#v32TemplateCenter');
  if(!host){
    page.querySelector('.cards')?.classList.add('v32-legacy-cards-hidden');
    host=document.createElement('div');host.innerHTML=templateCenterHtml();page.querySelector('.page-head')?.after(host.firstElementChild);host=page.querySelector('#v32TemplateCenter');
  }else host.outerHTML=templateCenterHtml(),host=page.querySelector('#v32TemplateCenter');
  bindCenter(host);
  if(preserveFocus){const i=host.querySelector('#v32TemplateSearch');i?.focus();i?.setSelectionRange(i.value.length,i.value.length);}
}

function updateTemplateLabels(){
  const s=readState(),id=s.structure?.template,label=titleFor(id);
  document.querySelectorAll('.status span').forEach(el=>{if(/Side-Seal \/ RSC:|Mailer 150010:|FEFCO 0427:|Reverse Tuck End:|Auto-lock Bottom:/.test(el.textContent))el.textContent=`${label}: ${s.structure.length} × ${s.structure.width} × ${s.structure.height}`;});
  if(id&&id!=='side-seal-rsc')document.querySelectorAll('.card .eyebrow').forEach(el=>{if(/SIDE-SEAL|RSC/.test(el.textContent))el.textContent=label.toUpperCase();});
}

function installMaterialSummary(){
  if(document.getElementById('v32MaterialSummary'))return;
  const structureTab=[...document.querySelectorAll('.tabbar button')].find(x=>x.textContent.trim()==='Structure');
  if(!structureTab)return;
  const panel=document.querySelector('.rightpanel');if(!panel)return;
  const s=readState();if(!['fefco-0427','reverse-tuck-end','auto-lock-bottom'].includes(s.structure?.template))return;
  const block=document.createElement('div');block.id='v32MaterialSummary';block.className='v32-material-summary';
  const mat=MATERIAL_PRESETS_V32.find(x=>x.id===s.structure.materialId),flute=FLUTE_PRESETS_V32[String(s.structure.flute||'').toUpperCase()];
  block.innerHTML=`<h4>V0.32 Board Core</h4><div><span>Material</span><b>${esc(mat?.name||s.structure.materialId||'Custom')}</b></div><div><span>Flute</span><b>${esc(flute?.label||s.structure.flute||'—')}</b></div><div><span>Thickness</span><b>${Number(s.structure.thickness||0).toFixed(2)} mm</b></div><small>Engineering preset; factory override remains authoritative.</small>`;
  panel.prepend(block);
}

let scheduled=false;
function sync(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;updateTemplateLabels();renderTemplatePage();installMaterialSummary();});}
const observer=new MutationObserver(sync);observer.observe(document.documentElement,{childList:true,subtree:true});sync();
