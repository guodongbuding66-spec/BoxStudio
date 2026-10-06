import { previewSvgForTemplateV48, dimensionSummaryV48 } from './productExperienceV48.js';
import { V59_PRODUCT_VERSION,V59_UI_MODES,V59_GUIDED_FLOW,V59_SIZE_MODES,V59_OUTPUT_FORMATS,normalizeUiModeV59,productAcceptanceV59 } from './productExperienceV59.js';

const MODE_KEY='boxstudio-v59-ui-mode';
const AFTER_GENERATE_KEY='boxstudio-v59-after-generate';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let queued=false;

function currentPage(){return document.querySelector('.nav button.active')?.dataset.nav||'dashboard'}
function currentTab(){return document.querySelector('.tabbar button.active')?.dataset.tab||''}
function uiMode(){return normalizeUiModeV59(localStorage.getItem(MODE_KEY))}
function setUiMode(mode){localStorage.setItem(MODE_KEY,normalizeUiModeV59(mode));applyUiMode()}
function applyUiMode(){const mode=uiMode(),label=V59_UI_MODES[mode].label;document.body.dataset.v59Mode=mode;document.querySelectorAll('[data-v59-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v59Mode===mode));document.querySelectorAll('[data-v59-mode-label]').forEach(x=>{if(x.textContent!==label)x.textContent=label})}
function clickTab(tab){document.querySelector(`.tabbar [data-tab="${CSS.escape(tab)}"]`)?.click()}

function enhanceTopbar(){
  const top=document.querySelector('.topbar');if(!top)return;document.body.dataset.v59Studio='true';const brand=top.querySelector('.brand small');if(brand&&brand.textContent!==V59_PRODUCT_VERSION)brand.textContent=V59_PRODUCT_VERSION;
  if(!top.querySelector('[data-v59-mode-switch]')){const switcher=document.createElement('div');switcher.className='v59-mode-switch';switcher.dataset.v59ModeSwitch='';switcher.innerHTML=`<button data-v59-mode="simple">简洁</button><button data-v59-mode="professional">专业</button>`;const adv=top.querySelector('[data-v58-advanced]');(adv||top.querySelector('#quickExport'))?.insertAdjacentElement('beforebegin',switcher);switcher.querySelectorAll('[data-v59-mode]').forEach(b=>b.onclick=()=>setUiMode(b.dataset.v59Mode))}
  applyUiMode();
}

function guidedRail(){const active=currentTab();return `<div class="v59-guided-rail" data-v59-guided><div class="v59-guided-steps">${V59_GUIDED_FLOW.map((s,i)=>`<button data-v59-tab="${esc(s.tab)}" class="${active===s.tab?'active':''}"><span>${i+1}</span><b>${esc(s.label)}</b><small>${esc(s.short)}</small></button>`).join('')}</div><div class="v59-guided-side"><button data-v59-preflight>检查</button><span data-v59-mode-label>${esc(V59_UI_MODES[uiMode()].label)}</span></div></div>`}
function enhanceEditor(){
  if(currentPage()!=='editor')return;const main=document.querySelector('.workspace .main'),tabbar=main?.querySelector('.tabbar');if(!main||!tabbar)return;
  if(!main.querySelector('[data-v59-guided]')){tabbar.insertAdjacentHTML('afterend',guidedRail());const rail=main.querySelector('[data-v59-guided]');rail.querySelectorAll('[data-v59-tab]').forEach(b=>b.onclick=()=>clickTab(b.dataset.v59Tab));rail.querySelector('[data-v59-preflight]').onclick=()=>clickTab('Preflight')}
  main.querySelectorAll('[data-v59-tab]').forEach(b=>b.classList.toggle('active',b.dataset.v59Tab===currentTab()));applyUiMode();
  if(currentTab()==='Marks'&&!main.querySelector('[data-v59-marks-steps]')){const studio=main.querySelector('[data-v58-marks-studio]');if(studio)studio.insertAdjacentHTML('beforebegin','<div class="v59-marks-steps" data-v59-marks-steps><span><b>1</b>选目标面</span><span><b>2</b>插入唛头</span><span><b>3</b>调整属性</span><span><b>4</b>批量 / 3D 校验</span></div>')}
}

function readConfig(panel){return{length:panel.querySelector('[data-v47-l]')?.value,width:panel.querySelector('[data-v47-w]')?.value,height:panel.querySelector('[data-v47-h]')?.value,sizeType:panel.querySelector('[data-v47-size-type]')?.value,materialId:panel.querySelector('[data-v47-material]')?.value,flute:panel.querySelector('[data-v47-flute]')?.value,thickness:panel.querySelector('[data-v47-thickness]')?.value}}
function fmt(d){return `${Number(d.L).toFixed(1)} × ${Number(d.W).toFixed(1)} × ${Number(d.H).toFixed(1)} mm`}
function sizeModeBar(panel){const select=panel.querySelector('[data-v47-size-type]'),value=select?.value||'internal';return `<div class="v59-size-mode" data-v59-size-mode><label>尺寸口径</label><div>${V59_SIZE_MODES.map(x=>`<button type="button" data-v59-size="${x.id}" class="${x.id===value?'active':''}">${esc(x.label)}</button>`).join('')}</div></div>`}
function outputCards(){return `<div class="v59-output-grid">${V59_OUTPUT_FORMATS.map(x=>`<div><b>${esc(x.label)}</b><span>${esc(x.detail)}</span></div>`).join('')}</div>`}
function lineLegend(){return '<div class="v59-line-legend"><span><i class="bleed"></i>出血</span><span><i class="cut"></i>裁切</span><span><i class="fold"></i>压痕</span></div>'}

function updateTemplateStudio(panel){
  const id=panel.dataset.v47Config;if(!id)return;const select=panel.querySelector('[data-v47-size-type]');panel.querySelectorAll('[data-v59-size]').forEach(b=>b.classList.toggle('active',b.dataset.v59Size===select?.value));
  try{const s=dimensionSummaryV48(id,readConfig(panel));const metric=panel.querySelector('[data-v59-metric]'),html=`<div><span>内尺寸</span><b>${fmt(s.inside)}</b></div><div><span>制造尺寸</span><b>${fmt(s.manufacturing)}</b></div><div><span>外尺寸</span><b>${fmt(s.external)}</b></div><p>${esc(s.material.name)} · ${Number(s.thickness).toFixed(2)} mm${s.material.flute?` · ${esc(s.material.flute)} 楞`:''}</p>`;if(metric&&metric.innerHTML!==html)metric.innerHTML=html;const title=panel.querySelector('[data-v59-stage-size]'),titleText=fmt(s.manufacturing);if(title&&title.textContent!==titleText)title.textContent=titleText}catch(error){const metric=panel.querySelector('[data-v59-metric]'),html=`<p class="bad">${esc(error?.message||error)}</p>`;if(metric&&metric.innerHTML!==html)metric.innerHTML=html}
}

function enhanceTemplateStudio(){
  if(currentPage()!=='templates')return;const panel=document.querySelector('[data-v47-config]');if(!panel||panel.dataset.v59Enhanced==='true')return;const extra=panel.querySelector('.v48-config-extra'),summary=panel.querySelector('[data-v48-summary]');if(!extra||!summary)return;
  const id=panel.dataset.v47Config,head=panel.querySelector('.v47-config-head'),grid=panel.querySelector('.v47-size-grid'),foot=panel.querySelector('.v47-config-foot');if(!head||!grid||!foot)return;panel.dataset.v59Enhanced='true';panel.classList.add('v59-template-studio');
  const layout=document.createElement('div');layout.className='v59-template-layout';layout.innerHTML=`<aside class="v59-template-params" data-v59-params></aside><section class="v59-template-stage"><div class="v59-stage-head"><div><span>DIELINE PREVIEW</span><b>${esc(id)}</b></div><small data-v59-stage-size></small></div><div class="v59-stage-canvas">${previewSvgForTemplateV48(id)}</div>${lineLegend()}<div class="v59-stage-note">参数变化会重新计算真实结构尺寸；进入项目后可继续编辑刀版节点、曲线、图文、3D 与唛头。</div></section><aside class="v59-template-result"><div class="v59-result-title"><span>实时尺寸</span><b>结构摘要</b></div><div class="v59-metric" data-v59-metric></div><div class="v59-result-section"><span>可用输出</span>${outputCards()}</div><div class="v59-result-section v59-3d-handoff"><span>3D</span><b>生成后立即查看实时折叠</b><p>3D 使用同一套结构 / 图文数据，不创建脱节的预览副本。</p><button type="button" data-v59-generate-3d>生成并查看 3D</button></div><div data-v59-foot></div></aside>`;
  panel.appendChild(layout);const params=layout.querySelector('[data-v59-params]');params.appendChild(head);head.insertAdjacentHTML('afterend',sizeModeBar(panel));params.appendChild(grid);params.appendChild(extra);layout.querySelector('[data-v59-foot]').appendChild(foot);summary.remove();
  layout.querySelectorAll('[data-v59-size]').forEach(b=>b.onclick=()=>{const sel=panel.querySelector('[data-v47-size-type]');sel.value=b.dataset.v59Size;sel.dispatchEvent(new Event('change',{bubbles:true}));updateTemplateStudio(panel)});
  panel.querySelectorAll('[data-v47-l],[data-v47-w],[data-v47-h],[data-v47-size-type],[data-v47-material],[data-v47-flute],[data-v47-thickness]').forEach(el=>{el.addEventListener('input',()=>queueMicrotask(()=>updateTemplateStudio(panel)));el.addEventListener('change',()=>queueMicrotask(()=>updateTemplateStudio(panel)))});
  layout.querySelector('[data-v59-generate-3d]').onclick=()=>{sessionStorage.setItem(AFTER_GENERATE_KEY,'3D');panel.querySelector('[data-v47-start]')?.click()};updateTemplateStudio(panel);
}

function enhanceTemplatePage(){const page=document.querySelector('.v58-template-page');if(!page||page.querySelector('[data-v59-template-flow]'))return;const library=page.querySelector('.v58-library-head');library?.insertAdjacentHTML('afterend',`<div class="v59-template-flow" data-v59-template-flow><span><b>1</b>选盒型</span><i>→</i><span><b>2</b>输入尺寸 / 材料</span><i>→</i><span><b>3</b>生成刀版</span><i>→</i><span><b>4</b>2D / 3D / 唛头</span><i>→</i><span><b>5</b>导出</span></div>`)}

function resumeAfterGenerate(){const target=sessionStorage.getItem(AFTER_GENERATE_KEY);if(!target||currentPage()!=='editor')return;sessionStorage.removeItem(AFTER_GENERATE_KEY);queueMicrotask(()=>clickTab(target))}
function enhance(){enhanceTopbar();enhanceTemplatePage();enhanceTemplateStudio();enhanceEditor();resumeAfterGenerate();document.body.dataset.v59Acceptance=productAcceptanceV59().ok?'pass':'fail'}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});enhance();

window.BoxStudioV59={version:V59_PRODUCT_VERSION,modes:V59_UI_MODES,flow:V59_GUIDED_FLOW,outputs:V59_OUTPUT_FORMATS,getMode:uiMode,setMode:setUiMode,getAcceptance:productAcceptanceV59};
