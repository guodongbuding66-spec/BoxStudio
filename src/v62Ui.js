import { STORAGE_KEY,defaultState,cloneState } from './model.js';
import { buildLinkedWorkspaceModelV49 } from './linkedWorkspaceV49.js';
import { buildBleedContinuityReport,continuitySummary } from './bleedContinuity.js';
import { V62_PRODUCT_VERSION,V62_GUIDE_STORAGE_KEY,V62_GUIDE_DEFAULTS,normalizeGuidePrefsV62,buildPrintGuideModelV62,printGuideAcceptanceV62 } from './printGuidesV62.js';

const NS='http://www.w3.org/2000/svg';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
let queued=false;
const v64Runtime=window.BoxStudioUiRuntimeV64;

function readState(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'),b=cloneState(defaultState);return p?{...b,...p,structure:{...b.structure,...(p.structure||{})},variables:{...b.variables,...(p.variables||{})},elements:Array.isArray(p.elements)?p.elements:[]}:b}catch{return cloneState(defaultState)}
}
function currentPage(){return document.querySelector('.nav button.active')?.dataset.nav||readState().page}
function currentTab(){return document.querySelector('.tabbar button.active')?.dataset.tab||readState().editorTab}
function readPrefs(){try{return normalizeGuidePrefsV62(JSON.parse(localStorage.getItem(V62_GUIDE_STORAGE_KEY)||'{}'))}catch{return normalizeGuidePrefsV62(V62_GUIDE_DEFAULTS)}}
function savePrefs(prefs){localStorage.setItem(V62_GUIDE_STORAGE_KEY,JSON.stringify(normalizeGuidePrefsV62(prefs)))}
function linked(){const state=readState(),model=buildLinkedWorkspaceModelV49(state);return{state,model,geo:model.review.geo,graph:model.review.graph}}

function ensureVersionBadge(){
  const brand=document.querySelector('.brand');if(!brand)return;
  let badge=brand.querySelector('[data-v62-version]');if(!badge){badge=document.createElement('span');badge.dataset.v62Version='true';badge.className='v62-version-badge';brand.appendChild(badge)}
  if(badge.textContent!==V62_PRODUCT_VERSION)badge.textContent=V62_PRODUCT_VERSION;
  document.body.dataset.v62='true';
}

function lineNode(line,cls){
  const el=document.createElementNS(NS,'line');el.setAttribute('x1',num(line.x1));el.setAttribute('y1',num(line.y1));el.setAttribute('x2',num(line.x2));el.setAttribute('y2',num(line.y2));el.setAttribute('class',cls);return el;
}
function rectNode(box,cls,panelId){
  const el=document.createElementNS(NS,'rect');el.setAttribute('x',num(box.x));el.setAttribute('y',num(box.y));el.setAttribute('width',Math.max(0,num(box.w)));el.setAttribute('height',Math.max(0,num(box.h)));el.setAttribute('class',cls);if(panelId)el.dataset.v62Panel=panelId;return el;
}
function panelNode(panel){
  if(Array.isArray(panel.polygon)&&panel.polygon.length>=3){
    const el=document.createElementNS(NS,'polygon');el.setAttribute('points',panel.polygon.map(p=>`${p[0]},${p[1]}`).join(' '));el.setAttribute('class','v62-panel-boundary');el.dataset.v62Panel=panel.panelId;return el;
  }
  return rectNode(panel.bounds,'v62-panel-boundary',panel.panelId);
}
function guideSignature(model){return JSON.stringify([model.prefs,model.safeMm,model.bleedMm,model.counts,model.panels.map(p=>[p.panelId,p.bounds.x,p.bounds.y,p.bounds.w,p.bounds.h])])}
function renderGuides(){
  if(currentPage()!=='editor'||currentTab()!=='Design')return;
  const svg=document.querySelector('#designSvg');if(!svg)return;
  const {state,geo}=linked(),model=buildPrintGuideModelV62(state,geo,readPrefs()),sig=guideSignature(model);
  let layer=svg.querySelector('[data-v62-guides]');
  if(layer?.dataset.v62Signature===sig)return;
  layer?.remove();layer=document.createElementNS(NS,'g');layer.dataset.v62Guides='true';layer.dataset.v62Signature=sig;layer.setAttribute('aria-hidden','true');
  model.bleedZones.forEach(z=>layer.appendChild(rectNode(z,'v62-bleed-zone',z.panelId)));
  model.safeZones.forEach(z=>layer.appendChild(rectNode(z,'v62-safe-zone',z.panelId)));
  model.visiblePanels.forEach(p=>layer.appendChild(panelNode(p)));
  model.cutLines.forEach(l=>layer.appendChild(lineNode(l,'v62-cut-line')));
  model.creaseLines.forEach(l=>layer.appendChild(lineNode(l,'v62-crease-line')));
  svg.appendChild(layer);
  document.body.dataset.v62GuideCount=String(layer.childElementCount);
}

