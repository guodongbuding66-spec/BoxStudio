import { STORAGE_KEY, defaultState, stateForTemplate } from './model.js';
import { STANDARD_TEMPLATE_CATALOG, searchTemplateCatalog, templateCatalogById } from './templates.js';
import { defaultsForTemplate, generateGeometry } from './geometry.js';
import { resolveBoxDimensionsV32 } from './parametricTemplatesV32.js';
import { MATERIAL_PRESETS_V32, FLUTE_PRESETS_V32, materialByIdV32, fluteByIdV32 } from './materialsV32.js';
import { mountThreePreview } from './threePreview.js';

const clone=v=>structuredClone(v);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let observer=null,previewController=null,modal=null,draft=null,activeRecord=null,previewToken=0;
let catalogQuery='',catalogCategory='all';

function readState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return saved?{...clone(defaultState),...saved,structure:{...defaultState.structure,...(saved.structure||{})},variables:{...defaultState.variables,...(saved.variables||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function actionable(){return STANDARD_TEMPLATE_CATALOG.filter(t=>t.engine&&t.status!=='schema-only')}
function dimensionsFor(structure,geo=null){return geo?.dimensionSet||resolveBoxDimensionsV32(structure)}
function f(v){return Number(v||0).toFixed(1)}
function lineSvg(lines=[],cls='cut'){return lines.map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" class="${cls}"/>`).join('')}
function panelSvg(panels=[]){return panels.map(p=>Array.isArray(p.points)&&p.points.length>=3?`<polygon points="${p.points.map(q=>q.join(',')).join(' ')}"/>`:`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/>`).join('')}
function dielinePreview(geo,{className=''}={}){if(!geo)return'<div class="v40g-empty">Preview unavailable</div>';return `<svg class="v40g-dieline ${className}" viewBox="0 0 ${Math.max(1,geo.width)} ${Math.max(1,geo.height)}" preserveAspectRatio="xMidYMid meet"><g class="panels">${panelSvg(geo.panels||[...(geo.bodyPanels||[]),...(geo.flapPanels||[])])}</g><g>${lineSvg(geo.cutLines,'cut')}${lineSvg(geo.creaseLines,'crease')}${lineSvg(geo.perfLines,'perf')}${lineSvg(geo.glueLines,'glue')}</g></svg>`}
function previewForTemplate(id){try{return dielinePreview(generateGeometry(defaultsForTemplate(id)),{className:'card-preview'})}catch{return'<div class="v40g-empty">Schema preview</div>'}}
function statusLabel(record){return record.status==='implemented'?'Ready':record.status==='engineering-core'?'Engineering core':record.status||'Schema'}
function categoryLabel(v){return({shipping:'Shipping boxes',mailer:'Mailer / Flip-top','folding-carton':'Folding cartons',tray:'Tray boxes',custom:'Custom'})[v]||v}

function centerRows(){
  const records=searchTemplateCatalog({query:catalogQuery,category:catalogCategory}).filter(t=>t.engine&&t.status!=='schema-only');
  return records.map(r=>`<article class="v40g-card" data-v40g-card="${esc(r.id)}"><div class="v40g-card-preview">${previewForTemplate(r.id)}</div><div class="v40g-card-copy"><div class="v40g-meta"><span>${esc(r.standard)} · ${esc(r.code)}</span><span class="${r.status==='implemented'?'ready':'engineering'}">${esc(statusLabel(r))}</span></div><h3>${esc(r.nameZh||r.name)}</h3><p>${esc(r.name)}</p><div class="v40g-tags">${(r.tags||[]).slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div><button data-v40g-configure="${esc(r.id)}">Configure</button></div></article>`).join('')||'<div class="v40g-no-results">No matching packaging structure.</div>';
}
function renderCenterGrid(){const host=document.querySelector('[data-v40g-grid]');if(host){host.innerHTML=centerRows();bindCenter(host)}}
function bindCenter(root=document){
  root.querySelectorAll('[data-v40g-configure]').forEach(b=>b.onclick=()=>openGenerator(b.dataset.v40gConfigure));
  const search=root.querySelector('[data-v40g-search]');if(search)search.oninput=()=>{catalogQuery=search.value;renderCenterGrid()};
  root.querySelectorAll('[data-v40g-category]').forEach(b=>b.onclick=()=>{catalogCategory=b.dataset.v40gCategory;root.querySelectorAll('[data-v40g-category]').forEach(x=>x.classList.toggle('active',x.dataset.v40gCategory===catalogCategory));renderCenterGrid()});
}
function enhanceTemplatesPage(){
  const page=document.querySelector('.page');if(!page||page.dataset.v40gCenter)return;
  const h1=page.querySelector('h1');if(!h1||h1.textContent.trim()!=='Templates')return;
  page.dataset.v40gCenter='1';document.body.classList.add('v40g-template-page');
  const cats=['all',...new Set(actionable().map(t=>t.category))];
  page.innerHTML=`<section class="v40g-center"><header><div><span class="v40g-kicker">BOXSTUDIO · FREE TEMPLATE GENERATOR</span><h1>Choose a packaging structure</h1><p>Search by box type, FEFCO / model code or use. Configure dimensions and material before entering the editor.</p></div><button class="v40g-import" data-v40g-import>Import dieline</button></header><div class="v40g-search"><input data-v40g-search placeholder="Search 0201, 0427, 150010, mailer, tuck end…" value="${esc(catalogQuery)}"><span>${actionable().length} parametric structures</span></div><div class="v40g-categories">${cats.map(c=>`<button data-v40g-category="${esc(c)}" class="${c===catalogCategory?'active':''}">${c==='all'?'All':esc(categoryLabel(c))}</button>`).join('')}</div><div class="v40g-grid" data-v40g-grid>${centerRows()}</div><footer><b>Free for everyone.</b> No watermark, no export quota, no approval role required.</footer></section>`;
  bindCenter(page);
  page.querySelector('[data-v40g-import]').onclick=()=>{const current=readState();current.page='editor';current.editorTab='Structure';localStorage.setItem(STORAGE_KEY,JSON.stringify(current));location.reload()};
}

function synthState(){const current=readState(),preset=stateForTemplate(activeRecord.id,current.variables);return{...current,...preset,structure:clone(draft),page:'editor',editorTab:'Structure',foldProgress:Number(modal?.querySelector('[data-v40g-fold]')?.value||100)}}
function geometry(){return generateGeometry(draft)}
function dimCard(title,d){return `<div><span>${title}</span><b>${f(d.L)} × ${f(d.W)} × ${f(d.H)}</b><small>mm</small></div>`}
function dynamicFields(){const params=new Set(activeRecord?.parameters||[]),rows=[];if(params.has('glue'))rows.push(field('glue','Glue flap',draft.glue??18,'number','0.5'));if(params.has('wing'))rows.push(field('wing','Wing / ear',draft.wing??24,'number','0.5'));return rows.join('')}
function field(key,label,value,type='number',step='0.1'){return `<label class="v40g-field"><span>${label}</span><input data-v40g-field="${key}" type="${type}" step="${step}" value="${esc(value)}"></label>`}
function materialOptions(){return MATERIAL_PRESETS_V32.map(m=>`<option value="${m.id}" ${draft.materialId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}
function fluteOptions(){return Object.values(FLUTE_PRESETS_V32).map(x=>`<option value="${x.id}" ${draft.flute===x.id?'selected':''}>${esc(x.label)} · ${x.thicknessMm} mm</option>`).join('')}
function generatorMarkup(){
  const geo=geometry(),dims=dimensionsFor(draft,geo),mat=materialByIdV32(draft.materialId)||MATERIAL_PRESETS_V32[0];
  return `<div class="v40g-modal" role="dialog" aria-modal="true"><header class="v40g-modal-top"><button data-v40g-close>← Templates</button><div><span>${esc(activeRecord.standard)} · ${esc(activeRecord.code)}</span><h2>${esc(activeRecord.nameZh||activeRecord.name)}</h2></div><div class="v40g-modal-actions"><span>FREE</span><button data-v40g-start class="primary">Start online design →</button></div></header><div class="v40g-workspace"><aside class="v40g-info"><div class="v40g-model-id">MODEL <b>${esc(activeRecord.code)}</b></div><h3>${esc(activeRecord.name)}</h3><p>${esc(activeRecord.nameZh||'')}</p><dl><dt>Status</dt><dd>${esc(statusLabel(activeRecord))}</dd><dt>Engine</dt><dd>${esc(activeRecord.engine)}</dd><dt>Units</dt><dd>mm</dd></dl><div class="v40g-free-note"><b>All core tools are free</b><span>2D · 3D · Marks · CAD · Preflight · Export</span></div></aside><main class="v40g-preview"><div class="v40g-preview-toolbar"><div><button data-v40g-preview="split" class="active">2D + 3D</button><button data-v40g-preview="2d">2D Dieline</button><button data-v40g-preview="3d">3D Preview</button></div><label>Fold <input data-v40g-fold type="range" min="0" max="100" value="100"><span data-v40g-fold-label>100%</span></label></div><div class="v40g-preview-split" data-v40g-preview-host><div class="v40g-2d" data-v40g-2d>${dielinePreview(geo)}</div><div class="v40g-3d" data-v40g-3d><div class="v40g-loading">Preparing 3D…</div></div></div><div class="v40g-dimensions" data-v40g-dimensions>${dimCard('Manufacturing',dims.manufacturing)}${dimCard('Inner',dims.inside)}${dimCard('Outer',dims.external)}</div></main><aside class="v40g-params"><section><h4>Dimension definition</h4><div class="v40g-segmented">${[['internal','Inner'],['external','Outer'],['manufacturing','Manufacturing']].map(([v,l])=>`<button data-v40g-size="${v}" class="${dims.mode===v?'active':''}">${l}</button>`).join('')}</div><p>The entered L × W × H uses the selected dimension definition.</p></section><section><h4>Finished size · mm</h4>${field('length','Length / L',draft.length)}${field('width','Width / W',draft.width)}${field('height','Height / H',draft.height)}${dynamicFields()}</section><section><h4>Material</h4><label class="v40g-field"><span>Board</span><select data-v40g-field="materialId">${materialOptions()}</select></label><label class="v40g-field"><span>Flute</span><select data-v40g-field="flute" ${mat.category!=='corrugated'?'disabled':''}>${fluteOptions()}</select></label>${field('thickness','Thickness',draft.thickness,'number','0.05')}<label class="v40g-check"><input data-v40g-comp type="checkbox" ${draft.compensation!==false?'checked':''}> Apply material compensation</label></section><section><h4>Next</h4><button data-v40g-start class="primary wide">Start online design</button><button data-v40g-export>Continue to Export</button><small>Configuration is stored in the real BoxStudio project state.</small></section></aside></div></div>`;
}

function closeGenerator(){previewToken++;try{previewController?.dispose?.()}catch{}previewController=null;modal?.remove();modal=null;activeRecord=null;draft=null;document.body.classList.remove('v40g-open')}
async function mountPreview3d(){const host=modal?.querySelector('[data-v40g-3d]');if(!host||!activeRecord||!draft)return;const token=++previewToken;try{previewController?.dispose?.()}catch{}previewController=null;host.innerHTML='<div class="v40g-loading">Preparing 3D…</div>';try{const geo=geometry(),controller=await mountThreePreview(host,synthState(),geo,{onStatus:mode=>host.dataset.renderer=String(mode)});if(token!==previewToken){controller?.dispose?.();return}previewController=controller}catch(error){if(token===previewToken)host.innerHTML=`<div class="v40g-loading">3D preview unavailable<br>${esc(error?.message||error)}</div>`}}
function updateDerived(){if(!modal)return;let geo;try{geo=geometry()}catch(error){modal.querySelector('[data-v40g-2d]').innerHTML=`<div class="v40g-error">${esc(error.message)}</div>`;return}const dims=dimensionsFor(draft,geo);modal.querySelector('[data-v40g-2d]').innerHTML=dielinePreview(geo);modal.querySelector('[data-v40g-dimensions]').innerHTML=dimCard('Manufacturing',dims.manufacturing)+dimCard('Inner',dims.inside)+dimCard('Outer',dims.external);modal.querySelectorAll('[data-v40g-size]').forEach(b=>b.classList.toggle('active',b.dataset.v40gSize===dims.mode));mountPreview3d()}
function setMaterial(id){const m=materialByIdV32(id);if(!m)return;draft.materialId=id;if(m.category==='corrugated'){draft.flute=m.defaultFlute;draft.thickness=fluteByIdV32(m.defaultFlute)?.thicknessMm||m.defaultThicknessMm}else{draft.flute='CUSTOM';draft.thickness=m.defaultThicknessMm}rerenderParamsAndPreview()}
function rerenderParamsAndPreview(){const oldFold=modal?.querySelector('[data-v40g-fold]')?.value||100;const parent=modal?.parentElement;if(!parent)return;try{previewController?.dispose?.()}catch{}previewController=null;parent.innerHTML=generatorMarkup();modal=parent.firstElementChild;modal.querySelector('[data-v40g-fold]').value=oldFold;bindGenerator();mountPreview3d()}
function commitDraft(tab='Design',{reload=true}={}){
  const current=readState(),preset=stateForTemplate(activeRecord.id,current.variables),unit=String(current.variables?.dimensionUnit||'MM').toUpperCase(),k=unit==='INCH'?1/25.4:unit==='CM'?1/10:1,places=unit==='INCH'?2:unit==='CM'?1:0;
  const variables={...current.variables,length:(Number(draft.length)*k).toFixed(places),width:(Number(draft.width)*k).toFixed(places),height:(Number(draft.height)*k).toFixed(places)};
  const next={...current,structure:clone(draft),elements:preset.elements,selectedId:preset.selectedId,variables,projectName:`${activeRecord.nameZh||activeRecord.name} / New Project`,page:'editor',editorTab:tab,foldProgress:100,savedAt:new Date().toISOString()};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('boxstudio:v40-generator-commit',{detail:{templateId:activeRecord.id,tab,structure:clone(draft)}}));if(reload)location.reload();return next;
}
function bindGenerator(){
  modal.querySelector('[data-v40g-close]').onclick=closeGenerator;
  modal.querySelectorAll('[data-v40g-start]').forEach(b=>b.onclick=()=>commitDraft('Design'));
  modal.querySelector('[data-v40g-export]').onclick=()=>commitDraft('Export');
  modal.querySelectorAll('[data-v40g-size]').forEach(b=>b.onclick=()=>{draft.sizeType=b.dataset.v40gSize;updateDerived()});
  modal.querySelectorAll('[data-v40g-field]').forEach(input=>input.onchange=()=>{const k=input.dataset.v40gField;if(k==='materialId'){setMaterial(input.value);return}if(k==='flute'){draft.flute=input.value;const fp=fluteByIdV32(input.value);if(fp)draft.thickness=fp.thicknessMm;rerenderParamsAndPreview();return}const numeric=['length','width','height','thickness','glue','wing'].includes(k);draft[k]=numeric?Number(input.value):input.value;updateDerived()});
  modal.querySelector('[data-v40g-comp]').onchange=e=>{draft.compensation=e.target.checked;updateDerived()};
  const fold=modal.querySelector('[data-v40g-fold]');fold.oninput=()=>{modal.querySelector('[data-v40g-fold-label]').textContent=`${fold.value}%`;previewController?.setProgress?.(Number(fold.value))};
  modal.querySelectorAll('[data-v40g-preview]').forEach(b=>b.onclick=()=>{const mode=b.dataset.v40gPreview,host=modal.querySelector('[data-v40g-preview-host]');modal.querySelectorAll('[data-v40g-preview]').forEach(x=>x.classList.toggle('active',x===b));host.dataset.mode=mode});
}
export function openGenerator(templateId){
  const record=templateCatalogById(templateId);if(!record?.engine)throw new Error(`Template is not actionable: ${templateId}`);activeRecord=record;const current=readState(),base=defaultsForTemplate(record.id);draft=current.structure?.template===record.id?{...base,...clone(current.structure)}:base;
  closeGenerator();activeRecord=record;draft=clone(draft);const layer=document.createElement('div');layer.className='v40g-layer';layer.innerHTML=generatorMarkup();document.body.appendChild(layer);modal=layer.firstElementChild;document.body.classList.add('v40g-open');bindGenerator();mountPreview3d();return{record:clone(activeRecord),structure:clone(draft)}
}

function ensure(){enhanceTemplatesPage()}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;ensure()})}
observer=new MutationObserver(schedule);observer.observe(document.getElementById('app'),{childList:true,subtree:true});ensure();
window.BoxStudioV40Generator={open:openGenerator,close:closeGenerator,getDraft:()=>draft?clone(draft):null,commit:(tab='Design',options={reload:false})=>commitDraft(tab,options),freeAccess:true};
