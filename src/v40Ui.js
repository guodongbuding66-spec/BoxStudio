import { STORAGE_KEY, defaultState } from './model.js';
import { generateGeometry } from './geometry.js';
import { mountThreePreview } from './threePreview.js';
import { openReview } from './v35Ui.js';
import { openDielineCadV38 } from './v38Ui.js';

const VERSION='V0.40';
const clone=v=>structuredClone(v);
const toolMeta={
  select:['↖','Select'],text:['T','Text'],image:['▧','Image'],shape:['□','Shape'],line:['╱','Line'],
  barcode:['▥','Barcode'],qr:['▦','QR'],mark:['⇧','Marks'],var:['{}','Variable'],dieline:['⌁','Dieline CAD']
};
let observer=null,previewController=null,activeRight='preview';

function readState(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,structure:{...defaultState.structure,...(p.structure||{})},variables:{...defaultState.variables,...(p.variables||{})}}:clone(defaultState)}catch{return clone(defaultState)}
}
function activeTab(){return document.querySelector('.tabbar [data-tab].active')?.dataset.tab||'Design'}
function clickTab(name){document.querySelector(`.tabbar [data-tab="${name}"]`)?.click()}
function clickTool(name){document.querySelector(`.toolbar [data-tool="${name}"]`)?.click()}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stopPreview(){try{previewController?.dispose?.()}catch{}previewController=null}

function topbar(){
  const top=document.querySelector('.topbar');if(!top||top.dataset.v40Ready)return;
  top.dataset.v40Ready='1';
  const brand=top.querySelector('.brand');if(brand)brand.innerHTML=`BOXSTUDIO <small>${VERSION} · FREE</small>`;
  const host=top.querySelector('#v36OpenHosted');if(host)host.style.display='none';
  const controls=document.createElement('div');controls.className='v40-top-controls';controls.innerHTML=`
    <button data-v40-view="2d" class="active">2D</button>
    <button data-v40-view="3d">3D</button>
    <button data-v40-view="split">Split</button>
    <span class="v40-divider"></span>
    <button data-v40-action="preflight">Preflight</button>
    <button data-v40-action="export" class="v40-export-top">Export</button>`;
  const save=top.querySelector('.save-state');top.insertBefore(controls,save||null);
  controls.querySelector('[data-v40-view="2d"]').onclick=()=>clickTab('Design');
  controls.querySelector('[data-v40-view="3d"]').onclick=()=>clickTab('3D');
  controls.querySelector('[data-v40-view="split"]').onclick=()=>openReview();
  controls.querySelector('[data-v40-action="preflight"]').onclick=()=>clickTab('Preflight');
  controls.querySelector('[data-v40-action="export"]').onclick=()=>clickTab('Export');
}

function decorateRail(){
  const rail=document.querySelector('.toolbar');if(!rail)return;
  rail.classList.add('v40-rail');
  for(const button of rail.querySelectorAll('[data-tool]')){
    if(button.dataset.v40Decorated)continue;button.dataset.v40Decorated='1';
    const key=button.dataset.tool,[icon,label]=toolMeta[key]||['•',key];
    button.innerHTML=`<span class="v40-tool-icon">${esc(icon)}</span><span class="v40-tool-label">${esc(label)}</span>`;
    if(key==='dieline'){button.disabled=false;button.removeAttribute('aria-disabled');button.onclick=e=>{e.preventDefault();openDielineCadV38()}}
  }
}

function mirrorInput(key,label,value,{type='number',step='0.1'}={}){
  return `<label class="v40-field"><span>${label}</span><input data-v40-structure="${key}" type="${type}" step="${step}" value="${esc(value)}"></label>`
}
function modeMarkup(tab,state){
  const s=state.structure||{};
  if(tab==='Structure')return `<div class="v40-mode-head"><div><b>Structure</b><span>Parametric box controls</span></div><button data-v40-open-cad>CAD</button></div>
    <section><h4>Finished size · mm</h4>${mirrorInput('length','L / Length',s.length)}${mirrorInput('width','W / Width',s.width)}${mirrorInput('height','H / Height',s.height)}${mirrorInput('thickness','Thickness',s.thickness,{step:'0.05'})}
    <label class="v40-field"><span>Flute</span><select data-v40-structure="flute">${['F','E','B','C','EB','BC','AA'].map(v=>`<option ${s.flute===v?'selected':''}>${v}</option>`).join('')}</select></label></section>
    <section><h4>Workflow</h4><button data-v40-tab="Design">Online Design</button><button data-v40-view-review>2D ↔ 3D Review</button><button data-v40-tab="Preflight">Preflight</button><button data-v40-tab="Export" class="primary">Export</button></section>`;
  if(tab==='Marks')return `<div class="v40-mode-head"><div><b>Marks</b><span>Structured shipping marks</span></div></div><section class="v40-component-grid">${[['mark','Shipping Mark'],['barcode','Barcode + QR'],['qr','QR'],['var','Variable'],['text','Text']].map(([k,l])=>`<button data-v40-tool="${k}">${l}</button>`).join('')}</section><section><p>SKU / N.W. / G.W. / MEAS / CRN / Contract / Origin / Package X/Y remain free, including Excel/CSV batch.</p></section>`;
  if(tab==='Export')return `<div class="v40-mode-head"><div><b>Export</b><span>Free production output</span></div></div><section><div class="v40-free-card"><b>No paywall · No approval gate</b><p>Production PDF / SVG / DXF remain available to anonymous users. Preflight errors may block unsafe output; warnings do not.</p></div><button data-v40-production-pdf class="primary">Full Production PDF</button><button data-v40-tab="Preflight">Run Preflight first</button></section>`;
  if(tab==='Preflight')return `<div class="v40-mode-head"><div><b>Preflight</b><span>Quality check, not approval</span></div></div><section><p>Errors indicate production problems. There is no approver role required to continue.</p><button data-v40-tab="Export" class="primary">Go to Export</button></section>`;
  if(tab==='3D')return `<div class="v40-mode-head"><div><b>3D Preview</b><span>Fold / material / linked review</span></div></div><section><button data-v40-view-review class="primary">Open 2D ↔ 3D Review</button><button data-v40-tab="Design">Back to 2D</button></section>`;
  return `<div class="v40-mode-head"><div><b>Design</b><span>Face-aware artwork editor</span></div></div><section class="v40-component-grid">${[['select','Select'],['text','Text'],['image','Image'],['shape','Shape'],['line','Line'],['mark','Marks'],['barcode','Barcode'],['qr','QR']].map(([k,l])=>`<button data-v40-tool="${k}">${l}</button>`).join('')}</section><section><h4>Views</h4><button data-v40-tab="Structure">Structure</button><button data-v40-view-review>Split 2D / 3D</button><button data-v40-open-cad>Dieline CAD</button></section>`;
}