function guideToggle(key,label,prefs){return `<label class="v62-guide-toggle"><input type="checkbox" data-v62-guide="${key}" ${prefs[key]?'checked':''}><span>${label}</span></label>`}
function readinessHtml(){
  const {state,geo,graph}=linked(),prefs=readPrefs(),guide=buildPrintGuideModelV62(state,geo,prefs),seams=continuitySummary(buildBleedContinuityReport(state,geo,graph));
  const warningClass=seams.warnings?'warn':'ok',warningText=seams.warnings?`${seams.warnings} 个接缝需复核`:'接缝检查无结构缺失';
  return `<section class="v62-readiness" data-v62-readiness>
    <div class="v62-readiness-head">
      <div><span>PRINT READINESS</span><b>印刷辅助与校样入口</b><small>出血、安全区、面板边界、刀线 / 折线与 3D 校样都在当前 Artwork 流程里。</small></div>
      <button data-v62-check>检查 / 导出 →</button>
    </div>
    <div class="v62-readiness-grid">
      <div class="v62-guides">
        <strong>2D 印刷辅助</strong>
        <div class="v62-guide-toggles">
          ${guideToggle('bleed','出血',prefs)}
          ${guideToggle('safe','安全区',prefs)}
          ${guideToggle('panels','面板边界',prefs)}
          ${guideToggle('cut','CUT 刀线',prefs)}
          ${guideToggle('crease','CREASE 折线',prefs)}
        </div>
        <p><b>${guide.bleedMm} mm</b> 出血 · <b>${guide.safeMm} mm</b> 安全区 · ${guide.counts.panels} 个可印刷面 · ${guide.counts.cut} 条刀线 · ${guide.counts.crease} 条折线</p>
      </div>
      <div class="v62-proof-handoff">
        <div><strong>3D / 生产校样</strong><span class="v62-seam-status ${warningClass}">${esc(warningText)}</span></div>
        <p>当前结构共有 ${seams.total} 个折叠接缝；连续 Artwork 会沿既有接缝检查逻辑复核。折叠方向与开合动画继续使用完整 3D 校样。</p>
        <div><button data-v62-open3d>完整 3D / 折叠动画</button><button data-v62-open-export>Preflight / Production PDF</button></div>
      </div>
    </div>
  </section>`;
}
function goTab(name){
  const tab=document.querySelector(`.tabbar [data-tab="${name}"]`);if(tab){tab.click();return true}
  return false;
}
function refreshReadiness(){
  const old=document.querySelector('[data-v62-readiness]');if(!old)return;
  const shell=document.createElement('div');shell.innerHTML=readinessHtml();const next=shell.firstElementChild;old.replaceWith(next);bindReadiness(next);renderGuides();
}
function bindReadiness(root){
  root.querySelectorAll('[data-v62-guide]').forEach(input=>input.onchange=()=>{const prefs=readPrefs();prefs[input.dataset.v62Guide]=input.checked;savePrefs(prefs);refreshReadiness()});
  root.querySelector('[data-v62-open3d]').onclick=()=>goTab('3D');
  root.querySelector('[data-v62-open-export]').onclick=()=>goTab('Export')||document.querySelector('#quickExport')?.click();
  root.querySelector('[data-v62-check]').onclick=()=>goTab('Export')||document.querySelector('#quickExport')?.click();
}
function ensureReadiness(){
  if(currentPage()!=='editor'||currentTab()!=='Design')return;
  const studio=document.querySelector('[data-v61-studio]');if(!studio)return;
  if(!studio.querySelector('[data-v62-readiness]')){studio.insertAdjacentHTML('beforeend',readinessHtml());bindReadiness(studio.querySelector('[data-v62-readiness]'))}
  renderGuides();
}
function enhance(){
  ensureVersionBadge();ensureReadiness();if(currentPage()==='editor'&&currentTab()==='Design')renderGuides();
  document.body.dataset.v62Acceptance=printGuideAcceptanceV62().ok?'pass':'fail';
}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}

window.addEventListener('boxstudio:v49-panel-selection',()=>v64Runtime?.schedule?v64Runtime.schedule():schedule());
if(v64Runtime?.register)v64Runtime.register('v62',enhance);else{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});enhance()}

window.BoxStudioV62={
  version:V62_PRODUCT_VERSION,
  getState:readState,
  getPrefs:readPrefs,
  getGuideModel:()=>{const {state,geo}=linked();return buildPrintGuideModelV62(state,geo,readPrefs())},
  getSeamSummary:()=>{const {state,geo,graph}=linked();return continuitySummary(buildBleedContinuityReport(state,geo,graph))},
  setGuide:(key,on)=>{const prefs=readPrefs();if(key in prefs)prefs[key]=Boolean(on);savePrefs(prefs);refreshReadiness();renderGuides();return readPrefs()},
  getAcceptance:printGuideAcceptanceV62,
};