function bindMode(panel){
  panel.querySelectorAll('[data-v40-tab]').forEach(b=>b.onclick=()=>clickTab(b.dataset.v40Tab));
  panel.querySelectorAll('[data-v40-tool]').forEach(b=>b.onclick=()=>clickTool(b.dataset.v40Tool));
  panel.querySelectorAll('[data-v40-open-cad]').forEach(b=>b.onclick=()=>openDielineCadV38());
  panel.querySelectorAll('[data-v40-view-review]').forEach(b=>b.onclick=()=>openReview());
  panel.querySelectorAll('[data-v40-structure]').forEach(input=>input.onchange=()=>{
    const target=document.querySelector(`.v40-inspector-content [data-structure="${input.dataset.v40Structure}"]`)||document.querySelector(`.rightpanel [data-structure="${input.dataset.v40Structure}"]`);
    if(target){target.value=input.value;target.dispatchEvent(new Event('change',{bubbles:true}))}
  });
  const pdf=panel.querySelector('[data-v40-production-pdf]');if(pdf)pdf.onclick=()=>{
    const result=window.BoxStudioV39?.buildFullProductionPdf?.({download:true});
    document.body.dataset.v40FreeExport=result?.ok?'pass':'blocked';
  };
}

async function mountPreview(target){
  stopPreview();if(!target||!target.isConnected)return;
  const state=readState();let geo;try{geo=generateGeometry(state.structure||{})}catch{return}
  target.innerHTML='<div class="v40-preview-loading">Preparing 3D…</div>';
  try{previewController=await mountThreePreview(target,state,geo,{onStatus:mode=>{target.dataset.renderer=String(mode)}})}catch(error){target.innerHTML=`<div class="v40-preview-loading">3D preview unavailable<br>${esc(error?.message||error)}</div>`}
}
function setupRightDeck(right){
  if(!right||right.dataset.v40Wrapped)return;right.dataset.v40Wrapped='1';right.classList.add('v40-rightdeck');
  const old=[...right.childNodes];const head=document.createElement('div');head.className='v40-right-tabs';head.innerHTML='<button data-v40-right="preview" class="active">3D Preview</button><button data-v40-right="inspector">Inspector</button>';
  const preview=document.createElement('div');preview.className='v40-preview-content';preview.innerHTML='<div class="v40-preview-loading">Preparing 3D…</div>';
  const inspector=document.createElement('div');inspector.className='v40-inspector-content';old.forEach(node=>inspector.appendChild(node));
  right.append(head,preview,inspector);
  const setMode=mode=>{activeRight=mode;head.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.v40Right===mode));preview.hidden=mode!=='preview';inspector.hidden=mode!=='inspector';if(mode==='preview')mountPreview(preview)};
  head.querySelectorAll('button').forEach(b=>b.onclick=()=>setMode(b.dataset.v40Right));
  const state=readState();setMode(state.selectedId?'inspector':activeRight);
}

function modePanel(workspace){
  let panel=workspace.querySelector('.v40-mode-panel');if(!panel){panel=document.createElement('aside');panel.className='v40-mode-panel';workspace.insertBefore(panel,workspace.querySelector('.main'))}
  const tab=activeTab(),state=readState(),key=`${tab}:${state.structure?.template}:${state.structure?.length}:${state.structure?.width}:${state.structure?.height}:${state.structure?.thickness}:${state.structure?.flute}`;
  if(panel.dataset.renderKey!==key){panel.dataset.renderKey=key;panel.innerHTML=modeMarkup(tab,state);bindMode(panel)}
}

function ensure(){
  document.title='BoxStudio V0.40';topbar();
  const hosted=document.querySelector('#v36OpenHosted');if(hosted)hosted.style.display='none';
  const workspace=document.querySelector('.workspace');document.body.classList.toggle('v40-editor',Boolean(workspace));
  if(!workspace){stopPreview();return}
  if(workspace.dataset.v40Ready){return}
  workspace.dataset.v40Ready='1';workspace.classList.add('v40-shell');
  decorateRail();modePanel(workspace);setupRightDeck(workspace.querySelector('.rightpanel'));
  document.body.dataset.v40Free='true';document.body.dataset.v40ApprovalRequired='false';
}

let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;ensure()})}
observer=new MutationObserver(schedule);observer.observe(document.getElementById('app'),{childList:true,subtree:true});
ensure();

window.BoxStudioV40={version:VERSION,ensure,openReview,openDielineCad:openDielineCadV38,freeAccess:true,approvalRequired:false};
